import api from './client'

export interface AdminStats {
  stats: {
    totalPatients: number
    criticalPatients: number
    activeAlerts: number
    totalUsers: number
  }
  recentActivity: AuditLogEntry[]
}

export interface AuditLogEntry {
  _id: string
  user?: { _id: string; name: string; email?: string; role: string } | null
  action: string
  resource?: string
  resourceId?: string | null
  details?: Record<string, any>
  ipAddress?: string
  timestamp: string
}

export const adminApi = {
  getStats: async (): Promise<AdminStats> => {
    const res = await api.get('/admin/stats')
    return res.data
  },

  getAuditLogs: async (): Promise<AuditLogEntry[]> => {
    const res = await api.get('/admin/audit-logs')
    return res.data.logs
  },
}
