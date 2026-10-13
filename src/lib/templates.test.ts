// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import { TEMPLATES } from './templates'
import { DECK_MARKER } from './buildDoc'
import { parseDeck } from './doc'

describe('galeria de modelos', () => {
  test('todo modelo gera um deck válido', () => {
    for (const tpl of TEMPLATES) {
      const html = tpl.build()
      expect(html, tpl.id).toContain(DECK_MARKER)
      expect(html.startsWith('<!doctype html>'), tpl.id).toBe(true)
      const parsed = parseDeck(html)
      expect(parsed.slides.length, tpl.id).toBeGreaterThanOrEqual(4)
      expect(parsed.isDeck, tpl.id).toBe(true)
    }
  })

  test('nenhum modelo depende da internet', () => {
    for (const tpl of TEMPLATES) {
      const html = tpl.build()
      expect(html, tpl.id).not.toMatch(/<link\s/)
      expect(html, tpl.id).not.toMatch(/src="https?:/)
      expect(html, tpl.id).not.toMatch(/@import/)
      expect(html, tpl.id).not.toMatch(/fetch\(/)
    }
  })

  test('nenhum modelo usa travessao nem emoji (regra R-02)', () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.build(), tpl.id).not.toContain('—')
      expect(tpl.name + tpl.summary + tpl.useCase, tpl.id).not.toContain('—')
    }
  })

  test('modelos trazem exemplo concreto, não instrução', () => {
    const html = TEMPLATES.map((t) => t.build()).join('')
    // conteúdo de exemplo de verdade, não textos de instrução
    expect(html).toContain('Dona de padaria')
    expect(html).toContain('Marina Duarte')
    expect(html).toContain('Organiza Fotos')
    expect(html).toContain('R$ 48.200')
    // onde o dado precisa ser do usuário, fica entre colchetes
    expect(html).toContain('[indicador]')
    expect(html).not.toMatch(/\b10k\+|\b99\.9%|\b500m\b|\bmilhoes de usuários\b/i)
  })

  test('nenhum modelo usa scroll', () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.build(), tpl.id).not.toContain('data-scroll')
    }
  })

  test('ids de modelo são únicos', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
