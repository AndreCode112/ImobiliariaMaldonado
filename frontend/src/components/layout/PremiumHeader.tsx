import { Building2, Heart, LoaderCircle, LogIn, LogOut, MapPin, Menu, Search, Shield, UserRound, X } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, NavLink, useNavigate } from "react-router-dom"

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
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/AuthContext"
import { useCorretores } from "@/hooks/useImoveis"
import { cn } from "@/lib/utils"
import { imoveisService } from "@/services/imoveisService"
import type { CorretorResumo, EnderecoResultado } from "@/types/imovel"

export function PremiumHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [search, setSearch] = useState("")
  const [addressResults, setAddressResults] = useState<EnderecoResultado[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false)
  const { isAuthenticated, isSuperuser, logout, session } = useAuth()
  const { data: corretores = [] } = useCorretores()
  const navigate = useNavigate()
  const activeCorretores = corretores.filter((corretor) => corretor.ativo !== false && normalizeWhatsappNumber(corretor.whatsapp || corretor.telefone))

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const query = search.trim()
    if (query.length < 3) {
      setAddressResults([])
      setHasSearchedAddress(false)
      setIsSearchingAddress(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearchingAddress(true)
      try {
        const results = await imoveisService.buscarEndereco(query, controller.signal)
        setAddressResults(results)
        setHasSearchedAddress(true)
      } catch (error) {
        if (!controller.signal.aborted) {
          setAddressResults([])
          setHasSearchedAddress(true)
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingAddress(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [search])

  function goToTextSearch() {
    const query = search.trim()
    if (!query) return
    setAddressResults([])
    setHasSearchedAddress(false)
    navigate(`/imoveis?busca=${encodeURIComponent(query)}&map=1`)
  }

  function selectAddress(address: EnderecoResultado) {
    const title = addressTitle(address)
    const params = new URLSearchParams({
      endereco: title,
      endereco_nome: address.display_name,
      endereco_lat: address.latitude,
      endereco_lng: address.longitude,
      map: "1",
    })
    setSearch(title)
    setAddressResults([])
    setHasSearchedAddress(false)
    navigate(`/imoveis?${params.toString()}`)
  }

  const showAddressResults = search.trim().length >= 3 && (addressResults.length > 0 || hasSearchedAddress || isSearchingAddress)

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[900] border-b border-transparent bg-white/92 transition-all duration-300",
        scrolled && "border-border/70 shadow-[0_10px_42px_rgba(0,0,0,0.05)] backdrop-blur-xl",
      )}
    >
      <div className="mx-auto flex h-[88px] max-w-[1520px] items-center gap-5 px-4 md:px-8">
        <Link to="/" className="flex min-w-fit items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-white shadow-[0_12px_28px_rgba(255,56,92,0.22)]">
            <Building2 className="size-5" />
          </span>
          <span className="hidden text-[17px] font-semibold tracking-tight text-foreground sm:block">Maldonado Corretor</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <HeaderLink to="/imoveis?map=1">Comprar imóveis</HeaderLink>
          <HeaderLink to="/imoveis?destaque=1&map=1">Imóveis em destaque</HeaderLink>
          <HeaderLink to="/favoritos">Favoritos</HeaderLink>
          <HeaderLink to="/contato">Contato</HeaderLink>
        </nav>

        <div className="relative hidden min-w-[300px] max-w-[390px] flex-1 md:block">
          <div className="flex h-12 items-center rounded-full border border-border/80 bg-white px-3 shadow-[0_12px_34px_rgba(15,23,42,0.07)] transition duration-200 focus-within:border-primary/35 focus-within:shadow-[0_16px_44px_rgba(15,23,42,0.11)] focus-within:ring-4 focus-within:ring-primary/8">
            <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-full border-0 bg-transparent px-2 text-[15px] shadow-none placeholder:text-muted-foreground/85 focus-visible:ring-0"
              placeholder="Busque por cidade ou bairro"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (addressResults[0]) {
                    selectAddress(addressResults[0])
                    return
                  }
                  goToTextSearch()
                }
                if (event.key === "Escape") {
                  setAddressResults([])
                  setHasSearchedAddress(false)
                }
              }}
            />
            {search && !isSearchingAddress ? (
              <button
                type="button"
                aria-label="Limpar busca"
                className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                onClick={() => {
                  setSearch("")
                  setAddressResults([])
                  setHasSearchedAddress(false)
                }}
              >
                <X className="size-3.5" />
              </button>
            ) : null}
            {isSearchingAddress ? <LoaderCircle className="mr-1 size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
          </div>
          {showAddressResults ? (
            <div className="absolute left-1/2 top-[calc(100%+10px)] z-[1001] w-[min(430px,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-3xl border border-border/80 bg-white/98 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
              <div className="border-b border-border/60 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase text-muted-foreground">Endereços encontrados</p>
              </div>
              <div className="max-h-[340px] overflow-y-auto py-1.5 [scrollbar-color:#c7c7c7_transparent] [scrollbar-width:thin]">
                {addressResults.map((address) => (
                  <button
                    key={address.place_id}
                    type="button"
                    className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/80 focus:bg-secondary focus:outline-none"
                    onClick={() => selectAddress(address)}
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-white group-hover:text-primary">
                      <MapPin className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-5 text-foreground">{addressTitle(address)}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{addressSubtitle(address)}</span>
                    </span>
                  </button>
                ))}
                {!isSearchingAddress && hasSearchedAddress && addressResults.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-muted-foreground">Nenhum endereço encontrado.</div>
                ) : null}
                {isSearchingAddress && addressResults.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                    <LoaderCircle className="size-4 animate-spin" />
                    Buscando endereços...
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button className="hidden rounded-full px-5 md:inline-flex">
              <WhatsappIcon className="size-4" />
              Fale conosco
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[1001] w-80 rounded-3xl p-0">
            <PopoverHeader>
              <PopoverTitle>Fale por WhatsApp</PopoverTitle>
              <PopoverDescription>Escolha um corretor para iniciar o atendimento.</PopoverDescription>
            </PopoverHeader>
            <div className="max-h-72 overflow-y-auto py-1 [scrollbar-color:#c7c7c7_transparent] [scrollbar-width:thin]">
              {activeCorretores.length ? activeCorretores.map((corretor) => (
                <a
                  key={corretor.id}
                  href={buildWhatsappLink(corretor)}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-secondary focus:bg-secondary focus:outline-none"
                >
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#25D366]/12 text-[#16a34a]">
                    {corretor.foto_url ? (
                      <img src={corretor.foto_url} alt={corretor.nome} className="size-full object-cover" />
                    ) : (
                      <WhatsappIcon className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">{corretor.nome}</span>
                    <span className="block truncate text-xs text-muted-foreground">{corretor.creci ? `CRECI ${corretor.creci}` : formatPhone(corretor.whatsapp || corretor.telefone)}</span>
                  </span>
                  <span className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white opacity-90 transition group-hover:opacity-100">Abrir</span>
                </a>
              )) : (
                <div className="m-2 rounded-2xl bg-secondary p-5 text-center">
                  <span className="mx-auto grid size-10 place-items-center rounded-full bg-white text-primary">
                    <WhatsappIcon className="size-5" />
                  </span>
                  <p className="mt-3 text-sm font-semibold">Nenhum contato disponível</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Cadastre o WhatsApp de um corretor ativo para exibir atendimento aqui.</p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-full px-3">
              <Menu className="size-4" />
              <UserRound className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[1000] w-56 rounded-2xl p-2">
            <DropdownMenuLabel>{session?.user?.username ?? "Configurações"}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {!isAuthenticated && (
              <DropdownMenuItem onClick={() => navigate("/login")}>
                <LogIn className="size-4" />
                Entrar
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => navigate("/favoritos")}>
              <Heart className="size-4" />
              Favoritos
            </DropdownMenuItem>
            {isSuperuser && (
              <DropdownMenuItem onClick={() => navigate("/admin")}>
                <Shield className="size-4" />
                Painel admin
              </DropdownMenuItem>
            )}
            {isAuthenticated && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <LogOut className="size-4" />
                  Sair
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent sideOffset={8} className="z-[1001] w-56 rounded-2xl p-2">
                  <div className="px-2 py-2">
                    <p className="text-sm font-semibold text-foreground">Deseja sair?</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Sua sessão será encerrada neste dispositivo.</p>
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
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

function addressTitle(address: EnderecoResultado) {
  const primary = address.address?.road || address.address?.pedestrian || address.display_name.split(",")[0] || ""
  const secondary = address.address?.suburb || address.address?.neighbourhood || address.address?.city || address.address?.town || ""
  const cleanPrimary = primary.trim()
  if (!cleanPrimary || cleanPrimary.toLowerCase() === "rua") {
    return address.display_name.split(",").slice(0, 2).map((part) => part.trim()).filter(Boolean).join(", ") || "Endereço"
  }
  if (secondary && !cleanPrimary.toLowerCase().includes(secondary.toLowerCase())) {
    return `${cleanPrimary}, ${secondary}`
  }
  return cleanPrimary
}

function addressSubtitle(address: EnderecoResultado) {
  const title = addressTitle(address)
  const parts = address.display_name.split(",").map((part) => part.trim()).filter(Boolean)
  return parts[0] === title ? parts.slice(1).join(", ") : address.display_name
}

function buildWhatsappLink(corretor: CorretorResumo) {
  const number = normalizeWhatsappNumber(corretor.whatsapp || corretor.telefone)
  const message = "Olá, gostaria de falar com um corretor da Maldonado Corretor."
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function normalizeWhatsappNumber(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? ""
  if (!digits) return ""
  if (digits.startsWith("55")) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function formatPhone(value?: string) {
  return value || "WhatsApp"
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.04 3.2A12.65 12.65 0 0 0 5.23 22.4L3.2 28.8l6.58-1.94A12.64 12.64 0 1 0 16.04 3.2Zm0 2.32a10.33 10.33 0 0 1 8.78 15.78 10.38 10.38 0 0 1-13.93 3.17l-.46-.27-3.81 1.12 1.17-3.69-.3-.48A10.34 10.34 0 0 1 16.04 5.52Zm-4.02 5.41c-.24 0-.62.09-.95.45-.33.36-1.24 1.21-1.24 2.95s1.27 3.42 1.44 3.66c.18.24 2.46 3.94 6.08 5.36 3.01 1.18 3.63.95 4.28.89.65-.06 2.11-.86 2.41-1.69.3-.83.3-1.54.21-1.69-.09-.15-.33-.24-.69-.42-.36-.18-2.11-1.04-2.44-1.16-.33-.12-.57-.18-.81.18-.24.36-.93 1.16-1.14 1.39-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.78-1.07-.96-1.8-2.14-2.01-2.5-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.8-1.98-1.12-2.7-.29-.69-.6-.7-.84-.71h-.59Z" />
    </svg>
  )
}

function HeaderLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {children}
    </NavLink>
  )
}
