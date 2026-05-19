import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { authService } from "@/services/authService"
import { AUTH_SESSION_CHANGED_EVENT, authStore } from "@/store/authStore"
import type { AuthSession, LoginCredentials } from "@/types/auth"

interface AuthContextValue {
  session: AuthSession | null
  isAuthenticated: boolean
  isSuperuser: boolean
  login: (credentials: LoginCredentials) => Promise<AuthSession>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => authStore.getSession())

  useEffect(() => {
    function syncSession() {
      setSession(authStore.getSession())
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession)
    window.addEventListener("storage", syncSession)

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncSession)
      window.removeEventListener("storage", syncSession)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.access),
      isSuperuser: Boolean(session?.user?.is_superuser),
      login: async (credentials) => {
        const nextSession = await authService.login(credentials)
        setSession(nextSession)
        return nextSession
      },
      logout: () => {
        authService.logout()
        setSession(null)
      },
    }),
    [session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth precisa ser usado dentro de AuthProvider")
  }
  return context
}
