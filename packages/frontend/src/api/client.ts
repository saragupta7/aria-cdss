//The api/client.ts file is a single configured "messenger" that all your components share. 
// Instead of every component knowing the backend's URL, auth token, etc., they all just call this one messenger. 


import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// REQUEST interceptor — attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aria_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// RESPONSE interceptor — if token expired, send doctor back to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('aria_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api