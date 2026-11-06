import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ComponentProps,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, Wallet as WalletIcon, X } from "lucide-react";
import { api, err } from "../lib/api";
import { useSession } from "../lib/session";
import { Button } from "../components/ui/button";
import { Field } from "../components/Field";
import type { ApiError, User, Wallet } from "../types";
import { MarketBackdrop } from "./Market";

type Errors = Record<string, string>;
const emailIsValid = (value: string) =>
  value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const usernameIsValid = (value: string) =>
  /^[a-z0-9][a-z0-9_-]{2,29}$/i.test(value.trim());
const ensIsValid = (value: string) =>
  /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]\.eth$/i.test(value.trim());
const addressIsValid = (value: string) =>
  /^0x[a-fA-F0-9]{40}$/.test(value.trim());

// O foco acompanha tanto a validação local quanto os erros devolvidos pela API.
function focusFirstInvalid(form: HTMLFormElement | null, fields: Errors) {
  requestAnimationFrame(() => {
    const controls = form?.querySelectorAll<HTMLElement>("[name]");
    const first = Array.from(controls ?? []).find((control) =>
      Boolean(fields[control.getAttribute("name") ?? ""]),
    );
    first?.focus();
  });
}
function serverFields(error: unknown): Errors {
  return (
    (error as { response?: { data?: ApiError } })?.response?.data?.fields ?? {}
  );
}
function profileValues(profile: User) {
  return {
    name: profile.name,
    username: profile.username,
    email: profile.email,
    ensName: profile.ensName,
    walletNickname: profile.walletNickname,
    bio: profile.bio,
    avatar: profile.avatar,
  };
}
function destination() {
  const redirect =
    new URLSearchParams(window.location.search).get("redirect") ?? "/";
  return redirect.startsWith("/") &&
    !redirect.startsWith("//") &&
    !redirect.startsWith("/login") &&
    !redirect.startsWith("/register")
    ? redirect
    : "/";
}

function PasswordField(props: ComponentProps<typeof Field>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <Field {...props} type={visible ? "text" : "password"} />
      <button
        className="password-toggle"
        type="button"
        aria-label={`${visible ? "Ocultar" : "Mostrar"} ${props.label.toLowerCase()}`}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible(!visible)}
      >
        <img src="/assets/figma/auth-hide.svg" alt="" />
      </button>
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="google-mark" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <img
          key={index}
          src={`/assets/figma/auth-google-${index}.svg`}
          alt=""
        />
      ))}
    </span>
  );
}

export function AuthPage({ mode }: { mode?: "login" | "register" }) {
  const register =
    (mode ??
      (window.location.pathname === "/register" ? "register" : "login")) ===
    "register";
  const { refresh } = useSession();
  const navigate = useNavigate();
  const formElement = useRef<HTMLFormElement | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const mutation = useMutation({
    mutationFn: () => api.post(register ? "/register" : "/session", form),
    onSuccess: async () => {
      await refresh();
      await navigate({ to: destination() });
    },
    onError: (error) => {
      const fields = serverFields(error);
      setErrors(fields);
      focusFirstInvalid(formElement.current, fields);
    },
  });
  useEffect(() => {
    setErrors({});
    mutation.reset();
  }, [register]);
  const set = (key: keyof typeof form, value: string) => {
    setForm((s) => ({ ...s, [key]: value }));
    setErrors((s) => ({ ...s, [key]: "" }));
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const next: Errors = {};
    if (register && form.name.trim().length < 2)
      next.name = "Informe um nome com pelo menos 2 caracteres.";
    if (register && !usernameIsValid(form.username))
      next.username = "Use de 3 a 30 letras, números, hífens ou sublinhados.";
    if (!emailIsValid(form.email)) next.email = "Informe um e-mail válido.";
    if (form.password.length < (register ? 8 : 1))
      next.password = register
        ? "Use pelo menos 8 caracteres."
        : "Informe sua senha.";
    if (register && form.password !== form.confirmPassword)
      next.confirmPassword = "As senhas precisam ser iguais.";
    setErrors(next);
    focusFirstInvalid(formElement.current, next);
    if (!Object.keys(next).length) mutation.mutate();
  }
  const query = new URLSearchParams(window.location.search).toString();
  return (
    <section
      className={`auth-layout auth-composition ${register ? "auth-register" : "auth-login"}`}
    >
      <MarketBackdrop />
      <Dialog.Root
        open
        onOpenChange={(open) => {
          if (!open && !mutation.isPending) void navigate({ to: "/" });
        }}
      >
        <Dialog.Overlay className="auth-scrim" />
        <Dialog.Content
          className="auth-panel"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            formElement.current?.querySelector("input")?.focus();
          }}
        >
          <Link
            className="auth-mobile-brand"
            to="/"
            aria-label="Kurio início"
            aria-disabled={mutation.isPending}
            onClick={(event) => {
              if (mutation.isPending) event.preventDefault();
            }}
          >
            KURIO
          </Link>
          <Dialog.Close asChild>
            <Button
              className="auth-close"
              variant="ghost"
              size="icon"
              aria-label="Fechar formulário"
              disabled={mutation.isPending}
            >
              <img src="/assets/figma/auth-close.svg" alt="" />
            </Button>
          </Dialog.Close>
          <div className="auth-tabs">
            <Link
              to="/login"
              aria-disabled={mutation.isPending}
              onClick={(event) => {
                if (mutation.isPending) event.preventDefault();
              }}
              search={Object.fromEntries(new URLSearchParams(query))}
              aria-current={!register ? "page" : undefined}
            >
              Entrar
            </Link>
            <span aria-hidden="true">|</span>
            <Link
              to="/register"
              aria-disabled={mutation.isPending}
              onClick={(event) => {
                if (mutation.isPending) event.preventDefault();
              }}
              search={Object.fromEntries(new URLSearchParams(query))}
              aria-current={register ? "page" : undefined}
            >
              Criar conta
            </Link>
          </div>
          <Dialog.Title asChild>
            <h1 className="auth-accessible-title">
              {register ? "Sua coleção começa aqui." : "Bom ter você de volta."}
            </h1>
          </Dialog.Title>
          <p className="auth-mobile-title" aria-hidden="true">
            {register ? "Criar perfil de colecionador" : "Entrar"}
          </p>
          <Dialog.Description className="auth-description">
            {register
              ? "Crie seu perfil de colecionador e conecte uma carteira quando quiser."
              : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
          </Dialog.Description>
          <form
            ref={formElement}
            onSubmit={submit}
            noValidate
            className="account-form auth-form"
          >
            {register && (
              <Field
                label="Nome"
                name="name"
                placeholder="Nome de exibição"
                autoComplete="name"
                required
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                error={errors.name}
                maxLength={80}
              />
            )}
            {register && (
              <Field
                label="Nome de usuário"
                name="username"
                placeholder="Nome de usuário"
                autoComplete="username"
                required
                value={form.username}
                onChange={(event) => set("username", event.target.value)}
                error={errors.username}
                minLength={3}
                maxLength={30}
                autoCapitalize="none"
                spellCheck={false}
              />
            )}
            <Field
              label="E-mail"
              type="email"
              name="email"
              placeholder={register ? "Digite seu e-mail" : "contato@email.com"}
              autoComplete="email"
              required
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              error={errors.email}
              maxLength={254}
            />
            <PasswordField
              label="Senha"
              name="password"
              placeholder="Senha"
              autoComplete={register ? "new-password" : "current-password"}
              required
              value={form.password}
              onChange={(event) => set("password", event.target.value)}
              error={errors.password}
            />
            {register && (
              <PasswordField
                label="Confirmar senha"
                name="confirmPassword"
                placeholder="Confirmar senha"
                autoComplete="new-password"
                required
                value={form.confirmPassword}
                onChange={(event) => set("confirmPassword", event.target.value)}
                error={errors.confirmPassword}
              />
            )}
            {!register && (
              <button
                className="auth-forgot"
                type="button"
                onClick={() =>
                  setAuthNotice(
                    "Use alex@example.com com a senha Jungle123!, ou crie um novo perfil para experimentar.",
                  )
                }
              >
                Esqueceu a senha?
              </button>
            )}
            <p className="auth-feedback" role="status">
              {authNotice}
            </p>
            {mutation.isError && (
              <p role="alert" className="error">
                {err(mutation.error)}
              </p>
            )}
            <Button
              type="submit"
              className="auth-submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? "Aguarde…"
                : register
                  ? "Criar minha conta"
                  : "Entrar"}
            </Button>
          </form>
          <div className="auth-social">
            <p className="auth-divider">Ou continue com</p>
            <div className="auth-social-buttons">
              <button
                type="button"
                disabled
                title="Use o acesso por e-mail nesta demonstração."
                aria-describedby="auth-provider-note"
              >
                <GoogleMark />
                Continuar com Google
              </button>
              <button
                type="button"
                disabled
                title="Use o acesso por e-mail nesta demonstração."
                aria-describedby="auth-provider-note"
              >
                <img src="/assets/figma/auth-facebook.svg" alt="" />
                Continuar com Facebook
              </button>
            </div>
          </div>
          <p className="auth-provider-note" id="auth-provider-note">
            Use o acesso por e-mail nesta demonstração.
          </p>
          <p className="auth-mobile-switch">
            {register ? "Já tem uma conta? " : "Novo na Kurio? "}
            <Link
              to={register ? "/login" : "/register"}
              aria-disabled={mutation.isPending}
              onClick={(event) => {
                if (mutation.isPending) event.preventDefault();
              }}
              search={Object.fromEntries(new URLSearchParams(query))}
            >
              {register ? "Entre" : "Crie uma conta"}
            </Link>
          </p>
        </Dialog.Content>
      </Dialog.Root>
    </section>
  );
}

export function AccountSidebar() {
  const { logout, user } = useSession();
  const navigate = useNavigate();
  return (
    <aside className="account-sidebar panel">
      <p className="eyebrow">Meu perfil</p>
      <p className="muted">{user?.name}</p>
      <nav aria-label="Conta do colecionador">
        <Link to="/profile" activeProps={{ "aria-current": "page" }}>
          <img src="/assets/figma/account-user.svg" alt="" />
          Dados do perfil
        </Link>
        <Link to="/wallets" activeProps={{ "aria-current": "page" }}>
          <img src="/assets/figma/account-wallet.svg" alt="" />
          Carteiras
        </Link>
        <span className="account-nav-unavailable" aria-disabled="true">
          <img src="/assets/figma/account-activity.svg" alt="" />
          Atividade
        </span>
        <Link to="/favorites" activeProps={{ "aria-current": "page" }}>
          <img src="/assets/figma/account-heart.svg" alt="" />
          Favoritos
        </Link>
        <span className="account-nav-unavailable" aria-disabled="true">
          <img src="/assets/figma/account-offers.svg" alt="" />
          Ofertas
        </span>
        <span className="account-nav-unavailable" aria-disabled="true">
          <img src="/assets/figma/account-download.svg" alt="" />
          Arquivos baixados
        </span>
        <span className="account-nav-unavailable" aria-disabled="true">
          <img src="/assets/figma/account-support.svg" alt="" />
          Suporte
        </span>
        <button
          type="button"
          onClick={async () => {
            await logout(() => navigate({ to: "/" }));
          }}
        >
          <img src="/assets/figma/account-logout.svg" alt="" />
          Sair
        </button>
      </nav>
    </aside>
  );
}

export function ProfilePage() {
  const { user, refresh } = useSession();
  const queryClient = useQueryClient();
  const profileForm = useRef<HTMLFormElement | null>(null);
  const passwordForm = useRef<HTMLFormElement | null>(null);
  const avatarRequest = useRef(0);
  const formOwner = useRef<string | null>(null);
  const profileDirty = useRef(false);
  const [avatarReading, setAvatarReading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    ensName: "",
    walletNickname: "",
    bio: "",
    avatar: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [passwordErrors, setPasswordErrors] = useState<Errors>({});
  const [saved, setSaved] = useState("");
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async ({ signal }) =>
      (await api.get<User>("/profile", { signal })).data,
    enabled: Boolean(user),
  });
  useEffect(() => {
    if (!profile.data) return;
    const changingOwner = formOwner.current !== profile.data.id;
    if (!changingOwner && profileDirty.current) return;
    if (changingOwner) {
      formOwner.current = profile.data.id;
      profileDirty.current = false;
      avatarRequest.current += 1;
      setAvatarReading(false);
    }
    setForm(profileValues(profile.data));
  }, [profile.data]);
  useEffect(
    () => () => {
      avatarRequest.current += 1;
    },
    [],
  );
  const update = useMutation({
    mutationFn: () => api.patch<User>("/profile", form),
    onSuccess: async ({ data }) => {
      profileDirty.current = false;
      setForm(profileValues(data));
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      await refresh();
      setSaved("Perfil atualizado com sucesso.");
    },
    onError: (error) => {
      const fields = serverFields(error);
      setErrors(fields);
      focusFirstInvalid(profileForm.current, fields);
    },
  });
  const password = useMutation({
    mutationFn: () => api.put("/profile/password", passwords),
    onSuccess: () => {
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSaved("Senha alterada com sucesso.");
    },
    onError: (error) => {
      const fields = serverFields(error);
      setPasswordErrors(fields);
      focusFirstInvalid(passwordForm.current, fields);
    },
  });
  function setProfile(key: keyof typeof form, value: string) {
    profileDirty.current = true;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setSaved("");
  }
  function setPassword(key: keyof typeof passwords, value: string) {
    setPasswords((current) => ({ ...current, [key]: value }));
    setPasswordErrors((current) => ({ ...current, [key]: "" }));
    setSaved("");
  }
  function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (update.isPending || avatarReading) return;
    setSaved("");
    const next: Errors = {};
    if (form.name.trim().length < 2)
      next.name = "Informe um nome com pelo menos 2 caracteres.";
    if (!usernameIsValid(form.username))
      next.username = "Use de 3 a 30 letras, números, hífens ou sublinhados.";
    if (!emailIsValid(form.email)) next.email = "Informe um e-mail válido.";
    if (!ensIsValid(form.ensName))
      next.ensName = "Informe um nome ENS válido, incluindo .eth.";
    if (!form.walletNickname.trim() || form.walletNickname.trim().length > 60)
      next.walletNickname = "Informe um apelido com até 60 caracteres.";
    if (form.bio.length > 280) next.bio = "Use até 280 caracteres.";
    if (errors.avatar) next.avatar = errors.avatar;
    setErrors(next);
    focusFirstInvalid(profileForm.current, next);
    if (!Object.keys(next).length) update.mutate();
  }
  function savePassword(event: FormEvent) {
    event.preventDefault();
    if (password.isPending) return;
    setSaved("");
    const next: Errors = {};
    if (!passwords.currentPassword)
      next.currentPassword = "Informe a senha atual.";
    if (passwords.newPassword.length < 8)
      next.newPassword = "Use pelo menos 8 caracteres.";
    if (
      passwords.newPassword &&
      passwords.currentPassword === passwords.newPassword
    )
      next.newPassword = "Escolha uma senha diferente da atual.";
    if (passwords.newPassword !== passwords.confirmPassword)
      next.confirmPassword = "As senhas precisam ser iguais.";
    setPasswordErrors(next);
    focusFirstInvalid(passwordForm.current, next);
    if (!Object.keys(next).length) password.mutate();
  }
  async function chooseAvatar(file?: File) {
    if (!file) return;
    const request = ++avatarRequest.current;
    setAvatarReading(false);
    setSaved("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setErrors((s) => ({
        ...s,
        avatar: "Escolha uma imagem PNG, JPEG ou WebP de até 2 MB.",
      }));
      return;
    }
    setAvatarReading(true);
    profileDirty.current = true;
    setErrors((current) => ({ ...current, avatar: "" }));
    try {
      const avatar = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (request === avatarRequest.current) setProfile("avatar", avatar);
    } catch {
      if (request === avatarRequest.current)
        setErrors((current) => ({
          ...current,
          avatar:
            "Não foi possível ler a imagem. Tente escolher outro arquivo.",
        }));
    } finally {
      if (request === avatarRequest.current) setAvatarReading(false);
    }
  }
  function removeAvatar() {
    // Uma leitura anterior não pode restaurar a imagem depois da remoção.
    avatarRequest.current += 1;
    setAvatarReading(false);
    setProfile("avatar", "");
  }
  if (!user) return <p role="status">Recuperando sua sessão…</p>;
  return (
    <div className="account-layout profile-page">
      <AccountSidebar />
      <section className="account-content">
        <p className="eyebrow">CONTA DO COLECIONADOR</p>
        <h1>Seu perfil</h1>
        <p className="muted">Uma coleção única começa com você.</p>
        {profile.isPending && (
          <div
            className="skeleton"
            style={{ height: 420 }}
            aria-label="Carregando perfil"
          />
        )}
        {profile.isError && (
          <div role="alert" className="error">
            {err(profile.error)}
            <Button onClick={() => profile.refetch()}>Tentar novamente</Button>
          </div>
        )}
        {profile.data && (
          <>
            <form
              ref={profileForm}
              onSubmit={saveProfile}
              noValidate
              className="account-form panel"
            >
              <h2 id="profile-fields-heading">Dados do perfil</h2>
              <fieldset
                disabled={update.isPending}
                aria-labelledby="profile-fields-heading"
                className="m-0 min-w-0 border-0 p-0"
              >
                <div className="form-grid">
                  <Field
                    label="Nome de exibição"
                    required
                    name="name"
                    autoComplete="name"
                    value={form.name}
                    maxLength={80}
                    error={errors.name}
                    onChange={(e) => setProfile("name", e.target.value)}
                  />
                  <Field
                    label="Nome de usuário"
                    required
                    name="username"
                    autoComplete="username"
                    value={form.username}
                    minLength={3}
                    maxLength={30}
                    autoCapitalize="none"
                    spellCheck={false}
                    error={errors.username}
                    hint="De 3 a 30 caracteres. Letras, números, hífens ou sublinhados."
                    onChange={(event) =>
                      setProfile("username", event.target.value)
                    }
                  />
                  <Field
                    label="E-mail"
                    required
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    maxLength={254}
                    error={errors.email}
                    onChange={(e) => setProfile("email", e.target.value)}
                  />
                  <Field
                    label="Nome ENS"
                    required
                    name="ensName"
                    value={form.ensName}
                    maxLength={67}
                    error={errors.ensName}
                    placeholder="seunome.eth"
                    hint="Inclua o sufixo .eth, por exemplo: colecionador.eth."
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) =>
                      setProfile("ensName", event.target.value)
                    }
                  />
                  <Field
                    label="Apelido da carteira"
                    required
                    name="walletNickname"
                    value={form.walletNickname}
                    maxLength={60}
                    error={errors.walletNickname}
                    onChange={(event) =>
                      setProfile("walletNickname", event.target.value)
                    }
                  />
                  <div className="avatar-editor">
                    <img
                      src={form.avatar || "/assets/avatar.svg"}
                      alt="Seu avatar"
                      width="80"
                      height="80"
                      style={{ borderRadius: "50%", objectFit: "cover" }}
                    />
                    <div>
                      <div className="avatar-actions">
                        <label className="btn btn-outline" htmlFor="avatar">
                          Alterar avatar
                        </label>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            update.isPending ||
                            (!avatarReading &&
                              !errors.avatar &&
                              (!form.avatar ||
                                form.avatar === "/assets/avatar.svg"))
                          }
                          onClick={removeAvatar}
                        >
                          Remover avatar
                        </Button>
                      </div>
                      <input
                        id="avatar"
                        name="avatar"
                        type="file"
                        disabled={update.isPending}
                        aria-busy={avatarReading}
                        aria-invalid={Boolean(errors.avatar)}
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(event) => {
                          void chooseAvatar(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                        aria-describedby={`avatar-hint${avatarReading ? " avatar-status" : ""}${errors.avatar ? " avatar-error" : ""}`}
                      />
                      <p className="field-hint" id="avatar-hint">
                        PNG, JPEG ou WebP. Até 2 MB.
                      </p>
                      {avatarReading && (
                        <p
                          className="field-hint"
                          id="avatar-status"
                          role="status"
                        >
                          Lendo imagem…
                        </p>
                      )}
                      {errors.avatar && (
                        <p className="field-error" id="avatar-error">
                          {errors.avatar}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="field profile-about">
                  <label htmlFor="bio">Sobre você</label>
                  <textarea
                    id="bio"
                    name="bio"
                    className="input"
                    maxLength={280}
                    value={form.bio}
                    onChange={(e) => setProfile("bio", e.target.value)}
                    rows={4}
                    aria-invalid={Boolean(errors.bio)}
                    aria-describedby={errors.bio ? "bio-error" : undefined}
                  />
                  {errors.bio && (
                    <p className="field-error" id="bio-error">
                      {errors.bio}
                    </p>
                  )}
                </div>
              </fieldset>
              {update.isError && (
                <p className="error" role="alert">
                  {err(update.error)}
                </p>
              )}
              <Button
                type="submit"
                disabled={update.isPending || avatarReading}
              >
                {update.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </form>
            <form
              ref={passwordForm}
              onSubmit={savePassword}
              noValidate
              className="account-form panel"
            >
              <h2 id="password-fields-heading">Alterar senha</h2>
              <fieldset
                disabled={password.isPending}
                aria-labelledby="password-fields-heading"
                className="m-0 min-w-0 border-0 p-0"
              >
                <PasswordField
                  label="Senha atual"
                  type="password"
                  name="currentPassword"
                  autoComplete="current-password"
                  required
                  value={passwords.currentPassword}
                  error={passwordErrors.currentPassword}
                  onChange={(e) =>
                    setPassword("currentPassword", e.target.value)
                  }
                />
                <div className="form-grid">
                  <PasswordField
                    label="Nova senha"
                    type="password"
                    name="newPassword"
                    autoComplete="new-password"
                    required
                    value={passwords.newPassword}
                    error={passwordErrors.newPassword}
                    onChange={(e) => setPassword("newPassword", e.target.value)}
                  />
                  <PasswordField
                    label="Confirmar nova senha"
                    type="password"
                    name="confirmPassword"
                    autoComplete="new-password"
                    required
                    value={passwords.confirmPassword}
                    error={passwordErrors.confirmPassword}
                    onChange={(e) =>
                      setPassword("confirmPassword", e.target.value)
                    }
                  />
                </div>
              </fieldset>
              {password.isError && (
                <p className="error" role="alert">
                  {err(password.error)}
                </p>
              )}
              <Button type="submit" disabled={password.isPending}>
                {password.isPending ? "Alterando…" : "Alterar senha"}
              </Button>
            </form>
          </>
        )}
        <p role="status" className="success">
          {saved}
        </p>
      </section>
    </div>
  );
}

const emptyWallet: Omit<Wallet, "id"> = {
  name: "",
  nickname: "",
  profileName: "",
  type: "MetaMask",
  referralCode: "JUNGLE10",
  email: "",
  ensName: "",
  secondaryAddress: "",
  address: "",
  network: "Ethereum" as Wallet["network"],
  primary: false,
};
function walletValues(wallet: Wallet): Omit<Wallet, "id"> {
  return {
    name: wallet.name,
    nickname: wallet.nickname,
    profileName: wallet.profileName,
    type: wallet.type,
    referralCode: wallet.referralCode,
    email: wallet.email,
    ensName: wallet.ensName,
    secondaryAddress: wallet.secondaryAddress ?? "",
    address: wallet.address,
    network: wallet.network,
    primary: wallet.primary,
  };
}

export function WalletsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyWallet);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const addTrigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
  const walletForm = useRef<HTMLFormElement | null>(null);
  const walletDirty = useRef(false);
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: async ({ signal }) =>
      (await api.get<Wallet[]>("/wallets", { signal })).data,
    enabled: Boolean(user),
  });
  const update = useMutation({
    mutationFn: () =>
      editing
        ? api.patch(`/wallets/${editing}`, form)
        : api.post("/wallets", form),
    onSuccess: async ({ data }: { data: Wallet }) => {
      await queryClient.invalidateQueries({ queryKey: ["wallets", user?.id] });
      const savedWallets = queryClient.getQueryData<Wallet[]>([
        "wallets",
        user?.id,
      ]);
      const primary =
        savedWallets?.find((wallet) => wallet.primary) ??
        savedWallets?.[0] ??
        data;
      walletDirty.current = false;
      setEditing(primary.id);
      setForm(walletValues(primary));
      setErrors({});
      setOpen(false);
      setSaved("Carteira salva com sucesso.");
    },
    onError: (error) => {
      const fields = serverFields(error);
      setErrors(fields);
      focusFirstInvalid(walletForm.current, fields);
    },
  });
  useEffect(() => {
    if (open || !wallets.data || walletDirty.current) return;
    const primary =
      wallets.data.find((wallet) => wallet.primary) ?? wallets.data[0];
    if (!primary) return;
    setEditing(primary.id);
    setForm(walletValues(primary));
    setErrors({});
  }, [wallets.data, open]);
  function edit(wallet: Wallet | undefined, origin: HTMLButtonElement) {
    trigger.current = origin;
    walletDirty.current = false;
    setEditing(wallet?.id ?? null);
    setForm(
      wallet
        ? {
            name: wallet.name,
            nickname: wallet.nickname,
            profileName: wallet.profileName,
            type: wallet.type,
            referralCode: wallet.referralCode,
            email: wallet.email,
            ensName: wallet.ensName,
            secondaryAddress: wallet.secondaryAddress ?? "",
            address: wallet.address,
            network: wallet.network,
            primary: wallet.primary,
          }
        : {
            ...emptyWallet,
            nickname: user?.walletNickname ?? "",
            profileName: user?.name ?? "",
            email: user?.email ?? "",
            ensName: user?.ensName ?? "",
            primary: wallets.data?.length === 0,
          },
    );
    setErrors({});
    update.reset();
    setSaved("");
    setOpen(true);
  }
  function setWallet<Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key],
  ) {
    walletDirty.current = true;
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (update.isPending) return;
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Dê um nome à sua carteira.";
    if (!form.nickname.trim())
      next.nickname = "Informe um apelido para a carteira.";
    if (form.profileName.trim().length < 2)
      next.profileName =
        "Informe um nome do perfil com pelo menos 2 caracteres.";
    if (!addressIsValid(form.address))
      next.address =
        "Use um endereço com 0x seguido de 40 caracteres hexadecimais.";
    if (!emailIsValid(form.email)) next.email = "Informe um e-mail válido.";
    if (!ensIsValid(form.ensName))
      next.ensName = "Informe um nome ENS válido, incluindo .eth.";
    if (!/^[a-z0-9_-]{1,32}$/i.test(form.referralCode.trim()))
      next.referralCode = "Use até 32 letras, números, hífens ou sublinhados.";
    if (
      form.secondaryAddress?.trim() &&
      !addressIsValid(form.secondaryAddress) &&
      !ensIsValid(form.secondaryAddress)
    )
      next.secondaryAddress =
        "Informe um nome ENS com .eth ou um endereço de carteira válido.";
    if (!["Ethereum", "Polygon"].includes(form.network))
      next.network = "Selecione uma rede válida.";
    if (!["MetaMask", "Coinbase Wallet", "WalletConnect"].includes(form.type))
      next.type = "Selecione um tipo de carteira válido.";
    setErrors(next);
    focusFirstInvalid(walletForm.current, next);
    if (!Object.keys(next).length) update.mutate();
  }
  const editor = (
    <form
      ref={walletForm}
      onSubmit={submit}
      noValidate
      className="account-form"
    >
      <fieldset
        disabled={update.isPending}
        className="m-0 min-w-0 border-0 p-0"
      >
        <div className="form-grid">
          <Field
            label="Nome de exibição"
            name="name"
            required
            value={form.name}
            maxLength={60}
            error={errors.name}
            onChange={(event) => setWallet("name", event.target.value)}
          />
          <Field
            label="Apelido da carteira"
            name="nickname"
            required
            value={form.nickname}
            maxLength={60}
            error={errors.nickname}
            onChange={(event) => setWallet("nickname", event.target.value)}
          />
          <div className="field">
            <label htmlFor="wallet-network">
              Rede <span aria-hidden="true">*</span>
            </label>
            <select
              id="wallet-network"
              name="network"
              className="input"
              required
              value={form.network}
              aria-invalid={Boolean(errors.network)}
              aria-describedby={
                errors.network ? "wallet-network-error" : undefined
              }
              onChange={(event) =>
                setWallet("network", event.target.value as Wallet["network"])
              }
            >
              <option>Ethereum</option>
              <option>Polygon</option>
            </select>
            {errors.network && (
              <p className="field-error" id="wallet-network-error">
                {errors.network}
              </p>
            )}
          </div>
          <Field
            label="Nome do perfil"
            name="profileName"
            required
            value={form.profileName}
            minLength={2}
            maxLength={80}
            error={errors.profileName}
            onChange={(event) => setWallet("profileName", event.target.value)}
          />
        </div>
        <Field
          label="Endereço da carteira"
          name="address"
          required
          value={form.address}
          error={errors.address}
          placeholder="0x…"
          maxLength={42}
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) => setWallet("address", event.target.value)}
        />
        <Field
          label="ENS ou carteira secundária"
          name="secondaryAddress"
          value={form.secondaryAddress ?? ""}
          maxLength={67}
          error={errors.secondaryAddress}
          hint="Opcional. Use um nome com .eth ou um endereço iniciado em 0x."
          autoCapitalize="none"
          spellCheck={false}
          onChange={(event) =>
            setWallet("secondaryAddress", event.target.value)
          }
        />
        <div className="form-grid">
          <div className="field">
            <label htmlFor="wallet-type">
              Tipo da carteira <span aria-hidden="true">*</span>
            </label>
            <select
              id="wallet-type"
              name="type"
              className="input"
              required
              value={form.type}
              aria-invalid={Boolean(errors.type)}
              aria-describedby={errors.type ? "wallet-type-error" : undefined}
              onChange={(event) =>
                setWallet("type", event.target.value as Wallet["type"])
              }
            >
              <option>MetaMask</option>
              <option>Coinbase Wallet</option>
              <option>WalletConnect</option>
            </select>
            {errors.type && (
              <p className="field-error" id="wallet-type-error">
                {errors.type}
              </p>
            )}
          </div>
          <Field
            label="Código de indicação"
            name="referralCode"
            required
            value={form.referralCode}
            maxLength={32}
            error={errors.referralCode}
            onChange={(event) => setWallet("referralCode", event.target.value)}
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={form.email}
            maxLength={254}
            error={errors.email}
            onChange={(event) => setWallet("email", event.target.value)}
          />
          <Field
            label="Nome ENS"
            name="ensName"
            required
            value={form.ensName}
            maxLength={67}
            error={errors.ensName}
            placeholder="seunome.eth"
            hint="Inclua o sufixo .eth."
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => setWallet("ensName", event.target.value)}
          />
        </div>
        <label className="checkbox-label">
          <input
            name="primary"
            type="checkbox"
            checked={form.primary}
            onChange={(event) => setWallet("primary", event.target.checked)}
          />
          Definir como carteira principal
        </label>
      </fieldset>
      {update.isError && (
        <p className="error" role="alert">
          {err(update.error)}
        </p>
      )}
      <Button type="submit" disabled={update.isPending}>
        {update.isPending ? "Salvando…" : "Salvar carteira"}
      </Button>
    </form>
  );
  if (!user) return <p role="status">Recuperando sua sessão…</p>;
  return (
    <div className="account-layout wallets-page">
      <AccountSidebar />
      <section className="account-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONTA DO COLECIONADOR</p>
            <h1 aria-label="Suas carteiras">Carteira principal</h1>
          </div>
          <Button
            ref={addTrigger}
            onClick={(event) => edit(undefined, event.currentTarget)}
          >
            <Plus size={16} aria-hidden="true" />
            Adicionar carteira
          </Button>
        </div>
        <p className="muted">
          Suas carteiras ficam disponíveis no pagamento. Todos os endereços são
          simulados.
        </p>
        {wallets.isPending && (
          <div
            className="skeleton"
            style={{ height: 220 }}
            aria-label="Carregando carteiras"
          />
        )}
        {wallets.isError && (
          <div className="error" role="alert">
            {err(wallets.error)}
            <Button onClick={() => wallets.refetch()}>Tentar novamente</Button>
          </div>
        )}
        {wallets.data?.length === 0 && (
          <div className="panel empty-state">
            <WalletIcon aria-hidden="true" />
            <h2>Sua primeira conexão</h2>
            <p>Cadastre uma carteira para começar sua coleção.</p>
            <Button onClick={(event) => edit(undefined, event.currentTarget)}>
              Adicionar primeira carteira
            </Button>
          </div>
        )}
        {!open && Boolean(wallets.data?.length) ? (
          <section
            className="primary-wallet-editor"
            aria-label="Dados da carteira principal"
          >
            <p>
              Estas carteiras ficam disponíveis no pagamento e para receber NFTs
              comprados.
            </p>
            {editor}
          </section>
        ) : null}
        <div className="wallet-list">
          {wallets.data?.map((wallet) => (
            <article className="panel wallet-card" key={wallet.id}>
              <WalletIcon size={28} aria-hidden="true" />
              <div>
                <span className="eyebrow">
                  {wallet.primary
                    ? "CARTEIRA PRINCIPAL"
                    : "CARTEIRA SECUNDÁRIA"}
                </span>
                <h2>{wallet.name}</h2>
                <p>
                  {wallet.nickname} · {wallet.network} · {wallet.type}
                </p>
                <p className="wallet-address">{wallet.address}</p>
                <p className="wallet-address">{wallet.ensName}</p>
                {wallet.secondaryAddress && (
                  <p className="wallet-address">
                    Secundária: {wallet.secondaryAddress}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={(event) => edit(wallet, event.currentTarget)}
                aria-label={`Editar ${wallet.name}`}
              >
                Editar
              </Button>
            </article>
          ))}
        </div>
        <p role="status" className="success">
          {saved}
        </p>
        <Dialog.Root
          open={open}
          onOpenChange={(next) => {
            if (!update.isPending) {
              walletDirty.current = false;
              setOpen(next);
            }
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content
              ref={dialog}
              className="dialog-content panel wallet-dialog"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                dialog.current?.querySelector("input")?.focus();
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                const origin = trigger.current?.isConnected
                  ? trigger.current
                  : addTrigger.current;
                origin?.focus();
              }}
            >
              <Dialog.Title>
                {editing ? "Editar carteira" : "Adicionar carteira"}
              </Dialog.Title>
              <Dialog.Description className="muted">
                Cadastre um endereço fictício. Nenhuma carteira real será
                conectada.
              </Dialog.Description>
              <Dialog.Close
                className="dialog-close"
                aria-label="Fechar"
                disabled={update.isPending}
              >
                <X size={20} />
              </Dialog.Close>
              {editor}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </div>
  );
}
