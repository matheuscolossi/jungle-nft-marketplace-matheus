# KURIO · NFT Marketplace

Implementação do [desafio de frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge), com React, TypeScript e uma API simulada na camada de rede. A identidade visual parte do [Figma fornecido](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1): tons de marrom, acentos âmbar, títulos monoespaçados e obras em destaque.

Todos os dados, endereços, pagamentos e referências de transação são fictícios. A aplicação funciona sem backend externo, extensão de carteira ou conexão com blockchain.

## Executar

Requisitos: Node.js 22.12+ (validado com Node 24), npm e Google Chrome para os testes/auditorias.

```sh
npm ci
npm run dev
```

A URL local é exibida pelo Vite. Para verificar a versão otimizada:

```sh
npm run build
npm run preview -- --port 4173
```

O worker do MSW e os assets são servidos localmente. A simulação está habilitada por padrão, inclusive no build de demonstração. Não são necessárias chaves, contas externas ou variáveis secretas.

| Variável            | Padrão                  | Uso                                                                                                   |
| ------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | habilitado              | `false` desativa MSW. Requer disponibilizar uma API compatível em `/api` e Socket.IO na mesma origem. |
| `E2E_BASE_URL`      | `http://127.0.0.1:4173` | Altera o alvo dos testes; a configuração ainda prepara o preview local em 4173.                       |
| `AUDIT_BASE_URL`    | `http://127.0.0.1:4173` | Origem do build otimizado para o Lighthouse.                                                          |
| `AUDIT_DETAIL_PATH` | `/nft/1`                | Detalhe auditado.                                                                                     |
| `AUDIT_RUNS`        | `3`                     | Medições por página e perfil. Preserve 3 para reproduzir a entrega.                                   |
| `CHROME_PATH`       | descoberta automática   | Caminho do Chrome para o Lighthouse, quando necessário.                                               |

## Contas de demonstração

| Colecionador | E-mail              | Senha        |
| ------------ | ------------------- | ------------ |
| Alex Morgan  | `alex@example.com`  | `Jungle123!` |
| Sofia Chen   | `sofia@example.com` | `Jungle123!` |

As duas contas têm carteiras e dados independentes. Também é possível cadastrar outra conta com dados fictícios. A sessão dura uma hora e é recuperada após atualizar a página. As senhas são persistidas somente como hashes na simulação.

Cupom válido: **`JUNGLE10`**, com 10% de desconto. Use `EXPIRED` para cupom expirado ou qualquer outro código para cupom inválido. A taxa de rede simulada é `0.0025 ETH` para um carrinho não vazio.

## Explorar os fluxos

1. Busque uma obra e combine categoria, coleção e ordenação. A URL preserva a consulta e a página, inclusive no histórico do navegador.
2. Abra um NFT, escolha edição e quantidade e adicione ao carrinho. A edição rara inclui exemplos esgotados.
3. Atualize quantidades, aplique o cupom e siga para o pagamento. O carrinho do visitante é combinado com o da conta ao entrar.
4. Confira seus dados, escolha carteira/rede, simule a conexão e revise a cotação antes de enviar.
5. Acompanhe o pedido pendente até a resposta da simulação. O recibo usa os valores do pedido, mesmo após futuras alterações no catálogo.
6. Em sua conta, altere perfil, avatar, senha e carteiras. Favoritos e pedidos pertencem ao usuário autenticado.

## Cenários e reset

Abra **“Cenários de demonstração”** no rodapé. Escolha um cenário e use os controles para alterar o catálogo, expirar a sessão, repetir eventos ou interromper a conexão. O reset restaura catálogo, contas, sessões, favoritos, carrinhos, carteiras, cupons, cotações e pedidos.

| Cenário            | Como observar                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `success`          | Fluxo padrão com latência de 220 ms.                                                                             |
| `empty`            | Catálogo vazio com orientação para ajustar a busca.                                                              |
| `slow`             | Latência mínima de 1,8 s para visualizar skeletons.                                                              |
| `out-of-order`     | Consultas curtas demoram mais que consultas longas; digite rapidamente para observar o cancelamento das antigas. |
| `offline`          | Falha de conexão nas chamadas REST. Volte a `success` e tente novamente.                                         |
| `server-error`     | Respostas HTTP 503; permite observar erro e recuperação.                                                         |
| `unauthorized`     | Expira a sessão; entre novamente para retomar o fluxo.                                                           |
| `favorite-error`   | Falha ao favoritar, com reversão da atualização otimista.                                                        |
| `validation-error` | Recusa o nome no formulário de perfil com erro associado ao campo.                                               |
| `price-change`     | No envio do pedido, altera o preço e exige revisar uma nova cotação.                                             |
| `sold-out`         | No envio do pedido, esgota a edição e mantém o carrinho para ajuste.                                             |
| `order-timeout`    | Cria o pedido e interrompe a resposta; a mesma referência recupera o pedido existente.                           |
| `payment-refused`  | Pedido passa de pendente a recusado e preserva os itens.                                                         |
| `pending`          | Mantém o pedido pendente até o controle de conclusão, inclusive após refresh.                                    |

Para reproduzir um preço alterado durante o checkout, coloque o NFT `1` no carrinho e use o controle de alteração de preço. O evento deve atualizar o resumo e anunciar a mudança. Repita o último evento e depois um evento antigo: o estado não deve retroceder. Para testar reconexão, desconecte com um pedido pendente, conclua a simulação, reconecte e confira a recuperação pela API.

Os controles também estão disponíveis como REST **dentro do navegador da aplicação**, interceptados pelo MSW. Por exemplo:

```js
await fetch("/api/demo", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ scenario: "slow", latency: 2000 }),
});
await fetch("/api/demo", { method: "DELETE" }); // reset completo
location.reload();
```

MSW roda no navegador; chamadas `curl` ao servidor estático não executam esses handlers.

## Verificação

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm run test:update
npm run audit
```

- `npm test` executa Playwright em Chromium/Chrome com perfis desktop (1440 px) e mobile (390 px). A configuração inicia build/preview automaticamente. Para instalar o navegador, quando ausente: `npx playwright install chrome`.
- `npm run test:update` atualiza as imagens de referência. Revise as diferenças antes de versioná-las.
- O relatório HTML do Playwright fica em `reports/playwright/index.html`; traces e screenshots de falhas ficam em `reports/test-results/`.
- Para auditar, mantenha `npm run preview -- --port 4173` ativo e execute `npm run audit` em outro terminal. São três medições para início/detalhe, em mobile/desktop. Os relatórios HTML/JSON e as medianas ficam em `reports/lighthouse/`.

Os testes verificam resultados da interface e chamadas pelos handlers reais da simulação. A regressão visual cobre início, detalhe, carrinho e pagamento com fixtures estáveis. A implementação, os limites do transporte, contratos REST, eventos e decisões de UX estão em [ARCHITECTURE.md](ARCHITECTURE.md). As evidências e condições de validação estão em [docs/VALIDATION.md](docs/VALIDATION.md).

A suíte verifica larguras de **390, 768 e 1440 px**. O workflow `.github/workflows/ci.yml` executa tipos, lint, build e Playwright com Node 22 e guarda relatórios/traces por 14 dias. Usa Windows para corresponder ao ambiente e à fonte dos baselines locais; a reprodução visual em outro sistema operacional pode apresentar diferenças de rasterização.

Validação final: **54/54 testes E2E**, oito capturas comparadas em uma execução adicional e 12 medições Lighthouse. As medianas de performance foram **94 mobile / 100 desktop** em início e detalhe; acessibilidade, boas práticas e SEO ficaram em **100**. Tipos, lint e build também passaram. Resultados e ambiente estão em [docs/VALIDATION.md](docs/VALIDATION.md).

## Assets e fidelidade visual

As quatro ilustrações finais foram geradas com o Imagegen integrado e são servidas como WebP de 800 × 800 px: Emerald Ape, Sage Nomad, Ivory Baron e Golden Beat. O catálogo de 24 fixtures reutiliza essas quatro artes; as variações de dados exercitam filtros, paginação, preço e disponibilidade. Nenhum download externo de imagem ou fonte é necessário em execução.

A composição, a paleta e a hierarquia foram guiadas pelo Figma. As imagens originais do arquivo não puderam ser extraídas pela visualização anônima. As artes e a tipografia de sistema são substituições documentadas, portanto a entrega não afirma reprodução pixel a pixel. Inventário, proveniência, resumos dos briefs e hashes estão em [docs/ASSETS.md](docs/ASSETS.md).

## Publicação

`npm run build` produz `dist/`. O host deve servir `index.html` para rotas não correspondentes a arquivos, preservando `/mockServiceWorker.js` e os assets; isso permite abrir ou atualizar `/nft/1`, `/cart`, `/checkout` e páginas da conta diretamente. Os mocks também devem permanecer habilitados no build publicado.

O código está em [matheuscolossi/jungle-nft-marketplace-matheus](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus). O ambiente de revisão usa [kurio-jungle-matheus.matheuscolossi.chatgpt.site](https://kurio-jungle-matheus.matheuscolossi.chatgpt.site). O acesso permanece privado ao proprietário enquanto aguarda autorização explícita para torná-lo público. A entrega para avaliadores requer liberar esse acesso.
