import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('founded_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(false)

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password })
    const { access_token, user: userData } = res.data
    localStorage.setItem('founded_token', access_token)
    localStorage.setItem('founded_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const register = async (name, email, password, role = 'STAFF') => {
    const res = await api.post('/api/auth/register', { name, email, password, role })
    const { access_token, user: userData } = res.data
    localStorage.setItem('founded_token', access_token)
    localStorage.setItem('founded_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('founded_token')
    localStorage.removeItem('founded_user')
    setUser(null)
  }

  const refreshUser = async () => {
    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data)
      localStorage.setItem('founded_user', JSON.stringify(res.data))
    } catch {
      logout()
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
