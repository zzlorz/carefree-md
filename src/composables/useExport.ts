import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'
import { imageDbGet, imageDbList } from '@/lib/imageDb'
import { mimeToExt } from '@/lib/imageUtils'

export function useExport() {
  const store = useEditorStore()
  const { render } = useMarkdown()

  // Convert a Blob to a base64 data URL
  function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  // Replace all img://uuid references in markdown content with base64 data URLs.
  // Returns a new markdown string safe to render/export standalone.
  async function resolveIdbImages(content: string): Promise<string> {
    const matches = [...content.matchAll(/img:\/\/([a-z0-9_]+)/g)]
    if (matches.length === 0) return content

    let resolved = content
    const seen = new Set<string>()

    for (const m of matches) {
      const id = m[1]
      if (seen.has(id)) continue
      seen.add(id)

      const record = await imageDbGet(id)
      if (!record) continue

      const dataUrl = await blobToDataURL(record.data)
      // Replace all occurrences of img://id with the data URL
      resolved = resolved.replaceAll(`img://${id}`, dataUrl)
    }

    return resolved
  }

  function getFilename(ext: string) {
    const base = store.filename
      ? store.filename.replace(/\.[^.]+$/, '')
      : store.draftTitle ?? 'untitled'
    return `${base}.${ext}`
  }

  function collectStyles(): string {
    return Array.from(document.styleSheets)
      .flatMap(sheet => {
        try { return Array.from(sheet.cssRules).map(r => r.cssText) }
        catch { return [] }
      })
      .join('\n')
  }

  // ── HTML export ─────────────────────────────────────────────────────────────
  async function exportHTML() {
    const content = await resolveIdbImages(store.content)
    const html = render(content)
    const styles = collectStyles()

    const full = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${store.filename ?? store.draftTitle ?? 'document'}</title>
  <style>
    ${styles}
    body { background:#fff; margin:0; padding:0; }
  </style>
</head>
<body>
  <div class="markdown-body" style="max-width:780px;margin:0 auto;padding:40px 64px 80px;">
    ${html}
  </div>
</body>
</html>`

    download(new Blob([full], { type: 'text/html;charset=utf-8' }), getFilename('html'))
  }

  // ── PDF export ───────────────────────────────────────────────────────────────
  async function exportPDF() {
    const html2pdf = (await import('html2pdf.js')).default
    const styles = collectStyles()
    const content = await resolveIdbImages(store.content)

    // Build self-contained HTML string — html2pdf renders it in an iframe
    const htmlString = `
      <style>
        ${styles}
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; background: #fff; color: #24292f; }
        .markdown-body {
          max-width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          font-size: 13px;
          line-height: 1.7;
          color: #24292f;
          word-break: break-word;
        }
        pre, code { white-space: pre-wrap !important; word-break: break-all !important; }
        img { max-width: 100% !important; height: auto !important; }
        table { width: 100% !important; }
      </style>
      <div class="markdown-body">${render(content)}</div>
    `

    const opt = {
      margin:       [12, 15, 12, 15],
      filename:     getFilename('pdf'),
      image:        { type: 'jpeg', quality: 0.95 },
      html2canvas:  {
        scale: 1.5,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 794,      // A4 width in px at 96 dpi
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: 'css' },
    }

    await html2pdf().set(opt).from(htmlString, 'string').save()
  }

  // ── DOCX export ──────────────────────────────────────────────────────────────
  async function exportDOCX() {
    const { markdownDocx, Packer } = await import('markdown-docx')
    // Resolve IDB images to data URLs so docx can embed them
    const content = await resolveIdbImages(store.content)

    const doc = await markdownDocx(content, {
      title: store.filename ?? store.draftTitle ?? 'document',
    })

    const blob = await Packer.toBlob(doc)
    download(blob, getFilename('docx'))
  }

  // ── ZIP export (draft mode only) ─────────────────────────────────────────────
  async function exportZIP() {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    const draftId = store.draftId ?? -1
    const images = await imageDbList(draftId)

    // Rewrite img://uuid → ./assets/uuid.ext in markdown before packing
    let content = store.content
    for (const img of images) {
      const ext = mimeToExt(img.mimeType)
      const filename = `${img.id}.${ext}`
      content = content.replaceAll(`img://${img.id}`, `./assets/${filename}`)
    }

    const mdFilename = (store.draftTitle ?? 'untitled') + '.md'
    zip.file(mdFilename, content)

    if (images.length > 0) {
      const folder = zip.folder('assets')!
      for (const img of images) {
        const ext = mimeToExt(img.mimeType)
        folder.file(`${img.id}.${ext}`, img.data)
      }
    }

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
    download(blob, getFilename('zip'))
  }

  // ── helper ───────────────────────────────────────────────────────────────────
  function download(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return { exportHTML, exportPDF, exportDOCX, exportZIP }
}
