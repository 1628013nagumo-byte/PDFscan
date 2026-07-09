/**
 * Encrypts PDF bytes with a password (used for both opening and permissions) using AES-256.
 * mupdf's WASM module is large (~9MB) and self-initializes on import, so it is dynamically
 * imported here rather than at module scope, keeping it out of the app's initial load path.
 */
export async function encryptPdf(bytes: Uint8Array, password: string): Promise<Uint8Array> {
  const mupdf = await import('mupdf')
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf') as unknown as import('mupdf').PDFDocument
  const escaped = password.replace(/([,=])/g, '\\$1')
  const options = `encrypt=aes-256,owner-password=${escaped},user-password=${escaped}`
  const buffer = doc.saveToBuffer(options)
  return buffer.asUint8Array()
}
