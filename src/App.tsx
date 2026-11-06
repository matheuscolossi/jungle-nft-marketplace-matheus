import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Link,
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  useLocation,
  useNavigate,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  FlaskConical,
  Heart,
  LogIn,
  Menu,
  Search,
  UserRound,
  X,
} from "lucide-react";
import { MarketPage, DetailPage, type CatalogSearch } from "./pages/Market";
import { CartPage, OrderPage, useCart } from "./pages/Purchase";
import { CheckoutPage } from "./pages/Checkout";
import { AuthPage, ProfilePage, WalletsPage } from "./pages/Account";
import { Button } from "./components/ui/button";
import { Empty, ErrorState, NftCard, Skeleton } from "./components/Shared";
import { api, err } from "./lib/api";
import { useSession } from "./lib/session";
import {
  startRealtime,
  getConnectionState,
  subscribeConnection,
} from "./lib/realtime";
import type { Nft, PageResult, Scenario } from "./types";

function Header() {
  const connection = useSyncExternalStore(
    subscribeConnection,
    getConnectionState,
  );
  const navigate = useNavigate();
  const { user } = useSession(),
    cart = useCart(),
    [open, setOpen] = useState(false),
    location = useLocation();
  useEffect(() => setOpen(false), [location.pathname]);
  const nav = (
    <>
      <Link to="/" activeProps={{ className: "nav-active" }}>
        Início
      </Link>
      <Link to="/" hash="mercado">
        Mercado
      </Link>
      <Link to="/favorites">Favoritos</Link>
      <Link to="/wallets">Carteiras</Link>
    </>
  );
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        Pular para o conteúdo
      </a>
      <Link to="/" className="brand" aria-label="Kurio início">
        KURIO
      </Link>
      <nav className="desktop-nav" aria-label="Navegação principal">
        {nav}
      </nav>
      <div className="header-actions">
        <Button
          variant="ghost"
          size="icon"
          className="header-search"
          aria-label="Pesquisar obras"
          onClick={() => {
            const focusSearch = () =>
              Array.from(
                document.querySelectorAll<HTMLInputElement>(
                  'input[aria-label="Buscar NFTs"]',
                ),
              )
                .find((input) => input.getClientRects().length > 0)
                ?.focus();
            if (location.pathname === "/") focusSearch();
            else
              void navigate({ to: "/", hash: "mercado" }).then(() =>
                requestAnimationFrame(focusSearch),
              );
          }}
        >
          <Search size={20} />
        </Button>
        <span
          className="connection-status"
          role="status"
          aria-label={
            connection === "connected"
              ? "Atualizações conectadas"
              : "Reconectando atualizações"
          }
        >
          <span
            className={
              connection === "connected"
                ? "connection-dot connected"
                : "connection-dot"
            }
          />
          {connection === "connected" ? "Ao vivo" : "Reconectando"}
        </span>
        <Link
          to="/cart"
          className="cart-link"
          aria-label={`Carrinho, ${cart.data?.items.reduce((total, item) => total + item.quantity, 0) ?? 0} itens`}
        >
          <img
            src="/assets/figma/cart-icon.svg"
            width="24"
            height="24"
            alt=""
            aria-hidden="true"
          />
          <span>
            {cart.data?.items.reduce((n, i) => n + i.quantity, 0) ?? 0}
          </span>
        </Link>
        <Button asChild size="sm">
          <Link to={user ? "/profile" : "/login"}>
            {user ? <UserRound size={15} /> : <LogIn size={15} />}
            <span>{user ? user.name.split(" ")[0] : "Entrar"}</span>
          </Link>
        </Button>
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="Abrir menu"
            >
              <Menu size={22} />
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content nav-dialog">
              <Dialog.Title>Navegação KURIO</Dialog.Title>
              <Dialog.Description>
                Explore sua próxima obra e sua conta.
              </Dialog.Description>
              <nav>{nav}</nav>
              <Dialog.Close asChild>
                <Button variant="outline">Fechar menu</Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </header>
  );
}
function Demo() {
  const client = useQueryClient(),
    { refresh } = useSession(),
    [open, setOpen] = useState(false),
    [scenario, setScenario] = useState<Scenario>("success"),
    [notice, setNotice] = useState(""),
    [working, setWorking] = useState(false);
  const run = async (body: object | null) => {
    setWorking(true);
    try {
      if (body) await api.patch("/demo", body);
      else {
        await api.delete("/demo");
        Object.keys(sessionStorage)
          .filter((key) => key.startsWith("kurio-"))
          .forEach((key) => sessionStorage.removeItem(key));
        window.location.assign("/");
        return;
      }
      await client.invalidateQueries();
      await refresh();
      setNotice(body ? "Cenário atualizado." : "Demonstração restaurada.");
      if (!body) setScenario("success");
    } catch (e) {
      setNotice(err(e));
    } finally {
      setWorking(false);
    }
  };
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="demo-trigger">
          <FlaskConical size={14} /> Cenários de demonstração
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content demo-dialog">
          <Dialog.Title>Laboratório da demonstração</Dialog.Title>
          <Dialog.Description>
            Condições reproduzíveis da API e do Socket.IO. Apenas dados
            fictícios neste navegador.
          </Dialog.Description>
          <label className="field">
            Cenário
            <select
              data-testid="demo-scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as Scenario)}
            >
              {Object.entries({
                success: "Sucesso",
                empty: "Catálogo vazio",
                slow: "Conexão lenta",
                "out-of-order": "Respostas fora de ordem",
                offline: "Falha de conexão",
                "server-error": "Erro HTTP 503",
                unauthorized: "Sessão expirada",
                "favorite-error": "Falha em favoritos",
                "validation-error": "Erro de validação",
                "price-change": "Preço alterado na compra",
                "sold-out": "Edição esgotada na compra",
                "order-timeout": "Timeout após criar pedido",
                "payment-refused": "Pagamento recusado",
                pending: "Pedido pendente",
              }).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Button disabled={working} onClick={() => void run({ scenario })}>
            Aplicar cenário
          </Button>
          <div className="demo-actions">
            <Button
              variant="outline"
              onClick={() =>
                void run({ action: "update-nft", nftId: "1", price: "1.59" })
              }
            >
              Alterar preço via Socket.IO
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                void run({ action: "update-nft", nftId: "1", stock: 0 })
              }
            >
              Esgotar edição
            </Button>
            <Button
              variant="outline"
              onClick={() => void run({ action: "replay-event" })}
            >
              Repetir evento
            </Button>
            <Button
              variant="outline"
              onClick={() => void run({ action: "replay-event", old: true })}
            >
              Evento antigo
            </Button>
            <Button
              variant="outline"
              onClick={() => void run({ action: "disconnect" })}
            >
              Interromper conexão
            </Button>
            <Button
              variant="outline"
              onClick={() => void run({ action: "reconnect" })}
            >
              Reconectar
            </Button>
            <Button
              variant="outline"
              onClick={() => void run({ action: "expire-session" })}
            >
              Expirar sessão
            </Button>
            <Button
              variant="outline"
              onClick={() => void run({ action: "settle-orders" })}
            >
              Concluir pedido pendente
            </Button>
          </div>
          <p role="status">{notice}</p>
          <Button variant="outline" onClick={() => void run(null)}>
            Restaurar demonstração
          </Button>
          <Dialog.Close asChild>
            <Button variant="ghost">Fechar</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function Footer() {
  const [newsletterNotice, setNewsletterNotice] = useState("");
  const unavailable = "Conteúdo indisponível nesta demonstração";
  return (
    <footer className="footer figma-footer">
      <div className="benefits">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital verificada com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
          ],
        ].map(([mark, title, text]) => (
          <div key={mark}>
            <span className="benefit-icon" aria-hidden="true">
              {mark}
            </span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
        <div className="footer-feature">
          <h3>Antecipe-se ao próximo lançamento</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setNewsletterNotice(
                "Os alertas não estão disponíveis nesta demonstração.",
              );
            }}
          >
            <label className="sr-only" htmlFor="newsletter-email">
              E-mail para alertas
            </label>
            <div className="newsletter-input">
              <input
                id="newsletter-email"
                type="email"
                autoComplete="email"
                placeholder="digite seu e-mail..."
                required
              />
              <Button size="sm">Enviar</Button>
            </div>
          </form>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
          <p role="status">{newsletterNotice}</p>
        </div>
      </div>
      <div className="footer-brand">
        <Link className="brand" to="/">
          KURIO
        </Link>
        <span>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </span>
        <span>contato@email.com</span>
        <span>+55 11 4002 8922</span>
      </div>
      <div className="footer-links">
        <div>
          <h3>Meu perfil</h3>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/wallets">Minhas carteiras</Link>
          <Link to="/favorites">Lista de interesse</Link>
          <button disabled title={unavailable}>
            Atividade
          </button>
          <button disabled title={unavailable}>
            Estúdio do criador
          </button>
        </div>
        <div>
          <h3>Central de ajuda</h3>
          <button disabled title={unavailable}>
            Central de ajuda
          </button>
          <button disabled title={unavailable}>
            Como comprar NFTs
          </button>
          <button disabled title={unavailable}>
            Carteira e segurança
          </button>
          <button disabled title={unavailable}>
            Política do mercado
          </button>
          <a
            href="https://github.com/matheuscolossi/jungle-nft-marketplace-matheus"
            target="_blank"
            rel="noreferrer"
          >
            Código-fonte ↗
          </a>
          <Demo />
        </div>
        <div>
          <h3>Coleções</h3>
          <Link to="/" search={{ category: "Art" }} hash="mercado">
            Arte digital
          </Link>
          <Link to="/" search={{ category: "Photography" }} hash="mercado">
            Fotografia
          </Link>
          <Link to="/" search={{ category: "Gaming" }} hash="mercado">
            Jogos
          </Link>
          <Link to="/" search={{ category: "Collectibles" }} hash="mercado">
            Colecionáveis
          </Link>
        </div>
        <div>
          <h3>Redes sociais</h3>
          <div className="social-links">
            {["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube"].map(
              (name, i) => (
                <button
                  key={name}
                  disabled
                  title={unavailable}
                  aria-label={name}
                >
                  <img
                    src={"/assets/figma/frame" + (108 + i) + ".svg"}
                    width="32"
                    height="32"
                    alt=""
                  />
                </button>
              ),
            )}
          </div>
          <h3>Carteiras compatíveis</h3>
          <p className="wallet-chip">METAMASK · WALLETCONNECT · COINBASE</p>
        </div>
      </div>
      <div className="copyright">
        © 2026 Kurio. Propriedade digital para todos.
      </div>
    </footer>
  );
}
function Root() {
  const { user } = useSession(),
    client = useQueryClient(),
    [notice, setNotice] = useState(""),
    location = useLocation();
  useEffect(
    () => startRealtime(client, user?.id ?? null, setNotice),
    [client, user?.id],
  );
  useEffect(() => {
    document.title = `${location.pathname === "/" ? "Arte digital para colecionar" : location.pathname.startsWith("/nft") ? "Detalhes da obra" : location.pathname === "/cart" ? "Seu carrinho" : location.pathname === "/checkout" ? "Pagamento" : "Seu universo"} — KURIO`;
    if (!location.hash) window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);
  return (
    <div
      className={`site${location.pathname.startsWith("/nft/") ? " site-detail" : ""}${["/login", "/register"].includes(location.pathname) ? " site-auth" : ""}${location.pathname.startsWith("/order/") ? " site-order" : ""}${["/cart", "/checkout"].includes(location.pathname) || location.pathname.startsWith("/nft/") ? " site-market-flow" : ""}`}
    >
      <Header />
      {notice && (
        <div className="live-notice" role="status">
          {notice}
          <button aria-label="Fechar aviso" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      {(["/profile", "/wallets"].includes(location.pathname) ||
        location.pathname.startsWith("/order/")) && (
        <div className="route-demo">
          <Demo />
        </div>
      )}
      <Footer />
    </div>
  );
}
function Private({ children }: { children: React.ReactNode }) {
  const { user, loading, loggingOut } = useSession(),
    location = useLocation(),
    navigate = useNavigate();
  // Mantém o destino original enquanto o login é carregado, evitando redirecionamentos em sequência.
  const returnTo = useRef(location.href);
  const redirecting = useRef(false);
  useEffect(() => {
    if (!loading && !loggingOut && !user && !redirecting.current) {
      redirecting.current = true;
      void navigate({
        to: "/login",
        search: { redirect: returnTo.current },
        replace: true,
      });
    }
  }, [loading, loggingOut, user, navigate]);
  return loading || !user ? <Skeleton detail /> : children;
}
function FavoritesPage() {
  const { user } = useSession();
  const favorites = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: async ({ signal }) =>
      (await api.get<string[]>("/favorites", { signal })).data,
  });
  const nfts = useQuery({
    queryKey: ["nfts", "favorites", user?.id],
    queryFn: async ({ signal }) =>
      (
        await api.get<PageResult<Nft>>("/nfts", {
          params: { pageSize: 24 },
          signal,
        })
      ).data,
  });
  if (favorites.isPending || nfts.isPending) return <Skeleton detail />;
  if (favorites.isError || nfts.isError)
    return (
      <ErrorState
        error={favorites.error || nfts.error}
        retry={() => {
          void favorites.refetch();
          void nfts.refetch();
        }}
      />
    );
  const items = nfts.data.items.filter((n) => favorites.data.includes(n.id));
  return (
    <>
      <div className="page-title">
        <h1>
          <Heart size={28} /> Sua lista de interesse
        </h1>
      </div>
      {items.length ? (
        <section aria-label="Obras favoritas">
          <h2 className="sr-only">Obras favoritas</h2>
          <div className="nft-grid">
            {items.map((n) => (
              <NftCard key={n.id} nft={n} />
            ))}
          </div>
        </section>
      ) : (
        <Empty
          title="Guarde o que inspira você"
          text="Toque no coração de uma obra para encontrá-la aqui."
        />
      )}
    </>
  );
}
const root = createRootRoute({
  component: Root,
  notFoundComponent: () => (
    <Empty
      title="Esta página ainda não foi criada"
      text="Volte ao mercado e descubra novas possibilidades."
    />
  ),
});
const market = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: (
    raw: Partial<CatalogSearch> & SearchSchemaInput,
  ): CatalogSearch => ({
    q: String(raw.q ?? ""),
    category: ["Art", "Photography", "Gaming", "Collectibles"].includes(
      String(raw.category),
    )
      ? String(raw.category)
      : "",
    collection: String(raw.collection ?? ""),
    sort: [
      "featured",
      "newest",
      "popular",
      "price-asc",
      "price-desc",
      "name",
    ].includes(String(raw.sort))
      ? String(raw.sort)
      : "featured",
    page: Math.max(1, Math.floor(Number(raw.page) || 1)),
    available: raw.available === true || String(raw.available) === "true",
    minPrice: /^\d*(\.\d+)?$/.test(String(raw.minPrice ?? ""))
      ? String(raw.minPrice ?? "")
      : "",
    maxPrice: /^\d*(\.\d+)?$/.test(String(raw.maxPrice ?? ""))
      ? String(raw.maxPrice ?? "")
      : "",
  }),
  component: MarketPage,
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: DetailPage,
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/cart",
  component: CartPage,
});
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/checkout",
  component: () => (
    <Private>
      <CheckoutPage />
    </Private>
  ),
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/order/$id",
  component: () => (
    <Private>
      <OrderPage />
    </Private>
  ),
});
const authSearch = (raw: { redirect?: string } & SearchSchemaInput) => ({
  redirect:
    typeof raw.redirect === "string" &&
    raw.redirect.startsWith("/") &&
    !raw.redirect.startsWith("//")
      ? raw.redirect
      : "/",
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: authSearch,
  component: () => <AuthPage mode="login" />,
});
const register = createRoute({
  getParentRoute: () => root,
  path: "/register",
  validateSearch: authSearch,
  component: () => <AuthPage mode="register" />,
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/profile",
  component: () => (
    <Private>
      <ProfilePage />
    </Private>
  ),
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/wallets",
  component: () => (
    <Private>
      <WalletsPage />
    </Private>
  ),
});
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favorites",
  component: () => (
    <Private>
      <FavoritesPage />
    </Private>
  ),
});
export const router = createRouter({
  routeTree: root.addChildren([
    market,
    detail,
    cart,
    checkout,
    order,
    login,
    register,
    profile,
    wallets,
    favorites,
  ]),
  defaultPreload: "intent",
  scrollRestoration: true,
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
