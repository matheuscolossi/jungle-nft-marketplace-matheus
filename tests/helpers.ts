import { expect, type Locator, type Page } from "@playwright/test";
import type { Collector } from "../src/types";

export const collector: Collector = {
  name: "Alex Morgan",
  email: "alex@example.com",
  username: "alexmorgan",
  profileName: "Coleção de Alex",
  walletType: "MetaMask",
  referralCode: "JUNGLE10",
  ensName: "alex.eth",
};

export async function mockRequest<T = unknown>(
  page: Page,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return page.evaluate(
    async ({ path, method, body, headers }) => {
      try {
        const response = await fetch(`/api${path}`, {
          method,
          headers: { "Content-Type": "application/json", ...headers },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        return { status: response.status, data: await response.json() };
      } catch {
        return { status: 0, data: null };
      }
    },
    { path, method, body, headers },
  ) as Promise<{ status: number; data: T }>;
}

export const demo = (page: Page, body: Record<string, unknown>) =>
  mockRequest(page, "/demo", "PATCH", body);

export async function boot(page: Page) {
  await page.goto("/");
  await expect(page.getByTestId("nft-card").first()).toBeVisible();
}

export async function login(
  page: Page,
  redirect = "/profile",
  email = "alex@example.com",
  password = "Jungle123!",
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill(email);
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`${redirect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:\\?|$)`),
  );
}

export async function addFirstNft(page: Page) {
  await page.goto("/nft/1");
  await expect(
    page
      .getByRole("heading", { name: "Emerald Ape #042", exact: true })
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
}

export async function checkout(page: Page) {
  await login(page, "/nft/1");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.locator(".summary .grand-total dd")).not.toHaveText("—");
  await page.getByRole("link", { name: "Continuar para pagamento" }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await fillCollector(page);
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await page
    .getByLabel("Entendo que esta compra é uma simulação, sem pagamento real.")
    .check();
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeEnabled();
}

export async function fillCollector(page: Page) {
  await page.getByLabel(/^Nome completo(?:\s*\*)?$/).fill(collector.name);
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill(collector.email);
  await page.getByLabel(/^Nome de usuário(?:\s*\*)?$/).fill(collector.username);
  await page
    .getByLabel(/^Nome do perfil(?:\s*\*)?$/)
    .fill(collector.profileName);
  await page
    .getByLabel(/^Tipo da carteira(?:\s*\*)?$/)
    .selectOption(collector.walletType);
  await page
    .getByLabel(/^Código de indicação(?:\s*\*)?$/)
    .fill(collector.referralCode);
  await page.getByLabel(/^Nome ENS(?:\s*\*)?$/).fill(collector.ensName);
}

export async function expectFieldError(field: Locator) {
  await expect(field).toHaveAttribute("aria-invalid", "true");
  const describedBy = await field.getAttribute("aria-describedby");
  expect(describedBy, "O campo precisa descrever seu erro").toBeTruthy();
  const messages = await field.evaluate((element) =>
    (element.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .filter((id) => id.includes("error"))
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .filter(Boolean),
  );
  expect(
    messages.length,
    "O aria-describedby precisa referenciar a mensagem de erro, além de qualquer dica",
  ).toBeGreaterThan(0);
}

export async function readyForScreenshot(page: Page) {
  await expect(page.getByTestId("skeleton")).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  // A rolagem carrega também as imagens nativas lazy que ficam longe da tela com zoom.
  for (const artwork of await page
    .locator('img[loading="lazy"]')
    .filter({ visible: true })
    .all()) {
    if (
      !(await artwork.evaluate(
        (element) => (element as HTMLImageElement).complete,
      ))
    ) {
      await artwork.scrollIntoViewIfNeeded();
      await artwork.evaluate((element) =>
        (element as HTMLImageElement).decode(),
      );
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images)
        .filter(
          (image) =>
            image.getClientRects().length > 0 &&
            getComputedStyle(image).visibility !== "hidden",
        )
        .map((image) => image.decode()),
    );
  });
}
