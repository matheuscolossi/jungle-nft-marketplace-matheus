import { test, expect, type Locator, type Page } from "@playwright/test";
import {
  addFirstNft,
  boot,
  checkout,
  demo,
  expectFieldError,
  login,
  mockRequest,
  readyForScreenshot,
} from "./helpers";
import type { Cart, Order, Wallet } from "../src/types";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test("cart can recover from stock falling from eight to two and remove an exhausted item", async ({
  page,
}) => {
  await page.goto("/nft/1");
  for (let count = 1; count < 8; count++) {
    await page.getByRole("button", { name: "Aumentar quantidade" }).click();
    await expect(page.getByLabel(/^Quantidade(?:\s*\*)?$/)).toHaveText(
      String(count + 1),
    );
  }
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  const item = page.getByTestId("cart-item");
  await expect(item.getByLabel(/^Quantidade(?:\s*\*)?$/)).toHaveText("8");
  await demo(page, { action: "update-nft", nftId: "1", stock: 2 });
  await expect(item).toContainText(
    "Disponibilidade alterada. Ajuste a quantidade.",
  );
  await item.getByRole("button", { name: "Diminuir quantidade" }).click();
  await expect(item.getByLabel(/^Quantidade(?:\s*\*)?$/)).toHaveText("2");
  expect((await mockRequest<Cart>(page, "/cart")).data.items[0].quantity).toBe(
    2,
  );
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.9025 ETH",
  );
  await demo(page, { action: "update-nft", nftId: "1", stock: 0 });
  await expect(
    item.getByRole("button", { name: "Diminuir quantidade" }),
  ).toBeDisabled();
  await expect(
    item.getByRole("button", { name: "Aumentar quantidade" }),
  ).toBeDisabled();
  await item
    .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
    .click();
  await expect(item).toHaveCount(0);
  expect((await mockRequest<Cart>(page, "/cart")).data.items).toEqual([]);
});

test("available filter and card include the rare edition when the standard edition is exhausted", async ({
  page,
}) => {
  await page.goto("/?q=Aurora&available=true");
  const card = page.getByTestId("nft-card");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("Aurora Rising #477");
  await expect(card.getByText("Esgotado", { exact: true })).toHaveCount(0);
  await expect(card).toContainText("3 edições");
  await card
    .getByRole("link", { name: "Aurora Rising #477", exact: true })
    .click();
  const edition = page.getByLabel(/^Edição(?:\s*\*)?$/);
  await expect(edition.locator("option[value=standard]")).toBeDisabled();
  await edition.selectOption("rare");
  await expect(page.locator(".detail-price")).toHaveText("1.65 ETH");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByTestId("cart-item")).toContainText("Rare edition");
  expect((await mockRequest<Cart>(page, "/cart")).data.items[0]).toMatchObject({
    nftId: "24",
    editionId: "rare",
    quantity: 1,
  });
});

test("coupon error and checkout REST field errors describe their inputs", async ({
  page,
}) => {
  await addFirstNft(page);
  const coupon = page.getByLabel(/^Código promocional(?:\s*\*)?$/);
  await coupon.fill("INVALID");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expectFieldError(coupon);
  const errorId = (await coupon.getAttribute("aria-describedby"))!
    .split(/\s+/)
    .find((id) => id.includes("error"));
  expect(errorId).toBeTruthy();
  await expect(page.locator(`[id="${errorId}"]`)).toContainText(
    /inválid|not valid/i,
  );
  await checkout(page);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  const wallets = await mockRequest<Wallet[]>(page, "/wallets");
  const selected = wallets.data.find(
    (wallet) => wallet.id === "user-1-wallet-1",
  )!;
  expect(
    (
      await mockRequest(page, `/wallets/${selected.id}`, "PATCH", {
        ...selected,
        network: "Polygon",
      })
    ).status,
  ).toBe(200);
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectFieldError(page.getByLabel(/^Rede(?:\s*\*)?$/));
  expect(
    (
      await mockRequest(page, `/wallets/${selected.id}`, "PATCH", {
        ...selected,
        type: "Coinbase Wallet",
      })
    ).status,
  ).toBe(200);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expectFieldError(page.getByLabel(/^Tipo da carteira(?:\s*\*)?$/));
  expect((await mockRequest<Order[]>(page, "/orders")).data).toEqual([]);
});

test("checkout keeps focus while correcting the first of multiple invalid fields", async ({
  page,
}) => {
  await checkout(page);
  const name = page.getByLabel(/^Nome completo(?:\s*\*)?$/);
  const username = page.getByLabel(/^Nome de usuário(?:\s*\*)?$/);
  await name.fill("");
  await username.fill("");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expectFieldError(name);
  await expectFieldError(username);
  await expect(name).toBeFocused();

  await page.keyboard.type("Colecionador de teste");
  await expect(name).toHaveValue("Colecionador de teste");
  await expect(name).toBeFocused();
  await expect(username).toHaveValue("");
  await expectFieldError(username);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("catalog minimum and maximum prices remain inclusive after refresh", async ({
  page,
}) => {
  const mobileFilters = page.getByRole("button", {
    name: "Filtros",
    exact: true,
  });
  if (await mobileFilters.isVisible()) await mobileFilters.click();
  await page
    .getByLabel("Preço mínimo em ETH")
    .filter({ visible: true })
    .fill("0.82");
  await page
    .getByLabel("Preço máximo em ETH")
    .filter({ visible: true })
    .fill("1.25");
  if (await page.getByRole("dialog").isVisible())
    await page.getByRole("button", { name: "Ver resultados" }).click();
  await page.getByLabel(/^Ordenar por(?:\s*\*)?$/).selectOption("price-asc");
  await expect(page).toHaveURL(/minPrice=[^&]*0\.82/);
  await expect(page).toHaveURL(/maxPrice=[^&]*1\.25/);

  const expected = [0.82, 0.82, 0.82, 0.82, 1.25, 1.25, 1.25, 1.25];
  const prices = page
    .getByTestId("nft-card")
    .locator(".card-meta span:first-child");
  await expect(page.getByTestId("nft-card")).toHaveCount(expected.length);
  await expect
    .poll(async () =>
      (await prices.allTextContents()).map((value) =>
        Number(value.replace(/\s*ETH/, "")),
      ),
    )
    .toEqual(expected);
  await page.reload();
  await expect(page.getByLabel("Preço mínimo em ETH").first()).toHaveValue(
    "0.82",
  );
  await expect(page.getByLabel("Preço máximo em ETH").first()).toHaveValue(
    "1.25",
  );
  await expect(page.getByTestId("nft-card")).toHaveCount(expected.length);
  await expect
    .poll(async () =>
      (await prices.allTextContents()).map((value) =>
        Number(value.replace(/\s*ETH/, "")),
      ),
    )
    .toEqual(expected);
});

test("catalog prices are actually ordered in both directions", async ({
  page,
}) => {
  for (const direction of ["price-asc", "price-desc"]) {
    await page.getByLabel(/^Ordenar por(?:\s*\*)?$/).selectOption(direction);
    await expect(page).toHaveURL(new RegExp(`sort=${direction}`));
    await expect(page.getByTestId("skeleton")).toHaveCount(0);
    const values = await page
      .getByTestId("nft-card")
      .locator(".card-meta span:first-child")
      .allTextContents();
    const prices = values.map((value) => Number(value.replace(/\s*ETH/, "")));
    expect(prices.length).toBeGreaterThan(1);
    expect(new Set(prices).size).toBeGreaterThan(1);
    expect(prices).toEqual(
      [...prices].sort((a, b) => (direction === "price-asc" ? a - b : b - a)),
    );
  }
});

test("slow catalog and cart quote show loaders, then offline catalog recovers on retry", async ({
  page,
}) => {
  await demo(page, { scenario: "slow", latency: 2200 });
  await page.reload();
  await expect(page.getByTestId("skeleton").first()).toBeVisible();
  await expect(page.getByTestId("nft-card")).toHaveCount(9);
  await demo(page, { scenario: "success", latency: 0 });
  await addFirstNft(page);
  await demo(page, { scenario: "slow", latency: 2200 });
  await page.reload();
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  await expect(page.locator(".summary").getByTestId("skeleton")).toBeVisible();
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.4525 ETH",
  );
  await demo(page, { scenario: "offline", latency: 0 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Não foi possível carregar" }),
  ).toBeVisible();
  await demo(page, { scenario: "success", latency: 0 });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByTestId("nft-card")).toHaveCount(9);
});

test("wallet invalid address and API conflict keep the dialog and entered data", async ({
  page,
}) => {
  await login(page, "/wallets");
  await page
    .getByRole("button", { name: "Adicionar carteira", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel(/^Nome de exibição(?:\s*\*)?$/)
    .fill("Carteira de teste");
  const address = dialog.getByLabel(/^Endereço da carteira(?:\s*\*)?$/);
  await address.fill("0xinvalid");
  await dialog.getByRole("button", { name: "Salvar carteira" }).click();
  await expectFieldError(address);
  const wallets = await mockRequest<Wallet[]>(page, "/wallets");
  await address.fill(wallets.data[0].address);
  await dialog
    .getByLabel(/^Rede(?:\s*\*)?$/)
    .selectOption(wallets.data[0].network);
  await dialog.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(dialog.getByRole("alert")).toContainText(/already|registrad/i);
  await expectFieldError(address);
  await expect(dialog.getByLabel(/^Nome de exibição(?:\s*\*)?$/)).toHaveValue(
    "Carteira de teste",
  );
  expect((await mockRequest<Wallet[]>(page, "/wallets")).data).toHaveLength(
    wallets.data.length,
  );
});

test("registration and password changes reject short and mismatched passwords accessibly", async ({
  page,
}) => {
  await page.goto("/register");
  await page.getByLabel(/^Nome(?:\s*\*)?$/).fill("Novo Colecionador");
  await page.getByLabel(/^Nome de usuário(?:\s*\*)?$/).fill("novocolecionador");
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill("novo@example.com");
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("A1");
  await page.getByLabel(/^Confirmar senha(?:\s*\*)?$/).fill("A1");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expectFieldError(page.getByLabel(/^Senha(?:\s*\*)?$/));
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expectFieldError(page.getByLabel(/^Confirmar senha(?:\s*\*)?$/));
  await login(page);
  await page.getByLabel(/^Senha atual(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByLabel(/^Nova senha(?:\s*\*)?$/).fill("A1");
  await page.getByLabel(/^Confirmar nova senha(?:\s*\*)?$/).fill("A1");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expectFieldError(page.getByLabel(/^Nova senha(?:\s*\*)?$/));
  await page.getByLabel(/^Nova senha(?:\s*\*)?$/).fill("Jungle456!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expectFieldError(page.getByLabel(/^Confirmar nova senha(?:\s*\*)?$/));
});

test("confirmation subtracts only the purchased snapshot and preserves later additions", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00Z"));
  await checkout(page);
  await demo(page, { scenario: "pending" });
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua coleção está a caminho." }),
  ).toBeVisible();
  const receipt = new URL(page.url()).pathname;
  await page.goto("/nft/1");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(
    page.getByTestId("cart-item").getByLabel(/^Quantidade(?:\s*\*)?$/),
  ).toHaveText("2");
  await page.goto("/nft/2");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByTestId("cart-item")).toHaveCount(2);
  await demo(page, { action: "settle-orders" });
  const cart = (await mockRequest<Cart>(page, "/cart")).data;
  expect(
    cart.items.map(({ nftId, quantity }) => ({ nftId, quantity })),
  ).toEqual([
    { nftId: "1", quantity: 1 },
    { nftId: "2", quantity: 1 },
  ]);
  await page.goto(receipt);
  await expect(
    page.getByRole("heading", { name: "Recibo da coleção" }),
  ).toBeVisible();
  const orders = (await mockRequest<Order[]>(page, "/orders")).data;
  expect(orders).toHaveLength(1);
  expect(orders[0].quote.items).toHaveLength(1);
  expect(orders[0].quote.items[0]).toMatchObject({ nftId: "1", quantity: 1 });
  await page.goto("/cart");
  await expect(page.getByTestId("cart-item")).toHaveCount(2);
  for (const item of await page.getByTestId("cart-item").all())
    await expect(item.getByLabel(/^Quantidade(?:\s*\*)?$/)).toHaveText("1");
});

async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 120; step++) {
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      await expect(target).toBeVisible();
      const ring = await target.evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          element.matches(":focus-visible") &&
          ((style.outlineStyle !== "none" &&
            parseFloat(style.outlineWidth) > 0) ||
            style.boxShadow !== "none")
        );
      });
      expect(ring, "O controle em foco deve exibir um indicador visível").toBe(
        true,
      );
      return;
    }
    await page.keyboard.press("Tab");
  }
  throw new Error("O controle não foi alcançado pela sequência de Tab.");
}

test("keyboard alone completes login, quantity, coupon, checkout, review and receipt", async ({
  page,
}) => {
  await page.goto("/login?redirect=/nft/1");
  await tabTo(page, page.getByLabel(/^E-mail(?:\s*\*)?$/));
  await page.keyboard.type("alex@example.com");
  await tabTo(page, page.getByLabel(/^Senha(?:\s*\*)?$/));
  await page.keyboard.type("Jungle123!");
  await tabTo(page, page.getByRole("button", { name: "Entrar", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/nft\/1$/);
  await tabTo(page, page.getByRole("button", { name: "Aumentar quantidade" }));
  await page.keyboard.press("Enter");
  await tabTo(
    page,
    page.getByRole("button", { name: "Adicionar ao carrinho", exact: true }),
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/cart$/);
  await tabTo(page, page.getByLabel(/^Código promocional(?:\s*\*)?$/));
  await page.keyboard.type("JUNGLE10");
  await tabTo(page, page.getByRole("button", { name: "Aplicar", exact: true }));
  await page.keyboard.press("Enter");
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.8125 ETH",
  );
  await tabTo(
    page,
    page.getByRole("link", { name: "Continuar para pagamento" }),
  );
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/checkout$/);
  for (const label of [
    "Nome completo",
    "Nome de usuário",
    "Nome do perfil",
    "E-mail",
    "Tipo da carteira",
    "Código de indicação",
    "Nome ENS",
  ]) {
    const field = page.getByLabel(new RegExp(`^${label}(?:\\s*\\*)?$`));
    await tabTo(page, field);
    await expect(field).not.toHaveValue("");
  }
  await tabTo(
    page,
    page.getByRole("button", { name: "Conectar carteira simulada" }),
  );
  await page.keyboard.press("Enter");
  await tabTo(
    page,
    page.getByLabel(
      "Entendo que esta compra é uma simulação, sem pagamento real.",
    ),
  );
  await page.keyboard.press("Space");
  await tabTo(page, page.getByRole("button", { name: "Revisar pedido" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await tabTo(page, page.getByRole("button", { name: "Confirmar compra" }));
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Recibo da coleção" }),
  ).toBeVisible();
});

async function expectReflow(page: Page, route: string) {
  await expect(page.locator(".skeleton")).toHaveCount(0);
  await readyForScreenshot(page);
  const measurement = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(
    measurement.content,
    `Overflow horizontal em ${route}`,
  ).toBeLessThanOrEqual(measurement.viewport + 1);
}

async function loadedRouteSweep(page: Page, zoom: number) {
  await page.addInitScript((level) => {
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.style.zoom = String(level);
    });
  }, zoom);
  for (const route of ["/login", "/register"]) {
    await page.goto(route);
    await expect(
      page.getByRole("button", {
        name: route === "/login" ? "Entrar" : "Criar minha conta",
        exact: true,
      }),
    ).toBeVisible();
    await expectReflow(page, route);
  }
  await checkout(page);
  await expect(page.getByLabel(/^Nome do perfil(?:\s*\*)?$/)).not.toHaveValue(
    "",
  );
  await expectReflow(page, "/checkout");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expectReflow(page, "/checkout (revisão)");
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Recibo da coleção" }),
  ).toBeVisible();
  const receipt = new URL(page.url()).pathname;
  await mockRequest(page, "/cart/items", "POST", {
    nftId: "2",
    editionId: "standard",
    quantity: 1,
  });
  await mockRequest(page, "/favorites/1", "POST");
  const routes = [
    { path: "/", ready: () => page.getByTestId("nft-card").first() },
    {
      path: "/nft/1",
      ready: () =>
        page
          .getByRole("heading", { name: "Emerald Ape #042", exact: true })
          .first(),
    },
    { path: "/cart", ready: () => page.getByTestId("cart-item").first() },
    {
      path: "/profile",
      ready: () => page.getByLabel(/^Nome de exibição(?:\s*\*)?$/),
    },
    {
      path: "/wallets",
      ready: () => page.getByRole("button", { name: /^Editar / }).first(),
    },
    { path: "/favorites", ready: () => page.getByTestId("nft-card").first() },
    {
      path: receipt,
      ready: () => page.getByRole("heading", { name: "Recibo da coleção" }),
    },
  ];
  for (const route of routes) {
    await page.goto(route.path);
    await expect(route.ready()).toBeVisible();
    await expectReflow(page, route.path);
    if (route.path === "/wallets") {
      await page
        .getByRole("button", { name: "Adicionar carteira", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expectReflow(page, "/wallets (formulário)");
      await page.keyboard.press("Escape");
    }
  }
  // Confere também o checkout com o segundo item, após navegação direta.
  await page.goto("/checkout");
  await expect(page.getByLabel(/^Nome completo(?:\s*\*)?$/)).toBeVisible();
  await expectReflow(page, "/checkout (acesso direto)");
}

test("all loaded routes and account forms fit the tablet viewport", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "desktop",
    "A varredura tablet usa um contexto único e dimensões explícitas.",
  );
  test.setTimeout(120000);
  await page.setViewportSize({ width: 768, height: 1024 });
  await loadedRouteSweep(page, 1);
});

for (const width of [390, 768, 1440]) {
  test(`all loaded routes reflow at 200 percent CSS zoom in a ${width}px viewport`, async ({
    page,
  }, info) => {
    test.skip(
      info.project.name !== "desktop",
      "Cada largura já é exercitada explicitamente.",
    );
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    await loadedRouteSweep(page, 2);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).zoom,
      ),
    ).toBe("2");
  });
}
