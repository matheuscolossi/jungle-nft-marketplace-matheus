# Arquitetura e decisões

## Responsabilidades

A interface usa React e TypeScript. TanStack Router controla navegação, parâmetros de busca e acesso aos fluxos privados. TanStack Query controla consultas, mutations, invalidação e atualização em segundo plano. Todas as chamadas REST passam pela instância Axios de `src/lib/api.ts`.

Tailwind CSS compõe a base de estilos. O componente Button segue a estrutura shadcn/ui, com Radix Slot e `class-variance-authority`; diálogos usam Radix Dialog para foco, Escape e retorno do foco ao gatilho. A aparência adapta esses componentes à identidade KURIO.

`src/types.ts` reúne os contratos de transporte. `src/mocks/handlers.ts` contém o limite HTTP; `src/mocks/database.ts` concentra regras de negócio e persistência; `fixtures.ts` define o cenário inicial. A interface não importa fixtures nem altera diretamente a base simulada.

O módulo da aplicação e a inicialização do MSW carregam em paralelo; a montagem do React aguarda ambos com `Promise.all`, mantendo as primeiras consultas HTTP depois de o worker estar pronto. O cliente Socket.IO é importado somente após a interceptação de WebSocket estar ativa, pois ele captura o construtor WebSocket ao carregar. `src/mocks/socket.ts` usa a integração `@mswjs/socket.io-binding` para que os eventos passem pelo protocolo Socket.IO e pelo cliente real.

As páginas de autenticação, perfil, carteiras e pagamento usam React.lazy sob Suspense. O carregamento inicial mantém MSW pronto antes da montagem; os chunks sob demanda não alteram essa ordem. No detalhe, skeleton e conteúdo têm chaves distintas e o contêiner cria um bloco de formatação estável, evitando reaproveitamento de nós em posições diferentes e colapso das margens. A medição final registrou CLS zero nos quatro grupos.

As edições do detalhe são opções de rádio com disponibilidade da API. O recibo confirmado apresenta os metadados e itens em tabela; dados completos do colecionador ficam em details e continuam vindo exclusivamente do snapshot. O diálogo de transação explica a referência simulada e devolve o foco ao gatilho. Nenhuma alteração de composição muda o contrato de compra.

## Persistência e sessão

A simulação persiste uma base versionada na chave `jungle-demo-v1` do localStorage. Ela inclui catálogo, contas, favoritos, carteiras, carrinhos, cotações, pedidos e referências idempotentes. O reset reconstrói toda a base a partir das fixtures. O controle visual também remove os rascunhos de checkout da sessão e recarrega o início, restaurando caches e deduplicação dos eventos. Cada contexto de navegador começa isolado nos testes.

A versão atual usa `schemaVersion: 3` dentro dessa mesma chave. Bases anteriores à versão 2 recebem os novos dados de conta/carteira e têm o estoque agregado recalculado. A passagem para a versão 3 altera somente `image` e `images` dos NFTs conhecidos, usando as artes originais do Figma; preserva preços, estoques, versões, sessão, carrinhos, favoritos, hashes, cotações, pedidos e referências idempotentes. Snapshots legados permanecem intactos: não se atribuem dados ou imagens atuais a uma compra antiga. O recibo apresenta os novos campos apenas quando eles existem no snapshot, e os assets antigos continuam disponíveis para essas compras.

A sessão mantém o identificador da conta e expiração de uma hora. A API recupera a conta na inicialização; recursos privados verificam a sessão em cada operação. Respostas 401 encerram a sessão na interface. Login preserva o destino anterior por uma URL de retorno local; destinos externos e protocolos relativos não são aceitos.

Logout/troca de usuário limpam o cache privado e encerram os listeners da sessão anterior. Catálogo e detalhes públicos permanecem no cache para não interromper consultas ativas durante a recuperação da sessão. Chaves de consultas privadas incluem a identidade do usuário. Pedidos também verificam autoria no handler: possuir um identificador de pedido de outra conta não concede acesso.

Senhas não são persistidas em claro: a base guarda SHA-256 com salt fixo de demonstração. Este mecanismo cumpre a simulação local, não representa autenticação de produção. Não há servidor de identidade, cookies seguros ou segredo externo. Dados fictícios são parte do contrato da demonstração.

## Carrinho e precisão

O visitante e cada conta têm carrinhos separados. O login combina os itens pela dupla NFT/edição, soma quantidades até o estoque permitido e limpa o carrinho do visitante. Sair de uma conta não expõe o carrinho dela ao próximo usuário.

Quantidades são inteiros seguros positivos. Estoque e edição são validados no handler a cada inclusão/alteração e novamente ao cotar/finalizar. Remoção é uma operação explícita. O carrinho persiste após atualizar a página.

`Nft.stock` soma o estoque de todas as edições, por meio de `src/lib/availability.ts`. Fixtures, migração, alteração de catálogo e liquidação de pedidos mantêm esse valor. O cartão e o filtro de disponíveis também consideram todas as edições: estoque zero da edição padrão não esgota uma edição rara ainda comprável. A compra continua limitada ao estoque da edição selecionada. Se o estoque cair de oito para duas unidades, o controle de diminuir ajusta diretamente para duas; se cair para zero, os controles de quantidade ficam bloqueados e a remoção continua explícita.

Valores ETH são strings decimais no transporte. `src/lib/money.ts` converte para wei com `bigint` para soma, multiplicação, desconto e taxa; a interface não calcula o valor a pagar com ponto flutuante. O desconto JUNGLE10 corresponde a 10% do subtotal, com arredondamento para baixo em wei, e a taxa simulada é `0.0025 ETH` em carrinho não vazio.

A cotação retornada pela API contém itens e preços, subtotal, desconto, taxa, total, cupom, expiração e uma impressão dos dados relevantes. Ela é a referência para o pagamento; preços mostrados anteriormente no catálogo não autorizam um pedido.

## Cache, concorrência e recuperação

As consultas permanecem frescas por 20 segundos e em memória por cinco minutos sem observadores. Há uma nova tentativa automática para falha de conexão ou HTTP 5xx, nenhuma para 4xx. Foco da janela refaz consultas obsoletas. Mutations não têm retry automático.

As chaves do catálogo incluem todos os parâmetros de busca/filtro/ordenação/página. A consulta de catálogo encaminha o AbortSignal ao Axios; respostas de uma consulta antiga não substituem uma chave mais recente. Alterar filtro reinicia a página. O Router mantém os parâmetros na URL, incluindo os limites inclusivos `minPrice` e `maxPrice` em ETH, permitindo refresh e voltar/avançar. Ambos são enviados à API como strings decimais; a API valida o formato e compara valores em wei.

As abas do catálogo alteram a mesma ordenação enviada à API: todos os NFTs usam `featured`, novos lançamentos usam `newest` e “Em alta” usa `popular`, ordenado por `Nft.likes` decrescente. O catálogo expõe as quatro categorias e as coleções realmente presentes nas fixtures. Seus NFTs representam Ethereum; a indicação de rede não finge oferecer um filtro para redes sem dados. As redes Ethereum e Polygon continuam disponíveis para o cadastro e a seleção de carteiras simuladas.

Favoritos usam atualização otimista, guardam o valor anterior e restauram esse valor em caso de falha. Após uma mutation confirmada, as consultas afetadas são invalidadas para reconciliar com a API. Skeletons preservam o espaço do catálogo, detalhe e resumo; a animação respeita `prefers-reduced-motion`.

## Pedido e idempotência

O envio inclui `Idempotency-Key`. A chave é escopada por usuário e associada ao conteúdo da tentativa. Reenviar o mesmo conteúdo recupera o mesmo pedido; reutilizá-la com conteúdo diferente retorna 409. Um timeout após a criação é recuperável pela chave ou pelo identificador do pedido, sem uma segunda cobrança simulada.

Antes de criar o pedido, a API confere a sessão, carteira, rede, dados do colecionador, cupom, estoque, preços, taxa e validade da cotação. Uma mudança invalida a revisão anterior e exige nova confirmação. A UI bloqueia envio enquanto há mutation em andamento; a idempotência protege também reenvios após falhas de comunicação.

A carteira deve pertencer à conta, a rede enviada precisa coincidir com a cadastrada e `collector.walletType` precisa ser igual a `Wallet.type`. Um tipo divergente retorna 422 `WALLET_TYPE_MISMATCH`, com `fields.walletType`. As validações devolvem chaves diretas do formulário em `fields`, incluindo `walletId`, `network`, `username`, `profileName` e `ensName`, para associação acessível das mensagens.

Pedidos começam `pending` e avançam para `confirmed` ou `refused`. Esses estados finais são terminais. O recibo só aparece como compra concluída após `confirmed`, e reproduz uma cópia da cotação, carteira e dados do pedido. Uma futura alteração de preço não modifica seu snapshot.

Na confirmação, a API baixa o estoque e remove apenas as quantidades compradas do carrinho. Uma recusa preserva os itens. Resultados pendentes também são processados ao consultar a API após refresh; o estado não depende exclusivamente de um timer em memória ou de um evento recebido enquanto a tela estava aberta.

## Dados de conta e carteira

`User` contém `id`, `name`, `username`, `email`, `ensName`, `walletNickname`, `avatar` e `bio`. `name` continua sendo o nome de exibição; `username` é um identificador distinto. O cadastro exige nome de exibição, nome de usuário, e-mail e senha, cria um ENS simulado válido com sufixo do identificador e define o apelido inicial da carteira como `Main wallet`.

`Wallet` mantém `id`, `name`, `address`, `network` e `primary`, e acrescenta `nickname`, `profileName`, `type`, `referralCode`, `email`, `ensName` e `secondaryAddress?`. O nome de exibição e o apelido são campos distintos. `Collector` mantém `name` e `email`, e acrescenta `username`, `profileName`, `walletType`, `referralCode`, `ensName`, `secondaryAddress?` e `note?`. Novos pedidos persistem uma cópia dos dados validados do colecionador e da carteira escolhida.

Os campos de identidade são obrigatórios; carteira secundária e observação são opcionais. Nome de perfil/colecionador e nome do perfil da carteira usam de 2 a 80 caracteres; nome de exibição da carteira e apelidos, de 1 a 60. Nome de usuário usa de 3 a 30 letras, números, `_` ou `-` e começa com letra ou número. E-mail tem formato válido e até 254 caracteres. ENS usa um slug de 3 a 63 letras/números/hífens, começa e termina com letra ou número e termina em `.eth`; não há resolução ENS externa. Código de indicação usa de 1 a 32 letras, números, `_` ou `-`. Carteira secundária aceita ENS ou endereço `0x` válido, e observação aceita até 280 caracteres.

E-mail, nome de usuário e ENS são normalizados em minúsculas. Conflitos de perfil retornam 409 `EMAIL_CONFLICT`, `USERNAME_CONFLICT` ou `ENS_CONFLICT`, com as respectivas mensagens em `fields`. Repetir o endereço de uma carteira na mesma rede retorna 409 `WALLET_CONFLICT` com `fields.address`. A enumeração `WalletType` aceita `MetaMask`, `Coinbase Wallet` e `WalletConnect`; `Network` aceita `Ethereum` e `Polygon`.

## Contratos REST

Base: `/api`. JSON em ambos os sentidos. Erros retornam `{ code, message, fields? }`, com status 400 (JSON inválido), 401 (sessão inválida), 403 (pedido de outra conta), 404 (recurso ausente), 409 (conflito), 422 (validação) e 503 (falha transitória).

| Método e recurso         | Entrada                                                                                        | Saída                                     |
| ------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------- |
| `GET /nfts`              | `q`, `category`, `collection`, `sort`, `page`, `pageSize`, `minPrice`, `maxPrice`, `available` | `{ items, total, page, pageSize, pages }` |
| `GET /nfts/:id`          | Identificador                                                                                  | NFT, edições, estoque e versão            |
| `GET /session`           | —                                                                                              | `{ user: User \| null }`                  |
| `POST /session`          | `{ email, password }`                                                                          | `{ user }`                                |
| `DELETE /session`        | —                                                                                              | `{ user: null }`                          |
| `POST /register`         | `{ name, username, email, password, confirmPassword? }`                                        | `{ user }`, status 201                    |
| `GET /profile`           | Sessão                                                                                         | User                                      |
| `PATCH /profile`         | `{ name, username, email, ensName, walletNickname, bio, avatar }`                              | User atualizado                           |
| `PUT /profile/password`  | `{ currentPassword, newPassword, confirmPassword? }`                                           | `{ message }`                             |
| `GET /wallets`           | Sessão                                                                                         | Wallet[]                                  |
| `POST /wallets`          | Campos de Wallet descritos acima, sem `id`; `primary` pode ser omitido                         | Wallet                                    |
| `PATCH /wallets/:id`     | Mesmos campos                                                                                  | Wallet atualizada                         |
| `GET /favorites`         | Sessão                                                                                         | Identificadores dos NFTs favoritos        |
| `POST /favorites/:id`    | Sessão                                                                                         | Identificadores atualizados               |
| `DELETE /favorites/:id`  | Sessão                                                                                         | Identificadores atualizados               |
| `GET /cart`              | Visitante ou sessão                                                                            | `{ items, coupon, version }`              |
| `POST /cart/items`       | `{ nftId, editionId, quantity }`                                                               | Carrinho atualizado                       |
| `PATCH /cart/items/:id`  | `{ quantity }`                                                                                 | Carrinho atualizado                       |
| `DELETE /cart/items/:id` | Identificador do item                                                                          | Carrinho atualizado                       |
| `POST /quote`            | `{ coupon? }` (`""` remove)                                                                    | Quote completa                            |
| `POST /orders`           | `{ quoteId, walletId, network, collector: Collector }` + `Idempotency-Key`                     | Pedido, status 201                        |
| `GET /orders`            | `key?`                                                                                         | Pedidos da conta ou pedido da tentativa   |
| `GET /orders/:id`        | Sessão do proprietário                                                                         | Pedido e snapshot do recibo               |
| `GET /demo`              | —                                                                                              | Configuração atual                        |
| `PATCH /demo`            | `{ scenario?, latency?, action?, ... }`                                                        | Configuração atualizada                   |
| `DELETE /demo`           | —                                                                                              | Reset integral e configuração padrão      |

Ordenações aceitas: `featured`, `price-asc`, `price-desc`, `name`, `newest` e `popular` (curtidas decrescentes). Redes de carteira: `Ethereum` e `Polygon`. O endereço deve seguir `0x` mais 40 caracteres hexadecimais; há uma carteira principal por conta. Avatar aceita PNG/JPEG/WebP/GIF de até 2 MB na API e é persistido como data URL; `avatar: ""` restaura o padrão. A senha exige ao menos oito caracteres, incluindo letra e número, e a confirmação, quando enviada, deve coincidir.

Controles de demonstração: `expire-session`, `update-nft` (com `nftId`, `price?`, `stock?`), `replay-event` (com `old?`), `disconnect`, `reconnect` e `settle-orders`. `update-nft` altera a edição padrão e recalcula o estoque agregado antes de emitir o evento. Esses endpoints são controles da simulação, disponíveis no build de avaliação.

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

A [cópia do Figma fornecida para a revisão](https://www.figma.com/design/8OMEkRvebRuOLP9QeIJLf1/Frontend-Challenge--Copy-) ficou acessível pela integração oficial em 6 de novembro de 2026. Os contextos e screenshots dos frames orientam composição, proporções e slots das artes: início com hero, promoções e diário; detalhe; autenticação desktop sobre o catálogo e mobile independente; perfil; carteiras; pagamento e confirmação.

As quatro artes originais foram preservadas em PNG em `docs/figma-originals/`. A interface serve versões WebP de 800 × 800 px das mesmas imagens, junto aos SVGs originais em `public/assets/figma/`. A fonte identificada é Roboto Mono, servida localmente como WOFF2 variável de 32.796 bytes, com preload e `font-display: swap`. O HTML antecipa o download da imagem do hero nas rotas `/`, `/login` e `/register`, onde ela é usada, para não esperar a montagem do React. Não há dependência de URL temporário do Figma ou de fonte remota em execução. O inventário, a licença e a proveniência estão em [docs/ASSETS.md](docs/ASSETS.md). As quatro artes substitutas anteriores ficam disponíveis apenas para snapshots legados.

Busca visível, filtros com dados reais, seleção das carteiras cadastradas, estados assíncronos e validações são adaptações funcionais dos frames. Valores e contagens vêm da API simulada. A revisão não afirma igualdade pixel a pixel; baselines detectam regressões da própria implementação. CI e geração das referências usam Windows; diferenças de rasterização entre ambientes ainda devem ser consideradas.

Os formulários têm labels, mensagens associadas aos campos e feedback de erro. Mutations e atualizações em tempo real usam regiões de status. Diálogos controlam foco e podem ser fechados com Escape. Há estilos de foco visível, contraste e adaptação para movimento reduzido. Layouts reorganizam filtros, colunas, formulários e resumo de compra em mobile; perfil, carteiras e confirmação também se adaptam mesmo sem frame específico. As larguras de verificação previstas na suíte são 390, 768 e 1440 px; os resultados medidos ficam no registro de validação.

Container queries usam a largura efetiva do conteúdo, inclusive nas varreduras com CSS `zoom: 2`. Diálogos limitam a altura por porcentagem da área disponível para manter os controles alcançáveis. O fundo do catálogo na autenticação fica `inert` e oculto da árvore acessível; o formulário mantém o foco modal. O fechamento e a navegação auxiliar são bloqueados durante a autenticação pendente. Rascunhos de perfil não são substituídos por refetch enquanto estão em edição, e os campos ficam bloqueados até o salvamento terminar.

Conectar carteira, recusar conexão, desconectar e pagar são simulações explícitas. Links de exploração não representam transações reais. Páginas editoriais, atividade, ofertas, suporte e downloads ficam fora do escopo; ações auxiliares não devem indicar um sucesso funcional inexistente.

Playwright e Lighthouse são executados sobre a mesma implementação e os mesmos handlers usados na demonstração. Condições, relatórios, baselines e limitações de verificação são registradas em `docs/VALIDATION.md` e `reports/` quando as execuções são concluídas; não se substitui evidência medida por metas declaradas.

A validação atual usa o código de aplicação `b3027e7`. A suíte lista 90 entradas, com 86 execuções e quatro skips intencionais. A execução completa concluiu **86 testes aprovados e quatro skips intencionais em 4,6 minutos**, sem atualização de snapshots; as oito referências visuais corresponderam. Os oito baselines foram regenerados; a execução visual concluiu quatro cenários. As 12 medições Lighthouse atingiram todas as metas pelas medianas: performance 90 mobile/99 desktop e 100 nas outras categorias, no início e no detalhe. O script termina com falha se uma mediana ficar abaixo da meta ou houver erro de execução. A [execução no GitHub Actions](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42211615877) passou em tipos, lint, build e **86 testes, com quatro skips intencionais em 9,6 minutos**. O commit `98b3ebf` mantém o código de aplicação `b3027e7` e altera somente o README. A publicação pública está disponível em [https://jungle-nft-marketplace-matheus.vercel.app](https://jungle-nft-marketplace-matheus.vercel.app). A conferência online está em `docs/VALIDATION.md`.
