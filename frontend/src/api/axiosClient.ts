import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { authStore } from "@/store/authStore"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
})

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = authStore.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const refresh = authStore.getRefreshToken()
    if (!refresh) {
      authStore.clear()
      return Promise.reject(error)
    }

    originalRequest._retry = true
    refreshPromise ??= axios
      .post<{ access: string }>(`${API_BASE_URL || ""}/api/auth/refresh/`, { refresh })
      .then((response) => {
        authStore.setAccessToken(response.data.access)
        return response.data.access
      })
      .catch(() => {
        authStore.clear()
        return null
      })
      .finally(() => {
        refreshPromise = null
      })

    const token = await refreshPromise
    if (!token) {
      return Promise.reject(error)
    }

    originalRequest.headers.Authorization = `Bearer ${token}`
    return axiosClient(originalRequest)
  },
)

export { API_BASE_URL }
