import { Bath, BedDouble, Car, Images, MapPin, Ruler } from "lucide-react"
import { motion } from "framer-motion"
import { Link, useLocation } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { cn } from "@/lib/utils"
import type { Imovel } from "@/types/imovel"

interface PropertyCardProps {
  imovel: Imovel
  active?: boolean
  onFocus?: (imovel: Imovel) => void
}

export function PropertyCard({ imovel, active, onFocus }: PropertyCardProps) {
  const image = imovel.images[0]
  const location = useLocation()
  const returnToMap = buildMapReturnPath(location.search)

  return (
    <motion.article
      layout
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "group overflow-hidden rounded-[22px] border border-transparent bg-white p-2 text-left transition-[border-color,box-shadow,background-color] duration-200",
        "hover:border-border/80 hover:shadow-[0_18px_54px_rgba(15,23,42,0.08)]",
        active && "border-primary/40 shadow-[0_24px_80px_rgba(255,56,92,0.12)]",
      )}
    >
      <Link to={`/imoveis/${imovel.uuid}`} state={{ from: returnToMap }} className="block" onClick={() => onFocus?.(imovel)}>
        <div className="relative aspect-[1.28] overflow-hidden rounded-[18px] bg-secondary">
          {image ? (
            <img
              src={image}
              alt={imovel.title}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition duration-500 group-hover:scale-[1.025]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <Images className="size-8" />
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-2">
            {imovel.isNew && <Badge className="rounded-full bg-white text-foreground hover:bg-white">Novo</Badge>}
            {imovel.isFeatured && <Badge className="rounded-full bg-primary text-white hover:bg-primary">Destaque</Badge>}
          </div>
          <FavoriteButton id={imovel.id} className="absolute right-3 top-3" />
        </div>

        <div className="space-y-3 px-1 pb-2 pt-4">
          <div className="space-y-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="line-clamp-1 text-[15px] font-semibold text-foreground">{imovel.title}</h3>
              <span className="shrink-0 text-[15px] font-semibold text-foreground">{imovel.priceLabel}</span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {[imovel.neighborhood, imovel.city].filter(Boolean).join(", ") || "Localizacao sob consulta"}
            </p>
          </div>

          <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground">
            <Feature icon={Ruler} label={`${imovel.area || 0} m²`} />
            <Feature icon={BedDouble} label={`${imovel.bedrooms}`} />
            <Feature icon={Bath} label={`${imovel.bathrooms}`} />
            <Feature icon={Car} label={`${imovel.parking}`} />
            <span className="truncate rounded-full bg-secondary px-2 py-1.5 text-center">{imovel.type}</span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}

function buildMapReturnPath(search: string) {
  const params = new URLSearchParams(search)
  params.set("map", "1")
  return `/imoveis?${params.toString()}`
}

function Feature({ icon: Icon, label }: { icon: typeof Ruler; label: string }) {
  return (
    <span className="flex items-center justify-center gap-1 rounded-full bg-secondary px-2 py-1.5">
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}
