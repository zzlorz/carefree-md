import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import anchor from 'markdown-it-anchor'
// @ts-expect-error no types
import taskLists from 'markdown-it-task-lists'

function buildMd(resolveSrc?: (src: string) => string): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return (
            '<pre class="hljs"><code>' +
            hljs.highlight(str, { language: lang, ignoreIllegals: true }).value +
            '</code></pre>'
          )
        } catch {
          // fall through
        }
      }
      return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
    },
  })

  md.use(anchor, {
    permalink: anchor.permalink.linkInsideHeader({ symbol: '#', placement: 'after' }),
  })

  md.use(taskLists, { enabled: true, label: true })

  // Custom image renderer: resolve src + parse alignment from title
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx]

    // Resolve blob URL if handler provided
    const src = token.attrGet('src') ?? ''
    token.attrSet('src', resolveSrc ? resolveSrc(src) : src)

    // Render alt text from inline children (standard markdown-it behaviour)
    const altIdx = token.attrIndex('alt')
    if (altIdx >= 0) {
      token.attrs![altIdx][1] = self.renderInlineAsText(token.children ?? [], options, env)
    }

    // Parse alignment keyword from title: ![alt](url "align-center")
    const title = token.attrGet('title') ?? ''
    const alignMatch = title.match(/\b(align-left|align-center|align-right)\b/)
    if (alignMatch) {
      const existingClass = token.attrGet('class') ?? ''
      token.attrSet('class', [existingClass, alignMatch[1]].filter(Boolean).join(' '))
      // Remove the keyword from the title so it doesn't show as tooltip
      const cleanTitle = title.replace(alignMatch[1], '').trim()
      if (cleanTitle) {
        token.attrSet('title', cleanTitle)
      } else {
        // Remove title attribute entirely if empty
        const titleIdx = token.attrIndex('title')
        if (titleIdx >= 0) token.attrs!.splice(titleIdx, 1)
      }
    }

    return self.renderToken(tokens, idx, options)
  }

  return md
}

// Default instance (no image resolution) for non-Preview uses
const _defaultMd = buildMd()

export function useMarkdown(resolveSrc?: (src: string) => string) {
  // If resolveSrc provided, build a dedicated instance for this call site
  const md = resolveSrc ? buildMd(resolveSrc) : _defaultMd

  function render(content: string): string {
    return md.render(content)
  }
  return { render }
}
