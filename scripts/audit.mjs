import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const baseURL = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const detailPath = process.env.AUDIT_DETAIL_PATH ?? "/nft/1";
const output = path.resolve("reports/lighthouse");
const runs = Number(process.env.AUDIT_RUNS ?? 3);
if (!Number.isInteger(runs) || runs < 1)
  throw new Error("AUDIT_RUNS must be a positive integer");
await fs.mkdir(output, { recursive: true });
const results = [];
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const categories = ["performance", "accessibility", "best-practices", "seo"];
const thresholds = {
  performance: 90,
  accessibility: 95,
  "best-practices": 95,
  seo: 90,
};
const environment = {
  date: new Date().toISOString(),
  node: process.version,
  os: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  memoryGB: Math.round(os.totalmem() / 1024 ** 3),
  baseURL,
  conditions:
    "Production Vite preview, default MSW scenario, local assets, fresh browser profile per measurement, simulated Lighthouse throttling; normal application with no audit-only behavior.",
};

for (const [page, route] of [
  ["home", "/"],
  ["detail", detailPath],
]) {
  for (const profile of ["mobile", "desktop"]) {
    for (let run = 1; run <= runs; run++) {
      const browser = await launch({
        chromePath: process.env.CHROME_PATH,
        chromeFlags: [
          "--headless=new",
          "--disable-gpu",
          "--no-first-run",
          "--disable-extensions",
        ],
      });
      try {
        const config =
          profile === "desktop"
            ? {
                extends: "lighthouse:default",
                settings: {
                  formFactor: "desktop",
                  screenEmulation: {
                    mobile: false,
                    width: 1440,
                    height: 1000,
                    deviceScaleFactor: 1,
                    disabled: false,
                  },
                  throttling: {
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 0,
                    uploadThroughputKbps: 0,
                  },
                },
              }
            : { extends: "lighthouse:default" };
        const result = await lighthouse(
          `${baseURL}${route}`,
          {
            port: browser.port,
            output: ["html", "json"],
            onlyCategories: categories,
            logLevel: "error",
          },
          config,
        );
        if (!result) throw new Error("Lighthouse returned no report");
        const { lhr, report } = result;
        const label = `${page}-${profile}-${run}`;
        await fs.writeFile(path.join(output, `${label}.html`), report[0]);
        await fs.writeFile(path.join(output, `${label}.json`), report[1]);
        const scores = Object.fromEntries(
          categories.map((category) => [
            category,
            Math.round((lhr.categories[category]?.score ?? 0) * 100),
          ]),
        );
        const metrics = Object.fromEntries(
          [
            "largest-contentful-paint",
            "cumulative-layout-shift",
            "total-blocking-time",
          ].map((metric) => [metric, lhr.audits[metric]?.numericValue ?? null]),
        );
        results.push({
          page,
          route,
          profile,
          run,
          scores,
          metrics,
          lighthouseVersion: lhr.lighthouseVersion,
          userAgent: lhr.userAgent,
          runtimeError: lhr.runtimeError,
          warnings: lhr.runWarnings,
        });
        console.log(`${label}: ${JSON.stringify(scores)}`);
      } finally {
        await browser.kill();
      }
    }
  }
}

const medians = [];
for (const page of ["home", "detail"])
  for (const profile of ["mobile", "desktop"]) {
    const measurements = results.filter(
      (result) => result.page === page && result.profile === profile,
    );
    const scores = Object.fromEntries(
      categories.map((category) => [
        category,
        median(measurements.map((result) => result.scores[category])),
      ]),
    );
    const metrics = Object.fromEntries(
      Object.keys(measurements[0].metrics).map((metric) => [
        metric,
        median(measurements.map((result) => result.metrics[metric])),
      ]),
    );
    medians.push({
      page,
      profile,
      scores,
      metrics,
      belowTarget: categories.filter(
        (category) => scores[category] < thresholds[category],
      ),
    });
  }
await fs.writeFile(
  path.join(output, "summary.json"),
  JSON.stringify({ environment, runs, thresholds, medians, results }, null, 2),
);
const markdown = [
  "# Lighthouse measurements",
  "",
  `Generated: ${environment.date}. Lighthouse ${results[0]?.lighthouseVersion}; ${environment.node}; ${environment.os}.`,
  "",
  environment.conditions,
  "",
  "| Page | Profile | Performance | Accessibility | Best practices | SEO | LCP (ms) | CLS | TBT (ms) |",
  "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...medians.map(
    (result) =>
      `| ${result.page} | ${result.profile} | ${result.scores.performance} | ${result.scores.accessibility} | ${result.scores["best-practices"]} | ${result.scores.seo} | ${Math.round(result.metrics["largest-contentful-paint"])} | ${result.metrics["cumulative-layout-shift"].toFixed(4)} | ${Math.round(result.metrics["total-blocking-time"])} |`,
  ),
  "",
  `Median of ${runs} measurements for each page/profile. Full HTML and JSON reports are stored alongside this summary.`,
  "",
  ...medians
    .filter((result) => result.belowTarget.length)
    .map(
      (result) =>
        `- ${result.page}/${result.profile} below target: ${result.belowTarget.join(", ")}. Inspect the linked HTML report diagnostics before attributing causes.`,
    ),
];
await fs.writeFile(path.join(output, "README.md"), `${markdown.join("\n")}\n`);
console.log(JSON.stringify({ medians, output }, null, 2));
if (
  medians.some((result) => result.belowTarget.length) ||
  results.some((result) => result.runtimeError)
) {
  process.exitCode = 1;
}
