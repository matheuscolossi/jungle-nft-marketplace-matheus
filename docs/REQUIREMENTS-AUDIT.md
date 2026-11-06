# Conferência dos requisitos — revisão de 6 de novembro de 2026

## Resultado da revisão

As correções funcionais da auditoria inicial estão implementadas: disponibilidade por edição, ajuste de quantidades após queda de estoque, campos de conta/carteira/pagamento, persistência, validação e associação dos erros aos campos. O código de aplicação validado nesta etapa é `b3027e7`; os checkpoints anteriores estão separados no registro de evidências.

Em 6 de novembro, a [cópia do Figma fornecida pelo usuário](https://www.figma.com/design/8OMEkRvebRuOLP9QeIJLf1/Frontend-Challenge--Copy-) permitiu consultar os contextos, screenshots, estilos e assets originais pela integração oficial. As artes, os SVGs e a família Roboto Mono identificada no layout agora integram a implementação. Início, autenticação, conta e pagamento tiveram a composição revista a partir desses contextos.

A suíte atual lista 90 entradas: 86 execuções e quatro skips intencionais. A execução completa concluiu **86 testes aprovados e quatro skips intencionais em 4,6 minutos**, sem atualização de snapshots; as oito referências visuais corresponderam. Os oito baselines foram regenerados, com 4/4 cenários visuais aprovados. As 12 medições Lighthouse concluíram todas as metas pelas medianas: performance 90 mobile/99 desktop em início/detalhe e 100 em acessibilidade, boas práticas e SEO. A [execução no GitHub Actions](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42211615877) passou em tipos, lint, build e **86 testes, com quatro skips intencionais em 9,6 minutos**. O commit `98b3ebf` mantém o código de aplicação `b3027e7` e altera somente o README.

Esta revisão compara os 12 tópicos do enunciado anexado com o código e os testes atuais. A publicação pública na Vercel foi conferida em https://jungle-nft-marketplace-matheus.vercel.app. Não se afirma atendimento integral, igualdade pixel a pixel nem uma nota presumida.

**Legenda:** “Implementado” descreve o código encontrado e não substitui o resultado da execução final. “Parcial” identifica uma diferença conhecida. “Pendente” indica uma condição de entrega ainda não cumprida. As evidências concluídas e suas condições ficam em [VALIDATION.md](VALIDATION.md).

## Conferência dos 12 tópicos

| Tópico | Situação atual | Implementação, evidência e limite |
| --- | --- | --- |
| **1. Escopo** | Implementado | Descoberta, compra e conta usam dados simulados, com telas desktop/mobile. Blockchain, extensões e gateways reais ficam fora do escopo. A composição foi revista pelos contextos do Figma, com as adaptações de interação descritas abaixo. |
| **2. Stack obrigatória** | Uso efetivo encontrado | React/TypeScript; TanStack Router; TanStack Query; Axios/REST; socket.io-client; Tailwind; Button no padrão shadcn/ui com Radix/CVA; Radix Dialog; MSW no HTTP/WebSocket; Playwright e Lighthouse. |
| **3. Telas e fluxos** | Implementados e verificados | Início, detalhe, carrinho, pagamento, confirmação, login, cadastro, perfil, carteiras e favoritos. URL preserva busca/filtros/ordenação/página, incluindo preço mínimo/máximo e ordenação por popularidade. Compra usa cotação da API, revisão, conexão simulada, idempotência, estados e snapshot; conta tem persistência e retomada após expiração. |
| **4. Integração e estado** | Implementados | Contratos tipados, consultas por usuário/parâmetros, cancelamento de consultas obsoletas, invalidação, carregamento/vazio/erro/atualização, favoritos otimistas com rollback, acesso direto e rota inexistente. Rascunhos são preservados nos caminhos previstos. |
| **5. Contratos REST** | Atualizados | Recursos mínimos e erros estão em [CONTRACTS.md](CONTRACTS.md). Há validação por campo, sessão inválida, permissão, recurso ausente, conflito e falha transitória. A mesma chave recupera o pedido; conteúdo divergente retorna conflito. |
| **6. Mocking com MSW** | Implementado | Handlers na rede, 24 NFTs, duas contas, persistência, reset e cenários determinísticos de rede, sessão, validação, cupom, preço/estoque, timeout e pagamento. O schema 3 atualiza somente image/images do catálogo ao migrar uma base de versão 2, preservando os demais dados e snapshots. Mocks disponíveis no build. |
| **7. Tempo real Socket.IO** | Implementado; regressões ampliadas | nft.updated e order.updated passam pelo cliente Socket.IO e binding MSW. Identidade/versão evitam duplicação/regressão; reconexão reconcilia por REST. Sessões isolam eventos privados e encerram listeners. Há cenários de preço/estoque e retomada de pedido pendente. |
| **8. Interface, responsividade e acessibilidade** | Revista e verificada | Assets originais, Roboto Mono local, hero, catálogo, promoções, diário, autenticação desktop/mobile, conta e pagamento revistos a partir do Figma. Há labels, erros associados, skeletons, movimento reduzido, foco, anúncios e diálogos. Reflow considera a largura efetiva do conteúdo. Os oito baselines foram regenerados e quatro cenários visuais passaram. Acessibilidade Lighthouse teve mediana 100 nos quatro grupos. A execução completa atual está registrada no resultado acima. |
| **9. Testes Playwright** | 86 aprovados; quatro skips intencionais | A suíte lista 90 entradas: 86 execuções aprovadas e quatro skips intencionais das varreduras já exercitadas com dimensões explícitas. Além das regressões anteriores, inclui popularidade e migração das artes com preservação de dados e recibos. Oito baselines cobrem início/detalhe/carrinho/pagamento. Foram regenerados e os quatro cenários visuais passaram; a execução completa atual está registrada no resultado acima. |
| **10. Performance e Lighthouse** | Metas atendidas pelas medianas | Doze medições atuais, três por início/detalhe e mobile/desktop: performance 90 mobile/99 desktop; acessibilidade, boas práticas e SEO 100. HTML/JSON, ambiente, versões e LCP/CLS/TBT estão registrados. O script falha com erro de execução ou mediana abaixo da meta. A mediana mobile está no limite; condições publicadas podem diferir. |
| **11. Critérios de avaliação** | Sem pontuação presumida | Há uso real da stack e compra integrada à simulação. REST/MSW e Socket.IO participam dos testes. Os baselines foram revistos e a auditoria atingiu as metas. A execução E2E completa e a CI atuais estão no resultado acima. A publicação foi conferida nos mesmos fluxos. A avaliação final cabe aos avaliadores. |
| **12. Entrega** | Publicada e conferida | Código, lockfile, assets, mocks, fixtures, testes, CI/auditoria e documentação versionados; aplicação pública na Vercel, com acesso anônimo, refresh, sessão, mocks, eventos e compra conferidos. URL e resultado detalhado abaixo. |

## Correções da auditoria inicial

A auditoria de 5 de novembro avaliou bf3aa8401acb9886be969f2b7838ab6f04a08ccd. Seus defeitos e lacunas deram origem às seguintes alterações:

- **Estoque:** diminuir ajusta oito unidades diretamente para duas após queda de disponibilidade. Em zero, os controles bloqueiam a quantidade e a remoção permanece explícita. Cartão, filtro e banco somam as edições; o NFT 24 continua disponível quando restam três edições raras. Ver [availability.ts](../src/lib/availability.ts), [Shared.tsx](../src/components/Shared.tsx) e [audit.spec.ts](../tests/audit.spec.ts).
- **Perfil:** nome de usuário, ENS, apelido da carteira e remoção de avatar incluídos no modelo/formulário/validação. A leitura assíncrona respeita a última seleção/remoção; refetch não apaga rascunho editado e os campos bloqueiam durante salvamento.
- **Carteiras:** nome de exibição/apelido distintos, perfil, tipo, indicação, e-mail, ENS e endereço secundário opcional incluídos. Endereço/rede, conflitos, principal, persistência e foco continuam validados.
- **Pagamento/recibo:** novos dados do colecionador e observação opcional integram o snapshot. O tipo deve corresponder à carteira cadastrada. Recibos legados exibem apenas campos existentes, sem receber dados atuais inventados.
- **Erros/foco:** cupom e checkout associam aria-invalid/aria-describedby às mensagens; fields REST apontam para os controles. O foco vai ao primeiro erro após validar, sem saltar durante a digitação.
- **Cobertura:** testes acrescentam ordenação pelos preços exibidos, limites inclusivos, loaders de catálogo/resumo, offline/retry, carteira inválida/conflito, senhas curtas/divergentes, preservação de adições após snapshot, compra por teclado e telas carregadas em tablet/zoom.
- **Catálogo e compatibilidade:** o tab Em alta usa sort=popular, ordenado por likes decrescente na API. A migração para schema 3 substitui apenas os caminhos das artes do catálogo; preços, estoques, versões, sessão, carrinhos, favoritos, cotações, pedidos e tentativas idempotentes existentes permanecem preservados.

Contratos, migração, cache, sessão e decisões estão em [ARCHITECTURE.md](../ARCHITECTURE.md). A execução local atual concluiu os 86 testes sem falhas, incluindo as comparações visuais. A conferência no endereço final está registrada abaixo.

## Referência visual e adaptações de interação

O acesso necessário ao Figma foi resolvido pela cópia fornecida pelo usuário em 6 de novembro. Os PNG originais foram preservados em docs/figma-originals/; a interface serve derivados WebP de 800 × 800 px da mesma arte, otimizados para a página. Ícones, elementos decorativos e a ilustração do recibo vieram dos contextos dos frames. Roboto Mono é servida localmente em WOFF2, com sua licença. Inventário, proveniência e hashes estão em [ASSETS.md](ASSETS.md).

A composição atual inclui hero, catálogo, duas promoções e diário no início; catálogo ao fundo do formulário de autenticação em desktop e autenticação standalone em mobile; perfil, carteiras e pagamento reorganizados conforme os contextos. Os quatro WebP gerados na versão inicial não alimentam o catálogo atual: permanecem locais apenas para snapshots legados.

As adaptações explícitas são:

- A busca fica visível no catálogo, além do acionador no cabeçalho, para permitir a consulta exigida pelo enunciado.
- O catálogo oferece as quatro categorias reais das fixtures e as coleções disponíveis. As contagens vêm dos dados simulados; não reproduzem números estáticos do Figma.
- Os NFTs atuais pertencem à rede Ethereum. A indicação de rede descreve esses dados; não apresenta filtros de Polygon/Solana sem suporte como se estivessem operacionais. Carteiras e pagamento continuam aceitando Ethereum e Polygon conforme o contrato.
- IDs, nomes, preços, estoques e quantidades são dados da API simulada e variam nos cenários; não são valores fixos extraídos dos frames.
- Ações editoriais, sociais, suporte e outras funções fora do escopo ficam indisponíveis ou dão feedback coerente; não aparentam envio, autenticação externa ou sucesso funcional inexistente.

A presença dos assets originais e a revisão de composição não certificam igualdade pixel a pixel. Baselines comparam a implementação com suas próprias referências; foram regenerados após a revisão visual. As varreduras de 200% usam **CSS zoom: 2**, conforme [VALIDATION.md](VALIDATION.md), e não o menu de zoom do navegador.

## Evidência atual e checkpoints históricos

A execução dedicada de referências visuais concluiu **4/4 cenários em 14,6 segundos**, regenerando as oito imagens depois da revisão do Figma. A validação completa atual compara essas referências sem atualizá-las; seu resultado é registrado acima. As 12 medições Lighthouse atuais estão em [VALIDATION.md](VALIDATION.md) e [reports/lighthouse/README.md](../reports/lighthouse/README.md), com medianas e métricas por página/perfil. A [execução no GitHub Actions](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42211615877) passou em tipos, lint, build e **86 testes, com quatro skips intencionais em 9,6 minutos**. O commit `98b3ebf` mantém o código de aplicação `b3027e7` e altera somente o README.

Os checkpoints históricos foram: 54/54 testes em 5 de novembro; 82 aprovados/quatro skips antes do novo layout em 6 de novembro; e 86 aprovados/quatro skips, em 4,8 minutos, na primeira execução completa da revisão do Figma. O último ainda antecedeu os ajustes de carregamento e da promoção mobile. Esses resultados históricos não substituem a execução final atual.

Os relatórios versionados devem corresponder ao código entregue. A migração dos assets preserva snapshots e os baselines detectam regressões, sem representar certificação de igualdade pixel a pixel com o design. A conferência pública está registrada abaixo, separada da execução local.

## Publicação pública

A versão de produção está em [jungle-nft-marketplace-matheus.vercel.app](https://jungle-nft-marketplace-matheus.vercel.app), publicada a partir de `4e647fe` e acessível sem login da Vercel. A conferência online cobriu desktop/mobile, acesso direto e refresh, conta, compra, eventos e reconexão. A primeira rodada teve 84 aprovados, duas falhas de sincronização e quatro skips; os testes de retomada consultavam a API antes da inicialização do MSW após refresh. O teste passou a aguardar o recibo visível, e ambos passaram na repetição direcionada (18,3 s). A aplicação não precisou de alteração. Evidência: [validação pública](../reports/production-validation.txt).

O projeto contém `vercel.json` com fallback SPA/configuração do worker e `public/_redirects` para Netlify. O build é `npm run build`, saída `dist`, com mocks habilitados. As medições Lighthouse registradas continuam sendo as locais; não foi realizada nova auditoria Lighthouse pública.
