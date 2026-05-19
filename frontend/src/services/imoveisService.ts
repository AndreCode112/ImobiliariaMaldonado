import { axiosClient } from "@/api/axiosClient"
import type { AdminUser, AdminUserPayload, PasswordResetLink } from "@/types/auth"
import type { AdminStats, ApiHealthReport, Cidade, CidadePayload, CorretorPayload, CorretorResumo, EnderecoResultado, Imovel, ImovelApi, ImovelPayload, LembreteFavoritosPayload, LembreteFavoritosResponse, PaginatedResults } from "@/types/imovel"

function numberFrom(value: string | number | undefined | null) {
  if (value === undefined || value === null || value === "") return 0
  return Number(String(value).replace(",", "."))
}

function isNew(criadoEm?: string | null) {
  if (!criadoEm) return false
  const created = new Date(criadoEm).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return Number.isFinite(created) && Date.now() - created <= sevenDays
}

export function normalizeImovel(api: ImovelApi): Imovel {
  const amenities = [
    api.finalidade,
    api.zona_uso,
    api.topografia,
    api.status === "disponivel" ? "Disponivel para compra" : api.status,
  ].filter(Boolean) as string[]

  return {
    id: api.id,
    title: api.titulo,
    city: api.cidade?.nome ?? "",
    neighborhood: api.bairro?.nome ?? "",
    address: api.endereco,
    latitude: api.latitude ? Number(api.latitude) : null,
    longitude: api.longitude ? Number(api.longitude) : null,
    price: numberFrom(api.preco),
    priceLabel: api.preco_formatado ?? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(numberFrom(api.preco)),
    bedrooms: api.quartos,
    bathrooms: api.banheiros,
    parking: api.vagas,
    area: numberFrom(api.area),
    type: api.tipo?.nome ?? "Residencial",
    images: api.imagens.map((image) => image.url),
    isFeatured: api.destaque,
    isNew: isNew(api.criado_em),
    description: api.descricao,
    amenities,
    status: api.status,
    realtor: api.corretor,
    pointsOfInterest: api.pontos_interesse ?? [],
    raw: api,
  }
}

function buildImovelFormData(payload: ImovelPayload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || key === "imagens" || key === "remove_image_ids") return
    formData.append(key, typeof value === "boolean" ? String(value) : String(value))
  })
  payload.imagens?.forEach((image) => formData.append("imagens", image))
  if (payload.remove_image_ids?.length) {
    formData.append("remove_image_ids", JSON.stringify(payload.remove_image_ids))
  }
  return formData
}

function buildCorretorFormData(payload: CorretorPayload) {
  const formData = new FormData()
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || key === "foto") return
    formData.append(key, typeof value === "boolean" ? String(value) : String(value))
  })
  if (payload.foto) formData.append("foto", payload.foto)
  return formData
}

export const imoveisService = {
  async stats(): Promise<AdminStats> {
    const { data } = await axiosClient.get<AdminStats>("/imoveis/api/stats/")
    return data
  },

  async integracoesHealth(): Promise<ApiHealthReport> {
    const { data } = await axiosClient.get<ApiHealthReport>("/imoveis/api/integracoes/health/")
    return data
  },

  async lembreteFavoritos(): Promise<LembreteFavoritosResponse> {
    const { data } = await axiosClient.get<LembreteFavoritosResponse>("/imoveis/api/lembrete-favoritos/")
    return data
  },

  async updateLembreteFavoritos(payload: LembreteFavoritosPayload): Promise<LembreteFavoritosResponse> {
    const { data } = await axiosClient.put<LembreteFavoritosResponse>("/imoveis/api/lembrete-favoritos/", payload)
    return data
  },

  async list(): Promise<Imovel[]> {
    const { data } = await axiosClient.get<PaginatedResults<ImovelApi>>("/imoveis/api/imoveis/")
    return data.results.map(normalizeImovel)
  },

  async buscarEndereco(query: string, signal?: AbortSignal): Promise<EnderecoResultado[]> {
    const { data } = await axiosClient.get<{ results: EnderecoResultado[] }>("/imoveis/api/buscar-endereco/", {
      params: { query },
      signal,
    })
    return data.results
  },

  async get(id: number | string): Promise<Imovel> {
    const { data } = await axiosClient.get<ImovelApi>(`/imoveis/api/imoveis/${id}/`)
    return normalizeImovel(data)
  },

  async favoritos(): Promise<number[]> {
    const { data } = await axiosClient.get<{ results: number[] }>("/imoveis/api/favoritos/")
    return data.results
  },

  async addFavorito(id: number): Promise<void> {
    await axiosClient.post(`/imoveis/api/favoritos/${id}/`)
  },

  async removeFavorito(id: number): Promise<void> {
    await axiosClient.delete(`/imoveis/api/favoritos/${id}/`)
  },

  async create(payload: ImovelPayload): Promise<Imovel> {
    const { data } = await axiosClient.post<ImovelApi>("/imoveis/api/imoveis/", buildImovelFormData(payload))
    return normalizeImovel(data)
  },

  async update(id: number | string, payload: ImovelPayload): Promise<Imovel> {
    const { data } = await axiosClient.put<ImovelApi>(`/imoveis/api/imoveis/${id}/`, buildImovelFormData(payload))
    return normalizeImovel(data)
  },

  async remove(id: number | string): Promise<void> {
    await axiosClient.delete(`/imoveis/api/imoveis/${id}/`)
  },

  async cidades(): Promise<Cidade[]> {
    const { data } = await axiosClient.get<PaginatedResults<Cidade>>("/imoveis/api/cidades/")
    return data.results
  },

  async corretores(): Promise<CorretorResumo[]> {
    const { data } = await axiosClient.get<PaginatedResults<CorretorResumo>>("/imoveis/api/corretores/")
    return data.results
  },

  async createCorretor(payload: CorretorPayload): Promise<CorretorResumo> {
    const { data } = await axiosClient.post<CorretorResumo>("/imoveis/api/corretores/", buildCorretorFormData(payload))
    return data
  },

  async updateCorretor(id: number | string, payload: CorretorPayload): Promise<CorretorResumo> {
    const { data } = await axiosClient.put<CorretorResumo>(`/imoveis/api/corretores/${id}/`, buildCorretorFormData(payload))
    return data
  },

  async removeCorretor(id: number | string): Promise<void> {
    await axiosClient.delete(`/imoveis/api/corretores/${id}/`)
  },

  async usuarios(): Promise<AdminUser[]> {
    const { data } = await axiosClient.get<PaginatedResults<AdminUser>>("/imoveis/api/usuarios/")
    return data.results
  },

  async updateUsuario(id: number | string, payload: AdminUserPayload): Promise<AdminUser> {
    const { data } = await axiosClient.put<AdminUser>(`/imoveis/api/usuarios/${id}/`, payload)
    return data
  },

  async usuarioResetLink(id: number | string): Promise<PasswordResetLink> {
    const { data } = await axiosClient.post<PasswordResetLink>(`/imoveis/api/usuarios/${id}/reset-link/`)
    return data
  },

  async createCidade(payload: CidadePayload): Promise<Cidade> {
    const { data } = await axiosClient.post<Cidade>("/imoveis/api/cidades/", payload)
    return data
  },

  async updateCidade(id: number | string, payload: CidadePayload): Promise<Cidade> {
    const { data } = await axiosClient.put<Cidade>(`/imoveis/api/cidades/${id}/`, payload)
    return data
  },

  async removeCidade(id: number | string): Promise<void> {
    await axiosClient.delete(`/imoveis/api/cidades/${id}/`)
  },
}
