import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LockKeyhole, Wallet as WalletIcon } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { api, err } from "../lib/api";
import { useSession } from "../lib/session";
import { Field } from "../components/Field";
import { Button } from "../components/ui/button";
import { Empty, ErrorState, Skeleton, eth } from "../components/Shared";
import { Summary, useCart } from "./Purchase";
import type {
  ApiError,
  Collector,
  Network,
  Order,
  Quote,
  User,
  Wallet,
  WalletType,
} from "../types";

type Errors = Record<string, string>;
type Draft = Collector & { walletId: string; network: Network };
type Attempt = {
  key: string;
  quoteId: string;
  walletId: string;
  network: Network;
  collector: Collector;
};
const walletTypes: WalletType[] = [
  "MetaMask",
  "Coinbase Wallet",
  "WalletConnect",
];
const validEns = (value: string) =>
  /^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]\.eth$/i.test(value);
const validAddress = (value: string) =>
  /^0x[a-f0-9]{40}$/i.test(value) || validEns(value);

function initialDraft(user: User | null): Draft {
  const fallback: Draft = {
    name: user?.name ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
    profileName: "",
    walletType: "MetaMask",
    referralCode: "",
    ensName: user?.ensName ?? "",
    secondaryAddress: "",
    note: "",
    walletId: "",
    network: "Ethereum",
  };
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(`kurio-checkout:${user?.id}`) ?? "null",
    ) as Partial<Draft> | null;
    if (!saved || typeof saved !== "object") return fallback;
    for (const key of Object.keys(fallback) as (keyof Draft)[]) {
      if (typeof saved[key] === "string")
        Object.assign(fallback, { [key]: saved[key] });
    }
    if (!["Ethereum", "Polygon"].includes(fallback.network))
      fallback.network = "Ethereum";
    if (!walletTypes.includes(fallback.walletType))
      fallback.walletType = "MetaMask";
  } catch {
    // Um rascunho inválido não deve impedir a retomada da compra.
  }
  return fallback;
}

function validate(draft: Draft): Errors {
  const errors: Errors = {};
  if (draft.name.trim().length < 2 || draft.name.trim().length > 80)
    errors.name = "Use entre 2 e 80 caracteres.";
  if (!/^[a-z0-9][a-z0-9_-]{2,29}$/i.test(draft.username.trim()))
    errors.username = "Use de 3 a 30 letras, números, hífen ou sublinhado.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()))
    errors.email = "Informe um e-mail válido.";
  if (
    draft.profileName.trim().length < 2 ||
    draft.profileName.trim().length > 80
  )
    errors.profileName = "Use entre 2 e 80 caracteres.";
  if (!walletTypes.includes(draft.walletType))
    errors.walletType = "Selecione o tipo da carteira.";
  if (!/^[a-z0-9_-]{1,32}$/i.test(draft.referralCode.trim()))
    errors.referralCode = "Use até 32 letras, números, hífen ou sublinhado.";
  if (!validEns(draft.ensName.trim()))
    errors.ensName = "Informe um nome ENS com 3 a 63 caracteres e final .eth.";
  if (
    draft.secondaryAddress?.trim() &&
    !validAddress(draft.secondaryAddress.trim())
  )
    errors.secondaryAddress =
      "Informe um endereço 0x com 40 caracteres ou um nome ENS válido.";
  if ((draft.note?.length ?? 0) > 280) errors.note = "Use até 280 caracteres.";
  if (!draft.walletId) errors.walletId = "Selecione uma carteira cadastrada.";
  return errors;
}

function SelectField({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </label>
      {children}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const { user } = useSession(),
    cart = useCart(),
    client = useQueryClient(),
    navigate = useNavigate();
  const [draft, setDraft] = useState(() => initialDraft(user));
  const [draftOwner, setDraftOwner] = useState(user?.id);
  const [connected, setConnected] = useState(false),
    [refused, setRefused] = useState(false);
  const [review, setReview] = useState(false),
    [message, setMessage] = useState("");
  const [accepted, setAccepted] = useState(false),
    [errors, setErrors] = useState<Errors>({});
  const formRef = useRef<HTMLFormElement>(null),
    reviewButton = useRef<HTMLButtonElement>(null);
  const busy = useRef(false),
    reviewedFingerprint = useRef("");
  const attempt = useRef<Attempt | null>(null),
    walletSynced = useRef("");
  const storageKey = `kurio-attempt:${user?.id}`;
  const wallets = useQuery({
    queryKey: ["wallets", user?.id],
    queryFn: async ({ signal }) =>
      (await api.get<Wallet[]>("/wallets", { signal })).data,
  });
  const quote = useQuery({
    queryKey: ["quote", user?.id, cart.data?.version],
    queryFn: async () => (await api.post<Quote>("/quote", {})).data,
    enabled: !!cart.data?.items.length,
  });
  const selectedWallet = wallets.data?.find(
    (wallet) => wallet.id === draft.walletId,
  );

  useEffect(() => {
    if (draftOwner === user?.id) return;
    setDraft(initialDraft(user));
    setDraftOwner(user?.id);
    walletSynced.current = "";
    setConnected(false);
    setAccepted(false);
    setReview(false);
    setErrors({});
  }, [draftOwner, user]);
  const persistDraft = () => {
    if (!user?.id || draftOwner !== user.id) return;
    try {
      sessionStorage.setItem(
        `kurio-checkout:${user.id}`,
        JSON.stringify(draft),
      );
    } catch {
      /* A edição continua disponível se o armazenamento estiver bloqueado. */
    }
  };
  useEffect(() => {
    persistDraft();
  }, [draft, draftOwner, user?.id]);
  useEffect(() => {
    const selected = wallets.data?.find(
      (wallet) => wallet.id === draft.walletId,
    );
    const wallet =
      selected ??
      wallets.data?.find((wallet) => wallet.primary) ??
      wallets.data?.[0];
    if (!wallet || walletSynced.current === wallet.id) return;
    const changing = !!walletSynced.current || !selected;
    walletSynced.current = wallet.id;
    setDraft((previous) => ({
      ...previous,
      walletId: wallet.id,
      network: changing ? wallet.network : previous.network,
      profileName:
        changing || !previous.profileName
          ? wallet.profileName
          : previous.profileName,
      walletType: changing ? wallet.type : previous.walletType,
      referralCode:
        changing || !previous.referralCode
          ? wallet.referralCode
          : previous.referralCode,
      ensName:
        changing || !previous.ensName ? wallet.ensName : previous.ensName,
      secondaryAddress: changing
        ? (wallet.secondaryAddress ?? "")
        : previous.secondaryAddress,
    }));
  }, [wallets.data, draft.walletId]);
  useEffect(() => {
    let active = true;
    attempt.current = null;
    try {
      const value = JSON.parse(
        sessionStorage.getItem(storageKey) ?? "null",
      ) as Attempt | null;
      if (
        value?.key &&
        value.quoteId &&
        value.walletId &&
        value.collector?.name &&
        value.collector?.email
      ) {
        attempt.current = value;
        void api
          .get<Order>("/orders", { params: { key: value.key } })
          .then(({ data }) => {
            if (!active) return;
            if (data.status !== "pending")
              sessionStorage.removeItem(storageKey);
            void navigate({ to: "/order/$id", params: { id: data.id } });
          })
          .catch(() => {});
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
    return () => {
      active = false;
    };
  }, [storageKey, navigate]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };
  function focusInvalidField() {
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    });
  }
  const showError = (error: unknown) => {
    const fields =
      (error as { response?: { data?: ApiError } }).response?.data?.fields ??
      {};
    setErrors(
      Object.fromEntries(
        Object.entries(fields).map(([key, value]) => [
          key.replace(/^collector\./, ""),
          value,
        ]),
      ),
    );
    setMessage(err(error));
    focusInvalidField();
  };
  const beginReview = useMutation({
    mutationFn: async () => {
      persistDraft();
      await api.get("/profile");
      if (attempt.current) {
        try {
          return (
            await api.get<Order>("/orders", {
              params: { key: attempt.current.key },
            })
          ).data;
        } catch (error) {
          if (
            (error as { response?: { status: number } }).response?.status !==
            404
          )
            throw error;
          attempt.current = null;
          sessionStorage.removeItem(storageKey);
        }
      }
      return null;
    },
    onSuccess: (existing) => {
      if (existing) {
        void navigate({ to: "/order/$id", params: { id: existing.id } });
        return;
      }
      setMessage("");
      reviewedFingerprint.current = quote.data?.fingerprint ?? "";
      setReview(true);
    },
    onError: showError,
  });
  const submit = useMutation({
    mutationFn: async () => {
      if (busy.current) return null;
      busy.current = true;
      try {
        persistDraft();
        await api.get("/profile");
        if (!attempt.current) {
          const latest = (await api.post<Quote>("/quote", {})).data;
          if (
            !quote.data ||
            latest.fingerprint !== reviewedFingerprint.current
          ) {
            setReview(false);
            setMessage(
              "Os valores ou a disponibilidade mudaram. Revise o resumo atualizado e confirme novamente.",
            );
            await client.invalidateQueries({ queryKey: ["cart"] });
            await client.invalidateQueries({ queryKey: ["quote"] });
            return null;
          }
          const { walletId, network, ...collector } = draft;
          attempt.current = {
            key: crypto.randomUUID(),
            quoteId: latest.id,
            walletId,
            network,
            collector,
          };
        }
        // A referência é salva antes do envio para permitir a recuperação após timeout.
        sessionStorage.setItem(storageKey, JSON.stringify(attempt.current));
        const { key, ...payload } = attempt.current;
        try {
          return (
            await api.post<Order>("/orders", payload, {
              headers: { "Idempotency-Key": key },
            })
          ).data;
        } catch (error) {
          try {
            return (await api.get<Order>("/orders", { params: { key } })).data;
          } catch {
            throw error;
          }
        }
      } finally {
        busy.current = false;
      }
    },
    onSuccess: (order) => {
      if (!order) return;
      if (order.status !== "pending") {
        attempt.current = null;
        sessionStorage.removeItem(storageKey);
      }
      void navigate({ to: "/order/$id", params: { id: order.id } });
    },
    onError: async (error) => {
      setReview(false);
      showError(error);
      const response = (
        error as { response?: { status: number; data?: ApiError } }
      ).response;
      if (
        response?.status === 422 ||
        ["QUOTE_CHANGED", "QUOTE_EXPIRED", "STOCK_CONFLICT"].includes(
          response?.data?.code ?? "",
        )
      ) {
        attempt.current = null;
        sessionStorage.removeItem(storageKey);
        await client.invalidateQueries({ queryKey: ["quote"] });
        await client.invalidateQueries({ queryKey: ["cart"] });
      }
    },
  });
  function reviewOrder(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const next = validate(draft);
    if (!connected)
      next.connection = "Conecte a carteira simulada para continuar.";
    if (!accepted) next.accepted = "Confirme que esta compra é uma simulação.";
    setErrors(next);
    if (Object.keys(next).length) focusInvalidField();
    if (!Object.keys(next).length) beginReview.mutate();
  }
  const selectProps = (key: string) => ({
    "aria-invalid": Boolean(errors[key]),
    "aria-describedby": errors[key] ? `checkout-${key}-error` : undefined,
  });

  if (cart.isPending || wallets.isPending) return <Skeleton detail />;
  if (cart.isError || wallets.isError)
    return (
      <ErrorState
        error={cart.error || wallets.error}
        retry={() => {
          void cart.refetch();
          void wallets.refetch();
        }}
      />
    );
  if (!cart.data.items.length) return <Empty title="Seu carrinho está vazio" />;
  return (
    <div className="checkout-page">
      <div className="breadcrumbs">
        <Link to="/">Início</Link> / <Link to="/cart">Carrinho</Link> /{" "}
        <span>Pagamento</span>
      </div>
      <h1 className="sr-only">Um passo para sua coleção.</h1>
      <ol className="sr-only" aria-label="Etapas da compra">
        <li>Seleção</li>
        <li aria-current="step">Pagamento</li>
        <li>Sua coleção</li>
      </ol>
      <form
        className="purchase-layout checkout-layout"
        onSubmit={reviewOrder}
        noValidate
        ref={formRef}
      >
        <section className="checkout-form" aria-labelledby="collector-heading">
          <h2 id="collector-heading">Perfil do colecionador</h2>
          <div className="form-grid collector-fields">
            <Field
              label="Nome completo"
              id="checkout-name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={80}
              value={draft.name}
              onChange={(event) => set("name", event.target.value)}
              error={errors.name}
            />
            <Field
              label="Nome de usuário"
              id="checkout-username"
              autoComplete="username"
              required
              maxLength={30}
              value={draft.username}
              onChange={(event) => set("username", event.target.value)}
              error={errors.username}
            />
            <SelectField
              id="checkout-network"
              label="Rede"
              error={errors.network}
            >
              <select
                id="checkout-network"
                required
                value={draft.network}
                {...selectProps("network")}
                onChange={(event) => {
                  set("network", event.target.value as Network);
                  setConnected(false);
                }}
              >
                <option>Ethereum</option>
                <option>Polygon</option>
              </select>
            </SelectField>
            <Field
              label="Nome do perfil"
              id="checkout-profileName"
              required
              maxLength={80}
              value={draft.profileName}
              onChange={(event) => set("profileName", event.target.value)}
              error={errors.profileName}
            />
            <Field
              label="Endereço da carteira"
              id="checkout-address"
              value={selectedWallet?.address ?? ""}
              readOnly
              required
              error={errors.address}
              hint="Endereço da carteira cadastrada selecionada."
            />
            <Field
              label="ENS ou carteira secundária"
              id="checkout-secondaryAddress"
              value={draft.secondaryAddress ?? ""}
              onChange={(event) => set("secondaryAddress", event.target.value)}
              error={errors.secondaryAddress}
              hint="Opcional. Use um nome .eth ou endereço 0x."
            />
            <SelectField
              id="checkout-walletType"
              label="Tipo da carteira"
              error={errors.walletType}
            >
              <select
                id="checkout-walletType"
                required
                value={draft.walletType}
                {...selectProps("walletType")}
                onChange={(event) => {
                  set("walletType", event.target.value as WalletType);
                  setConnected(false);
                }}
              >
                {walletTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </SelectField>
            <Field
              label="Código de indicação"
              id="checkout-referralCode"
              required
              maxLength={32}
              value={draft.referralCode}
              onChange={(event) => set("referralCode", event.target.value)}
              error={errors.referralCode}
            />
            <Field
              label="E-mail"
              id="checkout-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={draft.email}
              onChange={(event) => set("email", event.target.value)}
              error={errors.email}
            />
            <Field
              label="Nome ENS"
              id="checkout-ensName"
              required
              placeholder="colecionador.eth"
              value={draft.ensName}
              onChange={(event) => set("ensName", event.target.value)}
              error={errors.ensName}
            />
          </div>
          <div className="field checkout-note">
            <label htmlFor="checkout-note">Observação (opcional)</label>
            <textarea
              id="checkout-note"
              maxLength={280}
              rows={5}
              value={draft.note ?? ""}
              onChange={(event) => set("note", event.target.value)}
              aria-invalid={Boolean(errors.note)}
              aria-describedby={
                errors.note ? "checkout-note-error" : "checkout-note-hint"
              }
            />
            {errors.note && (
              <p className="field-error" id="checkout-note-error">
                {errors.note}
              </p>
            )}
            <p className="field-hint" id="checkout-note-hint">
              Até 280 caracteres. Use apenas dados fictícios.
            </p>
          </div>
          <label className="checkbox-label checkout-acceptance">
            <input
              required
              type="checkbox"
              checked={accepted}
              onChange={(event) => {
                setAccepted(event.target.checked);
                setErrors((previous) => ({ ...previous, accepted: "" }));
              }}
              aria-invalid={Boolean(errors.accepted)}
              aria-describedby={
                errors.accepted ? "checkout-accepted-error" : undefined
              }
            />{" "}
            Entendo que esta compra é uma simulação, sem pagamento real.
          </label>
          {errors.accepted && (
            <p className="field-error" id="checkout-accepted-error">
              {errors.accepted}
            </p>
          )}
          <p role="alert" className="field-error checkout-feedback">
            {message ||
              (Object.values(errors).some(Boolean)
                ? "Confira os campos destacados antes de continuar."
                : "")}
          </p>
        </section>
        <aside
          className="summary panel checkout-summary"
          aria-labelledby="checkout-summary-heading"
        >
          <h2 id="checkout-summary-heading">Seus NFTs</h2>
          <div className="checkout-item-head" aria-hidden="true">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <div className="checkout-items">
            {quote.data?.items.map((item) => (
              <div key={item.id}>
                <img src={item.image} alt={item.name} width="72" height="72" />
                <span>
                  {item.name}
                  <small>
                    {item.quantity} × {eth(item.unitPrice)}
                  </small>
                </span>
                <strong>{eth(item.total)}</strong>
              </div>
            ))}
          </div>
          {quote.isPending ? (
            <Skeleton />
          ) : quote.isError ? (
            <ErrorState
              error={quote.error}
              retry={() => void quote.refetch()}
            />
          ) : (
            <Summary quote={quote.data} />
          )}
          <section
            className="checkout-wallet-section"
            aria-labelledby="checkout-wallet-heading"
          >
            <h3 id="checkout-wallet-heading">Carteira e rede</h3>
            {!wallets.data.length ? (
              <p>
                Cadastre uma carteira para continuar.{" "}
                <Link to="/wallets">Gerenciar carteiras →</Link>
              </p>
            ) : (
              <>
                <SelectField
                  id="checkout-walletId"
                  label="Carteira"
                  error={errors.walletId}
                >
                  <select
                    id="checkout-walletId"
                    required
                    value={draft.walletId}
                    {...selectProps("walletId")}
                    onChange={(event) => {
                      const wallet = wallets.data.find(
                        (item) => item.id === event.target.value,
                      );
                      set("walletId", event.target.value);
                      if (wallet) set("network", wallet.network);
                      setConnected(false);
                    }}
                  >
                    {wallets.data.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name}
                        {wallet.primary ? " · Principal" : ""}
                      </option>
                    ))}
                  </select>
                </SelectField>
                <div className="wallet-actions">
                  <Button
                    type="button"
                    variant="outline"
                    aria-describedby={
                      errors.connection
                        ? "checkout-connection-error"
                        : undefined
                    }
                    onClick={() => {
                      setConnected(!connected);
                      setRefused(false);
                      setErrors((previous) => ({
                        ...previous,
                        connection: "",
                      }));
                    }}
                  >
                    <WalletIcon size={16} />
                    {connected
                      ? "Desconectar carteira"
                      : "Conectar carteira simulada"}
                  </Button>
                  {!connected && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setRefused(true);
                        setConnected(false);
                      }}
                    >
                      Simular recusa de conexão
                    </Button>
                  )}
                </div>
                <p
                  role="status"
                  className={refused ? "field-error" : "success"}
                >
                  {connected
                    ? "Carteira conectada na simulação."
                    : refused
                      ? "Conexão recusada. Você pode tentar novamente."
                      : ""}
                </p>
                {errors.connection && (
                  <p className="field-error" id="checkout-connection-error">
                    {errors.connection}
                  </p>
                )}
                <Link className="continue-link" to="/wallets">
                  Cadastrar ou editar carteiras →
                </Link>
              </>
            )}
          </section>
          <Button
            type="submit"
            className="checkout-review-button"
            ref={reviewButton}
            disabled={
              !connected ||
              !quote.data ||
              !accepted ||
              beginReview.isPending ||
              submit.isPending
            }
          >
            {beginReview.isPending ? "Verificando dados…" : "Revisar pedido"}
            <ArrowRight size={16} />
          </Button>
          <p className="fine-print">
            <LockKeyhole size={15} /> A cotação será revalidada antes de
            finalizar.
          </p>
          <Link className="checkout-edit-selection" to="/cart">
            Editar seleção →
          </Link>
        </aside>
      </form>
      <Dialog.Root
        open={review}
        onOpenChange={(value) => !submit.isPending && setReview(value)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              const invalid = formRef.current?.querySelector<HTMLElement>(
                '[aria-invalid="true"]',
              );
              (invalid ?? reviewButton.current)?.focus();
            }}
          >
            <Dialog.Title>Revise antes de confirmar</Dialog.Title>
            <Dialog.Description>
              Confira os dados e o total da sua compra simulada.
            </Dialog.Description>
            <dl className="review-details">
              <dt>Colecionador</dt>
              <dd>
                {draft.name} · {draft.username}
              </dd>
              <dt>E-mail</dt>
              <dd>{draft.email}</dd>
              <dt>Perfil e ENS</dt>
              <dd>
                {draft.profileName} · {draft.ensName}
              </dd>
              <dt>Carteira e rede</dt>
              <dd>
                {draft.walletType} · {draft.network}
              </dd>
              {draft.note && (
                <>
                  <dt>Observação</dt>
                  <dd>{draft.note}</dd>
                </>
              )}
            </dl>
            <Summary quote={quote.data} />
            <Button disabled={submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? "Enviando pedido…" : "Confirmar compra"}
            </Button>
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={submit.isPending}>
                Voltar e editar
              </Button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
