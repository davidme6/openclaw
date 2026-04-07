// AddRoleModal — 添加新关系角色弹窗
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from '../api/client'
import { REL_TYPE_LABELS } from '../types'
import type { RelationshipType, RelationshipStatus } from '../types'

interface Props {
  onClose: () => void
}

const STATUS_OPTIONS: { value: RelationshipStatus; label: string }[] = [
  { value: 'active',    label: '正常 🟢' },
  { value: 'strained',  label: '紧张 🟡' },
  { value: 'distant',   label: '疏远 ⚪' },
  { value: 'ended',     label: '已结束 🔴' },
  { value: 'deceased',  label: '已离世 🟣' },
]

const MBTI_OPTIONS = [
  'INTJ','INTP','ENTJ','ENTP',
  'INFJ','INFP','ENFJ','ENFP',
  'ISTJ','ISFJ','ESTJ','ESFJ',
  'ISTP','ISFP','ESTP','ESFP',
]

export default function AddRoleModal({ onClose }: Props) {
  const qc = useQueryClient()

  const [form, setForm] = useState({
    name: '',
    relationship_type: 'friend' as RelationshipType,
    relationship_status: 'active' as RelationshipStatus,
    age: '',
    occupation: '',
    bio: '',
    mbti: '',
    speaking_style: '',
    values: '',
    triggers: '',
    love_language: '',
  })

  const set = (key: string, val: string) =>
    setForm(prev => ({ ...prev, [key]: val }))

  const createRole = useMutation({
    mutationFn: () => {
      const payload: any = {
        name: form.name.trim(),
        relationship_type: form.relationship_type,
        relationship_status: form.relationship_status,
      }
      if (form.age) payload.age = parseInt(form.age)
      if (form.occupation) payload.occupation = form.occupation.trim()
      if (form.bio) payload.bio = form.bio.trim()

      const personality: any = {}
      if (form.mbti) personality.mbti = form.mbti
      if (form.speaking_style) personality.speaking_style = form.speaking_style.trim()
      if (form.values) personality.values = form.values.split('，').map(s => s.trim()).filter(Boolean)
      if (form.triggers) personality.triggers = form.triggers.split('，').map(s => s.trim()).filter(Boolean)
      if (form.love_language) personality.love_language = form.love_language.trim()
      if (Object.keys(personality).length > 0) payload.personality = personality

      return rolesApi.create(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      onClose()
    },
  })

  const valid = form.name.trim().length > 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">添加关系角色</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* 基本信息 */}
          <div className="modal-section">
            <div className="modal-section-title">基本信息</div>
            <div className="modal-row">
              <label>姓名 *</label>
              <input
                className="modal-input"
                placeholder="ta 叫什么"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </div>
            <div className="modal-row">
              <label>关系类型</label>
              <select
                className="modal-select"
                value={form.relationship_type}
                onChange={e => set('relationship_type', e.target.value)}
              >
                {(Object.keys(REL_TYPE_LABELS) as RelationshipType[]).map(t => (
                  <option key={t} value={t}>{REL_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="modal-row">
              <label>关系状态</label>
              <select
                className="modal-select"
                value={form.relationship_status}
                onChange={e => set('relationship_status', e.target.value)}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="modal-row-2col">
              <div className="modal-row">
                <label>年龄</label>
                <input
                  className="modal-input"
                  type="number"
                  placeholder="岁"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                />
              </div>
              <div className="modal-row">
                <label>职业</label>
                <input
                  className="modal-input"
                  placeholder="从事什么工作"
                  value={form.occupation}
                  onChange={e => set('occupation', e.target.value)}
                />
              </div>
            </div>
            <div className="modal-row">
              <label>简介</label>
              <textarea
                className="modal-textarea"
                placeholder="ta 是个什么样的人，有什么背景故事..."
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* 性格模型（可选） */}
          <div className="modal-section">
            <div className="modal-section-title">性格模型（可选）</div>
            <div className="modal-row">
              <label>MBTI</label>
              <select
                className="modal-select"
                value={form.mbti}
                onChange={e => set('mbti', e.target.value)}
              >
                <option value="">不填</option>
                {MBTI_OPTIONS.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="modal-row">
              <label>说话风格</label>
              <input
                className="modal-input"
                placeholder="例如：温柔体贴，爱用语气词，喜欢打小表情"
                value={form.speaking_style}
                onChange={e => set('speaking_style', e.target.value)}
              />
            </div>
            <div className="modal-row">
              <label>核心价值观</label>
              <input
                className="modal-input"
                placeholder="用中文顿号分隔，例如：家庭、忠诚、努力"
                value={form.values}
                onChange={e => set('values', e.target.value)}
              />
            </div>
            <div className="modal-row">
              <label>敏感触发点</label>
              <input
                className="modal-input"
                placeholder="用中文顿号分隔，例如：被忽视、不被信任"
                value={form.triggers}
                onChange={e => set('triggers', e.target.value)}
              />
            </div>
            <div className="modal-row">
              <label>爱的语言</label>
              <input
                className="modal-input"
                placeholder="例如：肯定的言辞、服务的行为、礼物"
                value={form.love_language}
                onChange={e => set('love_language', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="modal-cancel-btn" onClick={onClose}>取消</button>
          <button
            className="modal-confirm-btn"
            disabled={!valid || createRole.isPending}
            onClick={() => createRole.mutate()}
          >
            {createRole.isPending ? '创建中...' : '确认添加'}
          </button>
        </div>

        {createRole.isError && (
          <div className="modal-error">创建失败，请检查后端连接</div>
        )}
      </div>
    </div>
  )
}
