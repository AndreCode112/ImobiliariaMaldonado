import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { AccountMenuButton } from "@/components/layout/PremiumHeader"
import { PropertiesMap } from "@/components/map/PropertiesMap"
import { PropertiesSidebar } from "@/components/properties/PropertiesSidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { defaultFilters, filterImoveis } from "@/features/filters/filterImoveis"
import { useImoveis } from "@/hooks/useImoveis"
import { imoveisService } from "@/services/imoveisService"
import type { EnderecoResultado, Imovel, ImoveisFilters } from "@/types/imovel"

const HEADER_VISIBILITY_EVENT = "maldonado:premium-header-visibility"
const SCROLL_TO_MAP_EVENT = "maldonado:scroll-to-map"

export function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const buscaParam = searchParams.get("busca") ?? ""
  const destaqueParam = searchParams.get("destaque")
  const mapParam = searchParams.get("map")
  const { data: imoveis = [], isLoading } = useImoveis()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [selected, setSelected] = useState<Imovel | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [showPointsOfInterest, setShowPointsOfInterest] = useState(true)
  const [mapSearch, setMapSearch] = useState(buscaParam)
  const [addressResults, setAddressResults] = useState<EnderecoResultado[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [mapInteractive, setMapInteractive] = useState(false)
  const transitionRef = useRef<HTMLDivElement | null>(null)
  const autoScrollRef = useRef(false)
  const { scrollYProgress } = useScroll({
    target: transitionRef,
    offset: ["start start", "end end"],
  })
  const heroScale = useTransform(scrollYProgress, [0, 0.72], [1, 0.96])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0.24])
  const heroBlur = useTransform(scrollYProgress, [0, 0.72], ["blur(0px)", "blur(6px)"])
  const mapY = useTransform(scrollYProgress, [0, 0.82], ["100vh", "0vh"])
  const mapRadius = useTransform(scrollYProgress, [0.18, 0.82], [36, 0])
  const mapShadow = useTransform(
    scrollYProgress,
    [0.18, 0.82],
    ["0 -28px 90px rgba(0,0,0,0.22)", "0 0 0 rgba(0,0,0,0)"],
  )
  const [filters, setFilters] = useState<ImoveisFilters>({
    ...defaultFilters,
    search: buscaParam,
  })

  const filtered = useMemo(() => {
    const onlyFeatured = destaqueParam === "1"
    const base = onlyFeatured ? imoveis.filter((imovel) => imovel.isFeatured) : imoveis
    return filterImoveis(base, filters)
  }, [destaqueParam, filters, imoveis])

  const selectedAddress = useMemo<EnderecoResultado | null>(() => {
    const latitude = searchParams.get("endereco_lat")
    const longitude = searchParams.get("endereco_lng")
    if (!latitude || !longitude) return null
    return {
      display_name: searchParams.get("endereco_nome") || searchParams.get("endereco") || "Endereço selecionado",
      latitude,
      longitude,
      place_id: 0,
      address: { road: searchParams.get("endereco") || "" },
    }
  }, [searchParams])

  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(Boolean).length + (selectedAddress ? 1 : 0) + (destaqueParam === "1" ? 1 : 0)
  }, [destaqueParam, filters, selectedAddress])

  function selectAddress(address: EnderecoResultado) {
    const title = addressTitle(address)
    const params = new URLSearchParams(searchParams)
    params.set("endereco", title)
    params.set("endereco_nome", address.display_name)
    params.set("endereco_lat", address.latitude)
    params.set("endereco_lng", address.longitude)
    params.set("map", "1")
    setMapSearch(title)
    setAddressResults([])
    setHasSearchedAddress(false)
    setSearchParams(params)
  }

  function submitMapSearch() {
    const query = mapSearch.trim()
    if (!query) return
    if (addressResults[0]) {
      selectAddress(addressResults[0])
      return
    }
    setFilters((current) => ({ ...current, search: query }))
    setSearchParams((params) => {
      params.set("busca", query)
      params.set("map", "1")
      return params
    })
  }

  function clearMapSearch() {
    setMapSearch("")
    setAddressResults([])
    setHasSearchedAddress(false)
    setFilters((current) => ({ ...current, search: "" }))
    setSearchParams((params) => {
      params.delete("busca")
      params.delete("endereco")
      params.delete("endereco_nome")
      params.delete("endereco_lat")
      params.delete("endereco_lng")
      params.set("map", "1")
      return params
    })
  }

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const mapRegionActive = value > 0.74
    setControlsVisible(mapRegionActive)
    setMapInteractive(value > 0.82)
    window.dispatchEvent(new CustomEvent(HEADER_VISIBILITY_EVENT, { detail: { visible: !mapRegionActive } }))
  })

  const scrollToMap = useCallback(() => {
    const transition = transitionRef.current
    if (!transition) return
    const top = transition.offsetTop + transition.offsetHeight * 0.82
    window.scrollTo({ top, behavior: "smooth" })
    setSearchParams((params) => {
      params.set("map", "1")
      return params
    })
  }, [setSearchParams])

  useEffect(() => {
    window.addEventListener(SCROLL_TO_MAP_EVENT, scrollToMap)
    return () => window.removeEventListener(SCROLL_TO_MAP_EVENT, scrollToMap)
  }, [scrollToMap])

  useEffect(() => {
    if (mapParam !== "1") return
    const timeout = window.setTimeout(scrollToMap, 120)
    return () => window.clearTimeout(timeout)
  }, [mapParam, scrollToMap])

  useEffect(() => {
    setFilters((current) => current.search === buscaParam ? current : { ...current, search: buscaParam })
    setMapSearch((current) => current === buscaParam ? current : buscaParam)
  }, [buscaParam])

  useEffect(() => {
    const query = mapSearch.trim()
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
      } catch {
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
  }, [mapSearch])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const syncSidebar = () => {
      setIsMobileLayout(media.matches)
      if (media.matches) setSidebarOpen(false)
    }
    syncSidebar()
    media.addEventListener("change", syncSidebar)
    return () => media.removeEventListener("change", syncSidebar)
  }, [])

  useEffect(() => {
    const syncHeaderVisibility = () => {
      window.dispatchEvent(new CustomEvent(HEADER_VISIBILITY_EVENT, { detail: { visible: scrollYProgress.get() <= 0.74 } }))
    }

    syncHeaderVisibility()
    const frame = window.requestAnimationFrame(syncHeaderVisibility)

    return () => {
      window.cancelAnimationFrame(frame)
      window.dispatchEvent(new CustomEvent(HEADER_VISIBILITY_EVENT, { detail: { visible: true } }))
    }
  }, [scrollYProgress])

  return (
    <section className="relative bg-secondary">
      <div
        ref={transitionRef}
        className="relative h-[190vh] bg-black"
        onWheel={(event) => {
          if (event.deltaY <= 0 || autoScrollRef.current) return
          const progress = scrollYProgress.get()
          if (progress < 0.42 || progress > 0.82) return
          autoScrollRef.current = true
          scrollToMap()
          window.setTimeout(() => {
            autoScrollRef.current = false
          }, 1100)
        }}
      >
        <motion.section
          style={{ scale: heroScale, opacity: heroOpacity, filter: heroBlur }}
          className="sticky top-0 h-svh min-h-[620px] origin-center overflow-hidden bg-black md:min-h-[700px]"
        >
          <video
            className="absolute inset-0 size-full object-cover"
            src="/videoBackground.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-black/45" />

          <div className="relative z-10 mx-auto flex h-full max-w-[1280px] flex-col items-center justify-center px-5 pt-20 text-center text-white md:px-6 md:pt-0">
            <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-normal sm:text-5xl md:text-7xl">
              Encontre o imóvel ideal para você
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/82 md:mt-6 md:text-lg md:leading-8">
              As melhores oportunidades estão aqui. Seu novo lar ou investimento a um clique de distância.
            </p>
            <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row md:mt-9">
              <Button className="h-12 rounded-full px-7" onClick={scrollToMap}>Ver imóveis no mapa</Button>
              <Button variant="outline" className="h-12 rounded-full border-white/40 bg-white/10 px-7 text-white backdrop-blur hover:bg-white/20 hover:text-white" onClick={scrollToMap}>
                Explorar oportunidades
              </Button>
            </div>
            <button
              type="button"
              onClick={scrollToMap}
              className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70 transition hover:text-white md:flex"
            >
              Role para explorar
              <span className="grid size-9 place-items-center rounded-full border border-white/30 bg-white/10 backdrop-blur">
                <ChevronDown className="size-4 animate-bounce" />
              </span>
            </button>
          </div>
        </motion.section>

        <motion.div
          style={{ y: mapY, borderTopLeftRadius: mapRadius, borderTopRightRadius: mapRadius, boxShadow: mapShadow }}
          className="sticky top-0 z-10 -mt-[100svh] h-svh scroll-mt-0 overflow-hidden bg-secondary"
        >
          <div
            className="grid size-full transition-[grid-template-columns] duration-500 ease-out"
            style={{ gridTemplateColumns: sidebarOpen && !isMobileLayout ? "clamp(320px, 29vw, 430px) minmax(0, 1fr)" : "0px minmax(0, 1fr)" }}
          >
            <PropertiesSidebar
              imoveis={filtered}
              isLoading={isLoading}
              open={sidebarOpen}
              selectedId={selected?.id}
              onOpenChange={setSidebarOpen}
              onOpenFilters={() => setFiltersOpen(true)}
              showPointsOfInterest={showPointsOfInterest}
              onTogglePoints={() => setShowPointsOfInterest((show) => !show)}
              onFocus={setSelected}
            />

            <div className="relative min-w-0 overflow-hidden">
              <PropertiesMap
                imoveis={filtered}
                selectedId={selected?.id}
                selectedAddress={selectedAddress}
                scrollWheelZoom={mapInteractive}
                showPointsOfInterest={showPointsOfInterest}
                onSelect={setSelected}
              />

              {controlsVisible ? (
                <>
                  <MapFloatingTop
                    value={mapSearch}
                    results={addressResults}
                    isSearching={isSearchingAddress}
                    hasSearched={hasSearchedAddress}
                    filters={filters}
                    setFilters={setFilters}
                    imoveis={imoveis}
                    filtersOpen={filtersOpen}
                    activeFilterCount={activeFilterCount}
                    onFiltersOpenChange={setFiltersOpen}
                    onChange={setMapSearch}
                    onSubmit={submitMapSearch}
                    onSelectAddress={selectAddress}
                    onClear={clearMapSearch}
                    onCenter={() => window.dispatchEvent(new Event("maldonado:fit-imoveis"))}
                  />

                  <div className="pointer-events-auto absolute right-4 top-4 z-[790] md:right-5 md:top-5">
                    <AccountMenuButton />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="absolute left-4 top-1/2 z-[760] h-11 -translate-y-1/2 rounded-full border-border/70 bg-white/94 px-4 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl md:left-5"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={sidebarOpen ? "Ocultar lista" : "Ver imóveis"}
                  >
                    {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="hidden sm:inline">{sidebarOpen ? "Ocultar lista" : "Ver imóveis"}</span>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {controlsVisible && sidebarOpen ? (
            <motion.button
              type="button"
              aria-label="Fechar lista"
              className="fixed inset-0 z-[810] bg-black/25 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  )
}

function MapFloatingTop({
  value,
  results,
  isSearching,
  hasSearched,
  filters,
  setFilters,
  imoveis,
  filtersOpen,
  activeFilterCount,
  onFiltersOpenChange,
  onChange,
  onSubmit,
  onSelectAddress,
  onClear,
  onCenter,
}: {
  value: string
  results: EnderecoResultado[]
  isSearching: boolean
  hasSearched: boolean
  filters: ImoveisFilters
  setFilters: (filters: ImoveisFilters) => void
  imoveis: Imovel[]
  filtersOpen: boolean
  activeFilterCount: number
  onFiltersOpenChange: (open: boolean) => void
  onChange: (value: string) => void
  onSubmit: () => void
  onSelectAddress: (address: EnderecoResultado) => void
  onClear: () => void
  onCenter: () => void
}) {
  const showResults = value.trim().length >= 3 && (results.length > 0 || hasSearched || isSearching)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-[780] flex justify-center px-4 md:top-5">
      <div className="pointer-events-auto flex w-full max-w-[760px] items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <div className="flex h-11 items-center rounded-full border border-border/70 bg-white px-3 transition duration-200 focus-within:border-primary/40 focus-within:shadow-[0_10px_28px_rgba(0,0,0,0.08)] focus-within:ring-4 focus-within:ring-primary/10 md:focus-within:scale-[1.01]">
            <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-full border-0 bg-transparent px-2 text-sm shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0"
              placeholder="Pesquisar endereço, bairro ou cidade"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmit()
                if (event.key === "Escape") onClear()
              }}
            />
            {value && !isSearching ? (
              <button type="button" className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground" onClick={onClear} aria-label="Limpar busca">
                <X className="size-3.5" />
              </button>
            ) : null}
            {isSearching ? <LoaderCircle className="mr-1 size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
          </div>

          {showResults ? (
            <div className="absolute left-0 top-[calc(100%+10px)] z-[900] w-full overflow-hidden rounded-[20px] border border-border/80 bg-white/98 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl">
              <div className="premium-scrollbar max-h-72 overflow-y-auto py-1.5">
                {results.map((address) => (
                  <button key={address.place_id} type="button" className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/80 focus:bg-secondary focus:outline-none" onClick={() => onSelectAddress(address)}>
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-white group-hover:text-primary">
                      <MapPin className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold leading-5 text-foreground">{addressTitle(address)}</span>
                      <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{address.display_name}</span>
                    </span>
                  </button>
                ))}
                {!isSearching && hasSearched && results.length === 0 ? <div className="px-4 py-5 text-sm text-muted-foreground">Nenhum endereço encontrado.</div> : null}
                {isSearching && results.length === 0 ? <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Buscando endereços...</div> : null}
              </div>
            </div>
          ) : null}
        </div>

        <MapFiltersPopover
          filters={filters}
          setFilters={setFilters}
          imoveis={imoveis}
          open={filtersOpen}
          activeCount={activeFilterCount}
          onOpenChange={onFiltersOpenChange}
        />
        <Button type="button" variant="outline" className="h-11 rounded-full border-border/70 bg-white px-3 text-sm shadow-none hover:bg-secondary sm:px-4" onClick={onCenter}>
          <LocateFixed className="size-4" />
          <span className="hidden sm:inline">Centralizar</span>
        </Button>
      </div>
    </div>
  )
}

function MapFiltersPopover({
  filters,
  setFilters,
  imoveis,
  open,
  activeCount,
  onOpenChange,
}: {
  filters: ImoveisFilters
  setFilters: (filters: ImoveisFilters) => void
  imoveis: Imovel[]
  open: boolean
  activeCount: number
  onOpenChange: (open: boolean) => void
}) {
  const cidades = unique(imoveis.map((item) => item.city).filter(Boolean))
  const bairros = unique(imoveis.map((item) => item.neighborhood).filter(Boolean))
  const tipos = unique(imoveis.map((item) => item.type).filter(Boolean))
  const update = (key: keyof ImoveisFilters, value: string) => setFilters({ ...filters, [key]: value })

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="h-11 rounded-full border-border/70 bg-white px-3 text-sm shadow-none hover:bg-secondary sm:px-4">
          <SlidersHorizontal className="size-4" />
          <span className="hidden sm:inline">Filtros</span>
          {activeCount ? <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{activeCount}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[900] w-[min(420px,calc(100vw-2rem))] rounded-[20px] p-0">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Filtros</h2>
          <p className="mt-1 text-sm text-muted-foreground">Refine os imóveis exibidos no mapa.</p>
        </div>
        <div className="premium-scrollbar grid max-h-[58svh] grid-cols-2 gap-3 overflow-y-auto p-5">
          <Field label="Cidade">
            <select className="h-10 rounded-[14px] border border-input bg-white px-3 text-sm" value={filters.cidade} onChange={(event) => update("cidade", event.target.value)}>
              <option value="">Todas</option>
              {cidades.map((cidade) => <option key={cidade}>{cidade}</option>)}
            </select>
          </Field>
          <Field label="Bairro">
            <select className="h-10 rounded-[14px] border border-input bg-white px-3 text-sm" value={filters.bairro} onChange={(event) => update("bairro", event.target.value)}>
              <option value="">Todos</option>
              {bairros.map((bairro) => <option key={bairro}>{bairro}</option>)}
            </select>
          </Field>
          <Field label="Valor minimo">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.valorMin} onChange={(event) => update("valorMin", event.target.value)} />
          </Field>
          <Field label="Valor maximo">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.valorMax} onChange={(event) => update("valorMax", event.target.value)} />
          </Field>
          <Field label="Tipo">
            <select className="h-10 rounded-[14px] border border-input bg-white px-3 text-sm" value={filters.tipo} onChange={(event) => update("tipo", event.target.value)}>
              <option value="">Todos</option>
              {tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
            </select>
          </Field>
          <Field label="Quartos">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.quartos} onChange={(event) => update("quartos", event.target.value)} />
          </Field>
          <Field label="Banheiros">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.banheiros} onChange={(event) => update("banheiros", event.target.value)} />
          </Field>
          <Field label="Garagem">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.vagas} onChange={(event) => update("vagas", event.target.value)} />
          </Field>
          <Field label="Area minima">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.areaMin} onChange={(event) => update("areaMin", event.target.value)} />
          </Field>
          <Field label="Area maxima">
            <Input className="h-10 rounded-[14px]" inputMode="numeric" value={filters.areaMax} onChange={(event) => update("areaMax", event.target.value)} />
          </Field>
        </div>
        <div className="flex justify-between gap-3 border-t border-border/60 p-4">
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setFilters(defaultFilters)}>Limpar</Button>
          <Button type="button" className="rounded-full px-5" onClick={() => onOpenChange(false)}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </Label>
  )
}

function addressTitle(address: EnderecoResultado) {
  return address.address?.road || address.address?.pedestrian || address.address?.suburb || address.address?.city || address.display_name.split(",")[0] || "Endereço"
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"))
}
