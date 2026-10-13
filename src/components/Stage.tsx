import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import { baseDirOf, ipc } from '../lib/ipc'
import { store, useStore, type SelInfo } from '../lib/store'

interface EditorSelect {
  id: string
  tag: string
  text: string
  slideId: string
  inline: string
  href: string
  target: string
  className: string
  dataAnim: string
  computed: SelInfo['computed']
}

/** Abre um link externo no navegador do sistema, nunca dentro do app. */
async function openExternal(href: string): Promise<void> {
  try {
    await ipc.openInBrowser(href)
  } catch (err) {
    store.toast('error', `Não foi possível abrir o link: ${err instanceof Error ? err.message : err}`)
  }
}

/** Manda a preferencia de linhas de enquadramento para o editor do iframe. */
function enviarGuias(): void {
  const frame = document.querySelector<HTMLIFrameElement>('#stage-frame')
  frame?.contentWindow?.postMessage(
    { source: 'slide-stage-parent', token: store.token, t: 'settings', guias: store.getSnapshot().guias },
    '*',
  )
}

export function Stage() {
  const s = useStore()
  const [srcDoc, setSrcDoc] = useState('')
  const [hostW, setHostW] = useState(0)
  const hostRef = useRef<HTMLDivElement>(null)
  const htmlRef = useRef(s.html)
  htmlRef.current = s.html
  const frameRef = useRef<HTMLIFrameElement>(null)
  /** Ultimo indice enviado ao deck: evita eco quando o deck avisa que mudou. */
  const lastSent = useRef(-1)

  // Reconstroi o documento quando o APP muda o HTML ou o modo do palco.
  // Mutacoes que nascem no iframe nao passam por aqui (nao ha recarga).
  useEffect(() => {
    const base = s.path ? `file:///${(baseDirOf(s.path) ?? '').replace(/\\/g, '/')}/` : null
    setSrcDoc(store.stageDoc(base))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.tick, s.view])

  // Avisa o editor quando a preferencia de guias muda, e manda o valor atual
  // assim que o iframe carrega.
  useEffect(() => {
    enviarGuias()
  }, [s.guias, s.tick])

  useEffect(() => {
    // So manda quando a mudanca partiu do app (clique no trilho): se partiu
    // do deck (setas, link, clique lateral), o deck ja esta la.
    if (s.current !== lastSent.current) {
      lastSent.current = s.current
      store.gotoInFrame(s.current)
    }
  }, [s.current])

  useEffect(() => {
    const onMsg = (ev: MessageEvent): void => {
      const d = ev.data as Record<string, unknown> | undefined
      if (!d) return
      const source = String(d.source)
      if (source === 'slide-stage-deck') {
        if (d.t === 'open-external') void openExternal(String(d.href))
        else if (d.t === 'slide-changed' && typeof d.index === 'number') {
          lastSent.current = Number(d.index)
          store.goto(Number(d.index))
          if (typeof d.bg === 'string') store.setSlideColors({ bg: String(d.bg), ink: String(d.ink ?? '') })
        }
        return
      }
      if (source !== 'slide-stage-editor' || d.token !== store.token) return
      const type = String(d.type)
      if (type === 'ready') {
        const st = store.getSnapshot()
        store.gotoInFrame(st.current)
        if (st.selected) store.selectInFrame(st.selected)
        enviarGuias()
      } else if (type === 'mutation') {
        store.adoptFromIframe(String(d.html))
      } else if (type === 'select') {
        const c = d.computed as EditorSelect['computed']
        store.setSelection({
          id: String(d.id),
          tag: String(d.tag),
          text: String(d.text ?? ''),
          slideId: String(d.slideId ?? ''),
          inline: String(d.inline ?? ''),
          href: String(d.href ?? ''),
          target: String(d.target ?? ''),
          className: String(d.className ?? ''),
          dataAnim: String(d.dataAnim ?? ''),
          computed: c,
        })
      } else if (type === 'deselect') {
        store.clearSelection()
      } else if (type === 'hotkey') {
        const key = String(d.key)
        if (key === 'undo') store.undo()
        else if (key === 'redo') store.redo()
        else if (key === 'save') void store.save()
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    const measure = (): void => setHostW(host.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => ro.disconnect()
  }, [])

  /** Se o canvas navegar para fora do deck (bug, drag de link, JS da pagina),
   *  o app percebe e recupera a visualizacao em vez de mostrar outra coisa. */
  const onFrameLoad = (): void => {
    const frame = frameRef.current
    const doc = frame?.contentDocument
    if (!doc) return
    const dentroDoDeck = !!doc.querySelector('.ss-stage, .ss-slide')
    if (!dentroDoDeck && store.getSnapshot().deckDetected) {
      store.toast('error', 'O canvas saiu do deck. Recarregando a visualizacao.')
      store.reloadStage()
    }
  }

  const frameWidth =
    s.device === 'phone' ? Math.min(hostW || 420, 420) : Math.round((hostW || 1200) * s.zoom)

  return (
    <div
      className="stage"
      ref={hostRef}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className={`stage-frame${s.device === 'phone' ? ' is-phone' : ''}`} style={{ width: frameWidth }}>
        <iframe
          id="stage-frame"
          ref={frameRef}
          title={s.view === 'edit' ? 'Edicao do slide' : 'Visualizacao do slide'}
          srcDoc={srcDoc}
          onLoad={onFrameLoad}
        />
      </div>
      <div className="stage-bar">
        <span>
          {s.view === 'edit' ? 'Editando' : 'Visualizando'}: slide{' '}
          {Math.min(s.current + 1, s.slides.length)} de {s.slides.length}
        </span>
        <span className="stage-hint">
          {s.view === 'edit'
            ? 'Clique para selecionar, arraste para mover, setas ajustam 1px (Shift, 10px), duas vezes no texto para editar'
            : 'Setas passam os slides, links abrem no navegador. Clique em Editar para mudar o slide.'}
        </span>
      </div>
    </div>
  )
}
