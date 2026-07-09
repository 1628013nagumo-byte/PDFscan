import { PDFDocument, PDFFont, PDFPage, degrees, rgb } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import type { PageItem, SourceDoc, PageElement, TextElement, ImageElement, ShapeElement, CheckboxElement } from '../types'
import { combinedRotation, visualBoxToRawRect, visualPointToRaw } from './geometry'
import { hexToRgb01 } from './color'
import { wrapText } from './textWrap'
import { getRegularFontBytes, getBoldFontBytes } from './fonts'

const LINE_HEIGHT_RATIO = 1.3
const BASELINE_RATIO = 0.82

async function drawTextElement(page: PDFPage, el: TextElement, pageItem: PageItem, regularFont: PDFFont | null, boldFont: PDFFont | null) {
  // Guaranteed non-null: buildPdf only omits a font when no element needs it.
  const font = (el.bold ? boldFont : regularFont)!
  const rawW = pageItem.rawWidth
  const rawH = pageItem.rawHeight
  const rotate = combinedRotation(pageItem)
  const lineHeight = el.fontSize * LINE_HEIGHT_RATIO
  const lines = wrapText(font, el.text, el.fontSize, el.width)
  const { r, g, b } = hexToRgb01(el.color)

  lines.forEach((line, i) => {
    if (!line) return
    const lineWidth = font.widthOfTextAtSize(line, el.fontSize)
    let dx = 0
    if (el.align === 'center') dx = Math.max(0, (el.width - lineWidth) / 2)
    else if (el.align === 'right') dx = Math.max(0, el.width - lineWidth)
    const visualX = el.x + dx
    const visualY = el.y + i * lineHeight + el.fontSize * BASELINE_RATIO
    if (visualY > el.y + el.height + lineHeight) return
    const raw = visualPointToRaw(visualX, visualY, rawW, rawH, rotate)
    page.drawText(line, {
      x: raw.x,
      y: raw.y,
      size: el.fontSize,
      font,
      color: rgb(r, g, b),
      rotate: degrees(rotate),
    })
  })
}

async function drawImageElement(page: PDFPage, el: ImageElement, pageItem: PageItem, outDoc: PDFDocument, imageCache: Map<string, any>) {
  let img = imageCache.get(el.id)
  if (!img) {
    img = el.mime === 'image/png' ? await outDoc.embedPng(el.bytes) : await outDoc.embedJpg(el.bytes)
    imageCache.set(el.id, img)
  }
  const rawW = pageItem.rawWidth
  const rawH = pageItem.rawHeight
  const rotate = combinedRotation(pageItem)
  const raw = visualPointToRaw(el.x, el.y + el.height, rawW, rawH, rotate)
  page.drawImage(img, {
    x: raw.x,
    y: raw.y,
    width: el.width,
    height: el.height,
    rotate: degrees(rotate),
  })
}

function drawShapeElement(page: PDFPage, el: ShapeElement, pageItem: PageItem, regularFontOrNull: PDFFont | null) {
  // Guaranteed non-null when el.text is set: buildPdf embeds it whenever any shape has label text.
  const regularFont = regularFontOrNull!
  const rawW = pageItem.rawWidth
  const rawH = pageItem.rawHeight
  const rotate = combinedRotation(pageItem)
  const rect = visualBoxToRawRect(el.x, el.y, el.width, el.height, rawW, rawH, rotate)
  const fill = hexToRgb01(el.fillColor)
  const stroke = hexToRgb01(el.strokeColor)

  const shapeOpts: Record<string, unknown> = {}
  if (el.hasFill) {
    shapeOpts.color = rgb(fill.r, fill.g, fill.b)
    shapeOpts.opacity = el.fillOpacity
  }
  if (el.hasStroke) {
    shapeOpts.borderColor = rgb(stroke.r, stroke.g, stroke.b)
    shapeOpts.borderWidth = el.strokeWidth
    shapeOpts.borderOpacity = el.strokeOpacity
  }

  if (el.kind === 'ellipse') {
    page.drawEllipse({
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height / 2,
      xScale: rect.width / 2,
      yScale: rect.height / 2,
      ...shapeOpts,
    })
  } else {
    page.drawRectangle({ x: rect.x, y: rect.y, width: rect.width, height: rect.height, ...shapeOpts })
  }

  if (el.text) {
    const lineHeight = el.fontSize * LINE_HEIGHT_RATIO
    const lines = wrapText(regularFont, el.text, el.fontSize, Math.max(1, el.width - 8))
    const totalHeight = lines.length * lineHeight
    const startY = el.y + Math.max(0, (el.height - totalHeight) / 2)
    const { r, g, b } = hexToRgb01(el.textColor)
    lines.forEach((line, i) => {
      if (!line) return
      const lineWidth = regularFont.widthOfTextAtSize(line, el.fontSize)
      const visualX = el.x + Math.max(0, (el.width - lineWidth) / 2)
      const visualY = startY + i * lineHeight + el.fontSize * BASELINE_RATIO
      const raw = visualPointToRaw(visualX, visualY, rawW, rawH, rotate)
      page.drawText(line, { x: raw.x, y: raw.y, size: el.fontSize, font: regularFont, color: rgb(r, g, b), rotate: degrees(rotate) })
    })
  }
}

function drawCheckboxElement(page: PDFPage, el: CheckboxElement, pageItem: PageItem) {
  const rawW = pageItem.rawWidth
  const rawH = pageItem.rawHeight
  const rotate = combinedRotation(pageItem)
  const rect = visualBoxToRawRect(el.x, el.y, el.width, el.height, rawW, rawH, rotate)
  const { r, g, b } = hexToRgb01(el.color)
  page.drawRectangle({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    borderColor: rgb(r, g, b),
    borderWidth: el.strokeWidth,
  })
  if (el.checked) {
    const pt = (fx: number, fy: number) => visualPointToRaw(el.x + el.width * fx, el.y + el.height * fy, rawW, rawH, rotate)
    const p1 = pt(0.18, 0.52)
    const p2 = pt(0.42, 0.8)
    const p3 = pt(0.85, 0.18)
    const thickness = el.strokeWidth * 1.4
    page.drawLine({ start: p1, end: p2, thickness, color: rgb(r, g, b) })
    page.drawLine({ start: p2, end: p3, thickness, color: rgb(r, g, b) })
  }
}

async function drawElement(page: PDFPage, el: PageElement, pageItem: PageItem, ctx: {
  regularFont: PDFFont | null
  boldFont: PDFFont | null
  outDoc: PDFDocument
  imageCache: Map<string, any>
}) {
  switch (el.kind) {
    case 'text':
      await drawTextElement(page, el, pageItem, ctx.regularFont, ctx.boldFont)
      break
    case 'image':
      await drawImageElement(page, el, pageItem, ctx.outDoc, ctx.imageCache)
      break
    case 'rect':
    case 'ellipse':
    case 'line':
      drawShapeElement(page, el, pageItem, ctx.regularFont)
      break
    case 'checkbox':
      drawCheckboxElement(page, el, pageItem)
      break
  }
}

/** Builds a single output PDF from an ordered list of pages sourced from one or more documents. */
export async function buildPdf(pages: PageItem[], sourceDocs: Record<string, SourceDoc>): Promise<Uint8Array> {
  const outDoc = await PDFDocument.create()
  outDoc.registerFontkit(fontkit)

  // NOTE: pdf-lib's font subsetting (subset: true) has a bug where multi-character
  // CJK strings only render their last glyph, so fonts are embedded in full here.
  // Fonts are only embedded when actually needed, since a full font is a few MB.
  const needsRegular = pages.some((p) =>
    p.elements.some((el) => (el.kind === 'text' && !el.bold) || ((el.kind === 'rect' || el.kind === 'ellipse' || el.kind === 'line') && el.text)),
  )
  const needsBold = pages.some((p) => p.elements.some((el) => el.kind === 'text' && el.bold))
  const regularFont = needsRegular ? await outDoc.embedFont(await getRegularFontBytes(), { subset: false }) : null
  const boldFont = needsBold ? await outDoc.embedFont(await getBoldFontBytes(), { subset: false }) : null

  const srcCache = new Map<string, PDFDocument>()
  async function getSrcDoc(id: string): Promise<PDFDocument> {
    let d = srcCache.get(id)
    if (!d) {
      d = await PDFDocument.load(sourceDocs[id].bytes, { ignoreEncryption: true })
      srcCache.set(id, d)
    }
    return d
  }

  const imageCache = new Map<string, any>()

  for (const pageItem of pages) {
    const srcDoc = await getSrcDoc(pageItem.sourceDocId)
    const [copiedPage] = await outDoc.copyPages(srcDoc, [pageItem.sourcePageIndex])
    outDoc.addPage(copiedPage)
    copiedPage.setRotation(degrees(combinedRotation(pageItem)))

    for (const el of pageItem.elements) {
      await drawElement(copiedPage, el, pageItem, { regularFont, boldFont, outDoc, imageCache })
    }
  }

  return outDoc.save()
}
