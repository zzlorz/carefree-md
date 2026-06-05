# Carefree MD

Carefree MD is a lightweight Markdown editor built with Vue 3 and Vite. It offers real-time preview, code highlighting, task list support, theme switching, and local file system integration.

## Key Features

- Real-time Markdown editing with live preview
- Editor / preview / split view modes
- Syntax highlighting powered by `highlight.js`
- Markdown anchor links and task list support
- Local file tree sidebar for browsing Markdown/text files
- Open, save, and save-as file operations
- IndexedDB auto-save for drafts
- Light and dark theme support

## Technologies

- Vue 3
- Vite
- TypeScript
- Pinia
- Tailwind CSS
- CodeMirror
- markdown-it
- highlight.js

## Getting Started

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

## Build

```bash
npm run build
```

## Project Structure

- `src/` - source code
  - `components/` - UI components
  - `composables/` - composable logic
  - `stores/` - Pinia state management
  - `types/` - type definitions
  - `assets/` - global styles and assets
- `public/` - static assets

## Core Files

- `src/App.vue` - main application layout and view switching
- `src/stores/editor.ts` - editor state, active file, mode, theme, and dirty state
- `src/composables/useFileSystem.ts` - browser file system API support for open/save operations
- `src/composables/useAutoSave.ts` - auto-save drafts to IndexedDB
- `src/composables/useMarkdown.ts` - Markdown rendering with syntax highlighting, anchors, and task list support

## Use Cases

Suitable as a personal note-taking app, documentation editor, or Markdown drafting tool.

---

If you want, I can also add a usage guide, keyboard shortcuts, or example workflow to this README.