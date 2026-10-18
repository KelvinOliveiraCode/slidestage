
# slidestage

![language: JavaScript/TypeScript](https://img.shields.io/badge/language-JS-TS-yellow?logo=javascript)   ![status: done](https://img.shields.io/badge/status-done-green)   ![license: MIT](https://img.shields.io/badge/license-MIT-blue)

## Summary

Web application in JavaScript/TypeScript. SlideStage: HTML slide editor with visual canvas and code editing in one Tauri app. Export single-file HTML for GitHub Pages.

## Problem / why it exists

The project delivers a web interface or utility for a specific scope, with focus on the browser as runtime and no dependency on its own server.

## Architecture

- Presentation layer: components and pages that render the interface.
- Logic layer: functions and hooks that process data and state.
- Communication: HTTP requests to external APIs or local data, when applicable.

The build is done with Vite (or equivalent tool), generating static files ready for hosting.

## Technologies

- JavaScript / TypeScript
- @codemirror/lang-html
- @tauri-apps/api
- @tauri-apps/plugin-dialog
- @tauri-apps/plugin-fs
- @tauri-apps/plugin-opener
- @uiw/react-codemirror
- codemirror
- react
- react-dom
- @tauri-apps/cli
- @types/react
- @types/react-dom
- @vitejs/plugin-react
- jsdom

- No CI configured in this repository.

The repository contains automated tests.

## What it does

SlideStage: HTML slide editor with visual canvas and code editing in one Tauri app. Export single-file HTML for GitHub Pages.

## How to run

Requirements: Node.js and npm (or yarn/pnpm).

```
# install dependencies
npm install

# run in development
vite

# production build
tsc --noEmit && vite build

# run tests
vitest run
```

## Project structure

- src-tauri/ (50 arquivo(s))
- src/ (32 arquivo(s))
- tools/ (4 arquivo(s))
- exemplos/ (1 arquivo(s))
- .gitignore, app-icon.png, DESIGN.md, index.html, package-lock.json, package.json, presenter.html, README.en.md, README.md, SlideStage.exe e mais 3


## Trade-offs and decisions

- Static build: easy to host (GitHub Pages, Vercel, Netlify) without a server.
- Minimal dependencies to reduce maintenance surface.
- Browser as the only runtime required.

## Known limitations

- Runs in the browser; depends on internet connection for external resources.


## Tests

```
vitest run
```

## License

Distributed under the MIT License. See the `LICENSE` file in this repository.

## Author

Kelvin Oliveira, https://github.com/KelvinOliveiraCode
Portfolio: https://kelvinoliveiracode.github.io/portfolio/
