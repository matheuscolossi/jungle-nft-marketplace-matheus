# Assets e tipografia

A referência é o [arquivo original do desafio](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge). Em 6 de novembro de 2026, a [cópia fornecida pelo usuário](https://www.figma.com/design/8OMEkRvebRuOLP9QeIJLf1/Frontend-Challenge--Copy-) permitiu consultar os frames, os estilos e os assets pela integração oficial do Figma.

## Artes usadas na interface

As quatro artes abaixo vieram do frame **Desktop / Início** (2:2). São as mesmas artes reutilizadas pelos cartões, destaques, promoções e frames de compra do Figma. Não são as ilustrações substitutas da versão inicial.

| Asset servido                        | PNG original                         | Dimensões servidas |      Tamanho |
| ------------------------------------ | ------------------------------------ | ------------------ | -----------: |
| public/assets/figma/hero-ape.webp    | docs/figma-originals/hero-ape.png    | 800 × 800          | 60.740 bytes |
| public/assets/figma/sage-nomad.webp  | docs/figma-originals/sage-nomad.png  | 800 × 800          | 65.540 bytes |
| public/assets/figma/neon-vessel.webp | docs/figma-originals/neon-vessel.png | 800 × 800          | 53.970 bytes |
| public/assets/figma/golden-beat.webp | docs/figma-originals/golden-beat.png | 800 × 800          | 74.814 bytes |

Os PNG recebidos têm 1254 × 1254 px e foram preservados sem modificação em docs/figma-originals/. Para atender à otimização de imagens do enunciado, a interface serve derivados WebP de 800 × 800 px, qualidade 88, gerados com Sharp. A arte foi mantida; não foram gerados personagens ou fundos novos nesta revisão. Os originais ficam fora de public/ para não aumentar o pacote publicado.

Os 24 NFTs são fixtures dinâmicas e reutilizam essas quatro artes. IDs, preços, estoques, coleções e edições são definidos pela simulação; não são números fixos copiados dos frames. A migração de schema 2 para 3 troca somente image/images do catálogo. Recibos e cotações anteriores preservam seus snapshots.

## SVGs

Os arquivos em public/assets/figma/ incluem ícones, linhas, elementos decorativos, marcas sociais e a ilustração de confirmação obtidos dos contextos dos frames de início, autenticação, conta e confirmação. Foram baixados dos URLs temporários fornecidos pela integração; nenhum URL temporário é usado em execução.

As sete camadas SVG da marca Google são posicionadas conforme o componente original. Os controles sociais de autenticação ficam desabilitados, com explicação de que o acesso demonstrativo usa e-mail. Redes sociais e conteúdo editorial não simulam autenticação, envio ou sucesso de operações externas.

## Fonte

O Figma identifica **Roboto Mono**. A aplicação usa a versão variável Latin em public/fonts/roboto-mono-latin-variable.woff2, com 32.796 bytes, obtida pelo CSS oficial do Google Fonts. O mesmo arquivo atende aos pesos 400, 500 e 700; os caracteres portugueses usados na interface pertencem ao subconjunto entregue.

A fonte é local, com preload e font-display: swap. Não há consulta ao Google Fonts em execução. A licença SIL Open Font License 1.1 acompanha o arquivo em public/fonts/OFL-RobotoMono.txt. Referências: [projeto oficial Roboto Mono](https://github.com/googlefonts/RobotoMono) e [licença no Google Fonts](https://github.com/google/fonts/blob/main/ofl/robotomono/OFL.txt).

## Inventário e arquivos legados

O inventário com tamanhos e SHA-256 está em public/assets/figma/manifest.json. Ele registra os arquivos originais, derivados, SVGs e a fonte.

Os antigos public/assets/emerald-ape.webp, sage-nomad.webp, ivory-baron.webp e golden-beat.webp foram gerados com Imagegen durante a versão inicial. Permanecem disponíveis para que recibos antigos continuem exibindo a imagem realmente comprada naquela versão. A documentação e os prompts daquela etapa permanecem no histórico Git, por exemplo no commit bf3aa84. Esses arquivos não alimentam o catálogo atual.

Avatar de demonstração, favicon e vetores auxiliares anteriores também permanecem locais. O avatar pode ser substituído por upload; imagens e dados da conta são dinâmicos.

## Conferência visual

A revisão usa os contextos de design e screenshots do Figma como referência para composição, cores, fonte e slots dos assets. Busca, seleção de carteiras, validações, estados assíncronos e dados fictícios exigem adaptações de interação.

Os baselines Playwright continuam sendo referências da implementação, não uma prova automática de igualdade pixel a pixel com o Figma. Qualquer diferença conhecida relevante deve constar em REQUIREMENTS-AUDIT.md.
