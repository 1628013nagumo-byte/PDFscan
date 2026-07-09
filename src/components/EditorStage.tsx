import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { renderPageToDataUrl } from '../lib/pdfjsCache'
import { combinedRotation, visualSize } from '../lib/geometry'
import { ElementView } from './ElementView'

const MAX_WIDTH = 760
const STAGE_PADDING = 24

export function EditorStage() {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const currentPageId = useStore((s) => s.currentPageId)
  const selectedElementId = useStore((s) => s.selectedElementId)
  const selectElement = useStore((s) => s.selectElement)
  const updateElement = useStore((s) => s.updateElement)
  const deleteElement = useStore((s) => s.deleteElement)

  const page = pages.find((p) => p.id === currentPageId)
  const [bgSrc, setBgSrc] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(MAX_WIDTH)

  const rotate = page ? combinedRotation(page) : 0
  const size = page ? visualSize(page) : { width: 0, height: 0 }
  const availableWidth = Math.max(120, Math.min(MAX_WIDTH, containerWidth - STAGE_PADDING))
  const scale = size.width > 0 ? Math.min(availableWidth / size.width, 1.6) : 1

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width
      if (width) setContainerWidth(width)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!page) return
    const doc = sourceDocs[page.sourceDocId]
    if (!doc) return
    let cancelled = false
    setBgSrc(null)
    renderPageToDataUrl(page.sourceDocId, doc.bytes, page.sourcePageIndex, scale * 2, rotate)
      .then((url) => {
        if (!cancelled) setBgSrc(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.sourceDocId, page?.sourcePageIndex, rotate, scale])

  return (
    <div className="editor-stage-container" ref={containerRef}>
      {!page ? (
        <div className="editor-stage-empty">
          <p>左のパネルからPDFを読み込み、ページを選択してください。</p>
        </div>
      ) : (
        <div className="editor-stage-wrapper">
          <div
            className="editor-stage"
            style={{
              width: size.width * scale,
              height: size.height * scale,
              backgroundImage: bgSrc ? `url(${bgSrc})` : undefined,
            }}
            onClick={() => selectElement(null)}
          >
            {!bgSrc && <div className="stage-loading">読み込み中...</div>}
            {page.elements.map((el) => (
              <ElementView
                key={el.id}
                element={el}
                scale={scale}
                selected={el.id === selectedElementId}
                onSelect={() => selectElement(el.id)}
                onChange={(patch) => updateElement(page.id, el.id, patch)}
                onDelete={() => deleteElement(page.id, el.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
