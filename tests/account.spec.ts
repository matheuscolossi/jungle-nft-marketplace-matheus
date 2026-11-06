import { test, expect } from "@playwright/test";
import { boot, demo, expectFieldError, login, mockRequest } from "./helpers";
import type { Wallet } from "../src/types";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test("registration validates fields, reports conflicts and restores the session", async ({
  page,
}) => {
  await page.goto("/register?redirect=/profile");
  if (page.viewportSize()!.width < 600) {
    const switchLink = page.getByRole("link", { name: "Entre", exact: true });
    const bounds = await switchLink.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    );
  }
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
  await expectFieldError(page.getByLabel(/^Nome(?:\s*\*)?$/));
  await expectFieldError(page.getByLabel(/^Nome de usuário(?:\s*\*)?$/));
  await page.getByLabel(/^Nome(?:\s*\*)?$/).fill("Colecionador Teste");
  await page
    .getByLabel(/^Nome de usuário(?:\s*\*)?$/)
    .fill("colecionadorteste");
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
  await page.getByLabel(/^Nome de usuário(?:\s*\*)?$/).fill("alexcollector");
  await page.getByLabel(/^Nome ENS(?:\s*\*)?$/).fill("collector.eth");
  await page
    .getByLabel(/^Apelido da carteira(?:\s*\*)?$/)
    .fill("Minha principal");
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
  await expect(page.getByLabel(/^Nome de usuário(?:\s*\*)?$/)).toHaveValue(
    "alexcollector",
  );
  await expect(page.getByLabel(/^Nome ENS(?:\s*\*)?$/)).toHaveValue(
    "collector.eth",
  );
  await expect(page.getByLabel(/^Apelido da carteira(?:\s*\*)?$/)).toHaveValue(
    "Minha principal",
  );
  await expect(page.getByRole("img", { name: "Seu avatar" })).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  await page
    .getByRole("button", { name: "Remover avatar", exact: true })
    .click();
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Perfil atualizado com sucesso." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("img", { name: "Seu avatar" })).toHaveAttribute(
    "src",
    "/assets/avatar.svg",
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
  await expectFieldError(dialog.getByLabel(/^Nome de exibição(?:\s*\*)?$/));
  await dialog
    .getByLabel(/^Nome de exibição(?:\s*\*)?$/)
    .fill("Carteira secundária");
  await dialog.getByLabel(/^Apelido da carteira(?:\s*\*)?$/).fill("Secundária");
  await dialog
    .getByLabel(/^Nome do perfil(?:\s*\*)?$/)
    .fill("Alex Colecionador");
  await dialog
    .getByLabel(/^Tipo da carteira(?:\s*\*)?$/)
    .selectOption("Coinbase Wallet");
  await dialog.getByLabel(/^Código de indicação(?:\s*\*)?$/).fill("AMIGOS10");
  await dialog.getByLabel(/^E-mail(?:\s*\*)?$/).fill("wallet@example.com");
  await dialog.getByLabel(/^Nome ENS(?:\s*\*)?$/).fill("secundaria.eth");
  await dialog
    .getByLabel(/^ENS ou carteira secundária(?:\s*\*)?$/)
    .fill("reserva.eth");
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
  await expect(
    dialog.getByLabel(/^Apelido da carteira(?:\s*\*)?$/),
  ).toHaveValue("Secundária");
  await expect(dialog.getByLabel(/^Nome do perfil(?:\s*\*)?$/)).toHaveValue(
    "Alex Colecionador",
  );
  await expect(dialog.getByLabel(/^Tipo da carteira(?:\s*\*)?$/)).toHaveValue(
    "Coinbase Wallet",
  );
  await expect(
    dialog.getByLabel(/^Código de indicação(?:\s*\*)?$/),
  ).toHaveValue("AMIGOS10");
  await expect(dialog.getByLabel(/^E-mail(?:\s*\*)?$/)).toHaveValue(
    "wallet@example.com",
  );
  await expect(dialog.getByLabel(/^Nome ENS(?:\s*\*)?$/)).toHaveValue(
    "secundaria.eth",
  );
  await expect(
    dialog.getByLabel(/^ENS ou carteira secundária(?:\s*\*)?$/),
  ).toHaveValue("reserva.eth");
  await dialog
    .getByLabel(/^Nome de exibição(?:\s*\*)?$/)
    .fill("Minha carteira Polygon");
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
  const result = await mockRequest<Wallet[]>(page, "/wallets");
  expect(result.data.filter((wallet) => wallet.primary)).toHaveLength(1);
  expect(
    result.data.find((wallet) => wallet.name === "Minha carteira Polygon"),
  ).toMatchObject({
    nickname: "Secundária",
    profileName: "Alex Colecionador",
    type: "Coinbase Wallet",
    referralCode: "AMIGOS10",
    email: "wallet@example.com",
    ensName: "secundaria.eth",
    secondaryAddress: "reserva.eth",
  });
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

test("profile preserves an edited draft across background refresh and locks fields until saving finishes", async ({
  page,
}) => {
  await login(page);
  const name = page.getByLabel("Nome de exibição");
  const nickname = page.getByLabel(/^Apelido da carteira(?:\s*\*)?$/);
  const avatar = page.locator("input[type=file]");
  await expect(name).toHaveValue("Alex Morgan");
  const initial = await mockRequest<Record<string, unknown>>(page, "/profile");
  await name.fill("Rascunho de Alex");
  await nickname.fill("Carteira do rascunho");
  await avatar.setInputFiles({
    name: "draft-avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2xkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(page.getByRole("img", { name: "Seu avatar" })).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );
  const external = await mockRequest(page, "/profile", "PATCH", {
    ...initial.data,
    name: "Atualizado em outra aba",
    bio: "Alteração recebida pelo servidor.",
  });
  expect(external.status).toBe(200);

  // O laboratório invalida a consulta ativa sem desmontar o formulário.
  await page.getByRole("button", { name: "Cenários de demonstração" }).click();
  const laboratory = page.getByRole("dialog");
  await laboratory.getByTestId("demo-scenario").selectOption("success");
  const refreshed = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/profile") &&
      response.request().method() === "GET",
  );
  await laboratory.getByRole("button", { name: "Aplicar cenário" }).click();
  await refreshed;
  await expect(laboratory.getByRole("status")).toHaveText(
    "Cenário atualizado.",
  );
  await laboratory.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(name).toHaveValue("Rascunho de Alex");
  await expect(nickname).toHaveValue("Carteira do rascunho");
  await expect(page.getByRole("img", { name: "Seu avatar" })).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );

  await demo(page, { latency: 600 });
  const saved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/profile") &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(name).toBeDisabled();
  await expect(nickname).toBeDisabled();
  await expect(avatar).toBeDisabled();
  await expect(page.getByRole("button", { name: "Salvando…" })).toBeDisabled();
  await saved;
  // A resposta do PATCH ainda é seguida pela atualização do perfil e da sessão.
  await expect(name).toBeDisabled();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Perfil atualizado com sucesso." }),
  ).toBeVisible();
  await expect(name).toBeEnabled();
  await expect(name).toHaveValue("Rascunho de Alex");
  await expect(page.getByRole("img", { name: "Seu avatar" })).toHaveAttribute(
    "src",
    /^data:image\/png/,
  );

  const currentPassword = page.getByLabel(/^Senha atual(?:\s*\*)?$/);
  const newPassword = page.getByLabel(/^Nova senha(?:\s*\*)?$/);
  const confirmPassword = page.getByLabel(/^Confirmar nova senha(?:\s*\*)?$/);
  await currentPassword.fill("Jungle123!");
  await newPassword.fill("Jungle456!");
  await confirmPassword.fill("Jungle456!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(currentPassword).toBeDisabled();
  await expect(newPassword).toBeDisabled();
  await expect(confirmPassword).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "Senha alterada com sucesso." }),
  ).toBeVisible();
  await expect(currentPassword).toBeEnabled();
  await expect(newPassword).toHaveValue("");
});
