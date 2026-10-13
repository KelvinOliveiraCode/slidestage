import { Icon } from './Icons'
import { IconButton, Menu, Segmented, Sep, ToolButton } from './Controls'
import { store, useStore, type Device, type View } from '../lib/store'

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true" className="logo">
      <rect x="1.5" y="1.5" width="23" height="23" rx="7" fill="#12161B" stroke="#303A45" strokeWidth="1.5" />
      <rect x="6" y="6.5" width="12" height="9" rx="2" fill="#1D242C" stroke="#303A45" strokeWidth="1" />
      <rect x="8.5" y="9" width="12" height="9" rx="2" fill="#171C22" stroke="#F5B841" strokeWidth="1.2" />
      <rect x="11" y="11.5" width="12" height="9" rx="2" fill="#0B0D10" stroke="#F2F5F7" strokeWidth="1.4" />
      <rect x="13" y="14" width="4.6" height="1.6" rx="0.8" fill="#F5B841" />
      <rect x="13" y="17" width="6.4" height="1.4" rx="0.7" fill="#8A97A3" />
      <rect x="13" y="19.4" width="5" height="1.4" rx="0.7" fill="#8A97A3" />
    </svg>
  )
}

export function Toolbar() {
  const s = useStore()

  return (
    <header className="toolbar">
      <div className="brand">
        <Logo />
        <span className="brand-text">
          <strong>SlideStage</strong>
          <small>editor de slides em HTML</small>
        </span>
      </div>

      <div className="tb-group">
        <Menu
          label="Novo"
          icon="new"
          title="Começar um deck novo"
          items={[
            { label: 'Deck em branco', hint: '3 slides', run: () => store.newStarter() },
            { label: 'Escolher um modelo', run: () => store.openGallery(true) },
          ]}
        />
        <ToolButton
          icon="grid"
          label="Modelos"
          title="Escolher um modelo pronto e comecar dele"
          onClick={() => store.openGallery(true)}
        />
        <ToolButton
          icon="open"
          label="Abrir"
          title="Abrir um arquivo HTML do computador (Ctrl+O)"
          onClick={() => void store.openDialog()}
        />
        <ToolButton
          icon="save"
          label={s.dirty ? 'Salvar' : 'Salvo'}
          title="Salvar (Ctrl+S)"
          onClick={() => void store.save()}
        />
        <Menu
          label="Arquivo"
          icon="file"
          title="Exportar e publicar"
          items={[
            { label: 'Salvar como', hint: 'Ctrl+Shift+S', run: () => void store.saveAs() },
            { label: 'Exportar HTML único', run: () => void store.exportFile() },
            { label: 'Publicar no GitHub Pages', run: () => void store.publish() },
            { label: 'Abrir no navegador', run: () => void store.openInBrowser() },
            { label: 'Mostrar pasta do arquivo', run: () => void store.revealFolder() },
          ]}
        />
      </div>

      <Sep />

      <div className="tb-group">
        <IconButton icon="undo" label="Desfazer" title="Desfazer (Ctrl+Z)" onClick={() => store.undo()} />
        <IconButton icon="redo" label="Refazer" title="Refazer (Ctrl+Shift+Z)" onClick={() => store.redo()} />
      </div>

      <Sep />

      <Segmented<View>
        ariaLabel="Modo do palco"
        value={s.view}
        onChange={(v) => store.setView(v)}
        options={[
          { value: 'view', label: 'Visualizar', icon: 'eye', title: 'Previa do deck, sem edicao (Ctrl+E)' },
          { value: 'edit', label: 'Editar', icon: 'edit', title: 'Edicao visual do slide (Ctrl+E)' },
          { value: 'code', label: 'Código', icon: 'code', title: 'Ver e editar o código (Ctrl+E)' },
        ]}
      />

      <div className="tb-spacer" />

      {s.dirty ? <span className="dirty-chip">alteracoes não salvas</span> : null}

      <div className="tb-group">
        <IconButton icon="zoomOut" label="Diminuir zoom" onClick={() => store.setZoom(s.zoom - 0.1)} />
        <span className="zoom-label">{Math.round(s.zoom * 100)}%</span>
        <IconButton icon="zoomIn" label="Aumentar zoom" onClick={() => store.setZoom(s.zoom + 0.1)} />
        <IconButton icon="zoomFit" label="Zoom padrão" onClick={() => store.setZoom(1)} />
        <Segmented<Device>
          ariaLabel="Tamanho da prévia"
          value={s.device}
          onChange={(v) => store.setDevice(v)}
          options={[
            { value: 'desktop', label: '', icon: 'desktop', title: 'Previa em tela larga' },
            { value: 'phone', label: '', icon: 'phone', title: 'Previa em celular' },
          ]}
        />
      </div>

      <Sep />

      <ToolButton
        icon="present"
        label="Apresentar"
        primary
        title="Apresentar em tela cheia (F5)"
        onClick={() => store.setPresenting(true)}
      />
      <IconButton
        icon="help"
        label="Ajuda"
        title="Atalhos e como publicar"
        onClick={() => store.openHelp(true)}
      />
      <span className="tb-file" title={s.path ?? 'arquivo ainda não salvo'}>
        <Icon name="file" size={13} />
        {s.path ? s.path.split(/[\\/]/).slice(-1)[0] : 'sem arquivo'}
      </span>
    </header>
  )
}
