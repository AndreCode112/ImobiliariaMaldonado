import { Route, Routes } from "react-router-dom"

import { ProtectedRoute } from "@/components/admin/ProtectedRoute"
import { AdminLayout } from "@/layouts/AdminLayout"
import { AppLayout } from "@/layouts/AppLayout"
import { AdminCidadesPage } from "@/pages/AdminCidadesPage"
import { AdminCorretoresPage } from "@/pages/AdminCorretoresPage"
import { AdminDashboardPage } from "@/pages/AdminDashboardPage"
import { AdminHomePage } from "@/pages/AdminHomePage"
import { AdminLoginPage } from "@/pages/AdminLoginPage"
import { AdminPropertyFormPage } from "@/pages/AdminPropertyFormPage"
import { ContactPage } from "@/pages/ContactPage"
import { FavoritesPage } from "@/pages/FavoritesPage"
import { PropertiesPage } from "@/pages/PropertiesPage"
import { PropertyDetailPage } from "@/pages/PropertyDetailPage"
import { RegisterPage } from "@/pages/RegisterPage"

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminHomePage />} />
          <Route path="imoveis" element={<AdminDashboardPage />} />
          <Route path="imoveis/novo" element={<AdminPropertyFormPage />} />
          <Route path="imoveis/:id/editar" element={<AdminPropertyFormPage />} />
          <Route path="corretores" element={<AdminCorretoresPage />} />
          <Route path="cidades" element={<AdminCidadesPage />} />
        </Route>
      </Route>

      <Route element={<AppLayout />}>
        <Route index element={<PropertiesPage />} />
        <Route path="imoveis" element={<PropertiesPage />} />
        <Route path="imoveis/:id" element={<PropertyDetailPage />} />
        <Route path="favoritos" element={<FavoritesPage />} />
        <Route path="contato" element={<ContactPage />} />
        <Route path="cadastro" element={<RegisterPage />} />
        <Route path="login" element={<AdminLoginPage />} />
      </Route>
    </Routes>
  )
}
