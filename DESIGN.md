# DESIGN.md do SlideStage

Direcao de design do app. Este arquivo é a fonte da verdade visual; o filtro
antislop (regras R-01 a R-38) corre por cima dele.

## Direcao

Ferramenta criativa de autoria, usada por horas, por pessoas não técnicas.
Tipo de produto que justifica tema escuro fixo (regra R-21): editor de código e
de imagem trabalham no escuro ha decadas, e o dono pediu explicitamente
**apenas o tema escuro de alto contraste**. Não existe toggle de tema: um único
modo, bem feito.

Dials: **ENERGY 2 / RHYTHM 2 / MOTION 2**. Energia media (ferramenta de
trabalho, não landing page), ritmo consistente com quebras propositais
(rail / stage / inspetor como três planos distintos), movimento contido e
funcional (hover, foco, abertura de menu, toast). Nada de loop infinito.

## Paleta

Medida com o contrast-checker da skill antislop-human (ratio mínimo do app:
6.52:1; texto normal exige 4.5:1, componentes 3:1).

| Token | Valor | Uso | Ratio medido |
|---|---|---|---|
| `--bg` | `#0B0D10` | fundo do app | base |
| `--surface` | `#12161B` | cartões, botões, inputs | base |
| `--surface-2/3` | `#171C22` / `#1D242C` | elevacao, hover | base |
| `--line` / `--line-2` | `#262E37` / `#303A45` | bordas | base |
| `--ink` | `#F2F5F7` | texto principal | 17.77:1 no `--bg` |
| `--ink-2` | `#A8B4BE` | texto secundario | 8.59:1 no `--surface` |
| `--ink-3` | `#8A97A3` | texto terciario | 6.52:1 no `--bg` |
| `--accent` | `#F5B841` | único accent | 10.22:1 no `--surface` |
| `--accent-ink` | `#171003` | texto sobre o accent | 10.63:1 |
| `--danger` | `#FF8A7A` | estado de erro | 7.48:1 no `--surface-2` |
| `--ok` | `#5BD98A` | estado de sucesso | 9.58:1 no `--surface-2` |
| `--info` | `#7FD0FF` | contorno de hover | 10.09:1 no `--surface-2` |

Um accent so (âmbar). Ele aparece em: ação principal (Apresentar), slide ativo
no trilho, foco de teclado, contagem de favoravel. Em todos os outros lugares o
app é neutro, para o accent continuar significando "aqui".

Estados de erro e sucesso nunca dependem só de cor: vem sempre com texto
("não foi possível abrir: ..."), regra de acessibilidade.

## Tipografia

- Interface: pilha do sistema (`system-ui, "Segoe UI", Roboto...`). Razao:
  nitidez imediata em qualquer maquina Windows sem baixar fonte, e o app é
  ferramenta, não vitrine.
- Código e contadores: pilha mono do sistema (`ui-monospace, "Cascadia Code",
  Consolas`). Razao: alinhamento de digitos nos números de slide e leitura de
  HTML.
- Sem caixa alta espaçada como rótulo (regra R-06). Rotulos em caixa normal.

## Formas e espaços

- Raios em escala curta: 6 (inputs e botões), 10 (cartões), 16 (modal). Nada de
  tudo em pilula (regra R-11).
- Uma única sombra no sistema (`--overlay`), reservada para o que flutua sobre
  o app: menu, modal, toast (regra R-12).
- Espaco em escala de 4px. Trilho 274px, palco flexivel, inspetor 314px.

## Icones

Conjunto próprio, desenhado no `src/components/Icons.tsx`: geometria simples,
traco de 1.7px, grade 24x24, sem biblioteca de icones. Razao: icones de biblioteca
popular deixam qualquer app com a mesma cara (regra R-04), e um conjunto curto
e consistente custa menos que adaptar um genérico.

## Movimento

Duracao padrão de 120ms com easing `cubic-bezier(0.2, 0.7, 0.3, 1)`.

- Hover de botão: fundo sobe um nivel. Nada de escala.
- Menu e modal: entrada de 130-150ms (opacidade + 4px). Toast sobe 10px.
- Trilho de slides: borda do card ativo muda para o accent.
- Nenhuma animação em loop, nenhum brilho, nenhuma glassmorphism (regras
  R-10, R-13, R-19).

## Layout

Três planos verticais fixos: trilho de slides (lista + recentes), palco (o
deck ao centro, sobre um fundo mais escuro com grade sutil de 22px para dar
sensacao de área de trabalho), inspetor (propriedades). Barra única no topo
agrupa por tarefa: criar/abrir/salvar, desfazer, canvas vs código, zoom e
prévia, apresentar. Uma ação primaria por contexto, só ela é preenchida.

## Estados

- Vazio: trilho sem recentes diz "Nenhum arquivo recente".
- Carregando: exportar com assets mostra toast de erro especifico se uma imagem
  não puder ser embutida, e segue sem ela.
- Erro: toda falha de disco vira toast com texto do problema e o que fazer.
- Arquivo externo modificado: barra de aviso com "Recarregar do disco" e
  "Manter a minha versão".

## Acessibilidade

- Todo par texto/fundo medido (tabela acima).
- Foco de teclado visivel em tudo (anel de 2px no accent).
- Todo controle tem nome acessivel;`aria-pressed` nos segmentados; dialog com
  `role="dialog"`, `aria-modal` e fechavel com Esc.
- Toasts em `role="status"` com `aria-live="polite"`.
- Tamanho mínimo de alvo de toque de 30px nos botões da barra (regra R-03 e
  alvo confortavel para mouse).
