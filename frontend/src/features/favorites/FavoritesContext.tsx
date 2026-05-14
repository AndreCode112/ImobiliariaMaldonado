import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react"

import { useAuth } from "@/contexts/AuthContext"
import { imoveisService } from "@/services/imoveisService"

const LEGACY_FAVORITES_KEY = "maldonado.favorites"

interface FavoritesContextValue {
  favorites: Set<number>
  isLoading: boolean
  isFavorite: (id: number) => boolean
  toggleFavorite: (id: number) => Promise<void>
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, session } = useAuth()
  const queryClient = useQueryClient()
  const queryKey = useMemo(() => ["favorites", session?.user.id] as const, [session?.user.id])

  useEffect(() => {
    localStorage.removeItem(LEGACY_FAVORITES_KEY)
  }, [])

  const { data = [], isLoading } = useQuery({
    queryKey,
    queryFn: imoveisService.favoritos,
    enabled: isAuthenticated,
    staleTime: 30_000,
  })

  const favorites = useMemo(() => new Set(data), [data])

  const mutation = useMutation({
    mutationFn: async (id: number) => {
      if (favorites.has(id)) await imoveisService.removeFavorito(id)
      else await imoveisService.addFavorito(id)
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<number[]>(queryKey) ?? []
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      queryClient.setQueryData(queryKey, [...next])
      return { previous }
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const value = useMemo<FavoritesContextValue>(
    () => ({
      favorites: isAuthenticated ? favorites : new Set<number>(),
      isLoading: isAuthenticated && isLoading,
      isFavorite: (id) => isAuthenticated && favorites.has(id),
      toggleFavorite: async (id) => {
        if (!isAuthenticated) return
        await mutation.mutateAsync(id)
      },
    }),
    [favorites, isAuthenticated, isLoading, mutation],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const context = useContext(FavoritesContext)
  if (!context) {
    throw new Error("useFavorites precisa ser usado dentro de FavoritesProvider")
  }
  return context
}
