import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion"
import { ChevronDown, MapPin, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { PropertiesMap } from "@/components/map/PropertiesMap"
import { FiltersPopover } from "@/components/properties/FiltersPopover"
import { PropertiesSidebar } from "@/components/properties/PropertiesSidebar"
import { defaultFilters, filterImoveis } from "@/features/filters/filterImoveis"
import { useImoveis } from "@/hooks/useImoveis"
import type { EnderecoResultado, Imovel, ImoveisFilters } from "@/types/imovel"

export function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const buscaParam = searchParams.get("busca") ?? ""
  const destaqueParam = searchParams.get("destaque")
  const mapParam = searchParams.get("map")
  const { data: imoveis = [], isLoading } = useImoveis()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selected, setSelected] = useState<Imovel | null>(null)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [mapInteractive, setMapInteractive] = useState(false)
  const transitionRef = useRef<HTMLDivElement | null>(null)
  const mapSectionRef = useRef<HTMLDivElement | null>(null)
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
      address: {
        road: searchParams.get("endereco") || "",
      },
    }
  }, [searchParams])

  const activeFilterChips = useMemo(() => {
    const labels: Partial<Record<keyof ImoveisFilters, string>> = {
      search: "Busca",
      cidade: "Cidade",
      bairro: "Bairro",
      valorMin: "Min.",
      valorMax: "Max.",
      tipo: "Tipo",
      quartos: "Quartos",
      banheiros: "Banheiros",
      vagas: "Garagem",
      areaMin: "Área min.",
      areaMax: "Área max.",
    }
    return (Object.entries(filters) as [keyof ImoveisFilters, string][])
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => ({ key, label: `${labels[key]}: ${value}` }))
  }, [filters])

  function removeFilter(key: keyof ImoveisFilters) {
    setFilters((current) => ({ ...current, [key]: "" }))
    if (key === "search") {
      setSearchParams((params) => {
        params.delete("busca")
        if (!params.get("map")) params.set("map", "1")
        return params
      })
    }
  }

  function clearSelectedAddress() {
    setSearchParams((params) => {
      params.delete("endereco")
      params.delete("endereco_nome")
      params.delete("endereco_lat")
      params.delete("endereco_lng")
      params.set("map", "1")
      return params
    })
  }

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setControlsVisible(value > 0.74)
    setMapInteractive(value > 0.82)
  })

  const scrollToMap = useCallback(() => {
    const transition = transitionRef.current
    if (!transition) return
    const top = transition.offsetTop + transition.offsetHeight * 0.82
    window.scrollTo({ top, behavior: "smooth" })
  }, [])

  useEffect(() => {
    setFilters((current) => current.search === buscaParam ? current : { ...current, search: buscaParam })
  }, [buscaParam])

  useEffect(() => {
    if (mapParam !== "1") return
    const timeout = window.setTimeout(scrollToMap, 120)
    return () => window.clearTimeout(timeout)
  }, [mapParam, scrollToMap])

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
          className="sticky top-[88px] h-[calc(100svh-88px)] min-h-[620px] origin-center overflow-hidden bg-black"
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.16),transparent_42%)]" />

          <div className="relative z-10 mx-auto flex h-full max-w-[1280px] flex-col items-center justify-center px-6 text-center text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/80">Maldonado Corretor</p>
            <h1 className="mt-5 max-w-4xl text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
              Encontre o imóvel ideal para você
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/82">
              As melhores oportunidades estão aqui. Seu novo lar ou investimento a um clique de distância.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
          ref={mapSectionRef}
          style={{ y: mapY, borderTopLeftRadius: mapRadius, borderTopRightRadius: mapRadius, boxShadow: mapShadow }}
          className="sticky top-[88px] z-10 -mt-[calc(100svh-88px)] h-[calc(100svh-88px)] scroll-mt-[88px] overflow-hidden bg-secondary"
        >
          <div className="h-[calc(100svh-88px)]">
            <PropertiesMap
              imoveis={filtered}
              selectedId={selected?.id}
              selectedAddress={selectedAddress}
              scrollWheelZoom={mapInteractive}
              onSelect={setSelected}
            />
            {controlsVisible && (
              <div className="pointer-events-none absolute left-1/2 top-5 z-[650] flex w-[min(760px,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-2">
                <div className="rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-xl">
                  {filtered.length} {filtered.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
                </div>
                <div className="flex max-w-full flex-wrap justify-center gap-2">
                  {selectedAddress && (
                    <Chip onRemove={clearSelectedAddress}>
                      <MapPin className="size-3.5" />
                      {selectedAddress.address?.road || selectedAddress.display_name.split(",")[0]}
                    </Chip>
                  )}
                  {destaqueParam === "1" && <Chip>Destaques</Chip>}
                  {activeFilterChips.map((chip) => (
                    <Chip key={chip.key} onRemove={() => removeFilter(chip.key)}>{chip.label}</Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {controlsVisible && (
            <PropertiesSidebar
              imoveis={filtered}
              isLoading={isLoading}
              open={sidebarOpen}
              selectedId={selected?.id}
              onOpenChange={setSidebarOpen}
              onFocus={setSelected}
            />
          )}
        </AnimatePresence>
        {controlsVisible && <FiltersPopover filters={filters} setFilters={setFilters} imoveis={imoveis} />}
      </div>
    </section>
  )
}

function Chip({ children, onRemove }: { children: React.ReactNode; onRemove?: () => void }) {
  return (
    <span className="pointer-events-auto inline-flex max-w-[260px] items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-xs font-semibold text-foreground shadow-[0_10px_30px_rgba(0,0,0,0.1)] backdrop-blur-xl">
      <span className="flex min-w-0 items-center gap-1.5 truncate">{children}</span>
      {onRemove ? (
        <button type="button" className="grid size-5 place-items-center rounded-full hover:bg-secondary" onClick={onRemove} aria-label="Remover filtro">
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  )
}
