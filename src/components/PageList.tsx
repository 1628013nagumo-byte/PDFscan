import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { Thumbnail } from './Thumbnail'
import { buildPdf } from '../lib/pdfExport'
import { downloadBytes, downloadZip } from '../lib/download'
import type { PageItem } from '../types'

export function PageList() {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const currentPageId = useStore((s) => s.currentPageId)
  const setCurrentPage = useStore((s) => s.setCurrentPage)
  const removePage = useStore((s) => s.removePage)
  const duplicatePage = useStore((s) => s.duplicatePage)
  const rotatePage = useStore((s) => s.rotatePage)
  const movePage = useStore((s) => s.movePage)
  const selectedPageIds = useStore((s) => s.selectedPageIds)
  const togglePageSelection = useStore((s) => s.togglePageSelection)
  const clearPageSelection = useStore((s) => s.clearPageSelection)

  const [selectMode, setSelectMode] = useState(false)
  const [busy, setBusy] = useState(false)
  const dragIndex = useRef<number | null>(null)
  const selected = new Set(selectedPageIds)

  function toggleSelectMode() {
    if (selectMode) clearPageSelection()
    setSelectMode((v) => !v)
  }

  async function exportPages(list: PageItem[], filename: string) {
    setBusy(true)
    try {
      const bytes = await buildPdf(list, sourceDocs)
      downloadBytes(bytes, filename)
    } finally {
      setBusy(false)
    }
  }

  async function exportSelectedAsOne() {
    const list = pages.filter((p) => selected.has(p.id))
    if (list.length === 0) return
    await exportPages(list, 'selected-pages.pdf')
  }

  async function exportSelectedIndividually() {
    const list = pages.filter((p) => selected.has(p.id))
    if (list.length === 0) return
    setBusy(true)
    try {
      const files = []
      for (let i = 0; i < list.length; i++) {
        const bytes = await buildPdf([list[i]], sourceDocs)
        files.push({ name: `page-${i + 1}.pdf`, bytes })
      }
      await downloadZip(files, 'selected-pages.zip')
    } finally {
      setBusy(false)
    }
  }

  async function splitAllPages() {
    if (pages.length === 0) return
    setBusy(true)
    try {
      const files = []
      for (let i = 0; i < pages.length; i++) {
        const bytes = await buildPdf([pages[i]], sourceDocs)
        files.push({ name: `page-${i + 1}.pdf`, bytes })
      }
      await downloadZip(files, 'split-pages.zip')
    } finally {
      setBusy(false)
    }
  }

  if (pages.length === 0) {
    return <div className="page-list-empty">PDFファイルを読み込んでください</div>
  }

  return (
    <div className="page-list">
      <div className="page-list-toolbar">
        <button onClick={toggleSelectMode} className={selectMode ? 'active' : ''}>
          {selectMode ? '選択解除' : 'ページを選択'}
        </button>
        <button onClick={splitAllPages} disabled={busy}>
          全ページを分割(ZIP)
        </button>
      </div>
      {selectMode && (
        <div className="page-list-toolbar">
          <span className="select-count">{selected.size} ページ選択中</span>
          <button onClick={exportSelectedAsOne} disabled={busy || selected.size === 0}>
            1つのPDFで書き出す
          </button>
          <button onClick={exportSelectedIndividually} disabled={busy || selected.size === 0}>
            個別PDFで書き出す(ZIP)
          </button>
        </div>
      )}
      {selectMode && selected.size > 0 && (
        <p className="hint select-hint">選択中のページは、上部の「ページを分割」でまとめて同じ位置で分割できます。</p>
      )}
      <div className="page-list-items">
        {pages.map((page, index) => {
          const doc = sourceDocs[page.sourceDocId]
          if (!doc) return null
          return (
            <div
              key={page.id}
              className={`page-item ${currentPageId === page.id ? 'current' : ''}`}
              draggable
              onDragStart={() => {
                dragIndex.current = index
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex.current !== null && dragIndex.current !== index) {
                  movePage(dragIndex.current, index)
                }
                dragIndex.current = null
              }}
              onClick={() => (selectMode ? togglePageSelection(page.id) : setCurrentPage(page.id))}
            >
              {selectMode && (
                <input
                  type="checkbox"
                  checked={selected.has(page.id)}
                  onChange={() => togglePageSelection(page.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
              <Thumbnail page={page} sourceDoc={doc} />
              <div className="page-item-footer">
                <span>{index + 1}</span>
                <div className="page-item-actions">
                  <button title="回転" onClick={(e) => { e.stopPropagation(); rotatePage(page.id) }}>⟳</button>
                  <button title="複製" onClick={(e) => { e.stopPropagation(); duplicatePage(page.id) }}>⧉</button>
                  <button title="削除" onClick={(e) => { e.stopPropagation(); removePage(page.id) }}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {busy && <div className="busy-overlay">処理中...</div>}
    </div>
  )
}
