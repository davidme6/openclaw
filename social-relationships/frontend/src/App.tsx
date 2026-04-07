// 主布局：三栏布局 + Jarvis 侧边栏
// 左：关系列表 | 中：关系图谱 | 右：对话/推演控制台
// 顶栏：Jarvis 入口
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rolesApi } from './api/client'
import { useStore } from './store'
import { Role, REL_TYPE_LABELS, REL_STATUS_COLORS } from './types'
import RelationshipGraph from './components/RelationshipGraph'
import ChatPanel from './components/ChatPanel'
import SimulationPanel from './components/SimulationPanel'
import JarvisPanel from './components/JarvisPanel'
import AddRoleModal from './components/AddRoleModal'

type RightPanel = 'chat' | 'simulation'

export default function App() {
  const { roles, setRoles, selectedRoleId, setSelectedRole, jarvisPanel, toggleJarvis } = useStore()
  const [rightPanel, setRightPanel] = useState<RightPanel>('chat')
  const [showAddRole, setShowAddRole] = useState(false)

  // Load roles
  const { data } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
    refetchInterval: 30000,
  })
  useEffect(() => { if (data) setRoles(data) }, [data, setRoles])

  const selectedRole = roles.find(r => r.id === selectedRoleId)

  return (
    <div className="app">
      {/* Top Bar */}
      <header className="topbar">
        <div className="topbar-left">
          <span className="app-logo">🌐</span>
          <span className="app-name">平行世界</span>
          <span className="app-subtitle">社会关系推演系统</span>
        </div>
        <div className="topbar-right">
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
        <aside className="role-sidebar">
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
              roles.map(role => (
                <div
                  key={role.id}
                  className={`role-item ${selectedRoleId === role.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role.id)}
                >
                  <div
                    className="role-avatar"
                    style={{ borderColor: REL_STATUS_COLORS[role.relationship_status] }}
                  >
                    {role.name.charAt(0)}
                  </div>
                  <div className="role-info">
                    <div className="role-name">{role.name}</div>
                    <div className="role-type">{REL_TYPE_LABELS[role.relationship_type]}</div>
                  </div>
                  <div
                    className="role-status-dot"
                    style={{ backgroundColor: REL_STATUS_COLORS[role.relationship_status] }}
                  />
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center: Relationship Graph */}
        <main className="graph-area">
          <RelationshipGraph />
        </main>

        {/* Right: Chat / Simulation Panel */}
        <aside className="right-panel">
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
      {showAddRole && <AddRoleModal onClose={() => setShowAddRole(false)} />}
    </div>
  )
}
