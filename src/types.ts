export type Decimal = string
export type Network = 'Ethereum' | 'Polygon'
export interface Edition { id: string; name: string; stock: number; price: Decimal }
export interface Nft {
  id: string; name: string; collection: string; creator: string; category: string;
  description: string; image: string; images: string[]; price: Decimal; stock: number;
  editions: Edition[]; version: number; featured: boolean; likes: number;
}
export interface User { id: string; name: string; email: string; avatar: string; bio: string }
export interface Wallet { id: string; name: string; address: string; network: Network; primary: boolean }
export interface CartItem { id: string; nftId: string; editionId: string; quantity: number; nft: Nft; edition: Edition }
export interface Cart { items: CartItem[]; coupon: string; version: number }
export interface QuoteItem { id: string; nftId: string; editionId: string; name: string; image: string; edition: string; quantity: number; unitPrice: Decimal; total: Decimal; version: number }
export interface Quote { id: string; fingerprint: string; items: QuoteItem[]; subtotal: Decimal; discount: Decimal; fee: Decimal; total: Decimal; coupon: string; expiresAt: number }
export interface Collector { name: string; email: string }
export type OrderStatus = 'pending' | 'confirmed' | 'refused'
export interface Order { id: string; userId: string; status: OrderStatus; quote: Quote; wallet: Wallet; network: Network; collector: Collector; transaction: string; createdAt: number; updatedAt: number; version: number; reason?: string }
export interface ApiError { code: string; message: string; fields?: Record<string, string> }
export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number; pages: number }
export type Scenario = 'success' | 'empty' | 'slow' | 'out-of-order' | 'offline' | 'server-error' | 'unauthorized' | 'favorite-error' | 'validation-error' | 'price-change' | 'sold-out' | 'order-timeout' | 'payment-refused' | 'pending'
export interface DemoState { scenario: Scenario; latency: number; connected: boolean; seed: number }
export interface RealtimeEvent { id: string; type: 'nft.updated' | 'order.updated'; resourceId: string; version: number; userId?: string; data: Nft | Order }
