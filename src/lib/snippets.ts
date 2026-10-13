/* Helpers de markup usados pelos templates e pelodeck inicial.
   Todo texto passa por escape; nada de atributo sem aspas. */

export type Layout =
  | 'title' | 'statement' | 'split' | 'cards' | 'list' | 'quote' | 'image' | 'blank'
export type Transition =
  | 'fade' | 'slide' | 'slide-back' | 'slide-up' | 'slide-down'
  | 'zoom-in' | 'zoom-out' | 'flip' | 'rotate' | 'wipe' | 'blur' | 'none'
export type Anim = 'fade' | 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'zoom' | 'blur' | 'rise'

export const ANIMS: { id: Anim | 'none'; label: string }[] = [
  { id: 'none', label: 'Sem animação' },
  { id: 'fade', label: 'Aparecer' },
  { id: 'fade-up', label: 'Subir' },
  { id: 'fade-down', label: 'Descer' },
  { id: 'fade-left', label: 'Entrar pela esquerda' },
  { id: 'fade-right', label: 'Entrar pela direita' },
  { id: 'zoom', label: 'Aproximar' },
  { id: 'blur', label: 'Foco' },
  { id: 'rise', label: 'Elevar' },
]

export const TRANSITIONS: { id: Transition; label: string }[] = [
  { id: 'fade', label: 'Suave' },
  { id: 'slide', label: 'Deslizar para a esquerda' },
  { id: 'slide-back', label: 'Deslizar para a direita' },
  { id: 'slide-up', label: 'Subir' },
  { id: 'slide-down', label: 'Descer' },
  { id: 'zoom-in', label: 'Aproximar' },
  { id: 'zoom-out', label: 'Afastar' },
  { id: 'flip', label: 'Girar na vertical' },
  { id: 'rotate', label: 'Girar no plano' },
  { id: 'wipe', label: 'Cortina' },
  { id: 'blur', label: 'Foco' },
  { id: 'none', label: 'Corte seco' },
]

export const LAYOUTS: { id: Layout; label: string; hint: string }[] = [
  { id: 'title', label: 'Título', hint: 'Uma frase grande e centralizada' },
  { id: 'statement', label: 'Afirmação', hint: 'Texto grande à esquerda' },
  { id: 'split', label: 'Dividido', hint: 'Texto de um lado, imagem do outro' },
  { id: 'cards', label: 'Cartões', hint: 'Três cartões lado a lado' },
  { id: 'list', label: 'Lista', hint: 'Tópicos com marcadores' },
  { id: 'quote', label: 'Citação', hint: 'Frase de destaque com autor' },
  { id: 'image', label: 'Imagem cheia', hint: 'Foto de fundo com texto por cima' },
  { id: 'blank', label: 'Livre', hint: 'Área vazia para montar no canvas' },
]

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export interface AnimOpts {
  anim?: Anim | 'none'
  dur?: number
  delay?: number
}

export function animAttrs(o: AnimOpts = {}): string {
  const attrs: string[] = []
  if (o.anim && o.anim !== 'none') {
    attrs.push(`data-anim="${o.anim}"`)
    if (o.dur) attrs.push(`style="--ss-anim-dur:${o.dur}ms"`)
    if (o.delay) attrs.push(`style="--ss-anim-dur:${o.dur ?? 620}ms;--ss-anim-delay:${o.delay}ms"`)
  }
  return attrs.join(' ')
}

export interface SlideAttrs {
  bg?: string
  ink?: string
  transition?: Transition
  layout?: Layout
  advance?: boolean
  extraAttrs?: string
}

let slideSeq = 0
export function resetSlideSeq(): void {
  slideSeq = 0
}
export function nextSlideId(): string {
  slideSeq += 1
  return `slide-${slideSeq}`
}

export function slide(children: string | string[], attrs: SlideAttrs = {}): string {
  const id = nextSlideId()
  const layout = attrs.layout ?? 'title'
  const inner = Array.isArray(children) ? children.join('') : children
  const style = [
    attrs.bg ? `--slide-bg:${attrs.bg}` : '',
    attrs.ink ? `--slide-ink:${attrs.ink}` : '',
  ]
    .filter(Boolean)
    .join(';')
  const body =
    layout === 'blank'
      ? inner
      : `<div class="ss-content" data-layout="${layout}">${inner}</div>`
  const flags = [attrs.advance === false ? ' data-advance="false"' : '', attrs.extraAttrs ?? ''].join('')
  return `<section class="ss-slide" id="${id}" data-transition="${attrs.transition ?? 'fade'}"${
    style ? ` style="${style}"` : ''
  }${flags}>${body}</section>`
}

export function h1(text: string, o: AnimOpts = {}): string {
  return `<h1 ${animAttrs(o)}>${escapeHtml(text)}</h1>`.replace('  ', ' ')
}
export function h2(text: string, o: AnimOpts = {}): string {
  return `<h2 ${animAttrs(o)}>${escapeHtml(text)}</h2>`.replace('  ', ' ')
}
export function h3(text: string, o: AnimOpts = {}): string {
  return `<h3 ${animAttrs(o)}>${escapeHtml(text)}</h3>`.replace('  ', ' ')
}
export function p(text: string, o: AnimOpts = {}): string {
  return `<p ${animAttrs(o)}>${escapeHtml(text)}</p>`.replace('  ', ' ')
}
export function sub(text: string, o: AnimOpts = {}): string {
  return `<p class="ss-sub" ${animAttrs(o)}>${escapeHtml(text)}</p>`.replace('  ', ' ')
}
export function kicker(text: string, o: AnimOpts = {}): string {
  return `<p class="ss-kicker" ${animAttrs(o)}>${escapeHtml(text)}</p>`.replace('  ', ' ')
}
export function num(text: string): string {
  return `<p class="ss-num">${escapeHtml(text)}</p>`
}
export function rule(): string {
  return '<hr class="ss-rule">'
}
export function spacer(px: number): string {
  return `<div style="height:${px}px"></div>`
}
export function btn(label: string, href = '#', kind: 'primary' | 'ghost' = 'primary', o: AnimOpts = {}): string {
  return `<a class="ss-btn ss-btn-${kind}" href="${escapeHtml(href)}" ${animAttrs(o)}>${escapeHtml(
    label,
  )}</a>`.replace('  ', ' ')
}
export function btnRow(...btns: string[]): string {
  return `<div class="ss-btn-row">${btns.join('')}</div>`
}
export function ul(items: string[], o: AnimOpts = {}): string {
  return `<ul class="ss-list" ${animAttrs(o)}>${items
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join('')}</ul>`.replace('  ', ' ')
}
export function card(title: string, text: string, o: AnimOpts = {}): string {
  return `<div class="ss-card" ${animAttrs(o)}><h3>${escapeHtml(title)}</h3><p>${escapeHtml(
    text,
  )}</p></div>`.replace('  ', ' ')
}
export function cards(...items: string[]): string {
  return `<div class="ss-cards">${items.join('')}</div>`
}
export function quote(text: string, author: string, o: AnimOpts = {}): string {
  return `<blockquote class="ss-quote-text" ${animAttrs(o)}>${escapeHtml(
    text,
  )}</blockquote><p class="ss-quote-author">${escapeHtml(author)}</p>`.replace('  ', ' ')
}
export function img(src: string, alt: string, o: AnimOpts = {}): string {
  return `<img class="ss-img" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" ${animAttrs(
    o,
  )}>`.replace('  ', ' ')
}
export function imageSlide(src: string, alt: string, children: string, attrs: SlideAttrs = {}): string {
  const id = nextSlideId()
  const style = attrs.bg ? `--slide-bg:${attrs.bg}` : ''
  return `<section class="ss-slide" id="${id}" data-transition="${
    attrs.transition ?? 'fade'
  }"${style ? ` style="${style}"` : ''}><img class="ss-media" src="${escapeHtml(
    src,
  )}" alt="${escapeHtml(alt)}"><div class="ss-scrim"></div><div class="ss-content" data-layout="image">${children}</div></section>`
}
export function table(headers: string[], rows: string[][]): string {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table class="ss-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}
