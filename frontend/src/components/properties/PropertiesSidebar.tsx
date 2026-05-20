import { AnimatePresence, motion } from "framer-motion"
import { Bath, BedDouble, Car, ChevronDown, ChevronUp, Eye, Filter, Images, LoaderCircle, MapPin, Ruler, Search, Share2, X } from "lucide-react"
import type { MouseEvent, ReactNode } from "react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { Imovel } from "@/types/imovel"

interface PropertiesSidebarProps {
  imoveis: Imovel[]
  isLoading: boolean
  open: boolean
  selectedId?: number
  searchValue: string
  isSearchingProperties?: boolean
  hasSearchedProperties?: boolean
  onOpenChange: (open: boolean) => void
  onSearchChange: (value: string) => void
  onSearchClear: () => void
  filtersControl?: ReactNode
  showPointsOfInterest: boolean
  onTogglePoints: () => void
  onFocus: (imovel: Imovel) => void
}

export function PropertiesSidebar({
  imoveis,
  isLoading,
  open,
  selectedId,
  searchValue,
  isSearchingProperties = false,
  hasSearchedProperties = false,
  onOpenChange,
  onSearchChange,
  onSearchClear,
  filtersControl,
  showPointsOfInterest,
  onTogglePoints,
  onFocus,
}: PropertiesSidebarProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false)

  useEffect(() => {
    if (!open) setMobileExpanded(false)
  }, [open])

  return (
    <div className="h-full">
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, x: -22, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -22, filter: "blur(8px)" }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[820] rounded-t-[30px] border border-white/70 bg-white/94 shadow-[0_-18px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl md:relative md:inset-auto md:z-auto md:h-full md:max-h-none md:w-full md:rounded-none md:border-y-0 md:border-l-0 md:border-r md:border-border/70 md:bg-white/92 md:shadow-[16px_0_80px_rgba(0,0,0,0.06)]",
              mobileExpanded ? "h-[92dvh]" : "h-[68dvh]",
            )}
          >
            <div className="flex h-full flex-col">
              <button
                type="button"
                className="mx-auto mt-3 grid h-8 w-24 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground md:hidden"
                onClick={() => setMobileExpanded((expanded) => !expanded)}
                aria-label={mobileExpanded ? "Reduzir lista" : "Expandir lista"}
              >
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-12 rounded-full bg-border" />
                  {mobileExpanded ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
                </span>
              </button>
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
                    <ChevronDown className="size-4" />
                  </Button>
                </div>
                <SidebarSearchField
                  value={searchValue}
                  isSearching={isSearchingProperties}
                  onChange={onSearchChange}
                  onClear={onSearchClear}
                />
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {filtersControl ?? (
                    <Button variant="outline" className="h-10 rounded-full bg-white text-sm">
                      <Filter className="size-4" />
                      Filtros
                    </Button>
                  )}
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
                    {hasSearchedProperties && searchValue.trim().length >= 2 && imoveis.length === 0 ? (
                      <div className="px-5 py-8 text-sm leading-6 text-muted-foreground">
                        Nenhum imóvel encontrado para essa busca.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

function SidebarSearchField({
  value,
  isSearching,
  onChange,
  onClear,
}: {
  value: string
  isSearching: boolean
  onChange: (value: string) => void
  onClear: () => void
}) {
  const showHint = value.trim().length > 0 && value.trim().length < 2

  return (
    <div className="mt-4">
      <div className="flex h-11 items-center rounded-full border border-border/70 bg-white px-3 transition duration-200 focus-within:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10">
        <Search className="ml-1 size-4 shrink-0 text-muted-foreground" />
        <Input
          className="h-full border-0 bg-transparent px-2 text-sm shadow-none placeholder:text-muted-foreground/78 focus-visible:ring-0"
          value={value}
          placeholder="Buscar imóvel pelo nome"
          onChange={(event) => onChange(event.target.value)}
          aria-label="Buscar imóvel pelo nome"
        />
        {isSearching ? <LoaderCircle className="mr-1 size-4 shrink-0 animate-spin text-muted-foreground" /> : null}
        {value && !isSearching ? (
          <button
            type="button"
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            onClick={onClear}
            aria-label="Limpar busca de imóveis"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {showHint ? <p className="mt-2 px-1 text-xs text-muted-foreground">Digite pelo menos 2 letras para buscar.</p> : null}
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
  const propertyUrl = buildPropertyUrl(imovel.uuid)

  async function shareProperty(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    event.stopPropagation()
    const text = `Estou compartilhando com vc o link do imóvel: ${propertyUrl}`

    if (navigator.share) {
      try {
        await navigator.share({ title: imovel.title, text, url: propertyUrl })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    try {
      await navigator.clipboard.writeText(text)
      toast.success("Link do imóvel copiado")
    } catch {
      toast.error("Não foi possível compartilhar este imóvel")
    }
  }

  return (
    <motion.article
      layout
      className={cn("group bg-white transition duration-200 hover:bg-secondary/65", active && "bg-primary/[0.04]")}
      onMouseEnter={() => onFocus(imovel)}
      onFocus={() => onFocus(imovel)}
    >
      <Link to={`/imoveis/${imovel.uuid}`} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)]" onClick={() => onFocus(imovel)}>
        <div className="relative h-24 overflow-hidden rounded-[14px] bg-secondary sm:h-28">
          {image ? (
            <img src={image} alt={imovel.title} loading="lazy" className="size-full object-cover transition duration-700 group-hover:scale-[1.04]" />
          ) : (
            <div className="grid size-full place-items-center text-muted-foreground">
              <Images className="size-7" />
            </div>
          )}
        </div>

        <div className="relative min-w-0 pr-8 pb-9">
          <FavoriteButton id={imovel.id} className="absolute right-0 top-0 size-8 border border-border bg-white shadow-none" />
          <h3 className="line-clamp-2 pr-2 text-sm font-semibold leading-5 text-foreground">{imovel.title}</h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ") || "Localização sob consulta"}</span>
          </p>
          <span className="mt-1 inline-flex rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-foreground">
            {imovel.type || "Residencial"}
          </span>
          <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground min-[390px]:grid-cols-4">
            <Mini icon={Ruler} label={`${imovel.area || 0} m²`} />
            <Mini icon={BedDouble} label={`${imovel.bedrooms}`} />
            <Mini icon={Bath} label={`${imovel.bathrooms}`} />
            <Mini icon={Car} label={`${imovel.parking}`} />
          </div>
          <p className="mt-2 text-sm font-bold text-primary">{imovel.priceLabel}</p>
          <button
            type="button"
            className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full border border-border bg-white text-muted-foreground shadow-sm transition hover:border-primary/35 hover:text-primary"
            onClick={shareProperty}
            aria-label="Compartilhar imóvel"
            title="Compartilhar imóvel"
          >
            <Share2 className="size-4" />
          </button>
        </div>
      </Link>
    </motion.article>
  )
}

function buildPropertyUrl(uuid: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://maldonadocorretorimoveis.com.br"
  return `${origin}/imoveis/${uuid}`
}

function Mini({ icon: Icon, label }: { icon: typeof Ruler; label: string }) {
  return (
    <span className="flex min-w-0 items-center justify-center gap-1 rounded-full bg-secondary px-2 py-1.5">
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  )
}
