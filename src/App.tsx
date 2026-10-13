import { lazy, Suspense, useEffect } from 'react'

import { Toolbar } from './components/Toolbar'
import { SlideRail } from './components/SlideRail'
import { Stage } from './components/Stage'
import { Inspector } from './components/Inspector'
import { TemplateModal } from './components/TemplateModal'
import { HelpModal } from './components/HelpModal'
import { PresentOverlay } from './components/PresentOverlay'
import { ToastHost } from './components/Toast'
import { Icon } from './components/Icons'
import { store, useStore } from './lib/store'
import './styles/tokens.css'
import './styles/app.css'

/* O editor de codigo (CodeMirror) pesa ~600KB e so serve quem abre o modo
   Codigo. Carregar sob demanda deixa o canvas aparecer muito mais rapido. */
const CodeView = lazy(() => import('./components/CodeView'))

export default function App() {
  const s = useStore()

  useEffect(() => {
    void store.init()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      if (target?.closest('.cm-editor')) return
      const mod = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      if (mod && key === 's') {
        e.preventDefault()
        if (e.shiftKey) void store.saveAs()
        else void store.save()
      } else if (mod && key === 'o') {
        e.preventDefault()
        void store.openDialog()
      } else if (mod && key === 'e') {
        e.preventDefault()
        store.toggleView()
      } else if (mod && key === 'z') {
        e.preventDefault()
        if (e.shiftKey) store.redo()
        else store.undo()
      } else if (mod && key === 'y') {
        e.preventDefault()
        store.redo()
      } else if (e.key === 'F5') {
        e.preventDefault()
        store.setPresenting(true)
      } else if (e.key === 'Escape') {
        if (s.helpOpen) store.openHelp(false)
        else if (s.galleryOpen) store.openGallery(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [s.helpOpen, s.galleryOpen])

  return (
    <div className="app">
      <Toolbar />
      <div className="app-body">
        <SlideRail />
        <main className="app-main">
          {s.view === 'code' ? (
            <Suspense
              fallback={
                <div className="code-loading">
                  <Icon name="code" size={18} />
                  <span>Carregando o editor de código…</span>
                </div>
              }
            >
              <CodeView />
            </Suspense>
          ) : (
            <Stage />
          )}
        </main>
        <Inspector />
      </div>

      {s.externalChange ? (
        <div className="external-bar" role="alert">
          <Icon name="alert" size={15} />
          <span>O arquivo mudou no disco, foi editado fora do SlideStage.</span>
          <button
            type="button"
            className="btn btn-primary btn-mini"
            onClick={() => void store.reloadFromDisk()}
          >
            Recarregar do disco
          </button>
          <button type="button" className="btn btn-ghost btn-mini" onClick={() => store.dismissExternal()}>
            Manter a minha versão
          </button>
        </div>
      ) : null}

      {s.galleryOpen ? <TemplateModal /> : null}
      {s.helpOpen ? <HelpModal /> : null}
      {s.presenting ? <PresentOverlay /> : null}
      <ToastHost />
    </div>
  )
}
