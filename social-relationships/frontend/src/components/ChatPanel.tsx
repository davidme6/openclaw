// Module 2: Chat Panel - conversation with a role agent
import { useState, useRef, useEffect } from 'react'
import { Send, GitBranch, RotateCcw } from 'lucide-react'
import { chatApi } from '../api/client'
import { useStore } from '../store'
import { Message, REL_TYPE_LABELS, REL_STATUS_COLORS } from '../types'

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0 mt-1">
          角
        </div>
      )}
      <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'bg-indigo-600 text-white rounded-br-sm'
          : 'bg-gray-800 text-gray-100 rounded-bl-sm'
      }`}>
        {msg.content}
        {msg.is_imported && (
          <span className="ml-2 text-xs opacity-50">[导入]</span>
        )}
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

  // Load history when role selected
  useEffect(() => {
    if (!selectedRoleId) return
    chatApi.history(selectedRoleId, activeBranchId || undefined).then(data => {
      useStore.getState().setMessages(data.messages || [])
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
        role: 'agent', content: '（连接失败，请检查后端服务）',
        timestamp: new Date().toISOString(), is_imported: false,
      })
    } finally {
      setLoading(false)
    }
  }

  if (!selectedRoleId || !role) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 bg-gray-950">
        <div className="text-center">
          <div className="text-4xl mb-3">💬</div>
          <div>从左侧关系图谱选择一个角色开始对话</div>
        </div>
      </div>
    )
  }

  const statusColor = REL_STATUS_COLORS[role.relationship_status] || '#94a3b8'

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ backgroundColor: statusColor + '33', color: statusColor }}>
          {role.name[0]}
        </div>
        <div>
          <div className="text-white font-semibold">{role.name}</div>
          <div className="text-xs" style={{ color: statusColor }}>
            {REL_TYPE_LABELS[role.relationship_type]}
            {activeBranchId && <span className="ml-2 text-yellow-400">🌿 推演模式</span>}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-600 mt-8 text-sm">开始与 {role.name} 对话</div>
        )}
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-gray-800 rounded-2xl px-4 py-2.5 text-gray-400 text-sm">
              <span className="animate-pulse">···</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-gray-900 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-gray-800 text-white rounded-xl px-4 py-2.5 text-sm
                       border border-gray-700 focus:outline-none focus:border-indigo-500"
            placeholder={`给 ${role.name} 发消息...`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          />
          <button
            onClick={send} disabled={loading || !input.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40
                       text-white rounded-xl px-4 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
