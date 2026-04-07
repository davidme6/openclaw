// Module 1: Relationship Graph - God-view of all social connections
import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
  Connection, NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { Role, REL_TYPE_LABELS, REL_STATUS_COLORS } from '../types'
import { useStore } from '../store'

// Custom node: relationship role card
function RoleNode({ data }: { data: any }) {
  const { role, onClick, isSelected } = data
  const color = REL_STATUS_COLORS[role.relationship_status as keyof typeof REL_STATUS_COLORS] || '#94a3b8'
  return (
    <div
      onClick={() => onClick(role.id)}
      style={{ borderColor: color, boxShadow: isSelected ? `0 0 0 3px ${color}` : undefined }}
      className={`
        bg-gray-900 border-2 rounded-xl px-4 py-3 cursor-pointer min-w-[120px] text-center
        transition-all hover:scale-105
      `}
    >
      <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-xl font-bold"
        style={{ backgroundColor: color + '33', color }}>
        {role.name[0]}
      </div>
      <div className="text-white text-sm font-semibold">{role.name}</div>
      <div className="text-xs mt-1" style={{ color }}>{REL_TYPE_LABELS[role.relationship_type as keyof typeof REL_TYPE_LABELS]}</div>
      {role.age && <div className="text-gray-400 text-xs">{role.age}岁</div>}
    </div>
  )
}

const nodeTypes: NodeTypes = { role: RoleNode }

// Layout: arrange roles in a circle around the user
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
  const radius = Math.max(200, roles.length * 60)
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

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [])

  return (
    <div className="w-full h-full bg-gray-950 rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="#1e293b" gap={20} />
        <Controls className="!bg-gray-900 !border-gray-700" />
        <MiniMap className="!bg-gray-900 !border-gray-700" nodeColor={(n) => {
          if (n.id === 'user') return '#6366f1'
          const role = roles.find(r => r.id === n.id)
          return role ? REL_STATUS_COLORS[role.relationship_status] : '#475569'
        }} />
      </ReactFlow>
    </div>
  )
}
