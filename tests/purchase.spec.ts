import { test, expect } from "@playwright/test";
import {
  addFirstNft,
  boot,
  checkout,
  collector,
  demo,
  mockRequest,
  readyForScreenshot,
} from "./helpers";
import type { Cart, Order, Quote } from "../src/types";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test("cart quantities, stock limits, coupon errors, exact totals and removal", async ({
  page,
}) => {
  await addFirstNft(page);
  const item = page.getByTestId("cart-item");
  await item.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(item.getByLabel(/^Quantidade(?:\s*\*)?$/)).toHaveText("2");
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.9025 ETH",
  );
  await page.getByLabel(/^Código promocional(?:\s*\*)?$/).fill("INVALID");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/not valid|inválid/i);
  await page.getByLabel(/^Código promocional(?:\s*\*)?$/).fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/expired|expirad/i);
  await page.getByLabel(/^Código promocional(?:\s*\*)?$/).fill("JUNGLE10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.8125 ETH",
  );
  await page.reload();
  await expect(
    page.getByTestId("cart-item").getByLabel(/^Quantidade(?:\s*\*)?$/),
  ).toHaveText("2");
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.8125 ETH",
  );
  await page.getByRole("button", { name: "Remover cupom" }).click();
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.9025 ETH",
  );
  await item.getByRole("button", { name: "Diminuir quantidade" }).click();
  await expect(item.getByLabel(/^Quantidade(?:\s*\*)?$/)).toHaveText("1");
  await item
    .getByRole("button", { name: "Remover Emerald Ape #042", exact: true })
    .click();
  await expect(page.getByTestId("cart-item")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Sua coleção começa com uma escolha" }),
  ).toBeVisible();
});

test("wallet connection can be refused, connected and disconnected before review", async ({
  page,
}) => {
  await checkout(page);
  await page.getByRole("button", { name: "Desconectar carteira" }).click();
  await expect(
    page.getByRole("button", { name: "Revisar pedido" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Simular recusa de conexão" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Conexão recusada." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Conectar carteira simulada" })
    .click();
  await page.getByLabel("Nome completo").fill("A");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByLabel("Nome completo").fill("Alex Morgan");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toContainText("Alex Morgan");
  await expect(page.getByRole("dialog").locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("complete purchase produces one immutable confirmed receipt after repeated clicks", async ({
  page,
}) => {
  await checkout(page);
  await page
    .getByLabel(/^ENS ou carteira secundária(?:\s*\*)?$/)
    .fill("reserva.eth");
  await page
    .getByLabel(/^Observação \(opcional\)(?:\s*\*)?$/)
    .fill("Minha primeira coleção.");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).dblclick();
  await expect(page).toHaveURL(/\/order\/order-/, { timeout: 20000 });
  await expect(
    page.getByRole("heading", {
      name: "A arte agora faz parte da sua história.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recibo da coleção" }),
  ).toBeVisible();
  const orders = await mockRequest<Order[]>(page, "/orders");
  expect(orders.data).toHaveLength(1);
  expect(orders.data[0].status).toBe("confirmed");
  expect(orders.data[0].quote.total).toBe("0.4525");
  expect(orders.data[0].collector).toMatchObject({
    ...collector,
    secondaryAddress: "reserva.eth",
    note: "Minha primeira coleção.",
  });
  expect((await mockRequest<Cart>(page, "/cart")).data.items).toHaveLength(0);
  await demo(page, { action: "update-nft", nftId: "1", price: "9.99" });
  await page.reload();
  await expect(page.locator(".receipt .grand-total dd")).toHaveText(
    "0.4525 ETH",
  );
  expect(
    (await mockRequest<Order>(page, `/orders/${orders.data[0].id}`)).data.quote
      .total,
  ).toBe("0.4525");
});

test("payment refusal preserves items and never renders a confirmed receipt", async ({
  page,
}) => {
  await checkout(page);
  await demo(page, { scenario: "payment-refused" });
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "O pagamento foi recusado." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recibo da coleção" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar ao carrinho" }).click();
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
});

test("response loss recovers the same idempotent order without a second purchase", async ({
  page,
}) => {
  await checkout(page);
  await demo(page, { scenario: "order-timeout" });
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).toHaveURL(/\/order\/order-/, { timeout: 20000 });
  await expect(
    page.getByRole("heading", {
      name: "A arte agora faz parte da sua história.",
    }),
  ).toBeVisible();
  const orders = await mockRequest<Order[]>(page, "/orders");
  expect(orders.data).toHaveLength(1);
  const id = orders.data[0].id;
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/order/${id}$`));
  expect((await mockRequest<Order[]>(page, "/orders")).data).toHaveLength(1);
});

test("session expiration during checkout preserves the cart and collector draft for resumption", async ({
  page,
}) => {
  await checkout(page);
  await page.getByLabel("Nome completo").fill("Alex Retomada");
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await demo(page, { action: "expire-session" });
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page).toHaveURL(/\/login.*redirect/);
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill("alex@example.com");
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.getByLabel("Nome completo")).toHaveValue("Alex Retomada");
  expect((await mockRequest<Cart>(page, "/cart")).data.items).toHaveLength(1);
  expect((await mockRequest<Order[]>(page, "/orders")).data).toHaveLength(0);
});

test("order API enforces idempotency payload matching and user permissions", async ({
  page,
}) => {
  await checkout(page);
  await demo(page, { scenario: "pending" });
  const quote = await mockRequest<Quote>(page, "/quote", "POST", {});
  const body = {
    quoteId: quote.data.id,
    walletId: "user-1-wallet-1",
    network: "Ethereum",
    collector,
  };
  const first = await mockRequest<Order>(page, "/orders", "POST", body, {
    "Idempotency-Key": "test-repeat",
  });
  const repeated = await mockRequest<Order>(page, "/orders", "POST", body, {
    "Idempotency-Key": "test-repeat",
  });
  expect(first.status).toBe(201);
  expect(repeated.data.id).toBe(first.data.id);
  expect(
    (
      await mockRequest(
        page,
        "/orders",
        "POST",
        { ...body, network: "Polygon" },
        { "Idempotency-Key": "test-repeat" },
      )
    ).status,
  ).toBe(409);
  await page.goto(`/order/${first.data.id}`);
  await expect(
    page.getByRole("heading", { name: "Sua coleção está a caminho." }),
  ).toBeVisible();
  await mockRequest(page, "/session", "DELETE");
  await mockRequest(page, "/session", "POST", {
    email: "sofia@example.com",
    password: "Jungle123!",
  });
  expect((await mockRequest(page, `/orders/${first.data.id}`)).status).toBe(
    403,
  );
});

test("cart and checkout have stable visual baselines", async ({ page }) => {
  await checkout(page);
  await readyForScreenshot(page);
  await expect(page).toHaveScreenshot("checkout.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/cart");
  await expect(page.getByTestId("cart-item")).toHaveCount(1);
  await readyForScreenshot(page);
  await expect(page).toHaveScreenshot("cart.png", {
    fullPage: true,
    animations: "disabled",
  });
});
