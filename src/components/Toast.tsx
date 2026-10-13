import { useEffect } from 'react'

import { Icon } from './Icons'
import { store, useStore } from '../lib/store'

export function ToastHost() {
  const toast = useStore().toast

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => store.dismissToast(toast.id), 5200)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!toast) return null
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className={`toast toast-${toast.kind}`}>
        <Icon name={toast.kind === 'error' ? 'alert' : toast.kind === 'ok' ? 'check' : 'help'} size={16} />
        <span>{toast.text}</span>
        <button
          type="button"
          className="toast-close"
          onClick={() => store.dismissToast(toast.id)}
          aria-label="Fechar aviso"
        >
          <Icon name="close" size={13} />
        </button>
      </div>
    </div>
  )
}
