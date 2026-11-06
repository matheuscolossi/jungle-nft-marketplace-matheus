# Validação reproduzível

## Revisão atual — 6 de novembro de 2026

Código de aplicação: `5729059`. A revisão corrige os achados visuais de detalhe, recibo, início e autenticação, preservando os contratos e os snapshots. Conta e pagamento carregam sob demanda; skeleton e conteúdo possuem identidades distintas para evitar deslocamentos durante o carregamento.

Tipos, lint e build de produção passaram. A execução completa contra o preview otimizado `http://127.0.0.1:4181` terminou com **86 testes aprovados, quatro skips intencionais e zero falhas em 4,9 minutos**, sem atualizar snapshots. As oito referências visuais corresponderam. Os quatro skips são as entradas mobile duplicadas das varreduras que já definem explicitamente a largura no projeto desktop.

A geração de referências, realizada antes da verificação final, concluiu **4/4 cenários em 16,3 segundos**. Os oito baselines foram revisados; sete imagens mudaram e a referência mobile de pagamento permaneceu igual. A rodada direcionada de detalhe, cadastro e compra passou **6/6 em 21,5 segundos**. A execução completa posterior substitui esses checkpoints como evidência funcional da versão atual.

## Reproduzir

```sh
npm ci
npm run typecheck
npm run lint
npm run build
npm test
```

Sem `E2E_BASE_URL`, Playwright prepara o build e inicia o preview em `http://127.0.0.1:4173`. Com a variável definida, usa a origem existente e não recompila. É necessário reconstruir depois de alterar a aplicação. O navegador é o canal Google Chrome; se ausente, use `npx playwright install chrome`.

Comandos usados nesta revisão, com `E2E_BASE_URL=http://127.0.0.1:4181`:

```sh
npx playwright test --grep=baselines --update-snapshots=all --workers=2 --reporter=list --output=reports/visual-checks/baseline-generation
npx playwright test --workers=2 --output=reports/visual-checks/corrected-final
```

Atualize baselines somente depois de revisar a mudança visual. A execução final sempre omite atualizações. Os baselines detectam regressões da implementação; não certificam igualdade com o Figma.

O [relatório HTML](../reports/playwright/index.html) é substituído por execuções posteriores. Traces e screenshots de falhas ficam em `reports/test-results/`; abra um trace com `npx playwright show-trace caminho/trace.zip`. A evidência textual local está em [visual-corrections-validation.txt](../reports/visual-corrections-validation.txt).

## Cobertura

Cada teste usa contexto de navegador e base simulada isolados. A interface e os controles de cenários atravessam os handlers MSW; a suíte não chama setters da aplicação nem métodos do cache. Eventos usam o cliente Socket.IO real e o binding MSW.

- Busca, filtros compostos, limites inclusivos, preços exibidos, popularidade, paginação, histórico/refresh, vazio, cancelamento e respostas fora de ordem.
- Rotas diretas/inexistentes, galeria, seleção de edição, indisponibilidade, estoque agregado por edição, quantidades e queda de oito para duas unidades.
- Cadastro, login, retorno à rota privada, sessão recuperada/expirada, logout e isolamento entre contas.
- Favoritos otimistas com rollback, carrinho visitante/conta e merge, persistência, cupons e cálculo decimal preciso.
- Colecionador e carteira, erros REST associados aos campos, primeiro erro em foco, conexão simulada e revisão da cotação.
- Pagamento confirmado/recusado/pendente, cliques repetidos, perda da resposta, idempotência/conflito e permissão do pedido.
- Snapshot imutável, remoção apenas das quantidades compradas, preservação de adições posteriores e carrinho após recusa.
- Perfil, avatar/senha, carteiras, campos adicionais, validação e persistência; rascunho preservado durante refetch.
- Expiração no checkout, retomada do rascunho, preço/estoque em tempo real, eventos duplicados/antigos, reconexão e estado terminal.
- Migração de artes schema 2→3 preservando preços, estoque, sessão, carrinho, favoritos, cupom, idempotência e recibo anterior.
- Skeletons, offline/retry, compra por teclado, diálogos/foco e carregamento das telas antes de medir layout.
- Compra visível na primeira tela do detalhe mobile; entrada visível no cadastro mobile; expansão dos dados do recibo e diálogo da transação simulada com retorno do foco.

Perfis principais: **1440×1000** e **390×844**. As varreduras carregam as rotas e formulários em **768×1024** e aplicam **CSS zoom: 2** nas larguras 390, 768 e 1440 px. Isso verifica reflow com zoom CSS, não o menu de zoom do navegador. Asserções aguardam conteúdo, fontes e imagens visíveis antes de medir overflow. A compra por teclado usa Tab, digitação, Enter e Espaço, verificando foco visível.

## Lighthouse

Doze medições concluídas, três por página/perfil, no preview otimizado da aplicação normal. Não havia testes de navegador concorrentes. O comando saiu com sucesso e todos os arrays `belowTarget` estão vazios.

```sh
npm run build
npm run preview -- --port 4173
# Em outro terminal:
npm run audit
```

Nesta revisão, `AUDIT_BASE_URL=http://127.0.0.1:4181` selecionou o preview existente. Cada medição usa um perfil Chrome novo e throttling simulado. Mobile usa os padrões Lighthouse; desktop usa 1440×1000, RTT de 40 ms, 10 Mbps e sem redução de CPU. Assets, mocks e Socket.IO permanecem ativos, sem comportamento especial de auditoria.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP ms | CLS | TBT ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Início | Mobile | 90 | 100 | 100 | 100 | 3691 | 0 | 49 |
| Início | Desktop | 99 | 100 | 100 | 100 | 943 | 0 | 0 |
| Detalhe | Mobile | 91 | 100 | 100 | 100 | 3575 | 0 | 46 |
| Detalhe | Desktop | 99 | 100 | 100 | 100 | 847 | 0 | 0 |

Valores são medianas de três medições. Metas: performance ≥90, acessibilidade ≥95, boas práticas ≥95 e SEO ≥90. O script falha se a execução falhar ou uma mediana ficar abaixo da meta. Resultados individuais do início mobile: 90, 89 e 90; a meta é avaliada pela mediana, não por todas as execuções isoladas.

Ambiente: Lighthouse 13.6.0, Node v24.22.1, Windows 10.0.26300 x64, Intel i5-12450H, 16 GB RAM, HeadlessChrome 156.0.0.0. Veja [resumo e relatórios](../reports/lighthouse/README.md) e [JSON completo](../reports/lighthouse/summary.json). Variáveis opcionais: `AUDIT_BASE_URL`, `AUDIT_DETAIL_PATH`, `AUDIT_RUNS` (padrão 3) e `CHROME_PATH`.

O início mobile está no limite de performance. CPU, navegador, rede e host podem mudar o resultado. Estas são medições locais, sem alegar auditoria Lighthouse do domínio público. Um deslocamento do detalhe identificado durante a revisão foi corrigido pela estabilidade do bloco e pelas identidades distintas do skeleton/conteúdo; o CLS final é zero nos quatro grupos.

## Publicação e CI

Domínio de entrega: [jungle-nft-marketplace-matheus.vercel.app](https://jungle-nft-marketplace-matheus.vercel.app).

A Vercel informou READY para o deployment `dpl_A1cXEyTmtZeczjGZpvMjNhsbsVE1`, origem `c756dc006ea2e1f49bb66e038cf36a3f4d26a35a`, que contém a aplicação `5729059`. A suíte completa contra o domínio público concluiu **86 aprovados, quatro skips intencionais e zero falhas em 5,9 minutos**, sem retries ou atualizações de snapshots. As oito comparações visuais passaram. O [relatório HTML](../reports/playwright/index.html) corresponde a essa execução; comando e saída estão em [production-corrected-validation.txt](../reports/production-corrected-validation.txt).

Requisições sem Authorization/Cookie retornaram HTTP 200 para início, detalhe, checkout e worker, sem redirecionamento para login. As três páginas serviram a entrada atual `/assets/index-vBji3TuP.js`; o worker manteve JavaScript e no-cache. Veja [respostas anônimas](../reports/public-access-corrected.json). A captura começa em um contexto sem cookies.

A revisão pública anterior, `ca1cf55`, passou 86 testes com quatro skips em 6,0 minutos, mas antecede estas correções. Seu registro histórico permanece em [production-final-validation.txt](../reports/production-final-validation.txt). A [execução do GitHub Actions](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42277074581), commit `c756dc0`, concluiu com sucesso tipos, lint, build e **86 testes, com quatro skips intencionais em 9,4 minutos**. Não houve falhas nem retries. O commit contém o mesmo código de aplicação `5729059`; suas alterações posteriores são documentação e evidências. Veja [registro da CI](../reports/ci-corrected-validation.json).

O workflow Windows instala dependências, verifica tipos/lint, compila e executa Playwright com Node 22. Relatórios e traces ficam disponíveis por 14 dias. Windows corresponde ao ambiente dos baselines; outros sistemas podem rasterizar fontes de forma diferente.

## Comparação com o design

As diferenças observadas nos seis pares exportados foram corrigidas. A [galeria corrigida](../reports/design-corrections/index.html) usa capturas nas dimensões dos frames e preserva o acesso às imagens anteriores. Os dados variáveis da API e as adaptações de interação são explícitos em [FIGMA-COMPARISON.md](FIGMA-COMPARISON.md).

O original permaneceu indisponível. A cópia permitiu consultar contextos das nove telas desktop e a árvore mobile, mas o limite do plano impediu exportar mais que seis referências nesta rodada. Não se afirma equivalência original/cópia nem aprovação pixel a pixel de todos os frames.

## Histórico

Resultados anteriores permanecem no histórico Git e nos arquivos de evidência: 54/54 na primeira implementação; 82 aprovados/quatro skips antes da revisão dos assets; 86 aprovados/quatro skips nas revisões seguintes; e a suíte pública de `ca1cf55`. Esses checkpoints não substituem a validação da aplicação `5729059`.
