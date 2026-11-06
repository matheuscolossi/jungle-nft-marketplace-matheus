# Revisão visual e correções

Referência: [cópia do Figma fornecida para o desafio](https://www.figma.com/design/8OMEkRvebRuOLP9QeIJLf1/Frontend-Challenge--Copy-). Revisão de 6 de novembro de 2026.

## Correções implementadas

O código de aplicação desta revisão é 5729059. A revisão anterior, ca1cf55, encontrou seis diferenças de composição. Elas foram tratadas sem alterar os contratos REST, a persistência, o cálculo em wei ou as regras de compra.

| Área | Alteração e verificação |
| --- | --- |
| Detalhe mobile | Imagem imersiva, retorno/favorito no topo, ficha sobreposta e compra na primeira tela. O botão tem verificação de posição no viewport mobile. A galeria e as informações adicionais continuam acessíveis abaixo da ficha. |
| Detalhe desktop | Título/preço/descrição reorganizados, edições em opções de rádio e ações ao lado da quantidade. Edições esgotadas continuam indisponíveis; seleção e estoque vêm da API. |
| Recibo | Faixa horizontal de transação/data/total/carteira e tabela dos itens do snapshot. Dados completos do colecionador ficam em uma seção expansível. O botão de transação abre uma explicação local da referência simulada, com foco controlado. |
| Início | Enquadramento do hero ajustado. Busca visível na lateral em desktop e na barra do catálogo em mobile. Espaços da grade e dimensões do rodapé alinhados aos contextos. A altura desktop passou de 3879 para 3701 px; o frame tem 3668 px. A diferença residual inclui conteúdo funcional e dados variáveis. |
| Cadastro | Nome e nome de usuário dividem a primeira linha, preservando ambos os campos exigidos pelo contrato. Link de entrada e botão cabem no mobile; alturas menores recebem espaçamento reduzido. O modal desktop usa os 500×656 px do contexto. |
| Login | Tipografia dos tabs e descrição ajustadas; catálogo completo ao fundo, sem o corte anterior em 1220 px. Foco visível e provedores externos indisponíveis são preservados. |
| Carregamento | Conta/pagamento carregados sob demanda. Estados de skeleton e conteúdo possuem identidades distintas e um bloco de formatação estável, evitando reaproveitar elementos em posições diferentes. O CLS final medido foi zero nos quatro grupos Lighthouse. |

## Evidências

- [Comparação Figma × versão corrigida](../reports/design-corrections/index.html), com acesso também às capturas anteriores.
- [Auditoria anterior e seus seis pares](../reports/design-comparison/index.html).
- [Capturas das nove telas desktop e dois frames mobile](../reports/design-corrections/capture-evidence.json).
- [Relatórios Lighthouse](../reports/lighthouse/README.md).
- Resultados funcionais e condições em [VALIDATION.md](VALIDATION.md).

As capturas corrigidas foram repetidas no domínio público após a publicação de c756dc0. A suíte pública completa passou 86 testes, com quatro skips intencionais e zero falhas em 5,9 minutos, sem atualizar baselines. O contexto das capturas começa sem cookies.

A suíte verifica a compra por teclado, opções esgotadas, estoque por edição, snapshot, abertura dos dados do pedido, foco do diálogo de transação e retorno após fechá-lo. As oito baselines foram regeneradas depois da revisão visual; a verificação final as compara sem atualizá-las.

## Adaptações mantidas

- Preços, nomes, estoque, quantidade de imagens, edições, itens comprados e datas são dados da API, não números fixos dos frames.
- Não se exibem quatro edições ou avaliações fictícias quando as fixtures não as fornecem. As opções reais são Padrão/Rara; a indicação de curadoria não inventa uma nota de colecionadores.
- A busca, os filtros reais, o campo adicional de nome e a explicação de compra simulada permanecem funcionais.
- Campos de conta e de recibo exigidos pelo enunciado continuam disponíveis. A confirmação usa somente dados preservados no pedido.
- Nenhuma ação representa pagamento, transferência blockchain ou autenticação social real.

## Limites da comparação

O [arquivo original](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) permaneceu indisponível para leitura. Os contextos salvos de nove telas desktop e a árvore das telas mobile foram consultados; seis exportações nativas da cópia permitiram comparação direta. O limite do plano impediu novas exportações.

As outras capturas são revisão da interface e dos contextos salvos, sem alegar confronto direto com PNGs originais ausentes. Não foi possível comprovar que a cópia permanece idêntica ao original. Por isso, esta revisão resolve os achados observados e registra as adaptações, sem certificar igualdade integral de todos os frames ou uma pontuação no processo seletivo.

As imagens da referência não foram editadas nem usadas como imagem de página na implementação. Cada par usa a mesma largura CSS; início/detalhe desktop são capturas de página completa, enquanto os demais pares usam a altura do frame. Os PNGs mantêm sua resolução original.
