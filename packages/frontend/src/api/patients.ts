import api from './client'
import type { Patient, HemodynamicVitals } from '@aria/shared'

export const patientsApi = {
  getAll: async (): Promise<Patient[]> => {
    const res = await api.get('/patients')
    return res.data
  },

  getById: async (id: string): Promise<Patient> => {
    const res = await api.get(`/patients/${id}`)
    return res.data
  },

  getVitals: async (id: string): Promise<HemodynamicVitals[]> => {
    const res = await api.get(`/patients/${id}/vitals`)
    return res.data
  },

  getRiskScore: async (id: string) => {
    const res = await api.get(`/patients/${id}/risk`)
    return res.data
  },
}