export interface FileNode {
  name: string
  path: string
  kind: 'file' | 'directory'
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
  children?: FileNode[]
  expanded?: boolean
}

export type EditorMode = 'edit' | 'split' | 'preview'
export type Theme = 'light' | 'dark'

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  function taskLists(
    md: MarkdownIt,
    options?: { enabled?: boolean; label?: boolean; labelAfter?: boolean }
  ): void
  export = taskLists
}
