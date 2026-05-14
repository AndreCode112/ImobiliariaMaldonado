import { Bath, BedDouble, Camera, Car, Home, LocateFixed, MapPin, MapPinned, Maximize2, Ruler, RotateCcw, ShoppingCart, Store, TreePine, Utensils } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"

import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { Button } from "@/components/ui/button"
import { Map, MapControlContainer, MapMarker, MapMarkerClusterGroup, MapPopup, MapTileLayer, MapTooltip, MapZoomControl, useMap } from "@/components/ui/map"
import type { EnderecoResultado, Imovel, PontoInteresse } from "@/types/imovel"

interface PropertiesMapProps {
  imoveis: Imovel[]
  selectedId?: number
  selectedAddress?: EnderecoResultado | null
  scrollWheelZoom?: boolean
  onSelect: (imovel: Imovel) => void
}

const DEFAULT_CENTER: [number, number] = [-23.55052, -46.633308]

export function PropertiesMap({ imoveis, selectedId, selectedAddress, scrollWheelZoom = true, onSelect }: PropertiesMapProps) {
  const [isHoveringMap, setIsHoveringMap] = useState(false)
  const visibleImoveis = imoveis.filter((imovel) => imovel.latitude !== null && imovel.longitude !== null)
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

  return (
    <div
      className="relative size-full overflow-hidden rounded-none bg-secondary"
      onMouseEnter={() => setIsHoveringMap(true)}
      onMouseLeave={() => setIsHoveringMap(false)}
    >
      <Map center={center} zoom={visibleImoveis.length ? 13 : 11} className="size-full rounded-none" scrollWheelZoom={false}>
        <MapTileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
        />
        <MapWheelZoomController enabled={scrollWheelZoom && isHoveringMap} />
        <MapZoomControl position="top-5 right-5" className="rounded-full border bg-white/90 shadow-lg backdrop-blur" />
        <MapFitControls imoveis={visibleImoveis} selectedAddress={selectedAddress} />
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
        {pontosInteresse.map((ponto) => (
          <MapMarker
            key={`${ponto.categoria}-${ponto.id}`}
            position={[ponto.lat, ponto.lng]}
            icon={<PontoInteressePin categoria={ponto.categoria} />}
            iconAnchor={[8, 8]}
            tooltipAnchor={[0, -8]}
          >
            <MapTooltip className="rounded-full border-0 bg-foreground px-3 py-1 font-medium text-background shadow-lg" sideOffset={12}>
              {ponto.nome}
            </MapTooltip>
          </MapMarker>
        ))}
        <MapMarkerClusterGroup icon={(count) => <ClusterPin count={count} />}>
          {visibleImoveis.map((imovel) => (
            <MapMarker
              key={imovel.id}
              position={[imovel.latitude as number, imovel.longitude as number]}
              icon={<HomePin />}
              iconAnchor={[21, 42]}
              popupAnchor={[0, -42]}
              eventHandlers={{ popupopen: () => onSelect(imovel) }}
            >
              <MapPopup
                closeButton={false}
                closeOnClick
                className="property-map-popup w-[320px] rounded-[28px] border-0 bg-white p-0 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
              >
                <Preview imovel={imovel} />
              </MapPopup>
            </MapMarker>
          ))}
        </MapMarkerClusterGroup>
      </Map>
      {scrollWheelZoom && isHoveringMap ? (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-[650] hidden -translate-x-1/2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-xs font-semibold text-foreground shadow-[0_12px_34px_rgba(0,0,0,0.12)] backdrop-blur-xl md:block">
          Use o scroll para aproximar ou afastar
        </div>
      ) : null}
      {!visibleImoveis.length && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center bg-white/55 p-6 backdrop-blur-sm">
          <div className="max-w-sm rounded-[28px] border bg-white p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
            <Home className="mx-auto mb-3 size-8 text-primary" />
            <h3 className="text-lg font-semibold">Nenhum imóvel com mapa</h3>
            <p className="mt-1 text-sm text-muted-foreground">Assim que a API retornar imóveis com latitude e longitude, os pins aparecem aqui.</p>
          </div>
        </div>
      )}
    </div>
  )
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

function MapFitControls({ imoveis, selectedAddress }: { imoveis: Imovel[]; selectedAddress?: EnderecoResultado | null }) {
  const map = useMap()

  function fitImoveis() {
    const bounds = imoveis
      .filter((imovel) => imovel.latitude !== null && imovel.longitude !== null)
      .map((imovel) => [imovel.latitude as number, imovel.longitude as number] as [number, number])

    if (!bounds.length) return
    if (bounds.length === 1) {
      map.flyTo(bounds[0], Math.max(map.getZoom(), 15), { duration: 0.9 })
      return
    }
    map.fitBounds(bounds, { animate: true, duration: 0.9, padding: [84, 84], maxZoom: 15 })
  }

  function flyToAddress() {
    if (!selectedAddress) return
    const latitude = Number(selectedAddress.latitude)
    const longitude = Number(selectedAddress.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), { duration: 0.9 })
  }

  return (
    <MapControlContainer className="bottom-24 right-6 flex flex-col gap-2 md:bottom-28 md:right-8">
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="rounded-full border bg-white/92 shadow-[0_12px_34px_rgba(0,0,0,0.14)] backdrop-blur"
        onClick={fitImoveis}
        disabled={!imoveis.length}
        aria-label="Centralizar imóveis"
        title="Centralizar imóveis"
      >
        <LocateFixed className="size-4" />
      </Button>
      {selectedAddress ? (
        <Button
          type="button"
          size="icon-sm"
          variant="secondary"
          className="rounded-full border bg-white/92 shadow-[0_12px_34px_rgba(0,0,0,0.14)] backdrop-blur"
          onClick={flyToAddress}
          aria-label="Voltar ao endereço buscado"
          title="Voltar ao endereço buscado"
        >
          <RotateCcw className="size-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        size="icon-sm"
        variant="secondary"
        className="rounded-full border bg-white/92 shadow-[0_12px_34px_rgba(0,0,0,0.14)] backdrop-blur md:hidden"
        onClick={() => map.toggleFullscreen()}
        aria-label="Abrir mapa em tela cheia"
        title="Abrir mapa em tela cheia"
      >
        <Maximize2 className="size-4" />
      </Button>
    </MapControlContainer>
  )
}

function MapFlyTo({ address }: { address: EnderecoResultado }) {
  const map = useMap()

  useEffect(() => {
    const latitude = Number(address.latitude)
    const longitude = Number(address.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return
    map.flyTo([latitude, longitude], Math.max(map.getZoom(), 15), {
      animate: true,
      duration: 1.2,
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
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-zinc-950/30" />
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

function ClusterPin({ count }: { count: number }) {
  return (
    <div className="grid size-11 place-items-center rounded-full border-4 border-white bg-primary text-sm font-bold text-white shadow-[0_18px_46px_rgba(255,56,92,0.34)]">
      {count}
    </div>
  )
}

function PontoInteressePin({ categoria }: { categoria: string }) {
  const category = categoria || "servico"
  const config = {
    restaurante: { icon: Utensils, className: "bg-amber-500 text-white shadow-amber-500/25" },
    mercado: { icon: ShoppingCart, className: "bg-emerald-500 text-white shadow-emerald-500/25" },
    loja: { icon: Store, className: "bg-sky-500 text-white shadow-sky-500/25" },
    turismo: { icon: Camera, className: "bg-violet-500 text-white shadow-violet-500/25" },
    parque: { icon: TreePine, className: "bg-lime-600 text-white shadow-lime-600/25" },
    servico: { icon: MapPinned, className: "bg-zinc-700 text-white shadow-zinc-700/25" },
  }[category] ?? { icon: MapPinned, className: "bg-zinc-700 text-white shadow-zinc-700/25" }
  const Icon = config.icon

  return (
    <div className={`grid size-4 place-items-center rounded-full border border-white shadow-[0_8px_18px_var(--tw-shadow-color)] ${config.className}`}>
      <Icon className="size-2.5" />
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
          <Link to={`/imoveis/${imovel.id}`}>Ver detalhes</Link>
        </Button>
      </div>
    </div>
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
