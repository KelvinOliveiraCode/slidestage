# SlideStage

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Tauri](https://img.shields.io/badge/Tauri-2-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Vite](https://img.shields.io/badge/Vite-build-yellow)
![Rust](https://img.shields.io/badge/Rust-1.77-red)

HTML presentation editor. The user builds the slide on the visual canvas, edits code in the same app, and exports a single HTML file that opens in any browser and can be published on GitHub Pages without build.

## Problem / Why it exists

Presentation tools require a cloud account, subscription, or proprietary builder, and the result is locked to the platform. Editing HTML by hand works, but has no canvas. SlideStage closes that gap. It is a local desktop app that generates self-contained HTML, no server, no build, no account. The exported file opens in any browser.

## What it does

Three modes in the same window, switched from the top bar and with Ctrl+E:

- **View**: the deck behaves as it will be published. Arrows, clicking the sides, and dragging move the slides; no editing tools appear. The slide rail follows the active slide.
- **Edit**: canvas with selection, dragging (with center and thirds guides), resizing on the eight corners, and inline text (double click). Keyboard arrows move 1 px (Shift, 10 px) for fine adjustment. Delete removes and Ctrl+D duplicates. A floating mini-bar on each element offers text, duplicate, front, back, and delete. Slide buttons and links only work in View mode; in Edit mode clicking selects the element.
- **Code**: editor with syntax highlighting (CodeMirror). Saves with Ctrl+S inside the editor itself. Code and canvas edit the same document: changing one updates the other.

Other features:

- 8 ready templates: startup pitch, class and workshop, project portfolio, period report, course and track, product demo, image gallery, minimalist. Each brings a concrete example, not instructions.
- 8 layouts per slide: title, statement, split, cards, list, quote, full image, free.
- Slide entrance transition: smooth, slide in four directions, zoom in, zoom out, rotate, curtain, focus, hard cut. Speed in milliseconds, initial opacity, and shift distance configurable. Own background per slide.
- Inspector: text, size, weight, alignment, color, box (width, height, corners, inner spacing, X/Y position), background, entrance animation (9 options) with duration and delay, link (internal, external, mailto) and turn into button.
- Presenter notes per slide (attribute `data-notes`), edited in the inspector. Visible only in Presenter mode; they do not render on the slide, nor in the PDF, nor in the preview. They survive save, reload, opening in another editor, and slide duplication.
- File: open any HTML (made here or in VS Code), save, save as, export single HTML with local images embedded as data URL, publish `index.html` to GitHub Pages, open in browser. Export to PDF (Ctrl+P) opens the system print dialog; print CSS ensures one slide per page, backgrounds preserved, notes excluded, no cut-off content. If the file changes on disk, the app warns and offers to reload. Recent files list with open and remove.
- Present (F5, full screen) and Presenter mode: secondary native window (Tauri WebView2) that shows current slide, next slide, presenter notes, and timer. Synchronization via Tauri events (`emit`/`listen`) between windows, no BroadcastChannel nor polling. The focused presenter window commands the audience window (arrows, space, Home/End; T starts and pauses the timer, R resets). Drift-free timer. Closing one window leaves the other in a sane state.

## Stack

- Frontend: React 18, TypeScript 5.6, Vite, CodeMirror 6 (`@uiw/react-codemirror`), CSS with fixed high-contrast dark theme tokens.
- Backend: Rust, Tauri 2 (WebView2), dialog, fs and opener plugins; `notify` for file observation.
- Build: `tsc --noEmit` + `vite build`. `tauri build` generates NSIS and MSI installers.
- Tests: vitest (frontend) and `cargo test` (Rust).

## How it works

The HTML string is the source of truth. Two paths write to it and converge at the same point:

```
mutation on canvas              mutation on app
iframe (deck DOM)               doc.ts (DOMParser) + store
      posts full HTML              returns new HTML
      +--------------------> store <-------+
                                           |
                                   iframe reloads (tick)
```

- Hot mutations (select, drag, resize, text, inspector) happen in the iframe, which returns the ready document. No reload, so cursor and selection are not lost.
- Cold mutations (new slide, layout, code, template) leave the app, which regenerates the document and reloads the iframe.
- Undo/redo (Ctrl+Z) works on both paths because everything becomes an HTML snapshot.

The editor injected into the iframe is written as a TypeScript function and serialized with `toString()`, so the compiler checks it. It returns clean HTML: it removes its own visual layer before posting back.

Rust handles the disk: native dialog, read and write, base64 of assets for the single file, file watcher (`notify`) for external edit detection, and recent files list in JSON in the config directory.

## How to run

Requirements: Node 20+, stable Rust, and WebView2 Runtime (already included in Windows 10 and 11).

```bash
npm install
npm run tauri dev
```

Check:

```bash
npm run build     # tsc --noEmit + vite build
npm test          # vitest
cd src-tauri
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

What each suite covers:

| Suite | Covers |
|---|---|
| `src/lib/buildDoc.test.ts` | single document, slide ids, title escape, no scroll |
| `src/lib/doc.test.ts` | slide reading, slide and element mutations, assets |
| `src/lib/templates.test.ts` | the 8 templates generate a valid deck, no external dependency, no em dash, honest placeholders |
| `src/lib/editor.test.ts` | the injected editor runs in jsdom: visual layer, ids, selection, clean HTML back |
| `src/lib/notes.test.ts` | presenter notes in attribute, not as visible text |
| `src-tauri/tests/commands.rs` | read and write to disk, embed local image as data URL |

In total, vitest runs 46 tests in 5 suites and `cargo test` runs 3 integration tests.

Ready executable: `npm run tauri build` generates the binary in `src-tauri/target/release/SlideStage.exe`, also copied to the project root. Run it directly, without installing: the interface is already compiled inside it. Installers (NSIS and MSI) are in `src-tauri/target/release/bundle/`.

## Project structure

```
SlideStage/
├── index.html              # Main window (app)
├── presenter.html          # Presenter window
├── package.json            # Frontend scripts and dependencies
├── tsconfig.json           # App TypeScript
├── tsconfig.node.json      # TypeScript for vite.config
├── vite.config.ts          # Vite build (two entries: main and presenter)
├── src/
│   ├── main.tsx            # React entry point
│   ├── App.tsx             # Three modes, keyboard, presentation overlay
│   ├── presenter.tsx       # Presenter window entry point
│   ├── lib/                # Pure frontend logic
│   │   ├── buildDoc.ts     # Builds the single-file HTML document
│   │   ├── deckCss.ts      # Generated deck CSS (slides, layouts, animations, print)
│   │   ├── deckRuntime.ts  # Deck controller (navigation, HUD, touch, full screen)
│   │   ├── doc.ts          # Reads the document and applies structural mutations
│   │   ├── editor.ts       # Editor injected into the iframe (selection, drag, resize, text)
│   │   ├── ipc.ts          # Bridge with Tauri commands
│   │   ├── snippets.ts     # Markup helpers (slide, h1, button, card...)
│   │   ├── store.ts        # State, undo/redo, Rust bridge, presenter sync
│   │   ├── templates.ts    # The 8 templates
│   │   └── *.test.ts       # vitest tests
│   ├── components/         # Toolbar, SlideRail, Stage, Inspector, CodeView, PresenterApp and others
│   └── styles/             # tokens.css and app.css (fixed dark theme)
├── src-tauri/
│   ├── Cargo.toml          # Rust dependencies
│   ├── tauri.conf.json     # App config (windows, CSP, NSIS/MSI bundle)
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # Tauri commands (disk, assets, presenter window)
│   │   ├── assets.rs       # Local asset resolution and data URL
│   │   ├── recents.rs      # Recent files list
│   │   └── watcher.rs      # External disk change observation
│   └── tests/
│       └── commands.rs     # Rust integration tests
├── exemplos/               # External example HTML
├── tools/                  # Utility scripts (icon generation, etc.)
└── SlideStage.exe          # Ready build (do not version)
```

## Trade-offs and decisions

- **HTML string as source of truth.** The canvas edits the DOM inside an iframe and returns the full HTML; the app applies structural mutations and reloads the iframe. Advantage: simple undo/redo and canvas and code always in sync. Cost: the iframe is a context boundary and each hot action needs the round-trip to return the document.
- **No CSP.** The `tauri.conf.json` runs with `unsafe-inline` because the generated deck is made of inline script (runtime + canvas editor). With active CSP, no inline script runs and the canvas is empty. It is a conscious decision: to get CSP back, you need to allow scripts via another route, for example external src.
- **Fixed dark theme.** There is no theme toggle. The palette was chosen for high contrast and the app is a tool for prolonged use, not a showcase.
- **CodeMirror on demand.** The code editor weighs hundreds of KB and is only loaded with `React.lazy` when the user opens Code mode, so the initial app bundle is smaller.
- **System fonts.** The generated deck uses system fonts, so it stays self-contained and light. Custom fonts enter via code.

## Known limitations

- Dragging an element that is in normal flow (flex/grid) converts it to absolute within the slide. Ctrl+Z undoes.
- External HTML without the app's slide structure opens and edits, but the slide rail stays empty. Use a template for navigation.
- File watch observes one file at a time, the one that is open.
- Presenter mode requires WebView2 (present in Windows 10/11). If the presenter window is abruptly closed (process kill), the main window detects the absence of heartbeats in about 5s and shows "Disconnected".
- PDF export uses the system print dialog (WebView2 -> Print dialog). There is no native PDF engine in Tauri; the user chooses "Microsoft Print to PDF" or similar. Very large decks (above 100 slides) may be slow in the print dialog.
- The app icon and the `SlideStage.exe` executable at the root are build artifacts. Do not edit the executable directly.

## License

There is no `LICENSE` file in this repository. Without an express license, all rights are reserved to the author by default.

## Author

Kelvin
