const REGULAR_URL = '/fonts/MPLUS1p-Regular.ttf'
const BOLD_URL = '/fonts/MPLUS1p-Bold.ttf'

let regularBytes: ArrayBuffer | null = null
let boldBytes: ArrayBuffer | null = null

export async function getRegularFontBytes(): Promise<ArrayBuffer> {
  if (!regularBytes) {
    regularBytes = await fetch(REGULAR_URL).then((r) => r.arrayBuffer())
  }
  return regularBytes!.slice(0)
}

export async function getBoldFontBytes(): Promise<ArrayBuffer> {
  if (!boldBytes) {
    boldBytes = await fetch(BOLD_URL).then((r) => r.arrayBuffer())
  }
  return boldBytes!.slice(0)
}
