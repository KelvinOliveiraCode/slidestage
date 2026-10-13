/* Editor injetado no iframe durante a edição visual.
 *
 * O código roda dentro do documento do deck. Ele é escrito como função
 * TypeScript de verdade e serializado com toString(), então o compilador
 * o verifica: nada de script em string solta sem checagem.
 *
 * Responsabilidades:
 * - dar data-el-id estavel para cada elemento
 * - contorno de hover, selecao, arrastar, redimensionar, edição de texto
 * - reportar o HTML completo e limpo de volta para o app (fonte de verdade)
 * - receber operacoes do inspetor e do trilho de slides
 */

export type EditorOp =
  | { k: 'style'; id: string; patch: Record<string, string> }
  | { k: 'attr'; id: string; name: string; val: string }
  | { k: 'rmAttr'; id: string; names: string[] }
  | { k: 'text'; id: string; text: string }
  | { k: 'struct'; op: 'duplicate' | 'delete' | 'up' | 'down' | 'front' | 'back'; id: string }

type ParentMsg = {
  source: 'slide-stage-parent'
  token: string
  t: 'goto' | 'select' | 'ops' | 'ping' | 'settings'
  index?: number
  id?: string
  ops?: EditorOp[]
  guias?: boolean
}

export function editorMain(token: string): void {
  /* Tudo que esta função usa precisa viver DENTRO dela: o editor é
   * serializado com toString() e injetado no iframe, onde nada do módulo
   * existe. Constante de módulo aqui dentro = ReferenceError no iframe. */
  const SKIP_TAGS = new Set([
    'HTML', 'HEAD', 'BODY', 'SCRIPT', 'STYLE', 'META', 'TITLE', 'BASE', 'LINK', 'NOSCRIPT', 'BR',
  ])
  const OVERLAY_ID = 'ss-editor'
  const STYLE_ID = 'ss-editor-style'

  const EDITOR_CSS = `
#${OVERLAY_ID}{position:fixed;inset:0;pointer-events:none;z-index:2147483640;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
#${OVERLAY_ID} .ss-box{position:fixed;display:none;border-radius:2px}
#${OVERLAY_ID} #ss-hover{outline:1.5px dashed #F5B841;outline-offset:1px}
#${OVERLAY_ID} #ss-select{outline:2px solid #F5B841;outline-offset:0}
#${OVERLAY_ID} #ss-select.is-on{display:block}
#${OVERLAY_ID} #ss-hover.is-on{display:block}
#${OVERLAY_ID} .ss-handle{position:absolute;width:11px;height:11px;background:#0B0D10;
  border:2px solid #F5B841;border-radius:2px;pointer-events:auto}
#${OVERLAY_ID} .ss-handle[data-dir="nw"]{left:-6px;top:-6px;cursor:nwse-resize}
#${OVERLAY_ID} .ss-handle[data-dir="n"]{left:calc(50% - 5px);top:-6px;cursor:ns-resize}
#${OVERLAY_ID} .ss-handle[data-dir="ne"]{right:-6px;top:-6px;cursor:nesw-resize}
#${OVERLAY_ID} .ss-handle[data-dir="e"]{right:-6px;top:calc(50% - 5px);cursor:ew-resize}
#${OVERLAY_ID} .ss-handle[data-dir="se"]{right:-6px;bottom:-6px;cursor:nwse-resize}
#${OVERLAY_ID} .ss-handle[data-dir="s"]{left:calc(50% - 5px);bottom:-6px;cursor:ns-resize}
#${OVERLAY_ID} .ss-handle[data-dir="sw"]{left:-6px;bottom:-6px;cursor:nesw-resize}
#${OVERLAY_ID} .ss-handle[data-dir="w"]{left:-6px;top:calc(50% - 5px);cursor:ew-resize}
#${OVERLAY_ID} #ss-guides{position:fixed;inset:0;display:none}
#${OVERLAY_ID} #ss-guides.is-on{display:block}
#${OVERLAY_ID} .ss-guide{position:absolute;background:#F5B841;opacity:.5}
#${OVERLAY_ID} #ss-tools{position:fixed;display:none;gap:4px;padding:4px;
  background:#12161B;border:1px solid #303A45;border-radius:10px;pointer-events:auto;
  box-shadow:0 10px 28px rgb(0 0 0 / .5)}
#${OVERLAY_ID} #ss-tools.is-on{display:flex}
#${OVERLAY_ID} #ss-tools button{all:unset;display:grid;place-items:center;width:30px;height:30px;
  border-radius:7px;color:#F2F5F7;cursor:pointer;font-size:13px;line-height:1;font-weight:650}
#${OVERLAY_ID} #ss-tools button:hover{background:#1D242C;color:#F5B841}
#${OVERLAY_ID} #ss-tag{position:fixed;display:none;padding:3px 8px;background:#F5B841;color:#171003;
  font-size:11px;font-weight:650;border-radius:6px;pointer-events:none;white-space:nowrap}
#${OVERLAY_ID} #ss-tag.is-on{display:block}
/* Linhas de enquadramento: moldura do slide, centro e tercos. */
#${OVERLAY_ID} #ss-enquadramento{position:fixed;display:none;pointer-events:none}
#${OVERLAY_ID} #ss-enquadramento.is-on{display:block}
#${OVERLAY_ID} .ss-linha{position:absolute;background:rgb(127 208 255 / .28)}
#${OVERLAY_ID} .ss-linha.centro{background:rgb(127 208 255 / .55)}
#${OVERLAY_ID} .ss-quadro{position:absolute;inset:0;border:1px dashed rgb(127 208 255 / .32)}
[contenteditable="true"]{outline:2px solid #F5B841 !important;outline-offset:2px}
.ss-dragging, .ss-dragging *{user-select:none !important}
`

  const doc = document
  const root = doc.documentElement
  root.setAttribute('data-ss-edit', '')

  const post = (payload: Record<string, unknown>): void => {
    try {
      window.parent.postMessage({ source: 'slide-stage-editor', token, ...payload }, '*')
    } catch {
      /* o pai pode não existir (deck aberto fora do app) */
    }
  }

  /** HTML limpo: sem os elementos do proprio editor, sem atributos de edicao. */
  const serialize = (): string => {
    const clone = root.cloneNode(true) as HTMLElement
    clone.removeAttribute('data-ss-edit')
    clone.removeAttribute('data-ss-host')
    // O script do editor, o estilo, a camada visual e o base sao do app:
    // se ficassem no documento, rodariam de novo em cada carga (e no
    // modo visualizar), e o HTML salvo carregaria o editor inteiro.
    for (const sel of [`#${OVERLAY_ID}`, `#${STYLE_ID}`, '#ss-editor-script', 'base']) {
      clone.querySelector(sel)?.remove()
    }
    for (const el of Array.from(clone.querySelectorAll('[contenteditable],[spellcheck]'))) {
      el.removeAttribute('contenteditable')
      el.removeAttribute('spellcheck')
    }
    return `<!doctype html>\n${clone.outerHTML}`
  }

  const postMutation = (reason: string): void => {
    post({ type: 'mutation', html: serialize(), reason })
  }

  /* ---------------------------------------------------------------- */
  /* ids estaveis                                                    */
  /* ---------------------------------------------------------------- */

  function nextId(): string {
    let max = 0
    for (const el of Array.from(doc.body.querySelectorAll('[data-el-id]'))) {
      const m = /^el-(\d+)$/.exec(el.getAttribute('data-el-id') ?? '')
      if (m) max = Math.max(max, Number(m[1]))
    }
    return `el-${max + 1}`
  }

  function assignIds(): void {
    for (const el of Array.from(doc.body.querySelectorAll('*'))) {
      if (SKIP_TAGS.has(el.tagName)) continue
      if (el.closest(`#${OVERLAY_ID}`)) continue
      if (!el.getAttribute('data-el-id')) el.setAttribute('data-el-id', nextId())
    }
  }

  /* ---------------------------------------------------------------- */
  /* camada de interface do editor                                   */
  /* ---------------------------------------------------------------- */

  function makeBox(id: string): HTMLDivElement {
    const el = doc.createElement('div')
    el.id = id
    // A classe ss-box traz position:fixed; sem ela as caixas ficam
    // no fluxo do documento e top/left são ignorados (a marcação
    // apareceria no canto da tela em vez de sobre o elemento).
    el.className = 'ss-box'
    return el
  }

  const styleEl = doc.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = EDITOR_CSS
  doc.head.appendChild(styleEl)

  const hoverBox = makeBox('ss-hover')
  const selBox = makeBox('ss-select')
  const guides = makeBox('ss-guides')
  const tag = makeBox('ss-tag')
  const tools = doc.createElement('div')
  tools.id = 'ss-tools'

  const enquadramento = doc.createElement('div')
  enquadramento.id = 'ss-enquadramento'
  const HANDLE_DIRS = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
  for (const dir of HANDLE_DIRS) {
    const h = doc.createElement('div')
    h.className = 'ss-handle'
    h.dataset.dir = dir
    h.addEventListener('pointerdown', (ev) => {
      ev.stopPropagation()
      ev.preventDefault()
      if (selected) startResize(selected, ev as PointerEvent, dir)
    })
    selBox.appendChild(h)
  }

  const guideV = doc.createElement('div')
  guideV.className = 'ss-guide'
  const guideH = doc.createElement('div')
  guideH.className = 'ss-guide'
  guides.append(guideV, guideH)

  const TOOLS: { label: string; title: string; run: () => void }[] = [
    { label: 'T', title: 'Editar texto (Enter)', run: () => selected && startTextEdit(selected) },
    {
      label: 'D',
      title: 'Duplicar (Ctrl+D)',
      run: () => selected && applyOps([{ k: 'struct', op: 'duplicate', id: idOf(selected) }]),
    },
    {
      label: 'F',
      title: 'Trazer para frente',
      run: () => selected && applyOps([{ k: 'struct', op: 'front', id: idOf(selected) }]),
    },
    {
      label: 'A',
      title: 'Enviar para tras',
      run: () => selected && applyOps([{ k: 'struct', op: 'back', id: idOf(selected) }]),
    },
    {
      label: 'X',
      title: 'Excluir (Delete)',
      run: () => {
        if (!selected) return
        applyOps([{ k: 'struct', op: 'delete', id: idOf(selected) }])
        clearSelection()
      },
    },
  ]
  for (const t of TOOLS) {
    const b = doc.createElement('button')
    b.type = 'button'
    b.textContent = t.label
    b.title = t.title
    b.addEventListener('click', (ev) => {
      ev.stopPropagation()
      t.run()
    })
    tools.appendChild(b)
  }

  const overlay = doc.createElement('div')
  overlay.id = OVERLAY_ID
  overlay.append(hoverBox, guides, selBox, tools, tag, enquadramento)
  doc.body.appendChild(overlay)

  /* ---------------------------------------------------------------- */
  /* selecao                                                          */
  /* ---------------------------------------------------------------- */

  let selected: HTMLElement | null = null
  let hovered: HTMLElement | null = null
  let editingText = false
  /** Linhas de enquadramento comecam desligadas; o app manda a preferencia. */
  let guiasLigadas = false

  const idOf = (el: Element): string => el.getAttribute('data-el-id') ?? ''

  const isSlide = (el: Element | null): boolean =>
    !!el && (el.classList.contains('ss-slide') || el.hasAttribute('data-slide'))

  function pickElement(target: EventTarget | null): HTMLElement | null {
    let el = target as HTMLElement | null
    while (el && el !== doc.body) {
      if (el.closest?.(`#${OVERLAY_ID}`)) return null
      if (SKIP_TAGS.has(el.tagName)) return null
      // Espacadores de layout sao do app, nunca elementos do usuario.
      if (el.hasAttribute('data-ss-gap')) return null
      if (el.getAttribute('data-el-id') || isSlide(el)) return el
      el = el.parentElement
    }
    return null
  }

  function place(el: HTMLElement, r: { top: number; left: number; width?: number; height?: number }): void {
    el.style.top = `${Math.round(r.top)}px`
    el.style.left = `${Math.round(r.left)}px`
    if (r.width !== undefined) el.style.width = `${Math.round(r.width)}px`
    if (r.height !== undefined) el.style.height = `${Math.round(r.height)}px`
  }

  function clearSelection(): void {
    selected = null
    selBox.classList.remove('is-on')
    tools.classList.remove('is-on')
    tag.classList.remove('is-on')
    post({ type: 'deselect' })
  }

  function selectElement(el: HTMLElement | null): void {
    selected = el
    if (!el) {
      clearSelection()
      return
    }
    selBox.classList.add('is-on')
    const slide = isSlide(el)
    for (const h of Array.from(selBox.querySelectorAll<HTMLElement>('.ss-handle'))) {
      h.style.display = slide ? 'none' : ''
    }
    tools.classList.toggle('is-on', !slide)
    tag.classList.add('is-on')
    tag.textContent = el.tagName.toLowerCase()
    updateSelBox()
    const cs = getComputedStyle(el)
    post({
      type: 'select',
      id: idOf(el),
      tag: el.tagName.toLowerCase(),
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      computed: {
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        color: cs.color,
        backgroundColor: cs.backgroundColor,
        textAlign: cs.textAlign,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        borderRadius: cs.borderRadius,
      },
      inline: el.getAttribute('style') ?? '',
      href: el.getAttribute('href') ?? '',
      target: el.getAttribute('target') ?? '',
      className: el.getAttribute('class') ?? '',
      dataAnim: el.getAttribute('data-anim') ?? '',
      slideId: (el.closest('.ss-slide') as HTMLElement | null)?.id ?? '',
    })
  }

  function updateSelBox(): void {
    if (!selected) return
    const r = selected.getBoundingClientRect()
    place(selBox, r)
    place(tag, { top: r.top - 26, left: r.left })
    if (!isSlide(selected)) {
      const tw = tools.offsetWidth || 160
      place(tools, { top: Math.max(6, r.top - 46), left: Math.max(6, r.left + r.width - tw) })
    }
  }

  /* ---------------------------------------------------------------- */
  /* operacoes vindas do inspetor                                    */
  /* ---------------------------------------------------------------- */

  function findEl(id: string): HTMLElement | null {
    return doc.querySelector<HTMLElement>(`[data-el-id="${id}"]`)
  }

  function applyOps(ops: EditorOp[]): void {
    for (const op of ops) {
      if (op.k === 'struct') {
        const el = findEl(op.id)
        if (!el?.parentNode) continue
        if (op.op === 'delete') {
          if (isSlide(el)) continue
          el.remove()
        } else if (op.op === 'duplicate') {
          const clone = el.cloneNode(true) as HTMLElement
          clone.removeAttribute('data-el-id')
          clone.setAttribute('data-el-id', nextId())
          /* Desloca a copia: em cima da original elas ficariam indistinguiveis. */
          const r = el.getBoundingClientRect()
          const host = (el.closest('.ss-slide') as HTMLElement | null) ?? doc.body
          const hRect = host.getBoundingClientRect()
          clone.style.left = `${Math.round(r.left - hRect.left) + 18}px`
          clone.style.top = `${Math.round(r.top - hRect.top) + 18}px`
          el.parentNode.insertBefore(clone, el.nextSibling)
        } else if (op.op === 'front') {
          el.parentNode.appendChild(el)
        } else if (op.op === 'back') {
          el.parentNode.insertBefore(el, el.parentNode.firstChild)
        } else if (op.op === 'up') {
          const next = el.nextElementSibling
          if (next) el.parentNode.insertBefore(next, el)
        } else if (op.op === 'down') {
          const prev = el.previousElementSibling
          if (prev) el.parentNode.insertBefore(el, prev)
        }
        continue
      }
      const el = findEl(op.id)
      if (!el) continue
      if (op.k === 'style') {
        for (const [prop, value] of Object.entries(op.patch)) {
          if (!value) el.style.removeProperty(prop)
          else el.style.setProperty(prop, value)
        }
      } else if (op.k === 'attr') {
        if (!op.val) el.removeAttribute(op.name)
        else el.setAttribute(op.name, op.val)
      } else if (op.k === 'rmAttr') {
        for (const n of op.names) el.removeAttribute(n)
      } else if (op.k === 'text') {
        if (el.children.length > 0) el.children[0].textContent = op.text
        else el.textContent = op.text
      }
    }
    postMutation('ops')
    if (selected) updateSelBox()
  }

  /* ---------------------------------------------------------------- */
  /* arrastar e redimensionar                                         */
  /* ---------------------------------------------------------------- */

  /* Referencia para posicionamento: o pai posicionado do elemento (offsetParent),
     nao simplesmente o slide. Sem isso, arrastar um elemento que esta dentro
     de outro elemento ja posicionado resolvia o left/top contra o pai e o
     elemento "saltava" para longe do mouse. */
  function referencia(el: HTMLElement): { host: HTMLElement; hRect: DOMRect } {
    const pai = el.offsetParent as HTMLElement | null
    const host = pai ?? (el.closest('.ss-slide') as HTMLElement | null) ?? doc.body
    return { host, hRect: host.getBoundingClientRect() }
  }

  function ensureAbsolute(el: HTMLElement): DOMRect {
    const { hRect } = referencia(el)
    if (getComputedStyle(el).position === 'static') {
      const r = el.getBoundingClientRect()
      /* Independencia entre elementos: o elemento sai do fluxo, mas deixa
         um espaco vazio do tamanho dele no lugar. Sem isso, arrastar um
         texto puxava todos os outros para cima. */
      const gap = doc.createElement('div')
      gap.setAttribute('data-ss-gap', '')
      gap.style.width = '100%'
      gap.style.height = `${Math.round(r.height)}px`
      gap.style.flex = '0 0 auto'
      gap.style.pointerEvents = 'none'
      el.parentNode?.insertBefore(gap, el)
      el.style.position = 'absolute'
      el.style.margin = '0'
      el.style.left = `${Math.round(r.left - hRect.left)}px`
      el.style.top = `${Math.round(r.top - hRect.top)}px`
    } else if (ehCentralizado(el)) {
      /* Elemento recem-criado no centro (left/top em % + translate):
         vira pixel na primeira movimentacao, senao o translate continuaria
         deslocando ele depois. */
      const r = el.getBoundingClientRect()
      el.style.left = `${Math.round(r.left - hRect.left)}px`
      el.style.top = `${Math.round(r.top - hRect.top)}px`
      el.style.transform = 'none'
    }
    return hRect
  }

  /** true para elementos criados pelo app no centro do slide. */
  function ehCentralizado(el: HTMLElement): boolean {
    const st = el.style
    const porcentagem = (v: string): boolean => v.trim().endsWith('%')
    const temTranslate = st.transform !== '' && st.transform !== 'none'
    return (porcentagem(st.left) || porcentagem(st.top)) && temTranslate
  }

  const clamp = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max)

  function startDrag(el: HTMLElement, ev: PointerEvent): void {
    if (isSlide(el) || editingText) return
    const x0 = ev.clientX
    const y0 = ev.clientY
    let hRect: DOMRect | null = null
    let w = 0
    let h = 0
    let startLeft = 0
    let startTop = 0
    /* So sai do fluxo (e cria o espacador) quando o arrasto comeca de
       fato: um clique simples nao deve reestruturar o slide. */
    const preparar = (): boolean => {
      if (hRect) return true
      hRect = ensureAbsolute(el)
      const r = el.getBoundingClientRect()
      startLeft = r.left - hRect.left
      startTop = r.top - hRect.top
      w = r.width
      h = r.height
      return true
    }
    doc.body.classList.add('ss-dragging')

    const move = (e: PointerEvent): void => {
      preparar()
      const rect = hRect as DOMRect
      let L = startLeft + (e.clientX - x0)
      let T = startTop + (e.clientY - y0)
      const midX = rect.width / 2 - w / 2
      const midY = rect.height / 2 - h / 2
      let guideOnV = false
      let guideOnH = false
      if (Math.abs(L - midX) < 7) {
        L = midX
        guideOnV = true
      } else if (Math.abs(L) < 7) {
        L = 0
        guideOnV = true
      } else if (Math.abs(L + w - rect.width) < 7) {
        L = rect.width - w
        guideOnV = true
      }
      if (Math.abs(T - midY) < 7) {
        T = midY
        guideOnH = true
      } else if (Math.abs(T) < 7) {
        T = 0
        guideOnH = true
      } else if (Math.abs(T + h - rect.height) < 7) {
        T = rect.height - h
        guideOnH = true
      }
      L = clamp(L, 0, Math.max(0, rect.width - w))
      T = clamp(T, 0, Math.max(0, rect.height - h))
      el.style.left = `${Math.round(L)}px`
      el.style.top = `${Math.round(T)}px`
      guideV.style.display = guideOnV ? 'block' : 'none'
      guideH.style.display = guideOnH ? 'block' : 'none'
      if (guideOnV) {
        guideV.style.left = `${rect.width / 2}px`
        guideV.style.top = '0'
        guideV.style.width = '1px'
        guideV.style.height = `${rect.height}px`
      }
      if (guideOnH) {
        guideH.style.top = `${rect.height / 2}px`
        guideH.style.left = '0'
        guideH.style.height = '1px'
        guideH.style.width = `${rect.width}px`
      }
      updateSelBox()
    }
    const up = (): void => {
      doc.removeEventListener('pointermove', move)
      doc.removeEventListener('pointerup', up)
      doc.body.classList.remove('ss-dragging')
      guideV.style.display = 'none'
      guideH.style.display = 'none'
      postMutation('mover')
    }
    doc.addEventListener('pointermove', move)
    doc.addEventListener('pointerup', up)
  }

  function startResize(el: HTMLElement, ev: PointerEvent, dir: string): void {
    if (editingText) return
    const hRect = ensureAbsolute(el)
    const r0 = el.getBoundingClientRect()
    const x0 = ev.clientX
    const y0 = ev.clientY
    const w0 = r0.width
    const h0 = r0.height
    const l0 = r0.left - hRect.left
    const t0 = r0.top - hRect.top

    const move = (e: PointerEvent): void => {
      const dx = e.clientX - x0
      const dy = e.clientY - y0
      let w = w0
      let h = h0
      if (dir.includes('e')) w = w0 + dx
      if (dir.includes('s')) h = h0 + dy
      if (dir.includes('w')) w = w0 - dx
      if (dir.includes('n')) h = h0 - dy
      w = Math.max(24, w)
      h = Math.max(24, h)
      el.style.width = `${Math.round(w)}px`
      el.style.height = `${Math.round(h)}px`
      if (dir.includes('w')) el.style.left = `${Math.round(clamp(l0 + dx, 0, Math.max(0, hRect.width - w)))}px`
      if (dir.includes('n')) el.style.top = `${Math.round(clamp(t0 + dy, 0, Math.max(0, hRect.height - h)))}px`
      updateSelBox()
    }
    const up = (): void => {
      doc.removeEventListener('pointermove', move)
      doc.removeEventListener('pointerup', up)
      postMutation('redimensionar')
    }
    doc.addEventListener('pointermove', move)
    doc.addEventListener('pointerup', up)
  }

  function nudge(el: HTMLElement, dx: number, dy: number): void {
    const hRect = ensureAbsolute(el)
    const r = el.getBoundingClientRect()
    const L = clamp(r.left - hRect.left + dx, 0, Math.max(0, hRect.width - r.width))
    const T = clamp(r.top - hRect.top + dy, 0, Math.max(0, hRect.height - r.height))
    el.style.left = `${Math.round(L)}px`
    el.style.top = `${Math.round(T)}px`
    updateSelBox()
    postMutation('nudge')
  }

  /* ---------------------------------------------------------------- */
  /* edição de texto                                                  */
  /* ---------------------------------------------------------------- */

  function hasDirectText(el: HTMLElement): boolean {
    for (const n of Array.from(el.childNodes)) {
      if (n.nodeType === 3 && (n.textContent ?? '').trim()) return true
    }
    return false
  }

  function startTextEdit(el: HTMLElement): void {
    if (SKIP_TAGS.has(el.tagName)) return
    editingText = true
    el.setAttribute('contenteditable', 'true')
    el.focus()
    const range = doc.createRange()
    range.selectNodeContents(el)
    range.collapse(false)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
    el.addEventListener('blur', endTextEdit)
    el.addEventListener('input', onTextInput)
  }

  function endTextEdit(ev: Event): void {
    const el = ev.currentTarget as HTMLElement
    el.removeAttribute('contenteditable')
    el.removeEventListener('blur', endTextEdit)
    el.removeEventListener('input', onTextInput)
    editingText = false
    updateSelBox()
    postMutation('texto')
  }

  function onTextInput(ev: Event): void {
    const el = ev.currentTarget as HTMLElement
    post({ type: 'text-edit', id: idOf(el), text: (el.textContent ?? '').trim() })
    postMutation('texto')
  }

  /* ---------------------------------------------------------------- */
  /* eventos do documento                                            */
  /* ---------------------------------------------------------------- */

  doc.addEventListener(
    'pointermove',
    (ev) => {
      const el = pickElement(ev.target)
      if (el === hovered) return
      hovered = el
      if (!el || isSlide(el)) {
        hoverBox.classList.remove('is-on')
        return
      }
      hoverBox.classList.add('is-on')
      place(hoverBox, el.getBoundingClientRect())
    },
    true,
  )

  doc.addEventListener(
    'pointerdown',
    (ev) => {
      const target = ev.target as HTMLElement
      if (target.closest?.(`#${OVERLAY_ID}`)) return
      if (ev.button !== 0) return
      const el = pickElement(target)
      ev.preventDefault()
      if (!el) {
        clearSelection()
        return
      }
      selectElement(el)
      hovered = null
      hoverBox.classList.remove('is-on')
      startDrag(el, ev as PointerEvent)
    },
    true,
  )

  doc.addEventListener(
    'click',
    (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
    },
    true,
  )

  doc.addEventListener(
    'dblclick',
    (ev) => {
      const el = pickElement(ev.target)
      if (!el || !hasDirectText(el)) return
      ev.preventDefault()
      startTextEdit(el)
    },
    true,
  )

  doc.addEventListener('scroll', () => selected && updateSelBox(), true)

  /* O contorno de hover some quando o ponteiro sai do documento: sem isso
     ele fica pairando sobre um elemento que ja nao esta sob o cursor. */
  doc.addEventListener('pointerleave', () => {
    hovered = null
    hoverBox.classList.remove('is-on')
  })
  doc.addEventListener('pointercancel', () => {
    hovered = null
    hoverBox.classList.remove('is-on')
  })
  window.addEventListener('resize', () => selected && updateSelBox())

  window.addEventListener(
    'keydown',
    (ev) => {
      if (editingText) {
        if (ev.key === 'Escape') (ev.target as HTMLElement)?.blur()
        return
      }
      const k = ev.key
      if ((ev.ctrlKey || ev.metaKey) && (k === 'z' || k === 'Z')) {
        ev.preventDefault()
        post({ type: 'hotkey', key: ev.shiftKey ? 'redo' : 'undo' })
        return
      }
      if ((ev.ctrlKey || ev.metaKey) && (k === 'y' || k === 'Y')) {
        ev.preventDefault()
        post({ type: 'hotkey', key: 'redo' })
        return
      }
      if ((ev.ctrlKey || ev.metaKey) && (k === 's' || k === 'S')) {
        ev.preventDefault()
        post({ type: 'hotkey', key: 'save' })
        return
      }
      if (!selected) return
      if (k === 'Delete' || k === 'Backspace') {
        ev.preventDefault()
        applyOps([{ k: 'struct', op: 'delete', id: idOf(selected) }])
        clearSelection()
      } else if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
        ev.preventDefault()
        if (isSlide(selected)) return
        const step = ev.shiftKey ? 10 : 1
        const dx = k === 'ArrowLeft' ? -step : k === 'ArrowRight' ? step : 0
        const dy = k === 'ArrowUp' ? -step : k === 'ArrowDown' ? step : 0
        nudge(selected, dx, dy)
      } else if (k === 'Enter') {
        ev.preventDefault()
        startTextEdit(selected)
      } else if (k === 'Escape') {
        clearSelection()
      } else if ((ev.ctrlKey || ev.metaKey) && (k === 'd' || k === 'D')) {
        ev.preventDefault()
        applyOps([{ k: 'struct', op: 'duplicate', id: idOf(selected) }])
      }
    },
    true,
  )

  /* ---------------------------------------------------------------- */
  /* mensagens do app                                                 */
  /* ---------------------------------------------------------------- */

  window.addEventListener('message', (ev: MessageEvent) => {
    const data = ev.data as ParentMsg | undefined
    if (!data || data.source !== 'slide-stage-parent' || data.token !== token) return
    if (data.t === 'goto' && typeof data.index === 'number') {
      ;(window as unknown as { SlideStageDeck?: { goto: (i: number) => void } }).SlideStageDeck?.goto(
        data.index,
      )
      hovered = null
      hoverBox.classList.remove('is-on')
      clearSelection()
      const atualizar = (): void => {
        montarEnquadramento()
        if (selected) updateSelBox()
      }
      window.setTimeout(atualizar, 60)
      window.setTimeout(atualizar, 430)
    } else if (data.t === 'select' && data.id) {
      selectElement(findEl(data.id))
    } else if (data.t === 'ops' && data.ops) {
      applyOps(data.ops)
    } else if (data.t === 'settings' && typeof data.guias === 'boolean') {
      guiasLigadas = data.guias
      montarEnquadramento()
    } else if (data.t === 'ping') {
      post({ type: 'ready' })
    }
  })

  /* ---------------------------------------------------------------- */
  /* arranque                                                         */
  /* ---------------------------------------------------------------- */

  /* Enquadramento fixo: moldura do slide, linhas de centro e tercos.
     So aparece quando o usuario liga a opcao. */
  function montarEnquadramento(): void {
    enquadramento.replaceChildren()
    if (!guiasLigadas) {
      enquadramento.classList.remove('is-on')
      return
    }
    const slide = doc.querySelector('.ss-slide.is-active') as HTMLElement | null
    if (!slide) {
      enquadramento.classList.remove('is-on')
      return
    }
    const r = slide.getBoundingClientRect()
    if (r.width < 40 || r.height < 40) return
    enquadramento.classList.add('is-on')
    place(enquadramento, r)

    const quadro = doc.createElement('div')
    quadro.className = 'ss-quadro'
    enquadramento.appendChild(quadro)

    const linha = (vertical: boolean, centro: boolean, frac: number): void => {
      const l = doc.createElement('div')
      l.className = centro ? 'ss-linha centro' : 'ss-linha'
      if (vertical) {
        l.style.left = `${Math.round(r.width * frac)}px`
        l.style.top = '0'
        l.style.width = '1px'
        l.style.height = `${Math.round(r.height)}px`
      } else {
        l.style.top = `${Math.round(r.height * frac)}px`
        l.style.left = '0'
        l.style.height = '1px'
        l.style.width = `${Math.round(r.width)}px`
      }
      enquadramento.appendChild(l)
    }
    linha(true, true, 0.5)
    linha(false, true, 0.5)
    linha(true, false, 1 / 3)
    linha(true, false, 2 / 3)
    linha(false, false, 1 / 3)
    linha(false, false, 2 / 3)
  }

  assignIds()
  montarEnquadramento()
  post({ type: 'ready' })
  postMutation('load')

  /* O preview de celular e o zoom mudam o tamanho do iframe: sem recalcular,
     as linhas ficavam na posicao antiga (o bug de "linhas tortas" no
     preview de celular). */
  let resizeTimer = 0
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer)
    resizeTimer = window.setTimeout(() => {
      montarEnquadramento()
      if (selected) updateSelBox()
    }, 60)
  })
}

/** Serializa o editor para injetar no documento. */
export function editorScript(token: string): string {
  return `(${editorMain.toString()})(${JSON.stringify(token)});`
}

/** Injeta base para assets relativos, modo de edicao e o script do editor. */
export function injectEditorBits(html: string, token: string, baseHref: string | null): string {
  // Idempotente: se o documento ja vier com restos de edicao (arquivo antigo),
  // eles saem antes de injetar de novo.
  let out = html
    .replace(/<script id="ss-editor-script">[\s\S]*?<\/script>/gi, '')
    .replace(/<style id="ss-editor-style">[\s\S]*?<\/style>/gi, '')
    .replace(/<div id="ss-editor">[\s\S]*?<\/div>(?=\s*<\/body>)/gi, '')
    .replace(/<base [^>]*>/gi, '')
    .replace(/ data-ss-edit(?=["\s/>])/g, '')
    .replace(/ data-ss-host(?=["\s/>])/g, '')
  out = withAppHost(out)
  if (baseHref) {
    out = /<head[^>]*>/i.test(out)
      ? out.replace(/<head([^>]*)>/i, `<head$1><base href="${baseHref}">`)
      : out.replace(/<html([^>]*)>/i, `<html$1><head><base href="${baseHref}"></head>`)
  }
  out = /<html([^>]*)>/i.test(out) ? out.replace(/<html([^>]*)>/i, '<html$1 data-ss-edit>') : out
  // No fim do body: o editor precisa do DOM completo para montar a camada visual.
  if (/<\/body>/i.test(out)) {
    out = out.replace(/<\/body>/i, `<script id="ss-editor-script">${editorScript(token)}</script></body>`)
  } else {
    out += `<script id="ss-editor-script">${editorScript(token)}</script>`
  }
  return out
}

/** Marca que o documento está rodando dentro do app. O runtime do deck usa
 *  essa marca para mandar links externos ao navegador do sistema, em vez de
 *  navegar ou abrir janela dentro do app. Fora do app a marca não existe e
 *  o link funciona normalmente. */
export function withAppHost(html: string): string {
  if (/<html[^>]*data-ss-host/i.test(html)) return html
  return /<html([^>]*)>/i.test(html)
    ? html.replace(/<html([^>]*)>/i, '<html$1 data-ss-host>')
    : html
}
