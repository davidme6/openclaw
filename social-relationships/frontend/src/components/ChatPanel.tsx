// Module 2: Chat Panel - conversation with a role agent
import { useState, useRef, useEffect } from 'react'
import { chatApi } from '../api/client'
import { useStore } from '../store'
import { Message, REL_TYPE_LABELS, REL_STATUS_COLORS } from '../types'

function MessageBubble({ msg, roleName }: { msg: Message; roleName: string }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`msg ${isUser ? 'user' : 'agent'}`}>
      <div className="msg-avatar">
        {isUser ? '我' : roleName.charAt(0)}
      </div>
      <div className="msg-content">
        <div className="msg-bubble">
          {msg.content}
          {msg.is_imported && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.5 }}>[导入]</span>}
        </div>
        <div className="msg-time">
          {new Date(msg.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const { selectedRoleId, roles, messages, addMessage, activeBranchId } = useStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const role = roles.find(r => r.id === selectedRoleId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load history when role / branch changes
  useEffect(() => {
    if (!selectedRoleId) return
    chatApi.history(selectedRoleId, activeBranchId || undefined).then(data => {
      useStore.getState().setMessages(data.messages || [])
    }).catch(() => {
      useStore.getState().setMessages([])
    })
  }, [selectedRoleId, activeBranchId])

  const send = async () => {
    if (!input.trim() || !selectedRoleId || loading) return
    const text = input.trim()
    setInput('')

    const userMsg: Message = {
      role: 'user', content: text,
      timestamp: new Date().toISOString(), is_imported: false,
    }
    addMessage(userMsg)
    setLoading(true)

    try {
      const res = await chatApi.send(selectedRoleId, text, activeBranchId || undefined)
      addMessage({
        role: 'agent', content: res.reply,
        timestamp: new Date().toISOString(), is_imported: false,
      })
    } catch {
      addMessage({
        role: 'agent', content: '（连接失败，请检查后端服务是否运行）',
        timestamp: new Date().toISOString(), is_imported: false,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!selectedRoleId || !role) {
    return (
      <div className="chat-no-role">
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 32 }}>💬</p>
          <p style={{ marginTop: 8, fontSize: 13 }}>从关系图谱选择一个角色开始对话</p>
        </div>
      </div>
    )
  }

  const statusColor = REL_STATUS_COLORS[role.relationship_status] || '#94a3b8'

  return (
    <div className="chat-panel">
      {/* Header */}
      <div className="chat-header">
        <div
          className="chat-role-avatar"
          style={{ borderColor: statusColor, backgroundColor: statusColor + '22', color: statusColor }}
        >
          {role.name.charAt(0)}
        </div>
        <div className="chat-role-info">
          <div className="chat-role-name">{role.name}</div>
          <div className="chat-role-type">{REL_TYPE_LABELS[role.relationship_type]}</div>
        </div>
        {activeBranchId && (
          <div className="chat-branch-badge">🌿 推演模式</div>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>💬</p>
            <p>开始与 {role.name} 对话</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} roleName={role.name} />
        ))}
        {loading && (
          <div className="chat-typing">
            <span /><span /><span />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <textarea
          className="chat-input"
          placeholder={`给 ${role.name} 发消息... (Enter 发送)`}
          value={input}
          rows={1}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              send()
            }
          }}
        />
        <button
          className="chat-send-btn"
          onClick={send}
          disabled={loading || !input.trim()}
        >
          发送
        </button>
      </div>
    </div>
  )
}
