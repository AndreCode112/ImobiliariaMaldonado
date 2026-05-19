import { ArrowLeft, Heart } from "lucide-react"
import { motion } from "framer-motion"
import { Link, Navigate, useLocation } from "react-router-dom"

import { pageTransition } from "@/animations/page"
import { AccountMenuButton } from "@/components/layout/PremiumHeader"
import { Button } from "@/components/ui/button"
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
    <motion.section {...pageTransition} className="min-h-svh bg-white px-4 py-20 sm:px-6 md:py-24">
      <PageTopControls />
      <div className="mx-auto min-w-0 max-w-[1180px]">
      <div className="mb-8 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Sua seleção</p>
        <h1 className="mt-2 break-words text-3xl font-semibold">Favoritos</h1>
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
      </div>
    </motion.section>
  )
}

function PageTopControls() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex items-center justify-between px-4 py-4 md:px-8">
      <Button
        asChild
        variant="outline"
        className="pointer-events-auto size-11 rounded-full border-border/80 bg-white/82 px-0 shadow-[0_18px_50px_rgba(0,0,0,0.10)] backdrop-blur-xl hover:bg-white"
      >
        <Link to="/" aria-label="Voltar para a página inicial">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <AccountMenuButton
        wrapperClassName="pointer-events-auto block"
        className="inline-flex border-border/80 bg-white/82 shadow-[0_18px_50px_rgba(0,0,0,0.10)] backdrop-blur-xl hover:bg-white"
        menuClassName="top-[calc(100%+10px)]"
      />
    </div>
  )
}
