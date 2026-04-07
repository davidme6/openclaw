// Module 3: God Panel / 上帝面板（推演控制台）
// 功能：分支管理、快照、Jarvis对比分析、合并/放弃
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { simApi, jarvisApi } from '../api/client'
import { useStore } from '../store'
import type { Branch } from '../types'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  active:    { label: '推演中', color: '#22c55e' },
  merged:    { label: '已合并', color: '#3b82f6' },
  abandoned: { label: '已放弃', color: '#6b7280' },
}

export default function SimulationPanel() {
  const { selectedRoleId, activeBranchId, setActiveBranch } = useStore()
  const qc = useQueryClient()

  const [newBranchName, setNewBranchName] = useState('')
  const [newBranchDesc, setNewBranchDesc] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [compareResult, setCompareResult] = useState<string | null>(null)
  const [comparing, setComparing] = useState(false)
  const [mergeOutcome, setMergeOutcome] = useState('')
  const [mergingId, setMergingId] = useState<string | null>(null)

  const { data: branches = [], isLoading } = useQuery<Branch[]>({
    queryKey: ['branches', selectedRoleId],
    queryFn: () => simApi.listBranches(selectedRoleId!),
    enabled: !!selectedRoleId,
  })

  const createBranch = useMutation({
    mutationFn: () =>
      simApi.createBranch(selectedRoleId!, newBranchName.trim(), newBranchDesc.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['branches', selectedRoleId] })
      setNewBranchName('')
      setNewBranchDesc('')
      setShowCreate(false)
    },
  })

  const abandonBranch = useMutation({
    mutationFn: (branchId: string) => simApi.abandon(branchId),
    onSuccess: (_, branchId) => {
      qc.invalidateQueries({ queryKey: ['branches', selectedRoleId] })
      if (activeBranchId === branchId) setActiveBranch(null)
    },
  })

  const mergeBranch = useMutation({
    mutationFn: ({ branchId, outcome }: { branchId: string; outcome: string }) =>
      simApi.merge(branchId, outcome),
    onSuccess: (_, { branchId }) => {
      qc.invalidateQueries({ queryKey: ['branches', selectedRoleId] })
      if (activeBranchId === branchId) setActiveBranch(null)
      setMergingId(null)
      setMergeOutcome('')
    },
  })

  const handleCompare = async () => {
    const activeBranches = branches.filter(b => b.status === 'active')
    if (activeBranches.length < 2) {
      setCompareResult('需要至少2个推演中的分支才能对比。')
      return
    }
    setComparing(true)
    setCompareResult(null)
    try {
      const result = await jarvisApi.analyzeRole(
        selectedRoleId!,
        `请对比以下推演分支的对话效果，哪个方案更好？分支ID: ${activeBranches.map(b => b.id).join(', ')}`
      )
      setCompareResult(result.analysis)
    } catch {
      setCompareResult('Jarvis 分析失败，请重试。')
    } finally {
      setComparing(false)
    }
  }

  if (!selectedRoleId) {
    return (
      <div className="sim-empty">
        <div className="sim-empty-icon">🌿</div>
        <p>请先在关系图谱中选择一个角色</p>
      </div>
    )
  }

  const activeBranches = branches.filter(b => b.status === 'active')

  return (
    <div className="sim-panel">
      {/* Header */}
      <div className="sim-header">
        <div className="sim-title">
          <span className="sim-icon">🌿</span>
          <span>推演控制台</span>
        </div>
        <button className="sim-create-btn" onClick={() => setShowCreate(v => !v)}>
          {showCreate ? '取消' : '+ 新建分支'}
        </button>
      </div>

      {/* Create Branch Form */}
      {showCreate && (
        <div className="sim-create-form">
          <input
            className="sim-input"
            placeholder="分支名称（如：温柔沟通方案）"
            value={newBranchName}
            onChange={e => setNewBranchName(e.target.value)}
          />
          <input
            className="sim-input"
            placeholder="描述这个推演方案..."
            value={newBranchDesc}
            onChange={e => setNewBranchDesc(e.target.value)}
          />
          <button
            className="sim-confirm-btn"
            disabled={!newBranchName.trim() || createBranch.isPending}
            onClick={() => createBranch.mutate()}
          >
            {createBranch.isPending ? '创建中...' : '确认创建'}
          </button>
        </div>
      )}

      {/* Current Branch Indicator */}
      {activeBranchId && (
        <div className="sim-current-branch">
          <span className="dot active" />
          当前推演分支：{branches.find(b => b.id === activeBranchId)?.name || activeBranchId}
          <button
            className="sim-exit-branch"
            onClick={() => setActiveBranch(null)}
          >
            退出推演
          </button>
        </div>
      )}

      {/* Branch List */}
      {isLoading ? (
        <div className="sim-loading">加载分支...</div>
      ) : branches.length === 0 ? (
        <div className="sim-no-branches">
          <p>还没有推演分支</p>
          <p className="sim-hint">创建分支后，可在分支内试验不同的沟通方式，不影响主线对话</p>
        </div>
      ) : (
        <div className="sim-branch-list">
          {branches.map(branch => {
            const badge = STATUS_BADGE[branch.status] || STATUS_BADGE.active
            const isActive = activeBranchId === branch.id
            const isMerging = mergingId === branch.id

            return (
              <div
                key={branch.id}
                className={`sim-branch-card ${isActive ? 'selected' : ''}`}
              >
                <div className="sim-branch-top">
                  <div className="sim-branch-info">
                    <span
                      className="sim-status-badge"
                      style={{ backgroundColor: badge.color + '22', color: badge.color, border: `1px solid ${badge.color}` }}
                    >
                      {badge.label}
                    </span>
                    <span className="sim-branch-name">{branch.name}</span>
                  </div>
                  <span className="sim-branch-date">
                    {new Date(branch.created_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>

                {branch.description && (
                  <p className="sim-branch-desc">{branch.description}</p>
                )}

                {branch.status === 'active' && (
                  <div className="sim-branch-actions">
                    {isActive ? (
                      <span className="sim-in-branch">✓ 推演中（在对话面板发消息）</span>
                    ) : (
                      <button
                        className="sim-action-btn enter"
                        onClick={() => setActiveBranch(branch.id)}
                      >
                        进入推演
                      </button>
                    )}

                    {/* Merge */}
                    {isMerging ? (
                      <div className="sim-merge-form">
                        <input
                          className="sim-input"
                          placeholder="填写现实结果（用于同步学习）..."
                          value={mergeOutcome}
                          onChange={e => setMergeOutcome(e.target.value)}
                        />
                        <div className="sim-merge-btns">
                          <button
                            className="sim-action-btn merge"
                            disabled={mergeBranch.isPending}
                            onClick={() =>
                              mergeBranch.mutate({ branchId: branch.id, outcome: mergeOutcome })
                            }
                          >
                            确认合并
                          </button>
                          <button
                            className="sim-action-btn cancel"
                            onClick={() => { setMergingId(null); setMergeOutcome('') }}
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="sim-action-btn merge"
                        onClick={() => setMergingId(branch.id)}
                      >
                        合并主线
                      </button>
                    )}

                    <button
                      className="sim-action-btn abandon"
                      disabled={abandonBranch.isPending}
                      onClick={() => {
                        if (confirm(`确认放弃分支「${branch.name}」？`)) {
                          abandonBranch.mutate(branch.id)
                        }
                      }}
                    >
                      放弃
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Jarvis Compare */}
      {activeBranches.length >= 2 && (
        <div className="sim-compare-section">
          <button
            className="sim-compare-btn"
            onClick={handleCompare}
            disabled={comparing}
          >
            {comparing ? '🤔 Jarvis 分析中...' : '⚖️ Jarvis 对比所有推演方案'}
          </button>
          {compareResult && (
            <div className="sim-compare-result">
              <div className="sim-compare-label">Jarvis 分析</div>
              <div className="sim-compare-text">{compareResult}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
