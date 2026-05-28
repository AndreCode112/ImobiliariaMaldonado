import { motion } from "framer-motion"
import { Bath, BedDouble, Camera, Car, Home, List, MapPin, MapPinned, Ruler, ShoppingCart, Store, TreePine, Utensils, Wallet, X, type LucideIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"

import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { Button } from "@/components/ui/button"
import { Map, MapLayers, MapMarker, MapMarkerClusterGroup, MapPopup, MapTileLayer, MapTileLayerSegmentedControl, MapTooltip, MapZoomControl, useMap } from "@/components/ui/map"
import { cn } from "@/lib/utils"
import type { EnderecoResultado, Imovel, PontoInteresse } from "@/types/imovel"

interface PropertiesMapProps {
  imoveis: Imovel[]
  selectedId?: number
  selectedAddress?: EnderecoResultado | null
  cityTarget?: {
    city: string
    center?: [number, number]
    bounds?: [number, number][]
  } | null
  scrollWheelZoom?: boolean
  showPointsOfInterest?: boolean
  mobileDragEnabled?: boolean
  initialView?: { center: [number, number]; zoom: number } | null
  onSelect: (imovel: Imovel) => void
  onClearSelect?: () => void
  onShowInList?: (imovel: Imovel) => void
  onViewChange?: (view: { center: [number, number]; zoom: number }) => void
}

const DEFAULT_CENTER: [number, number] = [-23.55052, -46.633308]
const MAP_TOUCH_HINT_KEY = "maldonado.map-touch-hint-seen"

export function PropertiesMap({
  imoveis,
  selectedId,
  selectedAddress,
  cityTarget,
  scrollWheelZoom = true,
  showPointsOfInterest = false,
  mobileDragEnabled = false,
  initialView,
  onSelect,
  onClearSelect,
  onShowInList,
  onViewChange,
}: PropertiesMapProps) {
  const [isHoveringMap, setIsHoveringMap] = useState(false)
  const [showPontosInteresse, setShowPontosInteresse] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [showTouchHint, setShowTouchHint] = useState(false)
  const visibleImoveis = imoveis.filter((imovel) => imovel.latitude !== null && imovel.longitude !== null)
  const selectedImovel = visibleImoveis.find((imovel) => imovel.id === selectedId)
  const visibleMarkerKey = useMemo(() => visibleImoveis.map((imovel) => imovel.id).sort((a, b) => a - b).join("-") || "empty", [visibleImoveis])
  const pontosInteresse = useMemo(() => {
    const unique = new globalThis.Map<string, PontoInteresse>()
    visibleImoveis.forEach((imovel) => {
      imovel.pointsOfInterest.forEach((ponto) => {
        unique.set(`${ponto.categoria}:${ponto.id}`, ponto)
      })
    })
    return Array.from(unique.values()).filter((ponto) => Number.isFinite(ponto.lat) && Number.isFinite(ponto.lng))
  }, [visibleImoveis])
  const center = useMemo<[number, number]>(() => {
    const selected = visibleImoveis.find((imovel) => imovel.id === selectedId)
    if (selected?.latitude && selected.longitude) return [selected.latitude, selected.longitude]
    if (initialView?.center) return initialView.center
    const first = visibleImoveis[0]
    if (first?.latitude && first.longitude) return [first.latitude, first.longitude]
    return DEFAULT_CENTER
  }, [initialView, selectedId, visibleImoveis])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobileLayout(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!isMobileLayout || typeof window === "undefined") return
    if (window.localStorage.getItem(MAP_TOUCH_HINT_KEY)) return
    setShowTouchHint(true)
    window.localStorage.setItem(MAP_TOUCH_HINT_KEY, "1")
    const timeout = window.setTimeout(() => setShowTouchHint(false), 5200)
    return () => window.clearTimeout(timeout)
  }, [isMobileLayout])

  return (
    <div
      className={mobileDragEnabled ? "relative size-full overflow-hidden rounded-none bg-secondary [touch-action:none] md:[touch-action:auto]" : "relative size-full overflow-hidden rounded-none bg-secondary [touch-action:pan-y_pinch-zoom] md:[touch-action:auto]"}
      onMouseEnter={() => setIsHoveringMap(true)}
      onMouseLeave={() => setIsHoveringMap(false)}
    >
      <Map
        center={center}
        zoom={initialView?.zoom ?? (visibleImoveis.length === 1 ? 15 : visibleImoveis.length ? 13 : 11)}
        className="size-full rounded-none"
        scrollWheelZoom={false}
        dragging={!isMobileLayout || mobileDragEnabled}
        touchZoom
        doubleClickZoom={!isMobileLayout}
      >
        <MapViewportStabilizer />
        <MapLayers defaultTileLayer="Mapa">
          <MapTileLayer
            name="Mapa"
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
            keepBuffer={8}
            updateWhenIdle={false}
            updateWhenZooming
          />
          <MapTileLayer
            name="Satélite"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri"
            keepBuffer={8}
            updateWhenIdle={false}
            updateWhenZooming
          />
          <MapTileLayerSegmentedControl
            position="bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-3 md:bottom-auto md:top-20 md:right-6"
          />
        </MapLayers>
        <MapWheelZoomController enabled={scrollWheelZoom && isHoveringMap} />
        <MapMobileTouchController mobile={isMobileLayout} dragEnabled={mobileDragEnabled} />
        <MapViewReporter onChange={onViewChange} />
        <MapCityFilterFocus target={cityTarget} mobile={isMobileLayout} />
        <MapPointsOfInterestZoomGate onChange={setShowPontosInteresse} />
        <MapExternalControls imoveis={visibleImoveis} selectedAddress={selectedAddress} />
        <MapZoomControl
          position="bottom-24 right-3 md:bottom-6 md:right-6"
          className="rounded-full bg-white/90"
        />
        {cityTarget?.city ? (
          <div className="pointer-events-none absolute left-3 top-[126px] z-[760] max-w-[calc(100vw-1.5rem)] truncate rounded-full border border-border/70 bg-white/94 px-4 py-2 text-sm font-bold text-foreground max-[380px]:top-[114px] max-[380px]:px-3 max-[380px]:py-1.5 max-[380px]:text-xs md:left-5 md:top-5">
            {cityTarget.city}
          </div>
        ) : null}
        {selectedAddress ? <MapFlyTo address={selectedAddress} /> : null}
        {selectedAddress ? (
          <MapMarker
            position={[Number(selectedAddress.latitude), Number(selectedAddress.longitude)]}
            icon={<AddressPin />}
            iconAnchor={[18, 36]}
            tooltipAnchor={[0, -28]}
          >
            <MapTooltip className="rounded-full border-0 bg-foreground px-3 py-1 font-medium text-background" sideOffset={12}>
              {addressTitle(selectedAddress)}
            </MapTooltip>
          </MapMarker>
        ) : null}
        {showPointsOfInterest && showPontosInteresse ? (
          pontosInteresse.map((ponto) => (
            <MapMarker
              key={`${ponto.categoria}-${ponto.id}`}
              position={[ponto.lat, ponto.lng]}
              icon={<PontoInteressePin categoria={ponto.categoria} />}
              iconAnchor={[12, 24]}
              tooltipAnchor={[0, -22]}
            >
              <MapTooltip className="rounded-full border-0 bg-foreground px-3 py-1 font-medium text-background" sideOffset={12}>
                {ponto.nome}
              </MapTooltip>
            </MapMarker>
          ))
        ) : null}
        <MapMarkerClusterGroup
          key={visibleMarkerKey}
          chunkedLoading
          maxClusterRadius={42}
          disableClusteringAtZoom={17}
          removeOutsideVisibleBounds
          showCoverageOnHover={false}
          icon={(count) => <ClusterPin count={count} />}
        >
          {visibleImoveis.map((imovel) => (
            <MapMarker
              key={imovel.id}
              position={[imovel.latitude as number, imovel.longitude as number]}
              icon={<HomePin active={imovel.id === selectedId} />}
              iconAnchor={[20, 40]}
              popupAnchor={[0, -40]}
              riseOnHover={false}
              riseOffset={0}
              eventHandlers={{
                click: (event) => {
                  onSelect(imovel)
                  if (!isMobileLayout) event.target.openPopup()
                },
                popupopen: () => onSelect(imovel),
              }}
            >
              {!isMobileLayout ? (
                <MapPopup
                  closeButton={false}
                  closeOnClick
                  autoPan={false}
                  className="property-map-popup w-[340px] rounded-[24px] border-0 bg-white p-0"
                >
                  <Preview imovel={imovel} />
                </MapPopup>
              ) : null}
            </MapMarker>
          ))}
        </MapMarkerClusterGroup>
      </Map>
      {isMobileLayout && showTouchHint ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[142px] z-[790] -translate-x-1/2 rounded-full border border-white/80 bg-white/94 px-4 py-2 text-center text-xs font-semibold text-foreground"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          Use dois dedos para aproximar o mapa
        </motion.div>
      ) : null}
      {isMobileLayout && selectedImovel ? <MobilePreview imovel={selectedImovel} onClose={onClearSelect} onShowInList={onShowInList} /> : null}
    </div>
  )
}

function MapViewportStabilizer() {
  const map = useMap()

  useEffect(() => {
    let frame = 0
    const invalidate = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        map.invalidateSize({ animate: false, pan: false })
      })
    }

    const container = map.getContainer()
    invalidate()
    const timeouts = [120, 320, 680, 1100].map((delay) => window.setTimeout(invalidate, delay))
    const observer = new ResizeObserver(invalidate)
    observer.observe(container)

    window.addEventListener("resize", invalidate)
    window.addEventListener("orientationchange", invalidate)
    document.addEventListener("visibilitychange", invalidate)
    map.on("zoomend moveend", invalidate)

    return () => {
      window.cancelAnimationFrame(frame)
      timeouts.forEach((timeout) => window.clearTimeout(timeout))
      observer.disconnect()
      window.removeEventListener("resize", invalidate)
      window.removeEventListener("orientationchange", invalidate)
      document.removeEventListener("visibilitychange", invalidate)
      map.off("zoomend moveend", invalidate)
    }
  }, [map])

  return null
}

function MapCityFilterFocus({
  target,
  mobile,
}: {
  target?: {
    city: string
    center?: [number, number]
    bounds?: [number, number][]
  } | null
  mobile: boolean
}) {
  const map = useMap()
  const previousCityRef = useRef("")

  useEffect(() => {
    if (!target?.city) return
    const cityKey = target.city.trim().toLocaleLowerCase("pt-BR")
    if (!cityKey || previousCityRef.current === cityKey) return
    previousCityRef.current = cityKey

    map.stop()
    if (target.bounds?.length) {
      map.fitBounds(target.bounds, {
        animate: false,
        maxZoom: mobile ? 14 : 15,
        paddingTopLeft: mobile ? [34, 110] : [90, 110],
        paddingBottomRight: mobile ? [34, 170] : [90, 90],
      })
      return
    }

    if (target.center) {
      map.setView(target.center, Math.max(map.getZoom(), 13), { animate: false })
    }
  }, [map, mobile, target])

  return null
}

function MapMobileTouchController({ mobile, dragEnabled }: { mobile: boolean; dragEnabled: boolean }) {
  const map = useMap()

  useEffect(() => {
    const touchMap = map as typeof map & { tap?: { enable: () => void; disable: () => void } }
    if (mobile) {
      touchMap.tap?.disable()
      if (dragEnabled) map.dragging.enable()
      else map.dragging.disable()
      map.touchZoom.enable()
      map.doubleClickZoom.disable()
      return
    }

    touchMap.tap?.enable()
    map.dragging.enable()
    map.touchZoom.enable()
    map.doubleClickZoom.enable()
  }, [dragEnabled, map, mobile])

  return null
}

function MapViewReporter({ onChange }: { onChange?: (view: { center: [number, number]; zoom: number }) => void }) {
  const map = useMap()

  useEffect(() => {
    if (!onChange) return
    const report = () => {
      const center = map.getCenter()
      onChange({ center: [center.lat, center.lng], zoom: map.getZoom() })
    }
    map.on("moveend zoomend", report)
    return () => {
      map.off("moveend zoomend", report)
    }
  }, [map, onChange])

  return null
}

function MapPointsOfInterestZoomGate({ onChange }: { onChange: (visible: boolean) => void }) {
  const map = useMap()

  useEffect(() => {
    const minZoomToShowPoints = 16
    const baseZoom = map.getZoom()
    let zoomInSteps = 0
    let wheelZoomInGestures = 0
    const syncVisibility = () => {
      const touchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches
      const hasIntentionalZoom = touchDevice ? zoomInSteps >= 3 : wheelZoomInGestures >= 3
      onChange(map.getZoom() >= minZoomToShowPoints && hasIntentionalZoom)
    }
    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY < 0) {
        wheelZoomInGestures = Math.min(3, wheelZoomInGestures + 1)
      }
    }
    const handleZoomEnd = () => {
      zoomInSteps = Math.max(zoomInSteps, Math.round(map.getZoom() - baseZoom))
      syncVisibility()
    }

    const container = map.getContainer()
    syncVisibility()
    container.addEventListener("wheel", handleWheel, { passive: true })
    map.on("zoomend", handleZoomEnd)
    return () => {
      container.removeEventListener("wheel", handleWheel)
      map.off("zoomend", handleZoomEnd)
    }
  }, [map, onChange])

  return null
}

function MapWheelZoomController({ enabled }: { enabled: boolean }) {
  const map = useMap()

  useEffect(() => {
    const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches
    if (enabled && !isTouchDevice) {
      map.scrollWheelZoom.enable()
    } else {
      map.scrollWheelZoom.disable()
    }

    return () => {
      map.scrollWheelZoom.disable()
    }
  }, [enabled, map])

  return null
}

function MapExternalControls({ imoveis, selectedAddress }: { imoveis: Imovel[]; selectedAddress?: EnderecoResultado | null }) {
  const map = useMap()

  useEffect(() => {
    const fitImoveis = () => {
      const bounds = imoveis
        .filter((imovel) => imovel.latitude !== null && imovel.longitude !== null)
        .map((imovel) => [imovel.latitude as number, imovel.longitude as number] as [number, number])

      if (!bounds.length) return
      if (bounds.length === 1) {
        map.setView(bounds[0], 16, { animate: false })
        return
      }
      map.fitBounds(bounds, { animate: false, padding: [120, 120], maxZoom: 15 })
    }
    const zoomIn = () => map.zoomIn()
    const zoomOut = () => map.zoomOut()
    const flyToAddress = () => {
      if (!selectedAddress) return
      const latitude = Number(selectedAddress.latitude)
      const longitude = Number(selectedAddress.longitude)
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
      map.stop()
      map.setView([latitude, longitude], Math.max(map.getZoom(), 15), { animate: true, duration: 0.35 })
    }

    window.addEventListener("maldonado:fit-imoveis", fitImoveis)
    window.addEventListener("maldonado:zoom-in", zoomIn)
    window.addEventListener("maldonado:zoom-out", zoomOut)
    window.addEventListener("maldonado:fly-address", flyToAddress)
    return () => {
      window.removeEventListener("maldonado:fit-imoveis", fitImoveis)
      window.removeEventListener("maldonado:zoom-in", zoomIn)
      window.removeEventListener("maldonado:zoom-out", zoomOut)
      window.removeEventListener("maldonado:fly-address", flyToAddress)
    }
  }, [imoveis, map, selectedAddress])

  return null
}

function MapFlyTo({ address }: { address: EnderecoResultado }) {
  const map = useMap()
  const previousTargetRef = useRef("")

  useEffect(() => {
    const latitude = Number(address.latitude)
    const longitude = Number(address.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return

    const target = `${latitude.toFixed(7)}:${longitude.toFixed(7)}`
    if (previousTargetRef.current === target) return
    previousTargetRef.current = target

    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 0.6,
    })
  }, [address, map])

  return null
}

function addressTitle(address: EnderecoResultado) {
  return address.address?.road || address.address?.pedestrian || address.address?.suburb || address.address?.city || address.display_name.split(",")[0] || "Endereço"
}

function compactLocation(parts: string[]) {
  const uniqueParts: string[] = []
  parts.forEach((part) => {
    const cleanPart = part.trim()
    if (!cleanPart) return
    const normalized = normalizeText(cleanPart)
    if (uniqueParts.some((item) => normalizeText(item) === normalized)) return
    uniqueParts.push(cleanPart)
  })
  return uniqueParts.join(", ")
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

function AddressPin() {
  return (
    <div className="relative grid size-9 place-items-center rounded-full border-2 border-white bg-zinc-900 text-white">
      <MapPin className="size-5" />
    </div>
  )
}

function HomePin({ active = false }: { active?: boolean }) {
  return (
    <div className={`grid size-10 place-items-center rounded-full border-2 border-white bg-primary text-white ${active ? "border-primary" : ""}`}>
      <Home className="size-[18px]" />
    </div>
  )
}

function ClusterPin({ count }: { count: number }) {
  return (
    <div className="grid size-10 place-items-center rounded-full border-2 border-white bg-foreground text-sm font-bold text-white">
      {count}
    </div>
  )
}

function PontoInteressePin({ categoria }: { categoria: string }) {
  const category = categoria || "servico"
  const config = {
    restaurante: { icon: Utensils, color: "#ef7d22" },
    mercado: { icon: ShoppingCart, color: "#15803d" },
    loja: { icon: Store, color: "#7c3aed" },
    turismo: { icon: Camera, color: "#2563eb" },
    parque: { icon: TreePine, color: "#65a30d" },
    servico: { icon: MapPinned, color: "#64748b" },
  }[category] ?? { icon: MapPinned, color: "#64748b" }
  const Icon = config.icon

  return (
    <div
      className="relative grid size-4 place-items-center rounded-full border border-white text-white"
      style={{ backgroundColor: config.color }}
    >
      <Icon className="size-2.5" strokeWidth={3} />
      <span
        className="absolute -bottom-0.5 left-1/2 size-1.5 -translate-x-1/2 rotate-45 rounded-[1px]"
        style={{ backgroundColor: config.color }}
      />
    </div>
  )
}

function Preview({ imovel }: { imovel: Imovel }) {
  const location = compactLocation([imovel.neighborhood, imovel.city])
  const routerLocation = useLocation()
  const returnToMap = buildMapReturnPath(routerLocation.search)

  return (
    <div className="w-[340px] overflow-hidden rounded-[24px] bg-white">
      <div className="relative aspect-[1.48] bg-secondary">
        {imovel.images[0] ? (
          <img src={imovel.images[0]} alt={imovel.title} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center bg-secondary text-muted-foreground">
            <Home className="size-10" />
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-black/28 p-3">
          <span className="rounded-full bg-white/94 px-3 py-1 text-xs font-bold text-foreground">
            {imovel.type || "Imóvel"}
          </span>
          <FavoriteButton id={imovel.id} className="z-10 border-0 bg-white/94" />
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/58 px-3 py-1 text-xs font-semibold text-white">
          <Camera className="size-3.5" />
          {imovel.images.length}
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="space-y-3">
          <h3 className="line-clamp-2 text-left text-base font-semibold leading-5 text-foreground">{imovel.title}</h3>
          <div className="grid gap-2">
            {location ? (
              <InfoLine icon={MapPin} value={location} />
            ) : null}
            <InfoLine icon={Wallet} value={imovel.priceLabel} strong />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 text-xs text-muted-foreground">
          <Mini icon={Ruler} label={`${imovel.area} m²`} />
          <Mini icon={BedDouble} label={`${imovel.bedrooms}`} />
          <Mini icon={Bath} label={`${imovel.bathrooms}`} />
          <Mini icon={Car} label={`${imovel.parking}`} />
        </div>

        <Button asChild className="h-11 w-full rounded-full">
          <Link to={`/imoveis/${imovel.uuid}`} state={{ from: returnToMap }}>Ver detalhes</Link>
        </Button>
      </div>
    </div>
  )
}

function InfoLine({ icon: Icon, value, strong = false }: { icon: LucideIcon; value: string; strong?: boolean }) {
  return (
    <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center gap-2 text-left">
      <span className={cn("grid size-5 place-items-center rounded-full", strong ? "bg-primary/10 text-primary" : "bg-secondary text-primary")}>
        <Icon className="size-3.5" strokeWidth={2.4} />
      </span>
      <span className={cn("block min-w-0 truncate leading-5", strong ? "text-base font-bold text-foreground" : "text-sm text-muted-foreground")} title={value}>
        {value}
      </span>
    </div>
  )
}

function MobilePreview({ imovel, onClose, onShowInList }: { imovel: Imovel; onClose?: () => void; onShowInList?: (imovel: Imovel) => void }) {
  const routerLocation = useLocation()
  const returnToMap = buildMapReturnPath(routerLocation.search)

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) {
    if (info.offset.y > 70 || info.velocity.y > 620) onClose?.()
  }

  return (
    <motion.div
      className="absolute inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[880] overflow-hidden rounded-[24px] border border-border/70 bg-white/96 md:hidden"
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.04, bottom: 0.24 }}
      onDragEnd={handleDragEnd}
      initial={{ opacity: 0, y: 22, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 22, scale: 0.98 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto mt-2 h-1 w-11 rounded-full bg-border" />
      <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-3 p-3">
        <div className="relative h-28 overflow-hidden rounded-[18px] bg-secondary">
          {imovel.images[0] ? <img src={imovel.images[0]} alt={imovel.title} className="size-full object-cover" /> : null}
        </div>
        <div className="relative min-w-0 pr-8">
          {onClose ? (
            <button
              type="button"
              className="absolute right-0 top-0 grid size-8 place-items-center rounded-full border border-border bg-white text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              onClick={onClose}
              aria-label="Fechar imóvel selecionado"
            >
              <X className="size-4" />
            </button>
          ) : null}
          <h3 className="line-clamp-2 pr-1 text-sm font-semibold leading-5">{imovel.title}</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ")}</p>
          <p className="mt-2 text-sm font-bold text-primary">{imovel.priceLabel}</p>
          <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
            <Mini icon={Ruler} label={`${imovel.area} m²`} />
            <Mini icon={BedDouble} label={`${imovel.bedrooms}`} />
            <Mini icon={Bath} label={`${imovel.bathrooms}`} />
            <Mini icon={Car} label={`${imovel.parking}`} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-border/70 p-3">
        <Button asChild className="h-11 rounded-full">
          <Link to={`/imoveis/${imovel.uuid}`} state={{ from: returnToMap }}>Ver detalhes</Link>
        </Button>
        {onShowInList ? (
          <Button type="button" variant="outline" className="size-11 rounded-full border-border bg-white px-0" onClick={() => onShowInList(imovel)} aria-label="Ver imóvel na lista">
            <List className="size-4" />
          </Button>
        ) : null}
        <FavoriteButton id={imovel.id} className="size-11 border border-border bg-white" />
      </div>
    </motion.div>
  )
}

function Mini({ icon: Icon, label }: { icon: typeof Ruler; label: string }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-0.5 rounded-full bg-secondary px-1.5 py-1">
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function buildMapReturnPath(search: string) {
  const params = new URLSearchParams(search)
  params.set("map", "1")
  return `/imoveis?${params.toString()}`
}
