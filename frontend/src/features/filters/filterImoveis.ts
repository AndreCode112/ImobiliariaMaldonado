import type { Imovel, ImoveisFilters } from "@/types/imovel"

export const defaultFilters: ImoveisFilters = {
  search: "",
  regiao: "",
  cidade: "",
  bairro: "",
  valorMin: "",
  valorMax: "",
  tipo: "",
  quartos: "",
  banheiros: "",
  vagas: "",
  areaMin: "",
  areaMax: "",
}

function matchesNumber(value: number, minimum?: string, maximum?: string) {
  const min = minimum ? numberFromFilter(minimum) : null
  const max = maximum ? numberFromFilter(maximum) : null
  if (min !== null && value < min) return false
  if (max !== null && value > max) return false
  return true
}

function numberFromFilter(value: string) {
  const normalized = value.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function filterImoveis(imoveis: Imovel[], filters: ImoveisFilters) {
  const search = filters.search.trim().toLocaleLowerCase("pt-BR")
  return imoveis.filter((imovel) => {
    const haystack = [imovel.title, imovel.city, imovel.neighborhood, imovel.address, imovel.type].join(" ").toLocaleLowerCase("pt-BR")
    if (search && !haystack.includes(search)) return false
    if (filters.cidade && imovel.city !== filters.cidade) return false
    if (filters.bairro && imovel.neighborhood !== filters.bairro) return false
    if (filters.tipo && imovel.type !== filters.tipo) return false
    if (filters.quartos && imovel.bedrooms < Number(filters.quartos)) return false
    if (filters.banheiros && imovel.bathrooms < Number(filters.banheiros)) return false
    if (filters.vagas && imovel.parking < Number(filters.vagas)) return false
    if (!matchesNumber(imovel.price, filters.valorMin, filters.valorMax)) return false
    if (!matchesNumber(imovel.area, filters.areaMin, filters.areaMax)) return false
    return true
  })
}
