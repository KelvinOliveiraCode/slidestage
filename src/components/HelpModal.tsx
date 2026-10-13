import { Modal } from './Modal'
import { store } from '../lib/store'

const SHORTCUTS: [string, string][] = [
  ['Ctrl+S', 'Salvar o deck'],
  ['Ctrl+Shift+S', 'Salvar como'],
  ['Ctrl+O', 'Abrir um HTML do computador'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'Desfazer e refazer'],
  ['Ctrl+E', 'Alternar entre visualizar e editar o slide'],
  ['F5', 'Apresentar em tela cheia'],
  ['Delete', 'Excluir o elemento selecionado'],
  ['Setas', 'Mover 1px (com Shift, 10px)'],
  ['Enter', 'Editar o texto do elemento'],
  ['Ctrl+D', 'Duplicar o elemento'],
]

const DECK_KEYS: [string, string][] = [
  ['Seta direita / espaço', 'Próximo slide'],
  ['Seta esquerda', 'Slide anterior'],
  ['Home / End', 'Primeiro e último slide'],
  ['F', 'Tela cheia'],
  ['Clique nas laterais', 'Avancar ou voltar'],
  ['Arrastar no celular', 'Passar slides'],
]

export function HelpModal() {
  return (
    <Modal title="Ajuda" onClose={() => store.openHelp(false)} wide>
      <div className="help-grid">
        <section>
          <h3>Editar no canvas</h3>
          <ul className="help-list">
            <li>Clique em um elemento para selecionar. Arraste para mover, as pontas para redimensionar.</li>
            <li>Clique duas vezes em um texto para escrever direto no slide.</li>
            <li>
              Cada elemento é independente: arrastar um texto não empurra nem mistura os outros.
              O lugar que ele ocupava fica reservado, então o slide não se reorganiza sozinho.
            </li>
            <li>
              Precisão: clique no elemento e use as setas do teclado (1px, ou 10px com Shift).
              As linhas de enquadramento mostram o centro e os terços do slide para alinhar.
            </li>
            <li>O painel da direita muda cor, tamanho, animação, link e transforma em botão.</li>
            <li>O painel esquerdo organiza os slides: adiciona, duplica, reordena e exclui.</li>
          </ul>
        </section>
        <section>
          <h3>Visualizar ou editar</h3>
          <ul className="help-list">
            <li>
              <strong>Visualizar</strong>: o deck funciona como vai funcionar
              publicado. Setas passam os slides, cliques nas laterais também.
            </li>
            <li>
              <strong>Editar</strong>: clique seleciona, arrastar move, as pontas
              redimensionam, clique duplo escreve no texto.
            </li>
            <li>
              <strong>Código</strong>: o HTML do deck, com realce. Salvar com
              Ctrl+S dentro do editor.
            </li>
            <li>Links e botões com endereço externo abrem no navegador do sistema, nunca uma janela dentro do app.</li>
          </ul>
        </section>
        <section>
          <h3>Atalhos do app</h3>
          <dl className="help-keys">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k}>
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Atalhos do deck (ao apresentar)</h3>
          <dl className="help-keys">
            {DECK_KEYS.map(([k, v]) => (
              <div key={k}>
                <dt>
                  <kbd>{k}</kbd>
                </dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section>
          <h3>Publicar no GitHub Pages</h3>
          <ol className="help-steps">
            <li>Clique em Arquivo e em &quot;Publicar no GitHub Pages&quot;.</li>
            <li>Salve o arquivo como <code>index.html</code> dentro de uma pasta.</li>
            <li>
              No GitHub: crie um repositório, suba a pasta e va em Settings, Pages. Em &quot;Build and
              deployment&quot; escolha a branch <code>main</code> e a pasta <code>/ (root)</code>.
            </li>
            <li>Espere alguns minutos e abra o link que o GitHub mostrar.</li>
          </ol>
          <p className="help-note">
            O arquivo é único: CSS, JavaScript e imagens vão embutidos. Dá para mandar por e-mail ou
            abrir em qualquer navegador, sem servidor.
          </p>
        </section>
        <section>
          <h3>Abrir HTML de fora</h3>
          <ul className="help-list">
            <li>Ctrl+O abre qualquer HTML, feito no SlideStage ou no VS Code.</li>
            <li>Se o arquivo tiver slides no formato do app, o painel de slides funciona inteiro.</li>
            <li>Se não tiver, você ainda edita o código e mexe nos elementos no canvas.</li>
            <li>Se você salvar o arquivo fora do app, o SlideStage avisa e oferece recarregar.</li>
          </ul>
        </section>
      </div>
    </Modal>
  )
}
