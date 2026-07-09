import type { FontFamilyId } from '../types'

interface FontFamilyDef {
  id: FontFamilyId
  label: string
  cssFamily: string
  regularUrl: string
  boldUrl: string | null
}

export const FONT_FAMILIES: FontFamilyDef[] = [
  {
    id: 'mplus1p',
    label: 'ゴシック体 (M PLUS 1p)',
    cssFamily: 'MPLUS1p',
    regularUrl: '/fonts/MPLUS1p-Regular.ttf',
    boldUrl: '/fonts/MPLUS1p-Bold.ttf',
  },
  {
    id: 'zenmarugothic',
    label: '丸ゴシック体 (Zen Maru Gothic)',
    cssFamily: 'ZenMaruGothic',
    regularUrl: '/fonts/ZenMaruGothic-Regular.ttf',
    boldUrl: '/fonts/ZenMaruGothic-Bold.ttf',
  },
]

const byteCache = new Map<string, ArrayBuffer>()

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  if (!byteCache.has(url)) {
    byteCache.set(url, await fetch(url).then((r) => r.arrayBuffer()))
  }
  return byteCache.get(url)!.slice(0)
}

export function getFontFamily(id: FontFamilyId): FontFamilyDef {
  return FONT_FAMILIES.find((f) => f.id === id) ?? FONT_FAMILIES[0]
}

export async function getFontBytes(id: FontFamilyId, bold: boolean): Promise<ArrayBuffer> {
  const family = getFontFamily(id)
  const url = (bold && family.boldUrl) || family.regularUrl
  return fetchBytes(url)
}
