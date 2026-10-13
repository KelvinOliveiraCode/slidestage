import { Icon, type IconName } from './Icons'
import { Menu, ToolButton } from './Controls'
import { store, useStore } from '../lib/store'
import { LAYOUTS, type Layout } from '../lib/snippets'

const KIND_ICON: Record<string, IconName> = {
  title: 'text',
  statement: 'quote',
  split: 'layout',
  cards: 'grid',
  list: 'list',
  quote: 'quote',
  image: 'image',
  blank: 'cursor',
}

function layoutLabel(layout: string): string {
  return LAYOUTS.find((l) => l.id === layout)?.label ?? 'Livre'
}

export function SlideRail() {
  const s = useStore()
  const ids = s.slides.map((sl) => sl.id)

  return (
    <aside className="rail" aria-label="Slides do deck">
      <div className="rail-head">
        <h2>Slides</h2>
        <span className="chip">{s.slides.length}</span>
      </div>

      <div className="rail-actions">
        <Menu
          label="Adicionar"
          icon="new"
          title="Adicionar slide com um layout pronto"
          items={LAYOUTS.map((l) => ({ label: l.label, hint: l.hint, run: () => store.addSlide(l.id as Layout) }))}
        />
        <ToolButton icon="grid" label="Modelos" title="Galeria de modelos" onClick={() => store.openGallery(true)} />
      </div>

      {!s.deckDetected ? (
        <p className="rail-note">
          Este HTML não tem slides no formato do SlideStage. Você pode editar o código e o canvas
          livremente. Para ganhar a navegacao por slides, comece por um modelo.
        </p>
      ) : null}

      <ol className="slide-list">
        {s.slides.map((sl, i) => (
          <li key={sl.id}>
            <div className={`slide-card${i === s.current ? ' is-on' : ''}`}>
              <button
                type="button"
                className="slide-main"
                aria-current={i === s.current}
                onClick={() => store.goto(i)}
              >
                <span className="slide-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="slide-body">
                  <span className="slide-title">{sl.title}</span>
                  <span className="slide-kind">
                    <Icon name={KIND_ICON[sl.layout] ?? 'slides'} size={12} />
                    {layoutLabel(sl.layout)}
                                      </span>
                </span>
              </button>
              <div className="slide-tools">
                <button
                  type="button"
                  title="Mover para cima"
                  aria-label={`Mover slide ${i + 1} para cima`}
                  disabled={i === 0}
                  onClick={() => store.moveSlide(sl.id, -1)}
                >
                  <Icon name="up" size={13} />
                </button>
                <button
                  type="button"
                  title="Mover para baixo"
                  aria-label={`Mover slide ${i + 1} para baixo`}
                  disabled={i === s.slides.length - 1}
                  onClick={() => store.moveSlide(sl.id, 1)}
                >
                  <Icon name="down" size={13} />
                </button>
                <button
                  type="button"
                  title="Duplicar slide"
                  aria-label={`Duplicar slide ${i + 1}`}
                  onClick={() => store.duplicateSlide(sl.id)}
                >
                  <Icon name="duplicate" size={13} />
                </button>
                <button
                  type="button"
                  title="Excluir slide"
                  aria-label={`Excluir slide ${i + 1}`}
                  disabled={s.slides.length <= 1}
                  onClick={() => {
                    store.deleteSlide(sl.id)
                    store.goto(Math.max(0, i - 1))
                  }}
                >
                  <Icon name="trash" size={13} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="rail-foot">
        <h3>Recentes</h3>
        {s.recents.length === 0 ? (
          <p className="rail-empty">Nenhum arquivo recente.</p>
        ) : (
          <ul className="recent-list">
            {s.recents.slice(0, 6).map((r) => (
              <li key={r.path}>
                <button type="button" className="recent-open" onClick={() => void store.openRecent(r.path)}>
                  <Icon name="file" size={13} />
                  <span title={r.path}>{r.path.split(/[\\/]/).slice(-1)[0]}</span>
                </button>
                <button
                  type="button"
                  className="recent-remove"
                  aria-label={`Remover ${r.path} dos recentes`}
                  onClick={() => void store.removeRecent(r.path)}
                >
                  <Icon name="close" size={11} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="rail-note rail-note-foot">
          Deck com {ids.length} slide{ids.length === 1 ? '' : 's'}. Salve em HTML único para levar para
          qualquer lugar.
        </p>
      </div>
    </aside>
  )
}
