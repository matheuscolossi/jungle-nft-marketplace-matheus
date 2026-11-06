# Conferência dos requisitos — 6 de novembro de 2026

Código de aplicação: `5729059`. As correções funcionais anteriores foram preservadas e os achados visuais observados foram tratados. A suíte local completa passou **86 testes, com quatro skips intencionais e zero falhas em 4,9 minutos**, sem atualizar baselines. Tipos, lint e build passaram. As 12 medições Lighthouse atendem às metas por mediana.

A versão corrigida publicada passou a suíte completa no domínio público: **86 aprovados, quatro skips e zero falhas em 5,9 minutos**, com acesso anônimo e oito comparações visuais. A [CI do commit c756dc0](https://github.com/matheuscolossi/jungle-nft-marketplace-matheus/actions/runs/42277074581) passou tipos, lint, build e 86 testes, com quatro skips em 9,4 minutos.

## Os 12 tópicos

| Tópico | Situação | Implementação e evidência |
| --- | --- | --- |
| 1. Escopo | Implementado | Descoberta, compra e conta com dados simulados, desktop/mobile. Sem pagamentos, blockchain ou extensões reais. |
| 2. Stack | Uso efetivo | React/TypeScript, TanStack Router/Query, Axios REST, socket.io-client, Tailwind, Button no padrão shadcn/ui com Radix/CVA, Radix Dialog, MSW, Playwright e Lighthouse. |
| 3. Telas e fluxos | Implementados e testados | Início, detalhe, carrinho, pagamento, recibo, login, cadastro, perfil, carteiras e favoritos. Busca/filtros/ordenação/página na URL; compra com revisão, cotação, carteira, estados e snapshot; conta com persistência e retomada. |
| 4. Integração e estado | Implementados | Consultas tipadas por parâmetros/usuário, cancelamento, invalidação, carregamento/vazio/erro/atualização, favoritos otimistas com rollback, rotas diretas e inexistentes. |
| 5. Contratos REST | Documentados e testados | [CONTRACTS.md](CONTRACTS.md): validação por campo, sessão, permissão, ausência, conflito e falha transitória. Chave idempotente recupera o pedido; payload diferente gera conflito. |
| 6. MSW | Implementado | Handlers na rede, 24 NFTs, duas contas, persistência, reset e cenários determinísticos. Migração de artes preserva dados e snapshots. Mocks habilitados no build. |
| 7. Socket.IO | Implementado e testado | Eventos de NFT/pedido via cliente real e binding MSW; versões/identidade impedem duplicação/regressão; reconexão reconcilia por REST; sessão isola eventos privados. |
| 8. UI, responsividade e acessibilidade | Achados observados corrigidos; cobertura visual limitada | Assets/fontes locais originais; revisão de composição; detalhe mobile com compra na primeira tela, recibo compacto, autenticação e rodapé ajustados. Labels/erros/foco/anúncios/diálogos, tablet e zoom verificados. Seis pares de frames comparados; original/cópia e demais exportações não certificados. |
| 9. Playwright | 86 aprovados e quatro skips intencionais | 90 entradas, das quais quatro varreduras mobile duplicadas são ignoradas. Oito baselines de início/detalhe/carrinho/pagamento; fluxo completo, erros, concorrência, sessão e eventos. |
| 10. Lighthouse | Metas atendidas | Três medições por início/detalhe e mobile/desktop. Performance: início 90/99, detalhe 91/99; demais categorias 100. CLS zero nos quatro grupos. Medições locais, com condições explícitas. |
| 11. Avaliação | Sem pontuação presumida | Stack e fluxos realmente integrados à simulação; regressões funcionais e visuais verificadas. A nota e os critérios subjetivos pertencem aos avaliadores. |
| 12. Entrega | Repositório e domínio disponíveis | Código, lockfile, assets, fixtures, mocks, testes, CI e auditorias versionados; configuração Vercel/SPA e worker. Resultado público desta revisão deve ser consultado em [VALIDATION.md](VALIDATION.md). |

## Correções preservadas

- Estoque agregado por edição; quantidade se ajusta à disponibilidade, com remoção explícita quando esgotado.
- Perfil com usuário, ENS, apelido e avatar; carteira com nome/apelido, perfil, tipo, indicação, e-mail e endereço secundário.
- Validação de endereço/rede e conflitos; carteira principal; sessão isolada, rascunhos preservados e campos bloqueados durante salvamento.
- Checkout associa erros aos campos, foca o primeiro erro e inclui os dados exigidos no snapshot. Valores são calculados em wei.
- Pedido é idempotente e tem controle de autoria. Recibo antigo não recebe dados atuais inventados. Apenas quantidades compradas são removidas.
- Migração schema 2→3 troca somente as artes conhecidas e mantém preços, estoque, versões, conta, sessão, carrinho, cupom, favoritos, pedidos e idempotência.

Contratos, cache, persistência e sessão estão em [ARCHITECTURE.md](../ARCHITECTURE.md).

## Correções visuais desta revisão

- Detalhe mobile reorganizado conforme a ficha sobreposta; controles de retorno/favorito, galeria, quantidade e ações preservados.
- Detalhe desktop com título/preço/descrição, seleção por rádio das edições reais e botões reorganizados.
- Recibo com metadados horizontais, tabela dos itens, dados completos expansíveis e diálogo de transação explicitamente simulada.
- Hero, busca na lateral desktop, espaçamento da grade e rodapé ajustados.
- Cadastro com nome/usuário lado a lado, medidas de modal corrigidas e espaçamento mobile que mantém entrada/botão visíveis.
- Login com tipografia corrigida e catálogo de fundo completo.
- Conta/pagamento sob demanda; skeleton e conteúdo estáveis para eliminar deslocamento durante a carga.

A [comparação com imagens](FIGMA-COMPARISON.md) documenta os seis pares, as outras capturas e a limitação de acesso ao original.

## Adaptações e limites

As artes PNG, SVGs e Roboto Mono foram obtidas da cópia disponibilizada. Derivados WebP são servidos localmente; originais, hashes e licença estão em [ASSETS.md](ASSETS.md). Artes antigas permanecem apenas para snapshots legados.

Preços, nomes, datas, edições, quantidades e contagens vêm da API. Não se inventam quatro edições, avaliações ou redes de NFT para imitar números estáticos. A busca e os filtros reais continuam utilizáveis; carteiras/pagamento seguem as redes suportadas pelo contrato. Ações editoriais, sociais e de suporte fora do escopo não simulam sucesso externo.

As referências de regressão são imagens da própria implementação. Não representam certificação de igualdade com o design. As varreduras usam CSS zoom: 2, não zoom pelo menu do navegador. Lighthouse é local; a mediana de performance do início mobile está no limite. O original não pôde ser lido e não foi possível comprovar equivalência integral com a cópia.

## Evidências

- [Validação, comandos, ambiente, CI e domínio público](VALIDATION.md)
- [Relatório Playwright](../reports/playwright/index.html)
- [Lighthouse HTML/JSON e medianas](../reports/lighthouse/README.md)
- [Figma × versão corrigida](../reports/design-corrections/index.html)
- [Resultado local textual](../reports/visual-corrections-validation.txt)

O domínio é [jungle-nft-marketplace-matheus.vercel.app](https://jungle-nft-marketplace-matheus.vercel.app), servido pelo projeto Vercel com fallback SPA e MSW no navegador. A publicação e a suíte pública são registradas separadamente dos testes locais.
