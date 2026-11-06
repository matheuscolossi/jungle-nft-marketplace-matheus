import { test, expect } from "@playwright/test";
import {
  addFirstNft,
  boot,
  demo,
  login,
  mockRequest,
  readyForScreenshot,
} from "./helpers";

test.beforeEach(async ({ page }, info) => {
  if (info.title.includes("out-of-order"))
    await page.clock.install({ time: new Date("2026-06-15T12:00:00Z") });
  await boot(page);
});

test("catalog composes filters, sort, pagination and restores history/refresh", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Próxima página" }).click();
  await expect(page).toHaveURL(/page=2/);
  const secondPage = await page.getByTestId("nft-card").first().textContent();
  await page.goBack();
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByTestId("nft-card").first()).not.toHaveText(
    secondPage!,
  );
  const mobileFilters = page.getByRole("button", {
    name: "Filtros",
    exact: true,
  });
  if (await mobileFilters.isVisible()) await mobileFilters.click();
  await page
    .getByLabel(/^Categoria(?:\s*\*)?$/)
    .filter({ visible: true })
    .selectOption("Art");
  await page
    .getByLabel(/^Coleção(?:\s*\*)?$/)
    .filter({ visible: true })
    .selectOption("Cosmic Visions");
  await page
    .getByLabel("Preço máximo em ETH")
    .filter({ visible: true })
    .fill("3");
  await page.getByLabel("Apenas disponíveis").filter({ visible: true }).check();
  if (await page.getByRole("dialog").isVisible())
    await page.getByRole("button", { name: "Ver resultados" }).click();
  await page.getByLabel(/^Ordenar por(?:\s*\*)?$/).selectOption("price-desc");
  await expect(page).toHaveURL(/category=Art/);
  await expect(page).toHaveURL(/sort=price-desc/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByTestId("nft-card")).toHaveCount(6);
  await page
    .getByLabel("Buscar NFTs")
    .filter({ visible: true })
    .fill("Emerald");
  await expect(page.getByTestId("nft-card")).toHaveCount(1);
  await expect(page.getByTestId("nft-card")).toContainText("Emerald Ape #042");
  await page.reload();
  await expect(
    page.getByLabel("Buscar NFTs").filter({ visible: true }),
  ).toHaveValue("Emerald");
  await expect(page.getByLabel("Ordenar por")).toHaveValue("price-desc");
  await expect(page.getByTestId("nft-card")).toHaveCount(1);
  await page
    .getByLabel("Buscar NFTs")
    .filter({ visible: true })
    .fill("not-a-real-work");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
});

test("out-of-order responses do not replace the latest search", async ({
  page,
}) => {
  await demo(page, { scenario: "out-of-order" });
  await page.getByLabel("Buscar NFTs").filter({ visible: true }).fill("a");
  await page
    .getByLabel("Buscar NFTs")
    .filter({ visible: true })
    .fill("Emerald");
  await expect(page.getByTestId("nft-card")).toHaveCount(1);
  await expect(page.getByTestId("nft-card")).toContainText("Emerald Ape #042");
  await page.clock.runFor(1800);
  await expect(page.getByTestId("nft-card")).toHaveCount(1);
  await expect(
    page.getByLabel("Buscar NFTs").filter({ visible: true }),
  ).toHaveValue("Emerald");
});

test("direct detail, gallery, unavailable editions and missing NFT", async ({
  page,
}) => {
  await page.goto("/nft/1");
  await expect(
    page
      .getByRole("heading", { name: "Emerald Ape #042", exact: true })
      .first(),
  ).toBeVisible();
  if (page.viewportSize()!.width < 600) {
    const purchase = await page
      .getByRole("button", { name: "Comprar NFT", exact: true })
      .boundingBox();
    expect(purchase).not.toBeNull();
    expect(purchase!.y).toBeGreaterThanOrEqual(0);
    expect(purchase!.y + purchase!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
  }
  await page.getByRole("button", { name: "Ver imagem 2", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Ver imagem 2", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("radio", { name: /Rara/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Diminuir quantidade" }),
  ).toBeDisabled();
  for (let index = 1; index < 8; index++)
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(
    page.getByRole("button", { name: "Aumentar quantidade" }),
  ).toBeDisabled();
  await page.goto("/nft/24");
  await expect(page.getByRole("radio", { name: /Padrão/ })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Edição esgotada" }),
  ).toBeDisabled();
  await page.goto("/nft/does-not-exist");
  await expect(page.getByRole("alert")).toContainText(
    /not.*found|não.*encontrad/i,
  );
  await page.goto("/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "Esta página ainda não foi criada" }),
  ).toBeVisible();
});

test("favorite mutation is optimistic, rolls back on failure and persists on retry", async ({
  page,
}) => {
  await login(page, "/nft/1");
  const favorite = page.getByTestId("favorite").first();
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await demo(page, { scenario: "favorite-error", latency: 600 });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("alert").first()).toContainText(
    /favorite|favorit/i,
  );
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await demo(page, { scenario: "success", latency: 0 });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await expect(favorite).toBeEnabled();
  await page.reload();
  await expect(page.getByTestId("favorite").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("loading skeletons, network failure, empty state and retry remain usable", async ({
  page,
}) => {
  await demo(page, { scenario: "slow", latency: 2000 });
  await page.goto("/nft/1");
  await expect(page.getByTestId("skeleton").first()).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "Emerald Ape #042", exact: true })
      .first(),
  ).toBeVisible();
  await demo(page, { scenario: "server-error", latency: 0 });
  await page.goto("/nft/2");
  await expect(page.getByRole("alert").first()).toContainText(
    /temporarily|temporaria/i,
  );
  await demo(page, { scenario: "success", latency: 0 });
  await page.getByRole("button", { name: "Tentar novamente" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Sage Nomad #009", exact: true }).first(),
  ).toBeVisible();
  await demo(page, { scenario: "empty" });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Nenhuma obra encontrada" }),
  ).toBeVisible();
});

test("keyboard navigation exposes a skip link and visible focus", async ({
  page,
}) => {
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: /pular|ir para.*conteúdo/i });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await page.keyboard.press("Tab");
  await expect(page.locator(":focus")).toBeVisible();
});

test("home and detail have stable visual baselines", async ({ page }) => {
  await readyForScreenshot(page);
  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/nft/1");
  await expect(
    page
      .getByRole("heading", { name: "Emerald Ape #042", exact: true })
      .first(),
  ).toBeVisible();
  await readyForScreenshot(page);
  await expect(page).toHaveScreenshot("detail.png", {
    fullPage: true,
    animations: "disabled",
  });
});

test("tablet width has no unintended horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const routes = [
    { path: "/", ready: () => page.getByTestId("nft-card").first() },
    {
      path: "/nft/1",
      ready: () =>
        page
          .getByRole("heading", { name: "Emerald Ape #042", exact: true })
          .first(),
    },
    {
      path: "/cart",
      ready: () =>
        page.getByRole("heading", {
          name: "Sua coleção começa com uma escolha",
          exact: true,
        }),
    },
    {
      path: "/login",
      ready: () =>
        page.getByRole("heading", {
          name: "Bom ter você de volta.",
          exact: true,
        }),
    },
  ];
  for (const route of routes) {
    await page.goto(route.path);
    await expect(route.ready()).toBeVisible();
    await readyForScreenshot(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, `horizontal overflow at ${route.path}`).toBe(false);
  }
});

test("visitor cart survives refresh and is preserved on login", async ({
  page,
}) => {
  await addFirstNft(page);
  await page.reload();
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  await login(page, "/cart");
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  const cart = await mockRequest<{
    items: { nftId: string; quantity: number }[];
  }>(page, "/cart");
  expect(cart.data.items[0]).toMatchObject({ nftId: "1", quantity: 1 });
});
