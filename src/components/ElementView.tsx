import { useRef } from 'react'
import type { PageElement, PageElementPatch } from '../types'

const HANDLES = ['nw', 'ne', 'sw', 'se'] as const
type Handle = (typeof HANDLES)[number]

const MIN_SIZE = 10

export function ElementView({
  element,
  scale,
  selected,
  onSelect,
  onChange,
  onDelete,
}: {
  element: PageElement
  scale: number
  selected: boolean
  onSelect: () => void
  onChange: (patch: PageElementPatch) => void
  onDelete: () => void
}) {
  const dragState = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null)
  const resizeState = useRef<{ handle: Handle; startX: number; startY: number; orig: { x: number; y: number; width: number; height: number } } | null>(null)

  function handleBodyPointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    onSelect()
    dragState.current = { startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y, moved: false }
    window.addEventListener('pointermove', handleBodyPointerMove)
    window.addEventListener('pointerup', handleBodyPointerUp)
  }

  function handleBodyPointerMove(e: PointerEvent) {
    const st = dragState.current
    if (!st) return
    const dx = (e.clientX - st.startX) / scale
    const dy = (e.clientY - st.startY) / scale
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) st.moved = true
    onChange({ x: st.origX + dx, y: st.origY + dy })
  }

  function handleBodyPointerUp() {
    const st = dragState.current
    window.removeEventListener('pointermove', handleBodyPointerMove)
    window.removeEventListener('pointerup', handleBodyPointerUp)
    if (st && !st.moved && element.kind === 'checkbox') {
      onChange({ checked: !element.checked })
    }
    dragState.current = null
  }

  function startResize(handle: Handle) {
    return (e: React.PointerEvent) => {
      e.stopPropagation()
      onSelect()
      resizeState.current = {
        handle,
        startX: e.clientX,
        startY: e.clientY,
        orig: { x: element.x, y: element.y, width: element.width, height: element.height },
      }
      window.addEventListener('pointermove', handleResizeMove)
      window.addEventListener('pointerup', handleResizeUp)
    }
  }

  function handleResizeMove(e: PointerEvent) {
    const st = resizeState.current
    if (!st) return
    const dx = (e.clientX - st.startX) / scale
    const dy = (e.clientY - st.startY) / scale
    let { x, y, width, height } = st.orig
    if (st.handle.includes('e')) width = Math.max(MIN_SIZE, st.orig.width + dx)
    if (st.handle.includes('s')) height = Math.max(MIN_SIZE, st.orig.height + dy)
    if (st.handle.includes('w')) {
      width = Math.max(MIN_SIZE, st.orig.width - dx)
      x = st.orig.x + (st.orig.width - width)
    }
    if (st.handle.includes('n')) {
      height = Math.max(MIN_SIZE, st.orig.height - dy)
      y = st.orig.y + (st.orig.height - height)
    }
    onChange({ x, y, width, height })
  }

  function handleResizeUp() {
    resizeState.current = null
    window.removeEventListener('pointermove', handleResizeMove)
    window.removeEventListener('pointerup', handleResizeUp)
  }

  const style: React.CSSProperties = {
    position: 'absolute',
    left: element.x * scale,
    top: element.y * scale,
    width: element.width * scale,
    height: element.height * scale,
  }

  return (
    <div
      className={`el-wrapper ${selected ? 'selected' : ''}`}
      style={style}
      onPointerDown={element.kind === 'text' ? undefined : handleBodyPointerDown}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {renderContent()}
      {selected && (
        <>
          <button className="el-delete" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete() }}>
            ✕
          </button>
          {element.kind === 'text' && (
            <div className="el-drag-handle" onPointerDown={handleBodyPointerDown} title="ドラッグして移動">
              ⠿
            </div>
          )}
          {HANDLES.map((h) => (
            <div key={h} className={`el-handle el-handle-${h}`} onPointerDown={startResize(h)} />
          ))}
        </>
      )}
    </div>
  )

  function renderContent() {
    switch (element.kind) {
      case 'text':
        return (
          <textarea
            className="el-text"
            value={element.text}
            onPointerDown={(e) => e.stopPropagation()}
            onChange={(e) => onChange({ text: e.target.value })}
            onFocus={onSelect}
            style={{
              fontSize: element.fontSize * scale,
              color: element.color,
              fontWeight: element.bold ? 700 : 400,
              textAlign: element.align,
              lineHeight: 1.3,
            }}
          />
        )
      case 'image':
        return <img className="el-image" src={element.dataUrl} alt="" draggable={false} />
      case 'rect':
      case 'line':
        return (
          <div
            className="el-shape"
            style={{
              background: element.hasFill ? hexWithAlpha(element.fillColor, element.fillOpacity) : 'transparent',
              border: element.hasStroke ? `${element.strokeWidth * scale}px solid ${hexWithAlpha(element.strokeColor, element.strokeOpacity)}` : 'none',
            }}
          >
            {shapeLabel()}
          </div>
        )
      case 'ellipse':
        return (
          <div
            className="el-shape"
            style={{
              borderRadius: '50%',
              background: element.hasFill ? hexWithAlpha(element.fillColor, element.fillOpacity) : 'transparent',
              border: element.hasStroke ? `${element.strokeWidth * scale}px solid ${hexWithAlpha(element.strokeColor, element.strokeOpacity)}` : 'none',
            }}
          >
            {shapeLabel()}
          </div>
        )
      case 'checkbox':
        return (
          <div className="el-checkbox" style={{ borderColor: element.color, borderWidth: element.strokeWidth }}>
            {element.checked && <span style={{ color: element.color }}>✓</span>}
          </div>
        )
      default:
        return null
    }
  }

  function shapeLabel() {
    if (element.kind !== 'rect' && element.kind !== 'ellipse' && element.kind !== 'line') return null
    if (!element.text) return null
    return (
      <div className="el-shape-label" style={{ color: element.textColor, fontSize: element.fontSize * scale }}>
        {element.text}
      </div>
    )
  }
}

function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
