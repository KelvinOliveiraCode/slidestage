/* Modelo do documento: o HTML string é a fonte de verdade.
   Este módulo le o documento (slides, títulos) e aplica mutacoes
   estruturais do lado do app. Mudancas de elemento no canvas
   voltam do iframe como HTML completo e são adotadas tal qual. */

import { DECK_MARKER } from './buildDoc'

export interface SlideMeta {
  id: string
  index: number
  title: string
  layout: string
  transition: string
  /** duracao da transicao de entrada, ex: 420ms */
  dur: string
  /** opacidade inicial da transicao (0 a 1) */
  op: string
  /** distancia do deslocamento, ex: 48px */
  dist: string
  bg: string
  /** notas do apresentador (nao renderizam no slide) */
  notes: string
}

export interface ParsedDeck {
  html: string
  slides: SlideMeta[]
  isDeck: boolean
  title: string
}

export interface AssetRef {
  original: string
  dataUrl: string
}

const SLIDE_SELECTOR = 'section.ss-slide, [data-slide], .slide, .ss-slide'
const SKIP_TEXT_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'])

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

function serialize(doc: Document): string {
  return `<!doctype html>\n${doc.documentElement.outerHTML}`
}

function attr(el: Element, name: string): string {
  return el.getAttribute(name) ?? ''
}

/** Primeiro texto visivel do slide, usado como nome no trilho. */
function slideLabel(slide: Element, index: number): string {
  const candidates = slide.querySelectorAll('h1, h2, h3, p, li')
  for (const el of Array.from(candidates)) {
    const t = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (t) return t.length > 58 ? `${t.slice(0, 57)}…` : t
  }
  return `Slide ${index + 1}`
}

function styleVar(styleAttr: string, prop: string): string {
  const decl = styleAttr
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${prop}:`))
  return decl ? decl.slice(prop.length + 1).trim() : ''
}

function toSlideMeta(slide: Element, index: number): SlideMeta {
  const content = slide.querySelector('.ss-content')
  const styleAttr = attr(slide, 'style')
  return {
    id: attr(slide, 'id') || `slide-${index + 1}`,
    index,
    title: slideLabel(slide, index),
    layout: attr(content ?? slide, 'data-layout') || 'title',
    transition: attr(slide, 'data-transition') || 'fade',
    dur: styleVar(styleAttr, '--ss-t-dur'),
    op: styleVar(styleAttr, '--ss-t-op'),
    dist: styleVar(styleAttr, '--ss-t-dist'),
    bg: styleVar(styleAttr, '--slide-bg'),
    notes: attr(slide, 'data-notes'),
  }
}

/** Le o documento, garante ids nos slides e devolve o metadados dos slides. */
export function parseDeck(html: string): ParsedDeck {
  const doc = parse(html)
  const slides = Array.from(doc.querySelectorAll(SLIDE_SELECTOR))
  slides.forEach((el, i) => {
    if (!attr(el, 'id')) el.setAttribute('id', `slide-${i + 1}`)
  })
  const metas = slides.map(toSlideMeta)
  const titleMatch = doc.querySelector('title')
  return {
    html: serialize(doc),
    slides: metas,
    isDeck: metas.length > 0,
    title: titleMatch?.textContent?.trim() || 'Sem título',
  }
}

function byId(doc: Document, id: string): Element | null {
  return doc.querySelector(`[data-el-id="${cssEscape(id)}"]`) ?? doc.getElementById(id)
}

/** Escapa um id para uso em seletor de atributo. */
export function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&')
}

function findSlide(doc: Document, id: string): Element | null {
  const direct = doc.getElementById(id)
  if (direct && direct.matches(SLIDE_SELECTOR)) return direct
  const el = doc.querySelector(`[data-el-id="${cssEscape(id)}"]`)
  if (el?.matches(SLIDE_SELECTOR)) return el
  return null
}

/* ------------------------------------------------------------------ */
/* Mutacoes de elemento                                               */
/* ------------------------------------------------------------------ */

export function setElementStyle(
  html: string,
  id: string,
  patch: Record<string, string>,
): string {
  const doc = parse(html)
  const raw = byId(doc, id)
  const el = raw instanceof HTMLElement ? raw : null
  if (!el) return html
  for (const [prop, value] of Object.entries(patch)) {
    if (!value) el.style.removeProperty(prop)
    else el.style.setProperty(prop, value)
  }
  return serialize(doc)
}

export function setElementAttrs(
  html: string,
  id: string,
  attrs: Record<string, string>,
): string {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el) return html
  for (const [name, value] of Object.entries(attrs)) {
    if (value === '') el.removeAttribute(name)
    else el.setAttribute(name, value)
  }
  return serialize(doc)
}

export function removeElementAttrs(html: string, id: string, names: string[]): string {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el) return html
  for (const n of names) el.removeAttribute(n)
  return serialize(doc)
}

export function setElementText(html: string, id: string, text: string): string {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el) return html
  const keepFirstTag = Array.from(el.children).length > 0
  if (keepFirstTag) {
    const first = el.children[0]
    first.textContent = text
  } else {
    el.textContent = text
  }
  return serialize(doc)
}

export function duplicateElement(html: string, id: string): string {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el || !el.parentNode) return html
  const clone = el.cloneNode(true) as Element
  clone.removeAttribute('data-el-id')
  el.parentNode.insertBefore(clone, el.nextSibling)
  return serialize(doc)
}

export function deleteElement(html: string, id: string): string {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el || el.matches(SLIDE_SELECTOR)) return html
  el.remove()
  return serialize(doc)
}

/** Ordem no eixo Z dentro do pai. */
export function reorderElement(html: string, id: string, dir: 'up' | 'down' | 'front' | 'back'): string {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el || !el.parentNode) return html
  const parent = el.parentNode
  if (dir === 'front') parent.appendChild(el)
  else if (dir === 'back') parent.insertBefore(el, parent.firstChild)
  else if (dir === 'up') {
    const next = el.nextElementSibling
    if (next) parent.insertBefore(next, el)
  } else {
    const prev = el.previousElementSibling
    if (prev) parent.insertBefore(el, prev)
  }
  return serialize(doc)
}

/* ------------------------------------------------------------------ */
/* Mutacoes de slide                                                  */
/* ------------------------------------------------------------------ */

export function addSlide(html: string, afterIndex: number, slideHtml: string): string {
  const doc = parse(html)
  const slides = Array.from(doc.querySelectorAll(SLIDE_SELECTOR))
  if (!slides.length) return html
  const ref = slides[Math.min(Math.max(afterIndex, 0), slides.length - 1)]
  const injected = parse('body').createElement('div')
  injected.innerHTML = slideHtml.trim()
  const node = injected.firstElementChild
  if (!node) return html
  ref.parentNode?.insertBefore(node, ref.nextSibling)
  return serialize(doc)
}

export function deleteSlide(html: string, id: string): string {
  const doc = parse(html)
  const slide = findSlide(doc, id)
  if (!slide) return html
  const remaining = doc.querySelectorAll(SLIDE_SELECTOR)
  if (remaining.length <= 1) return html
  slide.remove()
  return serialize(doc)
}

export function duplicateSlide(html: string, id: string): string {
  const doc = parse(html)
  const slide = findSlide(doc, id)
  if (!slide?.parentNode) return html
  const clone = slide.cloneNode(true) as Element
  clone.removeAttribute('data-el-id')
  slide.parentNode.insertBefore(clone, slide.nextSibling)
  return serialize(doc)
}

export function moveSlide(html: string, id: string, dir: -1 | 1): string {
  const doc = parse(html)
  const slide = findSlide(doc, id)
  if (!slide?.parentNode) return html
  const sibling = dir === 1 ? slide.nextElementSibling : slide.previousElementSibling
  if (!sibling) return html
  if (dir === 1) slide.parentNode.insertBefore(sibling, slide)
  else slide.parentNode.insertBefore(slide, sibling)
  return serialize(doc)
}

export function replaceSlideInner(html: string, id: string, inner: string): string {
  const doc = parse(html)
  const slide = findSlide(doc, id)
  if (!slide) return html
  const injected = parse('body').createElement('div')
  injected.innerHTML = inner
  slide.replaceChildren(...Array.from(injected.children))
  return serialize(doc)
}

export function setSlideAttrs(
  html: string,
  id: string,
  patch: {
    transition?: string
    bg?: string
    ink?: string
    layout?: string
    timing?: { dur?: string; op?: string; dist?: string }
    notes?: string
  },
): string {
  const doc = parse(html)
  const slide = findSlide(doc, id)
  if (!slide) return html
  if (patch.transition) slide.setAttribute('data-transition', patch.transition)
  if (slide instanceof HTMLElement) {
    const timing = patch.timing
    if (timing) {
      if (timing.dur !== undefined) {
        if (timing.dur) slide.style.setProperty('--ss-t-dur', timing.dur)
        else slide.style.removeProperty('--ss-t-dur')
      }
      if (timing.op !== undefined) {
        if (timing.op) slide.style.setProperty('--ss-t-op', timing.op)
        else slide.style.removeProperty('--ss-t-op')
      }
      if (timing.dist !== undefined) {
        if (timing.dist) slide.style.setProperty('--ss-t-dist', timing.dist)
        else slide.style.removeProperty('--ss-t-dist')
      }
    }
    if (patch.bg !== undefined) {
      if (patch.bg) slide.style.setProperty('--slide-bg', patch.bg)
      else slide.style.removeProperty('--slide-bg')
    }
    if (patch.ink !== undefined) {
      if (patch.ink) slide.style.setProperty('--slide-ink', patch.ink)
      else slide.style.removeProperty('--slide-ink')
    }
  }
  if (patch.layout) {
    const content = slide.querySelector('.ss-content')
    if (content) content.setAttribute('data-layout', patch.layout)
  }
  if (patch.notes !== undefined) {
    if (patch.notes) slide.setAttribute('data-notes', patch.notes)
    else slide.removeAttribute('data-notes')
  }
  return serialize(doc)
}

/* ------------------------------------------------------------------ */
/* Assets: descobrir referencias locais e aplicar data URLs           */
/* ------------------------------------------------------------------ */

export function extractAssetRefs(html: string): string[] {
  const doc = parse(html)
  const refs = new Set<string>()
  for (const el of Array.from(doc.querySelectorAll('[src],[href]'))) {
    const value = el.getAttribute('src') ?? el.getAttribute('href') ?? ''
    if (!value || /^(data:|https?:|mailto:|tel:|#|\/\/)/i.test(value)) continue
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) continue
    refs.add(value)
  }
  return Array.from(refs)
}

/** Substitui src e href locais pelas data URLs embutidas. */
export function applyDataUrls(html: string, refs: AssetRef[]): string {
  if (!refs.length) return html
  const map = new Map(refs.map((r) => [r.original, r.dataUrl]))
  const doc = parse(html)
  for (const el of Array.from(doc.querySelectorAll('[src],[href]'))) {
    for (const name of ['src', 'href']) {
      const value = el.getAttribute(name)
      if (!value) continue
      const hit = map.get(value)
      if (hit) el.setAttribute(name, hit)
    }
  }
  return serialize(doc)
}

/* ------------------------------------------------------------------ */
/* Utilidades de leitura usadas pelo inspetor                          */
/* ------------------------------------------------------------------ */

export function readElementInfo(html: string, id: string): {
  found: boolean
  tag: string
  text: string
  styles: Record<string, string>
  attrs: Record<string, string>
} {
  const doc = parse(html)
  const el = byId(doc, id)
  if (!el) return { found: false, tag: '', text: '', styles: {}, attrs: {} }
  const styles: Record<string, string> = {}
  const inline = el.getAttribute('style')
  if (inline) {
    for (const decl of inline.split(';')) {
      const [prop, ...rest] = decl.split(':')
      if (prop?.trim()) styles[prop.trim()] = rest.join(':').trim()
    }
  }
  const attrs: Record<string, string> = {}
  for (const a of Array.from(el.attributes)) attrs[a.name] = a.value
  return {
    found: true,
    tag: el.tagName.toLowerCase(),
    text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
    styles,
    attrs,
  }
}

/** Insere um elemento novo (marcado com data-el-id) dentro de um slide. */
export function insertElement(html: string, slideId: string, elementHtml: string): string {
  const doc = parse(html)
  const slide = findSlide(doc, slideId)
  if (!slide) return html
  const host = slide.querySelector('.ss-content') ?? slide
  const injected = parse('body').createElement('div')
  injected.innerHTML = elementHtml.trim()
  const node = injected.firstElementChild
  if (!node) return html
  if (!node.getAttribute('data-el-id')) node.setAttribute('data-el-id', `el-${Date.now().toString(36)}`)
  host.appendChild(node)
  return serialize(doc)
}

/** HTML do documento sem os dois marcadores de deck (para exportar bagunca externa). */
export function isDeckDocument(html: string): boolean {
  return html.includes(DECK_MARKER) || /class="[^"]*ss-slide/.test(html)
}

/** Algum texto legivel no documento? Usado no estado vazio. */
export function hasVisibleText(html: string): boolean {
  const doc = parse(html)
  const walker = doc.createTreeWalker(doc.body, 4 /* NodeFilter.SHOW_TEXT */)
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent?.trim()
    if (t && !SKIP_TEXT_TAGS.has(walker.currentNode.parentElement?.tagName ?? '')) return true
  }
  return false
}
