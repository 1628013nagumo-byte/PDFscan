import * as pdfjsLib from 'pdfjs-dist'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const docCache = new Map<string, Promise<PDFDocumentProxy>>()

export function getPdfjsDoc(sourceDocId: string, bytes: ArrayBuffer): Promise<PDFDocumentProxy> {
  let entry = docCache.get(sourceDocId)
  if (!entry) {
    entry = pdfjsLib.getDocument({ data: bytes.slice(0) }).promise
    docCache.set(sourceDocId, entry)
  }
  return entry
}

export function invalidatePdfjsDoc(sourceDocId: string) {
  docCache.delete(sourceDocId)
}

export async function getPageSize(sourceDocId: string, bytes: ArrayBuffer, pageIndex: number) {
  const doc = await getPdfjsDoc(sourceDocId, bytes)
  const page = await doc.getPage(pageIndex + 1)
  // rotation: 0 forces the *raw* (unrotated) mediabox size, independent of the
  // page's own inherent /Rotate (which we track separately as sourceRotate).
  const rawViewport = page.getViewport({ scale: 1, rotation: 0 })
  return { rawWidth: rawViewport.width, rawHeight: rawViewport.height, sourceRotate: page.rotate }
}

export async function getPageCount(sourceDocId: string, bytes: ArrayBuffer) {
  const doc = await getPdfjsDoc(sourceDocId, bytes)
  return doc.numPages
}

export async function renderPageToDataUrl(
  sourceDocId: string,
  bytes: ArrayBuffer,
  pageIndex: number,
  scale: number,
  rotation = 0,
): Promise<string> {
  const doc = await getPdfjsDoc(sourceDocId, bytes)
  const page = await doc.getPage(pageIndex + 1)
  const viewport = page.getViewport({ scale, rotation })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d context を取得できませんでした')
  await page.render({ canvasContext: ctx, viewport, canvas }).promise
  return canvas.toDataURL('image/png')
}
