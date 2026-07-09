import { useStore } from '../store/useStore'

export function PropertiesPanel() {
  const currentPageId = useStore((s) => s.currentPageId)
  const selectedElementId = useStore((s) => s.selectedElementId)
  const pages = useStore((s) => s.pages)
  const updateElement = useStore((s) => s.updateElement)
  const deleteElement = useStore((s) => s.deleteElement)

  const page = pages.find((p) => p.id === currentPageId)
  const element = page?.elements.find((e) => e.id === selectedElementId)

  if (!page || !element) {
    return (
      <div className="properties-panel">
        <p className="hint">要素をクリックすると、ここでプロパティを編集できます。</p>
      </div>
    )
  }

  const set = (patch: Record<string, unknown>) => updateElement(page.id, element.id, patch)

  return (
    <div className="properties-panel">
      <h3>プロパティ</h3>

      {element.kind === 'text' && (
        <>
          <label>
            フォントサイズ
            <input type="range" min={8} max={72} value={element.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} />
            <span>{element.fontSize}</span>
          </label>
          <label>
            文字色
            <input type="color" value={element.color} onChange={(e) => set({ color: e.target.value })} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={element.bold} onChange={(e) => set({ bold: e.target.checked })} />
            太字
          </label>
          <label>
            揃え
            <select value={element.align} onChange={(e) => set({ align: e.target.value })}>
              <option value="left">左</option>
              <option value="center">中央</option>
              <option value="right">右</option>
            </select>
          </label>
        </>
      )}

      {(element.kind === 'rect' || element.kind === 'ellipse' || element.kind === 'line') && (
        <>
          <label className="checkbox-row">
            <input type="checkbox" checked={element.hasFill} onChange={(e) => set({ hasFill: e.target.checked })} />
            塗りつぶし
          </label>
          {element.hasFill && (
            <>
              <label>
                塗りつぶし色
                <input type="color" value={element.fillColor} onChange={(e) => set({ fillColor: e.target.value })} />
              </label>
              <label>
                透明度
                <input type="range" min={0} max={1} step={0.05} value={element.fillOpacity} onChange={(e) => set({ fillOpacity: Number(e.target.value) })} />
                <span>{Math.round(element.fillOpacity * 100)}%</span>
              </label>
            </>
          )}
          <label className="checkbox-row">
            <input type="checkbox" checked={element.hasStroke} onChange={(e) => set({ hasStroke: e.target.checked })} />
            枠線
          </label>
          {element.hasStroke && (
            <>
              <label>
                枠線色
                <input type="color" value={element.strokeColor} onChange={(e) => set({ strokeColor: e.target.value })} />
              </label>
              <label>
                枠線の太さ
                <input type="range" min={0.5} max={20} step={0.5} value={element.strokeWidth} onChange={(e) => set({ strokeWidth: Number(e.target.value) })} />
                <span>{element.strokeWidth}</span>
              </label>
              <label>
                枠線の透明度
                <input type="range" min={0} max={1} step={0.05} value={element.strokeOpacity} onChange={(e) => set({ strokeOpacity: Number(e.target.value) })} />
                <span>{Math.round(element.strokeOpacity * 100)}%</span>
              </label>
            </>
          )}
          <label>
            図形内テキスト
            <textarea value={element.text} onChange={(e) => set({ text: e.target.value })} rows={2} />
          </label>
          {element.text && (
            <>
              <label>
                テキスト色
                <input type="color" value={element.textColor} onChange={(e) => set({ textColor: e.target.value })} />
              </label>
              <label>
                テキストサイズ
                <input type="range" min={8} max={48} value={element.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} />
                <span>{element.fontSize}</span>
              </label>
            </>
          )}
        </>
      )}

      {element.kind === 'checkbox' && (
        <>
          <label className="checkbox-row">
            <input type="checkbox" checked={element.checked} onChange={(e) => set({ checked: e.target.checked })} />
            チェック済み
          </label>
          <label>
            色
            <input type="color" value={element.color} onChange={(e) => set({ color: e.target.value })} />
          </label>
          <label>
            線の太さ
            <input type="range" min={0.5} max={6} step={0.5} value={element.strokeWidth} onChange={(e) => set({ strokeWidth: Number(e.target.value) })} />
            <span>{element.strokeWidth}</span>
          </label>
        </>
      )}

      {element.kind === 'image' && <p className="hint">ドラッグで移動、四隅のハンドルでサイズ変更できます。</p>}

      <button className="danger" onClick={() => deleteElement(page.id, element.id)}>
        この要素を削除
      </button>
    </div>
  )
}
