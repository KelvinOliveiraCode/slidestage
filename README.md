# slidestage

![JavaScript/TypeScript](https://img.shields.io/badge/JS-TS-yellow?logo=javascript)   ![status: concluido](https://img.shields.io/badge/status-concluido-green)   ![licenca: MIT](https://img.shields.io/badge/licenca-MIT-blue)

## Resumo

Aplicacao web em JavaScript/TypeScript. SlideStage: HTML slide editor with visual canvas and code editing in one Tauri app. Export single-file HTML for GitHub Pages.

## Problema / por que existe

O projeto entrega uma interface ou utilitario web para um recorte especifico, com foco em navegador como ambiente de execucao e sem dependencia de servidor proprio.

## Arquitetura

- Camada de apresentacao: componentes e paginas que renderizam a interface.
- Camada de logica: funcoes e hooks que processam dados e estado.
- Comunicacao: requisicoes HTTP a APIs externas ou dados locais, quando aplicavel.

O build e feito com Vite (ou ferramenta equivalente), gerando arquivos estaticos prontos para hospedagem.

## Tecnologias

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

- Sem CI configurado neste repositorio.

O repositorio contem testes automatizados.

## O que faz

SlideStage: HTML slide editor with visual canvas and code editing in one Tauri app. Export single-file HTML for GitHub Pages.

## Como rodar

Requisitos: Node.js e npm (ou yarn/pnpm).

```
# instalar dependencias
npm install

# rodar em desenvolvimento
vite

# build para producao
tsc --noEmit && vite build

# rodar testes
vitest run
```

## Estrutura do projeto

- src-tauri/ (50 arquivo(s))
- src/ (32 arquivo(s))
- tools/ (4 arquivo(s))
- exemplos/ (1 arquivo(s))
- .gitignore, app-icon.png, DESIGN.md, index.html, package-lock.json, package.json, presenter.html, README.en.md, README.md, SlideStage.exe e mais 3


## Trade-offs e decisões

- Build estatico: facil de hospedar (GitHub Pages, Vercel, Netlify) sem servidor.
- Dependencias minimas para reduzir superficie de manutencao.
- Navegador como unico ambiente de execucao necessario.

## Limitações conhecidas

- Funciona no navegador; depende de conexao a internet para recursos externos.


## Testes

```
vitest run
```

## Licença

Distribuído sob a licenca MIT. Consulte o arquivo `LICENSE` do repositorio.

## Autor

Kelvin Oliveira, https://github.com/KelvinOliveiraCode
Portfolio: https://kelvinoliveiracode.github.io/portfolio/
