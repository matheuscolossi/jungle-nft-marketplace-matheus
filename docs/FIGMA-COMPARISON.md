# Comparação independente com a referência visual

Data: 6 de novembro de 2026. Aplicação examinada: ca1cf55346cc25f6f8d8d0b6492de896ee1cd4d2, publicada em https://jungle-nft-marketplace-matheus.vercel.app. Nenhum código da aplicação foi alterado nesta revisão.

## Resultado das três verificações

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| Acesso anônimo | Aprovado | Novo contexto Chrome sem cookies nem storageState; início e detalhe renderizados. HTTP sem Authorization/cookies retornou 200 no início, /nft/1, /checkout e worker JavaScript. |
| Suíte completa no domínio publicado | Aprovada | 86 testes aprovados, quatro skips intencionais, zero falhas; 6,0 minutos. Sem retries nem atualização de baselines. HTML em reports/playwright/index.html. |
| Comparação com o Figma original | Incompleta; fidelidade visual não aprovada na amostra acessível | O original não pôde ser lido. Seis frames da cópia fornecida foram comparados com capturas novas e revelaram diferenças estruturais. |

A aprovação funcional não comprova fidelidade ao Figma. Esta revisão não usa as próprias baselines como fonte visual. Não se declara correspondência pixel a pixel nem pontuação de avaliação.

## Método e limitações

- Original solicitado: [Frontend Challenge](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1). A integração retornou falta de acesso de edição; a leitura web também falhou. O navegador integrado falhou ao inicializar os recursos. A tentativa pelo navegador Windows foi encerrada pelo Computer Use porque ele não conseguiu determinar a URL atual com confiança para aplicar sua política. Não foram feitos novos inputs nesse navegador.
- Fonte visual efetivamente disponível: [cópia fornecida pelo usuário](https://www.figma.com/design/8OMEkRvebRuOLP9QeIJLf1/Frontend-Challenge--Copy-). Não foi possível verificar que ela permanece idêntica ao original.
- Foram obtidas seis exportações nativas. O plano Starter do Figma atingiu o limite de chamadas, impedindo exportar os nove frames restantes. Não se considera cobertura integral das telas.
- As capturas publicadas são de contextos novos Chrome, sem sessão da Vercel, com fontes/imagens prontas, consultas secundárias concluídas e movimento reduzido. Dados de compra são fictícios e locais ao contexto; não há blockchain ou pagamento real.
- Largura de 1440 px nos quatro frames desktop e 414 px nos dois mobile, correspondendo às referências exportadas. Início/detalhe desktop usam página completa; os outros pares usam a altura exata do frame. Não houve redimensionamento nem edição dos PNG. Preços, contagens, usuário, itens e estado de foco não são diferenças estruturais.
- As oito baselines existentes verificam regressão da implementação e passaram nesta execução; não foram usadas para aprovar equivalência ao design.

## Achados

| Prioridade | Tela / frame da cópia | Comparação observada | Encaminhamento |
| --- | --- | --- | --- |
| Alta | Detalhe mobile, 15:5536, 414×896 | Referência: retorno/favorito sobre imagem imersiva; título, edições, quantidade e compra cabem na primeira tela. Publicação: cabeçalho, breadcrumb, imagem com moldura, miniaturas e descrição alongam o fluxo; compra fica abaixo da primeira tela. | Reproduzir composição mobile e visibilidade da área de compra, preservando controles e validações. |
| Média | Confirmação, 11:4385, 1440×1657 | A referência apresenta faixa horizontal com transação/data/total/carteira e tabela de itens. A publicação usa uma lista vertical longa de metadados e outro agrupamento dos totais. Ícone, cartão central e faixa de base são próximos. | Reorganizar o snapshot na composição do frame, mantendo dados obrigatórios e indicação de simulação. |
| Média | Detalhe desktop, 10:244, 1440×2246 | Duas colunas e galeria existem, mas seletor de edição substitui chips; título, descrição, ações e metadados mudam de posição. Altura publicada 2343 px. Conteúdo da API é diferente por definição. | Alinhar hierarquia, controles e espaçamento, sem fixar dados do frame no lugar da API. |
| Média | Início, 2:2, 1440×3668 | Mesma família visual e sequência de hero/catálogo/promoções/diário/rodapé. Enquadramento da arte do hero diferente; altura publicada 3879 px. Busca/filtros reais explicam parte das mudanças, mas não toda equivalência visual. | Corrigir enquadramento e revisar espaços; manter adaptações funcionais documentadas. |
| Média | Cadastro mobile, 16:1228, 414×896 | Cor/fonte e eixo central próximos. Campo adicional de nome, texto do botão e espaços aumentam a altura; link para entrar sai da primeira tela. | Ajustar composição com os campos obrigatórios, documentando a diferença necessária de conteúdo. |
| Baixa | Login desktop, 9:115, 1440×1981 | Posição e dimensões gerais do modal próximas. Fundo, tipografia, texto e estado de foco diferem. Indicadores de foco e provedores desabilitados são adaptações de acessibilidade/escopo. | Afinar tipografia e fundo; preservar foco e comunicação honesta dos provedores. |

## Evidências para revisão

- [Galeria lado a lado dos seis pares](../reports/design-comparison/index.html), com PNGs em resolução nativa e links para os frames efetivamente lidos.
- [Registro das capturas e contexto inicial sem cookies](../reports/design-comparison/capture-evidence.json).
- [Suíte completa pública](../reports/production-final-validation.txt) e [relatório HTML](../reports/playwright/index.html).
- [Respostas HTTP públicas sem credenciais](../reports/public-access-final.txt).

Para completar o confronto com o original e a cobertura dos nove frames restantes, é necessária uma exportação PNG/PDF dos frames originais ou acesso de leitura funcional por uma ferramenta disponível. Não é necessário presumir aprovação enquanto essas referências faltam. As correções visuais acima não foram realizadas: esta etapa foi uma verificação.
