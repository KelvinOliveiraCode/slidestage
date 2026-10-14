import { useEffect, useRef, useState, type ReactNode } from 'react'

import { Icon, type IconName } from './Icons'
import { store, useStore } from '../lib/store'
import { ANIMS, LAYOUTS, TRANSITIONS } from '../lib/snippets'

/* ------------------------------------------------------------------ */
/* campos                                                              */
/* ------------------------------------------------------------------ */

function toHex(color: string): string {
  const m = color.match(/rgba?\(([^)]+)\)/i)
  if (m) {
    const parts = m[1].split(',').map((p) => parseFloat(p))
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n))) {
      // transparente nao tem cor: mostra "sem cor" em vez de preto
      if (parts.length > 3 && parts[3] === 0) return ''
      return (
        '#' +
        parts
          .slice(0, 3)
          .map((n) => Math.round(n).toString(16).padStart(2, '0'))
          .join('')
      )
    }
  }
  if (color.startsWith('#') && color.length >= 7) return color.slice(0, 7)
  if (color === 'transparent') return ''
  return '#f2f5f7'
}

function pxOf(value: string): string {
  const n = parseFloat(value)
  return Number.isFinite(n) ? String(Math.round(n)) : ''
}

function inlineProp(inline: string, prop: string): string {
  const decl = inline
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${prop}:`))
  return decl ? decl.slice(prop.length + 1).trim() : ''
}

function Section({ title, icon, children }: { title: string; icon: IconName; children: ReactNode }) {
  return (
    <section className="insp-section">
      <h3>
        <Icon name={icon} size={14} />
        {title}
      </h3>
      <div className="insp-body">{children}</div>
    </section>
  )
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint ? <em title={hint}>?</em> : null}
      </span>
      {children}
    </label>
  )
}

/** Colocacao de elementos: clique no botao poe no centro do slide, arrastar
 *  solta o elemento onde o usuario largar. Um único hook serve os dois. */
type PlaceKind = 'title' | 'text' | 'button' | 'list' | 'shape' | 'quote' | 'spacer' | 'image'

function usePlacement(): [string | null, (kind: PlaceKind) => (ev: React.PointerEvent) => void] {
  const [arrastando, setArrastando] = useState<PlaceKind | null>(null)
  const estado = useRef({ x0: 0, y0: 0, moveu: false, kind: null as PlaceKind | null })

  useEffect(() => {
    if (!arrastando) return
    const fantasma = document.getElementById('ss-place-fantasma')

    const onMove = (e: PointerEvent): void => {
      const st = estado.current
      if (Math.abs(e.clientX - st.x0) > 5 || Math.abs(e.clientY - st.y0) > 5) st.moveu = true
      if (fantasma) {
        fantasma.style.left = `${e.clientX}px`
        fantasma.style.top = `${e.clientY}px`
        fantasma.style.opacity = st.moveu ? '1' : '0'
      }
    }

    const onUp = (e: PointerEvent): void => {
      const st = estado.current
      const kind = st.kind
      setArrastando(null)
      if (!kind || !st.moveu) return // clique simples: quem add eh o onClick
      const frame = document.querySelector('#stage-frame')
      const r = frame?.getBoundingClientRect()
      const dentro =
        !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      if (kind === 'image') void store.addImage()
      else if (dentro && r) store.addElement(kind, { x: e.clientX - r.left, y: e.clientY - r.top })
      else store.addElement(kind)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [arrastando])

  return [arrastando, (kind: PlaceKind) => (ev: React.PointerEvent) => {
    estado.current = { x0: ev.clientX, y0: ev.clientY, moveu: false, kind }
    setArrastando(kind)
  }]
}

/** Textarea que nao perde o cursor: guarda rascunho local enquanto focada. */
function StableTextArea({
  value,
  onCommit,
  rows = 3,
  label,
}: {
  value: string
  onCommit: (text: string) => void
  rows?: number
  label: string
}) {
  const [draft, setDraft] = useState(value)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(value)
  }, [value])

  return (
    <textarea
      className="textarea"
      rows={rows}
      aria-label={label}
      value={draft}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setDraft(value)
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        onCommit(e.target.value)
      }}
    />
  )
}

/** Input de texto com commit atrasado (nao recarrega o canvas a cada tecla). */
function DebouncedInput({
  value,
  onCommit,
  delay = 400,
  label,
}: {
  value: string
  onCommit: (text: string) => void
  delay?: number
  label: string
}) {
  const [draft, setDraft] = useState(value)
  const timer = useRef(0)

  useEffect(() => {
    setDraft(value)
  }, [value])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <input
      className="input"
      type="text"
      aria-label={label}
      value={draft}
      onChange={(e) => {
        const next = e.target.value
        setDraft(next)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => onCommit(next), delay)
      }}
    />
  )
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  const hex = value ? toHex(value) : ''
  return (
    <Field label={label}>
      <span className="color-row">
        <input
          type="color"
          value={hex || '#f2f5f7'}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label}: escolher cor`}
        />
        <input
          type="text"
          className="input input-hex"
          value={hex}
          placeholder="sem cor"
          onChange={(e) => onChange(e.target.value.trim())}
          aria-label={`${label}: código hexadecimal`}
        />
        {hex ? (
          <button type="button" className="btn btn-ghost btn-mini" onClick={() => onChange('')}>
            limpar
          </button>
        ) : null}
      </span>
    </Field>
  )
}

/* ------------------------------------------------------------------ */
/* inspetor                                                            */
/* ------------------------------------------------------------------ */

export function Inspector() {
  const s = useStore()
  const sel = s.sel
  const isSlideSelection = !!sel && sel.tag === 'section'
  const slideId = sel?.slideId || s.slides[s.current]?.id || ''
  const slideMeta = s.slides.find((sl) => sl.id === slideId)
  const [arrastando, iniciarPlacement] = usePlacement()

  return (
    <aside className="inspector" aria-label="Propriedades">
      {sel && !isSlideSelection ? (
        <>
          <Section title="Elemento" icon="cursor">
            <div className="kv">
              <span className="chip">{sel.tag}</span>
              <span className="kv-text">{sel.text || 'sem texto'}</span>
            </div>
            <Field label="Texto" hint="Ou clique duas vezes no elemento no canvas">
              <StableTextArea
                label="Texto do elemento"
                value={sel.text}
                onCommit={(t) => store.setText(t)}
              />
            </Field>
          </Section>

          <Section title="Tipografia" icon="text">
            <div className="grid-2">
              <Field label="Tamanho">
                <input
                  className="input"
                  type="number"
                  min={10}
                  max={220}
                  value={pxOf(sel.computed.fontSize)}
                  onChange={(e) => store.patchStyle({ 'font-size': e.target.value ? `${e.target.value}px` : '' })}
                />
              </Field>
              <Field label="Peso">
                <select
                  className="input"
                  value={sel.computed.fontWeight}
                  onChange={(e) => store.patchStyle({ 'font-weight': e.target.value })}
                >
                  <option value="400">Normal</option>
                  <option value="600">Seminegrito</option>
                  <option value="700">Negrito</option>
                  <option value="800">Extra</option>
                </select>
              </Field>
            </div>
            <Field label="Alinhamento">
              <span className="seg seg-mini">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`seg-btn${sel.computed.textAlign === a ? ' is-on' : ''}`}
                    aria-pressed={sel.computed.textAlign === a}
                    onClick={() => store.patchStyle({ 'text-align': a })}
                  >
                    {a === 'left' ? 'Esquerda' : a === 'center' ? 'Centro' : 'Direita'}
                  </button>
                ))}
              </span>
            </Field>
            <ColorField
              label="Cor do texto"
              value={sel.computed.color}
              onChange={(hex) => store.patchStyle({ color: hex })}
            />
          </Section>

          <Section title="Caixa" icon="layout">
            <div className="grid-2">
              <Field label="Largura">
                <input
                  className="input"
                  type="number"
                  min={16}
                  value={pxOf(sel.computed.width)}
                  onChange={(e) => store.patchStyle({ width: e.target.value ? `${e.target.value}px` : '' })}
                />
              </Field>
              <Field label="Altura">
                <input
                  className="input"
                  type="number"
                  min={16}
                  value={pxOf(sel.computed.height)}
                  onChange={(e) => store.patchStyle({ height: e.target.value ? `${e.target.value}px` : '' })}
                />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Cantos">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={pxOf(sel.computed.borderRadius)}
                  onChange={(e) =>
                    store.patchStyle({ 'border-radius': e.target.value ? `${e.target.value}px` : '' })
                  }
                />
              </Field>
              <Field label="Espaço interno">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={pxOf(inlineProp(sel.inline, 'padding'))}
                  onChange={(e) => store.patchStyle({ padding: e.target.value ? `${e.target.value}px` : '' })}
                />
              </Field>
            </div>
            {sel.computed.position === 'absolute' || sel.computed.position === 'fixed' ? (
              <div className="grid-2">
                <Field label="Posição X">
                  <input
                    className="input"
                    type="number"
                    value={pxOf(inlineProp(sel.inline, 'left'))}
                    onChange={(e) => store.patchStyle({ left: e.target.value ? `${e.target.value}px` : '' })}
                  />
                </Field>
                <Field label="Posição Y">
                  <input
                    className="input"
                    type="number"
                    value={pxOf(inlineProp(sel.inline, 'top'))}
                    onChange={(e) => store.patchStyle({ top: e.target.value ? `${e.target.value}px` : '' })}
                  />
                </Field>
              </div>
            ) : (
              <p className="insp-hint">
                Arraste o elemento no canvas para posicionar livremente. As setas do teclado movem 1px
                (com Shift, 10px).
              </p>
            )}
          </Section>

          <Section title="Fundo" icon="palette">
            <ColorField
              label="Cor de fundo"
              value={sel.computed.backgroundColor}
              onChange={(hex) => store.patchStyle({ 'background-color': hex })}
            />
          </Section>

          <Section title="Animação" icon="motion">
            <Field label="Entrada do elemento">
              <select
                className="input"
                value={sel.dataAnim || 'none'}
                onChange={(e) =>
                  store.patchAttrs({ 'data-anim': e.target.value === 'none' ? '' : e.target.value })
                }
              >
                {ANIMS.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid-2">
              <Field label="Duração (ms)">
                <input
                  className="input"
                  type="number"
                  min={100}
                  max={3000}
                  value={pxOf(inlineProp(sel.inline, '--ss-anim-dur')) || 620}
                  onChange={(e) =>
                    store.patchStyle({ '--ss-anim-dur': e.target.value ? `${e.target.value}ms` : '' })
                  }
                />
              </Field>
              <Field label="Atraso (ms)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={3000}
                  value={pxOf(inlineProp(sel.inline, '--ss-anim-delay')) || 0}
                  onChange={(e) =>
                    store.patchStyle({ '--ss-anim-delay': e.target.value ? `${e.target.value}ms` : '' })
                  }
                />
              </Field>
            </div>
          </Section>

          <Section title="Link e botão" icon="link">
            <Field label="Para onde leva">
              <input
                className="input"
                type="text"
                value={sel.href}
                placeholder="#slide-2, https://..., mailto:..."
                onChange={(e) => store.patchAttrs({ href: e.target.value })}
              />
            </Field>
            <Field label="Abrir em">
              <select
                className="input"
                value={sel.target || '_self'}
                onChange={(e) => store.patchAttrs({ target: e.target.value === '_self' ? '' : e.target.value })}
              >
                <option value="_self">Na mesma aba</option>
                <option value="_blank">Em nova aba</option>
              </select>
            </Field>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => {
                const hasButton = /ss-btn/.test(sel.className)
                store.patchAttrs({
                  class: hasButton
                    ? sel.className.replace(/ss-btn(-primary|-ghost)?/g, '').trim()
                    : `${sel.className} ss-btn ss-btn-primary`.trim(),
                })
              }}
            >
              <Icon name="button" size={15} />
              {/ss-btn/.test(sel.className) ? 'Remover estilo de botão' : 'Transformar em botão'}
            </button>
          </Section>

          <div className="insp-actions">
            <button type="button" className="btn btn-ghost" onClick={() => store.duplicateSelected()}>
              <Icon name="duplicate" size={15} />
              Duplicar
            </button>
            <button type="button" className="btn btn-ghost btn-danger" onClick={() => store.deleteSelected()}>
              <Icon name="trash" size={15} />
              Excluir
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => store.reorderSelected('front')}>
              <Icon name="up" size={15} />
              Frente
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => store.reorderSelected('back')}>
              <Icon name="down" size={15} />
              Atrás
            </button>
          </div>
        </>
      ) : null}

      {s.deckDetected && slideMeta ? (
        <Section
          title={sel && !isSlideSelection ? 'Slide do elemento' : `Slide ${slideMeta.index + 1}`}
          icon="slides"
        >
          <ColorField
            label="Fundo do slide"
            value={slideMeta.bg || s.slideColors.bg}
            onChange={(hex) => store.setSlideBg(slideId, hex)}
          />
          <Field label="Transição de entrada">
            <select
              className="input"
              value={slideMeta.transition}
              onChange={(e) => store.setSlideTransition(slideId, e.target.value)}
            >
              {TRANSITIONS.map((tr) => (
                <option key={tr.id} value={tr.id}>
                  {tr.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid-2">
            <Field label="Velocidade (ms)">
              <input
                className="input"
                type="number"
                value={pxOf(slideMeta.dur) || 380}
                min={80}
                max={2000}
                step={20}
                onChange={(e) =>
                  store.setSlideTransitionTiming(slideId, {
                    dur: e.target.value ? `${e.target.value}ms` : '',
                  })
                }
              />
            </Field>
            <Field label="Opacidade inicial (%)">
              <input
                className="input"
                type="number"
                value={slideMeta.op ? Math.round(parseFloat(slideMeta.op) * 100) : 0}
                min={0}
                max={100}
                step={5}
                onChange={(e) =>
                  store.setSlideTransitionTiming(slideId, {
                    op: e.target.value === '' ? '' : String(Math.min(100, Math.max(0, Number(e.target.value))) / 100),
                  })
                }
              />
            </Field>
          </div>
          <Field label="Distancia do deslocamento (px)">
            <input
              className="input"
              type="number"
              min={0}
              max={400}
              step={4}
              value={pxOf(slideMeta.dist) || 48}
              onChange={(e) =>
                store.setSlideTransitionTiming(slideId, {
                  dist: e.target.value ? `${e.target.value}px` : '',
                })
              }
            />
          </Field>
          <p className="insp-hint">
            Velocidade eh o tempo da passagem. Opacidade inicial eh o quanto o slide comeca
            transparente. Distancia vale para as transicoes que deslocam.
          </p>
          <Field label="Layout" hint="Trocar o layout substitui o conteúdo do slide (Ctrl+Z desfaz)">
            <select
              className="input"
              value={slideMeta.layout}
              onChange={(e) => store.setSlideLayout(slideId, e.target.value as never)}
            >
              {LAYOUTS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notas do apresentador" hint="Visíveis apenas no modo Apresentador; não aparecem no slide nem no PDF">
            <StableTextArea
              label="Notas do apresentador"
              value={slideMeta.notes || ''}
              rows={4}
              onCommit={(t) => store.setSlideNotes(slideId, t)}
            />
          </Field>
          <label className="check">
            <input
              type="checkbox"
              checked={s.guias}
              onChange={(e) => store.setGuias(e.target.checked)}
            />
            <span>Mostrar linhas de enquadramento</span>
          </label>
        </Section>
      ) : null}

      {!sel ? (
        <Section title="Deck" icon="file">
          <Field label="Título do documento">
            <DebouncedInput
              label="Título do documento"
              value={s.title}
              onCommit={(t) => store.setTitle(t)}
            />
          </Field>
          <p className="insp-hint">
            {s.slides.length} slide{s.slides.length === 1 ? '' : 's'} ·{' '}
            {s.path ? s.path : 'arquivo não salvo'}
          </p>
        </Section>
      ) : null}

      {s.deckDetected ? (
        <Section title="Adicionar no slide atual" icon="new">
          <p className="insp-hint">
            Clique no botao para o elemento nascer no centro do slide, ou arraste
            o botao ate o lugar certo do slide.
          </p>
          <div className="add-grid">
            {(
              [
                ['title', 'Título', 'text'],
                ['text', 'Texto', 'file'],
                ['button', 'Botão', 'button'],
                ['list', 'Lista', 'list'],
                ['shape', 'Forma', 'grid'],
                ['quote', 'Citação', 'quote'],
                ['spacer', 'Espaço', 'spark'],
              ] as [PlaceKind, string, IconName][]
            ).map(([kind, label, icon]) => (
              <button
                key={kind}
                type="button"
                className="btn btn-ghost"
                title={`${label}: clique poe no centro, arrastar posiciona no slide`}
                onPointerDown={iniciarPlacement(kind)}
                onClick={() => {
                  if (kind === 'image') void store.addImage()
                  else store.addElement(kind)
                }}
              >
                <Icon name={icon} size={15} />
                {label}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              title="Imagem: abre o seletor de arquivo"
              onClick={() => void store.addImage()}
            >
              <Icon name="image" size={15} />
              Imagem
            </button>
          </div>
          {arrastando ? <div id="ss-place-fantasma" className="place-fantasma" aria-hidden="true" /> : null}
        </Section>
      ) : null}
    </aside>
  )
}
