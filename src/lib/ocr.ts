export interface OcrLine {
  text: string
  confidence: number
  /** pixel-space bounding box, in the coordinate system of the image that was OCR'd */
  bbox: { x0: number; y0: number; x1: number; y1: number }
}

const MIN_CONFIDENCE = 40

/**
 * Runs OCR on an image and returns recognized text grouped by line.
 * tesseract.js and its language data are fetched on demand (lazily imported here)
 * so they never load unless OCR is actually used. All of tesseract's worker/core/
 * language-data assets are served from this app's own /tesseract/ folder rather
 * than tesseract.js's default jsdelivr CDN, so OCR never makes any third-party
 * network request — the page image never leaves the browser.
 */
export async function runOcr(
  imageDataUrl: string,
  onProgress?: (fraction: number) => void,
): Promise<OcrLine[]> {
  const Tesseract = await import('tesseract.js')
  const worker = await Tesseract.createWorker(['jpn', 'eng'], undefined, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core/tesseract-core-simd-lstm.wasm.js',
    langPath: '/tesseract/lang',
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) onProgress(m.progress)
    },
  })
  try {
    const { data } = await worker.recognize(imageDataUrl, {}, { blocks: true, text: true })
    const lines: OcrLine[] = []
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          const text = line.text.trim()
          if (text && line.confidence >= MIN_CONFIDENCE) {
            lines.push({ text, confidence: line.confidence, bbox: line.bbox })
          }
        }
      }
    }
    return lines
  } finally {
    await worker.terminate()
  }
}
