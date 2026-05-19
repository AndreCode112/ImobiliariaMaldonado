import { Outlet, useLocation } from "react-router-dom"

import { PremiumHeader } from "@/components/layout/PremiumHeader"

export function AppLayout() {
  const location = useLocation()
  const isPropertyDetail = /^\/imoveis\/[^/]+\/?$/.test(location.pathname)
  const hideHeader = ["/login", "/cadastro", "/favoritos", "/contato"].includes(location.pathname) || isPropertyDetail
  const headerOverContent = location.pathname === "/" || location.pathname === "/imoveis"

  return (
    <div className="min-h-svh bg-white text-foreground">
      {!hideHeader ? <PremiumHeader /> : null}
      <main className={hideHeader || headerOverContent ? "" : "pt-[112px]"}>
        <Outlet />
      </main>
    </div>
  )
}
