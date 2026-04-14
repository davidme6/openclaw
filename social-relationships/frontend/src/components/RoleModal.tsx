/**
 * RoleModal — unified create / edit modal.
 * Supports selecting any existing role (at any depth) as parent,
 * memory management (core / parallel), and unlimited hierarchy nesting.
 */
import { useState, useRef } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { rolesApi } from '../api/client'
import { REL_TYPE_LABELS } from '../types'
import type { Role, RelationshipType, RelationshipStatus, RoleMemory } from '../types'

interface Props {
  role?: Role            // existing role to edit
  parentRole?: Role      // pre-selected parent (when clicking ⊕ on a node)
  onClose: () => void
}

const STATUS_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'active',   label: '正常 🟢' },
  { value: 'strained', label: '紧张 🟡' },
  { value: 'distant',  label: '疏远 ⚪' },
  { value: 'ended',    label: '已结束 🔴' },
  { value: 'deceased', label: '已离世 🟣' },
]

const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP',
]

/** Build a flat list with depth info for the parent selector dropdown */
function buildFlatTree(roles: Role[], excludeId?: string): { role: Role; depth: number; label: string }[] {
  const childrenOf = new Map<string, Role[]>()
  roles.forEach(r => {
    if (r.parent_role_id) {
      if (!childrenOf.has(r.parent_role_id)) childrenOf.set(r.parent_role_id, [])
      childrenOf.get(r.parent_role_id)!.push(r)
    }
  })

  const result: { role: Role; depth: number; label: string }[] = []

  function walk(role: Role, depth: number) {
    if (role.id === excludeId) return
    const prefix = depth === 0 ? '' : '　'.repeat(depth) + '└ '
    result.push({ role, depth, label: prefix + role.name })
    for (const child of (childrenOf.get(role.id) || [])) {
      walk(child, depth + 1)
    }
  }

  roles.filter(r => !r.parent_role_id).forEach(r => walk(r, 0))
  return result
}

// ── Memory section sub-component ──────────────────────────────────────────────
function MemorySection({
  roleId,
  memoryType,
  memories,
  onAdded,
  onDeleted,
}: {
  roleId: string
  memoryType: 'core' | 'parallel'
  memories: RoleMemory[]
  onAdded: (m: RoleMemory) => void
  onDeleted: (id: string) => void
}) {
  const [text, setText] = useState('')
  const [showWarning, setShowWarning] = useState(false)
  const pendingRef = useRef('')

  const addMutation = useMutation({
    mutationFn: (content: string) => rolesApi.addMemory(roleId, content, memoryType),
    onSuccess: (data) => { onAdded(data); setText('') },
  })

  const deleteMutation = useMutation({
    mutationFn: (memId: string) => rolesApi.deleteMemory(roleId, memId),
    onSuccess: (_, memId) => onDeleted(memId),
  })

  const handleAdd = () => {
    if (!text.trim()) return
    if (memoryType === 'core') {
      pendingRef.current = text.trim()
      setShowWarning(true)
    } else {
      addMutation.mutate(text.trim())
    }
  }

  const confirmCore = () => {
    setShowWarning(false)
    addMutation.mutate(pendingRef.current)
  }

  const isCore = memoryType === 'core'

  return (
    <div>
      {/* Core memory warning dialog */}
      {showWarning && (
        <div className="memory-warn-overlay">
          <div className="memory-warn-box">
            <div className="memory-warn-icon">⚠️</div>
            <div className="memory-warn-title">核心记忆导入确认</div>
            <div className="memory-warn-body">
              核心记忆将直接影响角色的扮演行为。<br />
              请确认以下内容：
              <ul>
                <li>这是<strong>客观事实</strong>，而非主观判断</li>
                <li>这是<strong>现实中真实发生</strong>的，而非假设或推演</li>
                <li>错误的核心记忆会导致角色偏离现实</li>
              </ul>
              <div className="memory-warn-preview">「{pendingRef.current}」</div>
            </div>
            <div className="memory-warn-actions">
              <button className="modal-cancel-btn" onClick={() => setShowWarning(false)}>取消</button>
              <button className="modal-confirm-btn" onClick={confirmCore}>确认导入</button>
            </div>
          </div>
        </div>
      )}

      {/* Memory list */}
      <div className="memory-list">
        {memories.length === 0 ? (
          <div className="memory-empty">暂无{isCore ? '核心' : '平行'}记忆</div>
        ) : (
          memories.map(m => (
            <div key={m.id} className="memory-item">
              <span className={`memory-source-badge ${m.source}`}>
                {m.source === 'jarvis' ? '贾维斯' : '我'}
              </span>
              <span className="memory-content">{m.content}</span>
              <button
                className="memory-del-btn"
                onClick={() => deleteMutation.mutate(m.id)}
                disabled={deleteMutation.isPending}
                title="删除"
              >✕</button>
            </div>
          ))
        )}
      </div>

      {/* Add new */}
      <div className="memory-add-row">
        <textarea
          className="modal-textarea"
          rows={2}
          placeholder={isCore
            ? '输入客观事实（如：他去年3月出轨过）...'
            : '输入任何记忆（如：我们在游戏里组队打怪）...'}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button
          className={`memory-add-btn ${isCore ? 'core' : 'parallel'}`}
          onClick={handleAdd}
          disabled={!text.trim() || addMutation.isPending}
        >
          {addMutation.isPending ? '添加中...' : `+ 添加${isCore ? '核心' : '平行'}记忆`}
        </button>
      </div>
      {addMutation.isError && (
        <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 4 }}>添加失败，请重试</div>
      )}
    </div>
  )
}

// ── Main modal ─────────────────────────────────────────────────────────────────
export default function RoleModal({ role, parentRole, onClose }: Props) {
  const qc = useQueryClient()
  const isEditing = !!role

  const { data: allRoles = [] } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
  })

  const [form, setForm] = useState({
    name: role?.name ?? '',
    relationship_type: (role?.relationship_type ?? 'friend') as RelationshipType,
    relationship_status: (role?.relationship_status ?? 'active') as RelationshipStatus,
    age: role?.age?.toString() ?? '',
    occupation: role?.occupation ?? '',
    bio: role?.bio ?? '',
    mbti: role?.personality?.mbti ?? '',
    speaking_style: role?.personality?.speaking_style ?? '',
    values: role?.personality?.values?.join('、') ?? '',
    triggers: role?.personality?.triggers?.join('、') ?? '',
    love_language: role?.personality?.love_language ?? '',
    background: role?.personality?.background ?? '',
    parent_role_id: role?.parent_role_id ?? parentRole?.id ?? '',
    connected_to_user: role?.connected_to_user ?? true,
  })

  // Local memory state (editable list for existing roles)
  const [coreMemories, setCoreMemories] = useState<RoleMemory[]>(role?.core_memories ?? [])
  const [parallelMemories, setParallelMemories] = useState<RoleMemory[]>(role?.parallel_memories ?? [])

  const set = (key: string, val: string | boolean) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const flatTree = buildFlatTree(allRoles, role?.id)

  const buildPayload = () => {
    const payload: any = {
      name: form.name.trim(),
      relationship_type: form.relationship_type,
      relationship_status: form.relationship_status,
      parent_role_id: form.parent_role_id || null,
      connected_to_user: form.connected_to_user,
    }
    if (form.age) payload.age = parseInt(form.age)
    if (form.occupation) payload.occupation = form.occupation.trim()
    if (form.bio) payload.bio = form.bio.trim()

    const personality: any = {}
    if (form.mbti) personality.mbti = form.mbti
    if (form.speaking_style) personality.speaking_style = form.speaking_style.trim()
    if (form.values) personality.values = form.values.split(/[，,、]/).map(s => s.trim()).filter(Boolean)
    if (form.triggers) personality.triggers = form.triggers.split(/[，,、]/).map(s => s.trim()).filter(Boolean)
    if (form.love_language) personality.love_language = form.love_language.trim()
    if (form.background) personality.background = form.background.trim()
    if (Object.keys(personality).length > 0) payload.personality = personality

    if (isEditing && role?.role_relationships) {
      payload.role_relationships = role.role_relationships
    }

    return payload
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      return isEditing
        ? rolesApi.update(role!.id, payload)
        : rolesApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      onClose()
    },
  })

  const valid = form.name.trim().length > 0
  const selectedParent = allRoles.find(r => r.id === form.parent_role_id)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? `编辑「${role.name}」` : parentRole ? `添加 ${parentRole.name} 的关联角色` : '添加关系角色'}
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* 基本信息 */}
          <div className="modal-section">
            <div className="modal-section-title">基本信息</div>

            <div className="modal-row">
              <label>姓名 *</label>
              <input className="modal-input" placeholder="ta 叫什么"
                value={form.name} onChange={e => set('name', e.target.value)} />
            </div>

            <div className="modal-row">
              <label>关系类型</label>
              <select className="modal-select" value={form.relationship_type}
                onChange={e => set('relationship_type', e.target.value)}>
                {(Object.keys(REL_TYPE_LABELS) as RelationshipType[]).map(t => (
                  <option key={t} value={t}>{REL_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>

            <div className="modal-row">
              <label>关系状态</label>
              <select className="modal-select" value={form.relationship_status}
                onChange={e => set('relationship_status', e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="modal-row-2col">
              <div className="modal-row">
                <label>年龄</label>
                <input className="modal-input" type="number" placeholder="岁"
                  value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div className="modal-row">
                <label>职业</label>
                <input className="modal-input" placeholder="从事什么工作"
                  value={form.occupation} onChange={e => set('occupation', e.target.value)} />
              </div>
            </div>

            <div className="modal-row">
              <label>简介</label>
              <textarea className="modal-textarea" rows={3}
                placeholder="ta 是个什么样的人..."
                value={form.bio} onChange={e => set('bio', e.target.value)} />
            </div>
          </div>

          {/* 层级关系 */}
          <div className="modal-section">
            <div className="modal-section-title">层级关系</div>

            <div className="modal-row">
              <label>
                上级角色
                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>
                  （可无限嵌套，不选则为顶层）
                </span>
              </label>
              <select className="modal-select" value={form.parent_role_id}
                onChange={e => set('parent_role_id', e.target.value)}>
                <option value="">无（顶层角色）</option>
                {flatTree.map(({ role: r, label }) => (
                  <option key={r.id} value={r.id}>{label}</option>
                ))}
              </select>
              {selectedParent && (
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4 }}>
                  ↳ 将作为「{selectedParent.name}」的子节点
                </div>
              )}
            </div>

            <div className="modal-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.connected_to_user}
                  onChange={e => set('connected_to_user', e.target.checked)} />
                与我有直接关系（显示为实线）
              </label>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                取消勾选 = 仅通过他人间接相连（虚线）
              </div>
            </div>
          </div>

          {/* 性格模型 */}
          <div className="modal-section">
            <div className="modal-section-title">性格模型（可选）</div>

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
              <input className="modal-input" placeholder="例如：温柔，爱用语气词"
                value={form.speaking_style} onChange={e => set('speaking_style', e.target.value)} />
            </div>

            <div className="modal-row">
              <label>核心价值观</label>
              <input className="modal-input" placeholder="顿号分隔，例如：家庭、忠诚"
                value={form.values} onChange={e => set('values', e.target.value)} />
            </div>

            <div className="modal-row">
              <label>敏感触发点</label>
              <input className="modal-input" placeholder="顿号分隔，例如：被忽视、不被信任"
                value={form.triggers} onChange={e => set('triggers', e.target.value)} />
            </div>

            <div className="modal-row">
              <label>爱的语言</label>
              <input className="modal-input" placeholder="例如：肯定的言辞、礼物"
                value={form.love_language} onChange={e => set('love_language', e.target.value)} />
            </div>

            <div className="modal-row">
              <label>成长背景</label>
              <textarea className="modal-textarea" rows={2}
                placeholder="家庭背景、成长经历..."
                value={form.background} onChange={e => set('background', e.target.value)} />
            </div>
          </div>

          {/* 记忆系统 — 仅编辑已存在角色时显示 */}
          {isEditing && (
            <>
              <div className="modal-section">
                <div className="modal-section-title">
                  核心记忆
                  <span className="memory-type-badge core">影响扮演</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  仅存入<strong style={{ color: 'var(--amber)' }}>客观事实</strong>。核心记忆直接注入角色系统提示，影响 ta 的行为和态度。
                </div>
                <MemorySection
                  roleId={role!.id}
                  memoryType="core"
                  memories={coreMemories}
                  onAdded={m => setCoreMemories(prev => [...prev, m])}
                  onDeleted={id => setCoreMemories(prev => prev.filter(m => m.id !== id))}
                />
              </div>

              <div className="modal-section">
                <div className="modal-section-title">
                  平行记忆
                  <span className="memory-type-badge parallel">独立沙盒</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                  娱乐互动、推演记录、主观感受等。独立存储，<strong style={{ color: 'var(--neon-purple)' }}>不影响</strong>角色扮演行为。
                </div>
                <MemorySection
                  roleId={role!.id}
                  memoryType="parallel"
                  memories={parallelMemories}
                  onAdded={m => setParallelMemories(prev => [...prev, m])}
                  onDeleted={id => setParallelMemories(prev => prev.filter(m => m.id !== id))}
                />
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>取消</button>
          <button className="modal-confirm-btn"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}>
            {mutation.isPending ? (isEditing ? '保存中...' : '创建中...') : (isEditing ? '保存修改' : '确认添加')}
          </button>
        </div>

        {mutation.isError && (
          <div className="modal-error">操作失败，请检查后端连接</div>
        )}
      </div>
    </div>
  )
}
