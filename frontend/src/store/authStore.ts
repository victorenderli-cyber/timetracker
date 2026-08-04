import { create } from 'zustand'
import { User } from '@/types'
import { authApi } from '@/api'
import { getToken, setToken, clearToken } from '@/utils/auth'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (userData: { email: string; full_name: string; password: string; role?: 'manager' | 'employee' }) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: getToken(),
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const data = await authApi.login(email, password)
    setToken(data.access_token)
    set({ token: data.access_token, isAuthenticated: true })
    const me = await authApi.me()
    set({ user: me })
  },

  register: async (userData) => {
    await authApi.register(userData)
    await get().login(userData.email, userData.password)
  },

  logout: () => {
    clearToken()
    set({ user: null, token: null, isAuthenticated: false })
  },

  fetchMe: async () => {
    try {
      const token = getToken()
      if (!token) {
        set({ isAuthenticated: false, isLoading: false })
        return
      }
      const me = await authApi.me()
      set({ user: me, isAuthenticated: true, isLoading: false })
    } catch (error) {
      clearToken()
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },
}))