/* Ponte com o backend Rust. Um único módulo conhece os nomes dos comandos. */

import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface RecentFile {
  path: string
  openedAt: number
}

export interface OpenedFile {
  path: string
  html: string
}

export const ipc = {
  readDeck: (path: string): Promise<string> => invoke<string>('read_deck', { path }),

  writeDeck: (path: string, contents: string): Promise<void> =>
    invoke<void>('write_deck', { path, contents }),

  openDialog: (): Promise<OpenedFile | null> => invoke<OpenedFile | null>('open_deck_dialog'),

  exportDialog: (defaultName: string, contents: string): Promise<string | null> =>
    invoke<string | null>('export_deck_dialog', { defaultName, contents }),

  publishDialog: (contents: string): Promise<string | null> =>
    invoke<string | null>('publish_deck_dialog', { contents }),

  inlineAssets: (
    baseDir: string,
    originals: string[],
  ): Promise<{ original: string; dataUrl: string }[]> =>
    invoke('inline_assets', { baseDir, originals }),

  pickImage: (): Promise<{ original: string; dataUrl: string } | null> =>
    invoke<{ original: string; dataUrl: string } | null>('pick_image_dialog'),

  openInBrowser: (path: string): Promise<void> => invoke<void>('open_in_browser', { path }),

  revealDir: (path: string): Promise<void> => invoke<void>('reveal_deck_dir', { path }),

  watchDeck: (path: string): Promise<void> => invoke<void>('watch_deck', { path }),

  unwatchDeck: (path: string): Promise<void> => invoke<void>('unwatch_deck', { path }),

  recents: (): Promise<RecentFile[]> => invoke<RecentFile[]>('recents_list'),

  recentsRecord: (path: string): Promise<RecentFile[]> =>
    invoke<RecentFile[]>('recents_record', { path }),

  recentsRemove: (path: string): Promise<RecentFile[]> =>
    invoke<RecentFile[]>('recents_remove', { path }),
}

export function onFileChanged(handler: (path: string) => void): Promise<UnlistenFn> {
  return listen<string>('deck-file-changed', (event) => handler(event.payload))
}

/** Diretorio base do arquivo, para resolver assets relativos. */
export function baseDirOf(path: string): string | null {
  const idx = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return idx > 0 ? path.slice(0, idx) : null
}
