import type { PDFFont } from 'pdf-lib'

/** Greedy line wrap: word-wrap for space-delimited text, character-wrap otherwise (for CJK). */
export function wrapText(font: PDFFont, text: string, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n')
  const lines: string[] = []
  const safeWidth = Math.max(1, maxWidth)

  for (const para of paragraphs) {
    if (para === '') {
      lines.push('')
      continue
    }
    if (/\s/.test(para)) {
      const words = para.split(/(\s+)/)
      let current = ''
      for (const word of words) {
        const candidate = current + word
        if (current !== '' && font.widthOfTextAtSize(candidate, fontSize) > safeWidth) {
          lines.push(current.trimEnd())
          current = word.trimStart()
        } else {
          current = candidate
        }
      }
      if (current.trim() !== '') lines.push(current.trimEnd())
    } else {
      let current = ''
      for (const ch of Array.from(para)) {
        const candidate = current + ch
        if (current !== '' && font.widthOfTextAtSize(candidate, fontSize) > safeWidth) {
          lines.push(current)
          current = ch
        } else {
          current = candidate
        }
      }
      if (current !== '') lines.push(current)
    }
  }
  return lines
}
