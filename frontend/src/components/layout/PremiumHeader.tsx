import { AnimatePresence, motion } from "framer-motion"
import { Building2, Heart, LoaderCircle, LogIn, LogOut, MapPin, MessageCircle, Search, Shield, UserPlus, UserRound, X } from "lucide-react"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { useAuth } from "@/contexts/AuthContext"
import { useCorretores } from "@/hooks/useImoveis"
import { cn } from "@/lib/utils"
import { imoveisService } from "@/services/imoveisService"
import type { CorretorResumo, EnderecoResultado } from "@/types/imovel"

const LOGO_SRC = "/media/logo/logo-header.png"
const HEADER_VISIBILITY_EVENT = "maldonado:premium-header-visibility"
const SCROLL_TO_MAP_EVENT = "maldonado:scroll-to-map"

export function PremiumHeader() {
  const [visible, setVisible] = useState(true)
  const [search, setSearch] = useState("")
  const [addressResults, setAddressResults] = useState<EnderecoResultado[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const { data: corretores = [] } = useCorretores()
  const navigate = useNavigate()
  const location = useLocation()
  const activeCorretores = corretores.filter((corretor) => corretor.ativo !== false && normalizeWhatsappNumber(corretor.whatsapp || corretor.telefone))

  useEffect(() => {
    const onVisibilityChange = (event: Event) => {
      const detail = (event as CustomEvent<{ visible?: boolean }>).detail
      setVisible(detail?.visible !== false)
    }

    window.addEventListener(HEADER_VISIBILITY_EVENT, onVisibilityChange)
    return () => window.removeEventListener(HEADER_VISIBILITY_EVENT, onVisibilityChange)
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

  function goToMap() {
    setMobileSearchOpen(false)
    const isPropertiesRoute = location.pathname === "/" || location.pathname === "/imoveis"
    if (!isPropertiesRoute) {
      navigate("/imoveis?map=1")
      return
    }

    const params = new URLSearchParams(location.search)
    if (params.get("map") !== "1") {
      params.set("map", "1")
      navigate(`${location.pathname}?${params.toString()}`)
    }

    window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event(SCROLL_TO_MAP_EVENT))
    })
  }

  function goToTextSearch() {
    const query = search.trim()
    if (!query) return
    setAddressResults([])
    setHasSearchedAddress(false)
    setMobileSearchOpen(false)
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
    setMobileSearchOpen(false)
    navigate(`/imoveis?${params.toString()}`)
  }

  const showAddressResults = search.trim().length >= 3 && (addressResults.length > 0 || hasSearchedAddress || isSearchingAddress)

  return (
    <>
      <header
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-[900] bg-transparent px-3 transition-all duration-500 ease-out md:px-8 xl:px-14",
          visible ? "translate-y-0 opacity-100 blur-0" : "-translate-y-[calc(100%+24px)] opacity-0 blur-[6px]",
        )}
      >
        <div className="pointer-events-auto mx-auto mt-3 flex h-16 max-w-[calc(100vw-1rem)] items-center gap-2 rounded-[20px] border border-white/60 bg-white/84 px-3 shadow-[0_18px_60px_rgba(15,23,42,0.12)] backdrop-blur-2xl sm:max-w-[calc(100vw-2rem)] sm:px-4 md:mt-5 md:h-[76px] md:gap-5 md:px-8 xl:max-w-[calc(100vw-7rem)] xl:px-12">
          <Link to="/" className="flex min-w-0 shrink items-center">
            <img src={LOGO_SRC} alt="Maldonado Imóveis" className="h-10 w-[136px] object-contain sm:w-[168px] md:h-[54px] md:w-[224px]" />
          </Link>

          <div className="ml-auto flex items-center gap-2 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="inline-flex size-10 rounded-full border-border/80 bg-white/72 px-0 shadow-none hover:bg-white"
              onClick={() => setMobileSearchOpen(true)}
              aria-label="Buscar imóveis"
            >
              <Search className="size-4" />
            </Button>
            <AccountMenuButton
              includeNavigation
              wrapperClassName="block"
              className="inline-flex size-10 border-border/80 bg-white/72 shadow-none hover:bg-white"
              menuClassName="right-0 w-[min(260px,calc(100vw-2rem))]"
            />
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-3 xl:flex">
            <HeaderAction onClick={goToMap}>Imóveis</HeaderAction>
            <HeaderLink to="/favoritos">Favoritos</HeaderLink>
            <HeaderLink to="/contato">Contato</HeaderLink>
          </nav>

        <div className="relative ml-auto hidden w-[min(345px,24vw)] min-w-[270px] flex-none lg:block">
          <div className="flex h-11 items-center rounded-full border border-border/60 bg-white/88 px-3 shadow-[0_8px_24px_rgba(15,23,42,0.07)] transition duration-200 focus-within:border-primary/35 focus-within:bg-white focus-within:shadow-[0_14px_36px_rgba(15,23,42,0.1)] focus-within:ring-4 focus-within:ring-primary/8">
            <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-full border-0 bg-transparent px-2 text-[15px] shadow-none placeholder:text-muted-foreground/82 focus-visible:ring-0"
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
            <Button className="hidden h-10 rounded-full px-4 text-sm shadow-[0_10px_24px_rgba(255,56,92,0.18)] lg:inline-flex">
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

          <AccountMenuButton />
        </div>
      </header>
      <MobileSearchDialog
        open={mobileSearchOpen}
        onOpenChange={setMobileSearchOpen}
        value={search}
        onChange={setSearch}
        results={addressResults}
        isSearching={isSearchingAddress}
        hasSearched={hasSearchedAddress}
        onClear={() => {
          setSearch("")
          setAddressResults([])
          setHasSearchedAddress(false)
        }}
        onSubmit={() => {
          if (addressResults[0]) {
            selectAddress(addressResults[0])
            return
          }
          goToTextSearch()
        }}
        onSelectAddress={selectAddress}
      />
    </>
  )
}

export function AccountMenuButton({
  className,
  menuClassName,
  wrapperClassName,
  includeNavigation = false,
}: {
  className?: string
  menuClassName?: string
  wrapperClassName?: string
  includeNavigation?: boolean
}) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { isAuthenticated, isSuperuser, logout } = useAuth()
  const navigate = useNavigate()
  const accountRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!accountOpen) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false)
        setConfirmLogout(false)
      }
    }

    window.addEventListener("pointerdown", closeOnOutsideClick)
    return () => window.removeEventListener("pointerdown", closeOnOutsideClick)
  }, [accountOpen])

  return (
    <div ref={accountRef} className={cn("relative hidden lg:block", wrapperClassName)}>
      <Button
        variant="outline"
        className={cn("hidden size-11 rounded-full border-border/80 bg-white/72 px-0 shadow-none hover:bg-white lg:inline-flex", className)}
        onClick={() => {
          setAccountOpen((open) => !open)
          setConfirmLogout(false)
        }}
        aria-label="Minha conta"
      >
        <UserRound className="size-4" />
      </Button>
      <AnimatePresence>
        {accountOpen ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8, scale: 0.96, filter: "blur(6px)" }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={cn("absolute right-0 top-[calc(100%+12px)] z-[1001] w-56 origin-top-right overflow-hidden rounded-[20px] border border-border/70 bg-white/95 p-2 shadow-[0_24px_70px_rgba(15,23,42,0.16)] backdrop-blur-xl", menuClassName)}
          >
            <AnimatePresence mode="wait" initial={false}>
              {confirmLogout ? (
                <motion.div
                  key="confirm-logout"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="p-1"
                >
                  <div className="px-2 py-2">
                    <p className="text-sm font-semibold text-foreground">Deseja sair?</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Sua sessão será encerrada neste dispositivo.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      type="button"
                      className="h-9 rounded-full border border-border bg-white text-sm font-medium text-foreground transition hover:bg-secondary"
                      onClick={() => setConfirmLogout(false)}
                    >
                      Não
                    </button>
                    <button
                      type="button"
                      className="h-9 rounded-full bg-primary text-sm font-medium text-white transition hover:bg-primary/90"
                      onClick={() => {
                        setConfirmLogout(false)
                        setAccountOpen(false)
                        logout()
                        navigate("/")
                      }}
                    >
                      Sim
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  {includeNavigation ? (
                    <>
                      <AccountMenuItem icon={Building2} onClick={() => {
                        setAccountOpen(false)
                        navigate("/imoveis?map=1")
                        window.requestAnimationFrame(() => window.dispatchEvent(new Event(SCROLL_TO_MAP_EVENT)))
                      }}>
                        Imóveis
                      </AccountMenuItem>
                      <AccountMenuItem icon={MessageCircle} onClick={() => {
                        setAccountOpen(false)
                        navigate("/contato")
                      }}>
                        Contato
                      </AccountMenuItem>
                    </>
                  ) : null}
                  {!isAuthenticated ? (
                    <>
                      <AccountMenuItem icon={LogIn} onClick={() => {
                        setAccountOpen(false)
                        navigate("/login")
                      }}>
                        Entrar
                      </AccountMenuItem>
                      <AccountMenuItem icon={UserPlus} onClick={() => {
                        setAccountOpen(false)
                        navigate("/cadastro")
                      }}>
                        Registrar
                      </AccountMenuItem>
                    </>
                  ) : null}
                  <AccountMenuItem icon={Heart} onClick={() => {
                    setAccountOpen(false)
                    navigate("/favoritos")
                  }}>
                    Favoritos
                  </AccountMenuItem>
                  {isSuperuser ? (
                    <AccountMenuItem icon={Shield} onClick={() => {
                      setAccountOpen(false)
                      navigate("/admin")
                    }}>
                      Painel admin
                    </AccountMenuItem>
                  ) : null}
                  {isAuthenticated ? (
                    <AccountMenuItem icon={LogOut} onClick={() => setConfirmLogout(true)}>
                      Sair
                    </AccountMenuItem>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function MobileSearchDialog({
  open,
  onOpenChange,
  value,
  onChange,
  results,
  isSearching,
  hasSearched,
  onClear,
  onSubmit,
  onSelectAddress,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onChange: (value: string) => void
  results: EnderecoResultado[]
  isSearching: boolean
  hasSearched: boolean
  onClear: () => void
  onSubmit: () => void
  onSelectAddress: (address: EnderecoResultado) => void
}) {
  const showResults = value.trim().length >= 3 && (results.length > 0 || hasSearched || isSearching)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 left-0 top-auto max-h-[86dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-[28px] p-0 lg:hidden">
        <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
          <DialogTitle>Buscar imóveis</DialogTitle>
          <DialogDescription>Pesquise por endereço, bairro ou cidade.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-5">
          <div className="flex h-12 items-center rounded-full border border-border/70 bg-white px-3 shadow-[0_10px_28px_rgba(0,0,0,0.08)] focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
            <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              className="h-full border-0 bg-transparent px-2 text-base shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
              placeholder="Cidade, bairro ou endereço"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmit()
                if (event.key === "Escape") onClear()
              }}
            />
            {value && !isSearching ? (
              <button type="button" className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={onClear} aria-label="Limpar busca">
                <X className="size-4" />
              </button>
            ) : null}
            {isSearching ? <LoaderCircle className="mr-1 size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
          </div>
          <Button type="button" className="h-12 w-full rounded-full" onClick={onSubmit} disabled={!value.trim()}>
            Buscar no mapa
          </Button>
          {showResults ? (
            <div className="premium-scrollbar max-h-[42dvh] overflow-y-auto rounded-[20px] border border-border/80 bg-white">
              {results.map((address) => (
                <button
                  key={address.place_id}
                  type="button"
                  className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/80 focus:bg-secondary focus:outline-none"
                  onClick={() => onSelectAddress(address)}
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
              {!isSearching && hasSearched && results.length === 0 ? <div className="px-4 py-5 text-sm text-muted-foreground">Nenhum endereço encontrado.</div> : null}
              {isSearching && results.length === 0 ? (
                <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                  <LoaderCircle className="size-4 animate-spin" />
                  Buscando endereços...
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
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

function AccountMenuItem({ icon: Icon, onClick, children }: { icon: typeof Heart; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-sm font-medium text-foreground transition hover:bg-secondary focus:bg-secondary focus:outline-none"
      onClick={onClick}
    >
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </button>
  )
}

function HeaderAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-full px-3.5 py-2 text-[15px] font-medium text-foreground/78 transition hover:bg-white/70 hover:text-foreground"
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function HeaderLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-full px-3.5 py-2 text-[15px] font-medium text-foreground/78 transition hover:bg-white/70 hover:text-foreground",
          isActive && "text-foreground",
        )
      }
    >
      {children}
    </NavLink>
  )
}
