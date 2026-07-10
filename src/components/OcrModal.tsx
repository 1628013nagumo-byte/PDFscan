import { useState } from 'react'
import { useStore } from '../store/useStore'
import { renderPageToDataUrl } from '../lib/pdfjsCache'
import { combinedRotation } from '../lib/geometry'
import { runOcr } from '../lib/ocr'
import { createOcrBackgroundElement, createOcrTextElement } from '../lib/elementFactory'

const OCR_RENDER_SCALE = 3

type Phase = 'options' | 'running' | 'done' | 'error'

export function OcrModal({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const addElement = useStore((s) => s.addElement)
  const page = pages.find((p) => p.id === pageId)
  const doc = page ? sourceDocs[page.sourceDocId] : undefined

  const [maskBackground, setMaskBackground] = useState(true)
  const [phase, setPhase] = useState<Phase>('options')
  const [progress, setProgress] = useState(0)
  const [detectedCount, setDetectedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    if (!page || !doc) return
    setPhase('running')
    setProgress(0)
    setError(null)
    try {
      const rotate = combinedRotation(page)
      const imageDataUrl = await renderPageToDataUrl(page.sourceDocId, doc.bytes, page.sourcePageIndex, OCR_RENDER_SCALE, rotate)
      const lines = await runOcr(imageDataUrl, (fraction) => setProgress(fraction))

      for (const line of lines) {
        if (maskBackground) {
          addElement(page.id, createOcrBackgroundElement(line.bbox, OCR_RENDER_SCALE))
        }
        addElement(page.id, createOcrTextElement(line.bbox, line.text, OCR_RENDER_SCALE))
      }
      setDetectedCount(lines.length)
      setPhase('done')
    } catch (err) {
      console.error(err)
      setError('文字認識中にエラーが発生しました')
      setPhase('error')
    }
  }

  if (!page || !doc) return null

  return (
    <div className="modal-backdrop" onClick={phase === 'running' ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>OCR(文字認識)</h3>

        {phase === 'options' && (
          <>
            <p className="hint">
              このページの画像から文字を認識し、編集できるテキストとしてページに配置します。スキャンしたPDFなど、文字が選択できないページで使用してください。
            </p>
            <label className="checkbox-row">
              <input type="checkbox" checked={maskBackground} onChange={(e) => setMaskBackground(e.target.checked)} />
              認識した部分を白で隠してテキストを重ねる(見た目を編集後の状態にする)
            </label>
            <div className="modal-actions">
              <button onClick={onClose}>キャンセル</button>
              <button className="primary" onClick={handleStart}>
                OCRを開始
              </button>
            </div>
          </>
        )}

        {phase === 'running' && (
          <>
            <p className="hint">文字を認識しています... {Math.round(progress * 100)}%</p>
            <div className="ocr-progress-track">
              <div className="ocr-progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          </>
        )}

        {phase === 'done' && (
          <>
            <p className="hint">
              {detectedCount > 0
                ? `${detectedCount} 行のテキストを検出し、編集可能な要素として配置しました。内容を確認し、必要に応じて修正してください。`
                : '文字を検出できませんでした。画像が不鮮明か、対応していない言語の可能性があります。'}
            </p>
            <div className="modal-actions">
              <button className="primary" onClick={onClose}>
                閉じる
              </button>
            </div>
          </>
        )}

        {phase === 'error' && (
          <>
            {error && <p className="error">{error}</p>}
            <div className="modal-actions">
              <button onClick={onClose}>閉じる</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
