/* Store do app. O HTML string é a fonte de verdade: o iframe edita o
 * DOM e devolve o documento; o app edita o documento e recarrega o
 * iframe. Undo/redo funciona nos dois caminhos porque tudo vira
 * snapshot do HTML. */

import { useSyncExternalStore } from 'react'

import { baseDirOf, ipc, onFileChanged, type RecentFile } from './ipc'
import { listen, emit, type UnlistenFn } from '@tauri-apps/api/event'
import {
  addSlide,
  applyDataUrls,
  deleteSlide,
  duplicateSlide,
  extractAssetRefs,
  insertElement,
  moveSlide,
  parseDeck,
  replaceSlideInner,
  setSlideAttrs,
  type SlideMeta,
} from './doc'
import type { EditorOp } from './editor'
import { injectEditorBits, withAppHost } from './editor'
import { buildStarterDeck, readTitle } from './buildDoc'
import type { Layout } from './snippets'
import { escapeHtml } from './snippets'
import { templateById } from './templates'

export type View = 'view' | 'edit' | 'code'
export type Device = 'desktop' | 'phone'

export interface SelComputed {
  fontSize: string
  fontWeight: string
  color: string
  backgroundColor: string
  textAlign: string
  position: string
  width: string
  height: string
  borderRadius: string
}

export interface SelInfo {
  id: string
  tag: string
  text: string
  slideId: string
  inline: string
  href: string
  target: string
  className: string
  dataAnim: string
  computed: SelComputed
}

export interface Toast {
  id: number
  kind: 'ok' | 'info' | 'error'
  text: string
}

export interface State {
  html: string
  path: string | null
  dirty: boolean
  /** modo do palco: visualizar (previa), editar (canvas) ou codigo */
  view: View
  slides: SlideMeta[]
  current: number
  selected: string | null
  sel: SelInfo | null
  deckDetected: boolean
  title: string
  /** cores efetivas do slide atual, lidas do deck (fundo e texto) */
  slideColors: { bg: string; ink: string }
  /** linhas de enquadracao ligadas (preferencia guardada no aparelho) */
  guias: boolean
  presenting: boolean
  galleryOpen: boolean
  helpOpen: boolean
  zoom: number
  device: Device
  toast: Toast | null
  recents: RecentFile[]
  externalChange: string | null
  /** incrementa quando o iframe precisa ser recarregado */
  tick: number
  busy: boolean
  /** janela do apresentador aberta */
  presenterOpen: boolean
}

const HISTORY_CAP = 120

function makeToken(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function uniqueSlideId(existing: string[]): string {
  let n = existing.length + 1
  while (existing.includes(`slide-${n}`)) n += 1
  return `slide-${n}`
}

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 48) || 'deck'
  )
}

/** Section nova para cada layout do menu Adicionar slide. */
export function newSlideSection(layout: Layout, ids: string[]): string {
  const id = uniqueSlideId(ids)
  const open = `<section class="ss-slide" id="${id}" data-transition="fade">`
  const content = (inner: string, l: Layout): string =>
    `<div class="ss-content" data-layout="${l}">${inner}</div>`
  const bodies: Record<Layout, string> = {
    title: content('<h1>Seu título</h1><p class="ss-sub">Subtítulo ou contexto</p>', 'title'),
    statement: content('<h2>Sua afirmação</h2><p>Texto de apoio em uma ou duas frases.</p>', 'statement'),
    split: content(
      '<div><h2>Um lado</h2><p>Explique aqui.</p></div><div><p>Área para imagem ou dado.</p></div>',
      'split',
    ),
    cards: content(
      '<h2>Três cartões</h2><div class="ss-cards"><div class="ss-card"><h3>Cartao um</h3><p>Texto do cartão.</p></div><div class="ss-card"><h3>Cartao dois</h3><p>Texto do cartão.</p></div><div class="ss-card"><h3>Cartao três</h3><p>Texto do cartão.</p></div></div>',
      'cards',
    ),
    list: content('<h2>Topicos</h2><ul class="ss-list"><li>Primeiro tópico</li><li>Segundo tópico</li><li>Terceiro tópico</li></ul>', 'list'),
    quote: content('<blockquote class="ss-quote-text">Uma citação de destaque.</blockquote><p class="ss-quote-author">Autor ou fonte</p>', 'quote'),
    image: content('<h2>Legenda sobre a imagem</h2>', 'image'),
    blank: content('', 'blank'),
  }
  return `${open}${bodies[layout]}</section>`
}

let elSeq = 0
function freshElId(): string {
  elSeq += 1
  return `el-${elSeq}`
}

const CHAVE_GUIAS = 'slidestage-guias'

function lerPrefGuias(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_GUIAS) === '1'
  } catch {
    return false
  }
}

function guardarPrefGuias(valor: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_GUIAS, valor ? '1' : '0')
  } catch {
    /* modo privado: a preferencia vale so para esta sessao */
  }
}

class Store {
  token = makeToken()
  private presenterControlUnlisten: UnlistenFn | null = null

  private state: State = {
    html: buildStarterDeck(),
    path: null,
    dirty: false,
    view: 'edit',
    slides: [],
    current: 0,
    selected: null,
    sel: null,
    deckDetected: true,
    title: 'Minha apresentação',
    slideColors: { bg: '', ink: '' },
    guias: lerPrefGuias(),
    presenting: false,
    galleryOpen: false,
    helpOpen: false,
    zoom: 1,
    device: 'desktop',
    toast: null,
    recents: [],
    externalChange: null,
    tick: 0,
    busy: false,
    presenterOpen: false,
  }

  private listeners = new Set<() => void>()
  private history: string[] = []
  private future: string[] = []
  private savedHtml = this.state.html
  private toastSeq = 0

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = (): State => this.state

  private set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l()
  }

  /* ---------------- carga e savalacoes ---------------- */

  async init(): Promise<void> {
    const parsed = parseDeck(this.state.html)
    this.set({
      slides: parsed.slides,
      deckDetected: parsed.isDeck,
      title: parsed.title,
    })
    try {
      this.set({ recents: await ipc.recents() })
    } catch {
      this.set({ recents: [] })
    }
    void onFileChanged((path) => {
      if (path === this.getSnapshot().path) this.set({ externalChange: path })
    }).catch(() => {
      /* fora do app ( navegador puro ) não existe watch: segue sem aviso */
    })
  }

  /** Aplica HTML vindo do iframe (já limpo, sem os elementos do editor). */
  adoptFromIframe(html: string): void {
    const prev = this.state.html
    if (prev !== html) {
      this.history.push(prev)
      if (this.history.length > HISTORY_CAP) this.history.shift()
      this.future = []
    }
    const parsed = parseDeck(html)
    this.set({
      html,
      dirty: html !== this.savedHtml,
      slides: parsed.slides,
      deckDetected: parsed.isDeck,
      title: parsed.title,
      current: Math.min(this.state.current, Math.max(0, parsed.slides.length - 1)),
    })
  }

  /** Aplica HTML produzido pelo app (recarrega o iframe). */
  commitHtml(html: string, options: { dirty?: boolean; reselect?: string | null } = {}): void {
    const prev = this.state.html
    if (prev === html) return
    this.history.push(prev)
    if (this.history.length > HISTORY_CAP) this.history.shift()
    this.future = []
    const parsed = parseDeck(html)
    this.set({
      html,
      dirty: options.dirty ?? html !== this.savedHtml,
      slides: parsed.slides,
      deckDetected: parsed.isDeck,
      title: parsed.title,
      tick: this.state.tick + 1,
      current: Math.min(this.state.current, Math.max(0, parsed.slides.length - 1)),
      selected: options.reselect !== undefined ? options.reselect : this.state.selected,
    })
  }

  async loadDeck(html: string, path: string | null): Promise<void> {
    const parsed = parseDeck(html)
    this.history = []
    this.future = []
    this.savedHtml = html
    this.set({
      html,
      path,
      dirty: false,
      slides: parsed.slides,
      deckDetected: parsed.isDeck,
      title: parsed.title,
      current: 0,
      selected: null,
      sel: null,
      externalChange: null,
      tick: this.state.tick + 1,
    })
    if (path) {
      try {
        await ipc.watchDeck(path)
        this.set({ recents: await ipc.recentsRecord(path) })
      } catch {
        /* watch e recentes são conveniencia, não bloqueiam a abertura */
      }
    }
  }

  newStarter(): void {
    const html = buildStarterDeck()
    this.set({ path: null })
    void this.loadDeck(html, null)
    this.toast('info', 'Deck novo criado com três slides.')
  }

  async newFromTemplate(id: string): Promise<void> {
    const tpl = templateById(id)
    if (!tpl) return
    this.set({ path: null, galleryOpen: false })
    await this.loadDeck(tpl.build(), null)
    this.toast('ok', `Modelo "${tpl.name}" aplicado. Troque os textos pelos seus.`)
  }

  async openDialog(): Promise<void> {
    try {
      const opened = await ipc.openDialog()
      if (!opened) return
      await this.loadDeck(opened.html, opened.path)
      this.toast('info', 'Arquivo aberto. Edite no canvas ou no código.')
    } catch (err) {
      this.toast('error', `Não foi possível abrir: ${message(err)}`)
    }
  }

  async save(): Promise<void> {
    const { path, html } = this.state
    if (!path) {
      await this.saveAs()
      return
    }
    try {
      await ipc.writeDeck(path, html)
      this.set({ dirty: false })
      this.toast('ok', `Salvo em ${path}`)
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  async saveAs(): Promise<void> {
    const name = `${slug(this.state.title)}.html`
    try {
      const saved = await ipc.exportDialog(name, this.state.html)
      if (!saved) return
      await this.loadDeck(this.state.html, saved)
      this.set({ dirty: false })
      this.toast('ok', `Salvo em ${saved}`)
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  /** Exporta HTML único: embute os assets locais antes de salvar. */
  async exportFile(): Promise<void> {
    let html = this.state.html
    const base = this.state.path ? baseDirOf(this.state.path) : null
    if (base) {
      const refs = extractAssetRefs(html)
      if (refs.length) {
        try {
          const assets = await ipc.inlineAssets(base, refs)
          html = applyDataUrls(html, assets)
        } catch {
          this.toast('error', 'Alguma imagem local não pode ser embutida. O arquivo seguiu sem ela.')
        }
      }
    }
    const name = `${slug(readTitle(html))}.html`
    try {
      const saved = await ipc.exportDialog(name, html)
      if (!saved) return
      if (saved !== this.state.path) await this.loadDeck(html, saved)
      else this.commitHtml(html)
      this.set({ dirty: false })
      this.toast('ok', `Arquivo único salvo em ${saved}. Abra em qualquer navegador.`)
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  async publish(): Promise<void> {
    try {
      const saved = await ipc.publishDialog(this.state.html)
      if (!saved) return
      this.toast(
        'ok',
        'index.html salvo. Para publicar: suba a pasta em um repositório do GitHub e ative o Pages em Settings, Pages, branch main.',
      )
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  async openInBrowser(): Promise<void> {
    if (!this.state.path) {
      this.toast('info', 'Salve o arquivo antes de abrir no navegador.')
      return
    }
    try {
      await ipc.openInBrowser(this.state.path)
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  async revealFolder(): Promise<void> {
    if (!this.state.path) return
    try {
      await ipc.revealDir(this.state.path)
    } catch {
      /* falha silenciosa: revelar pasta é conveniência */
    }
  }

  async reloadFromDisk(): Promise<void> {
    const path = this.state.externalChange ?? this.state.path
    if (!path) return
    try {
      const html = await ipc.readDeck(path)
      await this.loadDeck(html, path)
      this.toast('ok', 'Arquivo recarregado do disco.')
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  dismissExternal(): void {
    this.set({ externalChange: null })
  }

  async openRecent(path: string): Promise<void> {
    try {
      const html = await ipc.readDeck(path)
      await this.loadDeck(html, path)
    } catch (err) {
      this.toast('error', `${message(err)} O arquivo pode ter sido movido.`)
      this.set({ recents: await ipc.recentsRemove(path).catch(() => this.state.recents) })
    }
  }

  async removeRecent(path: string): Promise<void> {
    try {
      this.set({ recents: await ipc.recentsRemove(path) })
    } catch {
      /* ignora */
    }
  }

  /* ---------------- interface ---------------- */

  setView(view: View): void {
    this.set({ view })
    if (view !== 'edit') {
      this.set({ selected: null, sel: null })
    }
  }

  /** Ctrl+E alterna entre visualizar e editar (o codigo fica no segmentado). */
  toggleView(): void {
    this.setView(this.state.view === 'edit' ? 'view' : 'edit')
  }

  setDevice(device: Device): void {
    this.set({ device })
  }

  setZoom(zoom: number): void {
    this.set({ zoom: Math.min(1.6, Math.max(0.4, zoom)) })
  }

  openGallery(open: boolean): void {
    this.set({ galleryOpen: open })
  }

  openHelp(open: boolean): void {
    this.set({ helpOpen: open })
  }

  setPresenting(on: boolean): void {
    this.set({ presenting: on })
  }

  /** Abre a janela do apresentador e inicia a sincronização. */
  async openPresenterWindow(): Promise<void> {
    if (this.state.presenterOpen) return
    try {
      await ipc.openPresenterWindow()
      this.set({ presenterOpen: true })
      await this.startPresenterSync()
      this.toast('info', 'Janela do apresentador aberta. Use setas/espaço para navegar, T para timer.')
    } catch (err) {
      this.toast('error', `Não foi possível abrir a janela do apresentador: ${err instanceof Error ? err.message : err}`)
    }
  }

  /** Fecha a janela do apresentador e para a sincronização. */
  async closePresenterWindow(): Promise<void> {
    if (!this.state.presenterOpen) return
    try {
      await ipc.closePresenterWindow()
    } catch {
      /* ignora erro de fechamento */
    }
    this.stopPresenterSync()
    this.set({ presenterOpen: false })
  }

  /** Alterna a janela do apresentador. */
  async togglePresenterWindow(): Promise<void> {
    if (this.state.presenterOpen) {
      await this.closePresenterWindow()
    } else {
      await this.openPresenterWindow()
    }
  }

  /** Inicia a escuta de comandos do apresentador e envia estado periódico. */
  private async startPresenterSync(): Promise<void> {
    if (this.presenterControlUnlisten) return
    // Escuta comandos de navegação da janela do apresentador
    this.presenterControlUnlisten = await listen<{ type: string; direction?: string; index?: number }>(
      'presenter-control',
      (event) => {
        const { direction, index } = event.payload
        if (direction === 'prev') this.goto(this.state.current - 1)
        else if (direction === 'next') this.goto(this.state.current + 1)
        else if (direction === 'goto' && typeof index === 'number') this.goto(index)
        // Confirma a navegação
        emit('presenter-control-ack', { type: 'navigate', index: this.state.current })
      },
    )
    // Responde a pedidos de estado inicial
    const unlistenRequest = await listen('presenter-request-state', () => {
      this.sendPresenterState()
    })
    // Envia estado inicial e periódico
    this.sendPresenterState()
    const interval = window.setInterval(() => this.sendPresenterState(), 500)
    // Guarda a cleanup do interval no unlisten do control (aproximação)
    const originalUnlisten = this.presenterControlUnlisten
    this.presenterControlUnlisten = async () => {
      await originalUnlisten()
      await unlistenRequest()
      window.clearInterval(interval)
    }
  }

  /** Para a sincronização com a janela do apresentador. */
  private stopPresenterSync(): void {
    if (this.presenterControlUnlisten) {
      this.presenterControlUnlisten()
      this.presenterControlUnlisten = null
    }
  }

  /** Envia o estado atual do deck para a janela do apresentador. */
  private sendPresenterState(): void {
    const { slides, current, html } = this.state
    if (!slides.length) return
    const currentSlide = slides[current]
    const nextSlide = slides[current + 1]
    const state = {
      html,
      currentSlide: current,
      totalSlides: slides.length,
      slideTitle: currentSlide?.title || `Slide ${current + 1}`,
      slideNotes: currentSlide?.notes || '',
      nextSlideTitle: nextSlide?.title || '—',
      nextSlideNotes: nextSlide?.notes || '',
    }
    emit('deck-state-update', state)
  }

  toast(kind: Toast['kind'], text: string): void {
    this.toastSeq += 1
    this.set({ toast: { id: this.toastSeq, kind, text } })
  }

  dismissToast(id: number): void {
    if (this.state.toast?.id === id) this.set({ toast: null })
  }

  /* ---------------- selecao e canvas ---------------- */

  goto(index: number): void {
    const clamped = Math.min(Math.max(index, 0), Math.max(0, this.state.slides.length - 1))
    if (clamped !== this.state.current) {
      this.set({ current: clamped })
      if (this.state.presenterOpen) this.sendPresenterState()
    }
  }

  /** Cores que o deck reportou para o slide atual. */
  setSlideColors(colors: { bg: string; ink: string }): void {
    this.set({ slideColors: colors })
  }

  /** Liga ou desliga as linhas de enquadramento (guardado no aparelho). */
  setGuias(ligadas: boolean): void {
    this.set({ guias: ligadas })
    guardarPrefGuias(ligadas)
  }

  setSelection(info: SelInfo | null): void {
    if (!info) {
      this.set({ selected: null, sel: null })
      return
    }
    this.set({ selected: info.id, sel: info })
  }

  clearSelection(): void {
    this.set({ selected: null, sel: null })
  }

  /** Envia operacoes para o editor do iframe (caminho quente, sem recarregar). */
  sendOps(ops: EditorOp[]): void {
    const frame = document.querySelector<HTMLIFrameElement>('#stage-frame')
    frame?.contentWindow?.postMessage(
      { source: 'slide-stage-parent', token: this.token, t: 'ops', ops },
      '*',
    )
  }

  gotoInFrame(index: number): void {
    const frame = document.querySelector<HTMLIFrameElement>('#stage-frame')
    frame?.contentWindow?.postMessage(
      { source: 'slide-stage-parent', token: this.token, t: 'goto', index },
      '*',
    )
  }

  selectInFrame(id: string | null): void {
    if (!id) return
    const frame = document.querySelector<HTMLIFrameElement>('#stage-frame')
    frame?.contentWindow?.postMessage(
      { source: 'slide-stage-parent', token: this.token, t: 'select', id },
      '*',
    )
  }

  /** Abre o diálogo de impressão do sistema para o deck (o usuário escolhe 'Salvar como PDF'). */
  printDeck(): void {
    const frame = document.querySelector<HTMLIFrameElement>('#stage-frame')
    frame?.contentWindow?.print()
  }

  patchStyle(patch: Record<string, string>): void {
    const id = this.state.selected
    if (!id) return
    this.sendOps([{ k: 'style', id, patch }])
  }

  patchAttrs(attrs: Record<string, string>): void {
    const id = this.state.selected
    if (!id) return
    const ops: EditorOp[] = Object.entries(attrs).map(([name, val]) => ({ k: 'attr', id, name, val }))
    this.sendOps(ops)
  }

  setText(text: string): void {
    const id = this.state.selected
    if (!id) return
    this.sendOps([{ k: 'text', id, text }])
  }

  duplicateSelected(): void {
    const id = this.state.selected
    if (!id) return
    this.sendOps([{ k: 'struct', op: 'duplicate', id }])
    this.clearSelection()
  }

  deleteSelected(): void {
    const id = this.state.selected
    if (!id) return
    this.sendOps([{ k: 'struct', op: 'delete', id }])
    this.clearSelection()
  }

  reorderSelected(dir: 'up' | 'down' | 'front' | 'back'): void {
    const id = this.state.selected
    if (!id) return
    this.sendOps([{ k: 'struct', op: dir, id }])
  }

  undo(): void {
    const prev = this.history.pop()
    if (prev === undefined) {
      this.toast('info', 'Nada para desfazer.')
      return
    }
    this.future.push(this.state.html)
    const parsed = parseDeck(prev)
    this.set({
      html: prev,
      slides: parsed.slides,
      title: parsed.title,
      tick: this.state.tick + 1,
      dirty: prev !== this.savedHtml,
    })
  }

  redo(): void {
    const next = this.future.pop()
    if (next === undefined) {
      this.toast('info', 'Nada para refazer.')
      return
    }
    this.history.push(this.state.html)
    const parsed = parseDeck(next)
    this.set({
      html: next,
      slides: parsed.slides,
      title: parsed.title,
      tick: this.state.tick + 1,
      dirty: next !== this.savedHtml,
    })
  }

  /* ---------------- slides ---------------- */

  addSlide(layout: Layout): void {
    const ids = this.state.slides.map((s) => s.id)
    const section = newSlideSection(layout, ids)
    const after = this.state.current
    const html = addSlide(this.state.html, after, section)
    if (html === this.state.html) {
      this.toast('error', 'Este documento não tem slides detectados para adicionar.')
      return
    }
    this.commitHtml(html)
    this.goto(after + 1)
    this.toast('info', 'Slide adicionado.')
  }

  deleteSlide(id: string): void {
    const html = deleteSlide(this.state.html, id)
    if (html === this.state.html) {
      this.toast('info', 'Um deck precisa de pelo menos um slide.')
      return
    }
    this.commitHtml(html, { reselect: null })
  }

  duplicateSlide(id: string): void {
    const html = duplicateSlide(this.state.html, id)
    this.commitHtml(html)
  }

  moveSlide(id: string, dir: -1 | 1): void {
    const html = moveSlide(this.state.html, id, dir)
    if (html === this.state.html) return
    this.commitHtml(html)
    const idx = this.state.slides.findIndex((s) => s.id === id)
    this.goto(idx + dir)
  }

  setSlideTransition(id: string, transition: string): void {
    this.commitHtml(setSlideAttrs(this.state.html, id, { transition }))
  }

  /** Ajustes finos da transicao: velocidade, opacidade inicial e distancia. */
  setSlideTransitionTiming(
    id: string,
    timing: { dur?: string; op?: string; dist?: string },
  ): void {
    this.commitHtml(setSlideAttrs(this.state.html, id, { timing }))
  }

  setSlideBg(id: string, bg: string): void {
    this.commitHtml(setSlideAttrs(this.state.html, id, { bg }))
  }

  setSlideLayout(id: string, layout: Layout): void {
    const section = newSlideSection(layout, [])
    const inner = section.replace(/^<section[^>]*>/, '').replace(/<\/section>$/, '')
    this.commitHtml(replaceSlideInner(this.state.html, id, inner), { reselect: null })
  }

  setSlideNotes(id: string, notes: string): void {
    this.commitHtml(setSlideAttrs(this.state.html, id, { notes }))
  }

  /* ---------------- inserir elementos ---------------- */

  private currentSlideId(): string {
    return this.state.slides[this.state.current]?.id ?? this.state.slides[0]?.id ?? ''
  }

  addElement(
    kind: 'title' | 'text' | 'button' | 'list' | 'shape' | 'quote' | 'spacer',
    at?: { x: number; y: number },
  ): void {
    const slideId = this.currentSlideId()
    if (!slideId) {
      this.toast('error', 'Selecione um slide antes de adicionar elementos.')
      return
    }
    const id = freshElId()
    /* Sem posicao: o elemento nasce no centro do slide (left/top 50% mais
       translate), entao aparece no meio da tela em qualquer tamanho de tela.
       Com posicao (arrastado do painel): nasce onde o usuario soltou. */
    const pos = at
      ? `position:absolute;left:${Math.round(at.x)}px;top:${Math.round(at.y)}px`
      : 'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)'
    const html: Record<typeof kind, string> = {
      title: `<h1 data-el-id="${id}" style="${pos}">Seu título</h1>`,
      text: `<p data-el-id="${id}" style="${pos}">Seu texto aqui. Clique duas vezes para editar.</p>`,
      button: `<a class="ss-btn ss-btn-primary" href="#${slideId}" data-el-id="${id}" style="${pos}">Faça algo</a>`,
      list: `<ul class="ss-list" data-el-id="${id}" style="${pos}"><li>Primeiro tópico</li><li>Segundo tópico</li><li>Terceiro tópico</li></ul>`,
      shape: `<div data-el-id="${id}" style="${pos};width:220px;height:130px;background:#F5B841;border-radius:12px"></div>`,
      quote: `<blockquote class="ss-quote-text" data-el-id="${id}" style="${pos}">Uma citação de destaque.</blockquote>`,
      spacer: `<div data-el-id="${id}" style="${pos};height:48px;width:120px"></div>`,
    }
    this.commitHtml(insertElement(this.state.html, slideId, html[kind]), { reselect: id })
    this.toast(
      'info',
      at
        ? 'Elemento adicionado onde você soltou.'
        : 'Elemento adicionado no centro do slide. Arraste para posicionar.',
    )
  }

  async addImage(): Promise<void> {
    const slideId = this.currentSlideId()
    if (!slideId) {
      this.toast('error', 'Selecione um slide antes de adicionar imagem.')
      return
    }
    try {
      const img = await ipc.pickImage()
      if (!img) return
      const id = freshElId()
      const html = `<img class="ss-img" src="${img.dataUrl}" alt="Imagem do slide" data-el-id="${id}">`
      this.commitHtml(insertElement(this.state.html, slideId, html), { reselect: id })
    } catch (err) {
      this.toast('error', message(err))
    }
  }

  /** Aplica um modelo sobre o deck atual, mantendo o caminho do arquivo. */
  async applyTemplate(id: string): Promise<void> {
    const tpl = templateById(id)
    if (!tpl) return
    this.commitHtml(tpl.build())
    this.set({ galleryOpen: false, current: 0, selected: null, sel: null })
    this.toast('ok', `Modelo "${tpl.name}" aplicado.`)
  }

  /* ---------------- utilitarios ---------------- */

  setTitle(title: string): void {
    const has = /<title[^>]*>[\s\S]*?<\/title>/i.test(this.state.html)
    const html = has
      ? this.state.html.replace(
          /<title[^>]*>[\s\S]*?<\/title>/i,
          `<title>${escapeHtml(title)}</title>`,
        )
      : this.state.html.replace(/<head([^>]*)>/i, `<head$1><title>${escapeHtml(title)}</title>`)
    this.commitHtml(html)
  }

  /** Documento que o iframe carrega, conforme o modo do palco. */
  stageDoc(baseHref: string | null): string {
    if (this.state.view === 'edit') return injectEditorBits(this.state.html, this.token, baseHref)
    return withAppHost(this.state.html)
  }

  /** Forca a recarga do palco (usado quando o canvas sai do deck). */
  reloadStage(): void {
    this.set({ tick: this.state.tick + 1 })
  }
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

export const store = new Store()

export function useStore(): State {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}
