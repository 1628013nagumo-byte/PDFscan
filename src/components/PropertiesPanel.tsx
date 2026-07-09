import { useStore } from '../store/useStore'
import { ColorPicker } from './ColorPicker'
import { FONT_FAMILIES } from '../lib/fonts'

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
            フォント
            <select value={element.fontFamily} onChange={(e) => set({ fontFamily: e.target.value })}>
              {FONT_FAMILIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            フォントサイズ
            <input type="range" min={8} max={72} value={element.fontSize} onChange={(e) => set({ fontSize: Number(e.target.value) })} />
            <span>{element.fontSize}</span>
          </label>
          <label>
            文字色
            <ColorPicker value={element.color} onChange={(hex) => set({ color: hex })} />
          </label>
          <label>
            文字の濃さ
            <input type="range" min={0.15} max={1} step={0.05} value={element.opacity} onChange={(e) => set({ opacity: Number(e.target.value) })} />
            <span>{Math.round(element.opacity * 100)}%</span>
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={element.bold} onChange={(e) => set({ bold: e.target.checked })} />
            太字
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={element.underline} onChange={(e) => set({ underline: e.target.checked })} />
            下線
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
                <ColorPicker value={element.fillColor} onChange={(hex) => set({ fillColor: hex })} />
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
                <ColorPicker value={element.strokeColor} onChange={(hex) => set({ strokeColor: hex })} />
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
                <ColorPicker value={element.textColor} onChange={(hex) => set({ textColor: hex })} />
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
            <ColorPicker value={element.color} onChange={(hex) => set({ color: hex })} />
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
