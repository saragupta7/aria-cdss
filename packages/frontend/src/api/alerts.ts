import api from './client'
import type { Alert } from '@aria/shared'

export const alertsApi = {
  // status: 'active' (default) | 'resolved' | 'acknowledged' | 'all'
  getAll: async (status?: string): Promise<Alert[]> => {
    const res = await api.get('/alerts', { params: status ? { status } : undefined })
    return res.data.alerts
  },

  getByPatient: async (patientId: string): Promise<Alert[]> => {
    const res = await api.get('/alerts', { params: { patient: patientId, status: 'all' } })
    return res.data.alerts
  },

  // Full history including resolved — used by analytics / audit views
  getAudit: async (): Promise<Alert[]> => {
    const res = await api.get('/alerts/audit')
    return res.data.alerts
  },

  acknowledge: async (id: string): Promise<Alert> => {
    const res = await api.patch(`/alerts/${id}/acknowledge`)
    return res.data.alert
  },

  resolve: async (id: string): Promise<Alert> => {
    const res = await api.patch(`/alerts/${id}/resolve`)
    return res.data.alert
  },
}
