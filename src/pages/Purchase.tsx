import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  LockKeyhole,
  Trash2,
  XCircle,
} from "lucide-react";
import { api, err } from "../lib/api";
import { useSession } from "../lib/session";
import type { Cart, Order, Quote } from "../types";
import { Button } from "../components/ui/button";
import {
  Empty,
  ErrorState,
  Quantity,
  Related,
  Skeleton,
  eth,
} from "../components/Shared";

export function useCart() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["cart", user?.id ?? "visitor"],
    queryFn: async ({ signal }) =>
      (await api.get<Cart>("/cart", { signal })).data,
  });
}
export function Summary({ quote }: { quote?: Quote }) {
  return (
    <dl className="totals">
      <div>
        <dt>Subtotal</dt>
        <dd>{quote ? eth(quote.subtotal) : "—"}</dd>
      </div>
      <div>
        <dt>Desconto {quote?.coupon && `(${quote.coupon})`}</dt>
        <dd>− {quote ? eth(quote.discount) : "—"}</dd>
      </div>
      <div>
        <dt>Taxa de rede</dt>
        <dd>{quote ? eth(quote.fee) : "—"}</dd>
      </div>
      <div className="grand-total">
        <dt>Total</dt>
        <dd>{quote ? eth(quote.total) : "—"}</dd>
      </div>
    </dl>
  );
}
export function CartPage() {
  const cart = useCart(),
    client = useQueryClient(),
    { user } = useSession(),
    [coupon, setCoupon] = useState(""),
    [couponError, setCouponError] = useState("");
  const quote = useQuery({
    queryKey: ["quote", user?.id, cart.data?.version],
    queryFn: async () => (await api.post<Quote>("/quote", {})).data,
    enabled: !!cart.data?.items.length,
  });
  const change = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity?: number }) =>
      quantity
        ? api.patch(`/cart/items/${id}`, { quantity })
        : api.delete(`/cart/items/${id}`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cart"] });
      await client.invalidateQueries({ queryKey: ["quote"] });
    },
  });
  const apply = useMutation({
    mutationFn: async (code: string) =>
      (await api.post<Quote>("/quote", { coupon: code })).data,
    onSuccess: async () => {
      setCouponError("");
      await client.invalidateQueries({ queryKey: ["cart"] });
      await client.invalidateQueries({ queryKey: ["quote"] });
    },
    onError: (e) => setCouponError(err(e)),
  });
  if (cart.isPending)
    return (
      <>
        <h1>Seu carrinho</h1>
        <Skeleton detail />
      </>
    );
  if (cart.isError)
    return <ErrorState error={cart.error} retry={() => void cart.refetch()} />;
  return (
    <>
      <div className="breadcrumbs">
        <Link to="/">Início</Link> / <span>Carrinho</span>
      </div>
      <div className="page-title">
        <h1>
          Seu carrinho<span className="accent">.</span>
        </h1>
        <span className="muted">
          {cart.data.items.length} obras selecionadas
        </span>
      </div>
      {!cart.data.items.length ? (
        <Empty
          title="Sua coleção começa com uma escolha"
          text="Explore o mercado e encontre uma obra para chamar de sua."
        />
      ) : (
        <div className="purchase-layout">
          <section>
            <div className="cart-head">
              <span>NFT</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
            </div>
            <div className="cart-items">
              {cart.data.items.map((item) => (
                <article
                  data-testid="cart-item"
                  className="cart-item"
                  key={item.id}
                >
                  <Link
                    to="/nft/$id"
                    params={{ id: item.nftId }}
                    className="cart-art"
                  >
                    <img
                      src={item.nft.image}
                      alt={item.nft.name}
                      width="88"
                      height="88"
                    />
                  </Link>
                  <div className="cart-name">
                    <h2>
                      <Link to="/nft/$id" params={{ id: item.nftId }}>
                        {item.nft.name}
                      </Link>
                    </h2>
                    <p>{item.edition.name}</p>
                    {item.edition.stock < item.quantity && (
                      <small className="field-error">
                        Disponibilidade alterada. Ajuste a quantidade.
                      </small>
                    )}
                  </div>
                  <span className="cart-unit">{eth(item.edition.price)}</span>
                  <Quantity
                    value={item.quantity}
                    max={item.edition.stock}
                    onChange={(quantity) =>
                      change.mutate({ id: item.id, quantity })
                    }
                    disabled={change.isPending}
                  />
                  <span
                    className="cart-line-total"
                    aria-label={`Total de ${item.nft.name}`}
                  >
                    {quote.data?.items.find((line) => line.id === item.id)
                      ?.total
                      ? eth(
                          quote.data.items.find((line) => line.id === item.id)!
                            .total,
                        )
                      : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ${item.nft.name}`}
                    disabled={change.isPending}
                    onClick={() => change.mutate({ id: item.id })}
                  >
                    <Trash2 size={16} />
                  </Button>
                </article>
              ))}
            </div>
            {change.isError && (
              <p className="field-error" role="alert">
                {err(change.error)}
              </p>
            )}
            <Link className="continue-link" to="/">
              ← Continuar explorando
            </Link>
          </section>
          <aside className="summary panel">
            <h2>Resumo da coleção</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                apply.mutate(coupon);
              }}
            >
              <div className="field">
                <label htmlFor="coupon-code">Código promocional</label>
                <div className="coupon-input">
                  <input
                    id="coupon-code"
                    aria-label="Código promocional"
                    aria-invalid={Boolean(couponError)}
                    aria-describedby={
                      couponError ? "coupon-error coupon-hint" : "coupon-hint"
                    }
                    placeholder="Digite seu cupom"
                    value={coupon}
                    onChange={(e) => {
                      setCoupon(e.target.value.toUpperCase());
                      setCouponError("");
                    }}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={apply.isPending}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
              <p id="coupon-hint" className="field-hint">
                Experimente JUNGLE10
              </p>
            </form>
            {couponError && (
              <p id="coupon-error" role="alert" className="field-error">
                {couponError}
              </p>
            )}
            {cart.data.coupon && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCoupon("");
                  apply.mutate("");
                }}
              >
                Remover cupom
              </Button>
            )}
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
            <Button asChild disabled={!quote.data}>
              <Link
                to={user ? "/checkout" : "/login"}
                search={user ? {} : { redirect: "/checkout" }}
              >
                Continuar para pagamento <ArrowRight size={15} />
              </Link>
            </Button>
            <p className="fine-print">
              <LockKeyhole size={13} /> Compra demonstrativa, sem cobrança real.
            </p>
          </aside>
        </div>
      )}
      <Related />
    </>
  );
}
export function OrderPage() {
  const { id } = useParams({ from: "/order/$id" }),
    { user } = useSession(),
    client = useQueryClient();
  const result = useQuery({
    queryKey: ["order", user?.id, id],
    queryFn: async ({ signal }) =>
      (await api.get<Order>(`/orders/${id}`, { signal })).data,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1500 : false,
  });
  useEffect(() => {
    if (!result.data || result.data.status === "pending") return;
    sessionStorage.removeItem(`kurio-attempt:${user?.id}`);
    if (result.data.status === "confirmed") {
      sessionStorage.removeItem(`kurio-checkout:${user?.id}`);
      void client.invalidateQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["quote"] });
    }
  }, [result.data, user?.id, client]);
  if (result.isPending) return <Skeleton detail />;
  if (result.isError)
    return (
      <ErrorState error={result.error} retry={() => void result.refetch()} />
    );
  const order = result.data;
  return (
    <section className="receipt">
      <div className={`receipt-icon ${order.status}`}>
        {order.status === "confirmed" ? (
          <CheckCircle2 size={44} />
        ) : order.status === "pending" ? (
          <Clock size={44} />
        ) : (
          <XCircle size={44} />
        )}
      </div>
      <p className="eyebrow">PEDIDO {order.id}</p>
      <h1>
        {order.status === "confirmed"
          ? "A arte agora faz parte da sua história."
          : order.status === "pending"
            ? "Sua coleção está a caminho."
            : "O pagamento foi recusado."}
      </h1>
      <p role="status">
        {order.status === "confirmed"
          ? "Compra confirmada na simulação. Bem-vindo ao próximo capítulo."
          : order.status === "pending"
            ? "Aguardando a confirmação simulada. Você pode atualizar esta página com segurança."
            : order.reason ||
              "Seus itens continuam no carrinho. Tente novamente quando quiser."}
      </p>
      {order.status !== "pending" && (
        <div className="receipt-card panel">
          <h2>
            {order.status === "confirmed" ? (
              <>
                <Check size={18} /> Recibo da coleção
              </>
            ) : (
              "Detalhes da tentativa"
            )}
          </h2>
          {order.quote.items.map((item) => (
            <div className="receipt-item" key={item.id}>
              <img src={item.image} alt={item.name} width="64" height="64" />
              <div>
                <strong>{item.name}</strong>
                <p>
                  {item.edition} · {item.quantity} edição(ões)
                </p>
              </div>
              <span>{eth(item.total)}</span>
            </div>
          ))}
          <Summary quote={order.quote} />
          <dl className="receipt-details">
            <dt>Colecionador</dt>
            <dd>{order.collector.name}</dd>
            <dt>E-mail</dt>
            <dd>{order.collector.email}</dd>
            {order.collector.username && (
              <>
                <dt>Nome de usuário</dt>
                <dd>{order.collector.username}</dd>
              </>
            )}
            {order.collector.profileName && (
              <>
                <dt>Perfil</dt>
                <dd>{order.collector.profileName}</dd>
              </>
            )}
            {order.collector.ensName && (
              <>
                <dt>Nome ENS</dt>
                <dd>{order.collector.ensName}</dd>
              </>
            )}
            {order.collector.walletType && (
              <>
                <dt>Tipo da carteira</dt>
                <dd>{order.collector.walletType}</dd>
              </>
            )}
            {order.collector.referralCode && (
              <>
                <dt>Código de indicação</dt>
                <dd>{order.collector.referralCode}</dd>
              </>
            )}
            {order.collector.secondaryAddress && (
              <>
                <dt>Carteira secundária</dt>
                <dd>{order.collector.secondaryAddress}</dd>
              </>
            )}
            {order.collector.note && (
              <>
                <dt>Observação</dt>
                <dd>{order.collector.note}</dd>
              </>
            )}
            <dt>Rede</dt>
            <dd>{order.network}</dd>
            <dt>Transação simulada</dt>
            <dd>{order.transaction}</dd>
            <dt>Data do pedido</dt>
            <dd>{new Date(order.createdAt).toLocaleString("pt-BR")}</dd>
          </dl>
          <p className="fine-print">
            Este recibo preserva os valores do momento da compra. A referência
            de transação é fictícia e não existe em exploradores blockchain.
          </p>
        </div>
      )}
      <div className="receipt-actions">
        <Button asChild>
          <Link
            to={order.status === "refused" ? "/cart" : "/"}
            onClick={() => {
              if (order.status === "refused")
                sessionStorage.removeItem(`kurio-attempt:${user?.id}`);
            }}
          >
            {order.status === "refused"
              ? "Voltar ao carrinho"
              : "Continuar explorando"}{" "}
            <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </section>
  );
}
