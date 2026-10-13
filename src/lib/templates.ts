/* Galeria de modelos. Cada modelo gera um deck HTML unico completo.
 *
 * Regras de conteudo: os modelos trazem EXEMPLO concreto, nao instrucao.
 * O usuario ve como fica um deck pronto e troca o que eh dele. Onde o dado
 * precisa ser real (numero, contato), fica entre colchetes como [ ]. */

import { buildDeckHtml } from './buildDoc'
import {
  btn,
  btnRow,
  card,
  cards,
  escapeHtml,
  h1,
  h2,
  img,
  kicker,
  num,
  p,
  quote,
  resetSlideSeq,
  slide,
  spacer,
  sub,
  table,
  ul,
} from './snippets'

export interface Template {
  id: string
  name: string
  summary: string
  useCase: string
  accent: string
  bg: string
  build: () => string
}

/** Placeholder de imagem honesto: um SVG que diz o que vai no lugar. */
function placeholder(label: string, w: number, h: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#1D242C"/>` +
    `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#303A45" stroke-width="2" stroke-dasharray="8 6"/>` +
    `<text x="50%" y="50%" fill="#8A97A3" font-family="system-ui, sans-serif" font-size="${Math.max(
      14,
      Math.round(w / 14),
    )}" text-anchor="middle" dominant-baseline="middle">${escapeHtml(label)}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function tokens(accent: string, extra: Record<string, string> = {}): string {
  const body = Object.entries({ '--ss-accent': accent, ...extra })
    .map(([k, v]) => `${k}:${v}`)
    .join(';')
  return `:root{${body}}`
}

/* ------------------------------------------------------------------ */
/* 1. Pitch de startup                                                */
/* ------------------------------------------------------------------ */

const pitch: Template = {
  id: 'pitch',
  name: 'Pitch de startup',
  summary: 'Exemplo pronto: o problema, a solução em três partes e o próximo passo.',
  useCase: 'Para vender uma ideia em 5 a 8 minutos. Troque os textos pelos seus.',
  accent: '#F5B841',
  bg: '#0E1116',
  build: () => {
    resetSlideSeq()
    const s = [
      slide(
        [
          kicker('Apresentação', { anim: 'fade', dur: 500 }),
          h1('Dona de padaria perde 2 horas por dia somando venda no papel'),
          sub('O Caixa Certo faz o fechamento sozinho, no fim do turno.'),
          spacer(8),
          btnRow(btn('Ver o plano', '#slide-2', 'primary', { anim: 'fade-up', delay: 220 })),
        ],
        { layout: 'title', transition: 'fade' },
      ),
      slide(
        [
          h2('Como a padaria fecha o caixa hoje', { anim: 'fade-up' }),
          p('O fechamento é feito à mão, numa caderneta, depois do último cliente.', {
            anim: 'fade-up',
            delay: 120,
          }),
          spacer(6),
          ul(
            [
              'Duas pessoas conferem a mesma conta',
              'Erro de troco só aparece no dia seguinte',
              'Ninguém sabe o lucro da semana',
            ],
            { anim: 'fade-up', delay: 240 },
          ),
        ],
        { layout: 'list', transition: 'slide' },
      ),
      slide(
        [
          h2('A solução em três partes', { anim: 'fade-up' }),
          spacer(6),
          cards(
            card('Registro na venda', 'Cada venda entra no caixa com dois toques.', { anim: 'fade-up', delay: 100 }),
            card('Fechamento sozinho', 'O sistema soma, confere e aponta a diferença.', { anim: 'fade-up', delay: 220 }),
            card('Relatório semanal', 'Lucro por produto, sem planilha.', { anim: 'fade-up', delay: 340 }),
          ),
        ],
        { layout: 'cards', transition: 'slide' },
      ),
      slide(
        [
          h2('Os números que sustentam', { anim: 'fade-up' }),
          p('Troque pelos seus dados e mantenha a fonte anotada.', { anim: 'fade-up', delay: 120 }),
          spacer(8),
          table(
            ['Indicador', 'Valor', 'Fonte'],
            [
              ['[indicador]', '[valor]', '[de onde veio]'],
              ['[indicador]', '[valor]', '[de onde veio]'],
            ],
          ),
        ],
        { layout: 'statement', transition: 'slide-up' },
      ),
      slide(
        [
          h1('Próximo passo'),
          sub('Uma conversa de 30 minutos com o dono da padaria.'),
          spacer(6),
          btnRow(btn('Agendar conversa', 'mailto:contato@exemplo.com', 'primary')),
        ],
        { layout: 'title', transition: 'zoom-in' },
      ),
    ]
    return buildDeckHtml({ title: 'Pitch', slides: s, extraCss: tokens('#F5B841') })
  },
}

/* ------------------------------------------------------------------ */
/* 2. Aula e workshop                                                 */
/* ------------------------------------------------------------------ */

const aula: Template = {
  id: 'aula',
  name: 'Aula e workshop',
  summary: 'Exemplo pronto: objetivos, conceito com analogia e exercício em sala.',
  useCase: 'Para dar aula, treinar time ou conduzir workshop.',
  accent: '#2F6BFF',
  bg: '#F7F8FA',
  build: () => {
    resetSlideSeq()
    const light = ':root{--ss-ink:#10151C;--ss-muted:#4A5563;--ss-bg:#F7F8FA;--ss-surface:#FFFFFF;--ss-line:#D8DEE6;--ss-accent:#2F6BFF}'
    const s = [
      slide(
        [
          kicker('Aula 1', { anim: 'fade', dur: 500 }),
          h1('Como a internet chega na sua casa'),
          sub('Prof. Ana Ribeiro · Colégio Santa Clara'),
        ],
        { layout: 'title', transition: 'fade', ink: '#10151C', bg: '#F7F8FA' },
      ),
      slide(
        [
          h2('O que você vai aprender', { anim: 'fade-up' }),
          spacer(4),
          ul(
            [
              'Explicar o caminho de um site até a tela',
              'Diferenciar provedor de navegador',
              'Reconhecer uma conexão insegura',
            ],
            { anim: 'fade-up', delay: 160 },
          ),
        ],
        { layout: 'list', transition: 'slide', ink: '#10151C', bg: '#FFFFFF' },
      ),
      slide(
        [
          h2('Pense num sistema de correios', { anim: 'fade-up' }),
          p('O navegador escreve a carta, o provedor é o carteiro e o site é o destinatário.', {
            anim: 'fade-up',
            delay: 120,
          }),
          spacer(6),
          quote('Toda visita a um site é uma carta com resposta.', 'Ana Ribeiro', { anim: 'fade-up', delay: 260 }),
        ],
        { layout: 'statement', transition: 'slide', ink: '#10151C', bg: '#F7F8FA' },
      ),
      slide(
        [
          h2('Exercício em quatro passos', { anim: 'fade-up' }),
          spacer(4),
          ul(
            [
              'Abra o site da escola e observe o cadeado',
              'Escreva o endereço completo no caderno',
              'Em dupla, marquem o que é provedor e o que é site',
              'Cada dupla explica um passo para a turma',
            ],
            { anim: 'fade-up', delay: 160 },
          ),
        ],
        { layout: 'list', transition: 'zoom-in', ink: '#10151C', bg: '#FFFFFF' },
      ),
      slide(
        [
          h1('Para a próxima aula'),
          sub('Leitura: capítulo 3 do caderno. Entrega: o mapa do exercício.'),
        ],
        { layout: 'title', transition: 'fade', ink: '#10151C', bg: '#F7F8FA' },
      ),
    ]
    return buildDeckHtml({
      title: 'Aula',
      slides: s,
      extraCss: `${light}\n:root{--slide-ink:#10151C}`,
    })
  },
}

/* ------------------------------------------------------------------ */
/* 3. Portfólio de projetos                                           */
/* ------------------------------------------------------------------ */

const portfolio: Template = {
  id: 'portfolio',
  name: 'Portfólio de projetos',
  summary: 'Exemplo pronto: três projetos com desafio, entrega e contato.',
  useCase: 'Designer, fotógrafo, desenvolvedor ou estudante.',
  accent: '#7FD0FF',
  bg: '#0E1116',
  build: () => {
    resetSlideSeq()
    const projectSlide = (n: number, name: string, desafio: string, entrega: string, foto: string): string =>
      slide(
        [
          kicker(`Projeto ${n}`, { anim: 'fade', dur: 400 }),
          h2(name, { anim: 'fade-up' }),
          spacer(4),
          img(placeholder(foto, 960, 540), `Imagem do projeto ${n}`, { anim: 'zoom', delay: 160 }),
          spacer(4),
          p(`Desafio: ${desafio}`, { anim: 'fade-up', delay: 300 }),
          p(`Entrega: ${entrega}`, { anim: 'fade-up', delay: 420 }),
        ],        { layout: 'split', transition: 'slide' },
      )
    const s = [
      slide(
        [
          kicker('Portfólio', { anim: 'fade', dur: 500 }),
          h1('Marina Duarte'),
          sub('Ilustradora editorial · São Paulo'),
        ],
        { layout: 'title', transition: 'fade' },
      ),
      projectSlide(
        1,
        'Cartilha da horta comunitária',
        'explicar plantio em 12 páginas para quem não lê com facilidade',
        '12 ilustrações e diagramação final',
        'Foto: as páginas abertas',
      ),
      projectSlide(
        2,
        'Identidade da feira do Bela Vista',
        'um símbolo que funcionasse em faixa e em sacola',
        'logotipo, paleta e manual de uso',
        'Foto: a faixa na entrada da feira',
      ),
      projectSlide(
        3,
        'Retratos da oficina de costura',
        'mostrar o trabalho das mãos sem expor os rostos',
        'série de 9 retratos para a exposição',
        'Foto: as mãos na máquina',
      ),
      slide(
        [
          h1('Vamos conversar'),
          sub('marina@exemplo.com · (11) 90000-0000'),
          spacer(6),
          btnRow(btn('Enviar email', 'mailto:marina@exemplo.com', 'primary')),
        ],
        { layout: 'title', transition: 'zoom-in' },
      ),
    ]
    return buildDeckHtml({ title: 'Portfólio', slides: s, extraCss: tokens('#7FD0FF') })
  },
}

/* ------------------------------------------------------------------ */
/* 4. Relatório de período                                            */
/* ------------------------------------------------------------------ */

const relatorio: Template = {
  id: 'relatorio',
  name: 'Relatório de período',
  summary: 'Exemplo pronto: resultados em tabela, o que funcionou e o plano.',
  useCase: 'Prestar contas para gestão ou cliente. Troque os números pelos seus.',
  accent: '#5BD98A',
  bg: '#0E1116',
  build: () => {
    resetSlideSeq()
    const s = [
      slide(
        [
          kicker('Relatório', { anim: 'fade', dur: 500 }),
          h1('Resultados de agosto'),
          sub('Loja Bela Vista · período: 1 a 31 de agosto'),
        ],
        { layout: 'title', transition: 'fade' },
      ),
      slide(
        [
          h2('Números do período', { anim: 'fade-up' }),
          p('Exemplo de preenchimento. Substitua pelos dados reais e guarde a fonte.', {
            anim: 'fade-up',
            delay: 120,
          }),
          spacer(8),
          table(
            ['Indicador', 'Agosto', 'Observação'],
            [
              ['Vendas', 'R$ 48.200', 'sistema de caixa'],
              ['Ticket médio', 'R$ 37,40', 'sistema de caixa'],
              ['Reclamações', '6', 'planilha de atendimento'],
            ],
          ),
        ],
        { layout: 'statement', transition: 'slide-up' },
      ),
      slide(
        [
          h2('O que funcionou', { anim: 'fade-up' }),
          spacer(4),
          ul(
            [
              'Vitrine de fundo de loja: +12% de entrada na loja',
              'Atendimento por ordem de chegada: fila máxima caiu para 8 pessoas',
            ],
            { anim: 'fade-up', delay: 160 },
          ),
          spacer(8),
          h2('O que não funcionou', { anim: 'fade-up', delay: 260 }),
          ul(
            [
              'Panfleto no semáforo: 3 clientes novos em 5 mil panfletos',
              'Promoção de terça: repetiu o movimento de uma terça comum',
            ],
            { anim: 'fade-up', delay: 380 },
          ),
        ],
        { layout: 'list', transition: 'slide' },
      ),
      slide(
        [
          h2('Plano de setembro', { anim: 'fade-up' }),
          spacer(4),
          cards(
            card('Vitrine nova', 'Tema de primavera, montada até o dia 10. Responsável: Marina.', { anim: 'fade-up', delay: 120 }),
            card('Ficha de cliente', 'Perguntar o CEP no caixa. Responsável: Paulo.', { anim: 'fade-up', delay: 240 }),
            card('Fim do panfleto', 'Parar a impressão e realocar a verba. Responsável: gestão.', { anim: 'fade-up', delay: 360 }),
          ),
        ],
        { layout: 'cards', transition: 'zoom-in' },
      ),
    ]
    return buildDeckHtml({ title: 'Relatório', slides: s, extraCss: tokens('#5BD98A') })
  },
}

/* ------------------------------------------------------------------ */
/* 5. Curso em slides                                                 */
/* ------------------------------------------------------------------ */

const curso: Template = {
  id: 'curso',
  name: 'Curso e trilha',
  summary: 'Exemplo pronto: módulo com conceito, exemplo prático e exercício.',
  useCase: 'Material de estudo, trilha de aprendizagem, ebook.',
  accent: '#C79BFF',
  bg: '#0E1116',
  build: () => {
    resetSlideSeq()
    const s = [
      slide(
        [
          kicker('Módulo 1', { anim: 'fade' }),
          h1('Fotografia com celular'),
          sub('Três aulas para sair do automático.'),
        ],
        { layout: 'title', transition: 'fade' },
      ),
      slide(
        [
          h2('Luz antes de câmera', { anim: 'fade-up' }),
          p('Boa foto é boa luz. Procure a janela antes de procurar o aplicativo.', {
            anim: 'fade-up',
            delay: 120,
          }),
          spacer(6),
          ul(
            [
              'Luz de janela deixa a pele macia',
              'Flash do celular achata o rosto',
              'Sol do meio-dia cria sombra dura',
            ],
            { anim: 'fade-up', delay: 240 },
          ),
        ],
        { layout: 'list', transition: 'fade' },
      ),
      slide(
        [
          h2('Exemplo: mesma janela, duas horas', { anim: 'fade-up' }),
          spacer(4),
          img(placeholder('Foto: o mesmo rosto às 9h e às 16h', 960, 540), 'Comparação de luz', {
            anim: 'zoom',
            delay: 160,
          }),
          spacer(4),
          p('À esquerda, luz lateral suave. À direita, luz de frente, chapada.', {
            anim: 'fade-up',
            delay: 320,
          }),
        ],
        { layout: 'split', transition: 'fade' },
      ),
      slide(
        [
          h2('Exercício da aula', { anim: 'fade-up' }),
          p('Uma janela, um objeto, três horários. Entregue as três fotos.', {
            anim: 'fade-up',
            delay: 120,
          }),
          spacer(6),
          ul(
            [
              'Manhã: objeto a 30 cm da janela',
              'Meio-dia: mesmo objeto, contraluz',
              'Tarde: objeto a 1 m da janela',
            ],
            { anim: 'fade-up', delay: 240 },
          ),
        ],
        { layout: 'statement', transition: 'fade' },
      ),
      slide(
        [h1('Fim do módulo'), sub('Módulo 2: composição e enquadramento.')],
        { layout: 'title', transition: 'fade' },
      ),
    ]
    return buildDeckHtml({ title: 'Curso', slides: s, extraCss: tokens('#C79BFF') })
  },
}

/* ------------------------------------------------------------------ */
/* 6. Demonstração de produto                                         */
/* ------------------------------------------------------------------ */

const produto: Template = {
  id: 'produto',
  name: 'Demonstração de produto',
  summary: 'Exemplo pronto: telas do produto, três recursos e chamada final.',
  useCase: 'Apresentar uma ferramenta para cliente ou time.',
  accent: '#F5B841',
  bg: '#0E1116',
  build: () => {
    resetSlideSeq()
    const s = [
      slide(
        [
          kicker('Produto', { anim: 'fade' }),
          h1('Organiza Fotos'),
          sub('Separa suas fotos de viagem em álbuns, sem você fazer nada.'),
          spacer(8),
          btnRow(
            btn('Ver como funciona', '#slide-2', 'primary', { anim: 'fade-up', delay: 220 }),
            btn('Ver recursos', '#slide-3', 'ghost', { anim: 'fade-up', delay: 340 }),
          ),
        ],
        { layout: 'title', transition: 'fade' },
      ),
      slide(
        [
          h2('Como funciona', { anim: 'fade-up' }),
          spacer(4),
          img(placeholder('Tela: a galeria já separada por cidade', 960, 540), 'Tela principal', {
            anim: 'zoom',
            delay: 160,
          }),
          spacer(4),
          p('Você só escolhe a pasta. O resto é automático.', { anim: 'fade-up', delay: 320 }),
        ],
        { layout: 'split', transition: 'fade' },
      ),
      slide(
        [
          h2('Três recursos', { anim: 'fade-up' }),
          spacer(6),
          cards(
            card('Separa por lugar', 'Agrupa pela cidade registrada na foto.', { anim: 'fade-up', delay: 120 }),
            card('Tira repetida', 'Guarda uma de cada sequação de fotos iguais.', { anim: 'fade-up', delay: 240 }),
            card('Funciona offline', 'Nada sobe para a nuvem. As fotos ficam com você.', { anim: 'fade-up', delay: 360 }),
          ),
        ],
        { layout: 'cards', transition: 'fade' },
      ),
      slide(
        [
          h1('Comece hoje'),
          sub('Versão de teste com 50 fotos, sem cadastro.'),
          spacer(6),
          btnRow(btn('Baixar a versão de teste', '#slide-1', 'primary')),
        ],
        { layout: 'title', transition: 'fade' },
      ),
    ]
    return buildDeckHtml({ title: 'Produto', slides: s, extraCss: tokens('#F5B841') })
  },
}

/* ------------------------------------------------------------------ */
/* 7. Galeria de imagens                                              */
/* ------------------------------------------------------------------ */

const galeria: Template = {
  id: 'galeria',
  name: 'Galeria de imagens',
  summary: 'Exemplo pronto: fotos em tela cheia com legenda, uma por slide.',
  useCase: 'Evento, casamento, obra, viagem.',
  accent: '#FF9E7A',
  bg: '#0B0D10',
  build: () => {
    resetSlideSeq()
    const photo = (n: number, caption: string, nota: string): string =>
      `<section class="ss-slide" id="slide-${n + 2}" data-transition="fade">
  <img class="ss-media" src="${placeholder(nota, 1600, 900)}" alt="Foto ${n}">
  <div class="ss-scrim"></div>
  <div class="ss-content" data-layout="image">
    <h2 data-anim="rise">${escapeHtml(caption)}</h2>
  </div>
</section>`
    const s = [
      slide(
        [kicker('Galeria', { anim: 'fade' }), h1('Casamento da Ana e do Pedro'), sub('14 de março · Sitio Boa Vista')],
        { layout: 'title', transition: 'fade' },
      ),
      photo(1, 'A fila para entrar', 'Foto: os convidados chegando'),
      photo(2, 'O primeiro beijo', 'Foto: os noivos na saída'),
      photo(3, 'A mesa da família', 'Foto: a mesa montada'),
      slide([h1('Obrigado'), sub('Fotos do álbum completo: [link]')],
        { layout: 'title', transition: 'zoom-in' },
      ),
    ]
    return buildDeckHtml({ title: 'Galeria', slides: s, extraCss: tokens('#FF9E7A') })
  },
}

/* ------------------------------------------------------------------ */
/* 8. Minimalista                                                     */
/* ------------------------------------------------------------------ */

const minimal: Template = {
  id: 'minimal',
  name: 'Minimalista',
  summary: 'Exemplo pronto: quatro frases grandes, preto no branco.',
  useCase: 'Quem quer começar do zero sem cara de modelo.',
  accent: '#10151C',
  bg: '#FFFFFF',
  build: () => {
    resetSlideSeq()
    const mono = ':root{--ss-ink:#10151C;--ss-muted:#4A5563;--ss-bg:#FFFFFF;--ss-surface:#F2F4F7;--ss-line:#D8DEE6;--ss-accent:#10151C}'
    const s = [
      slide(
        [num('01'), h1('Uma ideia por slide'), sub('Se não cabe numa frase, são dois slides.')],
        { layout: 'statement', transition: 'fade', ink: '#10151C', bg: '#FFFFFF' },
      ),
      slide(
        [num('02'), h2('O argumento'), p('A plateia esquece o dado. Lembra da história.')],
        { layout: 'statement', transition: 'fade', ink: '#10151C', bg: '#F2F4F7' },
      ),
      slide(
        [num('03'), h2('A evidência'), p('Um número com fonte. Sem fonte, melhor não mostrar.')],
        { layout: 'statement', transition: 'fade', ink: '#10151C', bg: '#FFFFFF' },
      ),
      slide(
        [num('04'), h1('Fim'), sub('Seu contato')],
        { layout: 'statement', transition: 'fade', ink: '#10151C', bg: '#FFFFFF' },
      ),
    ]
    return buildDeckHtml({ title: 'Minimalista', slides: s, extraCss: mono })
  },
}

export const TEMPLATES: Template[] = [pitch, aula, portfolio, relatorio, curso, produto, galeria, minimal]

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id)
}
