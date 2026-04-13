/**
 * SettingsModal — configure API key, base URL, and per-role/Jarvis model.
 * Model registry lets users save multiple models and select them.
 */
import { useState, useEffect } from 'react'
import { settingsApi } from '../api/client'

export interface ModelEntry {
  id: string
  display_name: string
  model_id: string
}

interface Props {
  onClose: () => void
}

export default function SettingsModal({ onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [roleModel, setRoleModel] = useState('')
  const [jarvisModel, setJarvisModel] = useState('')
  const [registry, setRegistry] = useState<ModelEntry[]>([])
  const [newEntry, setNewEntry] = useState({ display_name: '', model_id: '' })

  useEffect(() => {
    settingsApi.get().then((s: any) => {
      setApiKey(s.api_key || '')
      setBaseUrl(s.base_url || '')
      setRoleModel(s.role_model || '')
      setJarvisModel(s.jarvis_model || '')
      setRegistry(s.model_registry || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const addEntry = () => {
    if (!newEntry.model_id.trim()) return
    const entry: ModelEntry = {
      id: Date.now().toString(),
      display_name: newEntry.display_name.trim() || newEntry.model_id.trim(),
      model_id: newEntry.model_id.trim(),
    }
    setRegistry(r => [...r, entry])
    setNewEntry({ display_name: '', model_id: '' })
  }

  const removeEntry = (id: string) => setRegistry(r => r.filter(e => e.id !== id))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await settingsApi.save({
        api_key: apiKey.trim(),
        base_url: baseUrl.trim(),
        role_model: roleModel.trim(),
        jarvis_model: jarvisModel.trim(),
        model_registry: registry,
      })
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 800)
    } catch (e: any) {
      setError(e?.response?.data?.detail || '保存失败，请检查后端连接')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
          加载中...
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">⚙️ 模型配置</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <div className="modal-section-title">API 连接</div>
            <div className="modal-row">
              <label>API Key</label>
              <input className="modal-input" type="password" placeholder="sk-..."
                value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div className="modal-row">
              <label>Base URL</label>
              <input className="modal-input" placeholder="https://api.openai.com/v1"
                value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                支持直接粘贴带 /chat/completions 的完整 URL，系统会自动处理
              </div>
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">模型选择</div>
            <div className="modal-row">
              <label>角色对话模型</label>
              <input className="modal-input" placeholder="模型 ID，例如 doubao-pro-32k"
                value={roleModel} onChange={e => setRoleModel(e.target.value)} />
            </div>
            <div className="modal-row">
              <label>Jarvis 分析模型</label>
              <input className="modal-input" placeholder="留空则与角色模型相同"
                value={jarvisModel} onChange={e => setJarvisModel(e.target.value)} />
            </div>
          </div>

          <div className="modal-section">
            <div className="modal-section-title">模型注册表（可选，用于多模型切换）</div>
            {registry.map(e => (
              <div key={e.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)' }}>
                  {e.display_name} <span style={{ color: 'var(--text3)', fontSize: 11 }}>({e.model_id})</span>
                </span>
                <button className="role-action-btn danger" onClick={() => removeEntry(e.id)}>🗑</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              <input className="modal-input" placeholder="显示名称"
                value={newEntry.display_name}
                onChange={e => setNewEntry(n => ({ ...n, display_name: e.target.value }))}
                style={{ flex: 1 }}
              />
              <input className="modal-input" placeholder="模型 ID *"
                value={newEntry.model_id}
                onChange={e => setNewEntry(n => ({ ...n, model_id: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && addEntry()}
                style={{ flex: 2 }}
              />
              <button className="modal-confirm-btn" style={{ padding: '6px 12px' }} onClick={addEntry}>+</button>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>取消</button>
          <button className="modal-confirm-btn" disabled={saving} onClick={save}>
            {saving ? '保存中...' : success ? '✓ 已保存' : '保存配置'}
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}
      </div>
    </div>
  )
}
