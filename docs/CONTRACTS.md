# REST and realtime contracts

All application requests use the Axios client with `/api` as the base URL. MSW intercepts these requests in development, preview, tests, and the published demonstration when `VITE_ENABLE_MOCKS=true`. JSON responses use the interfaces in `src/types.ts`. No blockchain or payment gateway is contacted.

## Shared conventions

- ETH amounts are decimal **strings**. Quote arithmetic converts them to 18-decimal integer wei with `BigInt`; quantities and stock are integers.
- Errors have `{ code, message, fields? }`. `fields` maps form field names to validation messages. Status codes include 400 (malformed JSON), 401 (invalid session/credentials), 403 (another user's resource), 404 (missing resource), 409 (conflict), 422 (validation), and 503 (transient failure).
- The simulated server persists its database in browser storage. Its one-hour session records an account ID and expiry. Passwords are salted SHA-256 hashes for these fictional accounts; this local demonstration is not a production security boundary.
- Public resources: catalog, NFT detail, visitor cart, quotes, and demonstration controls. Favorites, profile, wallets, checkout, and orders require a session. Private queries include the account ID in their cache keys.

## Endpoints

| Method        | Resource                   | Request                                                                                                        | Response / behavior                                                                                                               |
| ------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| GET           | `/nfts`                    | Query: `q`, `category`, `collection`, `sort`, `page`, `pageSize`; optional `minPrice`, `maxPrice`, `available` | `PageResult<Nft>`; defaults to page 1, 8 items; filters compose before sorting/pagination.                                        |
| GET           | `/nfts/:id`                | Stable NFT ID (`1`–`24` in the default fixture)                                                                | `Nft`; includes images, editions, decimal prices, stock and version.                                                              |
| GET           | `/session`                 | —                                                                                                              | `{ user: User \| null }`; expired sessions resolve to null.                                                                       |
| POST          | `/session`                 | `{ email, password }`                                                                                          | `{ user }`; merges visitor quantities into the account cart, limited to stock.                                                    |
| DELETE        | `/session`                 | —                                                                                                              | `{ user: null }`; terminates subscriptions from the former session.                                                               |
| POST          | `/register`                | `{ name, email, password, confirmPassword }`                                                                   | 201 `{ user }`, creates session; duplicate email is 409.                                                                          |
| GET / PATCH   | `/profile`                 | PATCH `{ name, email, bio, avatar }`                                                                           | `User`; avatar accepts local assets or supported image data URLs up to 2 MB.                                                      |
| PUT           | `/profile/password`        | `{ currentPassword, newPassword, confirmPassword }`                                                            | `{ message }`; validates the existing password and strength.                                                                      |
| GET           | `/wallets`                 | —                                                                                                              | `Wallet[]`, scoped to the account.                                                                                                |
| POST / PATCH  | `/wallets`, `/wallets/:id` | `{ name, address, network, primary }`                                                                          | `Wallet`; hexadecimal `0x` address, Ethereum/Polygon; one primary wallet per account.                                             |
| GET           | `/favorites`               | —                                                                                                              | NFT ID array for the account.                                                                                                     |
| POST / DELETE | `/favorites/:id`           | —                                                                                                              | Updated ID array. UI changes optimistically and rolls back on failure.                                                            |
| GET           | `/cart`                    | —                                                                                                              | `Cart`, with live NFT and edition snapshots; visitor and account carts are separate.                                              |
| POST          | `/cart/items`              | `{ nftId, editionId, quantity }`                                                                               | Updated `Cart`; adds quantity to an existing edition.                                                                             |
| PATCH         | `/cart/items/:id`          | `{ quantity }`                                                                                                 | Updated `Cart`; replaces quantity, checks integer/stock limits.                                                                   |
| DELETE        | `/cart/items/:id`          | —                                                                                                              | Updated `Cart`; item IDs have form `nftId:editionId`.                                                                             |
| POST          | `/quote`                   | `{ coupon?: string }`                                                                                          | `Quote`; server-calculated items, subtotal, discount, network fee, total, fingerprint, and expiry. Empty coupon removes discount. |
| POST          | `/orders`                  | Header `Idempotency-Key`; `{ quoteId, walletId, network, collector: { name, email } }`                         | 201 `Order` initially pending; revalidates session, quote, stock, wallet and network.                                             |
| GET           | `/orders/:id`              | —                                                                                                              | Account-owned `Order`; settles due pending outcomes and returns the immutable purchase snapshot.                                  |
| GET           | `/orders?key=…`            | Original idempotency key                                                                                       | Recovers the same order after response loss. Without a key, lists this account's orders.                                          |

`JUNGLE10` applies a 10% discount; `EXPIRED` produces an expired-coupon error. Other codes are invalid. Network fees are included in the server quote and receipt.

Quotes expire after five minutes. The server compares the submitted quote's fingerprint with a newly calculated quote. Changed price, quantity, availability, fee, or coupon requires another review. The client preserves the idempotency key during retries. A repeated key and payload returns the original order; a repeated key with a different payload returns 409. Keys are scoped to the account.

Pending orders become `confirmed` or `refused`; both terminal states are irreversible. Confirmation decrements stock and subtracts only purchased quantities from the purchaser's cart. Refusal preserves the cart. Receipt values come from the order's quote snapshot and do not change when catalog prices change.

## Socket.IO

The browser uses `socket.io-client`, the default namespace, `/socket.io/`, and the WebSocket transport. MSW intercepts the WebSocket and `@mswjs/socket.io-binding` performs the Engine.IO handshake and Socket.IO packet encoding. The client library is imported **after** the worker starts so it captures the intercepted WebSocket implementation.

Both event names carry a `RealtimeEvent` envelope:

```ts
{
  id: string             // stable event identity
  type: 'nft.updated' | 'order.updated'
  resourceId: string
  version: number        // monotonically increasing per resource
  userId?: string        // mandatory for private order events
  data: Nft | Order
}
```

`nft.updated` invalidates active catalog, detail, cart, and quote queries. `order.updated` invalidates order, cart, and quote queries. The REST API remains the source of truth. The UI announces changes through an accessible live region. Duplicate IDs and resource versions at or below the last accepted version are discarded. Terminal order events cannot regress to pending. Each session creates its own socket, listeners, deduplication set and resource-version map; cleanup disconnects the old socket. The mock stream verifies the requested account against the simulated server session and filters private events again at delivery.

After connection or reconnection, active queries are reconciled with REST. Pending orders also support REST recovery after refresh, so missing an event does not create a second purchase.

Mock limitations: the binding supports the default namespace and text events. There is no polling fallback, binary upload transport, acknowledgements, rooms, real external server, or blockchain connection. Avatar uploads use the REST profile payload. This preserves the required actual Socket.IO client path while keeping the demonstration independently executable.

## Deterministic demonstration controls

`GET /demo` returns `{ scenario, latency, connected, seed }`. `DELETE /demo` resets all accounts, hashes, sessions, carts, NFTs, quotes, orders, idempotency attempts and event state. `PATCH /demo` accepts a scenario and/or action; this endpoint bypasses simulated latency/errors so recovery is always possible.

Scenarios: `success`, `empty`, `slow`, `out-of-order`, `offline`, `server-error`, `unauthorized`, `favorite-error`, `validation-error`, `price-change`, `sold-out`, `order-timeout`, `payment-refused`, `pending`.

| PATCH payload                                                   | Effect                                                                                     |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `{ scenario: 'slow', latency: 2500 }`                           | Delays requests to expose skeletons.                                                       |
| `{ scenario: 'out-of-order' }`                                  | Short searches resolve after longer searches; abort signals prevent stale results.         |
| `{ action: 'expire-session' }`                                  | Expires the current session while preserving cart and checkout context.                    |
| `{ action: 'update-nft', nftId: '1', price: '0.99', stock: 2 }` | Persists catalog changes and emits an encoded Socket.IO event.                             |
| `{ action: 'replay-event', old: false }`                        | Replays the last event with the same identity/version. `old: true` emits an older version. |
| `{ action: 'disconnect' }` / `{ action: 'reconnect' }`          | Interrupts the socket transport and permits automatic reconnection.                        |
| `{ action: 'settle-orders' }`                                   | Makes pending outcomes due immediately for deterministic tests.                            |

Default fictional accounts: `alex@example.com` and `sofia@example.com`, password `Jungle123!`. Each account starts with an independent Ethereum wallet.
