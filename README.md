# SlideStage

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Tauri](https://img.shields.io/badge/Tauri-2-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-build-yellow)
![Rust](https://img.shields.io/badge/Rust-1.77-red)

Editor de apresentações em HTML. O usuário monta o slide no canvas visual, edita o código no mesmo app e exporta um único arquivo HTML que abre em qualquer navegador e pode ser publicado no GitHub Pages sem build.

## Problema / Por que existe

Ferramentas de apresentação exigem conta na nuvem, assinatura ou builder próprio, e o resultado fica preso à plataforma. Editar HTML à mão funciona, mas não tem canvas. O SlideStage fecha essa lacuna. É um app de desktop local que gera HTML autossuficiente, sem servidor, sem build e sem conta. O arquivo exportado abre em qualquer navegador.

## O que faz

Três modos na mesma janela, alternados pela barra de topo e por Ctrl+E:

- **Visualizar**: o deck se comporta como será publicado. Setas, clique nas laterais e arrastar passam os slides; nenhuma ferramenta de edição aparece. O trilho de slides acompanha o slide ativo.
- **Editar**: canvas com seleção, arrastar (com guias de centro e terços), redimensionar nas oito pontas e texto no lugar (clique duplo). Setas do teclado movem 1 px (Shift, 10 px) para ajuste fino. Delete exclui e Ctrl+D duplica. Uma mini-barra flutuante em cada elemento oferece texto, duplicar, frente, atrás e excluir. Botões e links do slide só funcionam no modo Visualizar; no modo Editar o clique seleciona o elemento.
- **Código**: editor com realce de sintaxe (CodeMirror). Salva com Ctrl+S dentro do próprio editor. O código e o canvas editam o mesmo documento: mudar um atualiza o outro.

Outros recursos:

- 8 modelos prontos: pitch de startup, aula e workshop, portfólio de projetos, relatório de período, curso e trilha, demonstração de produto, galeria de imagens, minimalista. Cada um traz exemplo concreto, não instrução.
- 8 layouts por slide: título, afirmação, dividido, cartões, lista, citação, imagem cheia, livre.
- Transição de entrada por slide: suave, deslizar em quatro direções, aproximar, afastar, girar, cortina, foco, corte seco. Velocidade em milissegundos, opacidade inicial e distância do deslocamento configuráveis. Fundo próprio por slide.
- Inspetor: texto, tamanho, peso, alinhamento, cor, caixa (largura, altura, cantos, espaço interno, posição X/Y), fundo, animação de entrada (9 opções) com duração e atraso, link (interno, externo, mailto) e transformar em botão.
- Notas do apresentador por slide (atributo `data-notes`), editadas no inspetor. Visíveis apenas no modo Apresentador; não renderizam no slide, nem no PDF, nem na prévia. Sobrevivem a save, reload, abertura em outro editor e duplicação de slides.
- Arquivo: abrir qualquer HTML (feito aqui ou no VS Code), salvar, salvar como, exportar HTML único com imagens locais embutidas como data URL, publicar `index.html` para GitHub Pages, abrir no navegador. Exportar para PDF (Ctrl+P) abre o diálogo de impressão do sistema; o CSS de impressão garante um slide por página, fundos preservados, notas excluídas, sem conteúdo cortado. Se o arquivo mudar no disco, o app avisa e oferece recarregar. Lista de recentes com abrir e remover.
- Apresentar (F5, tela cheia) e Modo Apresentador: janela secundária nativa (Tauri WebView2) que mostra slide atual, próximo slide, notas do apresentador e cronômetro. Sincronização por eventos Tauri (`emit`/`listen`) entre janelas, sem BroadcastChannel nem polling. A janela do apresentador com foco comanda a janela da plateia (setas, espaço, Home/End; T inicia e pausa o timer, R reseta). Cronômetro sem drift. Fechar uma janela deixa a outra em estado são.

## Stack

- Frontend: React 18, TypeScript 5.6, Vite, CodeMirror 6 (`@uiw/react-codemirror`), CSS com tokens de tema escuro fixo de alto contraste.
- Backend: Rust, Tauri 2 (WebView2), plugins dialog, fs e opener; `notify` para observação de arquivo.
- Build: `tsc --noEmit` + `vite build`. `tauri build` gera instaladores NSIS e MSI.
- Testes: vitest (frontend) e `cargo test` (Rust).

## Como funciona

O HTML string é a fonte de verdade. Dois caminhos escrevem nele e convergem no mesmo ponto:

```
mutação no canvas              mutação no app
iframe (DOM do deck)           doc.ts (DOMParser) + store
     posta HTML completo          devolve HTML novo
     +--------------------> store <-------+
                              |
                      iframe recarrega (tick)
```

- Mutações quentes (selecionar, arrastar, redimensionar, texto, inspetor) acontecem no iframe, que devolve o documento pronto. Não há recarga, então o cursor e a seleção não se perdem.
- Mutações frias (novo slide, layout, código, modelo) saem do app, que regenera o documento e recarrega o iframe.
- Undo/redo (Ctrl+Z) funciona nos dois caminhos porque tudo vira snapshot do HTML.

O editor injetado no iframe é escrito como função TypeScript e serializado com `toString()`, então o compilador o verifica. Ele devolve o HTML limpo: remove a camada visual dele mesmo antes de postar de volta.

O Rust cuida do disco: diálogo nativo, leitura e escrita, base64 dos assets para o arquivo único, observador de arquivo (`notify`) para detecção de edição externa e lista de recentes em JSON no diretório de configuração.

## Como rodar

Requisitos: Node 20+, Rust estável e WebView2 Runtime (já vem no Windows 10 e 11).

```bash
npm install
npm run tauri dev
```

Verificar:

```bash
npm run build     # tsc --noEmit + vite build
npm test          # vitest
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

O que cada suíte cobre:

| Suíte | Cobre |
|---|---|
| `src/lib/buildDoc.test.ts` | documento único, ids dos slides, escape do título, ausência de scroll |
| `src/lib/doc.test.ts` | leitura dos slides, mutações de slide e de elemento, assets |
| `src/lib/templates.test.ts` | os 8 modelos geram deck válido, sem dependência externa, sem travessão, placeholders honestos |
| `src/lib/editor.test.ts` | o editor injetado executa em jsdom: camada visual, ids, seleção, HTML limpo de volta |
| `src/lib/notes.test.ts` | notas do apresentador em atributo, não como texto visível |
| `src-tauri/tests/commands.rs` | ler e escrever no disco, embutir imagem local como data URL |

No total, vitest executa 46 testes em 5 suítes e `cargo test` executa 3 testes de integração.

Executável pronto: `npm run tauri build` gera o binário em `src-tauri/target/release/SlideStage.exe`, também copiado para a raiz do projeto. Rode direto, sem instalar: a interface já vai compilada dentro dele. Os instaladores (NSIS e MSI) ficam em `src-tauri/target/release/bundle/`.

## Estrutura do projeto

```
SlideStage/
├── index.html              # Janela principal (app)
├── presenter.html          # Janela do apresentador
├── package.json            # Scripts e dependências do frontend
├── tsconfig.json           # TypeScript do app
├── tsconfig.node.json      # TypeScript do vite.config
├── vite.config.ts          # Build Vite (duas entradas: main e presenter)
├── src/
│   ├── main.tsx            # Ponto de entrada React
│   ├── App.tsx             # Três modos, teclado, overlay de apresentação
│   ├── presenter.tsx       # Ponto de entrada da janela do apresentador
│   ├── lib/                # Lógica pura do frontend
│   │   ├── buildDoc.ts     # Monta o documento HTML único
│   │   ├── deckCss.ts      # CSS do deck gerado (slides, layouts, animações, impressão)
│   │   ├── deckRuntime.ts  # Controller do deck (navegação, HUD, toque, tela cheia)
│   │   ├── doc.ts          # Lê o documento e aplica mutações estruturais
│   │   ├── editor.ts       # Editor injetado no iframe (seleção, arrastar, redimensionar, texto)
│   │   ├── ipc.ts          # Ponte com comandos Tauri
│   │   ├── snippets.ts     # Helpers de markup (slide, h1, botão, cartão...)
│   │   ├── store.ts        # Estado, undo/redo, ponte com Rust, sync do apresentador
│   │   ├── templates.ts    # Os 8 modelos
│   │   └── *.test.ts       # Testes vitest
│   ├── components/         # Toolbar, SlideRail, Stage, Inspector, CodeView, PresenterApp e outros
│   └── styles/             # tokens.css e app.css (tema escuro fixo)
├── src-tauri/
│   ├── Cargo.toml          # Dependências Rust
│   ├── tauri.conf.json     # Config do app (janelas, CSP, bundle NSIS/MSI)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # Comandos Tauri (disco, assets, janela do apresentador)
│   │   ├── assets.rs       # Resolução e data URL de assets locais
│   │   ├── recents.rs      # Lista de arquivos recentes
│   │   └── watcher.rs      # Observação de mudança externa no disco
│   └── tests/
│       └── commands.rs     # Testes de integração Rust
├── exemplos/               # HTML de exemplo externo
├── tools/                  # Scripts de utilitário (geração de ícones, etc.)
└── SlideStage.exe          # Build pronto (não versionar)
```

## Trade-offs e decisões

- **HTML string como fonte de verdade.** O canvas edita o DOM dentro de um iframe e devolve o HTML completo; o app aplica mutações estruturais e recarrega o iframe. Vantagem: undo/redo simples e canvas e código sempre sincronizados. Custo: o iframe é um limite de contexto e cada ação quente precisa do round-trip para devolver o documento.
- **Sem CSP.** O `tauri.conf.json` roda com `unsafe-inline` porque o deck gerado é feito de script inline (runtime + editor do canvas). Com CSP ativa, nenhum script inline roda e o canvas fica vazio. É uma decisão consciente: se quiser CSP de volta, precisa permitir script por outra via, por exemplo src externo.
- **Tema escuro fixo.** Não há toggle de tema. A paleta foi escolhida para contraste alto e o app é uma ferramenta de uso prolongado, não uma vitrine.
- **CodeMirror sob demanda.** O editor de código pesa centenas de KB e só é carregado com `React.lazy` quando o usuário abre o modo Código, então o pacote inicial do app é menor.
- **Fontes do sistema.** O deck gerado usa fontes do sistema, então fica autossuficiente e leve. Fonte personalizada entra por código.

## Limitações conhecidas

- Arrastar um elemento que está em fluxo normal (flex/grid) o converte em absoluto dentro do slide. Ctrl+Z desfaz.
- HTML externo sem a estrutura de slides do app abre e edita, mas o trilho de slides fica vazio. Use um modelo para ter navegação.
- O watch de arquivo observa um arquivo por vez, o que está aberto.
- Modo Apresentador requer WebView2 (presente no Windows 10/11). Se a janela do apresentador for encerrada abruptamente (kill de processo), a janela principal detecta a ausência de heartbeats em cerca de 5s e mostra "Desconectado".
- Exportar PDF usa o diálogo de impressão do sistema (WebView2 → Print dialog). Não há engine nativo de PDF no Tauri; o usuário escolhe "Microsoft Print to PDF" ou similar. Decks muito grandes (acima de 100 slides) podem demorar no diálogo de impressão.
- O ícone do app e o executável `SlideStage.exe` na raiz são artefatos de build. Não edite o executável diretamente.

## Licença

Não há arquivo `LICENSE` neste repositório. Sem uma licença expressa, todos os direitos estão reservados ao autor por padrão.

## Autor

Kelvin
