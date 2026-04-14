// Jarvis Panel — 四模式：日常对话 | 全局分析 | 单角色分析 | 技能库
// 支持：文字 | 图片上传/粘贴 | 语音输入 | 文件导入
import { useState, useRef, useEffect, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { jarvisApi, settingsApi } from '../api/client'
import { useStore } from '../store'
import CallModal from './CallModal'
import type { JarvisSkill } from '../types'

type Mode = 'chat' | 'global' | 'role' | 'skills'

interface ChatMsg {
  role: 'user' | 'jarvis' | 'error'
  content: string
  ts: string
  imageUrl?: string  // base64 data URL for image preview
}

interface AnalysisItem {
  question: string
  answer: string
  roleId?: string
  roleName?: string
  ts: string
}

const CHAT_STORAGE_KEY = 'jarvis_chat_history'
const MAX_STORED_MSGS = 200   // limit localStorage size

function now() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function loadChatHistory(): ChatMsg[] {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as ChatMsg[]
  } catch {
    return []
  }
}

function saveChatHistory(history: ChatMsg[]) {
  try {
    const trimmed = history.slice(-MAX_STORED_MSGS)
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {}
}

// ── Skills panel sub-component ────────────────────────────────────────────────
function SkillsPanel() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', description: '', instructions: '' })
  const [showForm, setShowForm] = useState(false)

  const { data: skillsData, isLoading } = useQuery({
    queryKey: ['jarvisSkills'],
    queryFn: jarvisApi.listSkills,
  })

  const skills: JarvisSkill[] = skillsData?.skills ?? []

  const addMutation = useMutation({
    mutationFn: () => jarvisApi.addSkill(form.name.trim(), form.description.trim(), form.instructions.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jarvisSkills'] })
      setForm({ name: '', description: '', instructions: '' })
      setShowForm(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => jarvisApi.toggleSkill(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jarvisSkills'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jarvisApi.deleteSkill(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jarvisSkills'] }),
  })

  return (
    <div className="skills-panel">
      <div className="skills-header">
        <div>
          <div className="skills-title">🧩 贾维斯技能库</div>
          <div className="skills-desc">安装技能卡后，Jarvis 将在每次分析时运用对应的专业能力。</div>
        </div>
        <button className="skills-add-trigger" onClick={() => setShowForm(f => !f)}>
          {showForm ? '取消' : '+ 安装技能'}
        </button>
      </div>

      {showForm && (
        <div className="skill-form">
          <div className="skill-form-row">
            <input
              className="skill-input" placeholder="技能名称（如：情感大师）"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="skill-form-row">
            <input
              className="skill-input" placeholder="简短描述（可选）"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="skill-form-row">
            <textarea
              className="skill-textarea" rows={4}
              placeholder="技能指导内容（注入到 Jarvis 的系统提示）&#10;例如：在分析情感关系时，请用依恋理论（焦虑型、回避型、安全型）框架解读行为模式..."
              value={form.instructions}
              onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))}
            />
          </div>
          <button
            className="skill-confirm-btn"
            onClick={() => addMutation.mutate()}
            disabled={!form.name.trim() || !form.instructions.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? '安装中...' : '✓ 确认安装'}
          </button>
          {addMutation.isError && (
            <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>安装失败</div>
          )}
        </div>
      )}

      <div className="skills-list">
        {isLoading ? (
          <div className="skills-empty">加载中...</div>
        ) : skills.length === 0 ? (
          <div className="skills-empty">
            <div style={{ fontSize: 32, marginBottom: 8 }}>🧩</div>
            <div>还没有安装任何技能</div>
            <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text3)' }}>
              安装技能后 Jarvis 将获得专项专业能力
            </div>
          </div>
        ) : (
          skills.map(s => (
            <div key={s.id} className={`skill-item ${s.active ? 'active' : 'inactive'}`}>
              <div className="skill-item-header">
                <div className="skill-item-name">
                  <span className={`skill-status-dot ${s.active ? 'on' : 'off'}`} />
                  {s.name}
                  <span className={`skill-badge ${s.active ? 'active' : 'inactive'}`}>
                    {s.active ? '已激活' : '已停用'}
                  </span>
                </div>
                <div className="skill-item-actions">
                  <button
                    className={`skill-toggle-btn ${s.active ? 'deactivate' : 'activate'}`}
                    onClick={() => toggleMutation.mutate(s.id)}
                    disabled={toggleMutation.isPending}
                    title={s.active ? '停用技能' : '激活技能'}
                  >
                    {s.active ? '停用' : '激活'}
                  </button>
                  <button
                    className="skill-del-btn"
                    onClick={() => { if (confirm(`确认卸载技能「${s.name}」？`)) deleteMutation.mutate(s.id) }}
                    disabled={deleteMutation.isPending}
                    title="卸载技能"
                  >
                    🗑
                  </button>
                </div>
              </div>
              {s.description && <div className="skill-item-desc">{s.description}</div>}
              <div className="skill-item-instructions">{s.instructions}</div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function JarvisPanel() {
  const { roles, selectedRoleId } = useStore()
  const [mode, setMode] = useState<Mode>('chat')
  const [jarvisModel, setJarvisModel] = useState('')
  const [callMode, setCallMode] = useState<'voice' | 'video' | null>(null)
  const [roleCallMode, setRoleCallMode] = useState<'voice' | 'video' | null>(null)

  useEffect(() => {
    settingsApi.getActive().then((a: any) => setJarvisModel(a.jarvis_model || '')).catch(() => {})
  }, [])

  // ── 日常对话 state ──────────────────────────────────────────────────────────
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>(() => loadChatHistory())
  const [chatLoading, setChatLoading] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fileImportRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Persist chat history to localStorage whenever it changes
  useEffect(() => {
    saveChatHistory(chatHistory)
  }, [chatHistory])

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const sendChat = async () => {
    const msg = chatInput.trim()
    if ((!msg && !imagePreview) || chatLoading) return
    const capturedImage = imagePreview  // 在 setImagePreview(null) 之前捕获
    const ts = now()
    const userMsg: ChatMsg = {
      role: 'user',
      content: msg || (capturedImage ? '[图片]' : ''),
      ts,
      imageUrl: capturedImage || undefined,
    }
    setChatHistory(prev => [...prev, userMsg])
    setChatInput('')
    setImagePreview(null)
    setChatLoading(true)
    try {
      // Build history for backend (only user/assistant pairs, exclude images from history)
      const apiHistory = chatHistory
        .filter(m => m.role !== 'error')
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      const apiMsg = msg || (capturedImage ? '' : '[图片]')
      const res = await jarvisApi.chat(
        apiMsg,
        apiHistory,
        capturedImage,  // 传递图片给后端视觉模型
      )
      setChatHistory(prev => [...prev, { role: 'jarvis', content: res.reply, ts: now() }])
    } catch (e: any) {
      const errMsg = e?.response?.data?.detail || '连接失败，请检查后端'
      setChatHistory(prev => [...prev, { role: 'error', content: `⚠️ ${errMsg}`, ts: now() }])
    } finally {
      setChatLoading(false)
    }
  }

  // ── Image upload / paste ────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = ev => setImagePreview(ev.target?.result as string)
        reader.readAsDataURL(file)
        e.preventDefault()
        return
      }
    }
  }, [])

  // ── File import (导入聊天记录 / 文本文件) ────────────────────────────────────
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      if (!text) return
      // Truncate long files to avoid overwhelming the input
      const preview = text.length > 3000 ? text.slice(0, 3000) + '\n...(已截断)' : text
      setChatInput(prev => prev + (prev ? '\n\n' : '') + `[文件: ${file.name}]\n${preview}`)
      textareaRef.current?.focus()
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  // ── Voice input ────────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('当前浏览器不支持语音输入，请使用 Edge 或 Chrome')
      return
    }
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }
    const rec = new SpeechRecognition()
    rec.lang = 'zh-CN'
    rec.continuous = false
    rec.interimResults = false
    rec.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      setChatInput(prev => prev + transcript)
      setIsListening(false)
    }
    rec.onerror = () => setIsListening(false)
    rec.onend = () => setIsListening(false)
    recognitionRef.current = rec
    rec.start()
    setIsListening(true)
  }, [isListening])

  // ── 全局分析 state ──────────────────────────────────────────────────────────
  const [question, setQuestion] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisItem[]>([])
  const selectedRole = roles.find(r => r.id === selectedRoleId)

  // ── 角色辅助对话 state ──────────────────────────────────────────────────────
  const roleChatStorageKey = selectedRoleId ? `jarvis_role_chat_${selectedRoleId}` : null
  const [roleChatHistory, setRoleChatHistory] = useState<ChatMsg[]>(() => {
    if (!selectedRoleId) return []
    try {
      const raw = localStorage.getItem(`jarvis_role_chat_${selectedRoleId}`)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })
  const [roleChatInput, setRoleChatInput] = useState('')
  const [roleChatLoading, setRoleChatLoading] = useState(false)
  const [roleImagePreview, setRoleImagePreview] = useState<string | null>(null)
  const roleFileInputRef = useRef<HTMLInputElement>(null)
  const roleFileImportRef = useRef<HTMLInputElement>(null)
  const roleChatBottomRef = useRef<HTMLDivElement>(null)
  const roleChatTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [roleIsListening, setRoleIsListening] = useState(false)
  const roleRecognitionRef = useRef<any>(null)

  // ── 输入框高度（向上拖拽扩大）──────────────────────────────────────────────
  const [inputHeight, setInputHeight] = useState(68) // px, ~2 rows
  const inputDraggingRef = useRef(false)
  const inputDragStartY = useRef(0)
  const inputDragStartH = useRef(0)

  const startInputResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    inputDraggingRef.current = true
    inputDragStartY.current = e.clientY
    inputDragStartH.current = inputHeight

    const onMove = (ev: MouseEvent) => {
      if (!inputDraggingRef.current) return
      const delta = inputDragStartY.current - ev.clientY // drag up = positive
      const newH = Math.max(40, Math.min(400, inputDragStartH.current + delta))
      setInputHeight(newH)
    }
    const onUp = () => {
      inputDraggingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [inputHeight])

  // 切换角色时重新加载对话历史
  useEffect(() => {
    if (!selectedRoleId) return
    setRoleChatHistory(() => {
      try {
        const raw = localStorage.getItem(`jarvis_role_chat_${selectedRoleId}`)
        return raw ? JSON.parse(raw) : []
      } catch { return [] }
    })
    setRoleChatInput('')
    setRoleImagePreview(null)
  }, [selectedRoleId])

  useEffect(() => {
    if (roleChatStorageKey) {
      try {
        const trimmed = roleChatHistory.slice(-200)
        localStorage.setItem(roleChatStorageKey, JSON.stringify(trimmed))
      } catch {}
    }
  }, [roleChatHistory, roleChatStorageKey])

  useEffect(() => {
    roleChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [roleChatHistory])

  const sendRoleChat = async () => {
    if ((!roleChatInput.trim() && !roleImagePreview) || roleChatLoading || !selectedRoleId) return
    const capturedImage = roleImagePreview
    const msg = roleChatInput.trim()
    const ts = now()
    const userMsg: ChatMsg = {
      role: 'user', content: msg || '[图片]', ts,
      imageUrl: capturedImage || undefined,
    }
    setRoleChatHistory(prev => [...prev, userMsg])
    setRoleChatInput('')
    setRoleImagePreview(null)
    setRoleChatLoading(true)
    try {
      const apiHistory = roleChatHistory
        .filter(m => m.role !== 'error')
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
      const res = await jarvisApi.chatRole(selectedRoleId, msg, apiHistory, capturedImage)
      setRoleChatHistory(prev => [...prev, { role: 'jarvis', content: res.reply, ts: now() }])
    } catch (e: any) {
      const errMsg = e?.response?.data?.detail || '连接失败，请检查后端'
      setRoleChatHistory(prev => [...prev, { role: 'error', content: `⚠️ ${errMsg}`, ts: now() }])
    } finally {
      setRoleChatLoading(false)
    }
  }

  const handleRoleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setRoleImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRolePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (!file) continue
        const reader = new FileReader()
        reader.onload = ev => setRoleImagePreview(ev.target?.result as string)
        reader.readAsDataURL(file)
        e.preventDefault()
        return
      }
    }
  }, [])

  const handleRoleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      if (!text) return
      const preview = text.length > 4000 ? text.slice(0, 4000) + '\n...(已截断)' : text
      setRoleChatInput(prev =>
        prev + (prev ? '\n\n' : '') + `[文件: ${file.name}]\n${preview}`
      )
      roleChatTextareaRef.current?.focus()
    }
    reader.readAsText(file, 'utf-8')
    e.target.value = ''
  }

  const toggleRoleVoice = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) { alert('当前浏览器不支持语音输入，请使用 Edge 或 Chrome'); return }
    if (roleIsListening) { roleRecognitionRef.current?.stop(); setRoleIsListening(false); return }
    const rec = new SpeechRecognition()
    rec.lang = 'zh-CN'; rec.continuous = false; rec.interimResults = false
    rec.onresult = (e: any) => { setRoleChatInput(prev => prev + e.results[0][0].transcript); setRoleIsListening(false) }
    rec.onerror = () => setRoleIsListening(false)
    rec.onend = () => setRoleIsListening(false)
    roleRecognitionRef.current = rec
    rec.start(); setRoleIsListening(true)
  }, [roleIsListening])

  const handleAnalyze = async () => {
    const q = question.trim()
    if (!q) return
    setAnalysisLoading(true)
    try {
      let result: any
      if (mode === 'role' && selectedRoleId) {
        result = await jarvisApi.analyzeRole(selectedRoleId, q)
      } else {
        result = await jarvisApi.analyze(q)
      }
      setAnalysisHistory(prev => [{
        question: q,
        answer: result.analysis,
        roleId: mode === 'role' ? (selectedRoleId ?? undefined) : undefined,
        roleName: mode === 'role' ? selectedRole?.name : undefined,
        ts: now(),
      }, ...prev])
      setQuestion('')
    } catch {
      setAnalysisHistory(prev => [{
        question: q,
        answer: '❌ Jarvis 暂时无法响应，请稍后重试。',
        ts: now(),
      }, ...prev])
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <div className="jarvis-panel">
      {/* 语音/视频通话弹窗 */}
      {callMode && (
        <CallModal
          roleId={null}
          roleName="Jarvis"
          mode={callMode}
          onClose={() => setCallMode(null)}
        />
      )}

      {/* Header */}
      <div className="jarvis-header">
        <div className="jarvis-title">
          <span className="jarvis-avatar">🤖</span>
          <div>
            <div className="jarvis-name">Jarvis</div>
            <div className="jarvis-subtitle">
              {mode === 'chat' ? '私人助手 · 全权访问平行世界' : '关系分析元Agent · 只分析不扮演'}
              {jarvisModel && <span className="jarvis-model-tag" title="当前使用模型">{jarvisModel}</span>}
            </div>
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="chat-call-btn" title="与 Jarvis 语音通话" onClick={() => setCallMode('voice')}>📞</button>
          <button className="chat-call-btn" title="与 Jarvis 视频通话" onClick={() => setCallMode('video')}>📹</button>
        </div>
      </div>

      {/* Mode Switch */}
      <div className="jarvis-mode-switch">
        <button className={`jarvis-mode-btn ${mode === 'chat' ? 'active' : ''}`}
          onClick={() => setMode('chat')}>
          💬 日常对话
        </button>
        <button className={`jarvis-mode-btn ${mode === 'global' ? 'active' : ''}`}
          onClick={() => setMode('global')}>
          🌐 全局分析
        </button>
        <button className={`jarvis-mode-btn ${mode === 'role' ? 'active' : ''}`}
          onClick={() => setMode('role')}
          disabled={!selectedRoleId}
          title={!selectedRoleId ? '请先选择一个角色' : ''}>
          👤 {selectedRole ? selectedRole.name : '角色分析'}
        </button>
        <button className={`jarvis-mode-btn ${mode === 'skills' ? 'active' : ''}`}
          onClick={() => setMode('skills')}>
          🧩 技能库
        </button>
      </div>

      {/* ── 日常对话 UI ── */}
      {mode === 'chat' && (
        <div className="jarvis-chat-container">
          <div className="jarvis-chat-messages">
            {chatHistory.length === 0 && (
              <div className="jarvis-chat-welcome">
                <div className="jarvis-chat-welcome-icon">🤖</div>
                <div className="jarvis-chat-welcome-title">你好，主人</div>
                <div className="jarvis-chat-welcome-sub">我是 Jarvis，你的平行世界助手。<br/>我可以调取系统内所有角色的信息和记忆。</div>
                <div className="jarvis-chat-examples">
                  {['马嘉欣最近怎么样？', '我哪段关系最需要关注？', '帮我分析一下曹亮这个人', '我今天应该联系谁？'].map(q => (
                    <button key={q} className="jarvis-chat-example-btn"
                      onClick={() => { setChatInput(q) }}>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`jarvis-chat-msg ${msg.role}`}>
                {msg.role !== 'user' && (
                  <div className="jarvis-chat-msg-avatar">
                    {msg.role === 'jarvis' ? '🤖' : '⚠️'}
                  </div>
                )}
                <div className="jarvis-chat-msg-body">
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="图片" style={{ maxWidth: 180, maxHeight: 140, borderRadius: 6, display: 'block', marginBottom: 4 }} />
                  )}
                  <div className="jarvis-chat-msg-text">{msg.content}</div>
                  <div className="jarvis-chat-msg-ts">{msg.ts}</div>
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="jarvis-chat-msg jarvis">
                <div className="jarvis-chat-msg-avatar">🤖</div>
                <div className="jarvis-chat-msg-body">
                  <div className="jarvis-typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Image preview */}
          {imagePreview && (
            <div className="jarvis-img-preview">
              <img src={imagePreview} alt="预览" />
              <button className="jarvis-img-remove" onClick={() => setImagePreview(null)}>✕</button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
          <input ref={fileImportRef} type="file" accept=".txt,.md,.csv,.json,.log,text/*" style={{ display: 'none' }} onChange={handleFileImport} />

          <div className="jarvis-chat-input-row">
            {/* 向上拖拽扩大输入框 */}
            <div className="jarvis-input-resize-handle" onMouseDown={startInputResize} />
            {/* Media buttons row */}
            <div className="jarvis-chat-media-btns">
              <button className="jarvis-media-btn" title="发送图片（或粘贴截图）"
                onClick={() => fileInputRef.current?.click()}>
                🖼️
              </button>
              <button className={`jarvis-media-btn${isListening ? ' listening' : ''}`}
                title={isListening ? '停止录音' : '语音输入（中文）'}
                onClick={toggleVoice}>
                {isListening ? '⏹️' : '🎙️'}
              </button>
              <button className="jarvis-media-btn" title="导入文本文件 / 聊天记录"
                onClick={() => fileImportRef.current?.click()}>
                📎
              </button>
              {chatHistory.length > 0 && (
                <button className="jarvis-media-btn" title="清空对话记录"
                  onClick={() => { if (confirm('确认清空 Jarvis 对话记录？')) { setChatHistory([]); localStorage.removeItem(CHAT_STORAGE_KEY) } }}>
                  🗑
                </button>
              )}
            </div>
            {/* Text input + send */}
            <div className="jarvis-chat-input-bottom">
              <textarea
                ref={textareaRef}
                className="jarvis-chat-input"
                style={{ height: inputHeight }}
                placeholder="和 Jarvis 说话... (Enter 发送，Shift+Enter 换行)"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() }
                }}
                onPaste={handlePaste}
              />
              <button className="jarvis-chat-send" onClick={sendChat} disabled={chatLoading || (!chatInput.trim() && !imagePreview)}>
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 全局分析 UI ── */}
      {mode === 'global' && (
        <>
          <div className="jarvis-input-area">
            <textarea
              className="jarvis-textarea"
              placeholder="问 Jarvis 关于所有关系的综合分析...\n例如：我最近哪段关系需要重点维护？"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAnalyze() }}
              rows={3}
            />
            <button className="jarvis-send-btn" onClick={handleAnalyze}
              disabled={analysisLoading || !question.trim()}>
              {analysisLoading ? '分析中...' : 'Ctrl+Enter 发送'}
            </button>
          </div>
          <div className="jarvis-history">
            {analysisHistory.length === 0 && (
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
            {analysisHistory.map((item, i) => (
              <div key={i} className="jarvis-item">
                <div className="jarvis-q">
                  <span className="jarvis-q-icon">❓</span>
                  <div>
                    {item.roleName && <span className="jarvis-role-tag">关于 {item.roleName}</span>}
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
        </>
      )}

      {/* ── 角色辅助对话 UI ── */}
      {mode === 'role' && (
        <div className="jarvis-chat-container">
          {/* 角色通话弹窗 */}
          {roleCallMode && selectedRoleId && (
            <CallModal
              roleId={selectedRoleId}
              roleName={selectedRole?.name || '角色'}
              mode={roleCallMode}
              onClose={() => setRoleCallMode(null)}
            />
          )}

          {/* 角色子标题栏：显示焦点角色 + 通话按钮 */}
          {selectedRole && (
            <div className="role-chat-subheader">
              <div className="role-chat-subheader-info">
                <span className="role-chat-subheader-dot" style={{ background: '#6366f1' }} />
                <span className="role-chat-subheader-name">{selectedRole.name}</span>
                <span className="role-chat-subheader-type">{selectedRole.relationship_type}</span>
              </div>
              <div className="chat-header-actions">
                <button className="chat-call-btn" title={`与 Jarvis 语音讨论 ${selectedRole.name}`}
                  onClick={() => setRoleCallMode('voice')}>📞</button>
                <button className="chat-call-btn" title={`与 Jarvis 视频讨论 ${selectedRole.name}`}
                  onClick={() => setRoleCallMode('video')}>📹</button>
              </div>
            </div>
          )}

          <div className="jarvis-chat-messages">
            {roleChatHistory.length === 0 && (
              <div className="jarvis-chat-welcome">
                <div className="jarvis-chat-welcome-icon">🎯</div>
                <div className="jarvis-chat-welcome-title">
                  {selectedRole ? `关于 ${selectedRole.name}` : '选择一个角色'}
                </div>
                <div className="jarvis-chat-welcome-sub">
                  {selectedRole
                    ? `Jarvis 已加载 ${selectedRole.name} 的完整档案。\n发图片分析微信截图，粘贴聊天记录，或直接提问。`
                    : '请先在右侧关系图中选择一个角色'}
                </div>
                {selectedRole && (
                  <div className="jarvis-chat-examples">
                    {[
                      `帮我分析一下我和${selectedRole.name}的关系走向`,
                      `${selectedRole.name}刚发这条消息是什么意思`,
                      `我该怎么回复${selectedRole.name}`,
                      `把这段聊天记录存入${selectedRole.name}的记忆`,
                    ].map(q => (
                      <button key={q} className="jarvis-chat-example-btn"
                        onClick={() => setRoleChatInput(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {roleChatHistory.map((msg, i) => (
              <div key={i} className={`jarvis-chat-msg ${msg.role}`}>
                {msg.role !== 'user' && (
                  <div className="jarvis-chat-msg-avatar">
                    {msg.role === 'jarvis' ? '🤖' : '⚠️'}
                  </div>
                )}
                <div className="jarvis-chat-msg-body">
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="图片" style={{ maxWidth: 180, maxHeight: 140, borderRadius: 6, display: 'block', marginBottom: 4 }} />
                  )}
                  <div className="jarvis-chat-msg-text">{msg.content}</div>
                  <div className="jarvis-chat-msg-ts">{msg.ts}</div>
                </div>
              </div>
            ))}
            {roleChatLoading && (
              <div className="jarvis-chat-msg jarvis">
                <div className="jarvis-chat-msg-avatar">🤖</div>
                <div className="jarvis-chat-msg-body">
                  <div className="jarvis-typing"><span/><span/><span/></div>
                </div>
              </div>
            )}
            <div ref={roleChatBottomRef} />
          </div>

          {/* Image preview */}
          {roleImagePreview && (
            <div className="jarvis-img-preview">
              <img src={roleImagePreview} alt="预览" />
              <button className="jarvis-img-remove" onClick={() => setRoleImagePreview(null)}>✕</button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input ref={roleFileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleRoleImageChange} />
          <input ref={roleFileImportRef} type="file" accept=".txt,.md,.csv,.json,.log,text/*" style={{ display: 'none' }} onChange={handleRoleFileImport} />

          <div className="jarvis-chat-input-row">
            {/* 向上拖拽扩大输入框 */}
            <div className="jarvis-input-resize-handle" onMouseDown={startInputResize} />
            <div className="jarvis-chat-media-btns">
              <button className="jarvis-media-btn" title="上传图片（微信截图等）"
                onClick={() => roleFileInputRef.current?.click()}>
                🖼️
              </button>
              <button className={`jarvis-media-btn${roleIsListening ? ' listening' : ''}`}
                title={roleIsListening ? '停止录音' : '语音输入'}
                onClick={toggleRoleVoice}>
                {roleIsListening ? '⏹️' : '🎙️'}
              </button>
              <button className="jarvis-media-btn" title="导入聊天记录 / 文本文件"
                onClick={() => roleFileImportRef.current?.click()}>
                📎
              </button>
              {roleChatHistory.length > 0 && (
                <button className="jarvis-media-btn" title="清空此角色的对话记录"
                  onClick={() => {
                    if (confirm(`确认清空与 Jarvis 关于 ${selectedRole?.name} 的对话记录？`)) {
                      setRoleChatHistory([])
                      if (roleChatStorageKey) localStorage.removeItem(roleChatStorageKey)
                    }
                  }}>
                  🗑
                </button>
              )}
            </div>
            <div className="jarvis-chat-input-bottom">
              <textarea
                ref={roleChatTextareaRef}
                className="jarvis-chat-input"
                style={{ height: inputHeight }}
                placeholder={selectedRole
                  ? `分析 ${selectedRole.name} 的截图、给回复建议... (Enter 发送)`
                  : '请先选择角色'}
                value={roleChatInput}
                onChange={e => setRoleChatInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendRoleChat() }
                }}
                onPaste={handleRolePaste}
                disabled={!selectedRoleId}
              />
              <button className="jarvis-chat-send" onClick={sendRoleChat}
                disabled={roleChatLoading || !selectedRoleId || (!roleChatInput.trim() && !roleImagePreview)}>
                发送
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 技能库 UI ── */}
      {mode === 'skills' && (
        <SkillsPanel />
      )}
    </div>
  )
}
