import { axiosClient } from "@/api/axiosClient"
import { authStore } from "@/store/authStore"
import type { AuthSession, LoginCredentials } from "@/types/auth"

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const { data } = await axiosClient.post<AuthSession>("/api/auth/login/", credentials)
    authStore.setSession(data)
    return data
  },

  async register(payload: { username: string; password: string; email?: string }) {
    const { data } = await axiosClient.post("/api/auth/register/", payload)
    return data
  },

  logout() {
    authStore.clear()
  },
}
