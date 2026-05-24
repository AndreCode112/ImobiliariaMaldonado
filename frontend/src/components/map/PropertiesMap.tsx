import { motion } from "framer-motion"
import { Bath, BedDouble, Camera, Car, Home, MapPin, MapPinned, Ruler, ShoppingCart, Store, TreePine, Utensils, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"

import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { Button } from "@/components/ui/button"
import { Map, MapMarker, MapPopup, MapTileLayer, MapTooltip, MapZoomControl, useMap } from "@/components/ui/map"
import type { EnderecoResultado, Imovel, PontoInteresse } from "@/types/imovel"

interface PropertiesMapProps {
  imoveis: Imovel[]
  selectedId?: number
  selectedAddress?: EnderecoResultado | null
  scrollWheelZoom?: boolean
  showPointsOfInterest?: boolean
  onSelect: (imovel: Imovel) => void
  onClearSelect?: () => void
}

const DEFAULT_CENTER: [number, number] = [-23.55052, -46.633308]
const MAP_TOUCH_HINT_KEY = "maldonado.map-touch-hint-seen"

export function PropertiesMap({ imoveis, selectedId, selectedAddress, scrollWheelZoom = true, showPointsOfInterest = false, onSelect, onClearSelect }: PropertiesMapProps) {
  const [isHoveringMap, setIsHoveringMap] = useState(false)
  const [showPontosInteresse, setShowPontosInteresse] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState(false)
  const [showTouchHint, setShowTouchHint] = useState(false)
  const visibleImoveis = imoveis.filter((imovel) => imovel.latitude !== null && imovel.longitude !== null)
  const selectedImovel = visibleImoveis.find((imovel) => imovel.id === selectedId)
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
    const first = visibleImoveis[0]
    if (first?.latitude && first.longitude) return [first.latitude, first.longitude]
    return DEFAULT_CENTER
  }, [selectedId, visibleImoveis])

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
      className="relative size-full overflow-hidden rounded-none bg-secondary [touch-action:pan-y_pinch-zoom] md:[touch-action:auto]"
      onMouseEnter={() => setIsHoveringMap(true)}
      onMouseLeave={() => setIsHoveringMap(false)}
    >
      <Map
        center={center}
        zoom={visibleImoveis.length === 1 ? 15 : visibleImoveis.length ? 13 : 11}
        className="size-full rounded-none"
        scrollWheelZoom={false}
        dragging={!isMobileLayout}
        touchZoom
        doubleClickZoom={!isMobileLayout}
      >
        <MapTileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
        />
        <MapWheelZoomController enabled={scrollWheelZoom && isHoveringMap} />
        <MapMobileTouchController mobile={isMobileLayout} />
        <MapSelectionFocus imovel={selectedImovel} mobile={isMobileLayout} />
        <MapPointsOfInterestZoomGate onChange={setShowPontosInteresse} />
        <MapExternalControls imoveis={visibleImoveis} selectedAddress={selectedAddress} />
        <MapZoomControl
          position="bottom-24 right-3 md:bottom-6 md:right-6"
          className="rounded-full bg-white/90 shadow-[0_14px_36px_rgba(0,0,0,0.14)] backdrop-blur-xl"
        />
        {selectedAddress ? <MapFlyTo address={selectedAddress} /> : null}
        {selectedAddress ? (
          <MapMarker
            position={[Number(selectedAddress.latitude), Number(selectedAddress.longitude)]}
            icon={<AddressPin />}
            iconAnchor={[18, 36]}
            tooltipAnchor={[0, -28]}
          >
            <MapTooltip className="rounded-full border-0 bg-foreground px-3 py-1 font-medium text-background shadow-lg" sideOffset={12}>
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
              <MapTooltip className="rounded-full border-0 bg-foreground px-3 py-1 font-medium text-background shadow-lg" sideOffset={12}>
                {ponto.nome}
              </MapTooltip>
            </MapMarker>
          ))
        ) : null}
        {visibleImoveis.map((imovel) => (
          <MapMarker
            key={imovel.id}
            position={[imovel.latitude as number, imovel.longitude as number]}
            icon={<HomePin />}
            iconAnchor={[21, 42]}
            popupAnchor={[0, -42]}
            eventHandlers={{ click: () => onSelect(imovel), popupopen: () => onSelect(imovel) }}
          >
            {!isMobileLayout ? (
              <MapPopup
                closeButton={false}
                closeOnClick
                className="property-map-popup w-[320px] rounded-[28px] border-0 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
              >
                <Preview imovel={imovel} />
              </MapPopup>
            ) : null}
          </MapMarker>
        ))}
      </Map>
      {isMobileLayout && showTouchHint ? (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-[142px] z-[790] -translate-x-1/2 rounded-full border border-white/80 bg-white/94 px-4 py-2 text-center text-xs font-semibold text-foreground shadow-[0_14px_42px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          Use dois dedos para aproximar o mapa
        </motion.div>
      ) : null}
      {isMobileLayout && selectedImovel ? <MobilePreview imovel={selectedImovel} onClose={onClearSelect} /> : null}
    </div>
  )
}

function MapSelectionFocus({ imovel, mobile }: { imovel?: Imovel; mobile: boolean }) {
  const map = useMap()
  const previousIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!mobile || !imovel?.latitude || !imovel.longitude) return
    if (previousIdRef.current === imovel.id) return
    previousIdRef.current = imovel.id

    const zoom = Math.max(map.getZoom(), 15)
    const markerPoint = map.project([imovel.latitude, imovel.longitude], zoom)
    const previewOffset = Math.min(190, Math.max(120, map.getSize().y * 0.22))
    const center = map.unproject(markerPoint.add([0, previewOffset]), zoom)
    map.stop()
    map.flyTo(center, zoom, { animate: true, duration: 0.45 })
  }, [imovel, map, mobile])

  return null
}

function MapMobileTouchController({ mobile }: { mobile: boolean }) {
  const map = useMap()

  useEffect(() => {
    const touchMap = map as typeof map & { tap?: { enable: () => void; disable: () => void } }
    if (mobile) {
      touchMap.tap?.disable()
      map.dragging.disable()
      map.touchZoom.enable()
      map.doubleClickZoom.disable()
      return
    }

    touchMap.tap?.enable()
    map.dragging.enable()
    map.touchZoom.enable()
    map.doubleClickZoom.enable()
  }, [map, mobile])

  return null
}

function MapPointsOfInterestZoomGate({ onChange }: { onChange: (visible: boolean) => void }) {
  const map = useMap()

  useEffect(() => {
    const minZoomToShowPoints = 13
    const syncVisibility = () => {
      onChange(map.getZoom() >= minZoomToShowPoints)
    }

    syncVisibility()
    map.on("zoomend", syncVisibility)
    return () => {
      map.off("zoomend", syncVisibility)
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
        map.flyTo(bounds[0], 16, { duration: 0.8 })
        return
      }
      map.fitBounds(bounds, { animate: true, duration: 0.8, padding: [120, 120], maxZoom: 15 })
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

function AddressPin() {
  return (
    <div className="relative grid size-9 place-items-center rounded-full border-[3px] border-white bg-zinc-950 text-white shadow-[0_18px_44px_rgba(0,0,0,0.32)]">
      <MapPin className="size-5" />
    </div>
  )
}

function HomePin() {
  return (
    <div className="grid size-11 animate-[pin-pop_420ms_ease-out] place-items-center rounded-full border-[3px] border-white bg-primary text-white shadow-[0_18px_46px_rgba(255,56,92,0.34)] transition duration-200 hover:scale-105">
      <Home className="size-5" />
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
      className="relative grid size-4 place-items-center rounded-full border border-white text-white shadow-[0_6px_14px_rgba(15,23,42,0.22)]"
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
  return (
    <div className="w-[320px] overflow-hidden rounded-[28px] bg-white">
      <div className="relative aspect-[1.45] bg-secondary">
        {imovel.images[0] ? <img src={imovel.images[0]} alt={imovel.title} className="size-full object-cover" /> : null}
        <FavoriteButton id={imovel.id} className="absolute right-4 top-4 z-10" />
      </div>
      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-1 text-center text-base font-semibold">{imovel.title}</h3>
          <p className="text-center text-sm text-muted-foreground">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ")}</p>
        </div>
        <div className="flex items-center justify-between text-sm font-semibold">
          <span>{imovel.priceLabel}</span>
          <span className="text-xs font-medium text-muted-foreground">{imovel.type}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-xs text-muted-foreground">
          <Mini icon={Ruler} label={`${imovel.area} m²`} />
          <Mini icon={BedDouble} label={`${imovel.bedrooms}`} />
          <Mini icon={Bath} label={`${imovel.bathrooms}`} />
          <Mini icon={Car} label={`${imovel.parking}`} />
        </div>
        <Button asChild className="h-11 w-full rounded-full">
          <Link to={`/imoveis/${imovel.uuid}`}>Ver detalhes</Link>
        </Button>
      </div>
    </div>
  )
}

function MobilePreview({ imovel, onClose }: { imovel: Imovel; onClose?: () => void }) {
  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) {
    if (info.offset.y > 70 || info.velocity.y > 620) onClose?.()
  }

  return (
    <motion.div
      className="absolute inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[880] overflow-hidden rounded-[24px] border border-border/70 bg-white/96 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl md:hidden"
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
          <div className="mt-2 grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
            <Mini icon={Ruler} label={`${imovel.area} m²`} />
            <Mini icon={BedDouble} label={`${imovel.bedrooms}`} />
            <Mini icon={Bath} label={`${imovel.bathrooms}`} />
            <Mini icon={Car} label={`${imovel.parking}`} />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto] gap-2 border-t border-border/70 p-3">
        <Button asChild className="h-11 rounded-full">
          <Link to={`/imoveis/${imovel.uuid}`}>Ver detalhes</Link>
        </Button>
        <FavoriteButton id={imovel.id} className="size-11 border border-border bg-white shadow-none" />
      </div>
    </motion.div>
  )
}

function Mini({ icon: Icon, label }: { icon: typeof Ruler; label: string }) {
  return (
    <span className="flex items-center justify-center gap-1 rounded-full bg-secondary px-2 py-1">
      <Icon className="size-3" />
      {label}
    </span>
  )
}
