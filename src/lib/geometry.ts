import type { PageItem } from '../types'

export function normalizeRotation(r: number): 0 | 90 | 180 | 270 {
  const n = ((r % 360) + 360) % 360
  return (n === 90 || n === 180 || n === 270 ? n : 0) as 0 | 90 | 180 | 270
}

export function combinedRotation(page: PageItem): 0 | 90 | 180 | 270 {
  return normalizeRotation(page.sourceRotate + page.rotate)
}

/** Size of the page as displayed to the user (after applying combined rotation). */
export function visualSize(page: PageItem): { width: number; height: number } {
  const r = combinedRotation(page)
  return r === 90 || r === 270
    ? { width: page.rawHeight, height: page.rawWidth }
    : { width: page.rawWidth, height: page.rawHeight }
}

/**
 * Maps a point in visual space (top-left origin, y-down, in the rotated/displayed
 * page's coordinate system) to raw PDF content-stream space (bottom-left origin,
 * y-up, in the page's unrotated mediabox). This is the inverse of how a PDF
 * viewer transforms raw content when applying the page's clockwise /Rotate.
 */
export function visualPointToRaw(
  vx: number,
  vy: number,
  rawW: number,
  rawH: number,
  rotate: number,
): { x: number; y: number } {
  switch (normalizeRotation(rotate)) {
    case 90:
      return { x: vy, y: vx }
    case 180:
      return { x: rawW - vx, y: vy }
    case 270:
      return { x: rawW - vy, y: rawH - vx }
    default:
      return { x: vx, y: rawH - vy }
  }
}

/** Maps an axis-aligned visual-space box to the equivalent axis-aligned raw-space box. */
export function visualBoxToRawRect(
  vx: number,
  vy: number,
  vw: number,
  vh: number,
  rawW: number,
  rawH: number,
  rotate: number,
): { x: number; y: number; width: number; height: number } {
  const corners = [
    visualPointToRaw(vx, vy, rawW, rawH, rotate),
    visualPointToRaw(vx + vw, vy, rawW, rawH, rotate),
    visualPointToRaw(vx, vy + vh, rawW, rawH, rotate),
    visualPointToRaw(vx + vw, vy + vh, rawW, rawH, rotate),
  ]
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  }
}
