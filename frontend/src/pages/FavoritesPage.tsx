import { Heart } from "lucide-react"
import { motion } from "framer-motion"
import { Navigate, useLocation } from "react-router-dom"

import { pageTransition } from "@/animations/page"
import { PropertyCard } from "@/components/properties/PropertyCard"
import { useAuth } from "@/contexts/AuthContext"
import { useFavorites } from "@/features/favorites/FavoritesContext"
import { useImoveis } from "@/hooks/useImoveis"

export function FavoritesPage() {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const { favorites, isLoading } = useFavorites()
  const { data: imoveis = [] } = useImoveis()
  const favoritos = imoveis.filter((imovel) => favorites.has(imovel.id))

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <motion.section {...pageTransition} className="mx-auto min-h-[calc(100svh-88px)] max-w-[1180px] px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sua seleção</p>
        <h1 className="mt-2 text-3xl font-semibold">Favoritos</h1>
      </div>
      {isLoading ? (
        <div className="grid min-h-96 place-items-center rounded-[32px] border border-dashed bg-secondary p-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">Carregando seus favoritos...</p>
        </div>
      ) : favoritos.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {favoritos.map((imovel) => <PropertyCard key={imovel.id} imovel={imovel} />)}
        </div>
      ) : (
        <div className="grid min-h-96 place-items-center rounded-[32px] border border-dashed bg-secondary p-8 text-center">
          <div>
            <Heart className="mx-auto mb-4 size-9 text-primary" />
            <h2 className="text-xl font-semibold">Nenhum favorito ainda</h2>
            <p className="mt-2 text-muted-foreground">Salve imóveis para montar sua curadoria de compra.</p>
          </div>
        </div>
      )}
    </motion.section>
  )
}
