// Module 1: Relationship Graph - God-view of all social connections
// Supports unlimited nesting depth + any-to-any relationship lines
import { useCallback, useEffect } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
} from 'reactflow'
import type { Node, Edge, Connection, NodeTypes } from 'reactflow'
import 'reactflow/dist/style.css'
import { REL_TYPE_LABELS, REL_STATUS_COLORS } from '../types'
import type { Role } from '../types'
import { useStore } from '../store'

interface Props {
  onUserClick?: () => void
}

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

/**
 * Build a graph that respects:
 * 1. Unlimited hierarchy depth via parent_role_id
 * 2. Any-to-any explicit connections via role_relationships
 * 3. connected_to_user controls solid (direct) vs dashed (indirect) line to user
 */
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
        border: '3px solid #818cf8', cursor: 'pointer',
        boxShadow: '0 0 16px rgba(99,102,241,0.5)',
      },
    },
  ]

  const edges: Edge[] = []

  // ── Build hierarchy map ──────────────────────────────────────────────────
  const childrenOf = new Map<string, Role[]>()
  const rootRoles: Role[] = []

  for (const role of roles) {
    if (role.parent_role_id) {
      if (!childrenOf.has(role.parent_role_id)) childrenOf.set(role.parent_role_id, [])
      childrenOf.get(role.parent_role_id)!.push(role)
    } else {
      rootRoles.push(role)
    }
  }

  // ── Position nodes ───────────────────────────────────────────────────────
  const posMap = new Map<string, { x: number; y: number }>()
  const angleMap = new Map<string, number>()

  // Root roles arranged in circle around user
  const baseRadius = Math.max(240, rootRoles.length * 75)
  rootRoles.forEach((role, i) => {
    const angle = (2 * Math.PI / Math.max(rootRoles.length, 1)) * i - Math.PI / 2
    posMap.set(role.id, { x: Math.cos(angle) * baseRadius, y: Math.sin(angle) * baseRadius })
    angleMap.set(role.id, angle)
  })

  // Children radiate outward from their parent, depth-by-depth
  function placeChildren(parentId: string, depth: number, visited = new Set<string>()) {
    if (visited.has(parentId)) return  // guard against circular refs
    visited.add(parentId)
    const children = childrenOf.get(parentId) || []
    if (children.length === 0) return
    const parentPos = posMap.get(parentId) || { x: 0, y: 0 }
    const parentAngle = angleMap.get(parentId) ?? 0
    const childRadius = Math.max(150, 220 - depth * 30)
    const spread = Math.PI * 0.65
    children.forEach((child, i) => {
      const offset = children.length === 1
        ? 0
        : (i / (children.length - 1) - 0.5) * spread
      const childAngle = parentAngle + offset
      posMap.set(child.id, {
        x: parentPos.x + Math.cos(childAngle) * childRadius,
        y: parentPos.y + Math.sin(childAngle) * childRadius,
      })
      angleMap.set(child.id, childAngle)
      placeChildren(child.id, depth + 1, new Set(visited))
    })
  }

  rootRoles.forEach(role => placeChildren(role.id, 1))

  // ── Create role nodes ────────────────────────────────────────────────────
  for (const role of roles) {
    const pos = posMap.get(role.id) ?? {
      x: (Math.random() - 0.5) * baseRadius * 2,
      y: (Math.random() - 0.5) * baseRadius * 2,
    }
    nodes.push({
      id: role.id,
      type: 'role',
      position: pos,
      data: { role, onClick: onSelect, isSelected: role.id === selectedId },
    })
  }

  // ── Edges 1: user → role ─────────────────────────────────────────────────
  // Skip roles that have an explicit "user" entry in role_relationships.
  // Skip child roles (has parent) that are NOT directly connected to user —
  // those are shown only via the hierarchy edge.
  const hasExplicitUserRel = new Set(
    roles
      .filter(r => r.role_relationships?.some(rel => rel.target_role_id === 'user'))
      .map(r => r.id)
  )

  for (const role of roles) {
    if (hasExplicitUserRel.has(role.id)) continue
    const isDirect = role.connected_to_user !== false
    // Child roles with connected_to_user: false are connected only via parent→child edge
    if (role.parent_role_id && !isDirect) continue
    edges.push({
      id: `e-user-${role.id}`,
      source: 'user',
      target: role.id,
      style: {
        stroke: REL_STATUS_COLORS[role.relationship_status] || '#475569',
        strokeWidth: isDirect ? 2 : 1.5,
        strokeDasharray: isDirect ? undefined : '6,4',
        opacity: isDirect ? 1 : 0.55,
      },
      animated: isDirect && role.relationship_status === 'active',
    })
  }

  // ── Edges 2: hierarchy parent → child ────────────────────────────────────
  // Solid line = child is directly connected to user too
  // Dashed line = child only connected via this hierarchy path
  for (const role of roles) {
    if (!role.parent_role_id) continue
    const isDirect = role.connected_to_user !== false
    const statusColor = REL_STATUS_COLORS[role.relationship_status] || '#818cf8'
    edges.push({
      id: `e-hier-${role.parent_role_id}-${role.id}`,
      source: role.parent_role_id,
      target: role.id,
      style: {
        stroke: isDirect ? statusColor : '#6366f1',
        strokeWidth: isDirect ? 2 : 1.5,
        strokeDasharray: isDirect ? undefined : '5,5',
        opacity: isDirect ? 1 : 0.7,
      },
    })
  }

  // ── Edges 3: role_relationships (any-to-any explicit connections) ─────────
  const addedRelEdges = new Set<string>()
  for (const role of roles) {
    if (!role.role_relationships) continue
    for (const rel of role.role_relationships) {
      if (!rel.target_role_id) continue
      const edgeId = `e-rel-${role.id}-${rel.target_role_id}`
      if (addedRelEdges.has(edgeId)) continue
      addedRelEdges.add(edgeId)

      const targetExists = rel.target_role_id === 'user' || roles.some(r => r.id === rel.target_role_id)
      if (!targetExists) continue

      edges.push({
        id: edgeId,
        source: role.id,
        target: rel.target_role_id,
        label: rel.label || undefined,
        labelStyle: { fill: '#94a3b8', fontSize: 11 },
        labelBgStyle: { fill: '#1a1d27', fillOpacity: 0.85 },
        style: {
          stroke: rel.dashed ? '#64748b' : '#818cf8',
          strokeWidth: 2,
          strokeDasharray: rel.dashed ? '6,4' : undefined,
        },
      })
    }
  }

  return { nodes, edges }
}

export default function RelationshipGraph({ onUserClick }: Props) {
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

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.id === 'user') onUserClick?.()
  }, [onUserClick])

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
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
