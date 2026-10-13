import type { CSSProperties } from 'react'

export type IconName =
  | 'new' | 'open' | 'save' | 'saveAs' | 'export' | 'publish' | 'present'
  | 'edit' | 'code' | 'slides' | 'text' | 'button' | 'link' | 'image'
  | 'motion' | 'transition' | 'scroll' | 'palette' | 'layout' | 'duplicate'
  | 'trash' | 'up' | 'down' | 'undo' | 'redo' | 'zoomIn' | 'zoomOut' | 'zoomFit'
  | 'help' | 'close' | 'eye' | 'phone' | 'desktop' | 'upload' | 'file'
  | 'check' | 'alert' | 'external' | 'folder' | 'reload' | 'grip' | 'download'
  | 'spark' | 'quote' | 'list' | 'mask' | 'cursor' | 'grid' | 'wand'

/* Glifos geometricos desenhados para este app (1.7px de traco, 24x24).
   Nenhuma biblioteca de icones: o conjunto precisa parecer do produto. */
const PATHS: Record<IconName, string> = {
  new: 'M12 5v14M5 12h14',
  open: 'M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  save: 'M12 4v11M8 11l4 4 4-4M4 17v3h16v-3',
  saveAs: 'M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6M14 4l5 5M14 4v5h5M15 18h6M18 15v6',
  export: 'M12 15V4M8 8l4-4 4 4M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
  publish: 'M4 12h16M12 4a13.2 13.2 0 0 1 0 16 13.2 13.2 0 0 1 0-16M12 4a13.2 13.2 0 0 0 0 16 13.2 13.2 0 0 0 0-16',
  present: 'M3.5 5.5h17a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM10 9.2l4.6 2.3L10 13.8zM9 21h6',
  edit: 'M5 3.5l13.2 7.6-5.8 1.4L10.3 18z',
  code: 'M9 6l-5 6 5 6M15 6l5 6-5 6',
  slides: 'M7.5 4.5h11a1.5 1.5 0 0 1 1.5 1.5v9h-11a1.5 1.5 0 0 1-1.5-1.5zM4.5 8v10a2 2 0 0 0 2 2h10',
  text: 'M5 6.5V4.5M19 6.5V4.5M7.5 4.5h9M12 4.5v15M9 19.5h6',
  button: 'M3.5 8.5h17a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1zM7.5 12h.01',
  link: 'M10.2 13.8a4.2 4.2 0 0 0 6 .4l2-2a4.2 4.2 0 0 0-5.9-5.9l-1.1 1.1M13.8 10.2a4.2 4.2 0 0 0-6-.4l-2 2a4.2 4.2 0 0 0 5.9 5.9l1.1-1.1',
  image: 'M3.5 5h17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4.5 17.5l4.5-4.5 3.5 3.5 3-3 4 4M8.6 9.2a1.4 1.4 0 1 0 .1-2.8 1.4 1.4 0 0 0-.1 2.8z',
  motion: 'M3 9h6M3 15h11M13 9h8M17 15h4',
  transition: 'M3 5.5h8v6H3zM13 12.5h8v6h-8zM11 8.5h2M12 8.5v5M12 13.5l1.5-1.5M12 13.5l-1.5-1.5',
  scroll: 'M6.5 3.5h11a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM9.5 7.5h5M9.5 11h5M9.5 14.5h3',
  palette: 'M12 3.5s6 6.4 6 10.2a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z',
  layout: 'M3.5 4.5h17v15h-17zM3.5 9h17M9.5 9v10.5',
  duplicate: 'M4.5 4.5h10v10h-10zM8.5 8.5v10a1 1 0 0 0 1 1h9v-10a1 1 0 0 0-1-1z',
  trash: 'M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13',
  up: 'M6 14l6-6 6 6',
  down: 'M6 10l6 6 6-6',
  undo: 'M4.5 10a8 8 0 1 1 2.3 6.2M4.5 4v6h6',
  redo: 'M19.5 10a8 8 0 1 0-2.3 6.2M19.5 4v6h-6',
  zoomIn: 'M11 6.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM15.2 15.2L20 20M11 8.8v4.4M8.8 11h4.4',
  zoomOut: 'M11 6.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zM15.2 15.2L20 20M8.8 11h4.4',
  zoomFit: 'M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15',
  help: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.8.3-1.1 1-1.1 1.8M12 17h.01',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  eye: 'M2.8 12S6.3 5.8 12 5.8 21.2 12 21.2 12 17.7 18.2 12 18.2 2.8 12 2.8 12zM12 9.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2z',
  phone: 'M7.5 3.5h9a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1.5-1.5zM11 18h2',
  desktop: 'M3.5 5.5h17v11h-17zM8.5 20h7M12 16.5V20',
  upload: 'M12 16V5M8 9l4-4 4 4M5 20h14',
  file: 'M14 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8zM14 3.5V8h4.5',
  check: 'M5 13l4.5 4.5L19 7',
  alert: 'M12 4.2l8.6 15.3H3.4zM12 10.5v4M12 17h.01',
  external: 'M14 4.5h5.5V10M19 4.5l-8 8M18 14v5.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  folder: 'M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z',
  reload: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5',
  grip: 'M9 6.5h.01M15 6.5h.01M9 12h.01M15 12h.01M9 17.5h.01M15 17.5h.01',
  download: 'M12 4v11M8 11l4 4 4-4M4.5 20h15',
  spark: 'M12 4l1.8 5.2L19 11l-5.2 1.8L12 18l-1.8-5.2L5 11l5.2-1.8z',
  quote: 'M9 6.5C6.5 7.5 5 9.5 5 12v5.5h5V9H6.8C7 8 7.8 7.2 9 6.8zM18 6.5C15.5 7.5 14 9.5 14 12v5.5h5V9h-3.2c.2-1 1-1.8 2.2-2.2z',
  list: 'M4.5 7h.01M4.5 12h.01M4.5 17h.01M9 7h11M9 12h11M9 17h11',
  mask: 'M4.5 4.5h15v15h-15zM9 9h6v6H9z',
  cursor: 'M5.5 3.5l12.5 7.5-5.5.9L10 17.5z',
  grid: 'M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z',
  wand: 'M5 19L16.5 7.5M14.5 4.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1zM19 14l.7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7z',
}

type Props = {
  name: IconName
  size?: number
  style?: CSSProperties
}

export function Icon({ name, size = 18, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={style}
    >
      {PATHS[name].split('M').filter(Boolean).map((d, i) => (
        <path key={i} d={`M${d}`} />
      ))}
    </svg>
  )
}
