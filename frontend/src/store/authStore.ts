import type { AuthSession } from "@/types/auth"

const AUTH_STORAGE_KEY = "maldonado.auth"
export const AUTH_SESSION_CHANGED_EVENT = "maldonado.auth.changed"

function notifySessionChanged() {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGED_EVENT))
}

function readSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Partial<AuthSession>
    if (!session.access || !session.refresh || !session.user) {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      return null
    }
    return session as AuthSession
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function writeSession(session: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
  notifySessionChanged()
}

export const authStore = {
  getSession: readSession,
  setSession: writeSession,
  getAccessToken: () => readSession()?.access ?? null,
  getRefreshToken: () => readSession()?.refresh ?? null,
  isSuperuser: () => Boolean(readSession()?.user?.is_superuser),
  setAccessToken: (access: string) => {
    const session = readSession()
    if (session) writeSession({ ...session, access })
  },
  clear: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    notifySessionChanged()
  },
}
