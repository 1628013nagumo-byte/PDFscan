import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { visualSize, combinedRotation } from '../lib/geometry'
import { renderPageToDataUrl } from '../lib/pdfjsCache'
import { splitPageIntoRegions } from '../lib/pageSplit'
import { downloadZip } from '../lib/download'

const STAGE_WIDTH = 380
const SPLIT_COUNT_OPTIONS = [2, 3, 4, 5, 6]

function evenDividers(splitCount: number): number[] {
  const next: number[] = []
  for (let i = 1; i < splitCount; i++) next.push(i / splitCount)
  return next
}

function defaultNumbers(splitCount: number): string[] {
  return Array.from({ length: splitCount }, (_, i) => String(i + 1))
}

export function PageSplitModal({ pageId, onClose }: { pageId: string; onClose: () => void }) {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const page = pages.find((p) => p.id === pageId)
  const doc = page ? sourceDocs[page.sourceDocId] : undefined

  const [splitCount, setSplitCount] = useState(3)
  const [dividers, setDividers] = useState<number[]>(evenDividers(3))
  const [partNumbers, setPartNumbers] = useState<string[]>(defaultNumbers(3))
  const [prefix, setPrefix] = useState('給与明細_')
  const [bgSrc, setBgSrc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rotate = page ? combinedRotation(page) : 0
  const size = page ? visualSize(page) : { width: 1, height: 1 }
  const scale = STAGE_WIDTH / size.width
  const stageHeight = size.height * scale
  const bounds = [0, ...dividers, 1]

  useEffect(() => {
    if (!page || !doc) return
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

  function changeSplitCount(n: number) {
    setSplitCount(n)
    setDividers(evenDividers(n))
    setPartNumbers(defaultNumbers(n))
  }

  function updatePartNumber(index: number, value: string) {
    setPartNumbers((prev) => {
      const copy = [...prev]
      copy[index] = value
      return copy
    })
  }

  function startDrag(index: number) {
    return (e: React.PointerEvent) => {
      e.preventDefault()
      const startY = e.clientY
      const startFrac = dividers[index]
      const lower = index === 0 ? 0.02 : dividers[index - 1] + 0.02
      const upper = index === dividers.length - 1 ? 0.98 : dividers[index + 1] - 0.02

      function onMove(ev: PointerEvent) {
        const dy = (ev.clientY - startY) / stageHeight
        const next = Math.min(upper, Math.max(lower, startFrac + dy))
        setDividers((prev) => {
          const copy = [...prev]
          copy[index] = next
          return copy
        })
      }
      function onUp() {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    }
  }

  async function handleSplit() {
    if (!page || !doc) return
    setError(null)
    if (partNumbers.some((n) => !n.trim())) {
      setError('すべてのパートに番号を入力してください')
      return
    }
    const dedup = new Set(partNumbers.map((n) => n.trim()))
    if (dedup.size !== partNumbers.length) {
      setError('番号が重複しています。それぞれ別の番号にしてください')
      return
    }
    setBusy(true)
    try {
      const regions = []
      for (let i = 0; i < bounds.length - 1; i++) {
        regions.push({ startFrac: bounds[i], endFrac: bounds[i + 1] })
      }
      const files = await splitPageIntoRegions(page, doc, regions)
      const zipFiles = files.map((bytes, i) => ({ name: `${prefix}${partNumbers[i].trim()}.pdf`, bytes }))
      await downloadZip(zipFiles, `${prefix || 'split'}.zip`)
      onClose()
    } catch (err) {
      console.error(err)
      setError('分割中にエラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  if (!page || !doc) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal split-modal" onClick={(e) => e.stopPropagation()}>
        <h3>ページを分割</h3>
        <p className="hint">線をドラッグして分割位置を調整し、それぞれに識別番号を入力してください。</p>

        <label>
          分割数
          <select value={splitCount} onChange={(e) => changeSplitCount(Number(e.target.value))}>
            {SPLIT_COUNT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}分割
              </option>
            ))}
          </select>
        </label>

        <div
          className="split-stage"
          style={{ width: STAGE_WIDTH, height: stageHeight, backgroundImage: bgSrc ? `url(${bgSrc})` : undefined }}
        >
          {!bgSrc && <div className="stage-loading">読み込み中...</div>}
          {dividers.map((frac, i) => (
            <div key={i} className="split-divider" style={{ top: frac * stageHeight }} onPointerDown={startDrag(i)}>
              <span className="split-divider-handle">⇕</span>
            </div>
          ))}
          {bounds.slice(0, -1).map((start, i) => (
            <div key={i} className="split-number-tag" style={{ top: start * stageHeight + 8 }}>
              <span>No.</span>
              <input
                type="text"
                value={partNumbers[i] ?? ''}
                onPointerDown={(e) => e.stopPropagation()}
                onChange={(e) => updatePartNumber(i, e.target.value)}
              />
            </div>
          ))}
        </div>

        <label>
          ファイル名(接頭辞・末尾に上の番号が付きます)
          <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </label>
        <p className="hint">
          例: {prefix}
          {partNumbers[0] || '1'}.pdf
        </p>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button className="primary" onClick={handleSplit} disabled={busy || !bgSrc}>
            {busy ? '作成中...' : `${splitCount}個のPDFを保存(ZIP)`}
          </button>
        </div>
      </div>
    </div>
  )
}
