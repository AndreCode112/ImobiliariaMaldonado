import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from "framer-motion"
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Hand, List, LoaderCircle, LocateFixed, MapPin, Search, SlidersHorizontal, X } from "lucide-react"
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
const MAP_CONTEXT_CACHE_KEY = "maldonado.map-context"
const PropertiesMap = lazy(() => import("@/components/map/PropertiesMap").then((mod) => ({ default: mod.PropertiesMap })))

interface CachedUserLocation {
  expiresAt: number
  address: EnderecoResultado
}

interface CachedMapContext {
  selectedId?: number | null
  sidebarOpen?: boolean
  filters?: ImoveisFilters
  view?: { center: [number, number]; zoom: number } | null
}

interface CityMapTarget {
  city: string
  center?: [number, number]
  bounds?: [number, number][]
}

function readCachedUserLocation() {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(USER_LOCATION_CACHE_KEY)
    if (!raw) return null
    const cached = JSON.parse(raw) as Partial<CachedUserLocation>
    if (!cached.expiresAt || cached.expiresAt <= Date.now() || !hasValidCoordinates(cached.address)) {
      window.localStorage.removeItem(USER_LOCATION_CACHE_KEY)
      return null
    }
    return cached.address ?? null
  } catch {
    window.localStorage.removeItem(USER_LOCATION_CACHE_KEY)
    return null
  }
}

function hasValidCoordinates(address?: Partial<EnderecoResultado>) {
  const latitude = Number(address?.latitude)
  const longitude = Number(address?.longitude)
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
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

function readCachedMapContext(): CachedMapContext {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(window.sessionStorage.getItem(MAP_CONTEXT_CACHE_KEY) || "{}") as CachedMapContext
  } catch {
    window.sessionStorage.removeItem(MAP_CONTEXT_CACHE_KEY)
    return {}
  }
}

function cacheMapContext(context: CachedMapContext) {
  if (typeof window === "undefined") return
  const current = readCachedMapContext()
  window.sessionStorage.setItem(MAP_CONTEXT_CACHE_KEY, JSON.stringify({ ...current, ...context }))
}

export function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const buscaParam = searchParams.get("busca") ?? ""
  const destaqueParam = searchParams.get("destaque")
  const mapParam = searchParams.get("map")
  const { data: imoveis = [], isLoading } = useImoveis()
  const cachedMapContextRef = useRef<CachedMapContext>(readCachedMapContext())
  const [sidebarOpen, setSidebarOpen] = useState(cachedMapContextRef.current.sidebarOpen ?? true)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [selected, setSelected] = useState<Imovel | null>(null)
  const [mobileMapExplore, setMobileMapExplore] = useState(false)
  const [savedMapView, setSavedMapView] = useState(cachedMapContextRef.current.view ?? null)
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
  const geolocationRequestedRef = useRef(false)
  const mapRegionActiveRef = useRef(false)
  const resultsLoadingTimeoutRef = useRef<number | null>(null)
  const mapScrollSettleTimeoutRef = useRef<number | null>(null)
  const selectedAddressQueryRef = useRef("")
  const restoredSelectedRef = useRef(false)
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
    ...cachedMapContextRef.current.filters,
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

  const selectedCityMapTarget = useMemo<CityMapTarget | null>(() => {
    if (!filters.cidade) return null

    const cityImoveis = imoveis.filter((imovel) => normalizeText(imovel.city) === normalizeText(filters.cidade))
    const cityWithCoordinates = cityImoveis.find((imovel) => {
      const latitude = Number(imovel.raw.cidade?.latitude)
      const longitude = Number(imovel.raw.cidade?.longitude)
      return Number.isFinite(latitude) && Number.isFinite(longitude)
    })
    const cityLatitude = Number(cityWithCoordinates?.raw.cidade?.latitude)
    const cityLongitude = Number(cityWithCoordinates?.raw.cidade?.longitude)
    const bounds = cityImoveis
      .filter((imovel) => imovel.latitude !== null && imovel.longitude !== null)
      .map((imovel) => [imovel.latitude as number, imovel.longitude as number] as [number, number])

    return {
      city: filters.cidade,
      center: Number.isFinite(cityLatitude) && Number.isFinite(cityLongitude) ? [cityLatitude, cityLongitude] : bounds[0],
      bounds: bounds.length > 1 ? bounds : undefined,
    }
  }, [filters.cidade, imoveis])

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

  const hasManualFilters = activeFilterCount > (selectedAddress ? 1 : 0)
  const mapAddress = selectedAddress ?? (hasManualFilters ? null : userLocationAddress)

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

    const nextAddress = {
      ...address,
      display_name: address.display_name || cityFromAddress(address) || "Sua localização atual",
      latitude: String(address.latitude || latitude),
      longitude: String(address.longitude || longitude),
    }
    setUserLocationAddress(nextAddress)
    cacheUserLocation(nextAddress)
  }, [showResultsLoading])

  const requestUserLocation = useCallback(() => {
    const cachedLocation = readCachedUserLocation()
    if (cachedLocation) {
      setUserLocationAddress(cachedLocation)
    }

    if (geolocationRequestedRef.current || typeof navigator === "undefined" || !navigator.geolocation) return false
    geolocationRequestedRef.current = true

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void applyUserLocation(position.coords.latitude, position.coords.longitude)
      },
      () => {
        geolocationRequestedRef.current = false
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
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

  const alignMapToFinalRegion = useCallback((behavior: ScrollBehavior = "smooth") => {
    requestUserLocation()
    const transition = transitionRef.current
    if (!transition) return
    const top = Math.max(0, transition.offsetTop + transition.offsetHeight - window.innerHeight)
    window.scrollTo({ top, behavior })
  }, [requestUserLocation])

  const scrollToMap = useCallback(() => {
    alignMapToFinalRegion("smooth")
    if (mapScrollSettleTimeoutRef.current) {
      window.clearTimeout(mapScrollSettleTimeoutRef.current)
    }
    mapScrollSettleTimeoutRef.current = window.setTimeout(() => {
      alignMapToFinalRegion("smooth")
      mapScrollSettleTimeoutRef.current = null
    }, 520)
    setSearchParams((params) => {
      params.set("map", "1")
      return params
    }, { replace: true })
  }, [alignMapToFinalRegion, setSearchParams])

  useEffect(() => {
    if (!("scrollRestoration" in window.history)) return
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    return () => {
      window.history.scrollRestoration = previousScrollRestoration
    }
  }, [])

  useEffect(() => {
    window.addEventListener(SCROLL_TO_MAP_EVENT, scrollToMap)
    return () => window.removeEventListener(SCROLL_TO_MAP_EVENT, scrollToMap)
  }, [scrollToMap])

  useEffect(() => {
    if (mapParam !== "1") return
    const firstPass = window.setTimeout(scrollToMap, 120)
    const settledPass = window.setTimeout(() => alignMapToFinalRegion("smooth"), 680)
    return () => {
      window.clearTimeout(firstPass)
      window.clearTimeout(settledPass)
    }
  }, [alignMapToFinalRegion, mapParam, scrollToMap])

  useEffect(() => {
    return () => {
      if (mapScrollSettleTimeoutRef.current) {
        window.clearTimeout(mapScrollSettleTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (isLoading || userLocationAddress) return
    requestUserLocation()
  }, [isLoading, requestUserLocation, userLocationAddress])

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
    if (!controlsVisible) setMobileMapExplore(false)
  }, [controlsVisible])

  useEffect(() => {
    if (selected || sidebarOpen) setMobileMapExplore(false)
  }, [selected, sidebarOpen])

  useEffect(() => {
    if (isLoading || !controlsVisible || userLocationAddress) return
    requestUserLocation()
  }, [controlsVisible, isLoading, requestUserLocation, userLocationAddress])

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
      if (media.matches && cachedMapContextRef.current.sidebarOpen === undefined) setSidebarOpen(false)
    }
    syncSidebar()
    media.addEventListener("change", syncSidebar)
    return () => media.removeEventListener("change", syncSidebar)
  }, [])

  useEffect(() => {
    if (restoredSelectedRef.current || selected || !imoveis.length) return
    restoredSelectedRef.current = true
    const cachedSelectedId = cachedMapContextRef.current.selectedId
    if (!cachedSelectedId) return
    const cachedSelected = imoveis.find((imovel) => imovel.id === cachedSelectedId)
    if (cachedSelected) setSelected(cachedSelected)
  }, [imoveis, selected])

  useEffect(() => {
    cacheMapContext({ selectedId: selected?.id ?? null })
  }, [selected?.id])

  useEffect(() => {
    cacheMapContext({ sidebarOpen })
  }, [sidebarOpen])

  useEffect(() => {
    cacheMapContext({ filters })
  }, [filters])

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

  const handleMapViewChange = useCallback((view: { center: [number, number]; zoom: number }) => {
    setSavedMapView(view)
    cacheMapContext({ view })
  }, [])

  const showSelectedInList = useCallback((imovel: Imovel) => {
    setSelected(imovel)
    setSidebarOpen(true)
  }, [])

  const clearSelectedImovel = useCallback(() => {
    restoredSelectedRef.current = true
    cachedMapContextRef.current.selectedId = null
    cacheMapContext({ selectedId: null })
    setSelected(null)
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
              <Button variant="outline" className="h-12 rounded-full border-white/40 bg-white/10 px-7 text-white hover:bg-white/20 hover:text-white" onClick={scrollToMap}>
                Explorar oportunidades
              </Button>
            </div>
            <button
              type="button"
              onClick={scrollToMap}
              className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/70 transition hover:text-white md:flex"
            >
              Role para explorar
              <span className="grid size-9 place-items-center rounded-full border border-white/30 bg-white/10">
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
                  selectedAddress={mapAddress}
                  cityTarget={selectedCityMapTarget}
                  scrollWheelZoom={mapInteractive}
                  showPointsOfInterest={showPointsOfInterest}
                  mobileDragEnabled={mobileMapExplore}
                  initialView={savedMapView}
                  onSelect={setSelected}
                  onClearSelect={clearSelectedImovel}
                  onShowInList={showSelectedInList}
                  onViewChange={handleMapViewChange}
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
                    className="absolute left-4 top-1/2 z-[760] hidden h-11 -translate-y-1/2 rounded-full border-border/70 bg-white/94 px-4 text-sm md:inline-flex md:left-5"
                    onClick={() => setSidebarOpen((open) => !open)}
                    aria-label={sidebarOpen ? "Ocultar lista" : "Ver imóveis"}
                  >
                    {sidebarOpen ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />}
                    <span className="hidden sm:inline">{sidebarOpen ? "Ocultar lista" : "Ver imóveis"}</span>
                  </Button>

                  {!sidebarOpen && !selected ? (
                    <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom))] left-1/2 z-[760] flex -translate-x-1/2 items-center gap-2 md:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 rounded-full border-border/70 bg-white/94 px-4 text-sm"
                        onClick={() => setSidebarOpen(true)}
                      >
                        <List className="size-4" />
                        Ver {visibleImoveis.length} {visibleImoveis.length === 1 ? "imóvel" : "imóveis"}
                      </Button>
                      <Button
                        type="button"
                        variant={mobileMapExplore ? "default" : "outline"}
                        className={cn(
                          "h-12 rounded-full px-4 text-sm",
                          mobileMapExplore ? "bg-foreground text-white hover:bg-foreground/90" : "border-border/70 bg-white/94 hover:bg-white",
                        )}
                        onClick={() => setMobileMapExplore((enabled) => !enabled)}
                      >
                        <Hand className="size-4" />
                        {mobileMapExplore ? "Concluir" : "Explorar"}
                      </Button>
                    </div>
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
          <div className="flex h-12 items-center rounded-full border border-border/70 bg-white px-3 transition duration-200 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 sm:h-11 md:focus-within:scale-[1.01]">
            <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
            <Input
              className="h-full border-0 bg-transparent px-2 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0 sm:text-sm"
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
            <div className="absolute left-0 top-[calc(100%+10px)] z-[900] w-full overflow-hidden rounded-[20px] border border-border/80 bg-white/98">
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
          <Button type="button" variant="outline" className="h-11 rounded-full border-border/70 bg-white px-3 text-sm hover:bg-secondary sm:px-4" onClick={onCenter}>
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
          className="pointer-events-none absolute inset-0 z-[720] grid place-items-center bg-white/58-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="grid size-12 place-items-center rounded-full border bg-white/86"
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
  const [draftFilters, setDraftFilters] = useState(filters)
  const previousOpenRef = useRef(open)
  const cidades = unique(imoveis.map((item) => item.city).filter(Boolean))
  const tipos = unique(imoveis.map((item) => item.type).filter(Boolean))
  const update = (key: keyof ImoveisFilters, value: string) => setDraftFilters((current) => ({ ...current, [key]: value }))
  const clearDraft = () => setDraftFilters(defaultFilters)
  const applyDraft = () => {
    setFilters(draftFilters)
    onOpenChange(false)
  }

  useEffect(() => {
    if (open && !previousOpenRef.current) setDraftFilters(filters)
    if (!open) setDraftFilters(filters)
    previousOpenRef.current = open
  }, [filters, open])

  const trigger = (
    <Button type="button" variant="outline" className={cn("h-11 rounded-full border-border/70 bg-white px-3 text-sm hover:bg-secondary sm:px-4", triggerClassName)}>
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
          className={cn("h-11 rounded-full border-border/70 bg-white px-3 text-sm hover:bg-secondary", triggerClassName)}
          onClick={() => onOpenChange(true)}
        >
          <SlidersHorizontal className="size-4" />
          <span>Filtros</span>
          {activeCount ? <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{activeCount}</span> : null}
        </Button>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="bottom-0 left-0 top-auto max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-10px))] w-full max-w-none translate-x-0 translate-y-0 overflow-hidden rounded-b-none rounded-t-[30px] border-white/70 p-0 md:hidden">
            <DialogHeader className="border-b border-border/70 px-5 pb-4 pt-3 text-left">
              <span className="mx-auto mb-2 block h-1 w-11 rounded-full bg-border" />
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Refine os imóveis exibidos no mapa.</DialogDescription>
            </DialogHeader>
            <FiltersPanel
              filters={draftFilters}
              update={update}
              cidades={cidades}
              tipos={tipos}
              onClear={clearDraft}
              onApply={applyDraft}
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
      <PopoverContent
        side={contentSide}
        align={contentAlign}
        avoidCollisions
        collisionPadding={16}
        className="z-[900] max-h-[min(680px,calc(100dvh-2rem))] w-[min(420px,calc(100vw-2rem))] rounded-[20px] p-0"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <h2 className="text-base font-semibold">Filtros</h2>
          <p className="mt-1 text-sm text-muted-foreground">Refine os imóveis exibidos no mapa.</p>
        </div>
        <FiltersPanel
          filters={draftFilters}
          update={update}
          cidades={cidades}
          tipos={tipos}
          onClear={clearDraft}
          onApply={applyDraft}
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
      <div className="premium-scrollbar grid max-h-[min(58svh,520px)] min-w-0 grid-cols-1 gap-3 overflow-y-auto overscroll-contain p-5 sm:grid-cols-2">
        <Field label="Cidade">
          <select className="h-11 min-w-0 rounded-[14px] border border-input bg-white px-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10" value={filters.cidade} onChange={(event) => update("cidade", event.target.value)}>
            <option value="">Todas</option>
            {cidades.map((cidade) => <option key={cidade}>{cidade}</option>)}
          </select>
        </Field>
        <Field label="Tipo">
          <select className="h-11 min-w-0 rounded-[14px] border border-input bg-white px-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10" value={filters.tipo} onChange={(event) => update("tipo", event.target.value)}>
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
      <div className="flex shrink-0 justify-between gap-3 border-t border-border/60 bg-white p-4">
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
