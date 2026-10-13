import { useMemo, useState } from 'react'

import { Modal } from './Modal'
import { store } from '../lib/store'
import { TEMPLATES, templateById } from '../lib/templates'

export function TemplateModal() {
  const [activeId, setActiveId] = useState(TEMPLATES[0].id)
  const tpl = templateById(activeId) ?? TEMPLATES[0]
  const preview = useMemo(() => tpl.build(), [tpl])

  return (
    <Modal
      title="Modelos"
      wide
      onClose={() => store.openGallery(false)}
      footer={
        <div className="tpl-foot">
          <p>
            <strong>{tpl.name}</strong> {tpl.summary} {tpl.useCase}
          </p>
          <div className="tpl-foot-actions">
            <button type="button" className="btn btn-ghost" onClick={() => store.openGallery(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void store.newFromTemplate(tpl.id)}
            >
              Usar este modelo
            </button>
          </div>
        </div>
      }
    >
      <div className="tpl-grid">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tpl-card${t.id === activeId ? ' is-on' : ''}`}
            aria-pressed={t.id === activeId}
            onClick={() => setActiveId(t.id)}
          >
            <span className="tpl-swatch" style={{ background: t.bg, borderColor: t.accent }}>
              <span className="tpl-swatch-bar" style={{ background: t.accent }} />
              <span className="tpl-swatch-bar short" />
              <span className="tpl-swatch-bar short" />
            </span>
            <span className="tpl-texts">
              <strong>{t.name}</strong>
              <span>{t.summary}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="tpl-preview">
        <iframe title={`Previa do modelo ${tpl.name}`} srcDoc={preview} />
        <p className="tpl-preview-note">
          Previa navegável: use as setas do teclado dentro dela. Nada é aplicado até você escolher
          &quot;Usar este modelo&quot;.
        </p>
      </div>
    </Modal>
  )
}
