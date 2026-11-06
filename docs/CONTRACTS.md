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
| POST          | `/register`                | `{ name, username, email, password, confirmPassword? }`                                                        | 201 `{ user }`, cria sessão; e-mail ou nome de usuário duplicado retorna 409.                                                     |
| GET / PATCH   | `/profile`                 | PATCH `{ name, username, email, ensName, walletNickname, bio, avatar }`                                        | `User`; avatar accepts local assets or supported image data URLs up to 2 MB; `avatar: ""` restaura o avatar padrão.               |
| PUT           | `/profile/password`        | `{ currentPassword, newPassword, confirmPassword? }`                                                           | `{ message }`; valida senha atual, força da nova senha e confirmação quando enviada.                                              |
| GET           | `/wallets`                 | —                                                                                                              | `Wallet[]`, scoped to the account.                                                                                                |
| POST / PATCH  | `/wallets`, `/wallets/:id` | Campos de `Wallet` abaixo, sem `id`                                                                            | `Wallet`; endereço hexadecimal `0x`, Ethereum/Polygon; uma carteira principal por conta.                                          |
| GET           | `/favorites`               | —                                                                                                              | NFT ID array for the account.                                                                                                     |
| POST / DELETE | `/favorites/:id`           | —                                                                                                              | Updated ID array. UI changes optimistically and rolls back on failure.                                                            |
| GET           | `/cart`                    | —                                                                                                              | `Cart`, with live NFT and edition snapshots; visitor and account carts are separate.                                              |
| POST          | `/cart/items`              | `{ nftId, editionId, quantity }`                                                                               | Updated `Cart`; adds quantity to an existing edition.                                                                             |
| PATCH         | `/cart/items/:id`          | `{ quantity }`                                                                                                 | Updated `Cart`; replaces quantity, checks integer/stock limits.                                                                   |
| DELETE        | `/cart/items/:id`          | —                                                                                                              | Updated `Cart`; item IDs have form `nftId:editionId`.                                                                             |
| POST          | `/quote`                   | `{ coupon?: string }`                                                                                          | `Quote`; server-calculated items, subtotal, discount, network fee, total, fingerprint, and expiry. Empty coupon removes discount. |
| POST          | `/orders`                  | Header `Idempotency-Key`; `{ quoteId, walletId, network, collector: Collector }`                               | 201 `Order` inicialmente pendente; revalida sessão, cotação, estoque, carteira, rede e dados do colecionador.                     |
| GET           | `/orders/:id`              | —                                                                                                              | Account-owned `Order`; settles due pending outcomes and returns the immutable purchase snapshot.                                  |
| GET           | `/orders?key=…`            | Original idempotency key                                                                                       | Recovers the same order after response loss. Without a key, lists this account's orders.                                          |

## Dados de perfil, carteira e colecionador

Os contratos atuais são os de `src/types.ts`. Os campos de texto são aparados antes de persistir; e-mail, nome de usuário e ENS são salvos em minúsculas. `User.name` continua sendo o nome de exibição, distinto de `username`.

| Contrato    | Campos                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`      | `id`, `name`, `username`, `email`, `ensName`, `walletNickname`, `avatar`, `bio`: strings.                                                                                                                                                                     |
| `Wallet`    | `id`, `name`, `nickname`, `profileName`, `address`, `referralCode`, `email`, `ensName`: strings; `type: WalletType`; `network: Network`; `primary: boolean`; `secondaryAddress?: string`. `name` é o nome de exibição da carteira e `nickname` é seu apelido. |
| `Collector` | `name`, `username`, `email`, `profileName`, `referralCode`, `ensName`: strings; `walletType: WalletType`; `secondaryAddress?: string`; `note?: string`. Esses dados são copiados para o pedido.                                                               |

`Network` aceita `Ethereum` ou `Polygon`. `WalletType` aceita `MetaMask`, `Coinbase Wallet` ou `WalletConnect`. Os campos de identidade de `User`, `Wallet` e `Collector` são obrigatórios; `bio` pode ficar vazio, o avatar possui valor padrão e `secondaryAddress` e `note` são opcionais. Ao cadastrar uma carteira, `primary` pode ser omitido: a primeira se torna principal e a conta sempre mantém uma principal.

Validações aplicadas pela API:

- `name` de perfil/colecionador e `profileName`: entre 2 e 80 caracteres; `Wallet.name`: entre 1 e 60.
- `username`: entre 3 e 30 caracteres, começa com letra ou número e aceita letras, números, `_` e `-` (`^[a-z0-9][a-z0-9_-]{2,29}$`, sem diferenciar maiúsculas).
- `nickname` e `walletNickname`: entre 1 e 60 caracteres; `referralCode`: entre 1 e 32 letras, números, `_` ou `-`.
- `email`: formato de e-mail e até 254 caracteres. `ensName`: nome simulado terminado em `.eth`, com slug de 3 a 63 caracteres; começa e termina com letra ou número e aceita hífen no interior. Não há consulta a um registro ENS real.
- `address`: `0x` seguido de 40 caracteres hexadecimais. `secondaryAddress`, quando preenchido, aceita esse endereço ou um ENS no formato acima.
- `bio` e `note`: até 280 caracteres. A senha exige ao menos oito caracteres, incluindo letra e número; a confirmação, quando enviada, precisa coincidir.

O cadastro exige `name`, `username`, `email` e `password`; cria um ENS válido com sufixo do identificador e o apelido inicial `Main wallet`. Os demais dados do perfil podem ser editados depois. Conflitos retornam 409 com `EMAIL_CONFLICT`, `USERNAME_CONFLICT` ou `ENS_CONFLICT` e `fields` para todos os campos conflitantes. Carteira repetida na mesma rede retorna `WALLET_CONFLICT`, com `fields.address`.

No checkout, a carteira precisa pertencer à conta e `network` deve coincidir com a rede cadastrada. `collector.walletType` deve ser igual a `Wallet.type`: divergência retorna 422 `WALLET_TYPE_MISMATCH`, com `fields.walletType`. Seleção ausente retorna `fields.walletId`; rede divergente retorna `fields.network`. As validações do colecionador usam chaves diretas em `fields` (`username`, `ensName`, `profileName` etc.), permitindo associar cada erro ao campo correspondente.

## Disponibilidade e filtros

`Nft.stock` é a soma de `stock` de todas as edições. Fixtures, atualização do catálogo, migração e confirmação de compra mantêm esse agregado. O filtro `available=true` e o selo do cartão usam essa disponibilidade: uma edição padrão zerada não esgota o NFT se a edição rara ainda possui unidades. Inclusão, alteração, cotação e compra validam o estoque da edição escolhida.

Após queda de estoque, diminuir a quantidade no carrinho ajusta diretamente ao limite disponível quando a quantidade atual excede esse limite (por exemplo, de oito para duas unidades). Com estoque zero, o item exige remoção explícita; uma alteração de quantidade não remove silenciosamente o item.

`minPrice` e `maxPrice` são limites inclusivos de `Nft.price`, enviados como strings decimais em ETH. Ambos fazem parte da URL do catálogo, junto com busca, filtros, ordenação e página. Alterar um filtro reinicia a página; refresh e histórico preservam os limites. A API aceita até 18 casas decimais e retorna 422 para um limite inválido.

## Compatibilidade da base persistida

A chave do navegador continua sendo `jungle-demo-v1`, agora com `schemaVersion: 2` dentro da base. Na inicialização, bases anteriores recebem os novos campos de conta/carteira e têm o estoque agregado dos NFTs recalculado. A migração preserva sessão, carrinhos, favoritos, hashes de senha, cotações, pedidos e referências idempotentes.

Snapshots de `quote`, `wallet` e `collector` em pedidos legados não são enriquecidos com dados atuais nem valores inventados. Por isso, recibos antigos podem não ter os novos campos; a interface exibe esses detalhes somente quando presentes. Novos pedidos exigem o contrato completo de `Collector` e armazenam cópias dos dados validados.

## Cotações e pedidos

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
| `{ action: 'update-nft', nftId: '1', price: '0.99', stock: 2 }` | Atualiza preço/estoque da edição padrão, recalcula `Nft.stock` e emite o evento Socket.IO. |
| `{ action: 'replay-event', old: false }`                        | Replays the last event with the same identity/version. `old: true` emits an older version. |
| `{ action: 'disconnect' }` / `{ action: 'reconnect' }`          | Interrupts the socket transport and permits automatic reconnection.                        |
| `{ action: 'settle-orders' }`                                   | Makes pending outcomes due immediately for deterministic tests.                            |

Default fictional accounts: `alex@example.com` and `sofia@example.com`, password `Jungle123!`. Each account starts with an independent Ethereum wallet.
