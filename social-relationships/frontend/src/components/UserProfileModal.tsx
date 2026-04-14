/**
 * UserProfileModal — "我的档案"
 * 最高权限层：用户本人的信息面板，含核心/平行记忆系统 + 可选 agent 模型。
 * 核心记忆影响全局 Jarvis 分析；平行记忆独立沙盒不影响现实推演。
 */
import { useState, useEffect, useRef } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { userApi, rolesApi } from '../api/client'
import type { UserProfile, UserMemory, Role } from '../types'

const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP',
]

type Tab = 'basic' | 'core' | 'parallel' | 'agent'

interface Props { onClose: () => void }

// ── Memory row component ──────────────────────────────────────────────────────
function MemoryRow({
  mem, onDelete, deleting,
}: { mem: UserMemory; onDelete: () => void; deleting: boolean }) {
  return (
    <div className="memory-item">
      <span className={`memory-source-badge ${mem.source}`}>
        {mem.source === 'jarvis' ? '贾维斯' : '我'}
      </span>
      <span className="memory-content">{mem.content}</span>
      <span className="memory-date">
        {new Date(mem.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
      </span>
      <button className="memory-del-btn" onClick={onDelete} disabled={deleting} title="删除">✕</button>
    </div>
  )
}

export default function UserProfileModal({ onClose }: Props) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('basic')
  const [newMem, setNewMem] = useState('')
  const [showCoreWarn, setShowCoreWarn] = useState(false)
  const pendingCoreRef = useRef('')
  const initialized = useRef(false)

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['userProfile'],
    queryFn: userApi.getProfile,
  })

  // Load all roles to look up the virtual me agent
  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
  })

  const [form, setForm] = useState({
    name: '', bio: '', birthday: '', occupation: '', location: '',
    mbti: '', speaking_style: '', values: '', triggers: '', love_language: '', background: '',
    agent_model: '', agent_system_prompt: '',
  })

  useEffect(() => {
    if (profile && !initialized.current) {
      initialized.current = true
      setForm({
        name: profile.name ?? '',
        bio: profile.bio ?? '',
        birthday: profile.birthday ?? '',
        occupation: profile.occupation ?? '',
        location: profile.location ?? '',
        mbti: profile.personality?.mbti ?? '',
        speaking_style: profile.personality?.speaking_style ?? '',
        values: profile.personality?.values?.join('、') ?? '',
        triggers: profile.personality?.triggers?.join('、') ?? '',
        love_language: profile.personality?.love_language ?? '',
        background: profile.personality?.background ?? '',
        agent_model: profile.agent_model ?? '',
        agent_system_prompt: profile.agent_system_prompt ?? '',
      })
    }
  }, [profile])

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }))

  // Local memory state
  const [coreMemories, setCoreMemories] = useState<UserMemory[]>([])
  const [parallelMemories, setParallelMemories] = useState<UserMemory[]>([])

  useEffect(() => {
    if (profile?.memories) {
      setCoreMemories(profile.memories.filter(m => m.memory_type === 'core'))
      setParallelMemories(profile.memories.filter(m => m.memory_type === 'parallel'))
    }
  }, [profile])

  // Find the virtual me agent in the roles list
  const virtualMeRole = profile?.virtual_me_role_id
    ? allRoles.find(r => r.id === profile.virtual_me_role_id)
    : undefined

  const saveMutation = useMutation({
    mutationFn: () => {
      const personality: any = {}
      if (form.mbti) personality.mbti = form.mbti
      if (form.speaking_style) personality.speaking_style = form.speaking_style
      if (form.values) personality.values = form.values.split(/[，,、]/).map(s => s.trim()).filter(Boolean)
      if (form.triggers) personality.triggers = form.triggers.split(/[，,、]/).map(s => s.trim()).filter(Boolean)
      if (form.love_language) personality.love_language = form.love_language
      if (form.background) personality.background = form.background
      return userApi.updateProfile({
        name: form.name.trim() || '我',
        bio: form.bio.trim(),
        birthday: form.birthday || null,
        occupation: form.occupation.trim() || null,
        location: form.location.trim() || null,
        personality: Object.keys(personality).length > 0 ? personality : undefined,
        agent_model: form.agent_model.trim() || null,
        agent_system_prompt: form.agent_system_prompt.trim(),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })

  const addMemMutation = useMutation({
    mutationFn: (params: { content: string; type: 'core' | 'parallel' }) =>
      userApi.addMemory(params.content, params.type),
    onSuccess: (data, vars) => {
      setNewMem('')
      if (vars.type === 'core') setCoreMemories(prev => [...prev, data])
      else setParallelMemories(prev => [...prev, data])
    },
  })

  const delMemMutation = useMutation({
    mutationFn: (id: string) => userApi.deleteMemory(id),
    onSuccess: (_, id) => {
      setCoreMemories(prev => prev.filter(m => m.id !== id))
      setParallelMemories(prev => prev.filter(m => m.id !== id))
    },
  })

  // Create virtual me agent
  const createVirtualMeMutation = useMutation({
    mutationFn: async () => {
      const userName = form.name.trim() || profile?.name || '我'
      // Build personality fields for the agent
      const personality: any = {}
      if (form.mbti) personality.mbti = form.mbti
      if (form.speaking_style) personality.speaking_style = form.speaking_style
      if (form.values) personality.values = form.values.split(/[，,、]/).map(s => s.trim()).filter(Boolean)
      if (form.triggers) personality.triggers = form.triggers.split(/[，,、]/).map(s => s.trim()).filter(Boolean)
      if (form.love_language) personality.love_language = form.love_language
      if (form.background) personality.background = form.background

      // Create the role agent
      const newRole: Role = await rolesApi.create({
        name: `${userName}（虚拟我）`,
        relationship_type: 'other',
        relationship_status: 'active',
        age: undefined,
        occupation: form.occupation.trim() || undefined,
        bio: form.bio.trim() || `这是 ${userName} 的虚拟 agent，用于模拟和推演。`,
        personality: Object.keys(personality).length > 0 ? personality : undefined,
        connected_to_user: true,
      })

      // Link the created role to the user profile
      await userApi.updateProfile({ virtual_me_role_id: newRole.id })
      return newRole
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userProfile'] })
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  // Delete virtual me agent
  const deleteVirtualMeMutation = useMutation({
    mutationFn: async () => {
      if (profile?.virtual_me_role_id) {
        await rolesApi.delete(profile.virtual_me_role_id)
        await userApi.updateProfile({ virtual_me_role_id: '' })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['userProfile'] })
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
  })

  const handleAddMemory = (type: 'core' | 'parallel') => {
    if (!newMem.trim()) return
    if (type === 'core') {
      pendingCoreRef.current = newMem.trim()
      setShowCoreWarn(true)
    } else {
      addMemMutation.mutate({ content: newMem.trim(), type })
    }
  }

  const confirmCoreMemory = () => {
    setShowCoreWarn(false)
    addMemMutation.mutate({ content: pendingCoreRef.current, type: 'core' })
  }

  const currentMemories = tab === 'core' ? coreMemories : parallelMemories

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">

        {/* Core memory warning */}
        {showCoreWarn && (
          <div className="memory-warn-overlay">
            <div className="memory-warn-box">
              <div className="memory-warn-icon">⚠️</div>
              <div className="memory-warn-title">核心记忆导入确认</div>
              <div className="memory-warn-body">
                您的核心记忆将影响 Jarvis 的全局分析与推演结果。<br />
                请确认：
                <ul>
                  <li>这是<strong>客观事实</strong>，非主观判断</li>
                  <li>这是<strong>现实中真实发生</strong>的事</li>
                  <li>错误信息将影响整个系统的分析准确性</li>
                </ul>
                <div className="memory-warn-preview">「{pendingCoreRef.current}」</div>
              </div>
              <div className="memory-warn-actions">
                <button className="modal-cancel-btn" onClick={() => setShowCoreWarn(false)}>取消</button>
                <button className="modal-confirm-btn" onClick={confirmCoreMemory}>确认导入</button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-header">
          <h2 className="modal-title">
            <span className="user-profile-crown">👑</span>
            我的档案
            <span className="user-profile-badge">最高权限</span>
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="user-profile-tabs">
          {([
            { key: 'basic',    label: '📋 基本信息' },
            { key: 'core',     label: '🔴 核心记忆' },
            { key: 'parallel', label: '🌀 平行记忆' },
            { key: 'agent',    label: '🤖 虚拟我' },
          ] as { key: Tab; label: string }[]).map(t => (
            <button
              key={t.key}
              className={`user-profile-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              {t.key === 'core' && coreMemories.length > 0 && (
                <span className="mem-count">{coreMemories.length}</span>
              )}
              {t.key === 'parallel' && parallelMemories.length > 0 && (
                <span className="mem-count">{parallelMemories.length}</span>
              )}
              {t.key === 'agent' && virtualMeRole && (
                <span className="mem-count" style={{ background: '#22c55e' }}>✓</span>
              )}
            </button>
          ))}
        </div>

        <div className="modal-body">
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>加载中...</div>
          ) : (
            <>
              {/* ── 基本信息 ── */}
              {tab === 'basic' && (
                <>
                  <div className="modal-section">
                    <div className="modal-section-title">个人信息</div>

                    <div className="modal-row">
                      <label>称呼/名字</label>
                      <input className="modal-input" placeholder="你叫什么（在系统中如何称呼你）"
                        value={form.name} onChange={e => set('name', e.target.value)} />
                    </div>

                    <div className="modal-row-2col">
                      <div className="modal-row">
                        <label>生日</label>
                        <input className="modal-input" type="date"
                          value={form.birthday} onChange={e => set('birthday', e.target.value)} />
                      </div>
                      <div className="modal-row">
                        <label>职业</label>
                        <input className="modal-input" placeholder="你的职业"
                          value={form.occupation} onChange={e => set('occupation', e.target.value)} />
                      </div>
                    </div>

                    <div className="modal-row">
                      <label>所在地</label>
                      <input className="modal-input" placeholder="城市/地区"
                        value={form.location} onChange={e => set('location', e.target.value)} />
                    </div>

                    <div className="modal-row">
                      <label>关于我</label>
                      <textarea className="modal-textarea" rows={3}
                        placeholder="描述一下你自己，这会帮助 Jarvis 更好地理解你..."
                        value={form.bio} onChange={e => set('bio', e.target.value)} />
                    </div>
                  </div>

                  <div className="modal-section">
                    <div className="modal-section-title">性格特质（可选）</div>

                    <div className="modal-row">
                      <label>MBTI</label>
                      <select className="modal-select" value={form.mbti}
                        onChange={e => set('mbti', e.target.value)}>
                        <option value="">不填</option>
                        {MBTI_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>

                    <div className="modal-row">
                      <label>说话风格</label>
                      <input className="modal-input" placeholder="例如：直接、理性"
                        value={form.speaking_style} onChange={e => set('speaking_style', e.target.value)} />
                    </div>

                    <div className="modal-row">
                      <label>核心价值观</label>
                      <input className="modal-input" placeholder="顿号分隔"
                        value={form.values} onChange={e => set('values', e.target.value)} />
                    </div>

                    <div className="modal-row">
                      <label>情绪触发点</label>
                      <input className="modal-input" placeholder="顿号分隔"
                        value={form.triggers} onChange={e => set('triggers', e.target.value)} />
                    </div>

                    <div className="modal-row">
                      <label>个人背景</label>
                      <textarea className="modal-textarea" rows={2}
                        placeholder="成长背景、人生经历等..."
                        value={form.background} onChange={e => set('background', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* ── 核心/平行记忆 ── */}
              {(tab === 'core' || tab === 'parallel') && (
                <div className="modal-section">
                  {tab === 'core' ? (
                    <>
                      <div className="modal-section-title">
                        核心记忆
                        <span className="memory-type-badge core">影响全局分析</span>
                      </div>
                      <div className="memory-desc">
                        ⚠️ 核心记忆将影响 Jarvis 的全局分析与推演。请只存入<strong>客观的现实事实</strong>，不可包含主观判断或虚构内容。
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="modal-section-title">
                        平行记忆
                        <span className="memory-type-badge parallel">独立沙盒</span>
                      </div>
                      <div className="memory-desc">
                        平行记忆独立存储，<strong>不影响</strong>任何角色的行为或 Jarvis 的现实分析。适合记录娱乐互动、模拟测试等内容。
                      </div>
                    </>
                  )}

                  <div className="memory-list">
                    {currentMemories.length === 0 ? (
                      <div className="memory-empty">暂无{tab === 'core' ? '核心' : '平行'}记忆</div>
                    ) : (
                      currentMemories.map(m => (
                        <MemoryRow
                          key={m.id}
                          mem={m}
                          onDelete={() => delMemMutation.mutate(m.id)}
                          deleting={delMemMutation.isPending && delMemMutation.variables === m.id}
                        />
                      ))
                    )}
                  </div>

                  <div className="memory-add-row">
                    <textarea
                      className="modal-textarea"
                      rows={2}
                      placeholder={tab === 'core'
                        ? '输入客观事实（如：我在2024年3月换了工作）...'
                        : '输入任何记忆（如：我在推演中尝试了新的沟通方式）...'}
                      value={newMem}
                      onChange={e => setNewMem(e.target.value)}
                    />
                    <button
                      className={`memory-add-btn ${tab}`}
                      onClick={() => handleAddMemory(tab as 'core' | 'parallel')}
                      disabled={!newMem.trim() || addMemMutation.isPending}
                    >
                      {addMemMutation.isPending ? '添加中...' : `+ 添加${tab === 'core' ? '核心' : '平行'}记忆`}
                    </button>
                  </div>
                  {addMemMutation.isError && (
                    <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>添加失败</div>
                  )}
                </div>
              )}

              {/* ── 虚拟我（agent 配置 + 创建）── */}
              {tab === 'agent' && (
                <div className="modal-section">
                  <div className="modal-section-title">
                    虚拟我 Agent
                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8, fontWeight: 400 }}>
                      （第三层权限，与其他角色平等）
                    </span>
                  </div>
                  <div className="memory-desc" style={{ marginBottom: 16 }}>
                    创建一个 agent 来模拟你，可在左侧面板中对话和推演。<strong>「虚拟我」与「真实的你」权限完全隔离</strong>，agent 仅负责扮演，不具备任何系统权限。
                  </div>

                  {/* Agent model config */}
                  <div className="modal-row">
                    <label>模型（可选）</label>
                    <input className="modal-input" placeholder="例如：claude-sonnet-4-5，不填则使用系统默认"
                      value={form.agent_model} onChange={e => set('agent_model', e.target.value)} />
                  </div>

                  <div className="modal-row">
                    <label>系统提示词（虚拟我的角色设定）</label>
                    <textarea className="modal-textarea" rows={5}
                      placeholder={`你正在扮演 ${form.name || '我'}。\n基于以下信息回应...\n\n（留空则使用自动生成的提示词）`}
                      value={form.agent_system_prompt}
                      onChange={e => set('agent_system_prompt', e.target.value)}
                    />
                  </div>

                  {/* Virtual me agent status + create/delete */}
                  <div style={{
                    marginTop: 20, padding: '14px 16px',
                    background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)',
                    borderRadius: 10,
                  }}>
                    {virtualMeRole ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: '#6366f133', border: '1.5px solid #6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#818cf8', fontWeight: 700, fontSize: 14, flexShrink: 0,
                          }}>
                            {virtualMeRole.name.charAt(0)}
                          </span>
                          <div>
                            <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 14 }}>
                              {virtualMeRole.name}
                            </div>
                            <div style={{ color: '#22c55e', fontSize: 11, marginTop: 1 }}>
                              ✓ 虚拟我 Agent 已创建，可在左侧面板中找到并对话
                            </div>
                          </div>
                        </div>
                        <button
                          style={{
                            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)',
                            color: '#f87171', borderRadius: 6, padding: '5px 14px',
                            fontSize: 12, cursor: 'pointer',
                          }}
                          onClick={() => {
                            if (confirm(`确认删除虚拟我 Agent「${virtualMeRole.name}」？所有对话记录也将删除。`)) {
                              deleteVirtualMeMutation.mutate()
                            }
                          }}
                          disabled={deleteVirtualMeMutation.isPending}
                        >
                          {deleteVirtualMeMutation.isPending ? '删除中...' : '删除虚拟我 Agent'}
                        </button>
                      </>
                    ) : (
                      <>
                        <div style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 12 }}>
                          尚未创建虚拟我 Agent。创建后它将出现在左侧的关系列表中，可以与它对话和进行推演。
                        </div>
                        <button
                          className="modal-confirm-btn"
                          style={{ width: '100%' }}
                          onClick={() => createVirtualMeMutation.mutate()}
                          disabled={createVirtualMeMutation.isPending}
                        >
                          {createVirtualMeMutation.isPending ? '创建中...' : '✦ 创建虚拟我 Agent'}
                        </button>
                        {createVirtualMeMutation.isError && (
                          <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>创建失败，请检查后端连接</div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          {(tab === 'basic' || tab === 'agent') && (
            <>
              <button className="modal-cancel-btn" onClick={onClose}>取消</button>
              <button
                className="modal-confirm-btn"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? '保存中...' : '保存档案'}
              </button>
            </>
          )}
          {(tab === 'core' || tab === 'parallel') && (
            <button className="modal-cancel-btn" onClick={onClose}>关闭</button>
          )}
        </div>

        {saveMutation.isError && (
          <div className="modal-error">保存失败，请检查后端连接</div>
        )}
        {saveMutation.isSuccess && (
          <div style={{ padding: '0 20px 12px', color: 'var(--green)', fontSize: 12 }}>
            ✓ 已保存
          </div>
        )}
      </div>
    </div>
  )
}
