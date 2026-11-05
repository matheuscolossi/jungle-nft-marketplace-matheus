import { expect, type Page } from "@playwright/test";

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

export async function readyForScreenshot(page: Page) {
  await expect(page.getByTestId("skeleton")).toHaveCount(0);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter((image) => !image.complete)
        .map(
          (image) =>
            new Promise((resolve) => {
              image.onload = image.onerror = resolve;
            }),
        ),
    );
  });
}
