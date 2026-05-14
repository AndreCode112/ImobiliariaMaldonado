export interface Cidade {
  id: number
  nome: string
  estado: string
  codigo_ibge?: string
  latitude?: string
  longitude?: string
}

export interface Bairro {
  id: number
  nome: string
}

export interface CorretorResumo {
  id: number
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  creci?: string
  ativo?: boolean
  foto_url?: string | null
}

export interface TipoImovelResumo {
  id: number
  nome: string
}

export interface ImagemImovel {
  id: number
  url: string
  legenda?: string
  principal?: boolean
  ordem?: number
}

export interface PontoInteresse {
  id: number
  nome: string
  categoria: "restaurante" | "mercado" | "loja" | "turismo" | "parque" | "servico" | string
  categoria_label: string
  lat: number
  lng: number
}

export interface EnderecoResultado {
  display_name: string
  latitude: string
  longitude: string
  place_id: number
  type?: string
  address?: Record<string, string>
}

export interface ImovelApi {
  id: number
  titulo: string
  descricao: string
  preco: string
  preco_formatado?: string
  cep?: string
  endereco: string
  area: string
  quartos: number
  banheiros: number
  vagas: number
  status: "disponivel" | "vendido" | "alugado" | "reservado" | string
  destaque: boolean
  finalidade?: string
  zona_uso?: string
  topografia?: string
  latitude?: string
  longitude?: string
  tipo?: TipoImovelResumo | null
  cidade?: Cidade | null
  bairro?: Bairro | null
  corretor?: CorretorResumo | null
  pontos_interesse?: PontoInteresse[]
  imagens: ImagemImovel[]
  criado_em?: string | null
}

export interface Imovel {
  id: number
  title: string
  city: string
  neighborhood: string
  address: string
  latitude: number | null
  longitude: number | null
  price: number
  priceLabel: string
  bedrooms: number
  bathrooms: number
  parking: number
  area: number
  type: string
  images: string[]
  isFeatured: boolean
  isNew: boolean
  description: string
  amenities: string[]
  status: string
  realtor?: CorretorResumo | null
  pointsOfInterest: PontoInteresse[]
  raw: ImovelApi
}

export interface ImoveisFilters {
  search: string
  regiao: string
  cidade: string
  bairro: string
  valorMin: string
  valorMax: string
  tipo: string
  quartos: string
  banheiros: string
  vagas: string
  areaMin: string
  areaMax: string
}

export interface ImovelPayload {
  titulo: string
  descricao: string
  preco: string
  cep?: string
  endereco: string
  area: string
  quartos: number
  banheiros: number
  vagas: number
  status?: string
  destaque?: boolean
  finalidade?: string
  zona_uso?: string
  topografia?: string
  latitude: string
  longitude: string
  tipo_id?: string
  cidade_id?: string
  bairro_nome?: string
  corretor_id?: string
  imagens?: File[]
  remove_image_ids?: number[]
}

export interface CorretorPayload {
  nome: string
  telefone?: string
  whatsapp?: string
  email?: string
  creci?: string
  ativo?: boolean
  foto?: File | null
  remove_foto?: boolean
}

export interface CidadePayload {
  nome: string
  estado: string
  codigo_ibge?: string
}

export interface AdminStats {
  imoveis: number
  imoveis_disponiveis: number
  corretores: number
  destaque: number
}

export interface PaginatedResults<T> {
  results: T[]
}
