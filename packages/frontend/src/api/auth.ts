import api from './client'

export const authApi = {
  login: async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password })
    // store the JWT token the backend sends back
    localStorage.setItem('aria_token', res.data.token)
    return res.data
  },

  logout: () => {
    localStorage.removeItem('aria_token')
    window.location.href = '/login'
  },

  me: async () => {
    const res = await api.get('/auth/me')
    return res.data
  },

  getUsers: async () => {
    const res = await api.get('/auth/users')
    return res.data.users
  },

  register: async (data: any) => {
    const res = await api.post('/auth/register', data)
    return res.data
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    const res = await api.patch('/auth/me', data)
    return res.data.user
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await api.patch('/auth/me/password', { currentPassword, newPassword })
    return res.data
  }
}