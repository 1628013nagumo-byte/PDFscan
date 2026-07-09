import { useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { buildPdf } from '../lib/pdfExport'
import { downloadBytes } from '../lib/download'
import { createCheckboxElement, createImageElement, createShapeElement, createTextElement } from '../lib/elementFactory'
import { PasswordDialog } from './PasswordDialog'
import { PageSplitModal } from './PageSplitModal'

export function Toolbar() {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const currentPageId = useStore((s) => s.currentPageId)
  const addFiles = useStore((s) => s.addFiles)
  const addElement = useStore((s) => s.addElement)
  const loading = useStore((s) => s.loading)
  const loadingMessage = useStore((s) => s.loadingMessage)

  const pdfInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [exporting, setExporting] = useState(false)

  const currentPage = pages.find((p) => p.id === currentPageId)

  async function handlePdfFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) await addFiles(files)
    e.target.value = ''
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !currentPage) return
    const el = await createImageElement(currentPage, file)
    addElement(currentPage.id, el)
  }

  function addText() {
    if (!currentPage) return
    addElement(currentPage.id, createTextElement(currentPage))
  }

  function addShape(kind: 'rect' | 'ellipse' | 'line') {
    if (!currentPage) return
    addElement(currentPage.id, createShapeElement(currentPage, kind))
  }

  function addCheckbox() {
    if (!currentPage) return
    addElement(currentPage.id, createCheckboxElement(currentPage))
  }

  async function exportMerged() {
    if (pages.length === 0) return
    setExporting(true)
    try {
      const bytes = await buildPdf(pages, sourceDocs)
      downloadBytes(bytes, 'edited.pdf')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button onClick={() => pdfInputRef.current?.click()}>PDFを読み込む</button>
        <input ref={pdfInputRef} type="file" accept="application/pdf" multiple hidden onChange={handlePdfFiles} />
      </div>

      <div className="toolbar-group">
        <button disabled={!currentPage} onClick={addText}>
          + テキスト
        </button>
        <button disabled={!currentPage} onClick={() => imageInputRef.current?.click()}>
          + 画像
        </button>
        <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageFile} />
        <button disabled={!currentPage} onClick={() => addShape('rect')}>
          + 四角形
        </button>
        <button disabled={!currentPage} onClick={() => addShape('ellipse')}>
          + 楕円
        </button>
        <button disabled={!currentPage} onClick={() => addShape('line')}>
          + 直線
        </button>
        <button disabled={!currentPage} onClick={addCheckbox}>
          + ☐ チェックボックス
        </button>
      </div>

      <div className="toolbar-group toolbar-group-right">
        <button disabled={!currentPage} onClick={() => setShowSplitModal(true)}>
          ページを分割
        </button>
        <button disabled={pages.length === 0 || exporting} onClick={exportMerged}>
          {exporting ? '書き出し中...' : 'PDFを書き出す'}
        </button>
        <button className="primary" disabled={pages.length === 0} onClick={() => setShowPasswordDialog(true)}>
          パスワードを設定してダウンロード
        </button>
      </div>

      {loading && <div className="toolbar-loading">{loadingMessage}</div>}
      {showPasswordDialog && <PasswordDialog onClose={() => setShowPasswordDialog(false)} />}
      {showSplitModal && currentPage && (
        <PageSplitModal pageId={currentPage.id} onClose={() => setShowSplitModal(false)} />
      )}
    </div>
  )
}
