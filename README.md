# SlideStage

Editor de slides em HTML, feito para quem não programa. Funciona como um
"NetBeans para HTML, CSS e JS": o usuário monta o slide no canvas, ve e edita
o código no mesmo app, e exporta **um arquivo HTML único** que abre em
qualquer navegador e publica no GitHub Pages sem build.

Backend em Rust (Tauri 2), interface em React + TypeScript, tema escuro de
alto contraste fixo.

## Rodar

Precisa de Node 20+, Rust estavel e o WebView2 Runtime (já vem no Windows 10/11).

```bash
npm install
npm run tauri dev
```

## Verificar

```bash
npm run build     # tsc --noEmit + vite build
npm test          # vitest: 35 testes (deck, documento, modelos, editor)
cd src-tauri
cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test
```

O que cada suite cobre:

| Suíte | Cobre |
|---|---|
| `src/lib/buildDoc.test.ts` | documento único, ids dos slides, escape do título, ausência de scroll |
| `src/lib/doc.test.ts` | leitura dos slides, mutações de slide e de elemento, assets |
| `src/lib/templates.test.ts` | os 8 modelos geram deck válido, sem dependência externa, sem travessão, placeholders honestos |
| `src/lib/editor.test.ts` | o editor injetado **executa** em jsdom: camada visual, ids, selecao, HTML limpo de volta |
| `src-tauri/tests/commands.rs` | ler e escrever no disco, embutir imagem local como data URL |

## Desempenho na abertura

O editor de código (CodeMirror) pesa ~580KB e só é usado por quem abre o modo
Código. Ele é carregado **sob demanda** (`React.lazy`), então o pacote inicial
do app fica em ~250KB (79KB comprimidos) em vez de 830KB. Na prática: o canvas
aparece muito mais rápido, e o editor de código carrega no clique.

Ferramentas em `tools/`: `make-icon.py` regera os ícones do app a partir de um PNG;
`fix-accents.py` foi a correcao ortografica que repos acentos em todo o texto.

## Executavel pronto

`npm run tauri build` gera o binario em
`src-tauri/target/release/SlideStage.exe`, copiado tambem para a raiz do
projeto como `SlideStage.exe`. Da para rodar direto, sem instalar: a interface
ja vai compilada dentro dele. Os instaladores (NSIS e MSI) ficam em
`src-tauri/target/release/bundle/`.

## O que da para fazer

**Slides**
- 8 modelos prontos: pitch, aula, portfólio, relatório, curso e trilha,
  demonstracao de produto, galeria e minimalista.
- Adicionar, duplicar, reordenar e excluir slides; 8 layouts (título,
  afirmação, dividido, cartões, lista, citação, imagem cheia, livre).
- Transicao de entrada por slide (suave, deslizar, aproximar, girar, corte).
- Fundo próprio por slide e transição de entrada configurável: 12 tipos
  (suave, deslizar em quatro direções, aproximar, afastar, girar, cortina,
  foco, corte seco) com velocidade em milissegundos, opacidade inicial e
  distância do deslocamento.

**Tres modos de tela, no segmentado do topo**
- Visualizar: o deck funciona como vai funcionar publicado. Setas, clique nas
  laterais e arrastar passam os slides; nenhuma ferramenta de edicao aparece.
  O trilho acompanha o slide que esta na tela.
- Editar: o canvas com selecao, arrastar, redimensionar e texto no lugar.
- Codigo: o HTML do deck, com realce de sintaxe.
- Ctrl+E alterna entre visualizar e editar.
- Botoes e links do deck nunca abrem janela dentro do app: link interno
  (#slide-2) vai direto ao slide, e endereco externo (site, email, telefone)
  abre no navegador do sistema.

**Canvas (edição visual)**
- Clique seleciona, arrastar move (com guias de centro e borda), as oito
  pontas redimensionam, clique duplo edita o texto no lugar.
- Setas do teclado movem 1px (com Shift, 10px) para ajuste fino.
- Linhas de enquadramento sempre a vista: moldura do slide, centro e tercos.
- Botoes e links do slide so funcionam no modo Visualizar; no modo Editar o
  clique seleciona o elemento.
- Setas movem 1px (Shift, 10px), Delete exclui, Ctrl+D duplica.
- Mini barra flutuante no elemento: texto, duplicar, frente, atrás, excluir.

**Inspetor**
- Texto, tamanho, peso, alinhamento, cor, caixa (largura, altura, cantos,
  espaço interno, posição X/Y), fundo.
- Animacao de entrada (9 opções) com duração e atraso.
- Link (interno, externo, mailto), destino e transformar em botão.
- Inserir título, texto, botão, lista, forma, citação, espaço e imagem.
- Propriedades do slide: fundo, transição (tipo, velocidade, opacidade, distância), layout e **notas do apresentador**.

**Notas do apresentador**
- Notas por slide (atributo `data-notes`), editadas no Inspetor.
- Visíveis apenas no modo Apresentador (janela secundária); **não renderizam no slide**, nem no PDF, nem na prévia.
- Sobrevivem a save/reload/open-em-outro-editor e à duplicação de slides.

**Código**
- Alternar com Ctrl+E entre visualizar e editar.
- Editor com realce de sintaxe; salvar com Ctrl+S dentro do próprio editor.
- O código atualiza o canvas e o canvas atualiza o código: os dois editam o
  mesmo documento.

**Arquivo**
- Abrir qualquer HTML (feito aqui ou no VS Code), Ctrl+O.
- Salvar, salvar como, exportar HTML único (embute imagens locais como data
  URL), publicar `index.html` para GitHub Pages, abrir no navegador.
- **Exportar para PDF** (Ctrl+P): abre o diálogo de impressão do sistema; o CSS
  de impressão garante um slide por página, fundos preservados, notas excluídas,
  sem conteúdo cortado. `print-color-adjust: exact` força impressão de fundos.
- Se o arquivo mudar no disco (editado fora), o app avisa e oferece recarregar.
- Lista de recentes com abrir e remover.

**Apresentar**
- F5 em tela cheia; setas, espaço, Home/End, clique nas laterais, arrastar no
  celular, F para tela cheia do deck, e imprimir em PDF pelo navegador.
- **Modo Apresentador (dual screen)**: janela secundária nativa (Tauri WebView2)
  que mostra slide atual, próximo slide, notas do apresentador e cronômetro.
  - Sincronização via Tauri events (`emit`/`listen`) entre janelas — sem BroadcastChannel nem polling.
  - Controle de teclado da janela do apresentador (setas, espaço, Home/End, T para timer, R para resetar) comanda a janela da plateia.
  - Cronômetro preciso (não drift, não reseta na navegação).
  - Fechar uma janela deixa a outra em estado são.

## Por que o app nao tem CSP

O `tauri.conf.json` roda sem CSP de proposito. O Tauri injeta um `sha256`
do proprio bootstrap dentro da diretiva `script-src` e, pela especificacao de
CSP, a existencia de um hash faz o navegador **ignorar** o `'unsafe-inline'`.
Com CSP ligada, nenhum script inline roda dentro do app, e o deck gerado
(runtime + editor do canvas) e feito de script inline. O sintima era o canvas
vazio: o HTML do slide existia, mas o runtime nao executava, nenhum slide
recebia `is-active` e tudo ficava `display: none`.

Se um dia quiser CSP de volta, ela precisa permitir script por outra via
(script explicito sem hash, ou src externo). Esteja avisado.

## Como o app funciona por dentro

O **HTML string é a fonte de verdade**. Existem dois caminhos que escrevem
nele, e os dois convergem no mesmo lugar:

```
        mutacao no canvas                 mutacao no app
   iframe (DOM do deck)            doc.ts (DOMParser) + store
        |  posta HTML completo             |  devolve HTML novo
        +------------------> store <-------+
                             |
                   iframe recarrega (tick)
```

- Mutacoes quentes (selecionar, arrastar, redimensionar, texto, inspetor)
  acontecem no iframe, que devolve o documento pronto. Não ha recarga, então
  cursor e selecao não se perdem.
- Mutacoes frias (slide novo, layout, código, modelo) saem do app, que
  regera o documento e recarrega o iframe.
- Undo/redo (Ctrl+Z) funciona nos dois caminhos porque tudo vira snapshot.

O que cada parte faz:

| Camada | Papel |
|---|---|
| `src/lib/deckCss.ts` | CSS do deck gerado: slides, layouts, animações, transições, impressão |
| `src/lib/deckRuntime.ts` | Controller do deck: navegação, HUD, toque, tela cheia, links externos |
| `src/lib/snippets.ts` | Helpers de markup (slide, h1, botão, cartão...) usados pelos modelos |
| `src/lib/buildDoc.ts` | Monta o documento HTML único |
| `src/lib/doc.ts` | Le o documento (slides, títulos) e aplica mutacoes estruturais |
| `src/lib/editor.ts` | Editor injetado no iframe: selecao, arrastar, resize, texto |
| `src/lib/store.ts` | Estado, undo/redo, ponte com o Rust, **sync do apresentador** |
| `src/lib/templates.ts` | Os 8 modelos |
| `src/components/PresenterApp.tsx` | Janela do apresentador: slide atual, próximo, notas, timer |
| `src-tauri/` | Disco: abrir/salvar, embute assets, observa mudanca externa, recentes, **janela presenter** |

O editor injetado é escrito como função TypeScript e serializado com
`toString()`, então o compilador o verifica (nada de script em string solta).
Ele devolve o HTML **limpo**: remove a camada visual dele mesmo antes de postar.

O Rust faz o trabalho pesado de disco: dialogo nativo, leitura e escrita,
base64 dos assets para o arquivo único, observador de arquivo (`notify`) para
detectar edição externa, e a lista de recentes em JSON no diretório de config.

## Limites conhecidos

- Deck gerado usa fontes do sistema (fica autonomo e leve). Fonte personalizada
  entra por código.
- Arrastar um elemento que esta em fluxo normal (flex/grid) o converte em
  absoluto dentro do slide. Ctrl+Z desfaz.
- HTML externo sem a estrutura de slides do app abre e edita, mas o painel de
  slides fica vazio (use um modelo para ganhar a navegacao).
- O watch de arquivo observa um arquivo por vez, o que está aberto.
- **Modo Apresentador**: requer WebView2 (já presente no Windows 10/11). A
  sincronização usa Tauri events; se a janela do apresentador for fechada
  abruptamente (kill de processo), a janela principal detecta a ausência de
  heartbeats em ~5s e mostra "Desconectado".
- **Exportar PDF**: usa o diálogo de impressão do sistema (WebView2 -> Print
  dialog). Não há engine nativo de PDF no Tauri; o usuário escolhe "Microsoft
  Print to PDF" ou similar. Decks muito grandes (>100 slides) podem exigir
  paciência no diálogo de impressão.
