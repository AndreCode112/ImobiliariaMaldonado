import { BellRing, Building2, FileWarning, Home, LayoutDashboard, LogOut, MapPin, MoreVertical, PanelLeftClose, PanelLeftOpen, UserRound, Users } from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/imoveis", label: "Imóveis", icon: Building2 },
  { to: "/admin/corretores", label: "Corretores", icon: Users },
  { to: "/admin/usuarios", label: "Usuários", icon: UserRound },
  { to: "/admin/cidades", label: "Cidades", icon: MapPin },
  { to: "/admin/lembretes", label: "Lembretes", icon: BellRing },
  { to: "/admin/logs", label: "Logs", icon: FileWarning },
]
const LOGO_SRC = "/media/logo/logo-header.png"

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logoutPopoverOpen, setLogoutPopoverOpen] = useState(false)
  const { logout, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const username = session?.user?.username ?? "Admin"
  const userInitial = username[0]?.toUpperCase() ?? "A"
  const activeNav = NAV.find((item) => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) ?? NAV[0]
  const logsRoute = location.pathname.startsWith("/admin/logs")

  return (
    <section className="flex h-svh min-w-0 overflow-hidden bg-secondary">
        <aside
          className={cn(
            "hidden h-svh shrink-0 flex-col border-r bg-white transition-[width] duration-300 lg:flex",
            sidebarOpen ? "w-64" : "w-[76px]",
          )}
        >
          <div className={cn("flex h-[74px] items-center border-b px-4", sidebarOpen ? "justify-between" : "justify-center")}>
            <NavLink to="/" className={cn("flex min-w-0 items-center", !sidebarOpen && "sr-only")}>
              <img src={LOGO_SRC} alt="Maldonado Imóveis" className="h-12 w-40 object-contain" />
            </NavLink>
            <Button variant="ghost" size="icon" className="size-10 shrink-0 rounded-full" onClick={() => setSidebarOpen((open) => !open)}>
              {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
          </div>

          <nav className="flex-1 space-y-1 p-3">
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                title={!sidebarOpen ? label : undefined}
                className={({ isActive }) =>
                  cn(
                    "flex h-11 w-full items-center rounded-full text-sm font-medium transition",
                    sidebarOpen ? "justify-start gap-3 px-4" : "justify-center px-0",
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className={cn("truncate", !sidebarOpen && "sr-only")}>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t p-3">
            <Popover open={logoutPopoverOpen} onOpenChange={setLogoutPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-11 w-full items-center rounded-full text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
                    sidebarOpen ? "justify-start gap-3 px-4" : "justify-center px-0",
                  )}
                >
                  <LogOut className="size-4 shrink-0" />
                  <span className={cn("truncate", !sidebarOpen && "sr-only")}>Sair</span>
                </button>
              </PopoverTrigger>
              <PopoverContent side="right" align="end" className="z-[9021] w-64 rounded-3xl p-3">
                <div className="px-2 py-1">
                  <p className="text-sm font-semibold text-foreground">Deseja sair?</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Sua sessão do painel será encerrada.</p>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setLogoutPopoverOpen(false)}>Não</Button>
                  <Button
                    className="rounded-full"
                    onClick={() => {
                      setLogoutPopoverOpen(false)
                      logout()
                      navigate("/")
                    }}
                  >
                    Sim
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b bg-white px-3 sm:px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-11 shrink-0 rounded-full bg-white" aria-label="Abrir menu do painel">
                    <MoreVertical className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[9020] w-64 rounded-2xl p-2">
                  <DropdownMenuLabel>Navegação</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {NAV.map(({ to, label, icon: Icon, end }) => {
                    const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
                    return (
                      <DropdownMenuItem
                        key={to}
                        className={cn("rounded-xl", isActive && "bg-primary text-primary-foreground focus:bg-primary focus:text-primary-foreground")}
                        onClick={() => navigate(to)}
                      >
                        <Icon className="size-4" />
                        {label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{activeNav.label}</p>
                <p className="truncate text-xs text-muted-foreground">Painel administrativo</p>
              </div>
            </div>
            <div className="ml-auto shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center gap-2 rounded-full border bg-white p-1 pr-3 text-sm font-medium shadow-sm transition hover:bg-secondary">
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">{userInitial}</AvatarFallback>
                    </Avatar>
                    <UserRound className="size-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[9020] w-56 rounded-2xl p-2">
                  <DropdownMenuLabel>{username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/")}>
                    <Home className="size-4" />
                    Ver site
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <LogOut className="size-4" />
                      Sair
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent sideOffset={8} className="z-[9021] w-56 rounded-2xl p-2">
                      <div className="px-2 py-2">
                        <p className="text-sm font-semibold text-foreground">Deseja sair?</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Sua sessão será encerrada.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-1">
                        <DropdownMenuItem className="justify-center rounded-full border bg-white text-center">Não</DropdownMenuItem>
                        <DropdownMenuItem
                          className="justify-center rounded-full bg-primary text-center text-primary-foreground focus:bg-primary focus:text-primary-foreground"
                          onClick={() => {
                            logout()
                            navigate("/")
                          }}
                        >
                          Sim
                        </DropdownMenuItem>
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className={cn("min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain p-0 premium-scrollbar", logsRoute ? "overflow-hidden" : "overflow-y-auto")}>
            <div className={cn("min-w-0 px-3 py-4 sm:p-4 md:p-6", logsRoute ? "h-full overflow-hidden" : "min-h-full")}>
              <Outlet />
            </div>
          </main>
        </div>
    </section>
  )
}
