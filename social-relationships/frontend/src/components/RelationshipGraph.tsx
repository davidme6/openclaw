// Module 1: Relationship Graph - God-view of all social connections
import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  Connection, NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { REL_TYPE_LABELS, REL_STATUS_COLORS } from '../types'
import type { Role } from '../types'
import { useStore } from '../store'

// Custom node: relationship role card
function RoleNode({ data }: { data: any }) {
  const { role, onClick, isSelected } = data
  const color = REL_STATUS_COLORS[role.relationship_status as keyof typeof REL_STATUS_COLORS] || '#94a3b8'
  return (
    <div
      onClick={() => onClick(role.id)}
      style={{
        background: '#1a1d27',
        border: `2px solid ${isSelected ? '#6366f1' : color}`,
        borderRadius: 12,
        padding: '10px 14px',
        minWidth: 100,
        textAlign: 'center',
        cursor: 'pointer',
        boxShadow: isSelected ? `0 0 0 3px rgba(99,102,241,0.4)` : undefined,
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        margin: '0 auto 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700,
        backgroundColor: color + '33', color,
      }}>
        {role.name.charAt(0)}
      </div>
      <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>{role.name}</div>
      <div style={{ color, fontSize: 11, marginTop: 3 }}>
        {REL_TYPE_LABELS[role.relationship_type as keyof typeof REL_TYPE_LABELS]}
      </div>
      {role.age && <div style={{ color: '#94a3b8', fontSize: 11 }}>{role.age}岁</div>}
    </div>
  )
}

const nodeTypes: NodeTypes = { role: RoleNode }

function buildGraph(roles: Role[], selectedId: string | null, onSelect: (id: string) => void) {
  const nodes: Node[] = [
    {
      id: 'user',
      type: 'default',
      position: { x: 0, y: 0 },
      data: { label: '我' },
      style: {
        background: '#6366f1', color: '#fff', borderRadius: '50%',
        width: 64, height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontWeight: 'bold', fontSize: 16,
        border: '3px solid #818cf8',
      },
    },
  ]

  const edges: Edge[] = []
  const radius = Math.max(200, roles.length * 65)
  const angleStep = (2 * Math.PI) / Math.max(roles.length, 1)

  roles.forEach((role, i) => {
    const angle = i * angleStep - Math.PI / 2
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius

    nodes.push({
      id: role.id,
      type: 'role',
      position: { x, y },
      data: { role, onClick: onSelect, isSelected: role.id === selectedId },
    })

    edges.push({
      id: `e-user-${role.id}`,
      source: 'user',
      target: role.id,
      style: {
        stroke: REL_STATUS_COLORS[role.relationship_status] || '#475569',
        strokeWidth: 2,
        strokeDasharray: role.relationship_status === 'distant' ? '5,5' : undefined,
      },
      animated: role.relationship_status === 'active',
    })
  })

  return { nodes, edges }
}

export default function RelationshipGraph() {
  const { roles, selectedRoleId, setSelectedRole } = useStore()
  const { nodes: initNodes, edges: initEdges } = buildGraph(roles, selectedRoleId, setSelectedRole)
  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges)

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(roles, selectedRoleId, setSelectedRole)
    setNodes(n)
    setEdges(e)
  }, [roles, selectedRoleId])

  const onConnect = useCallback((c: Connection) => setEdges(eds => addEdge(c, eds)), [])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="#2d3148" gap={20} />
        <Controls style={{ background: '#1a1d27', border: '1px solid #2d3148' }} />
        <MiniMap
          style={{ background: '#1a1d27', border: '1px solid #2d3148' }}
          nodeColor={(n) => {
            if (n.id === 'user') return '#6366f1'
            const role = roles.find(r => r.id === n.id)
            return role ? REL_STATUS_COLORS[role.relationship_status] : '#475569'
          }}
        />
      </ReactFlow>
    </div>
  )
}
