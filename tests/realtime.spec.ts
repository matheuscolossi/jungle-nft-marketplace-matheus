import { test, expect } from "@playwright/test";
import { boot, checkout, demo, mockRequest } from "./helpers";
import type { Cart, Order } from "../src/types";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test("Socket.IO price change updates checkout and requires a new review", async ({
  page,
}) => {
  await checkout(page);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await demo(page, { action: "update-nft", nftId: "1", price: "0.99" });
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "0.9925 ETH",
  );
  await expect(page.locator(".live-notice")).toContainText(
    "Preço ou disponibilidade atualizado",
  );
  if (await page.getByRole("dialog").isVisible())
    await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /mudaram|alterad|revise/i })
      .first(),
  ).toBeVisible();
  expect((await mockRequest<Order[]>(page, "/orders")).data).toHaveLength(0);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.locator(".receipt .grand-total dd")).toHaveText(
    "0.9925 ETH",
  );
});

test("Socket.IO stock exhaustion prevents a stale purchase and preserves the cart", async ({
  page,
}) => {
  await checkout(page);
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await demo(page, { action: "update-nft", nftId: "1", stock: 0 });
  if (await page.getByRole("dialog").isVisible())
    await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: /only 0|stock|disponib|available/i })
      .first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toHaveCount(0);
  expect((await mockRequest<Order[]>(page, "/orders")).data).toHaveLength(0);
  expect((await mockRequest<Cart>(page, "/cart")).data.items).toHaveLength(1);
});

test("duplicate and older Socket.IO events do not invalidate or regress data", async ({
  page,
}) => {
  await checkout(page);
  let quoteRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/quote") quoteRequests++;
  });
  await demo(page, { action: "update-nft", nftId: "1", price: "1.1" });
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "1.1025 ETH",
  );
  const acceptedCount = quoteRequests;
  expect(acceptedCount).toBeGreaterThan(0);
  await demo(page, { action: "replay-event" });
  await demo(page, { action: "replay-event", old: true });
  await page.waitForTimeout(600);
  expect(quoteRequests).toBe(acceptedCount);
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "1.1025 ETH",
  );
});

test("pending order survives disconnect, refresh and reconnect without duplication", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-11-05T12:00:00Z"));
  await checkout(page);
  await demo(page, { scenario: "pending" });
  await page.getByRole("button", { name: "Revisar pedido" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Sua coleção está a caminho." }),
  ).toBeVisible();
  const path = new URL(page.url()).pathname;
  await demo(page, { action: "disconnect" });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sua coleção está a caminho." }),
  ).toBeVisible();
  await demo(page, { action: "settle-orders" });
  await demo(page, { action: "reconnect" });
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(path);
  expect((await mockRequest<Order[]>(page, "/orders")).data).toHaveLength(1);
  await demo(page, { action: "replay-event", old: true });
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});

test("demo reset restores the catalog, private state and event subscriptions", async ({
  page,
}) => {
  await checkout(page);
  await demo(page, { action: "update-nft", nftId: "1", price: "1.1" });
  await expect(page.locator(".summary .grand-total dd")).toHaveText(
    "1.1025 ETH",
  );
  await page.getByRole("button", { name: "Cenários de demonstração" }).click();
  await page
    .getByRole("button", { name: "Restaurar demonstração", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("nft-card")).toHaveCount(9);
  expect((await mockRequest<Cart>(page, "/cart")).data.items).toHaveLength(0);
  await page.goto("/nft/1");
  await expect(page.locator(".detail-price")).toHaveText("0.45 ETH");
  await demo(page, { action: "update-nft", nftId: "1", price: "0.99" });
  await expect(page.locator(".detail-price")).toHaveText("0.99 ETH");
});
