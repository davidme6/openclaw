export type RelationshipType =
  | 'lover' | 'spouse' | 'first_love' | 'parent'
  | 'grandparent' | 'sibling' | 'relative'
  | 'friend' | 'colleague' | 'classmate' | 'boss' | 'other'

export type RelationshipStatus = 'active' | 'strained' | 'distant' | 'ended' | 'deceased'

export type BranchStatus = 'active' | 'merged' | 'abandoned'

export interface Role {
  id: string
  name: string
  relationship_type: RelationshipType
  relationship_status: RelationshipStatus
  age?: number
  occupation?: string
  bio?: string
  personality?: {
    mbti?: string
    speaking_style?: string
    values?: string[]
    triggers?: string[]
    love_language?: string
  }
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
