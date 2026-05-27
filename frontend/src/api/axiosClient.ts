import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"

import { authStore } from "@/store/authStore"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

let refreshPromise: Promise<boolean> | null = null

function isAuthRefreshRequest(url?: string) {
  return Boolean(url?.includes("/api/auth/refresh/"))
}

function isAuthEntryRequest(url?: string) {
  return Boolean(
    url?.includes("/api/auth/login/") ||
    url?.includes("/api/auth/register/") ||
    url?.includes("/api/auth/password-reset/confirm/"),
  )
}

axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    if (
      !originalRequest ||
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthRefreshRequest(originalRequest.url) ||
      isAuthEntryRequest(originalRequest.url)
    ) {
      return Promise.reject(error)
    }

    originalRequest._retry = true
    refreshPromise ??= axios
      .post(`${API_BASE_URL || ""}/api/auth/refresh/`, undefined, { withCredentials: true })
      .then((response) => {
        if (response.data?.user) authStore.setSession({ user: response.data.user })
        return true
      })
      .catch(() => {
        authStore.clear()
        return false
      })
      .finally(() => {
        refreshPromise = null
      })

    const refreshed = await refreshPromise
    if (!refreshed) {
      return Promise.reject(error)
    }

    return axiosClient(originalRequest)
  },
)

export { API_BASE_URL }
