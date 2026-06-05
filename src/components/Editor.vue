<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view'
import { EditorState, Compartment } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, indentOnInput } from '@codemirror/language'
import { useEditorStore } from '@/stores/editor'

const store = useEditorStore()
const container = ref<HTMLElement | null>(null)
let view: EditorView | null = null

const themeCompartment = new Compartment()

// Light theme definition
const lightTheme = EditorView.theme(
  {
    '&': { backgroundColor: '#ffffff', color: '#24292f' },
    '.cm-content': { caretColor: '#24292f' },
    '.cm-cursor': { borderLeftColor: '#24292f' },
    '.cm-gutters': {
      backgroundColor: '#f6f8fa',
      color: '#57606a',
      borderRight: '1px solid #d0d7de',
    },
    '.cm-activeLineGutter': { backgroundColor: '#f0f7ff' },
    '.cm-activeLine': { backgroundColor: '#f6f8fa' },
    '.cm-selectionBackground': { backgroundColor: '#c8d8f0 !important' },
    '&.cm-focused .cm-selectionBackground': { backgroundColor: '#b4d0f7 !important' },
    '&:not(.cm-focused) .cm-selectionBackground': { backgroundColor: '#c8d8f0 !important' },
    '&.cm-focused': { outline: 'none' },
    // Native browser selection (used when drawSelection is removed)
    '.cm-content ::selection': { backgroundColor: '#b4d0f7' },
    '.cm-content ::-moz-selection': { backgroundColor: '#b4d0f7' },
    '.cm-matchingBracket': { backgroundColor: '#dbeafe', color: '#1d4ed8 !important' },
  },
  { dark: false }
)

// Toggle formatting markers around selection
function toggleFormat(view: EditorView, marker: string) {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  if (selected.startsWith(marker) && selected.endsWith(marker) && selected.length >= marker.length * 2) {
    view.dispatch({
      changes: { from, to, insert: selected.slice(marker.length, -marker.length) },
      selection: { anchor: from, head: to - marker.length * 2 },
    })
  } else {
    view.dispatch({
      changes: { from, to, insert: `${marker}${selected}${marker}` },
      selection: { anchor: from + marker.length, head: to + marker.length },
    })
  }
  return true
}

// Wrap / unwrap selection with an HTML tag pair, e.g. <u>…</u>
function toggleHtmlWrap(view: EditorView, tag: string) {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const open = `<${tag}>`, close = `</${tag}>`
  if (selected.startsWith(open) && selected.endsWith(close)) {
    view.dispatch({
      changes: { from, to, insert: selected.slice(open.length, -close.length) },
      selection: { anchor: from, head: to - open.length - close.length },
    })
  } else {
    view.dispatch({
      changes: { from, to, insert: `${open}${selected}${close}` },
      selection: { anchor: from + open.length, head: to + open.length },
    })
  }
}

function insertLink(view: EditorView) {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const insert = selected ? `[${selected}](url)` : '[文字](url)'
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length - 4, head: from + insert.length - 1 },
  })
  return true
}

function insertCodeBlock(view: EditorView, lang = '') {
  const { from, to } = view.state.selection.main
  const selected = view.state.doc.sliceString(from, to)
  const fence = `\`\`\`${lang}`
  const insert = selected ? `${fence}\n${selected}\n\`\`\`` : `${fence}\n\n\`\`\``
  // cursor lands on the blank line inside the block
  const cursorOffset = fence.length + 1
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + cursorOffset },
  })
  return true
}

// Toggle line prefix (quote / ul / ol). Removes prefix if all selected lines already have it.
function prefixLines(view: EditorView, prefix: string) {
  const { from, to } = view.state.selection.main
  const startLine = view.state.doc.lineAt(from)
  const endLine = view.state.doc.lineAt(to)
  const allPrefixed = Array.from(
    { length: endLine.number - startLine.number + 1 },
    (_, i) => view.state.doc.line(startLine.number + i)
  ).every((l) => l.text.startsWith(prefix))

  const changes = []
  for (let n = startLine.number; n <= endLine.number; n++) {
    const line = view.state.doc.line(n)
    if (allPrefixed) {
      changes.push({ from: line.from, to: line.from + prefix.length, insert: '' })
    } else if (!line.text.startsWith(prefix)) {
      changes.push({ from: line.from, insert: prefix })
    }
  }
  view.dispatch({ changes })
}

// Insert text after the current line
function insertAfterLine(view: EditorView, text: string) {
  const { from } = view.state.selection.main
  const line = view.state.doc.lineAt(from)
  view.dispatch({
    changes: { from: line.to, insert: text },
    selection: { anchor: line.to + text.length },
  })
}

type FormatCmd = string

function executeFormat(cmd: FormatCmd) {
  if (!view) return
  if (cmd === 'bold')            { toggleFormat(view, '**'); }
  else if (cmd === 'italic')         { toggleFormat(view, '_'); }
  else if (cmd === 'strikethrough')  { toggleFormat(view, '~~'); }
  else if (cmd === 'underline')      { toggleHtmlWrap(view, 'u'); }
  else if (cmd === 'code')           { toggleFormat(view, '`'); }
  else if (cmd === 'link')      { insertLink(view); }
  else if (cmd.startsWith('codeblock')) {
    const lang = cmd.includes(':') ? cmd.split(':')[1] : ''
    insertCodeBlock(view, lang)
  }
  else if (cmd.startsWith('heading:')) {
    const level = parseInt(cmd.split(':')[1])
    const prefix = '#'.repeat(level) + ' '
    const { from } = view.state.selection.main
    const line = view.state.doc.lineAt(from)
    // Remove any existing heading prefix, then apply new one
    const stripped = line.text.replace(/^#{1,6}\s/, '')
    const alreadySame = line.text === prefix + stripped
    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: alreadySame ? stripped : prefix + stripped,
      },
      selection: { anchor: line.from + (alreadySame ? 0 : prefix.length) + stripped.length },
    })
  }
  else if (cmd === 'quote')     { prefixLines(view, '> '); }
  else if (cmd === 'ul')        { prefixLines(view, '- '); }
  else if (cmd === 'ol')        { prefixLines(view, '1. '); }
  else if (cmd === 'hr')        { insertAfterLine(view, '\n\n---\n'); }
  else if (cmd === 'table') {
    insertAfterLine(
      view,
      '\n\n| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |\n'
    )
  }
  view.focus()
}

const customKeymap = [
  { key: 'Ctrl-b', run: (v: EditorView) => toggleFormat(v, '**') },
  { key: 'Ctrl-i', run: (v: EditorView) => toggleFormat(v, '_') },
  { key: 'Ctrl-k', run: insertLink },
  { key: 'Ctrl-Shift-c', run: insertCodeBlock },
  { key: 'Ctrl-`', run: (v: EditorView) => toggleFormat(v, '`') },
  // prevent default Ctrl+S / Ctrl+O (handled globally)
  { key: 'Ctrl-s', run: () => true },
  { key: 'Ctrl-o', run: () => true },
  { key: 'Ctrl-n', run: () => true },
]

onMounted(() => {
  if (!container.value) return

  const state = EditorState.create({
    doc: store.content,
    extensions: [
      lineNumbers(),
      history(),
      markdown(),
      highlightActiveLine(),
      indentOnInput(),
      bracketMatching(),
      EditorView.lineWrapping,
      themeCompartment.of(store.theme === 'dark' ? oneDark : lightTheme),
      keymap.of([...customKeymap, indentWithTab, ...defaultKeymap, ...historyKeymap]),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          store.setContent(update.state.doc.toString())
        }
        if (update.selectionSet) {
          const pos = update.state.selection.main.head
          const line = update.state.doc.lineAt(pos)
          store.cursorLine = line.number
          store.cursorCol = pos - line.from + 1
        }
      }),
    ],
  })

  view = new EditorView({ state, parent: container.value })
  store.formatExecutor = executeFormat
})

// Sync external content changes (file open / new)
watch(
  () => store.content,
  (newContent) => {
    if (view && view.state.doc.toString() !== newContent) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: newContent },
      })
    }
  }
)

// Theme switching
watch(
  () => store.theme,
  (newTheme) => {
    if (!view) return
    view.dispatch({
      effects: themeCompartment.reconfigure(newTheme === 'dark' ? oneDark : lightTheme),
    })
  }
)

onUnmounted(() => {
  store.formatExecutor = null
  view?.destroy()
  view = null
})
</script>

<template>
  <div ref="container" class="h-full overflow-hidden" />
</template>
