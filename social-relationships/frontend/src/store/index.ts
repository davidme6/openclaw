import { create } from 'zustand'
import { Role, Message, Branch } from '../types'

interface AppState {
  roles: Role[]
  selectedRoleId: string | null
  messages: Message[]
  branches: Branch[]
  activeBranchId: string | null
  jarvisPanel: boolean
  setRoles: (roles: Role[]) => void
  setSelectedRole: (id: string | null) => void
  setMessages: (msgs: Message[]) => void
  addMessage: (msg: Message) => void
  setBranches: (branches: Branch[]) => void
  setActiveBranch: (id: string | null) => void
  toggleJarvis: () => void
}

export const useStore = create<AppState>((set) => ({
  roles: [],
  selectedRoleId: null,
  messages: [],
  branches: [],
  activeBranchId: null,
  jarvisPanel: false,
  setRoles: (roles) => set({ roles }),
  setSelectedRole: (id) => set({ selectedRoleId: id, messages: [], branches: [], activeBranchId: null }),
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setBranches: (branches) => set({ branches }),
  setActiveBranch: (id) => set({ activeBranchId: id }),
  toggleJarvis: () => set((s) => ({ jarvisPanel: !s.jarvisPanel })),
}))
