import { useEffect, useRef } from 'react'

import { withAppHost } from '../lib/editor'
import { store, useStore } from '../lib/store'

export function PresentOverlay() {
  const s = useStore()
  const closeBtn = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') store.setPresenting(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="present">
      <iframe className="present-frame" title="Apresentação em tela cheia" srcDoc={withAppHost(s.html)} />
      <div className="present-bar">
        <span>
          Apresentando: <strong>{s.title}</strong> · clique no slide e use as setas
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          ref={closeBtn}
          onClick={() => store.setPresenting(false)}
        >
          Sair (Esc)
        </button>
      </div>
    </div>
  )
}
