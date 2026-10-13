import { describe, expect, test } from 'vitest'

import { buildDeckHtml, buildStarterDeck, readTitle, DECK_MARKER } from './buildDoc'

describe('buildDeckHtml', () => {
  const html = buildDeckHtml({
    title: 'Teste',
    slides: ['<section class="ss-slide"><div class="ss-content"><h1>Oi</h1></div></section>'],
  })

  test('gera documento único e autossuficiente', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain(DECK_MARKER)
    expect(html).toContain('<style>')
    expect(html).toContain('<script>')
    expect(html).not.toMatch(/<link\s/)
    expect(html).not.toMatch(/src="https?:/)
  })

  test('da id aos slides que não tem', () => {
    expect(html).toContain('id="slide-1"')
  })

  test('mantem ids existentes', () => {
    const comId = buildDeckHtml({
      title: 'T',
      slides: ['<section class="ss-slide" id="slide-9"><div class="ss-content"></div></section>'],
    })
    expect(comId).toContain('id="slide-9"')
  })

  test('deck nao carrega modo scroll', () => {
    const html = buildDeckHtml({ title: 'T', slides: ['<section class="ss-slide"></section>'] })
    expect(html).not.toContain('data-scroll')
    expect(html).not.toContain('[data-reveal]')
  })

  test('escapa o título', () => {
    const perigoso = buildDeckHtml({
      title: '<script>alert(1)</script>',
      slides: ['<section class="ss-slide"></section>'],
    })
    expect(perigoso).not.toContain('<script>alert(1)</script>')
    expect(perigoso).toContain('&lt;script&gt;')
  })
})

describe('buildStarterDeck', () => {
  test('três slides, título e transições diferentes', () => {
    const html = buildStarterDeck()
    expect(html.match(/class="ss-slide"/g)?.length).toBe(3)
    expect(html).toContain('data-transition="fade"')
    expect(html).toContain('data-transition="zoom-in"')
    expect(readTitle(html)).toBe('Minha apresentação')
  })
})

describe('readTitle', () => {
  test('cai para Sem título quando não existe', () => {
    expect(readTitle('<html><head></head><body></body></html>')).toBe('Sem título')
  })
})
