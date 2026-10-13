/* Monta o documento HTML único: doctype, head, CSS do deck, slides,
   HUD e runtime, tudo inline. O arquivo exportado abre sozinho em
   qualquer navegador e no GitHub Pages.

   ATENÇÃO: o runtime e o editor do canvas são scripts INLINE de propósito.
   O app empacotado roda sem CSP porque um hash que o Tauri injetaria faria
   o navegador ignorar o 'unsafe-inline' e travar o deck (canvas vazio).
   Não mova esses scripts para arquivo externo sem resolver a CSP antes. */

import { DECK_CSS } from './deckCss'
import { DECK_RUNTIME } from './deckRuntime'
import {
  btn,
  btnRow,
  escapeHtml,
  h1,
  h2,
  kicker,
  nextSlideId,
  p,
  resetSlideSeq,
  slide,
  spacer,
  sub,
  ul,
} from './snippets'

export const DECK_MARKER = 'SlideStage deck v1'

export interface DeckInput {
  title: string
  slides: string[]
  extraCss?: string
}

/** Garante que cada section de slide tem id único. */
function withSlideId(sectionHtml: string): string {
  if (/id="slide-\d+"/.test(sectionHtml)) return sectionHtml
  return sectionHtml.replace(
    '<section class="ss-slide"',
    `<section class="ss-slide" id="${nextSlideId()}"`,
  )
}

export function buildDeckHtml(input: DeckInput): string {
  const slidesHtml = input.slides.map(withSlideId).join('\n')
  const css = input.extraCss ? `${DECK_CSS}\n${input.extraCss}` : DECK_CSS
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="${DECK_MARKER}">
<title>${escapeHtml(input.title)}</title>
<style>${css}</style>
</head>
<body class="ss-deck">
<!-- ${DECK_MARKER} -->
<main class="ss-stage">
${slidesHtml}
</main>
<div class="ss-hud" aria-hidden="true">
  <div class="ss-progress"><span></span></div>
  <div class="ss-hud-row"><span class="ss-count">1 / 1</span><span>Navegue com as setas do teclado, clique nas laterais ou arraste no celular</span></div>
</div>
<script>${DECK_RUNTIME}</script>
</body>
</html>
`
}

/** Deck inicial de 3 slides, com placeholders honestos para o usuário preencher. */
export function buildStarterDeck(): string {
  resetSlideSeq()
  const s1 = slide(
    [
      kicker('Apresentação', { anim: 'fade', dur: 500 }),
      h1('Título da sua apresentação'),
      sub('Subtítulo ou uma frase de contexto'),
      spacer(8),
      btnRow(btn('Começar', '#slide-2', 'primary', { anim: 'fade-up', delay: 250 })),
    ].join(''),
    { layout: 'title', transition: 'fade' },
  )
  const s2 = slide(
    [
      h2('Um problema por slide', { anim: 'fade-up' }),
      p('Troque este texto pelo seu conteúdo. Cada slide leva uma ideia apenas.', {
        anim: 'fade-up',
        delay: 120,
      }),
      spacer(4),
      ul(['Primeiro tópico', 'Segundo tópico', 'Terceiro tópico'], { anim: 'fade-up', delay: 240 }),
    ].join(''),
    { layout: 'list', transition: 'slide' },
  )
  const s3 = slide(
    [
      h1('Obrigado'),
      sub('Seu nome ou contato'),
      spacer(6),
      btnRow(btn('Ver de novo', '#slide-1', 'ghost')),
    ].join(''),
    { layout: 'title', transition: 'zoom-in' },
  )
  return buildDeckHtml({ title: 'Minha apresentação', slides: [s1, s2, s3] })
}

/** Extrai o <title> do documento, com fallback segura. */
export function readTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const t = m?.[1]?.trim()
  return t && t.length ? t : 'Sem título'
}
