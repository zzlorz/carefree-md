import { useEditorStore } from '@/stores/editor'
import { useMarkdown } from '@/composables/useMarkdown'

export function useExport() {
  const store = useEditorStore()
  const { render } = useMarkdown()

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
  function exportHTML() {
    const html = render(store.content)
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
      <div class="markdown-body">${render(store.content)}</div>
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

    const doc = await markdownDocx(store.content, {
      title: store.filename ?? store.draftTitle ?? 'document',
    })

    const buffer = await Packer.toBuffer(doc)

    download(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
      getFilename('docx')
    )
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

  return { exportHTML, exportPDF, exportDOCX }
}
