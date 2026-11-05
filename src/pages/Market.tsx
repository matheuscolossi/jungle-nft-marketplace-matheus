import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Search, SlidersHorizontal } from "lucide-react";
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
  maxPrice: string;
};
export function MarketPage() {
  const search = useSearch({ from: "/" }),
    navigate = useNavigate(),
    [filterOpen, setFilterOpen] = useState(false);
  const update = (patch: Partial<CatalogSearch>) =>
    void navigate({
      to: "/",
      search: { ...search, ...patch, page: patch.page ?? 1 },
      resetScroll: false,
    });
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
  const filters = (
    <div className="filter-content">
      <h2>Coleções</h2>
      <label className="field">
        Categoria
        <select
          aria-label="Categoria"
          value={search.category}
          onChange={(e) => update({ category: e.target.value })}
        >
          <option value="">Todas as categorias</option>
          <option value="Art">Arte digital</option>
          <option value="Photography">Fotografia</option>
          <option value="Gaming">Jogos</option>
          <option value="Collectibles">Colecionáveis</option>
        </select>
      </label>
      <label className="field">
        Coleção
        <select
          aria-label="Coleção"
          value={search.collection}
          onChange={(e) => update({ collection: e.target.value })}
        >
          <option value="">Todas as coleções</option>
          {[
            "Cosmic Visions",
            "Wild Souls",
            "Digital Expressions",
            "Future Worlds",
          ].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="filter-line" />
      <label className="field">
        Faixa de preço
        <input
          aria-label="Preço máximo em ETH"
          type="number"
          min="0"
          step="0.1"
          placeholder="Máximo em ETH"
          value={search.maxPrice}
          onChange={(e) => update({ maxPrice: e.target.value })}
        />
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={search.available}
          onChange={(e) => update({ available: e.target.checked })}
        />{" "}
        Apenas disponíveis
      </label>
      <Button
        variant="outline"
        onClick={() =>
          update({
            q: "",
            category: "",
            collection: "",
            sort: "featured",
            available: false,
            maxPrice: "",
          })
        }
      >
        Limpar filtros
      </Button>
      <div className="filter-promo">
        <span>NFT EM DESTAQUE</span>
        <h3>
          Uma edição.
          <br />
          Infinitas possibilidades.
        </h3>
        <img
          src="/assets/sage-nomad.webp"
          width="250"
          height="250"
          alt="Obra da coleção em destaque"
        />
        <Link to="/nft/$id" params={{ id: "2" }}>
          Conheça a obra <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
  return (
    <>
      <section className="hero">
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
            EXPLORAR O MERCADO <ArrowRight size={16} />
          </a>
          <div className="hero-caption">
            <span className="small-dot" /> Curadoria independente. Conexões
            extraordinárias.
          </div>
        </div>
        <Link className="hero-art" to="/nft/$id" params={{ id: "1" }}>
          <img
            src="/assets/emerald-ape.webp"
            width="600"
            height="600"
            fetchPriority="high"
            alt="Emerald Ape: macaco com óculos verdes e jaqueta esportiva"
          />
          <span>
            EMERALD APE #042 <ArrowRight size={16} />
          </span>
        </Link>
      </section>
      <section id="mercado" className="catalog-layout">
        <aside className="desktop-filters">{filters}</aside>
        <div className="catalog-main">
          <div className="catalog-title">
            <div>
              <p className="eyebrow">ENCONTRE SUA PRÓXIMA CONEXÃO</p>
              <h2>
                Explore o mercado<span className="accent">.</span>
              </h2>
            </div>
            <span className="muted">{result.data?.total ?? "—"} obras</span>
          </div>
          <div className="catalog-toolbar">
            <label className="search-box">
              <Search size={17} />
              <input
                aria-label="Buscar NFTs"
                placeholder="Busque uma obra, coleção ou artista"
                value={search.q}
                onChange={(e) => update({ q: e.target.value })}
              />
            </label>
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
                  {filters}
                  <Dialog.Close asChild>
                    <Button>Ver resultados</Button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <label className="sort-label">
              Ordenar por
              <select
                aria-label="Ordenar por"
                value={search.sort}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="featured">Destaques</option>
                <option value="newest">Mais recentes</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
                <option value="name">Nome A–Z</option>
              </select>
            </label>
          </div>
          <div aria-live="polite" className="query-status">
            {result.isFetching && !result.isPending ? "Atualizando obras…" : ""}
          </div>
          {result.isPending ? (
            <div className="nft-grid">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} />
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
                {result.data.items.map((nft, i) => (
                  <NftCard key={nft.id} nft={nft} priority={i < 3} />
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
                {Array.from({ length: result.data.pages }, (_, i) => (
                  <Button
                    key={i}
                    variant={search.page === i + 1 ? "default" : "ghost"}
                    aria-label={`Página ${i + 1}`}
                    aria-current={search.page === i + 1 ? "page" : undefined}
                    onClick={() => update({ page: i + 1 })}
                  >
                    {i + 1}
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
      <section className="editorial">
        <p className="eyebrow">CURADORIA QUE CONECTA</p>
        <h2>
          Arte digital selecionada
          <br />
          por quem vive o próximo.
        </h2>
        <p>
          Novas perspectivas, artistas independentes e obras que vão além da
          tela.
        </p>
        <a href="#mercado" className="btn btn-outline">
          Descobrir coleções <ArrowDown size={16} />
        </a>
      </section>
    </>
  );
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
    <>
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
          <img
            className="detail-art"
            src={nft.images[image] || nft.image}
            width="600"
            height="600"
            alt={nft.name}
            fetchPriority="high"
          />
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
    </>
  );
}
