export interface Block {
  id: number
  raw: string
  type: 'heading' | 'code' | 'hr' | 'list' | 'blockquote' | 'table' | 'blank' | 'paragraph'
}

let _id = 0
const nextId = () => ++_id

export function parseBlocks(content: string): Block[] {
  const lines = content.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line
    if (line.trim() === '') {
      blocks.push({ id: nextId(), raw: '', type: 'blank' })
      i++
      continue
    }

    // Fenced code block
    if (/^(`{3,}|~{3,})/.test(line)) {
      const fence = line.match(/^(`{3,}|~{3,})/)?.[1] ?? '```'
      let raw = line
      i++
      while (i < lines.length && !lines[i].startsWith(fence)) {
        raw += '\n' + lines[i]
        i++
      }
      if (i < lines.length) { raw += '\n' + lines[i]; i++ }
      blocks.push({ id: nextId(), raw, type: 'code' })
      continue
    }

    // Heading
    if (/^#{1,6} /.test(line)) {
      blocks.push({ id: nextId(), raw: line, type: 'heading' })
      i++
      continue
    }

    // HR
    if (/^([-*_])\1{2,}\s*$/.test(line.trim())) {
      blocks.push({ id: nextId(), raw: line, type: 'hr' })
      i++
      continue
    }

    // Blockquote — group consecutive > lines
    if (line.startsWith('>')) {
      let raw = line; i++
      while (i < lines.length && lines[i].startsWith('>')) { raw += '\n' + lines[i]; i++ }
      blocks.push({ id: nextId(), raw, type: 'blockquote' })
      continue
    }

    // List — group consecutive list/continuation lines
    if (/^[ \t]*([-*+]|\d+[.)]) /.test(line)) {
      let raw = line; i++
      while (i < lines.length && (/^[ \t]*([-*+]|\d+[.)]) /.test(lines[i]) || /^[ \t]{2,}/.test(lines[i]))) {
        raw += '\n' + lines[i]; i++
      }
      blocks.push({ id: nextId(), raw, type: 'list' })
      continue
    }

    // Table — line contains | and next line is separator
    if (line.includes('|') && i + 1 < lines.length && /^\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?$/.test(lines[i + 1])) {
      let raw = line; i++
      while (i < lines.length && lines[i].includes('|')) { raw += '\n' + lines[i]; i++ }
      blocks.push({ id: nextId(), raw, type: 'table' })
      continue
    }

    // Paragraph — collect until blank / heading / code-fence / hr
    let raw = line; i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#{1,6} /.test(lines[i]) &&
      !/^(`{3,}|~{3,})/.test(lines[i]) &&
      !/^([-*_])\1{2,}\s*$/.test(lines[i].trim())
    ) {
      raw += '\n' + lines[i]; i++
    }
    blocks.push({ id: nextId(), raw, type: 'paragraph' })
  }

  return blocks
}

export function assembleContent(blocks: Block[]): string {
  const parts: string[] = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    const prev = blocks[i - 1]
    // Insert blank line between two non-blank blocks to keep markdown structure
    if (prev && prev.type !== 'blank' && b.type !== 'blank') {
      parts.push('')
    }
    parts.push(b.raw)
  }
  return parts.join('\n')
}
