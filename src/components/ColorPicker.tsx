import { useEffect, useRef, useState } from 'react'

const PRESET_COLORS: { label: string; hex: string }[] = [
  { label: '白', hex: '#FFFFFF' },
  { label: '黒', hex: '#000000' },
  { label: '濃いグレー', hex: '#404040' },
  { label: 'グレー', hex: '#808080' },
  { label: '薄いグレー', hex: '#D9D9D9' },
  { label: '濃い赤', hex: '#C00000' },
  { label: '赤', hex: '#FF0000' },
  { label: 'オレンジ', hex: '#ED7D31' },
  { label: '黄', hex: '#FFFF00' },
  { label: '黄緑', hex: '#A9D18E' },
  { label: '緑', hex: '#70AD47' },
  { label: '濃い緑', hex: '#375623' },
  { label: '水色', hex: '#00B0F0' },
  { label: '青', hex: '#4472C4' },
  { label: '濃い青', hex: '#203864' },
  { label: '紫', hex: '#7030A0' },
  { label: 'ピンク', hex: '#FF66CC' },
  { label: '茶', hex: '#843C0C' },
]

export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [open])

  return (
    <div className="color-picker" ref={ref}>
      <button
        type="button"
        className="color-picker-swatch"
        style={{ background: value }}
        onClick={() => setOpen((v) => !v)}
        aria-label="色を選択"
      />
      {open && (
        <div className="color-picker-popover">
          <div className="color-picker-grid">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                title={c.label}
                className={`color-picker-cell ${value.toLowerCase() === c.hex.toLowerCase() ? 'active' : ''}`}
                style={{ background: c.hex }}
                onClick={() => {
                  onChange(c.hex)
                  setOpen(false)
                }}
              />
            ))}
          </div>
          <label className="color-picker-custom">
            その他の色
            <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}
