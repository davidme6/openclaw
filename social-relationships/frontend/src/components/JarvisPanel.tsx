// Jarvis Panel — 元Agent分析面板
// 只分析不扮演，可问全局关系或单个角色
import { useState } from 'react'
import { jarvisApi } from '../api/client'
import { useStore } from '../store'

interface AnalysisItem {
  question: string
  answer: string
  roleId?: string
  roleName?: string
  ts: string
}

export default function JarvisPanel() {
  const { roles, selectedRoleId } = useStore()
  const [question, setQuestion] = useState('')
  const [targetMode, setTargetMode] = useState<'global' | 'role'>('global')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<AnalysisItem[]>([])

  const selectedRole = roles.find(r => r.id === selectedRoleId)

  const handleAnalyze = async () => {
    const q = question.trim()
    if (!q) return
    setLoading(true)
    try {
      let result: any
      if (targetMode === 'role' && selectedRoleId) {
        result = await jarvisApi.analyzeRole(selectedRoleId, q)
      } else {
        result = await jarvisApi.analyze(q)
      }
      setHistory(prev => [
        {
          question: q,
          answer: result.analysis,
          roleId: targetMode === 'role' ? selectedRoleId : undefined,
          roleName: targetMode === 'role' ? selectedRole?.name : undefined,
          ts: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ])
      setQuestion('')
    } catch {
      setHistory(prev => [
        {
          question: q,
          answer: '❌ Jarvis 暂时无法响应，请稍后重试。',
          ts: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="jarvis-panel">
      {/* Header */}
      <div className="jarvis-header">
        <div className="jarvis-title">
          <span className="jarvis-avatar">🧠</span>
          <div>
            <div className="jarvis-name">Jarvis</div>
            <div className="jarvis-subtitle">关系分析元Agent · 只分析不扮演</div>
          </div>
        </div>
      </div>

      {/* Mode Switch */}
      <div className="jarvis-mode-switch">
        <button
          className={`jarvis-mode-btn ${targetMode === 'global' ? 'active' : ''}`}
          onClick={() => setTargetMode('global')}
        >
          🌐 全局分析
        </button>
        <button
          className={`jarvis-mode-btn ${targetMode === 'role' ? 'active' : ''}`}
          onClick={() => setTargetMode('role')}
          disabled={!selectedRoleId}
          title={!selectedRoleId ? '请先选择一个角色' : ''}
        >
          👤 {selectedRole ? `分析 ${selectedRole.name}` : '角色分析（未选中）'}
        </button>
      </div>

      {/* Input */}
      <div className="jarvis-input-area">
        <textarea
          className="jarvis-textarea"
          placeholder={
            targetMode === 'global'
              ? '问 Jarvis 关于你所有关系的综合分析...\n例如：我最近哪段关系需要重点维护？'
              : `问 Jarvis 关于 ${selectedRole?.name || '该角色'} 的深度分析...\n例如：我该如何修复这段关系？`
          }
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && e.ctrlKey) handleAnalyze()
          }}
          rows={3}
        />
        <button
          className="jarvis-send-btn"
          onClick={handleAnalyze}
          disabled={loading || !question.trim()}
        >
          {loading ? '分析中...' : 'Ctrl+Enter 发送'}
        </button>
      </div>

      {/* History */}
      <div className="jarvis-history">
        {history.length === 0 && (
          <div className="jarvis-empty">
            <p>Jarvis 准备就绪</p>
            <p className="jarvis-hint">可以问任何关于你社会关系的分析问题</p>
            <div className="jarvis-examples">
              <p className="jarvis-examples-title">示例问题：</p>
              <ul>
                <li>我现在哪段关系最需要关注？</li>
                <li>分析我和 [某人] 关系的走向</li>
                <li>我如何改善最近的沟通方式？</li>
                <li>对比我的两个推演方案，哪个更好？</li>
              </ul>
            </div>
          </div>
        )}

        {history.map((item, i) => (
          <div key={i} className="jarvis-item">
            <div className="jarvis-q">
              <span className="jarvis-q-icon">❓</span>
              <div>
                {item.roleName && (
                  <span className="jarvis-role-tag">关于 {item.roleName}</span>
                )}
                <span className="jarvis-q-text">{item.question}</span>
              </div>
              <span className="jarvis-ts">{item.ts}</span>
            </div>
            <div className="jarvis-a">
              <span className="jarvis-a-icon">🧠</span>
              <div className="jarvis-a-text">{item.answer}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
