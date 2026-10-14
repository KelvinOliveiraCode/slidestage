// @vitest-environment jsdom
import { describe, expect, test } from 'vitest'

import {
  addSlide,
  applyDataUrls,
  deleteElement,
  deleteSlide,
  duplicateElement,
  duplicateSlide,
  extractAssetRefs,
  insertElement,
  moveSlide,
  parseDeck,
  reorderElement,
  replaceSlideInner,
  setElementAttrs,
  setElementStyle,
  setElementText,
  setSlideAttrs,
} from './doc'
import { buildStarterDeck } from './buildDoc'

const deck = buildStarterDeck()

describe('parseDeck', () => {
  test('le slides, título e da id', () => {
    const parsed = parseDeck(deck)
    expect(parsed.slides.length).toBe(3)
    expect(parsed.isDeck).toBe(true)
    expect(parsed.slides[0].id).toBe('slide-1')
    expect(parsed.slides[0].title.length).toBeGreaterThan(0)
    expect(parsed.title).toBe('Minha apresentação')
  })

  test('reconhece página sem slides', () => {
    const parsed = parseDeck('<html><body><h1>Página livre</h1></body></html>')
    expect(parsed.isDeck).toBe(false)
    expect(parsed.slides.length).toBe(0)
  })
})

describe('mutacoes de slide', () => {
  test('adiciona depois do índice', () => {
    const html = addSlide(deck, 0, '<section class="ss-slide" id="novo"><div class="ss-content"></div></section>')
    const parsed = parseDeck(html)
    expect(parsed.slides.length).toBe(4)
    expect(parsed.slides[1].id).toBe('novo')
  })

  test('move, duplica e exclui', () => {
    const movido = moveSlide(deck, 'slide-3', -1)
    expect(parseDeck(movido).slides.map((s) => s.id)).toEqual(['slide-1', 'slide-3', 'slide-2'])
    const duplicado = duplicateSlide(deck, 'slide-1')
    expect(parseDeck(duplicado).slides.length).toBe(4)
    const excluido = deleteSlide(deck, 'slide-2')
    expect(parseDeck(excluido).slides.map((s) => s.id)).toEqual(['slide-1', 'slide-3'])
  })

  test('nunca exclui o último slide', () => {
    const um = deleteSlide(deck, 'slide-1')
    const dois = deleteSlide(um, 'slide-2')
    const três = deleteSlide(dois, 'slide-3')
    expect(três).toBe(dois)
  })

  test('troca transição, fundo e scroll', () => {
    const html = setSlideAttrs(deck, 'slide-1', { transition: 'flip', bg: '#123456' })
    const meta = parseDeck(html).slides[0]
    expect(meta.transition).toBe('flip')
    expect(meta.bg).toBe('#123456')
  })

  test('le e ajusta velocidade, opacidade e distância da transição', () => {
    const comTiming = setSlideAttrs(deck, 'slide-1', {
      timing: { dur: '700ms', op: '0.35', dist: '120px' },
    })
    const meta = parseDeck(comTiming).slides[0]
    expect(meta.dur).toBe('700ms')
    expect(meta.op).toBe('0.35')
    expect(meta.dist).toBe('120px')

    const limpo = setSlideAttrs(comTiming, 'slide-1', { timing: { dur: '', op: '' } })
    const depois = parseDeck(limpo).slides[0]
    expect(depois.dur).toBe('')
    expect(depois.op).toBe('')
    expect(depois.dist).toBe('120px')
  })

  test('substitui o conteúdo do slide', () => {
    const html = replaceSlideInner(deck, 'slide-1', '<div class="ss-content" data-layout="blank"></div>')
    expect(html).toContain('data-layout="blank"')
  })
})

describe('mutacoes de elemento', () => {
  const comId = insertElement(
    deck,
    'slide-1',
    '<p data-el-id="el-1" style="color:red">Texto</p>',
  )

  test('insere com id', () => {
    expect(comId).toContain('data-el-id="el-1"')
  })

  test('estilo, atributo e texto', () => {
    const estilo = setElementStyle(comId, 'el-1', { 'font-size': '40px', color: 'blue' })
    expect(estilo).toContain('font-size: 40px')
    expect(estilo).not.toContain('color:red')
    const attrs = setElementAttrs(estilo, 'el-1', { 'data-anim': 'fade-up', href: '#x' })
    expect(attrs).toContain('data-anim="fade-up"')
    const texto = setElementText(attrs, 'el-1', 'Novo texto')
    expect(texto).toContain('Novo texto')
    expect(texto).not.toContain('>Texto<')
  })

  test('duplica, reordena e exclui', () => {
    const dois = duplicateElement(comId, 'el-1')
    expect(parseDeck(dois).slides[0].title).toBeTruthy()
    const reordenado = reorderElement(dois, 'el-1', 'back')
    expect(reordenado).not.toBe(dois)
    const excluido = deleteElement(dois, 'el-1')
    expect(excluido).not.toContain('data-el-id="el-1"')
  })

  test('não exclui slide por deleteElement', () => {
    const slideComId = setElementAttrs(deck, 'slide-1', {})
    expect(deleteElement(slideComId, 'slide-1')).toBe(slideComId)
  })
})

describe('assets', () => {
  test('acha referencias locais e ignora remotas', () => {
    const html =
      '<html><body><img src="img/foto.png"><a href="#slide-2">x</a>' +
      '<img src="https://exemplo.com/a.png"><img src="data:image/png;base64,AAA"></body></html>'
    const refs = extractAssetRefs(html)
    expect(refs).toEqual(['img/foto.png'])
  })

  test('aplica data URLs', () => {
    const html = '<html><body><img src="img/foto.png"></body></html>'
    const out = applyDataUrls(html, [{ original: 'img/foto.png', dataUrl: 'data:image/png;base64,ZZZ' }])
    expect(out).toContain('src="data:image/png;base64,ZZZ"')
  })
})

describe('notas do apresentador', () => {
  test('parseDeck le notas do slide', () => {
    const html = buildStarterDeck().replace(
      '<section class="ss-slide" id="slide-1" data-transition="fade">',
      '<section class="ss-slide" id="slide-1" data-transition="fade" data-notes="Minhas notas">',
    )
    const parsed = parseDeck(html)
    expect(parsed.slides[0].notes).toBe('Minhas notas')
  })

  test('setSlideAttrs define e limpa notas', () => {
    let html = setSlideAttrs(deck, 'slide-1', { notes: 'Notas do slide 1' })
    let meta = parseDeck(html).slides[0]
    expect(meta.notes).toBe('Notas do slide 1')

    html = setSlideAttrs(html, 'slide-1', { notes: '' })
    meta = parseDeck(html).slides[0]
    expect(meta.notes).toBe('')
  })

  test('notas sobrevivem a duplicacao de slide', () => {
    const html = setSlideAttrs(deck, 'slide-1', { notes: 'Notas originais' })
    const duplicado = duplicateSlide(html, 'slide-1')
    // O titulo do primeiro slide vem do kicker "Apresentação"
    const meta = parseDeck(duplicado).slides.find((s) => s.title === 'Apresentação')
    expect(meta?.notes).toBe('Notas originais')
  })
})
