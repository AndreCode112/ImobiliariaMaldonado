export interface LoginCredentials {
  username: string
  password: string
}

export interface TokenPair {
  access: string
  refresh: string
}

export interface AuthUser {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  is_superuser: boolean
  is_staff: boolean
}

export interface AuthSession extends TokenPair {
  user: AuthUser
}
