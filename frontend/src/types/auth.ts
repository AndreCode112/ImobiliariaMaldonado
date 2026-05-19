export interface LoginCredentials {
  email: string
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

export interface AdminUser extends AuthUser {
  is_active: boolean
  date_joined?: string | null
  last_login?: string | null
}

export interface AdminUserPayload {
  username: string
  email?: string
  first_name?: string
  last_name?: string
  is_active: boolean
  is_staff: boolean
  is_superuser: boolean
}

export interface PasswordResetLink {
  uid: string
  token: string
  reset_url: string
  message: string
}
