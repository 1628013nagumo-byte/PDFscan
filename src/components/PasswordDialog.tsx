import { useState } from 'react'
import { useStore } from '../store/useStore'
import { buildPdf } from '../lib/pdfExport'
import { downloadBytes } from '../lib/download'

export function PasswordDialog({ onClose }: { onClose: () => void }) {
  const pages = useStore((s) => s.pages)
  const sourceDocs = useStore((s) => s.sourceDocs)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setError(null)
    if (password.length < 4) {
      setError('パスワードは4文字以上で入力してください')
      return
    }
    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }
    setBusy(true)
    try {
      const built = await buildPdf(pages, sourceDocs)
      const { encryptPdf } = await import('../lib/pdfEncrypt')
      const encrypted = await encryptPdf(built, password)
      downloadBytes(encrypted, 'protected.pdf')
      onClose()
    } catch (err) {
      console.error(err)
      setError('パスワード設定中にエラーが発生しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>パスワードを設定してダウンロード</h3>
        <p className="hint">設定したパスワードで開けるPDFとして自動的にダウンロードされます。</p>
        <label>
          パスワード
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </label>
        <label>
          パスワード(確認)
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <div className="modal-actions">
          <button onClick={onClose} disabled={busy}>
            キャンセル
          </button>
          <button className="primary" onClick={handleSubmit} disabled={busy}>
            {busy ? '作成中...' : 'パスワード付きPDFを作成'}
          </button>
        </div>
      </div>
    </div>
  )
}
