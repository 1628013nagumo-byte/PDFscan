import { v4 as uuid } from 'uuid'
import type { CheckboxElement, ElementKind, ImageElement, PageItem, ShapeElement, TextElement } from '../types'
import { visualSize } from './geometry'

function centerOf(page: PageItem) {
  const { width, height } = visualSize(page)
  return { cx: width / 2, cy: height / 2 }
}

export function createTextElement(page: PageItem): TextElement {
  const { cx, cy } = centerOf(page)
  const width = 200
  const fontSize = 16
  return {
    id: uuid(),
    kind: 'text',
    x: cx - width / 2,
    y: cy - fontSize,
    width,
    height: fontSize * 1.3 * 2,
    text: 'テキストを入力',
    fontSize,
    color: '#111111',
    opacity: 1,
    bold: false,
    underline: false,
    fontFamily: 'mplus1p',
    align: 'left',
  }
}

export function createShapeElement(page: PageItem, kind: 'rect' | 'ellipse' | 'line'): ShapeElement {
  const { cx, cy } = centerOf(page)
  const width = kind === 'line' ? 160 : 140
  const height = kind === 'line' ? 4 : 90
  return {
    id: uuid(),
    kind,
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    fillColor: '#3b82f6',
    fillOpacity: kind === 'line' ? 1 : 0.35,
    hasFill: kind !== 'line',
    strokeColor: '#3b82f6',
    strokeOpacity: 1,
    strokeWidth: kind === 'line' ? 4 : 2,
    hasStroke: true,
    text: '',
    textColor: '#111111',
    fontSize: 14,
  }
}

export function createCheckboxElement(page: PageItem): CheckboxElement {
  const { cx, cy } = centerOf(page)
  const size = 20
  return {
    id: uuid(),
    kind: 'checkbox',
    x: cx - size / 2,
    y: cy - size / 2,
    width: size,
    height: size,
    checked: false,
    color: '#111111',
    strokeWidth: 1.5,
  }
}

export async function createImageElement(page: PageItem, file: File): Promise<ImageElement> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = dataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context を取得できませんでした')
  ctx.drawImage(img, 0, 0)
  const pngDataUrl = canvas.toDataURL('image/png')
  const bytes = await (await fetch(pngDataUrl)).arrayBuffer()

  const { cx, cy } = centerOf(page)
  const maxDim = Math.min(visualSize(page).width, visualSize(page).height) * 0.5
  const aspect = img.naturalWidth / img.naturalHeight
  let width = maxDim
  let height = maxDim / aspect
  if (height > maxDim) {
    height = maxDim
    width = maxDim * aspect
  }

  return {
    id: uuid(),
    kind: 'image',
    x: cx - width / 2,
    y: cy - height / 2,
    width,
    height,
    dataUrl: pngDataUrl,
    bytes,
    mime: 'image/png',
  }
}

/** Converts an OCR bounding box (in pixels, at the given render scale) into a page-space text element. */
export function createOcrTextElement(bbox: { x0: number; y0: number; x1: number; y1: number }, text: string, renderScale: number): TextElement {
  const x = bbox.x0 / renderScale
  const y = bbox.y0 / renderScale
  const width = Math.max(1, (bbox.x1 - bbox.x0) / renderScale)
  const height = Math.max(1, (bbox.y1 - bbox.y0) / renderScale)
  const fontSize = Math.min(72, Math.max(6, height * 0.75))
  return {
    id: uuid(),
    kind: 'text',
    x,
    y,
    width: Math.max(width, fontSize),
    height: Math.max(height, fontSize * 1.3),
    text,
    fontSize,
    color: '#111111',
    opacity: 1,
    bold: false,
    underline: false,
    fontFamily: 'mplus1p',
    align: 'left',
  }
}

/** A plain white patch placed behind OCR text so the edited text visually replaces the scanned pixels. */
export function createOcrBackgroundElement(bbox: { x0: number; y0: number; x1: number; y1: number }, renderScale: number): ShapeElement {
  const pad = 1
  const x = bbox.x0 / renderScale - pad
  const y = bbox.y0 / renderScale - pad
  const width = Math.max(1, (bbox.x1 - bbox.x0) / renderScale) + pad * 2
  const height = Math.max(1, (bbox.y1 - bbox.y0) / renderScale) + pad * 2
  return {
    id: uuid(),
    kind: 'rect',
    x,
    y,
    width,
    height,
    fillColor: '#FFFFFF',
    fillOpacity: 1,
    hasFill: true,
    strokeColor: '#FFFFFF',
    strokeOpacity: 1,
    strokeWidth: 0,
    hasStroke: false,
    text: '',
    textColor: '#111111',
    fontSize: 14,
  }
}

export const ELEMENT_LABELS: Record<ElementKind, string> = {
  text: 'テキスト',
  image: '画像',
  rect: '四角形',
  ellipse: '楕円',
  line: '直線',
  checkbox: 'チェックボックス',
}
