import { useEffect, useState } from 'react'
import type { PageItem, SourceDoc } from '../types'
import { renderPageToDataUrl } from '../lib/pdfjsCache'
import { combinedRotation } from '../lib/geometry'

export function Thumbnail({ page, sourceDoc }: { page: PageItem; sourceDoc: SourceDoc }) {
  const [src, setSrc] = useState<string | null>(null)
  const rotate = combinedRotation(page)

  useEffect(() => {
    let cancelled = false
    setSrc(null)
    renderPageToDataUrl(page.sourceDocId, sourceDoc.bytes, page.sourcePageIndex, 0.22, rotate)
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [page.sourceDocId, page.sourcePageIndex, sourceDoc.bytes, rotate])

  if (!src) {
    return <div className="thumb thumb-loading" />
  }
  return <img className="thumb" src={src} alt="" />
}
