import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, Minus, Plus } from 'lucide-react'
import { api, err } from '../lib/api'
import { useSession } from '../lib/session'
import type { Nft } from '../types'
import { Button } from './ui/button'

export const eth = (value: string) => `${value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')} ETH`
export function Skeleton({ detail = false }: { detail?: boolean }) { return <div role="status" aria-label="Carregando conteúdo" data-testid="skeleton" className={detail ? 'skeleton skeleton-detail' : 'skeleton skeleton-card'}><span className="sr-only">Carregando…</span></div> }
export function ErrorState({ error, retry }: { error: unknown; retry?: () => void }) { return <div className="empty" role="alert"><h2>Não foi possível carregar</h2><p>{err(error)}</p>{retry && <Button variant="outline" onClick={retry}>Tentar novamente</Button>}</div> }
export function Empty({ title = 'Nenhuma obra encontrada', text = 'Experimente outra busca ou ajuste os filtros.' }: { title?: string; text?: string }) { return <div className="empty"><h2>{title}</h2><p>{text}</p><Link to="/">Explorar o mercado →</Link></div> }
export function Quantity({ value, max, onChange, disabled = false }: { value: number; max: number; onChange: (v: number) => void; disabled?: boolean }) { return <div className="quantity"><Button type="button" size="icon" variant="ghost" aria-label="Diminuir quantidade" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}><Minus size={14} /></Button><output aria-label="Quantidade">{value}</output><Button type="button" size="icon" variant="ghost" aria-label="Aumentar quantidade" disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Plus size={14} /></Button></div> }
export function Favorite({ id }: { id: string }) {
  const { user } = useSession(), client = useQueryClient(), navigate = useNavigate()
  const key = ['favorites', user?.id]
  const favorites = useQuery({ queryKey: key, queryFn: async ({ signal }) => (await api.get<string[]>('/favorites', { signal })).data, enabled: !!user })
  const active = favorites.data?.includes(id) ?? false
  const mutation = useMutation({ mutationFn: async () => (await api[active ? 'delete' : 'post'](`/favorites/${id}`)).data as string[], onMutate: async () => { await client.cancelQueries({ queryKey: key }); const old = client.getQueryData<string[]>(key); client.setQueryData<string[]>(key, active ? old?.filter(x => x !== id) : [...(old ?? []), id]); return { old } }, onError: (_e, _v, context) => client.setQueryData(key, context?.old), onSuccess: data => client.setQueryData(key, data) })
  return <><Button data-testid="favorite" size="icon" variant="outline" aria-label={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'} aria-pressed={active} disabled={mutation.isPending} onClick={() => user ? mutation.mutate() : void navigate({ to: '/login', search: { redirect: location.pathname + location.search } })}><Heart size={17} fill={active ? 'currentColor' : 'none'} /></Button>{mutation.isError && <small role="alert" className="field-error">{err(mutation.error)}</small>}</>
}
export function NftCard({ nft, priority = false }: { nft: Nft; priority?: boolean }) { return <article className="nft-card" data-testid="nft-card"><div className="card-art"><Link to="/nft/$id" params={{ id: nft.id }} aria-label={`Ver ${nft.name}`}><img src={nft.image} alt={nft.name} width="400" height="400" loading={priority ? 'eager' : 'lazy'} /></Link><div className="card-favorite"><Favorite id={nft.id} /></div>{nft.stock === 0 && <span className="stock-badge">Esgotado</span>}</div><p className="eyebrow">{nft.collection}</p><h3><Link to="/nft/$id" params={{ id: nft.id }}>{nft.name}</Link></h3><div className="card-meta"><span>{eth(nft.price)}</span><span>{nft.stock} edições</span></div></article> }
export function Related() { const { data } = useQuery({ queryKey: ['nfts', 'related'], queryFn: async ({ signal }) => (await api.get<{ items: Nft[] }>('/nfts', { params: { pageSize: 4 }, signal })).data }); return <section className="related"><h2>Mais desta coleção <span>Arte que merece fazer parte da sua história.</span></h2><div className="related-grid">{data?.items.map(nft => <NftCard key={nft.id} nft={nft} />)}</div></section> }
