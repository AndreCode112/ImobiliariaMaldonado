import { AnimatePresence, motion } from "framer-motion"
import { Bath, BedDouble, Car, ChevronLeft, Eye, Filter, Home, Images, MapPin, Ruler } from "lucide-react"
import { Link } from "react-router-dom"

import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Imovel } from "@/types/imovel"

interface PropertiesSidebarProps {
  imoveis: Imovel[]
  isLoading: boolean
  open: boolean
  selectedId?: number
  onOpenChange: (open: boolean) => void
  onOpenFilters: () => void
  showPointsOfInterest: boolean
  onTogglePoints: () => void
  onFocus: (imovel: Imovel) => void
}

export function PropertiesSidebar({
  imoveis,
  isLoading,
  open,
  selectedId,
  onOpenChange,
  onOpenFilters,
  showPointsOfInterest,
  onTogglePoints,
  onFocus,
}: PropertiesSidebarProps) {
  return (
    <div className="h-full">
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, x: -22, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -22, filter: "blur(8px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-[820] max-h-[76svh] rounded-t-[30px] border border-white/70 bg-white/94 shadow-[0_-18px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl md:relative md:inset-auto md:z-auto md:h-full md:max-h-none md:w-full md:rounded-none md:border-y-0 md:border-l-0 md:border-r md:border-border/70 md:bg-white/92 md:shadow-[16px_0_80px_rgba(0,0,0,0.06)]"
          >
            <div className="flex h-full flex-col">
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-border md:hidden" />
              <div className="border-b border-border/70 p-5 pt-4 md:p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="mt-1 text-xl font-semibold tracking-normal">Imóveis encontrados</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{imoveis.length} {imoveis.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}</p>
                  </div>
                  <Button variant="outline" className="hidden h-10 rounded-full bg-white px-4 text-sm md:inline-flex" onClick={() => onOpenChange(false)}>
                    Ocultar lista
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full md:hidden" onClick={() => onOpenChange(false)}>
                    <ChevronLeft className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-10 rounded-full bg-white text-sm" onClick={onOpenFilters}>
                    <Filter className="size-4" />
                    Filtros
                  </Button>
                  <Button
                    variant={showPointsOfInterest ? "default" : "outline"}
                    className="h-10 rounded-full text-sm"
                    onClick={onTogglePoints}
                  >
                    <Eye className="size-4" />
                    Pontos próximos
                  </Button>
                </div>
              </div>
              <div className="premium-scrollbar flex-1 overflow-y-auto">
                {isLoading ? <SidebarSkeleton /> : null}
                {!isLoading && (
                  <div className="divide-y divide-border/70">
                    {imoveis.map((imovel) => (
                      <SidebarPropertyItem key={imovel.id} imovel={imovel} active={selectedId === imovel.id} onFocus={onFocus} />
                    ))}
                  </div>
                )}
                {!isLoading && !imoveis.length ? <Empty /> : null}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

function SidebarSkeleton() {
  return (
    <div className="divide-y divide-border/70">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="grid grid-cols-[120px_1fr] gap-3 p-4">
          <Skeleton className="h-28 rounded-[12px]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-7 w-full rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

function SidebarPropertyItem({ imovel, active, onFocus }: { imovel: Imovel; active?: boolean; onFocus: (imovel: Imovel) => void }) {
  const image = imovel.images[0]

  return (
    <motion.article
      layout
      className={cn("group bg-white transition duration-200 hover:bg-secondary/65", active && "bg-primary/[0.04]")}
      onMouseEnter={() => onFocus(imovel)}
      onFocus={() => onFocus(imovel)}
    >
      <Link to={`/imoveis/${imovel.id}`} className="grid grid-cols-[112px_minmax(0,1fr)] gap-3 p-3" onClick={() => onFocus(imovel)}>
        <div className="relative h-28 overflow-hidden rounded-[14px] bg-secondary">
          {image ? (
            <img src={image} alt={imovel.title} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-[1.04]" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <Images className="size-7" />
            </div>
          )}
        </div>

        <div className="relative min-w-0 pr-8">
          <FavoriteButton id={imovel.id} className="absolute right-0 top-0 size-8 border border-border bg-white shadow-none" />
          <h3 className="line-clamp-2 pr-2 text-sm font-semibold leading-5 text-foreground">{imovel.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ") || "Localização sob consulta"}</span>
          </p>
          <span className="mt-1 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
            {imovel.type || "Residencial"}
          </span>
          <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px] text-muted-foreground">
            <Mini icon={Ruler} label={`${imovel.area || 0} m²`} />
            <Mini icon={BedDouble} label={`${imovel.bedrooms}`} />
            <Mini icon={Bath} label={`${imovel.bathrooms}`} />
            <Mini icon={Car} label={`${imovel.parking}`} />
          </div>
          <p className="mt-2 text-sm font-bold text-primary">{imovel.priceLabel}</p>
        </div>
      </Link>
    </motion.article>
  )
}

function Mini({ icon: Icon, label }: { icon: typeof Ruler; label: string }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1 rounded-full bg-secondary px-2 py-1.5">
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  )
}

function Empty() {
  return (
    <div className="m-4 grid min-h-80 place-items-center rounded-[26px] border border-dashed bg-white p-8 text-center">
      <div>
        <Home className="mx-auto mb-3 size-8 text-primary" />
        <h3 className="text-lg font-semibold">Nenhum imóvel encontrado</h3>
        <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou cadastre imóveis no painel administrativo.</p>
      </div>
    </div>
  )
}
