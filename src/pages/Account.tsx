import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowRight,
  Heart,
  LogOut,
  Plus,
  UserRound,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { api, err } from "../lib/api";
import { useSession } from "../lib/session";
import { Button } from "../components/ui/button";
import { Field } from "../components/Field";
import type { ApiError, User, Wallet } from "../types";

type Errors = Record<string, string>;
const emailIsValid = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
function serverFields(error: unknown): Errors {
  return (
    (error as { response?: { data?: ApiError } })?.response?.data?.fields ?? {}
  );
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

export function AuthPage({ mode }: { mode?: "login" | "register" }) {
  const register =
    (mode ??
      (window.location.pathname === "/register" ? "register" : "login")) ===
    "register";
  const { refresh } = useSession();
  const navigate = useNavigate();
  const [errors, setErrors] = useState<Errors>({});
  const [form, setForm] = useState({
    name: "",
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
    onError: (error) => setErrors(serverFields(error)),
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
    const next: Errors = {};
    if (register && form.name.trim().length < 2)
      next.name = "Informe um nome com pelo menos 2 caracteres.";
    if (!emailIsValid(form.email)) next.email = "Informe um e-mail válido.";
    if (form.password.length < (register ? 8 : 1))
      next.password = register
        ? "Use pelo menos 8 caracteres."
        : "Informe sua senha.";
    if (register && form.password !== form.confirmPassword)
      next.confirmPassword = "As senhas precisam ser iguais.";
    setErrors(next);
    if (!Object.keys(next).length) mutation.mutate();
  }
  const query = new URLSearchParams(window.location.search).toString();
  return (
    <section className="auth-layout">
      <div className="auth-story">
        <p className="eyebrow">Bem-vindo à KURIO</p>
        <h1>
          SEJA DONO DO
          <br />
          EXTRAORDINÁRIO.
        </h1>
        <p>Descubra arte digital. Encontre a sua próxima coleção.</p>
        <img
          src="/assets/emerald-ape.webp"
          alt="Arte da coleção de NFTs em destaque"
          width="460"
          height="460"
        />
      </div>
      <div className="panel auth-panel">
        <div className="auth-tabs">
          <Link
            to="/login"
            search={Object.fromEntries(new URLSearchParams(query))}
            aria-current={!register ? "page" : undefined}
          >
            Entrar
          </Link>
          <Link
            to="/register"
            search={Object.fromEntries(new URLSearchParams(query))}
            aria-current={register ? "page" : undefined}
          >
            Criar conta
          </Link>
        </div>
        <h1>
          {register ? "Sua coleção começa aqui." : "Bom ter você de volta."}
        </h1>
        <p className="muted">
          {register
            ? "Crie seu perfil de colecionador e conecte sua arte ao mundo."
            : "Entre para continuar explorando e colecionando."}
        </p>
        <form onSubmit={submit} noValidate className="account-form">
          {register && (
            <Field
              label="Nome"
              name="name"
              autoComplete="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              error={errors.name}
              maxLength={80}
            />
          )}
          <Field
            label="E-mail"
            type="email"
            name="email"
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            error={errors.email}
            maxLength={160}
          />
          <Field
            label="Senha"
            type="password"
            name="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            error={errors.password}
            hint={register ? "Pelo menos 8 caracteres." : undefined}
          />
          {register && (
            <Field
              label="Confirmar senha"
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />
          )}
          {mutation.isError && (
            <p role="alert" className="error">
              {err(mutation.error)}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Aguarde…"
              : register
                ? "Criar minha conta"
                : "Entrar"}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </form>
        <p className="field-hint">
          Ambiente de demonstração. Use somente dados fictícios.
        </p>
      </div>
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
          <UserRound size={16} aria-hidden="true" />
          Dados do perfil
        </Link>
        <Link to="/wallets" activeProps={{ "aria-current": "page" }}>
          <WalletIcon size={16} aria-hidden="true" />
          Carteiras
        </Link>
        <Link to="/favorites" activeProps={{ "aria-current": "page" }}>
          <Heart size={16} aria-hidden="true" />
          Favoritos
        </Link>
        <button
          type="button"
          onClick={async () => {
            await logout();
            await navigate({ to: "/" });
          }}
        >
          <LogOut size={16} aria-hidden="true" />
          Sair
        </button>
      </nav>
    </aside>
  );
}

export function ProfilePage() {
  const { user, refresh } = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: "",
    email: "",
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
    if (profile.data)
      setForm({
        name: profile.data.name,
        email: profile.data.email,
        bio: profile.data.bio,
        avatar: profile.data.avatar,
      });
  }, [profile.data]);
  const update = useMutation({
    mutationFn: () => api.patch<User>("/profile", form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      await refresh();
      setSaved("Perfil atualizado com sucesso.");
    },
    onError: (error) => setErrors(serverFields(error)),
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
    onError: (error) => setPasswordErrors(serverFields(error)),
  });
  function saveProfile(event: FormEvent) {
    event.preventDefault();
    setSaved("");
    const next: Errors = {};
    if (form.name.trim().length < 2)
      next.name = "Informe um nome com pelo menos 2 caracteres.";
    if (!emailIsValid(form.email)) next.email = "Informe um e-mail válido.";
    if (form.bio.length > 280) next.bio = "Use até 280 caracteres.";
    setErrors(next);
    if (!Object.keys(next).length) update.mutate();
  }
  function savePassword(event: FormEvent) {
    event.preventDefault();
    setSaved("");
    const next: Errors = {};
    if (!passwords.currentPassword)
      next.currentPassword = "Informe a senha atual.";
    if (passwords.newPassword.length < 8)
      next.newPassword = "Use pelo menos 8 caracteres.";
    if (passwords.currentPassword === passwords.newPassword)
      next.newPassword = "Escolha uma senha diferente da atual.";
    if (passwords.newPassword !== passwords.confirmPassword)
      next.confirmPassword = "As senhas precisam ser iguais.";
    setPasswordErrors(next);
    if (!Object.keys(next).length) password.mutate();
  }
  async function chooseAvatar(file?: File) {
    if (!file) return;
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
    const avatar = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    setForm((s) => ({ ...s, avatar }));
    setErrors((s) => ({ ...s, avatar: "" }));
    setSaved("");
  }
  if (!user) return <p role="status">Recuperando sua sessão…</p>;
  return (
    <div className="account-layout">
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
              onSubmit={saveProfile}
              noValidate
              className="account-form panel"
            >
              <h2>Dados do perfil</h2>
              <div className="avatar-editor">
                <img
                  src={form.avatar || "/assets/avatar.svg"}
                  alt="Seu avatar"
                  width="80"
                  height="80"
                  style={{ borderRadius: "50%", objectFit: "cover" }}
                />
                <div>
                  <label className="btn btn-outline" htmlFor="avatar">
                    Alterar avatar
                  </label>
                  <input
                    id="avatar"
                    name="avatar"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      void chooseAvatar(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                    aria-describedby={
                      errors.avatar ? "avatar-error" : "avatar-hint"
                    }
                  />
                  <p className="field-hint" id="avatar-hint">
                    PNG, JPEG ou WebP. Até 2 MB.
                  </p>
                  {errors.avatar && (
                    <p className="field-error" id="avatar-error">
                      {errors.avatar}
                    </p>
                  )}
                </div>
              </div>
              <div className="form-grid">
                <Field
                  label="Nome de exibição"
                  required
                  name="name"
                  autoComplete="name"
                  value={form.name}
                  maxLength={80}
                  error={errors.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
                <Field
                  label="E-mail"
                  required
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  maxLength={160}
                  error={errors.email}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, email: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="bio">Sobre você</label>
                <textarea
                  id="bio"
                  name="bio"
                  className="input"
                  maxLength={280}
                  value={form.bio}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, bio: e.target.value }))
                  }
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
              {update.isError && (
                <p className="error" role="alert">
                  {err(update.error)}
                </p>
              )}
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Salvando…" : "Salvar alterações"}
              </Button>
            </form>
            <form
              onSubmit={savePassword}
              noValidate
              className="account-form panel"
            >
              <h2>Alterar senha</h2>
              <Field
                label="Senha atual"
                type="password"
                autoComplete="current-password"
                required
                value={passwords.currentPassword}
                error={passwordErrors.currentPassword}
                onChange={(e) =>
                  setPasswords((s) => ({
                    ...s,
                    currentPassword: e.target.value,
                  }))
                }
              />
              <div className="form-grid">
                <Field
                  label="Nova senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={passwords.newPassword}
                  error={passwordErrors.newPassword}
                  onChange={(e) =>
                    setPasswords((s) => ({ ...s, newPassword: e.target.value }))
                  }
                />
                <Field
                  label="Confirmar nova senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={passwords.confirmPassword}
                  error={passwordErrors.confirmPassword}
                  onChange={(e) =>
                    setPasswords((s) => ({
                      ...s,
                      confirmPassword: e.target.value,
                    }))
                  }
                />
              </div>
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

const emptyWallet = {
  name: "",
  address: "",
  network: "Ethereum" as Wallet["network"],
  primary: false,
};
export function WalletsPage() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyWallet);
  const [errors, setErrors] = useState<Errors>({});
  const [saved, setSaved] = useState("");
  const trigger = useRef<HTMLButtonElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["wallets", user?.id] });
      setOpen(false);
      setSaved("Carteira salva com sucesso.");
    },
    onError: (error) => setErrors(serverFields(error)),
  });
  function edit(wallet: Wallet | undefined, origin: HTMLButtonElement) {
    trigger.current = origin;
    setEditing(wallet?.id ?? null);
    setForm(
      wallet
        ? {
            name: wallet.name,
            address: wallet.address,
            network: wallet.network,
            primary: wallet.primary,
          }
        : { ...emptyWallet, primary: !wallets.data?.length },
    );
    setErrors({});
    update.reset();
    setOpen(true);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const next: Errors = {};
    if (form.name.trim().length < 2) next.name = "Dê um nome à sua carteira.";
    if (!/^0x[a-fA-F0-9]{40}$/.test(form.address))
      next.address =
        "Use um endereço com 0x seguido de 40 caracteres hexadecimais.";
    setErrors(next);
    if (!Object.keys(next).length) update.mutate();
  }
  if (!user) return <p role="status">Recuperando sua sessão…</p>;
  return (
    <div className="account-layout">
      <AccountSidebar />
      <section className="account-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CONTA DO COLECIONADOR</p>
            <h1>Suas carteiras</h1>
          </div>
          <Button onClick={(event) => edit(undefined, event.currentTarget)}>
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
                <p>{wallet.network}</p>
                <p className="wallet-address">{wallet.address}</p>
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
            if (!update.isPending) setOpen(next);
          }}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content
              ref={dialog}
              className="dialog-content panel"
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                dialog.current?.querySelector("input")?.focus();
              }}
              onCloseAutoFocus={(event) => {
                event.preventDefault();
                trigger.current?.focus();
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
              <form onSubmit={submit} noValidate className="account-form">
                <Field
                  label="Nome da carteira"
                  required
                  value={form.name}
                  maxLength={60}
                  error={errors.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
                <Field
                  label="Endereço da carteira"
                  required
                  value={form.address}
                  error={errors.address}
                  placeholder="0x…"
                  onChange={(e) =>
                    setForm((s) => ({ ...s, address: e.target.value }))
                  }
                />
                <div className="field">
                  <label htmlFor="wallet-network">Rede</label>
                  <select
                    id="wallet-network"
                    className="input"
                    value={form.network}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        network: e.target.value as Wallet["network"],
                      }))
                    }
                  >
                    <option>Ethereum</option>
                    <option>Polygon</option>
                  </select>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.primary}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, primary: e.target.checked }))
                    }
                  />
                  Definir como carteira principal
                </label>
                {update.isError && (
                  <p className="error" role="alert">
                    {err(update.error)}
                  </p>
                )}
                <Button type="submit" disabled={update.isPending}>
                  {update.isPending ? "Salvando…" : "Salvar carteira"}
                </Button>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </section>
    </div>
  );
}
