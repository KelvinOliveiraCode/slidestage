import { useEffect, useMemo, useRef, useState } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { EditorView } from 'codemirror'
import { keymap } from '@codemirror/view'
import { html } from '@codemirror/lang-html'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

import { store, useStore } from '../lib/store'

const chromeTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: '#0b0d10',
      color: '#f2f5f7',
      height: '100%',
      fontSize: '13px',
    },
    '.cm-scroller': {
      fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace',
      lineHeight: '1.55',
    },
    '.cm-content': { caretColor: '#f5b841', padding: '12px 0' },
    '.cm-cursor': { borderLeftColor: '#f5b841' },
    '.cm-gutters': {
      backgroundColor: '#0b0d10',
      color: '#8a97a3',
      border: 'none',
      paddingRight: '6px',
    },
    '.cm-activeLine': { backgroundColor: '#12161b' },
    '.cm-activeLineGutter': { backgroundColor: '#12161b', color: '#f2f5f7' },
    '&.cm-focused': { outline: 'none' },
    '.cm-selectionBackground, ::selection': { backgroundColor: '#2b3542' },
  },
  { dark: true },
)

const highlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.tagName, color: '#7fd0ff' },
    { tag: t.attributeName, color: '#f5b841' },
    { tag: t.attributeValue, color: '#5bd98a' },
    { tag: t.comment, color: '#8a97a3', fontStyle: 'italic' },
    { tag: t.string, color: '#5bd98a' },
    { tag: t.keyword, color: '#c79bff' },
    { tag: t.content, color: '#a8b4be' },
    { tag: t.meta, color: '#8a97a3' },
  ]),
)

export function CodeView() {
  const s = useStore()
  const [draft, setDraft] = useState<string | null>(null)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const commit = (value: string): void => {
    setDraft(value)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => store.commitHtml(value), 450)
  }

  const extensions = useMemo(
    () => [
      html(),
      chromeTheme,
      highlight,
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Mod-s',
          preventDefault: true,
          run: () => {
            void store.save()
            return true
          },
        },
      ]),
    ],
    [],
  )

  return (
    <div className="code-view">
      <div className="code-bar">
        <span>HTML do deck</span>
        <span className="code-note">
          {draft !== null ? 'editando: volta ao canvas para ver (ou espere 0,5s)' : 'edite aqui, o canvas atualiza'}
        </span>
      </div>
      <CodeMirror
        value={draft ?? s.html}
        extensions={extensions}
        onChange={commit}
        onFocus={() => setDraft((d) => d ?? s.html)}
        onBlur={() => {
          window.clearTimeout(timer.current)
          const value = draft ?? s.html
          setDraft(null)
          if (value !== s.html) store.commitHtml(value)
        }}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
        }}
        theme="none"
      />
    </div>
  )
}

export default CodeView
