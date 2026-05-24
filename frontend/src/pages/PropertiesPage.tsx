import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, List, LoaderCircle, LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react"
import type { ReactNode } from "react"
import { lazy, Suspense } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"

import { AccountMenuButton } from "@/components/layout/PremiumHeader"
import { PropertiesSidebar } from "@/components/properties/PropertiesSidebar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { defaultFilters, filterImoveis } from "@/features/filters/filterImoveis"
import { useImoveis } from "@/hooks/useImoveis"
import { cn } from "@/lib/utils"
import { imoveisService } from "@/services/imoveisService"
import type { EnderecoResultado, Imovel, ImoveisFilters, PontoInteresse } from "@/types/imovel"

const HEADER_VISIBILITY_EVENT = "maldonado:premium-header-visibility"
const SCROLL_TO_MAP_EVENT = "maldonado:scroll-to-map"
const USER_LOCATION_CACHE_KEY = "maldonado.user-location"
const USER_LOCATION_CACHE_TTL = 1000 * 60 * 60 * 12
const PropertiesMap = lazy(() => import("@/components/map/PropertiesMap").then((mod) => ({ default: mod.PropertiesMap })))

interface CachedUserLocation {
  expiresAt: number
  address: EnderecoResultado
}

function readCachedUserLocation() {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(USER_LOCATION_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as Partial<CachedUserLocation>
    if (!cached.expiresAt || cached.expiresAt <= Date.now() || !cached.address?.latitude || !cached.address.longitude) {
      window.localStorage.removeItem(USER_LOCATION_CACHE_KEY)
      return null
    }
    return cached.address
  } catch {
    window.localStorage.removeItem(USER_LOCATION_CACHE_KEY)
    return null
  }
}

function cacheUserLocation(address: EnderecoResultado) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(
    USER_LOCATION_CACHE_KEY,
    JSON.stringify({
      expiresAt: Date.now() + USER_LOCATION_CACHE_TTL,
      address,
    } satisfies CachedUserLocation),
  )
}

export function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const buscaParam = searchParams.get("busca") ?? ""
  const destaqueParam = searchParams.get("destaque")
  const mapParam = searchParams.get("map")
  const { data: imoveis = [], isLoading } = useImoveis()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [selected, setSelected] = useState<Imovel | null>(null)
  const [filtersPopover, setFiltersPopover] = useState<"map" | "sidebar" | null>(null)
  const [showPointsOfInterest, setShowPointsOfInterest] = useState(true)
  const [heroVideoReady, setHeroVideoReady] = useState(false)
  const [mapSearch, setMapSearch] = useState(buscaParam)
  const [userLocationAddress, setUserLocationAddress] = useState<EnderecoResultado | null>(() => readCachedUserLocation())
  const [addressResults, setAddressResults] = useState<EnderecoResultado[]>([])
  const [pontosInteressePorCidade, setPontosInteressePorCidade] = useState<Record<number, PontoInteresse[]>>({})
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false)
  const [propertySearch, setPropertySearch] = useState("")
  const [propertySearchResults, setPropertySearchResults] = useState<Imovel[]>([])
  const [isSearchingProperties, setIsSearchingProperties] = useState(false)
  const [hasSearchedProperties, setHasSearchedProperties] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(false)
  const [mapInteractive, setMapInteractive] = useState(false)
  const [resultsLoading, setResultsLoading] = useState(false)
  const transitionRef = useRef<HTMLDivElement | null>(null)
  const heroVideoRef = useRef<HTMLVideoElement | null>(null)
  const geolocationRequestedRef = useRef(Boolean(userLocationAddress))
  const mapRegionActiveRef = useRef(false)
  const resultsLoadingTimeoutRef = useRef<number | null>(null)
  const selectedAddressQueryRef = useRef("")
  const { scrollYProgress } = useScroll({
    target: transitionRef,
    offset: ["start start", "end end"],
  })
  const heroScale = useTransform(scrollYProgress, [0, isMobileLayout ? 0.62 : 0.72], [1, isMobileLayout ? 0.985 : 0.96])
  const heroOpacity = useTransform(scrollYProgress, [0, isMobileLayout ? 0.66 : 0.72], [1, isMobileLayout ? 0.12 : 0.24])
  const heroBlur = useTransform(scrollYProgress, [0, isMobileLayout ? 0.66 : 0.72], ["blur(0px)", isMobileLayout ? "blur(3px)" : "blur(6px)"])
  const rawMapY = useTransform(scrollYProgress, [0.04, isMobileLayout ? 0.74 : 0.82], ["100vh", "0vh"])
  const rawMapRadius = useTransform(scrollYProgress, [0.18, isMobileLayout ? 0.74 : 0.82], [36, 0])
  const rawMapShadow = useTransform(
    scrollYProgress,
    [0.18, isMobileLayout ? 0.74 : 0.82],
    ["0 -28px 90px rgba(0,0,0,0.22)", "0 0 0 rgba(0,0,0,0)"],
  )
  const mapY = useSpring(rawMapY, { stiffness: 130, damping: 24, mass: 0.42 })
  const mapRadius = useSpring(rawMapRadius, { stiffness: 150, damping: 26, mass: 0.36 })
  const mapShadow = useSpring(rawMapShadow, { stiffness: 150, damping: 28, mass: 0.4 })
  const [filters, setFilters] = useState<ImoveisFilters>({
    ...defaultFilters,
    search: buscaParam,
  })
  const propertySearchQuery = propertySearch.trim()
  const propertySearchActive = propertySearchQuery.length >= 2

  const filtered = useMemo(() => {
    const onlyFeatured = destaqueParam === "1"
    const base = onlyFeatured ? imoveis.filter((imovel) => imovel.isFeatured) : imoveis
    return filterImoveis(base, filters)
  }, [destaqueParam, filters, imoveis])

  const visibleImoveis = useMemo(() => {
    if (!propertySearchActive) return filtered
    const base = destaqueParam === "1"
      ? propertySearchResults.filter((imovel) => imovel.isFeatured)
      : propertySearchResults
    return filterImoveis(base, { ...filters, search: "" })
  }, [destaqueParam, filtered, filters, propertySearchActive, propertySearchResults])

  const visibleCidadeIds = useMemo(() => {
    return [...new Set(visibleImoveis.map((imovel) => imovel.raw.cidade?.id).filter((id): id is number => Boolean(id)))].sort((a, b) => a - b)
  }, [visibleImoveis])

  const visibleImoveisWithPoints = useMemo(() => {
    return visibleImoveis.map((imovel) => {
      const cidadeId = imovel.raw.cidade?.id
      const pointsOfInterest = imovel.pointsOfInterest.length || !cidadeId
        ? imovel.pointsOfInterest
        : pontosInteressePorCidade[cidadeId] ?? []
      return pointsOfInterest === imovel.pointsOfInterest ? imovel : { ...imovel, pointsOfInterest }
    })
  }, [pontosInteressePorCidade, visibleImoveis])

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
    const countableFilters = [
      filters.search,
      filters.cidade,
      filters.valorMin,
      filters.valorMax,
      filters.tipo,
      filters.quartos,
      filters.banheiros,
      filters.vagas,
      filters.cozinhas,
      filters.salas,
      filters.varandas,
      filters.areaMin,
      filters.areaMax,
    ]
    return countableFilters.filter(Boolean).length + (selectedAddress ? 1 : 0) + (destaqueParam === "1" ? 1 : 0)
  }, [destaqueParam, filters, selectedAddress])

  const resultsLoadingKey = useMemo(() => {
    return JSON.stringify({
      filters,
      destaque: destaqueParam === "1",
      propertySearch: propertySearchActive ? propertySearchQuery : "",
      selectedAddress: selectedAddress ? `${selectedAddress.latitude}:${selectedAddress.longitude}` : "",
    })
  }, [destaqueParam, filters, propertySearchActive, propertySearchQuery, selectedAddress])

  const showResultsLoading = useCallback((duration = 720) => {
    setResultsLoading(true)
    if (resultsLoadingTimeoutRef.current) {
      window.clearTimeout(resultsLoadingTimeoutRef.current)
    }
    resultsLoadingTimeoutRef.current = window.setTimeout(() => {
      setResultsLoading(false)
      resultsLoadingTimeoutRef.current = null
    }, duration)
  }, [])

  const applyUserLocation = useCallback(async (latitude: number, longitude: number) => {
    showResultsLoading(1100)

    let address: EnderecoResultado = {
      display_name: "Sua localização atual",
      latitude: String(latitude),
      longitude: String(longitude),
      place_id: "current-location",
      type: "current_location",
      address: {},
    }

    try {
      address = await imoveisService.buscarEnderecoReverso(latitude, longitude) ?? address
    } catch {
      // Mantem a localização bruta caso o reverse geocode não responda.
    }

    const userCity = cityFromAddress(address)
    const matchedCity = findMatchingCity(userCity, imoveis)
    const nextAddress = {
      ...address,
      display_name: address.display_name || matchedCity || userCity || "Sua localização atual",
      latitude: String(address.latitude || latitude),
      longitude: String(address.longitude || longitude),
    }
    setUserLocationAddress(nextAddress)
    cacheUserLocation(nextAddress)
    setFilters((current) => ({
      ...current,
      cidade: matchedCity || current.cidade,
      bairro: "",
    }))
  }, [imoveis, showResultsLoading])

  const requestUserLocation = useCallback(() => {
    const cachedLocation = readCachedUserLocation()
    if (cachedLocation) {
      geolocationRequestedRef.current = true
      setUserLocationAddress(cachedLocation)
      return true
    }

    if (geolocationRequestedRef.current || typeof navigator === "undefined" || !navigator.geolocation) return false
    geolocationRequestedRef.current = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyUserLocation(position.coords.latitude, position.coords.longitude)
      },
      () => undefined,
      {
        enableHighAccuracy: true,
        maximumAge: 1000 * 60 * 8,
        timeout: 9000,
      },
    )

    return true
  }, [applyUserLocation])

  const centerMapOnUserLocation = useCallback(() => {
    if (userLocationAddress) {
      window.dispatchEvent(new Event("maldonado:fly-address"))
      return
    }

    if (!requestUserLocation()) {
      window.dispatchEvent(new Event("maldonado:fit-imoveis"))
    }
  }, [requestUserLocation, userLocationAddress])

  function selectAddress(address: EnderecoResultado) {
    const title = addressTitle(address)
    const params = new URLSearchParams(searchParams)
    params.set("endereco", title)
    params.set("endereco_nome", address.display_name)
    params.set("endereco_lat", address.latitude)
    params.set("endereco_lng", address.longitude)
    params.set("map", "1")
    setMapSearch(title)
    selectedAddressQueryRef.current = title
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
    selectedAddressQueryRef.current = ""
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

  function changeMapSearch(value: string) {
    selectedAddressQueryRef.current = ""
    setMapSearch(value)
  }

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    const activeThreshold = isMobileLayout ? 0.68 : 0.74
    const interactiveThreshold = isMobileLayout ? 0.74 : 0.82
    const mapRegionActive = value > activeThreshold
    if (mapRegionActive && !mapRegionActiveRef.current) {
      showResultsLoading(900)
    }
    mapRegionActiveRef.current = mapRegionActive
    setControlsVisible(mapRegionActive)
    setMapInteractive(value > interactiveThreshold)
    window.dispatchEvent(new CustomEvent(HEADER_VISIBILITY_EVENT, { detail: { visible: !mapRegionActive } }))
  })

  const scrollToMap = useCallback(() => {
    requestUserLocation()
    const transition = transitionRef.current
    if (!transition) return
    const top = transition.offsetTop + transition.offsetHeight * (isMobileLayout ? 0.72 : 0.82)
    window.scrollTo({ top, behavior: "smooth" })
    setSearchParams((params) => {
      params.set("map", "1")
      return params
    })
  }, [isMobileLayout, requestUserLocation, setSearchParams])

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
    if (selectedAddressQueryRef.current && selectedAddressQueryRef.current === query) {
      setAddressResults([])
      setHasSearchedAddress(false)
      setIsSearchingAddress(false)
      return
    }
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
    if (!showPointsOfInterest || !visibleCidadeIds.length) return
    const missingCityIds = visibleCidadeIds.filter((cidadeId) => pontosInteressePorCidade[cidadeId] === undefined)
    if (!missingCityIds.length) return

    const controller = new AbortController()
    Promise.all(
      missingCityIds.map(async (cidadeId) => {
        const pontos = await imoveisService.pontosInteresseCidade(cidadeId, controller.signal)
        return [cidadeId, pontos] as const
      }),
    )
      .then((entries) => {
        if (controller.signal.aborted) return
        setPontosInteressePorCidade((current) => {
          const next = { ...current }
          entries.forEach(([cidadeId, pontos]) => {
            next[cidadeId] = pontos
          })
          return next
        })
      })
      .catch(() => undefined)

    return () => controller.abort()
  }, [pontosInteressePorCidade, showPointsOfInterest, visibleCidadeIds])

  useEffect(() => {
    const query = propertySearch.trim()
    if (query.length < 2) {
      setPropertySearchResults([])
      setHasSearchedProperties(false)
      setIsSearchingProperties(false)
      return
    }

    const controller = new AbortController()
    setIsSearchingProperties(true)
    setHasSearchedProperties(false)

    const timeout = window.setTimeout(async () => {
      try {
        const results = await imoveisService.search(query, controller.signal)
        setPropertySearchResults(results)
        setHasSearchedProperties(true)
      } catch {
        if (!controller.signal.aborted) {
          setPropertySearchResults([])
          setHasSearchedProperties(true)
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingProperties(false)
      }
    }, 280)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [propertySearch])

  useEffect(() => {
    if (!controlsVisible) return
    showResultsLoading()
  }, [controlsVisible, resultsLoadingKey, showResultsLoading])

  useEffect(() => {
    if (isLoading || !controlsVisible) return
    requestUserLocation()
  }, [controlsVisible, isLoading, requestUserLocation])

  useEffect(() => {
    if (!userLocationAddress || !imoveis.length || filters.cidade) return
    const userCity = cityFromAddress(userLocationAddress)
    const matchedCity = findMatchingCity(userCity, imoveis)
    if (!matchedCity) return
    setFilters((current) => current.cidade ? current : { ...current, cidade: matchedCity, bairro: "" })
  }, [filters.cidade, imoveis, userLocationAddress])

  useEffect(() => {
    const video = heroVideoRef.current
    if (!video) return

    video.muted = true
    video.defaultMuted = true
    video.playsInline = true
    video.controls = false

    const playVideo = () => {
      const playRequest = video.play()
      if (playRequest) {
        playRequest.catch(() => setHeroVideoReady(false))
      }
    }

    playVideo()
    document.addEventListener("visibilitychange", playVideo)

    return () => document.removeEventListener("visibilitychange", playVideo)
  }, [])

  useEffect(() => {
    return () => {
      if (resultsLoadingTimeoutRef.current) {
        window.clearTimeout(resultsLoadingTimeoutRef.current)
      }
    }
  }, [])

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
    if (!isMobileLayout || !sidebarOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isMobileLayout, sidebarOpen])

  const clearPropertySearch = useCallback(() => {
    setPropertySearch("")
    setPropertySearchResults([])
    setHasSearchedProperties(false)
    setIsSearchingProperties(false)
  }, [])

  const resultsAreLoading = isLoading || resultsLoading || (propertySearchActive && isSearchingProperties)

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
        className="relative h-[185svh] bg-black md:h-[190vh]"
      >
        <motion.section
          style={{ scale: heroScale, opacity: heroOpacity, filter: heroBlur }}
          className="sticky top-0 h-dvh min-h-[560px] origin-center overflow-hidden bg-black md:min-h-[700px]"
        >
          <img
            className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", heroVideoReady ? "opacity-0" : "opacity-100")}
            src="/videoBackground-poster.jpg"
            alt=""
            aria-hidden="true"
          />
          <video
            ref={heroVideoRef}
            className={cn("absolute inset-0 size-full object-cover transition-opacity duration-500", heroVideoReady ? "opacity-100" : "opacity-0")}
            src="/videoBackground.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster="/videoBackground-poster.jpg"
            controls={false}
            disablePictureInPicture
            onCanPlay={() => {
              setHeroVideoReady(true)
              void heroVideoRef.current?.play().catch(() => setHeroVideoReady(false))
            }}
            onPlaying={() => setHeroVideoReady(true)}
            onError={() => setHeroVideoReady(false)}
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
          className="sticky top-0 z-10 -mt-[100svh] h-dvh scroll-mt-0 overflow-hidden bg-secondary"
        >
          <div
            className="grid size-full transition-[grid-template-columns] duration-500 ease-out"
            style={{ gridTemplateColumns: sidebarOpen && !isMobileLayout ? "clamp(320px, 29vw, 430px) minmax(0, 1fr)" : "0px minmax(0, 1fr)" }}
          >
            <PropertiesSidebar
              imoveis={visibleImoveis}
              isLoading={resultsAreLoading}
              open={sidebarOpen}
              selectedId={selected?.id}
              searchValue={propertySearch}
              isSearchingProperties={propertySearchActive && isSearchingProperties}
              hasSearchedProperties={hasSearchedProperties}
              onOpenChange={setSidebarOpen}
              onSearchChange={setPropertySearch}
              onSearchClear={clearPropertySearch}
              filtersControl={(
                <MapFiltersPopover
                  filters={filters}
                  setFilters={setFilters}
                  imoveis={imoveis}
                  open={filtersPopover === "sidebar"}
                  activeCount={activeFilterCount}
                  onOpenChange={(open) => setFiltersPopover(open ? "sidebar" : null)}
                  triggerClassName="h-10 w-full rounded-full bg-white text-sm"
                  contentSide="right"
                  contentAlign="start"
                  isMobile={isMobileLayout}
                />
              )}
              showPointsOfInterest={showPointsOfInterest}
              onTogglePoints={() => setShowPointsOfInterest((show) => !show)}
              onFocus={setSelected}
            />

            <div className="relative min-w-0 overflow-hidden">
              <Suspense fallback={<div className="absolute inset-0 bg-secondary" />}>
                <PropertiesMap
                  imoveis={visibleImoveisWithPoints}
                  selectedId={selected?.id}
                  selectedAddress={selectedAddress ?? userLocationAddress}
                  scrollWheelZoom={mapInteractive}
                  showPointsOfInterest={showPointsOfInterest}
                  onSelect={setSelected}
                  onClearSelect={() => setSelected(null)}
                />
              </Suspense>
              <MapLoadingOverlay visible={controlsVisible && resultsAreLoading} />

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
                    filtersOpen={filtersPopover === "map"}
                    activeFilterCount={activeFilterCount}
                    isMobile={isMobileLayout}
                    onFiltersOpenChange={(open) => setFiltersPopover(open ? "map" : null)}
                    onChange={changeMapSearch}
                    onSubmit={submitMapSearch}
                    onSelectAddress={selectAddress}
                    onClear={clearMapSearch}
                    onCenter={centerMapOnUserLocation}
                  />

                  <div className="pointer-events-auto absolute right-4 top-4 z-[790] md:right-5 md:top-5">
                    <AccountMenuButton />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="absolute left-4 top-1/2 z-[760] hidden h-11 -translate-y-1/2 rounded-full border-border/70 bg-white/94 px-4 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl md:inline-flex md:left-5"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={sidebarOpen ? "Ocultar lista" : "Ver imóveis"}
                  >
                    {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="hidden sm:inline">{sidebarOpen ? "Ocultar lista" : "Ver imóveis"}</span>
                  </Button>

                  {!sidebarOpen && !selected ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-[760] h-12 -translate-x-1/2 rounded-full border-border/70 bg-white/94 px-5 text-sm shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur-xl md:hidden"
                      onClick={() => setSidebarOpen(true)}
                    >
                      <List className="size-4" />
                      Ver lista
                      <span className="grid min-w-6 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{visibleImoveis.length}</span>
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </motion.div>

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
  isMobile,
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
  isMobile: boolean
  onFiltersOpenChange: (open: boolean) => void
  onChange: (value: string) => void
  onSubmit: () => void
  onSelectAddress: (address: EnderecoResultado) => void
  onClear: () => void
  onCenter: () => void
}) {
  const showResults = value.trim().length >= 3 && (results.length > 0 || hasSearched || isSearching)

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-[780] flex justify-center px-3 md:top-5 md:px-4">
      <div className="pointer-events-auto flex w-full max-w-[760px] flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <div className="flex h-12 items-center rounded-full border border-border/70 bg-white px-3 transition duration-200 focus-within:border-primary/40 focus-within:shadow-[0_10px_28px_rgba(0,0,0,0.08)] focus-within:ring-4 focus-within:ring-primary/10 sm:h-11 md:focus-within:scale-[1.01]">
            <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-full border-0 bg-transparent px-2 text-base shadow-none placeholder:text-muted-foreground/80 focus-visible:ring-0 sm:text-sm"
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

        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <MapFiltersPopover
            filters={filters}
            setFilters={setFilters}
            imoveis={imoveis}
            open={filtersOpen}
            activeCount={activeFilterCount}
            isMobile={isMobile}
            onOpenChange={onFiltersOpenChange}
            triggerClassName="h-11 w-full sm:w-auto"
          />
          <Button type="button" variant="outline" className="h-11 rounded-full border-border/70 bg-white px-3 text-sm shadow-none hover:bg-secondary sm:px-4" onClick={onCenter}>
            <LocateFixed className="size-4" />
            <span>Centralizar</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function MapLoadingOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="pointer-events-none absolute inset-0 z-[720] grid place-items-center bg-white/58 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="grid size-12 place-items-center rounded-full bg-white/86 shadow-[0_18px_52px_rgba(15,23,42,0.12)] ring-1 ring-border/60 backdrop-blur-xl"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="size-7 animate-spin rounded-full border-[3px] border-border border-t-primary" />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function MapFiltersPopover({
  filters,
  setFilters,
  imoveis,
  open,
  activeCount,
  onOpenChange,
  triggerClassName,
  contentSide = "bottom",
  contentAlign = "end",
  isMobile = false,
}: {
  filters: ImoveisFilters
  setFilters: (filters: ImoveisFilters) => void
  imoveis: Imovel[]
  open: boolean
  activeCount: number
  onOpenChange: (open: boolean) => void
  triggerClassName?: string
  contentSide?: "top" | "right" | "bottom" | "left"
  contentAlign?: "start" | "center" | "end"
  isMobile?: boolean
}) {
  const cidades = unique(imoveis.map((item) => item.city).filter(Boolean))
  const tipos = unique(imoveis.map((item) => item.type).filter(Boolean))
  const update = (key: keyof ImoveisFilters, value: string) => setFilters({ ...filters, [key]: value })
  const trigger = (
    <Button type="button" variant="outline" className={cn("h-11 rounded-full border-border/70 bg-white px-3 text-sm shadow-none hover:bg-secondary sm:px-4", triggerClassName)}>
      <SlidersHorizontal className="size-4" />
      <span>Filtros</span>
      {activeCount ? <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{activeCount}</span> : null}
    </Button>
  )

  if (isMobile) {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          className={cn("h-11 rounded-full border-border/70 bg-white px-3 text-sm shadow-none hover:bg-secondary", triggerClassName)}
          onClick={() => onOpenChange(true)}
        >
          <SlidersHorizontal className="size-4" />
          <span>Filtros</span>
          {activeCount ? <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{activeCount}</span> : null}
        </Button>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bottom-0 left-0 top-auto max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-[28px] p-0 md:hidden">
            <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Refine os imóveis exibidos no mapa.</DialogDescription>
            </DialogHeader>
            <FiltersPanel
              filters={filters}
              update={update}
              cidades={cidades}
              tipos={tipos}
              onClear={() => setFilters(defaultFilters)}
              onApply={() => onOpenChange(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {trigger}
      </PopoverTrigger>
      <PopoverContent side={contentSide} align={contentAlign} className="z-[900] w-[min(420px,calc(100vw-2rem))] rounded-[20px] p-0">
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Filtros</h2>
          <p className="mt-1 text-sm text-muted-foreground">Refine os imóveis exibidos no mapa.</p>
        </div>
        <FiltersPanel
          filters={filters}
          update={update}
          cidades={cidades}
          tipos={tipos}
          onClear={() => setFilters(defaultFilters)}
          onApply={() => onOpenChange(false)}
        />
      </PopoverContent>
    </Popover>
  )
}

function FiltersPanel({
  filters,
  update,
  cidades,
  tipos,
  onClear,
  onApply,
}: {
  filters: ImoveisFilters
  update: (key: keyof ImoveisFilters, value: string) => void
  cidades: string[]
  tipos: string[]
  onClear: () => void
  onApply: () => void
}) {
  return (
    <>
      <div className="premium-scrollbar grid max-h-[58svh] grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
        <Field label="Cidade">
          <select className="h-11 rounded-[14px] border border-input bg-white px-3 text-sm" value={filters.cidade} onChange={(event) => update("cidade", event.target.value)}>
            <option value="">Todas</option>
            {cidades.map((cidade) => <option key={cidade}>{cidade}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select className="h-11 rounded-[14px] border border-input bg-white px-3 text-sm" value={filters.tipo} onChange={(event) => update("tipo", event.target.value)}>
            <option value="">Todos</option>
            {tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
          </select>
        </Field>
        <CounterField label="Quartos" value={filters.quartos} onChange={(value) => update("quartos", value)} />
        <CounterField label="Banheiros" value={filters.banheiros} onChange={(value) => update("banheiros", value)} />
        <MaskedNumberField label="Valor minimo" value={filters.valorMin} onChange={(value) => update("valorMin", value)} formatter={formatCurrencyInput} placeholder="R$ 0" />
        <MaskedNumberField label="Valor maximo" value={filters.valorMax} onChange={(value) => update("valorMax", value)} formatter={formatCurrencyInput} placeholder="R$ 0" />
        <CounterField label="Garagem" value={filters.vagas} onChange={(value) => update("vagas", value)} />
        <CounterField label="Cozinha" value={filters.cozinhas} onChange={(value) => update("cozinhas", value)} />
        <CounterField label="Sala" value={filters.salas} onChange={(value) => update("salas", value)} />
        <CounterField label="Varanda" value={filters.varandas} onChange={(value) => update("varandas", value)} />
        <MaskedNumberField label="Area minima" value={filters.areaMin} onChange={(value) => update("areaMin", value)} formatter={formatAreaInput} placeholder="0 m²" />
        <MaskedNumberField label="Area maxima" value={filters.areaMax} onChange={(value) => update("areaMax", value)} formatter={formatAreaInput} placeholder="0 m²" />
      </div>
      <div className="flex justify-between gap-3 border-t border-border/60 bg-white p-4">
        <Button type="button" variant="ghost" className="h-11 rounded-full" onClick={onClear}>Limpar</Button>
        <Button type="button" className="h-11 rounded-full px-5" onClick={onApply}>Aplicar</Button>
      </div>
    </>
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

function CounterField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const numericValue = Math.max(0, Number(value || 0))
  const setValue = (nextValue: number) => onChange(nextValue > 0 ? String(nextValue) : "")

  return (
    <Field label={label}>
      <div className="flex h-11 items-center justify-between rounded-[14px] border border-input bg-white pl-3 pr-1">
        <span className={cn("text-sm font-semibold", numericValue ? "text-foreground" : "text-muted-foreground")}>
          {numericValue || "Qualquer"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-35"
            onClick={() => setValue(numericValue - 1)}
            disabled={numericValue <= 0}
            aria-label={`Diminuir ${label.toLowerCase()}`}
          >
            <ChevronDown className="size-4" />
          </button>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            onClick={() => setValue(numericValue + 1)}
            aria-label={`Aumentar ${label.toLowerCase()}`}
          >
            <ChevronUp className="size-4" />
          </button>
        </div>
      </div>
    </Field>
  )
}

function MaskedNumberField({
  label,
  value,
  onChange,
  formatter,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  formatter: (value: string) => string
  placeholder: string
}) {
  return (
    <Field label={label}>
      <Input
        className="h-11 rounded-[14px] font-semibold"
        inputMode="numeric"
        value={formatter(value)}
        placeholder={placeholder}
        onChange={(event) => onChange(onlyDigits(event.target.value))}
      />
    </Field>
  )
}

function addressTitle(address: EnderecoResultado) {
  return address.address?.road || address.address?.pedestrian || address.address?.suburb || address.address?.city || address.display_name.split(",")[0] || "Endereço"
}

function cityFromAddress(address: EnderecoResultado) {
  const data = address.address ?? {}
  return data.city || data.town || data.village || data.municipality || data.county || ""
}

function findMatchingCity(city: string, imoveis: Imovel[]) {
  if (!city) return ""
  const normalizedCity = normalizeText(city)
  return unique(imoveis.map((imovel) => imovel.city).filter(Boolean)).find((item) => normalizeText(item) === normalizedCity) ?? ""
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function formatCurrencyInput(value: string) {
  if (!value) return ""
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(value))
}

function formatAreaInput(value: string) {
  if (!value) return ""
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Number(value))} m²`
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"))
}
