import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { api, err } from "../lib/api";
import type { Nft, PageResult } from "../types";
import { Button } from "../components/ui/button";
import {
  Empty,
  ErrorState,
  Favorite,
  NftCard,
  Quantity,
  Related,
  Skeleton,
  eth,
} from "../components/Shared";

export type CatalogSearch = {
  q: string;
  category: string;
  collection: string;
  sort: string;
  page: number;
  available: boolean;
  minPrice: string;
  maxPrice: string;
};

const initialSearch: CatalogSearch = {
  q: "",
  category: "",
  collection: "",
  sort: "featured",
  page: 1,
  available: false,
  minPrice: "",
  maxPrice: "",
};
const categories = [
  { value: "Art", label: "Arte digital" },
  { value: "Photography", label: "Fotografia" },
  { value: "Gaming", label: "Jogos" },
  { value: "Collectibles", label: "Colecionáveis" },
];
const collections = [
  "Cosmic Visions",
  "Wild Souls",
  "Digital Expressions",
  "Future Worlds",
];
const articles = [
  {
    title: "Como funciona a propriedade de NFTs",
    date: "12 de setembro",
    minutes: 6,
    image: "neon-vessel",
    description: "Aprenda a colecionar, negociar e verificar ativos digitais.",
  },
  {
    title: "10 artistas digitais para acompanhar",
    date: "13 de setembro",
    minutes: 2,
    image: "hero-ape",
    description: "Conheça criadores que moldam a cultura digital.",
  },
  {
    title: "Raridade, atributos e procedência",
    date: "15 de setembro",
    minutes: 3,
    image: "sage-nomad",
    description:
      "Entenda raridade, procedência, direitos autorais e utilidade.",
  },
  {
    title: "Como proteger sua carteira",
    date: "15 de setembro",
    minutes: 2,
    image: "golden-beat",
    description: "Proteja sua carteira, seus ativos e sua identidade.",
  },
];

type UpdateCatalog = (patch: Partial<CatalogSearch>) => void;

function MarketFilters({
  search,
  update,
  nfts,
  eager = false,
}: {
  search: CatalogSearch;
  update: UpdateCatalog;
  nfts?: Nft[];
  eager?: boolean;
}) {
  return (
    <div className="market-filter-stack">
      <div className="filter-content">
        <h2>Coleções</h2>
        <label className="market-category-field">
          <span className="sr-only">Categoria</span>
          <select
            aria-label="Categoria"
            size={5}
            value={search.category}
            onChange={(event) => update({ category: event.target.value })}
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option value={category.value} key={category.value}>
                {category.label}
                {nfts
                  ? " (" +
                    nfts.filter((nft) => nft.category === category.value)
                      .length +
                    ")"
                  : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field market-collection-field">
          Coleção
          <select
            aria-label="Coleção"
            value={search.collection}
            onChange={(event) => update({ collection: event.target.value })}
          >
            <option value="">Todas as coleções</option>
            {collections.map((collection) => (
              <option key={collection}>{collection}</option>
            ))}
          </select>
        </label>
        <div className="market-price-fields">
          <h3>Faixa de preço</h3>
          <div className="market-price-inputs">
            <label className="field">
              Mínimo
              <input
                aria-label="Preço mínimo em ETH"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00 ETH"
                value={search.minPrice}
                onChange={(event) => update({ minPrice: event.target.value })}
              />
            </label>
            <label className="field">
              Máximo
              <input
                aria-label="Preço máximo em ETH"
                type="number"
                min="0"
                step="0.01"
                placeholder="Sem limite"
                value={search.maxPrice}
                onChange={(event) => update({ maxPrice: event.target.value })}
              />
            </label>
          </div>
        </div>
        <section className="market-network" aria-label="Rede disponível">
          <h3>Rede</h3>
          <p>
            <span>Ethereum</span>
            <span>{nfts ? "(" + nfts.length + ")" : "—"}</span>
          </p>
        </section>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={search.available}
            onChange={(event) => update({ available: event.target.checked })}
          />
          Apenas disponíveis
        </label>
        <Button variant="outline" onClick={() => update(initialSearch)}>
          Limpar filtros
        </Button>
      </div>
      <Link className="filter-promo" to="/nft/$id" params={{ id: "2" }}>
        <span>NFT EM DESTAQUE</span>
        <h3>OFERTA LIMITADA</h3>
        <img
          src="/assets/figma/sage-nomad.webp"
          width="310"
          height="368"
          alt="Sage Nomad, obra em destaque"
          loading={eager ? "eager" : "lazy"}
        />
      </Link>
    </div>
  );
}

function MarketHero() {
  return (
    <section className="hero" aria-label="Destaque da coleção">
      <img
        className="market-hero-background"
        src="/assets/figma/rectangle3.svg"
        width="1200"
        height="450"
        alt=""
      />
      <div className="hero-copy">
        <p className="eyebrow">Bem-vindo à Kurio</p>
        <h1>
          SEJA DONO DO FUTURO
          <br />
          DA ARTE DIGITAL
        </h1>
        <p>
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e tenha uma parte da
          cultura da internet.
        </p>
        <a className="btn btn-primary" href="#mercado">
          EXPLORAR
        </a>
        <img
          className="market-hero-dots"
          src="/assets/figma/group4.svg"
          width="40"
          height="8"
          alt=""
        />
      </div>
      <Link
        className="hero-art"
        to="/nft/$id"
        params={{ id: "1" }}
        aria-label="Conhecer Emerald Ape #042"
      >
        <img
          src="/assets/figma/hero-ape.webp"
          width="450"
          height="450"
          fetchPriority="high"
          alt="Emerald Ape, macaco com óculos verdes e jaqueta esportiva"
        />
      </Link>
    </section>
  );
}

function MarketPromos({ backdrop }: { backdrop: boolean }) {
  return (
    <section className="market-promos" aria-label="Coleções em destaque">
      <article className="market-promo">
        <img
          className="market-promo-art"
          src="/assets/figma/hero-ape.webp"
          width="292"
          height="250"
          alt="Emerald Ape"
          loading={backdrop ? "eager" : "lazy"}
        />
        <div className="market-promo-copy">
          <h2>
            Lançamentos gênesis
            <br />
            de edição limitada
          </h2>
          <p>
            Colecione edições escassas diretamente dos criadores antes da
            revelação pública.
          </p>
          <Link
            className="btn btn-primary"
            to="/"
            hash="mercado"
            search={{ sort: "newest" }}
          >
            Explorar <ArrowRight size={18} />
          </Link>
        </div>
        <img
          className="market-promo-mask"
          src="/assets/figma/mask-group.svg"
          width="586"
          height="250"
          alt=""
        />
      </article>
      <article className="market-promo">
        <img
          className="market-promo-art"
          src="/assets/figma/neon-vessel.webp"
          width="287"
          height="250"
          alt="Neon Vessel"
          loading={backdrop ? "eager" : "lazy"}
        />
        <div className="market-promo-copy">
          <h2>
            Arte digital selecionada
            <br />e muito mais
          </h2>
          <p>
            Explore novos artistas, coleções verificadas e obras digitais que
            definem a cultura.
          </p>
          <Link
            className="btn btn-primary"
            to="/"
            hash="mercado"
            search={{ category: "Art" }}
          >
            Explorar <ArrowRight size={18} />
          </Link>
        </div>
        <img
          className="market-promo-mask"
          src="/assets/figma/mask-group.svg"
          width="586"
          height="250"
          alt=""
        />
      </article>
    </section>
  );
}

function MarketJournal({ backdrop }: { backdrop: boolean }) {
  const [article, setArticle] = useState<(typeof articles)[number] | null>(
    null,
  );
  return (
    <section
      className="market-journal"
      id="diario"
      aria-labelledby="market-journal-title"
    >
      <header>
        <h2 id="market-journal-title">Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
      </header>
      <div className="market-journal-grid">
        {articles.map((entry) => (
          <article className="market-journal-card" key={entry.title}>
            <img
              src={"/assets/figma/" + entry.image + ".webp"}
              width="268"
              height="195"
              alt=""
              loading={backdrop ? "eager" : "lazy"}
            />
            <div>
              <p className="market-journal-date">
                {entry.date} | Leitura de {entry.minutes} min
              </p>
              <h3>{entry.title}</h3>
              <p>{entry.description}</p>
              <button
                type="button"
                onClick={() => setArticle(entry)}
                aria-label={"Ler mais: " + entry.title}
              >
                Ler mais <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        ))}
      </div>
      {!backdrop && (
        <Dialog.Root
          open={Boolean(article)}
          onOpenChange={(open) => !open && setArticle(null)}
        >
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content market-article-preview">
              <p className="eyebrow">PRÉVIA DO DIÁRIO</p>
              <Dialog.Title>{article?.title}</Dialog.Title>
              <Dialog.Description>{article?.description}</Dialog.Description>
              <p>Descubra as obras e os criadores da seleção Kurio.</p>
              <a
                className="btn btn-primary"
                href="#mercado"
                onClick={() => setArticle(null)}
              >
                Explorar o mercado
              </a>
              <Dialog.Close asChild>
                <Button variant="ghost">Fechar</Button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </section>
  );
}

function MarketContent({
  search,
  update,
  backdrop = false,
}: {
  search: CatalogSearch;
  update: UpdateCatalog;
  backdrop?: boolean;
}) {
  const [filterOpen, setFilterOpen] = useState(false);
  const result = useQuery({
    queryKey: ["nfts", search],
    queryFn: async ({ signal }) =>
      (
        await api.get<PageResult<Nft>>("/nfts", {
          params: { ...search, pageSize: 9 },
          signal,
        })
      ).data,
  });
  const facets = useQuery({
    queryKey: ["nfts", "filter-options"],
    queryFn: async ({ signal }) =>
      (
        await api.get<PageResult<Nft>>("/nfts", {
          params: { pageSize: 24 },
          signal,
        })
      ).data.items,
  });
  const activeTab =
    search.sort === "newest"
      ? "newest"
      : search.sort === "popular"
        ? "popular"
        : "featured";
  return (
    <div
      className={"market-page" + (backdrop ? " market-backdrop" : "")}
      inert={backdrop || undefined}
      aria-hidden={backdrop || undefined}
    >
      <MarketHero />
      <section
        id="mercado"
        className="catalog-layout"
        aria-label="Mercado de NFTs"
      >
        <aside className="desktop-filters">
          <MarketFilters
            search={search}
            update={update}
            nfts={facets.data}
            eager={backdrop}
          />
        </aside>
        <div className="catalog-main">
          <h2 className="sr-only">Explore o mercado</h2>
          <div className="catalog-toolbar">
            <div
              className="market-tabs"
              role="group"
              aria-label="Seleção de obras"
            >
              {[
                ["featured", "Todos os NFTs"],
                ["newest", "Novos lançamentos"],
                ["popular", "Em alta"],
              ].map(([sort, label]) => (
                <button
                  key={sort}
                  type="button"
                  aria-pressed={activeTab === sort}
                  onClick={() => update({ sort })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="sort-label">
              Ordenar por:
              <select
                aria-label="Ordenar por"
                value={search.sort}
                onChange={(event) => update({ sort: event.target.value })}
              >
                <option value="featured">Destaques</option>
                <option value="newest">Mais recentes</option>
                <option value="popular">Em alta</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name">Nome A–Z</option>
              </select>
            </label>
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="Buscar NFTs"
                placeholder="Busque uma obra, coleção ou artista"
                value={search.q}
                onChange={(event) => update({ q: event.target.value })}
              />
            </label>
            {!backdrop && (
              <Dialog.Root open={filterOpen} onOpenChange={setFilterOpen}>
                <Dialog.Trigger asChild>
                  <Button className="mobile-filter" variant="outline">
                    <SlidersHorizontal size={16} /> Filtros
                  </Button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content filter-dialog">
                    <Dialog.Title>Filtrar obras</Dialog.Title>
                    <Dialog.Description>
                      Combine filtros para encontrar sua próxima obra.
                    </Dialog.Description>
                    <MarketFilters
                      search={search}
                      update={update}
                      nfts={facets.data}
                    />
                    <Dialog.Close asChild>
                      <Button>Ver resultados</Button>
                    </Dialog.Close>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}
          </div>
          <div aria-live="polite" className="query-status">
            {result.isFetching && !result.isPending ? "Atualizando obras…" : ""}
          </div>
          {result.isPending ? (
            <div className="nft-grid">
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton key={index} />
              ))}
            </div>
          ) : result.isError ? (
            <ErrorState
              error={result.error}
              retry={() => void result.refetch()}
            />
          ) : !result.data.items.length ? (
            <Empty />
          ) : (
            <>
              <div className="nft-grid">
                {result.data.items.map((nft, index) => (
                  <NftCard
                    key={nft.id}
                    nft={nft}
                    priority={backdrop || index < 3}
                  />
                ))}
              </div>
              <nav className="pagination" aria-label="Paginação">
                <Button
                  variant="outline"
                  disabled={search.page <= 1}
                  onClick={() => update({ page: search.page - 1 })}
                >
                  Anterior
                </Button>
                {Array.from({ length: result.data.pages }, (_, index) => (
                  <Button
                    key={index}
                    variant={search.page === index + 1 ? "default" : "ghost"}
                    aria-label={"Página " + (index + 1)}
                    aria-current={
                      search.page === index + 1 ? "page" : undefined
                    }
                    onClick={() => update({ page: index + 1 })}
                  >
                    {index + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  aria-label="Próxima página"
                  disabled={search.page >= result.data.pages}
                  onClick={() => update({ page: search.page + 1 })}
                >
                  Próxima <ArrowRight size={14} />
                </Button>
              </nav>
            </>
          )}
        </div>
      </section>
      <MarketPromos backdrop={backdrop} />
      <MarketJournal backdrop={backdrop} />
    </div>
  );
}

export function MarketPage() {
  const search = useSearch({ from: "/" });
  const navigate = useNavigate();
  return (
    <MarketContent
      search={search}
      update={(patch) =>
        void navigate({
          to: "/",
          search: { ...search, ...patch, page: patch.page ?? 1 },
          resetScroll: false,
        })
      }
    />
  );
}

export function MarketBackdrop() {
  return <MarketContent search={initialSearch} update={() => {}} backdrop />;
}

export function DetailPage() {
  const { id } = useParams({ from: "/nft/$id" }),
    client = useQueryClient(),
    navigate = useNavigate();
  const [editionId, setEdition] = useState("standard"),
    [quantity, setQuantity] = useState(1),
    [image, setImage] = useState(0),
    [notice, setNotice] = useState("");
  const result = useQuery({
    queryKey: ["nft", id],
    queryFn: async ({ signal }) =>
      (await api.get<Nft>(`/nfts/${id}`, { signal })).data,
  });
  const add = useMutation({
    mutationFn: () =>
      api.post("/cart/items", { nftId: id, editionId, quantity }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cart"] });
      setNotice("Obra adicionada ao carrinho.");
      void navigate({ to: "/cart" });
    },
  });
  if (result.isPending)
    return (
      <div className="detail-loading">
        <div className="detail-grid">
          <Skeleton detail />
          <Skeleton detail />
        </div>
        <div className="detail-loading-copy">
          <Skeleton />
          <Skeleton />
        </div>
      </div>
    );
  if (result.isError)
    return (
      <ErrorState error={result.error} retry={() => void result.refetch()} />
    );
  const nft = result.data,
    edition = nft.editions.find((e) => e.id === editionId) ?? nft.editions[0];
  return (
    <div className="nft-detail-page">
      <div className="breadcrumbs">
        <Link to="/">Início</Link> / <Link to="/">Mercado</Link> /{" "}
        <span>{nft.name}</span>
      </div>
      <section className="detail-grid">
        <div className="gallery">
          <div className="thumbnails">
            {nft.images.map((src, i) => (
              <button
                key={src}
                className={image === i ? "selected" : ""}
                aria-label={`Ver imagem ${i + 1}`}
                aria-pressed={image === i}
                onClick={() => setImage(i)}
              >
                <img
                  src={src}
                  alt={`Vista ${i + 1} de ${nft.name}`}
                  width="90"
                  height="90"
                />
              </button>
            ))}
          </div>
          <div className="detail-art-frame">
            <img
              className="detail-art"
              src={nft.images[image] || nft.image}
              width="600"
              height="600"
              alt={nft.name}
              fetchPriority="high"
            />
          </div>
        </div>
        <div className="detail-info">
          <p className="eyebrow">
            {nft.collection} <span className="verified">✦ Curadoria Kurio</span>
          </p>
          <h1>{nft.name}</h1>
          <p className="detail-price">{eth(edition.price)}</p>
          <p className="rating">
            ★★★★★ <span>Obra selecionada pela nossa curadoria</span>
          </p>
          <hr />
          <h2>Sobre este NFT</h2>
          <p>{nft.description}</p>
          <p className="muted">
            Criado por <strong>{nft.creator}</strong>
          </p>
          <label className="field">
            Edição
            <select
              aria-label="Edição"
              value={editionId}
              onChange={(e) => {
                setEdition(e.target.value);
                setQuantity(1);
              }}
            >
              {nft.editions.map((e) => (
                <option value={e.id} key={e.id} disabled={!e.stock}>
                  {e.name} · {e.stock ? `${e.stock} disponíveis` : "Esgotada"}
                </option>
              ))}
            </select>
          </label>
          <div className="purchase-row">
            <Quantity
              value={quantity}
              max={edition.stock}
              onChange={setQuantity}
              disabled={!edition.stock}
            />
            <Button
              disabled={add.isPending || !edition.stock}
              onClick={() => add.mutate()}
            >
              {add.isPending
                ? "Adicionando…"
                : edition.stock
                  ? "Adicionar ao carrinho"
                  : "Edição esgotada"}
            </Button>
            <Favorite id={id} />
          </div>
          <p role="status">{notice}</p>
          {add.isError && (
            <p role="alert" className="field-error">
              {err(add.error)}
            </p>
          )}
          <p className="muted fine-print">
            Propriedade digital verificável. Transação demonstrativa, sem
            movimentação de valores reais.
          </p>
          <dl className="detail-facts">
            <dt>Rede</dt>
            <dd>Ethereum</dd>
            <dt>Padrão</dt>
            <dd>ERC-721 / ERC-1155</dd>
            <dt>Autenticidade</dt>
            <dd>Curadoria independente ✦</dd>
          </dl>
        </div>
      </section>
      <section className="detail-description">
        <h2>Detalhes do NFT</h2>
        <p>
          {nft.name} é uma edição limitada da coleção {nft.collection}. Cada
          obra é um registro visual de um universo em constante transformação.
        </p>
        <p>
          A propriedade inclui a arte e sua história. Explore, colecione e apoie
          a próxima geração de criadores.
        </p>
        <p className="muted">
          Rede: Ethereum · Contrato e direitos de propriedade simulados para
          esta demonstração.
        </p>
      </section>
      <Related />
    </div>
  );
}
