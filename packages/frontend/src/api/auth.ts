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
}