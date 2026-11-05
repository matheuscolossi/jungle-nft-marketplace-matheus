# Inventário e proveniência dos assets

O layout de referência é o [Frontend Challenge no Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). O arquivo foi inspecionado no navegador para orientar composição, paleta e hierarquia. A visualização anônima não disponibilizou a extração dos arquivos originais de imagem ou fonte.

As quatro imagens raster abaixo foram geradas durante esta implementação com o Imagegen integrado ao Codex. Não são exports nem cópias dos assets originais do Figma. Os originais de geração foram retidos no diretório gerenciado `$CODEX_HOME/generated_images/`; a execução e a publicação dependem somente dos arquivos locais versionados em `public/assets/`.

## Imagens finais

Todas têm 800 × 800 px, fundo opaco e formato WebP. Os 24 registros do catálogo reutilizam essas quatro ilustrações, com nomes, categorias, coleções, edições, preços e estoques diferentes. A repetição visual é uma limitação explícita do conjunto de fixtures.

| Arquivo                          | Conteúdo                                                                                                       |       Tamanho |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------: |
| `public/assets/emerald-ape.webp` | Macaco com óculos verdes, jaqueta varsity verde e creme e medalhão dourado, sobre fundo oliva claro.           | 117.514 bytes |
| `public/assets/sage-nomad.webp`  | Macaco de pelo cinza, chapéu bucket verde e moletom roxo, sobre fundo pêssego claro.                           | 118.580 bytes |
| `public/assets/ivory-baron.webp` | Macaco de pelo escuro com blazer marfim e gola alta verde, sobre fundo sálvia.                                 |  93.572 bytes |
| `public/assets/golden-beat.webp` | Macaco de pelo dourado com óculos metálicos, camisa de linho creme e corrente fina, sobre fundo amarelo claro. | 119.208 bytes |

Resumos dos briefs de geração, apresentados como documentação editorial e não como transcrição literal dos prompts:

- **Emerald Ape:** retrato quadrado de um personagem macaco colecionável, enquadrado do peito para cima em três quartos, com pelo castanho detalhado, expressão confiante, óculos verdes, jaqueta varsity esmeralda e creme, detalhes dourados e medalhão. Fundo oliva claro, luz de estúdio suave, acabamento tridimensional polido, sem letras, logotipos ou marca-d'água.
- **Sage Nomad:** retrato quadrado de um macaco de pelo cinza com expressão serena, chapéu bucket verde-oliva e moletom roxo. Enquadramento do peito para cima em três quartos, fundo pêssego claro, textura detalhada e iluminação de estúdio suave, coerente com a coleção, sem texto ou marcas.
- **Ivory Baron:** retrato quadrado de um macaco de pelo preto com expressão sóbria, blazer marfim e gola alta verde-escura. Enquadramento do peito para cima em três quartos, fundo sálvia liso, renderização tridimensional detalhada e luz suave, sem texto ou marcas.
- **Golden Beat:** retrato quadrado de um macaco de pelo dourado, expressão sorridente, óculos de armação dourada, camisa clara de linho e corrente fina. Enquadramento do peito para cima em três quartos, fundo amarelo suave, acabamento tridimensional detalhado, sem texto ou marcas.

SHA-256 dos arquivos entregues:

```text
emerald-ape.webp  30b9731b104e03a22abca9fd4421ec87a8f96f39064ec38c950e328cb8d17ba9
sage-nomad.webp   ca350c66b722320e9109a3c13aed8e41d1ee4879c22d00e8dee83a2b52d5ce0f
ivory-baron.webp  1154341252a8649d821c3b1e4caa286d3828300c7949ac22458627124c6b82b9
golden-beat.webp  baef9d52d5043114e200634b530c3a37d56a62f8f061c37a2d01cc9f3f70a1be
```

## Assets complementares

- `public/assets/avatar.svg`: avatar vetorial local de demonstração. O usuário pode substituí-lo por upload PNG/JPEG/WebP de até 2 MB, persistido na base simulada.
- `public/assets/nft-1.svg` a `nft-8.svg`: ilustrações vetoriais locais produzidas durante a implementação inicial. Permanecem disponíveis como assets auxiliares; o catálogo final usa os quatro WebP acima.
- `public/favicon.svg`: ícone vetorial local da aplicação.
- Ícones da interface: componentes do pacote `lucide-react`, com licença e versão resolvida pelo lockfile.
- Tipografia: `Courier New` do sistema, com fallback `monospace`. Não foi extraída uma fonte do Figma e não há dependência de hospedagem remota de fontes.

Essa seleção preserva a direção visual observada, mas não garante fidelidade exata de imagens, fonte ou pixels. As capturas do Playwright comparam a implementação entregue contra seus próprios baselines estáveis; não são um certificado de igualdade com os frames do Figma.

## Prompts enviados ao Imagegen integrado

### Emerald Ape

```text
Use case: stylized-concept. Asset type: square NFT art hero for a digital art marketplace. Premium highly detailed 3D illustrated portrait of a stylish friendly brown chimpanzee, bust from mid-chest, looking right in three-quarter view, sage green round sunglasses with dark green lenses, emerald green varsity jacket with cream sleeves and yellow piping, gold chain and round pendant. Light warm cream/sage softly lit plain background. Thick realistic fur, polished cinematic claylike 3D render, soft studio shadows. Subject fills entire square in centered composition, hair near top and torso cropped at bottom, no text, no watermark, no UI, no border.
```

### Sage Nomad

```text
Square premium 3D NFT collection portrait, bust from mid chest of a calm pale silver-gray chimpanzee wearing a sage green bucket hat and violet purple hoodie, warm cream softly lit plain background, facing right three-quarter view, fine realistic fur, polished cinematic stylized 3D render, soft studio lighting, centered subject fills entire square with hair/hat near top, torso cropped bottom. No text, no logos, no border, no UI. Asset for art marketplace.
```

### Ivory Baron

```text
Square premium 3D NFT collection portrait, bust from mid chest of an elegant dark charcoal black chimpanzee wearing an ivory cream blazer over a dark emerald turtleneck, pale sage softly lit plain background, facing right three-quarter view, fine realistic fur, polished cinematic stylized 3D render, soft studio lighting, centered subject fills entire square, hair near top torso cropped bottom. No text, no logos, no border, no UI. Asset for art marketplace.
```

### Golden Beat

```text
Square premium 3D NFT collection portrait, bust from mid chest of a stylish friendly golden-orange chimpanzee wearing an ivory cream linen shirt and thin gold chain, pale buttery cream softly lit plain background, facing right three-quarter view, fine realistic fur, polished cinematic stylized 3D render, soft studio lighting, centered subject fills entire square with hair near top, torso cropped bottom. No text, no logos, no border, no UI. Asset for art marketplace.
```
