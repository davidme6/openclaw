// 主布局：三栏布局 + Jarvis 侧边栏
// 左：关系列表 | 中：关系图谱 | 右：对话/推演控制台
import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from './api/client'
import { useStore } from './store'
import { REL_TYPE_LABELS, REL_TYPE_COLORS, REL_STATUS_COLORS } from './types'
import type { Role } from './types'
import RelationshipGraph from './components/RelationshipGraph'
import ChatPanel from './components/ChatPanel'
import SimulationPanel from './components/SimulationPanel'
import JarvisPanel from './components/JarvisPanel'
import RoleModal from './components/RoleModal'
import SettingsModal from './components/SettingsModal'
import StarfieldBackground from './components/StarfieldBackground'
import { staggerFadeIn, fadeIn } from './utils/animations'

type RightPanel = 'chat' | 'simulation'

export default function App() {
  const { roles, setRoles, selectedRoleId, setSelectedRole, jarvisPanel, toggleJarvis } = useStore()
  const qc = useQueryClient()
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat')
  const [showAddRole, setShowAddRole] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [addSubRoleParent, setAddSubRoleParent] = useState<Role | null>(null)
  
  // 侧边栏宽度状态
  const [leftWidth, setLeftWidth] = useState(280)
  const [rightWidth, setRightWidth] = useState(400)
  const [rightFullscreen, setRightFullscreen] = useState(false)
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null)
  const resizeStartX = useRef(0)
  const resizeStartWidth = useRef(0)

  // 开始拖拽
  const startResize = useCallback((e: React.MouseEvent, side: 'left' | 'right') => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(side)
    resizeStartX.current = e.clientX
    resizeStartWidth.current = side === 'left' ? leftWidth : rightWidth
  }, [leftWidth, rightWidth])
  
  // 拖拽中
  useEffect(() => {
    if (!isResizing) return
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX.current
      const newWidth = resizeStartWidth.current + (isResizing === 'left' ? deltaX : -deltaX)
      if (isResizing === 'left') {
        setLeftWidth(Math.max(180, Math.min(500, newWidth)))
      } else {
        const maxRight = window.innerWidth - 300  // 留出最小中间区域
        setRightWidth(Math.max(320, Math.min(maxRight, newWidth)))
      }
    }
    
    const handleMouseUp = () => {
      setIsResizing(null)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Pinned roles (localStorage)
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('pinnedRoles') || '[]')) } catch { return new Set() }
  })
  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setPinnedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem('pinnedRoles', JSON.stringify([...next]))
      return next
    })
  }

  // Delete role
  const handleDelete = async (e: React.MouseEvent, role: Role) => {
    e.stopPropagation()
    if (!confirm(`确认删除「${role.name}」？该角色的所有对话记录也将被删除。`)) return
    await rolesApi.delete(role.id)
    if (selectedRoleId === role.id) setSelectedRole(null)
    qc.invalidateQueries({ queryKey: ['roles'] })
  }

  // Load roles
  const { data } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    refetchInterval: 30000,
  })
  useEffect(() => { if (data) setRoles(data) }, [data, setRoles])

  // Sort: pinned first, then alphabetical (main roles only; sub-roles shown under parent)
  const mainRoles = roles.filter(r => !r.parent_role_id)
  const sortedRoles = [...mainRoles].sort((a, b) => {
    const ap = pinnedIds.has(a.id) ? 0 : 1
    const bp = pinnedIds.has(b.id) ? 0 : 1
    return ap - bp || a.name.localeCompare(b.name, 'zh')
  })
  // Sub-roles grouped by parent
  const subRolesByParent = new Map<string, Role[]>()
  roles.filter(r => r.parent_role_id).forEach(r => {
    const pid = r.parent_role_id!
    if (!subRolesByParent.has(pid)) subRolesByParent.set(pid, [])
    subRolesByParent.get(pid)!.push(r)
  })

  // 入场动画
  useEffect(() => {
    const topbar = document.querySelector('.topbar')
    const sidebar = document.querySelector('.role-sidebar')
    const graphArea = document.querySelector('.graph-area')
    const rightPanel = document.querySelector('.right-panel')
    
    if (topbar) fadeIn(topbar, 0.5, 0)
    if (sidebar) fadeIn(sidebar, 0.5, 0.1)
    if (graphArea) fadeIn(graphArea, 0.5, 0.2)
    if (rightPanel) fadeIn(rightPanel, 0.5, 0.3)
    
    // 角色列表 stagger 动画
    const roleItems = document.querySelectorAll('.role-item')
    if (roleItems.length > 0) {
      staggerFadeIn(roleItems, 0.4, 0.03)
    }
  }, [])

  return (
    <div className="app">
      {/* Three.js 星空背景 */}
      <StarfieldBackground />
      
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="app-logo">🌐</span>
          <div className="app-title-group">
            <span className="app-name">我的平行世界</span>
            <span className="app-subtitle">社会关系推演系统</span>
          </div>
        </div>
        <div className="topbar-right">
          <button className="topbar-settings-btn" onClick={() => setShowSettings(true)} title="模型配置">
            ⚙️
          </button>
          <button
            className={`jarvis-toggle-btn ${jarvisPanel ? 'active' : ''}`}
            onClick={toggleJarvis}
          >
            🧠 Jarvis 分析
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-layout">
        {/* Left: Role Sidebar */}
        <aside className="role-sidebar" style={{ width: leftWidth }}>
          {/* 左侧拖拽手柄 */}
          <div 
            className="role-sidebar-resize"
            onMouseDown={e => startResize(e, 'left')}
          />
          <div className="sidebar-header">
            <span className="sidebar-title">我的关系</span>
            <button className="add-role-btn" onClick={() => setShowAddRole(true)} title="添加角色">
              +
            </button>
          </div>

          <div className="role-list">
            {roles.length === 0 ? (
              <div className="role-empty">
                <p>还没有角色</p>
                <button className="role-empty-add" onClick={() => setShowAddRole(true)}>
                  + 添加第一个关系
                </button>
              </div>
            ) : (
              sortedRoles.map(role => {
                const typeColor = REL_TYPE_COLORS[role.relationship_type] || '#94a3b8'
                const isPinned = pinnedIds.has(role.id)
                const children = subRolesByParent.get(role.id) || []
                return (
                  <div key={role.id}>
                    {/* 主角色行 */}
                    <div
                      className={`role-item ${selectedRoleId === role.id ? 'selected' : ''} ${isPinned ? 'pinned' : ''}`}
                      onClick={() => setSelectedRole(role.id)}
                    >
                      <div className="role-avatar" style={{ backgroundColor: typeColor + '33', borderColor: typeColor, color: typeColor }}>
                        {role.name.charAt(0)}
                        {isPinned && <span className="role-avatar-pin">📌</span>}
                      </div>
                      <div className="role-info">
                        <span className="role-name">{role.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <span className="role-type" style={{ color: typeColor }}>
                            {REL_TYPE_LABELS[role.relationship_type]}
                          </span>
                          {/* 操作按钮组 - hover 显示 */}
                          <div className="role-actions">
                            <button className="role-action-btn" title={isPinned ? '取消置顶' : '置顶'}
                              onClick={e => togglePin(e, role.id)}>
                              {isPinned ? '📌' : '☆'}
                            </button>
                            <button className="role-action-btn" title={`添加${role.name}的关联角色`}
                              onClick={e => { e.stopPropagation(); setAddSubRoleParent(role) }}>
                              ⊕
                            </button>
                            <button className="role-action-btn" title="编辑"
                              onClick={e => { e.stopPropagation(); setEditingRole(role) }}>
                              ✏️
                            </button>
                            <button className="role-action-btn danger" title="删除"
                              onClick={e => handleDelete(e, role)}>
                              🗑
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="role-status-dot" style={{ backgroundColor: REL_STATUS_COLORS[role.relationship_status] }} />
                    </div>
                    {/* 关联子角色（缩进显示） */}
                    {children.map(child => {
                      const childColor = REL_TYPE_COLORS[child.relationship_type] || '#94a3b8'
                      return (
                        <div key={child.id}
                          className={`role-item role-item-sub ${selectedRoleId === child.id ? 'selected' : ''}`}
                          onClick={() => setSelectedRole(child.id)}
                        >
                          <div className="role-sub-indent">└</div>
                          <div className="role-avatar role-avatar-sm"
                            style={{ backgroundColor: childColor + '22', borderColor: childColor + '88', color: childColor }}>
                            {child.name.charAt(0)}
                          </div>
                          <div className="role-info">
                            <div className="role-name" style={{ fontSize: 12 }}>
                              {child.name}
                              {child.connected_to_user && <span className="role-connected-badge">已连接</span>}
                            </div>
                            <div className="role-type" style={{ color: childColor, fontSize: 11 }}>
                              {REL_TYPE_LABELS[child.relationship_type]}
                            </div>
                          </div>
                          <div className="role-actions">
                            <button className="role-action-btn" title={`添加${child.name}的关联角色`}
                              onClick={e => { e.stopPropagation(); setAddSubRoleParent(child) }}>
                              ⊕
                            </button>
                            <button className="role-action-btn" title="编辑"
                              onClick={e => { e.stopPropagation(); setEditingRole(child) }}>✏️</button>
                            <button className="role-action-btn danger" title="删除"
                              onClick={e => handleDelete(e, child)}>🗑</button>
                          </div>
                          <div className="role-status-dot" style={{ backgroundColor: REL_STATUS_COLORS[child.relationship_status] }} />
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}
          </div>
        </aside>

        {/* Center: Relationship Graph */}
        <main className="graph-area">
          <RelationshipGraph />
        </main>

        {/* Right: Chat / Simulation Panel */}
        <aside className={`right-panel${rightFullscreen ? ' right-panel-fullscreen' : ''}`}
          style={rightFullscreen ? undefined : { width: rightWidth }}>
          {/* 右侧拖拽手柄（全屏时隐藏）*/}
          {!rightFullscreen && (
            <div className="right-panel-resize" onMouseDown={e => startResize(e, 'right')} />
          )}
          {/* Panel Toggle */}
          <div className="right-panel-tabs">
            <button
              className={`panel-tab ${rightPanel === 'chat' ? 'active' : ''}`}
              onClick={() => setRightPanel('chat')}
            >
              💬 对话
            </button>
            <button
              className={`panel-tab ${rightPanel === 'simulation' ? 'active' : ''}`}
              onClick={() => setRightPanel('simulation')}
            >
              🌿 推演
            </button>
            <button
              className="panel-tab-fullscreen"
              title={rightFullscreen ? '退出全屏' : '全屏对话'}
              onClick={() => setRightFullscreen(f => !f)}
            >
              {rightFullscreen ? '⊠' : '⊡'}
            </button>
          </div>

          <div className="right-panel-content">
            {rightPanel === 'chat' ? <ChatPanel /> : <SimulationPanel />}
          </div>
        </aside>

        {/* Jarvis Sidebar Overlay */}
        {jarvisPanel && (
          <div className="jarvis-overlay">
            <div className="jarvis-sidebar">
              <button className="jarvis-close" onClick={toggleJarvis}>✕</button>
              <JarvisPanel />
            </div>
          </div>
        )}
      </div>

      {/* Add Role Modal */}
      {showAddRole && (
        <RoleModal onClose={() => setShowAddRole(false)} />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <RoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
        />
      )}

      {/* Add Sub-role Modal */}
      {addSubRoleParent && (
        <RoleModal
          parentRole={addSubRoleParent}
          onClose={() => setAddSubRoleParent(null)}
        />
      )}

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
