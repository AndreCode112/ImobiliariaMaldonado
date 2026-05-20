import { Suspense, lazy, type ComponentType } from "react"
import { Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import { TermsConsentModal } from "@/components/legal/TermsConsentModal"

function lazyNamed<T extends ComponentType<object>>(loader: () => Promise<Record<string, T>>, name: string) {
  return lazy(() => loader().then((mod) => ({ default: mod[name] })))
}

const AdminLayout = lazyNamed(() => import("@/layouts/AdminLayout"), "AdminLayout")
const AppLayout = lazyNamed(() => import("@/layouts/AppLayout"), "AppLayout")
const AdminCidadesPage = lazyNamed(() => import("@/pages/AdminCidadesPage"), "AdminCidadesPage")
const AdminCorretoresPage = lazyNamed(() => import("@/pages/AdminCorretoresPage"), "AdminCorretoresPage")
const AdminDashboardPage = lazyNamed(() => import("@/pages/AdminDashboardPage"), "AdminDashboardPage")
const AdminHomePage = lazyNamed(() => import("@/pages/AdminHomePage"), "AdminHomePage")
const AdminLembretesPage = lazyNamed(() => import("@/pages/AdminLembretesPage"), "AdminLembretesPage")
const AdminLoginPage = lazyNamed(() => import("@/pages/AdminLoginPage"), "AdminLoginPage")
const AdminLogsPage = lazyNamed(() => import("@/pages/AdminLogsPage"), "AdminLogsPage")
const AdminPropertyFormPage = lazyNamed(() => import("@/pages/AdminPropertyFormPage"), "AdminPropertyFormPage")
const AdminUsuariosPage = lazyNamed(() => import("@/pages/AdminUsuariosPage"), "AdminUsuariosPage")
const ContactPage = lazyNamed(() => import("@/pages/ContactPage"), "ContactPage")
const FavoritesPage = lazyNamed(() => import("@/pages/FavoritesPage"), "FavoritesPage")
const PropertiesPage = lazyNamed(() => import("@/pages/PropertiesPage"), "PropertiesPage")
const PropertyDetailPage = lazyNamed(() => import("@/pages/PropertyDetailPage"), "PropertyDetailPage")
const RegisterPage = lazyNamed(() => import("@/pages/RegisterPage"), "RegisterPage")
const ResetPasswordPage = lazyNamed(() => import("@/pages/ResetPasswordPage"), "ResetPasswordPage")

function RouteFallback() {
  return <div className="min-h-svh bg-white" />
}

export default function App() {
  return (
    <>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminHomePage />} />
              <Route path="imoveis" element={<AdminDashboardPage />} />
              <Route path="imoveis/novo" element={<AdminPropertyFormPage />} />
              <Route path="imoveis/:id/editar" element={<AdminPropertyFormPage />} />
              <Route path="corretores" element={<AdminCorretoresPage />} />
              <Route path="usuarios" element={<AdminUsuariosPage />} />
              <Route path="cidades" element={<AdminCidadesPage />} />
              <Route path="lembretes" element={<AdminLembretesPage />} />
              <Route path="logs" element={<AdminLogsPage />} />
            </Route>
          </Route>

          <Route element={<AppLayout />}>
            <Route index element={<PropertiesPage />} />
            <Route path="imoveis" element={<PropertiesPage />} />
            <Route path="imoveis/:uuid" element={<PropertyDetailPage />} />
            <Route path="favoritos" element={<FavoritesPage />} />
            <Route path="contato" element={<ContactPage />} />
            <Route path="cadastro" element={<RegisterPage />} />
            <Route path="login" element={<AdminLoginPage />} />
            <Route path="resetar-senha/:uid/:token" element={<ResetPasswordPage />} />
          </Route>
        </Routes>
      </Suspense>
      <TermsConsentModal />
    </>
  )
}
