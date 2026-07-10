import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { visualSize, combinedRotation } from '../lib/geometry'
import { renderPageToDataUrl } from '../lib/pdfjsCache'
import { splitPageIntoRegions } from '../lib/pageSplit'
import { downloadZip } from '../lib/download'
import type { PageItem } from '../types'

const STAGE_WIDTH = 340
const SPLIT_COUNT_OPTIONS = [2, 3, 4, 5, 6]

function evenDividers(splitCount: number): number[] {
  const next: number[] = []
  for (let i = 1; i < splitCount; i++) next.push(i / splitCount)
  return next
}

function defaultNumbersGrid(pageCount: number, splitCount: number): string[][] {
  let n = 1
  return Array.from({ length: pageCount }, () => Array.from({ length: splitCount }, () => String(n++)))
}

export function PageSplitModal({ pageIds, onClose }: { pageIds: string[]; onClose: () => void }) {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const targetPages = pageIds.map((id) => pages.find((p) => p.id === id)).filter((p): p is PageItem => !!p)
  const previewPage = targetPages[0]
  const previewDoc = previewPage ? sourceDocs[previewPage.sourceDocId] : undefined

  const [splitCount, setSplitCount] = useState(3)
  const [dividers, setDividers] = useState<number[]>(evenDividers(3))
  const [numbers, setNumbers] = useState<string[][]>(() => defaultNumbersGrid(targetPages.length, 3))
  const [prefix, setPrefix] = useState('給与明細_')
  const [bgSrc, setBgSrc] = useState<string | null>(null)
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rotate = previewPage ? combinedRotation(previewPage) : 0
  const size = previewPage ? visualSize(previewPage) : { width: 1, height: 1 }
  const scale = STAGE_WIDTH / size.width
  const stageHeight = size.height * scale
  const bounds = [0, ...dividers, 1]

  useEffect(() => {
    if (!previewPage || !previewDoc) return
    let cancelled = false
    setBgSrc(null)
    renderPageToDataUrl(previewPage.sourceDocId, previewDoc.bytes, previewPage.sourcePageIndex, scale * 2, rotate)
      .then((url) => {
        if (!cancelled) setBgSrc(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewPage?.sourceDocId, previewPage?.sourcePageIndex, rotate, scale])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const entries: Record<string, string> = {}
      for (const page of targetPages) {
        const doc = sourceDocs[page.sourceDocId]
        if (!doc) continue
        const r = combinedRotation(page)
        try {
          entries[page.id] = await renderPageToDataUrl(page.sourceDocId, doc.bytes, page.sourcePageIndex, 0.3, r)
        } catch {
          // ignore, thumbnail stays blank
        }
      }
      if (!cancelled) setThumbs(entries)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIds.join(',')])

  function changeSplitCount(n: number) {
    setSplitCount(n)
    setDividers(evenDividers(n))
    setNumbers(defaultNumbersGrid(targetPages.length, n))
  }

  function updateNumber(pageIndex: number, partIndex: number, value: string) {
    setNumbers((prev) => {
      const copy = prev.map((row) => [...row])
      copy[pageIndex][partIndex] = value
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
    if (targetPages.length === 0) return
    setError(null)
    const flat = numbers.flat()
    if (flat.some((n) => !n.trim())) {
      setError('すべてのパートに番号を入力してください')
      return
    }
    const dedup = new Set(flat.map((n) => n.trim()))
    if (dedup.size !== flat.length) {
      setError('番号が重複しています。それぞれ別の番号にしてください')
      return
    }
    setBusy(true)
    try {
      const regions = []
      for (let i = 0; i < bounds.length - 1; i++) {
        regions.push({ startFrac: bounds[i], endFrac: bounds[i + 1] })
      }
      const zipFiles: { name: string; bytes: Uint8Array }[] = []
      for (let pi = 0; pi < targetPages.length; pi++) {
        const page = targetPages[pi]
        const doc = sourceDocs[page.sourceDocId]
        if (!doc) continue
        const files = await splitPageIntoRegions(page, doc, regions)
        files.forEach((bytes, parti) => {
          zipFiles.push({ name: `${prefix}${numbers[pi][parti].trim()}.pdf`, bytes })
        })
      }
      await downloadZip(zipFiles, `${prefix || 'split'}.zip`)
      onClose()
    } catch (err) {
      console.error(err)
      setError('分割中にエラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  if (targetPages.length === 0) return null

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal split-modal" onClick={(e) => e.stopPropagation()}>
        <h3>ページを分割{targetPages.length > 1 ? `(${targetPages.length}ページ一括)` : ''}</h3>
        <p className="hint">
          {targetPages.length > 1
            ? '1枚目のプレビューで分割位置を決めると、選択した全ページに同じ位置で適用されます。下でページごとに番号を入力してください。'
            : '線をドラッグして分割位置を調整し、それぞれに識別番号を入力してください。'}
        </p>

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
        </div>

        <div className="split-number-list">
          {targetPages.map((page, pi) => (
            <div key={page.id} className="split-number-row">
              {thumbs[page.id] && <img className="split-number-thumb" src={thumbs[page.id]} alt="" />}
              <div className="split-number-inputs">
                {Array.from({ length: splitCount }).map((_, parti) => (
                  <label key={parti} className="split-number-field">
                    <span>{parti + 1}</span>
                    <input
                      type="text"
                      value={numbers[pi]?.[parti] ?? ''}
                      onChange={(e) => updateNumber(pi, parti, e.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <label>
          ファイル名(接頭辞・末尾に上の番号が付きます)
          <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </label>
        <p className="hint">
          例: {prefix}
          {numbers[0]?.[0] || '1'}.pdf
        </p>

        {error && <p className="error">{error}</p>}

        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button className="primary" onClick={handleSplit} disabled={busy || !bgSrc}>
            {busy ? '作成中...' : `${targetPages.length * splitCount}個のPDFを保存(ZIP)`}
          </button>
        </div>
      </div>
    </div>
  )
}
