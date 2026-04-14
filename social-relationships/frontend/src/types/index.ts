export type RelationshipType =
  | 'lover' | 'spouse' | 'first_love' | 'parent'
  | 'grandparent' | 'sibling' | 'relative'
  | 'friend' | 'colleague' | 'classmate' | 'boss' | 'other'

export type RelationshipStatus = 'active' | 'strained' | 'distant' | 'ended' | 'deceased'

export type BranchStatus = 'active' | 'merged' | 'abandoned'

export type MemoryType = 'core' | 'parallel'
export type MemorySource = 'self' | 'jarvis'

export interface RoleRelationship {
  target_role_id: string   // "user" or another role's id
  label?: string
  dashed?: boolean         // false = solid (direct), true = dashed (indirect)
  curve?: number
}

/** A single memory entry used by roles and the user */
export interface RoleMemory {
  id: string
  content: string
  source: MemorySource
  created_at: string
}

/** Jarvis skill card */
export interface JarvisSkill {
  id: string
  name: string
  description: string
  instructions: string
  active: boolean
  created_at: string
}

export interface Role {
  id: string
  name: string
  relationship_type: RelationshipType
  relationship_status: RelationshipStatus
  age?: number
  occupation?: string
  location?: string
  bio?: string
  personality?: {
    mbti?: string
    speaking_style?: string
    values?: string[]
    habits?: string[]
    triggers?: string[]
    love_language?: string
    background?: string
  }
  key_events?: string[]
  relationship_started?: string
  // Memory system
  core_memories?: RoleMemory[]
  parallel_memories?: RoleMemory[]
  // Hierarchy — unlimited depth
  parent_role_id?: string | null
  connected_to_user?: boolean
  // Any-to-any relationship lines
  role_relationships?: RoleRelationship[]
  created_at?: string
  updated_at?: string
}

export interface Message {
  role: 'user' | 'agent'
  content: string
  timestamp: string
  is_imported: boolean
}

export interface Branch {
  id: string
  name: string
  description: string
  status: BranchStatus
  created_at: string
}

/** User memory entry (includes memory_type since user has core/parallel split) */
export interface UserMemory extends RoleMemory {
  memory_type: MemoryType
}

/** User's own profile (highest permission tier) */
export interface UserProfile {
  name: string
  bio?: string
  birthday?: string
  occupation?: string
  location?: string
  personality?: {
    mbti?: string
    speaking_style?: string
    values?: string[]
    triggers?: string[]
    love_language?: string
    background?: string
  }
  memories?: UserMemory[]
  // Optional: agent model for "virtual me" simulation
  agent_model?: string
  agent_system_prompt?: string
  created_at?: string
  updated_at?: string
}

export const REL_TYPE_LABELS: Record<RelationshipType, string> = {
  lover: '恋人', spouse: '伴侣', first_love: '初恋',
  parent: '父母', grandparent: '祖父母', sibling: '兄弟姐妹',
  relative: '亲戚', friend: '朋友', colleague: '同事',
  classmate: '同学', boss: '领导', other: '其他',
}

export const REL_STATUS_COLORS: Record<RelationshipStatus, string> = {
  active: '#22c55e', strained: '#f59e0b',
  distant: '#94a3b8', ended: '#ef4444', deceased: '#7c3aed',
}

export const REL_TYPE_COLORS: Record<RelationshipType, string> = {
  lover: '#f59e0b', spouse: '#ec4899', first_love: '#fb923c',
  parent: '#60a5fa', grandparent: '#818cf8', sibling: '#34d399',
  relative: '#a78bfa', friend: '#34d399', colleague: '#a78bfa',
  classmate: '#fbbf24', boss: '#f87171', other: '#94a3b8',
}
