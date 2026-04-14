// API client — connects to FastAPI backend
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL })

// Roles
export const rolesApi = {
  list: () => api.get('/roles/').then(r => r.data),
  get: (id: string) => api.get(`/roles/${id}`).then(r => r.data),
  create: (data: any) => api.post('/roles/', data).then(r => r.data),
  update: (id: string, data: any) => api.put(`/roles/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/roles/${id}`).then(r => r.data),
  importHistory: (id: string, messages: any[]) =>
    api.post(`/roles/${id}/import-history`, { messages }).then(r => r.data),
  specialDates: (id: string) => api.get(`/roles/${id}/special-dates`).then(r => r.data),
  // Memory management
  addMemory: (id: string, content: string, memoryType: 'core' | 'parallel', source: 'self' | 'jarvis' = 'self') =>
    api.post(`/roles/${id}/memories`, { content, memory_type: memoryType, source }).then(r => r.data),
  deleteMemory: (id: string, memoryId: string) =>
    api.delete(`/roles/${id}/memories/${memoryId}`).then(r => r.data),
}

// Chat
export const chatApi = {
  send: (
    roleId: string,
    message: string,
    branchId?: string,
    image_base64?: string | null,
  ) =>
    api.post(`/chat/${roleId}`, {
      message,
      branch_id: branchId || null,
      ...(image_base64 ? { image_base64 } : {}),
    }).then(r => r.data),
  history: (roleId: string, branchId?: string) =>
    api.get(`/chat/${roleId}/history`, { params: { branch_id: branchId } }).then(r => r.data),
}

// Simulation
export const simApi = {
  createBranch: (roleId: string, name: string, description: string) =>
    api.post(`/simulation/${roleId}/branches`, { name, description }).then(r => r.data),
  listBranches: (roleId: string) =>
    api.get(`/simulation/${roleId}/branches`).then(r => r.data),
  chatInBranch: (branchId: string, roleId: string, message: string) =>
    api.post(`/simulation/branches/${branchId}/chat/${roleId}`, { message }).then(r => r.data),
  compare: (roleId: string, branchIds: string[]) =>
    api.post(`/simulation/${roleId}/compare`, { branch_ids: branchIds }).then(r => r.data),
  merge: (branchId: string, actualOutcome: string) =>
    api.post(`/simulation/branches/${branchId}/merge`, { actual_outcome: actualOutcome }).then(r => r.data),
  abandon: (branchId: string) =>
    api.post(`/simulation/branches/${branchId}/abandon`).then(r => r.data),
}

// Jarvis
export const jarvisApi = {
  analyze: (question: string) =>
    api.post('/jarvis/analyze', { question }).then(r => r.data),
  analyzeRole: (roleId: string, question: string) =>
    api.post(`/jarvis/analyze/${roleId}`, { question }).then(r => r.data),
  chat: (
    message: string,
    history: { role: string; content: string }[],
    image_base64?: string | null,
    focus_role_id?: string | null,
  ) =>
    api.post('/jarvis/chat', {
      message, history,
      ...(image_base64 ? { image_base64 } : {}),
      ...(focus_role_id ? { focus_role_id } : {}),
    }).then(r => r.data),
  chatRole: (
    roleId: string,
    message: string,
    history: { role: string; content: string }[],
    image_base64?: string | null,
  ) =>
    api.post(`/jarvis/chat/${roleId}`, {
      message, history,
      ...(image_base64 ? { image_base64 } : {}),
    }).then(r => r.data),
  injectMemory: (roleId: string, messages: { role: string; content: string; timestamp?: string }[]) =>
    api.post(`/jarvis/roles/${roleId}/memory`, { messages }).then(r => r.data),
  updateRole: (roleId: string, updates: Record<string, any>) =>
    api.patch(`/jarvis/roles/${roleId}`, { updates }).then(r => r.data),
  // Skills
  listSkills: () => api.get('/jarvis/skills').then(r => r.data),
  addSkill: (name: string, description: string, instructions: string) =>
    api.post('/jarvis/skills', { name, description, instructions }).then(r => r.data),
  toggleSkill: (skillId: string) =>
    api.patch(`/jarvis/skills/${skillId}/toggle`).then(r => r.data),
  deleteSkill: (skillId: string) =>
    api.delete(`/jarvis/skills/${skillId}`).then(r => r.data),
  // Jarvis own memories
  listMemories: () => api.get('/jarvis/memories').then(r => r.data),
  addMemory: (content: string) =>
    api.post('/jarvis/memories', { content }).then(r => r.data),
  deleteMemory: (id: string) =>
    api.delete(`/jarvis/memories/${id}`).then(r => r.data),
}

// User (self) profile
export const userApi = {
  getProfile: () => api.get('/user/profile').then(r => r.data),
  updateProfile: (data: any) => api.put('/user/profile', data).then(r => r.data),
  addMemory: (content: string, memoryType: 'core' | 'parallel', source: 'self' | 'jarvis' = 'self') =>
    api.post('/user/memories', { content, memory_type: memoryType, source }).then(r => r.data),
  deleteMemory: (id: string) => api.delete(`/user/memories/${id}`).then(r => r.data),
  listMemories: (type?: string) =>
    api.get('/user/memories', { params: type ? { type } : {} }).then(r => r.data),
}

// Settings
export const settingsApi = {
  get: () => api.get('/settings/').then(r => r.data),
  save: (data: any) => api.put('/settings/', data).then(r => r.data),
  getActive: () => api.get('/settings/active').then(r => r.data),
}

// Re-export ModelEntry type
export type { ModelEntry } from '../components/SettingsModal'
