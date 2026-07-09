import { PDFDocument, degrees } from 'pdf-lib'
import type { PageItem, SourceDoc } from '../types'
import { combinedRotation, visualBoxToRawRect, visualSize } from './geometry'

export interface SplitRegion {
  /** 0-1 fraction of the page's visual height, top edge (0 = top of page) */
  startFrac: number
  /** 0-1 fraction of the page's visual height, bottom edge */
  endFrac: number
}

/**
 * Crops a single page into several independent single-page PDFs, one per region.
 * Regions are given as top-to-bottom fractions of the page's visual (as-displayed) height.
 */
export async function splitPageIntoRegions(
  pageItem: PageItem,
  sourceDoc: SourceDoc,
  regions: SplitRegion[],
): Promise<Uint8Array[]> {
  const srcDoc = await PDFDocument.load(sourceDoc.bytes, { ignoreEncryption: true })
  const srcPage = srcDoc.getPage(pageItem.sourcePageIndex)
  const rotate = combinedRotation(pageItem)
  const { width: visW, height: visH } = visualSize(pageItem)

  const results: Uint8Array[] = []
  for (const region of regions) {
    const vy = region.startFrac * visH
    const vh = (region.endFrac - region.startFrac) * visH
    const rawRect = visualBoxToRawRect(0, vy, visW, vh, pageItem.rawWidth, pageItem.rawHeight, rotate)

    const outDoc = await PDFDocument.create()
    const embedded = await outDoc.embedPage(srcPage, {
      left: rawRect.x,
      bottom: rawRect.y,
      right: rawRect.x + rawRect.width,
      top: rawRect.y + rawRect.height,
    })
    const newPage = outDoc.addPage([rawRect.width, rawRect.height])
    newPage.drawPage(embedded, { x: 0, y: 0, width: rawRect.width, height: rawRect.height })
    newPage.setRotation(degrees(rotate))
    results.push(await outDoc.save())
  }
  return results
}
