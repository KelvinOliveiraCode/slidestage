// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { editorMain, editorScript, injectEditorBits } from './editor'

const TOKEN = 'abc123def456'

function mountDeck(): Document {
  document.documentElement.innerHTML =
    '<html data-ss-edit><head><title>T</title></head><body class="ss-deck">' +
    '<main class="ss-stage"><section class="ss-slide is-active" id="slide-1" data-transition="fade">' +
    '<div class="ss-content" data-layout="title"><h1>Oi</h1><p>Texto</p></div></section></main>' +
    '</body></html>'
  return document
}

describe('editorScript', () => {
  test('gera javascript válido (compila sem executar)', () => {
    const code = editorScript(TOKEN)
    expect(code).toContain(TOKEN)
    expect(() => new Function(code)).not.toThrow()
  })
})

describe('editorMain', () => {
  test('executa de verdade em um documento e cria a camada visual', () => {
    const doc = mountDeck()
    expect(() => editorMain(TOKEN)).not.toThrow()
    expect(doc.getElementById('ss-editor')).toBeTruthy()
    expect(doc.getElementById('ss-editor-style')).toBeTruthy()
  })

  test('da data-el-id para todo elemento do deck', () => {
    const doc = mountDeck()
    editorMain(TOKEN)
    const ids = Array.from(doc.body.querySelectorAll('[data-el-id]'))
    expect(ids.length).toBeGreaterThan(2)
    expect(new Set(ids.map((e) => e.getAttribute('data-el-id'))).size).toBe(ids.length)
  })

  test('a selecao por pointerdown avisa o app', () => {
    const doc = mountDeck()
    const posts: Record<string, unknown>[] = []
    const originalPost = window.parent.postMessage.bind(window.parent)
    // jsdom: window.parent === window; intercepta para inspecionar.
    Object.defineProperty(window, 'parent', {
      value: {
        postMessage: (msg: Record<string, unknown>) => posts.push(msg),
      },
      configurable: true,
    })
    editorMain(TOKEN)
    const h1 = doc.querySelector('h1') as HTMLElement
    h1.dispatchEvent(
      new window.PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: 10,
        clientY: 10,
        button: 0,
      }),
    )
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
    void originalPost
    const select = posts.find((p) => p.type === 'select')
    expect(select).toBeTruthy()
    expect(select?.tag).toBe('h1')
    expect(String(select?.id)).toMatch(/^el-\d+$/)
  })

  test('o HTML devolvido vem limpo, sem os elementos do editor', () => {
    mountDeck()
    const posts: Record<string, unknown>[] = []
    Object.defineProperty(window, 'parent', {
      value: { postMessage: (msg: Record<string, unknown>) => posts.push(msg) },
      configurable: true,
    })
    editorMain(TOKEN)
    Object.defineProperty(window, 'parent', { value: window, configurable: true })
    const mutation = posts.find((p) => p.type === 'mutation')
    expect(mutation).toBeTruthy()
    const html = String(mutation?.html)
    expect(html).toContain('data-el-id')
    expect(html).not.toContain('ss-editor')
    expect(html).not.toContain('data-ss-edit')
  })

  /* Regressao: o editor um dia esqueceu de remover a propria tag <script>.
   * O codigo do editor entrava no documento, era salvo no deck e rodava de
   * novo na previa, recriando a camada de edicao dentro do modo visualizar. */
  test('o HTML devolvido nao carrega o script do editor', () => {
    const deck =
      '<!doctype html><html lang="pt-BR"><head><title>T</title></head><body class="ss-deck">' +
      '<main class="ss-stage"><section class="ss-slide" id="slide-1"><div class="ss-content" data-layout="title">' +
      '<h1>Oi</h1></div></section></main></body></html>'
    const comBits = injectEditorBits(deck, TOKEN, null)
    expect(comBits).toContain('ss-editor-script')
    expect(comBits).toContain('data-ss-edit')

    // Copia o documento (incluindo a tag de script, inertazia) para o jsdom.
    const parsed = new DOMParser().parseFromString(comBits, 'text/html')
    document.documentElement.innerHTML = parsed.documentElement.innerHTML

    const posts: Record<string, unknown>[] = []
    Object.defineProperty(window, 'parent', {
      value: { postMessage: (msg: Record<string, unknown>) => posts.push(msg) },
      configurable: true,
    })
    editorMain(TOKEN)
    Object.defineProperty(window, 'parent', { value: window, configurable: true })

    const html = String(posts.find((p) => p.type === 'mutation')?.html)
    expect(html).not.toContain('ss-editor-script')
    expect(html).not.toContain('ss-editor-style')
    expect(html).not.toContain('id="ss-editor"')
    expect(html).not.toContain('data-ss-edit')
    expect(html).not.toContain('data-ss-host')
    expect(html).not.toContain('<base')
    // O deck em si continua la.
    expect(html).toContain('class="ss-slide"')
    expect(html).toContain('data-el-id')
  })

  test('injectEditorBits eh idempotente', () => {
    const deck = '<!doctype html><html><head></head><body><p>oi</p></body></html>'
    const umaVez = injectEditorBits(deck, TOKEN, null)
    const duasVezes = injectEditorBits(umaVez, TOKEN, null)
    const tags = (t: string): number => (t.match(/<script id="ss-editor-script">/g) ?? []).length
    expect(tags(umaVez)).toBe(1)
    expect(tags(duasVezes)).toBe(1)
    expect(duasVezes.match(/ data-ss-edit/g) ?? []).toHaveLength(1)
    expect(duasVezes.match(/ data-ss-host/g) ?? []).toHaveLength(1)
  })
})

describe('injectEditorBits', () => {
  const deck =
    '<!doctype html><html lang="pt-BR"><head><title>T</title></head><body><main></main></body></html>'

  test('injeta base, modo edição e script do editor', () => {
    const out = injectEditorBits(deck, TOKEN, 'file:///C:/deck/')
    expect(out).toContain('<base href="file:///C:/deck/">')
    expect(out).toContain('data-ss-edit')
    expect(out).toContain('id="ss-editor-script"')
    expect(out.indexOf('ss-editor-script')).toBeGreaterThan(out.indexOf('<base'))
  })

  test('o script entra no fim do body (o editor precisa do DOM pronto)', () => {
    const out = injectEditorBits(deck, TOKEN, null)
    expect(out.indexOf('ss-editor-script')).toBeGreaterThan(out.indexOf('<main>'))
  })

  test('funciona sem base href', () => {
    const out = injectEditorBits(deck, TOKEN, null)
    expect(out).not.toContain('<base')
    expect(out).toContain('data-ss-edit')
  })

  test('documento sem head ainda recebe o script', () => {
    const out = injectEditorBits('<html><body><p>oi</p></body></html>', TOKEN, null)
    expect(out).toContain('id="ss-editor-script"')
  })
})
