import { Building2, Home, LayoutDashboard, LogOut, MapPin, PanelLeftClose, PanelLeftOpen, UserRound, Users } from "lucide-react"
import { useState } from "react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

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
  { to: "/admin/cidades", label: "Cidades", icon: MapPin },
]

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logoutPopoverOpen, setLogoutPopoverOpen] = useState(false)
  const { logout, session } = useAuth()
  const navigate = useNavigate()
  const username = session?.user?.username ?? "Admin"
  const userInitial = username[0]?.toUpperCase() ?? "A"

  return (
    <section className="flex min-h-svh bg-secondary">
        <aside
          className={cn(
            "hidden min-h-svh shrink-0 flex-col border-r bg-white transition-[width] duration-300 lg:flex",
            sidebarOpen ? "w-64" : "w-[76px]",
          )}
        >
          <div className={cn("flex h-[74px] items-center border-b px-4", sidebarOpen ? "justify-between" : "justify-center")}>
            <NavLink to="/" className={cn("flex min-w-0 items-center gap-2 text-sm font-semibold", !sidebarOpen && "sr-only")}>
              <Home className="size-4 shrink-0" />
              <span className="truncate">Maldonado Corretor</span>
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

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 md:px-6">
            <div className="flex gap-2 overflow-x-auto lg:hidden">
            {NAV.map(({ to, label, end }) => (
              <Button key={to} asChild variant="outline" className="rounded-full bg-white">
                <NavLink to={to} end={end}>{label}</NavLink>
              </Button>
            ))}
          </div>
            <div className="ml-auto">
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

          <main className="min-w-0 flex-1 overflow-auto p-0">
            <div className="p-5 md:p-6">
              <Outlet />
            </div>
          </main>
        </div>
    </section>
  )
}
