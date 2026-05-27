import { Heart } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/AuthContext"
import { useFavorites } from "@/features/favorites/FavoritesContext"
import { cn } from "@/lib/utils"

export function FavoriteButton({ id, className }: { id: number; className?: string }) {
  const [isToggling, setIsToggling] = useState(false)
  const { isAuthenticated } = useAuth()
  const { isFavorite, toggleFavorite } = useFavorites()
  const navigate = useNavigate()
  const location = useLocation()
  const active = isFavorite(id)

  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className={cn("rounded-full bg-white/92 hover:bg-white", className)}
      disabled={isToggling}
      onClick={async (event) => {
        event.preventDefault()
        event.stopPropagation()
        if (!isAuthenticated) {
          toast.info("Entre para salvar favoritos", {
            description: "Assim sua seleção fica vinculada à sua conta.",
          })
          navigate("/login", { state: { from: location } })
          return
        }

        setIsToggling(true)
        try {
          await toggleFavorite(id)
        } catch {
          toast.error("Não foi possível atualizar favorito")
        } finally {
          setIsToggling(false)
        }
      }}
      aria-label={active ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <motion.span animate={active ? { scale: [1, 1.22, 1] } : { scale: 1 }} transition={{ duration: 0.32 }}>
        <Heart className={cn("size-4", active && "fill-primary text-primary")} />
      </motion.span>
    </Button>
  )
}
