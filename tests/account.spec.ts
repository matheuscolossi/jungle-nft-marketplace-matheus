import { test, expect } from "@playwright/test";
import { boot, demo, login, mockRequest } from "./helpers";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test("registration validates fields, reports conflicts and restores the session", async ({
  page,
}) => {
  await page.goto("/register?redirect=/profile");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await page.getByLabel(/^Nome(?:\s*\*)?$/).fill("Colecionador Teste");
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill("alex@example.com");
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByLabel(/^Confirmar senha(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("alert")).toContainText(/already|registrad/i);
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill("collector@example.com");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Colecionador Teste",
  );
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Colecionador Teste",
  );
});

test("login rejects invalid credentials and returns to the protected route after expiration", async ({
  page,
}) => {
  await page.goto("/wallets");
  await expect(page).toHaveURL(/\/login.*redirect/);
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill("alex@example.com");
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("incorrect");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/incorrect|incorret/i);
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/wallets$/);
  await expect(
    page.getByRole("heading", { name: "Suas carteiras" }),
  ).toBeVisible();
  await demo(page, { action: "expire-session" });
  await page.reload();
  await expect(page).toHaveURL(/\/login.*redirect/);
  await page.getByLabel(/^E-mail(?:\s*\*)?$/).fill("alex@example.com");
  await page.getByLabel(/^Senha(?:\s*\*)?$/).fill("Jungle123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/wallets$/);
});

test("profile, avatar and password changes persist and handle server validation", async ({
  page,
}) => {
  await login(page);
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Alex Morgan");
  await demo(page, { scenario: "validation-error" });
  await page.getByLabel("Nome de exibição").fill("Alex Collector");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(page.getByRole("alert")).toContainText(/unavailable|indispon/i);
  await demo(page, { scenario: "success" });
  await page.getByLabel("Sobre você").fill("Minha coleção de arte digital.");
  await page.locator("input[type=file]").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2xkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Perfil atualizado com sucesso." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Alex Collector",
  );
  await expect(page.getByLabel("Sobre você")).toHaveValue(
    "Minha coleção de arte digital.",
  );
  await expect(page.getByRole("img", { name: "Seu avatar" })).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  await page.getByLabel(/^Senha atual(?:\s*\*)?$/).fill("incorrect");
  await page.getByLabel(/^Nova senha(?:\s*\*)?$/).fill("Jungle456!");
  await page.getByLabel(/^Confirmar nova senha(?:\s*\*)?$/).fill("Jungle456!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(/incorrect|incorret/i);
  await page.getByLabel(/^Senha atual(?:\s*\*)?$/).fill("Jungle123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Senha alterada com sucesso." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  await login(page, "/profile", "alex@example.com", "Jungle456!");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Alex Collector",
  );
});

test("wallet dialog traps focus, validates, adds and edits primary and secondary wallets", async ({
  page,
}) => {
  await login(page, "/wallets");
  const add = page.getByRole("button", {
    name: "Adicionar carteira",
    exact: true,
  });
  await add.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(":focus")).toHaveCount(1);
  for (let index = 0; index < 8; index++) await page.keyboard.press("Tab");
  await expect(dialog.locator(":focus")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(add).toBeFocused();
  await add.click();
  await dialog.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(dialog.getByText("Dê um nome à sua carteira.")).toBeVisible();
  await dialog.getByLabel("Nome da carteira").fill("Carteira secundária");
  await dialog.getByLabel("Endereço da carteira").fill(`0x${"c".repeat(40)}`);
  await dialog.getByLabel(/^Rede(?:\s*\*)?$/).selectOption("Polygon");
  await dialog.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Carteira secundária", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar Carteira secundária" })
    .click();
  await dialog.getByLabel("Nome da carteira").fill("Minha carteira Polygon");
  await dialog.getByLabel("Definir como carteira principal").check();
  await dialog.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Minha carteira Polygon", exact: true }),
  ).toBeVisible();
  await page.reload();
  const wallet = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Minha carteira Polygon",
      exact: true,
    }),
  });
  await expect(wallet).toContainText("CARTEIRA PRINCIPAL");
  const result = await mockRequest<{ primary: boolean }[]>(page, "/wallets");
  expect(result.data.filter((wallet) => wallet.primary)).toHaveLength(1);
});

test("logout and account changes isolate private favorites and profile data", async ({
  page,
}) => {
  await login(page);
  expect((await mockRequest(page, "/favorites/1", "POST")).status).toBe(200);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  await login(page, "/profile", "sofia@example.com");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Sofia Chen");
  expect((await mockRequest<string[]>(page, "/favorites")).data).toEqual([]);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/");
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
