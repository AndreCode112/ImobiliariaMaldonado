import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { imoveisService } from "@/services/imoveisService"
import type { CidadePayload, CorretorPayload, ImovelPayload } from "@/types/imovel"

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: imoveisService.stats,
  })
}

export function useImoveis() {
  return useQuery({
    queryKey: ["imoveis"],
    queryFn: imoveisService.list,
  })
}

export function useImovel(id?: number | string) {
  return useQuery({
    queryKey: ["imoveis", id],
    queryFn: () => imoveisService.get(id as number | string),
    enabled: Boolean(id),
  })
}

export function useCreateImovel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImovelPayload) => imoveisService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["imoveis"] }),
  })
}

export function useUpdateImovel(id: number | string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ImovelPayload) => imoveisService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["imoveis"] })
      queryClient.invalidateQueries({ queryKey: ["imoveis", id] })
    },
  })
}

export function useDeleteImovel() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => imoveisService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["imoveis"] }),
  })
}

export function useCidades() {
  return useQuery({
    queryKey: ["cidades"],
    queryFn: imoveisService.cidades,
  })
}

export function useCorretores() {
  return useQuery({
    queryKey: ["corretores"],
    queryFn: imoveisService.corretores,
  })
}

export function useCreateCorretor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CorretorPayload) => imoveisService.createCorretor(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corretores"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    },
  })
}

export function useUpdateCorretor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: CorretorPayload }) => imoveisService.updateCorretor(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corretores"] }),
  })
}

export function useDeleteCorretor() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => imoveisService.removeCorretor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["corretores"] })
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] })
    },
  })
}

export function useCreateCidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CidadePayload) => imoveisService.createCidade(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cidades"] }),
  })
}

export function useUpdateCidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: CidadePayload }) => imoveisService.updateCidade(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cidades"] }),
  })
}

export function useDeleteCidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number | string) => imoveisService.removeCidade(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cidades"] }),
  })
}
