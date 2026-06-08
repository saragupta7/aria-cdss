import api from './client'
import type { Alert } from '@aria/shared'

export const alertsApi = {
  getAll: async (): Promise<Alert[]> => {
    const res = await api.get('/alerts')
    return res.data
  },

  resolve: async (id: string): Promise<Alert> => {
    const res = await api.patch(`/alerts/${id}/resolve`)
    return res.data
  },
}