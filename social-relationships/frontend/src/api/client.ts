// API client - connects to FastAPI backend
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({ baseURL: BASE_URL })

// Roles
export const rolesApi = {
  list: () => api.get('/roles/').then(r => r.data),
  get: (id: string) => api.get(`/roles/${id}`).then(r => r.data),
  create: (data: any) => api.post('/roles/', data).then(r => r.data),
  delete: (id: string) => api.delete(`/roles/${id}`).then(r => r.data),
  importHistory: (id: string, messages: any[]) =>
    api.post(`/roles/${id}/import-history`, { messages }).then(r => r.data),
}

// Chat
export const chatApi = {
  send: (roleId: string, message: string, branchId?: string) =>
    api.post(`/chat/${roleId}`, { message, branch_id: branchId }).then(r => r.data),
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
}

// WebSocket chat
export const createChatWS = (roleId: string, onMessage: (reply: string) => void) => {
  const wsUrl = `${BASE_URL.replace('http', 'ws')}/chat/${roleId}/ws`
  const ws = new WebSocket(wsUrl)
  ws.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'done') onMessage(data.content)
  }
  return ws
}
