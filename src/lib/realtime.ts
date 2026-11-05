import type { QueryClient } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'
import type { RealtimeEvent } from '../types'

export type ConnectionState = 'connecting' | 'connected' | 'reconnecting'
let connectionState: ConnectionState = 'connecting'
const connectionListeners = new Set<() => void>()

export const getConnectionState = () => connectionState
export function subscribeConnection(listener: () => void) {
  connectionListeners.add(listener)
  return () => { connectionListeners.delete(listener) }
}
function setConnection(state: ConnectionState) {
  connectionState = state
  connectionListeners.forEach(listener => listener())
}

/** Import only after MSW has patched WebSocket; Socket.IO captures it at import time. */
export function startRealtime(queryClient: QueryClient, userId: string | null, onNotice?: (message: string) => void) {
  let disposed = false
  let socket: Socket | undefined
  const seen = new Set<string>()
  const versions = new Map<string, number>()
  const terminalOrders = new Set<string>()
  const reconcile = () => {
    for (const key of ['nfts', 'nft', 'cart', 'quote', 'order']) {
      void queryClient.invalidateQueries({ queryKey: [key] })
    }
  }
  const receive = (event: RealtimeEvent) => {
    if (disposed || !event || typeof event.id !== 'string' || !Number.isInteger(event.version)) return
    if (event.type === 'order.updated' && (!userId || event.userId !== userId)) return
    if (event.type !== 'nft.updated' && event.type !== 'order.updated') return
    const resource = `${event.type}:${event.resourceId}`
    if (seen.has(event.id) || event.version <= (versions.get(resource) ?? -1)) return
    // Terminal orders never return to pending, even if an invalid newer event arrives.
    if (event.type === 'order.updated' && terminalOrders.has(resource)) return
    seen.add(event.id)
    versions.set(resource, event.version)
    if (seen.size > 1000) seen.delete(seen.values().next().value!)
    if (event.type === 'nft.updated') {
      for (const key of ['nfts', 'nft', 'cart', 'quote']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      onNotice?.('Preço ou disponibilidade atualizado. Revise os valores antes de comprar.')
    } else {
      const status = 'status' in event.data ? event.data.status : undefined
      if (status === 'confirmed' || status === 'refused') terminalOrders.add(resource)
      for (const key of ['order', 'cart', 'quote']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      onNotice?.(status === 'confirmed' ? 'Pagamento confirmado.' : status === 'refused' ? 'Pagamento recusado. Seus itens continuam no carrinho.' : 'Pedido em processamento.')
    }
  }
  setConnection('connecting')
  void import('socket.io-client').then(({ io }) => {
    if (disposed) return
    socket = io(window.location.origin, {
      path: '/socket.io/',
      transports: ['websocket'],
      query: { userId: userId ?? 'visitor' },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
      randomizationFactor: 0,
    })
    socket.on('connect', () => {
      if (disposed) return
      setConnection('connected')
      reconcile()
    })
    socket.on('disconnect', () => { if (!disposed) setConnection('reconnecting') })
    socket.on('connect_error', () => { if (!disposed) setConnection('reconnecting') })
    socket.on('nft.updated', receive)
    socket.on('order.updated', receive)
    socket.connect()
  }).catch(() => { if (!disposed) setConnection('reconnecting') })

  return () => {
    disposed = true
    socket?.removeAllListeners()
    socket?.disconnect()
    seen.clear()
    versions.clear()
    terminalOrders.clear()
  }
}
