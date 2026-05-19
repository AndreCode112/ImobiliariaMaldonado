import { Outlet, useLocation } from "react-router-dom"

import { Footer } from "@/components/layout/Footer"
import { PremiumHeader } from "@/components/layout/PremiumHeader"

export function AppLayout() {
  const location = useLocation()
  const hideFooter = location.pathname === "/" || location.pathname === "/imoveis"
  const headerOverContent = hideFooter

  return (
    <div className="min-h-svh bg-white text-foreground">
      <PremiumHeader />
      <main className={headerOverContent ? "" : "pt-[112px]"}>
        <Outlet />
      </main>
      {!hideFooter && <Footer />}
    </div>
  )
}
