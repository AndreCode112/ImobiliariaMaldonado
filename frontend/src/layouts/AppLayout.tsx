import { Outlet, useLocation } from "react-router-dom"

import { Footer } from "@/components/layout/Footer"
import { PremiumHeader } from "@/components/layout/PremiumHeader"

export function AppLayout() {
  const location = useLocation()
  const hideFooter = location.pathname === "/" || location.pathname === "/imoveis"

  return (
    <div className="min-h-svh bg-white text-foreground">
      <PremiumHeader />
      <main className="pt-[88px]">
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}
