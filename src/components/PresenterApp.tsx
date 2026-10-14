import { useEffect, useRef, useState } from 'react'
import { listen, emit, UnlistenFn } from '@tauri-apps/api/event'
import { Icon } from './Icons'

interface DeckState {
  html: string
  currentSlide: number
  totalSlides: number
  slideTitle: string
  slideNotes: string
  nextSlideTitle: string
  nextSlideNotes: string
}

interface TimerState {
  elapsed: number
  running: boolean
  startTime: number | null
}

export function PresenterApp() {
  const [deck, setDeck] = useState<DeckState | null>(null)
  const [timer, setTimer] = useState<TimerState>({ elapsed: 0, running: false, startTime: null })
  const [connected, setConnected] = useState(false)
  const timerInterval = useRef<number | null>(null)
  const unlistenDeck = useRef<UnlistenFn | null>(null)
  const unlistenControl = useRef<UnlistenFn | null>(null)
  const lastSyncTime = useRef(0)

  // Formata tempo como HH:MM:SS ou MM:SS
  function formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000)
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Inicia/para o timer
  function toggleTimer(): void {
    setTimer((prev) => {
      const now = Date.now()
      if (prev.running) {
        // Pausa: acumula o tempo decorrido
        if (timerInterval.current) {
          clearInterval(timerInterval.current)
          timerInterval.current = null
        }
        return { ...prev, running: false, elapsed: prev.elapsed + (now - (prev.startTime ?? now)), startTime: null }
      } else {
        // Inicia/retoma
        timerInterval.current = window.setInterval(() => {
          setTimer((p) => ({ ...p, elapsed: p.elapsed + (Date.now() - (p.startTime ?? Date.now())) }))
        }, 200)
        return { ...prev, running: true, startTime: now }
      }
    })
  }

  // Reseta o timer
  function resetTimer(): void {
    if (timerInterval.current) {
      clearInterval(timerInterval.current)
      timerInterval.current = null
    }
    setTimer({ elapsed: 0, running: false, startTime: null })
  }

  // Envia comando de navegação para a janela principal
  function sendNavigation(direction: 'prev' | 'next' | 'goto', index?: number): void {
    emit('presenter-control', { type: 'navigate', direction, index })
  }

  // Sincroniza o estado do deck recebido da janela principal
  useEffect(() => {
    const setupListeners = async () => {
      // Escuta atualizações do deck da janela principal
      unlistenDeck.current = await listen<DeckState>('deck-state-update', (event) => {
        setDeck(event.payload)
        setConnected(true)
        lastSyncTime.current = Date.now()
      })

      // Escuta confirmações de navegação
      unlistenControl.current = await listen<{ type: string; index: number }>('presenter-control-ack', (event) => {
        if (event.payload.type === 'navigate' && deck) {
          setDeck((d) => d ? { ...d, currentSlide: event.payload.index } : null)
        }
      })

      // Pede estado inicial
      emit('presenter-request-state', {})
    }

    setupListeners()

    return () => {
      unlistenDeck.current?.()
      unlistenControl.current?.()
      if (timerInterval.current) clearInterval(timerInterval.current)
    }
  }, [])

  // Atualiza o timer a cada 200ms quando rodando
  useEffect(() => {
    if (timer.running && !timerInterval.current) {
      timerInterval.current = window.setInterval(() => {
        setTimer((p) => ({ ...p, elapsed: p.elapsed + (Date.now() - (p.startTime ?? Date.now())) }))
      }, 200)
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current)
    }
  }, [timer.running])

  // Atalhos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!deck) return
      // Evita interceptar quando digitando em inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        sendNavigation('next')
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault()
        sendNavigation('prev')
      } else if (e.key === 'Home') {
        e.preventDefault()
        sendNavigation('goto', 0)
      } else if (e.key === 'End') {
        e.preventDefault()
        sendNavigation('goto', deck.totalSlides - 1)
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault()
        toggleTimer()
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        resetTimer()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deck])

  // Detecta desconexão (sem updates por 5s)
  useEffect(() => {
    const check = setInterval(() => {
      if (Date.now() - lastSyncTime.current > 5000 && connected) {
        setConnected(false)
      }
    }, 1000)
    return () => clearInterval(check)
  }, [connected])

  if (!deck) {
    return (
      <div className="presenter-loading">
        <div className="presenter-loading-spinner" />
        <p>Aguardando conexão com a janela principal...</p>
        {!connected && <p className="presenter-hint">Abra a janela principal e inicie a apresentação.</p>}
      </div>
    )
  }

  const currentNum = deck.currentSlide + 1
  const progressPct = deck.totalSlides > 0 ? (currentNum / deck.totalSlides) * 100 : 0

  return (
    <div className="presenter">
      {/* Cabeçalho */}
      <header className="presenter-header">
        <div className="presenter-title">
          <Icon name="present" size={20} />
          <span>Apresentador — {deck.slideTitle || `Slide ${currentNum}`}</span>
        </div>
        <div className="presenter-connection" data-connected={connected}>
          <span className="connection-dot" />
          {connected ? 'Conectado' : 'Desconectado'}
        </div>
      </header>

      <main className="presenter-main">
        {/* Painel esquerdo: slide atual + próximo */}
        <section className="presenter-slides" aria-label="Slides">
          {/* Slide Atual */}
          <article className="slide-panel current">
            <div className="slide-panel-header">
              <h2>Slide Atual ({currentNum} / {deck.totalSlides})</h2>
              <div className="progress-mini" role="progressbar" aria-valuenow={currentNum} aria-valuemin={1} aria-valuemax={deck.totalSlides}>
                <span style={{ width: `${progressPct}%` }} />
              </div>
            </div>
            <div className="slide-preview current-slide">
              <iframe
                srcDoc={deck.html}
                title={`Slide ${currentNum}: ${deck.slideTitle}`}
                className="slide-iframe"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="slide-notes">
              <h3><Icon name="note" size={14} /> Notas</h3>
              <pre className="notes-text">{deck.slideNotes || '(sem notas)'}</pre>
            </div>
          </article>

          {/* Próximo Slide */}
          <article className="slide-panel next">
            <div className="slide-panel-header">
              <h2>Próximo ({currentNum + 1} / {deck.totalSlides})</h2>
            </div>
            <div className="slide-preview next-slide">
              <iframe
                srcDoc={deck.html}
                title={`Slide ${currentNum + 1}: ${deck.nextSlideTitle}`}
                className="slide-iframe"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="slide-notes">
              <h3><Icon name="note" size={14} /> Notas</h3>
              <pre className="notes-text">{deck.nextSlideNotes || '(sem notas)'}</pre>
            </div>
          </article>
        </section>

        {/* Painel direito: timer + controles */}
        <aside className="presenter-sidebar" aria-label="Controles do apresentador">
          <section className="timer-panel">
            <h2>Cronômetro</h2>
            <div className="timer-display" data-running={timer.running}>
              {formatTime(timer.elapsed + (timer.running && timer.startTime ? Date.now() - timer.startTime : 0))}
            </div>
            <div className="timer-controls">
              <button
                className={`btn ${timer.running ? 'btn-ghost' : 'btn-primary'}`}
                onClick={toggleTimer}
                aria-pressed={timer.running}
              >
                <Icon name={timer.running ? 'pause' : 'play'} size={16} />
                {timer.running ? 'Pausar' : 'Iniciar'}
              </button>
              <button className="btn btn-ghost" onClick={resetTimer} disabled={timer.elapsed === 0 && !timer.running}>
                <Icon name='refresh' size={16} />
                Resetar
              </button>
            </div>
            <p className="timer-hint">Espaço / Setas: navegar · T: timer · R: resetar</p>
          </section>

          <section className="nav-panel">
            <h2>Navegação</h2>
            <div className="nav-buttons">
              <button className="btn btn-ghost" onClick={() => sendNavigation('prev')} disabled={currentNum <= 1} aria-label="Slide anterior">
                <Icon name="chevron-left" size={20} />
                Anterior
              </button>
              <button className="btn btn-ghost" onClick={() => sendNavigation('next')} disabled={currentNum >= deck.totalSlides} aria-label="Próximo slide">
                Próximo
                <Icon name="chevron-right" size={20} />
              </button>
            </div>
            <div className="nav-jump">
              <label>
                Ir para slide:
                <input
                  type="number"
                  min={1}
                  max={deck.totalSlides}
                  value={currentNum}
                  onChange={(e) => {
                    const n = Math.max(1, Math.min(deck.totalSlides, parseInt(e.target.value) || 1))
                    sendNavigation('goto', n - 1)
                  }}
                  aria-label="Número do slide"
                />
              </label>
            </div>
          </section>

          <section className="deck-info">
            <h2>Informações</h2>
            <dl>
              <dt>Total de slides</dt>
              <dd>{deck.totalSlides}</dd>
              <dt>Slide atual</dt>
              <dd>{currentNum}</dd>
              <dt>Tempo decorrido</dt>
              <dd>{formatTime(timer.elapsed + (timer.running && timer.startTime ? Date.now() - timer.startTime : 0))}</dd>
            </dl>
          </section>
        </aside>
      </main>
    </div>
  )
}