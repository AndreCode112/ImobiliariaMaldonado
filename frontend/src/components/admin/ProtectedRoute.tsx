import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/contexts/AuthContext"

export function ProtectedRoute() {
  const { isAuthenticated, isSuperuser } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isSuperuser) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
