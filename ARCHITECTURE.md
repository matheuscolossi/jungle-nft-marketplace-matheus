# Arquitetura e decisões

## Responsabilidades

A interface usa React e TypeScript. TanStack Router controla navegação, parâmetros de busca e acesso aos fluxos privados. TanStack Query controla consultas, mutations, invalidação e atualização em segundo plano. Todas as chamadas REST passam pela instância Axios de `src/lib/api.ts`.

Tailwind CSS compõe a base de estilos. O componente Button segue a estrutura shadcn/ui, com Radix Slot e `class-variance-authority`; diálogos usam Radix Dialog para foco, Escape e retorno do foco ao gatilho. A aparência adapta esses componentes à identidade KURIO.

`src/types.ts` reúne os contratos de transporte. `src/mocks/handlers.ts` contém o limite HTTP; `src/mocks/database.ts` concentra regras de negócio e persistência; `fixtures.ts` define o cenário inicial. A interface não importa fixtures nem altera diretamente a base simulada.

MSW inicia antes da aplicação. O cliente Socket.IO é importado somente após a interceptação de WebSocket estar ativa, pois ele captura o construtor WebSocket ao carregar. `src/mocks/socket.ts` usa a integração `@mswjs/socket.io-binding` para que os eventos passem pelo protocolo Socket.IO e pelo cliente real.

## Persistência e sessão

A simulação persiste uma base versionada na chave `jungle-demo-v1` do localStorage. Ela inclui catálogo, contas, favoritos, carteiras, carrinhos, cotações, pedidos e referências idempotentes. O reset reconstrói toda a base a partir das fixtures. O controle visual também remove os rascunhos de checkout da sessão e recarrega o início, restaurando caches e deduplicação dos eventos. Cada contexto de navegador começa isolado nos testes.

A sessão mantém o identificador da conta e expiração de uma hora. A API recupera a conta na inicialização; recursos privados verificam a sessão em cada operação. Respostas 401 encerram a sessão na interface. Login preserva o destino anterior por uma URL de retorno local; destinos externos e protocolos relativos não são aceitos.

Logout/troca de usuário limpam o cache privado e encerram os listeners da sessão anterior. Catálogo e detalhes públicos permanecem no cache para não interromper consultas ativas durante a recuperação da sessão. Chaves de consultas privadas incluem a identidade do usuário. Pedidos também verificam autoria no handler: possuir um identificador de pedido de outra conta não concede acesso.

Senhas não são persistidas em claro: a base guarda SHA-256 com salt fixo de demonstração. Este mecanismo cumpre a simulação local, não representa autenticação de produção. Não há servidor de identidade, cookies seguros ou segredo externo. Dados fictícios são parte do contrato da demonstração.

## Carrinho e precisão

O visitante e cada conta têm carrinhos separados. O login combina os itens pela dupla NFT/edição, soma quantidades até o estoque permitido e limpa o carrinho do visitante. Sair de uma conta não expõe o carrinho dela ao próximo usuário.

Quantidades são inteiros seguros positivos. Estoque e edição são validados no handler a cada inclusão/alteração e novamente ao cotar/finalizar. Remoção é uma operação explícita. O carrinho persiste após atualizar a página.

Valores ETH são strings decimais no transporte. `src/lib/money.ts` converte para wei com `bigint` para soma, multiplicação, desconto e taxa; a interface não calcula o valor a pagar com ponto flutuante. O desconto JUNGLE10 corresponde a 10% do subtotal, com arredondamento para baixo em wei, e a taxa simulada é `0.0025 ETH` em carrinho não vazio.

A cotação retornada pela API contém itens e preços, subtotal, desconto, taxa, total, cupom, expiração e uma impressão dos dados relevantes. Ela é a referência para o pagamento; preços mostrados anteriormente no catálogo não autorizam um pedido.

## Cache, concorrência e recuperação

As consultas permanecem frescas por 20 segundos e em memória por cinco minutos sem observadores. Há uma nova tentativa automática para falha de conexão ou HTTP 5xx, nenhuma para 4xx. Foco da janela refaz consultas obsoletas. Mutations não têm retry automático.

As chaves do catálogo incluem todos os parâmetros de busca/filtro/ordenação/página. Funções de consulta encaminham o AbortSignal ao Axios; respostas de uma consulta antiga não substituem uma chave mais recente. Alterar filtro reinicia a página. O Router mantém os parâmetros na URL, permitindo refresh e voltar/avançar.

Favoritos usam atualização otimista, guardam o valor anterior e restauram esse valor em caso de falha. Após uma mutation confirmada, as consultas afetadas são invalidadas para reconciliar com a API. Skeletons preservam o espaço do catálogo, detalhe e resumo; a animação respeita `prefers-reduced-motion`.

## Pedido e idempotência

O envio inclui `Idempotency-Key`. A chave é escopada por usuário e associada ao conteúdo da tentativa. Reenviar o mesmo conteúdo recupera o mesmo pedido; reutilizá-la com conteúdo diferente retorna 409. Um timeout após a criação é recuperável pela chave ou pelo identificador do pedido, sem uma segunda cobrança simulada.

Antes de criar o pedido, a API confere a sessão, carteira, rede, dados do colecionador, cupom, estoque, preços, taxa e validade da cotação. Uma mudança invalida a revisão anterior e exige nova confirmação. A UI bloqueia envio enquanto há mutation em andamento; a idempotência protege também reenvios após falhas de comunicação.

Pedidos começam `pending` e avançam para `confirmed` ou `refused`. Esses estados finais são terminais. O recibo só aparece como compra concluída após `confirmed`, e reproduz uma cópia da cotação, carteira e dados do pedido. Uma futura alteração de preço não modifica seu snapshot.

Na confirmação, a API baixa o estoque e remove apenas as quantidades compradas do carrinho. Uma recusa preserva os itens. Resultados pendentes também são processados ao consultar a API após refresh; o estado não depende exclusivamente de um timer em memória ou de um evento recebido enquanto a tela estava aberta.

## Contratos REST

Base: `/api`. JSON em ambos os sentidos. Erros retornam `{ code, message, fields? }`, com status 400 (JSON inválido), 401 (sessão inválida), 403 (pedido de outra conta), 404 (recurso ausente), 409 (conflito), 422 (validação) e 503 (falha transitória).

| Método e recurso         | Entrada                                                                                        | Saída                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `GET /nfts`              | `q`, `category`, `collection`, `sort`, `page`, `pageSize`, `minPrice`, `maxPrice`, `available` | `{ items, total, page, pageSize, pages }` |
| `GET /nfts/:id`          | Identificador                                                                                  | NFT, edições, estoque e versão            |
| `GET /session`           | —                                                                                              | `{ user: User \| null }`                  |
| `POST /session`          | `{ email, password }`                                                                          | `{ user }`                                |
| `DELETE /session`        | —                                                                                              | `{ user: null }`                          |
| `POST /register`         | `{ name, email, password, confirmPassword? }`                                                  | `{ user }`, status 201                    |
| `GET /profile`           | Sessão                                                                                         | User                                      |
| `PATCH /profile`         | `{ name, email, bio, avatar }`                                                                 | User atualizado                           |
| `PUT /profile/password`  | `{ currentPassword, newPassword }`                                                             | `{ message }`                             |
| `GET /wallets`           | Sessão                                                                                         | Wallet[]                                  |
| `POST /wallets`          | `{ name, address, network, primary }`                                                          | Wallet                                    |
| `PATCH /wallets/:id`     | Mesmos campos                                                                                  | Wallet atualizada                         |
| `GET /favorites`         | Sessão                                                                                         | Identificadores dos NFTs favoritos        |
| `POST /favorites/:id`    | Sessão                                                                                         | Identificadores atualizados               |
| `DELETE /favorites/:id`  | Sessão                                                                                         | Identificadores atualizados               |
| `GET /cart`              | Visitante ou sessão                                                                            | `{ items, coupon, version }`              |
| `POST /cart/items`       | `{ nftId, editionId, quantity }`                                                               | Carrinho atualizado                       |
| `PATCH /cart/items/:id`  | `{ quantity }`                                                                                 | Carrinho atualizado                       |
| `DELETE /cart/items/:id` | Identificador do item                                                                          | Carrinho atualizado                       |
| `POST /quote`            | `{ coupon? }` (`""` remove)                                                                    | Quote completa                            |
| `POST /orders`           | `{ quoteId, walletId, network, collector: { name, email } }` + `Idempotency-Key`               | Pedido, status 201                        |
| `GET /orders`            | `key?`                                                                                         | Pedidos da conta ou pedido da tentativa   |
| `GET /orders/:id`        | Sessão do proprietário                                                                         | Pedido e snapshot do recibo               |
| `GET /demo`              | —                                                                                              | Configuração atual                        |
| `PATCH /demo`            | `{ scenario?, latency?, action?, ... }`                                                        | Configuração atualizada                   |
| `DELETE /demo`           | —                                                                                              | Reset integral e configuração padrão      |

Ordenações aceitas: `featured`, `price-asc`, `price-desc`, `name`, `newest`. Redes: `Ethereum` e `Polygon`. O endereço da carteira deve seguir `0x` mais 40 caracteres hexadecimais; há uma carteira principal por conta. Avatar aceita arquivo local PNG/JPEG/WebP de até 2 MB e é persistido como data URL.

Controles de demonstração: `expire-session`, `update-nft` (com `nftId`, `price?`, `stock?`), `replay-event` (com `old?`), `disconnect`, `reconnect` e `settle-orders`. Esses endpoints são controles da simulação, disponíveis no build de avaliação.

## Eventos Socket.IO

Transporte: WebSocket, namespace padrão, caminho `/socket.io/`, mesma origem. A integração MSW traduz a conexão e os pacotes Socket.IO. Ela não substitui o cliente por callbacks de interface. As alterações no banco simulador alimentam simultaneamente as respostas REST e os eventos correspondentes.

Ambos os eventos usam `{ id, type, resourceId, version, userId?, data }`:

| Evento          | Dados e efeito                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `nft.updated`   | NFT completo. Invalida catálogo, detalhe, carrinho e cotação e anuncia alteração de preço/estoque.           |
| `order.updated` | Pedido completo e proprietário. Invalida pedido/carrinho/cotação e anuncia pendência, confirmação ou recusa. |

O cliente guarda identificadores recebidos e a última versão por recurso. Eventos duplicados ou com versão menor/igual são descartados. Pedidos terminais não retornam a pendente. Eventos privados são filtrados pelo usuário; encerramento da sessão desmonta o socket e seus listeners. Ao conectar/reconectar, recursos ativos são revalidados por REST para recuperar eventos perdidos.

O mock funciona dentro de uma aba e de seu armazenamento local. Não simula infraestrutura distribuída, broadcast entre dispositivos, polling HTTP do Engine.IO, perda de pacotes de rede física ou um servidor Socket.IO real. O transporte WebSocket é escolhido explicitamente para compatibilidade com a interceptação MSW. Os controles de desconexão exercitam o ciclo de reconexão do cliente e a reconciliação REST.

## Layout, acessibilidade e limites

O Figma foi inspecionado no navegador. A visualização anônima do canvas permitiu observar composição, paleta e telas, mas não extrair os arquivos originais. As quatro ilustrações finais foram geradas com o Imagegen integrado: Emerald Ape, Sage Nomad, Ivory Baron e Golden Beat, exportadas para WebP em 800 × 800 px. As 24 fixtures reutilizam essas quatro artes. O inventário e a proveniência estão em [docs/ASSETS.md](docs/ASSETS.md). Essa substituição e ajustes de conteúdo impedem afirmar correspondência pixel a pixel com as imagens originais.

A tipografia usa `Courier New` quando disponível e `monospace` como fallback local; não há requisição de fonte remota. Essa escolha também substitui a fonte do layout, que não foi extraída do arquivo. Baselines de regressão visual e CI usam Windows para manter as mesmas condições de fonte; diferenças entre sistemas operacionais precisam ser consideradas ao gerar novas referências.

Os formulários têm labels, mensagens associadas aos campos e feedback de erro. Mutations e atualizações em tempo real usam regiões de status. Diálogos controlam foco e podem ser fechados com Escape. Há estilos de foco visível, contraste e adaptação para movimento reduzido. Layouts reorganizam filtros, colunas, formulários e resumo de compra em mobile; perfil, carteiras e confirmação também se adaptam mesmo sem frame específico. As larguras de verificação previstas na suíte são 390, 768 e 1440 px; os resultados medidos ficam no registro de validação.

Conectar carteira, recusar conexão, desconectar e pagar são simulações explícitas. Links de exploração não representam transações reais. Páginas editoriais, atividade, ofertas, suporte e downloads ficam fora do escopo; ações auxiliares não devem indicar um sucesso funcional inexistente.

Playwright e Lighthouse são executados sobre a mesma implementação e os mesmos handlers usados na demonstração. Condições, relatórios, baselines e limitações de verificação são registradas em `docs/VALIDATION.md` e `reports/` quando as execuções são concluídas; não se substitui evidência medida por metas declaradas.
