import { Bath, BedDouble, Building2, Car, Edit, Filter, Home, MapPin, Plus, Ruler, Search, Sofa, Sparkles, Trash2, Utensils, X } from "lucide-react"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { DeleteConfirmPopover } from "@/components/admin/DeleteConfirmPopover"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteImovel, useImoveis } from "@/hooks/useImoveis"

const ALL = "_"
const EMPTY_FILTERS = {
  search: "",
  status: ALL,
  city: ALL,
  type: ALL,
  destaque: ALL,
}

export function AdminDashboardPage() {
  const { data: imoveis = [], isLoading } = useImoveis()
  const deleteImovel = useDeleteImovel()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const cities = useMemo(() => uniqueOptions(imoveis.map((imovel) => imovel.city).filter(Boolean)), [imoveis])
  const types = useMemo(() => uniqueOptions(imoveis.map((imovel) => imovel.type).filter(Boolean)), [imoveis])
  const statuses = useMemo(() => uniqueOptions(imoveis.map((imovel) => imovel.status).filter(Boolean)), [imoveis])
  const filtered = useMemo(() => {
    const query = normalize(filters.search)
    return imoveis.filter((imovel) => {
      const searchable = normalize([
        imovel.title,
        imovel.address,
        imovel.neighborhood,
        imovel.city,
        imovel.type,
        imovel.status,
        imovel.realtor?.nome,
      ].filter(Boolean).join(" "))
      if (query && !searchable.includes(query)) return false
      if (filters.status !== ALL && imovel.status !== filters.status) return false
      if (filters.city !== ALL && imovel.city !== filters.city) return false
      if (filters.type !== ALL && imovel.type !== filters.type) return false
      if (filters.destaque === "sim" && !imovel.isFeatured) return false
      if (filters.destaque === "nao" && imovel.isFeatured) return false
      return true
    })
  }, [filters, imoveis])
  const hasFilters = filters.search || filters.status !== ALL || filters.city !== ALL || filters.type !== ALL || filters.destaque !== ALL

  async function remove(id: number) {
    try {
      await deleteImovel.mutateAsync(id)
      toast.success("Imóvel excluído")
    } catch {
      toast.error("Não foi possível excluir o imóvel")
    }
  }

  return (
    <div className="space-y-5">
        <div className="mb-8 flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
            <h1 className="mt-2 text-3xl font-semibold">Imóveis</h1>
            <p className="mt-2 text-muted-foreground">Cadastro, edição, exclusão e publicação permanecem validados pelo backend Django.</p>
          </div>
          <Button asChild className="w-full rounded-full sm:w-auto">
            <Link to="/admin/imoveis/novo">
              <Plus className="size-4" />
              Novo imóvel
            </Link>
          </Button>
        </div>

        <div className="p-0">
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-[minmax(260px,1fr)_repeat(4,minmax(150px,180px))] 2xl:items-end">
            <div className="min-w-0 2xl:min-w-[260px]">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pesquisar imóvel</label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 w-full rounded-full bg-secondary/40 pl-9"
                  placeholder="Título, endereço, bairro, corretor..."
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                />
              </div>
            </div>
            <FilterSelect label="Status" value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))}>
              <SelectItem value={ALL}>Todos</SelectItem>
              {statuses.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}
            </FilterSelect>
            <FilterSelect label="Cidade" value={filters.city} onChange={(value) => setFilters((current) => ({ ...current, city: value }))}>
              <SelectItem value={ALL}>Todas</SelectItem>
              {cities.map((city) => <SelectItem key={city} value={city}>{city}</SelectItem>)}
            </FilterSelect>
            <FilterSelect label="Tipo" value={filters.type} onChange={(value) => setFilters((current) => ({ ...current, type: value }))}>
              <SelectItem value={ALL}>Todos</SelectItem>
              {types.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
            </FilterSelect>
            <FilterSelect label="Destaque" value={filters.destaque} onChange={(value) => setFilters((current) => ({ ...current, destaque: value }))}>
              <SelectItem value={ALL}>Todos</SelectItem>
              <SelectItem value="sim">Somente destaques</SelectItem>
              <SelectItem value="nao">Sem destaque</SelectItem>
            </FilterSelect>
          </div>

          <div className="mt-4 flex flex-col gap-3 pt-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <Filter className="size-3.5" />
                {filtered.length} de {imoveis.length} imóveis
              </span>
              {filters.search ? <FilterChip label={`Busca: ${filters.search}`} onRemove={() => setFilters((current) => ({ ...current, search: "" }))} /> : null}
              {filters.status !== ALL ? <FilterChip label={`Status: ${statusLabel(filters.status)}`} onRemove={() => setFilters((current) => ({ ...current, status: ALL }))} /> : null}
              {filters.city !== ALL ? <FilterChip label={`Cidade: ${filters.city}`} onRemove={() => setFilters((current) => ({ ...current, city: ALL }))} /> : null}
              {filters.type !== ALL ? <FilterChip label={`Tipo: ${filters.type}`} onRemove={() => setFilters((current) => ({ ...current, type: ALL }))} /> : null}
              {filters.destaque !== ALL ? <FilterChip label={filters.destaque === "sim" ? "Destaques" : "Sem destaque"} onRemove={() => setFilters((current) => ({ ...current, destaque: ALL }))} /> : null}
            </div>
            {hasFilters ? (
              <Button variant="ghost" className="h-9 rounded-full text-muted-foreground" onClick={() => setFilters(EMPTY_FILTERS)}>
                <X className="size-4" />
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4">
          {isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[24px]" />)}
          {!isLoading && filtered.map((imovel) => (
            <Card key={imovel.id} className="rounded-[24px] border-border/80 bg-white shadow-none">
              <CardContent className="flex min-w-0 flex-col gap-4 p-4 md:flex-row md:items-center">
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-[18px] bg-secondary md:w-40">
                  {imovel.images[0] ? <img src={imovel.images[0]} alt={imovel.title} className="size-full object-cover" /> : null}
                  {imovel.isFeatured ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-bold text-primary shadow-sm">
                      <Sparkles className="size-3" />
                      Destaque
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 break-words font-semibold">{imovel.title}</p>
                    <StatusPill status={imovel.status} />
                  </div>
                  <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="min-w-0 truncate">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ") || imovel.address}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Metric icon={Building2} value={imovel.type || "Sem tipo"} />
                    <Metric icon={Ruler} value={`${imovel.area} m²`} />
                    <Metric icon={BedDouble} value={`${imovel.bedrooms} quartos`} />
                    <Metric icon={Bath} value={`${imovel.bathrooms} banheiros`} />
                    <Metric icon={Car} value={`${imovel.parking} vagas`} />
                    <Metric icon={Utensils} value={`${imovel.kitchens} cozinhas`} />
                    <Metric icon={Sofa} value={`${imovel.livingRooms} salas`} />
                    <Metric icon={Home} value={`${imovel.balconies} varandas`} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-primary">{imovel.priceLabel}</p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:flex-row md:w-auto md:flex-col xl:flex-row">
                  <Button asChild variant="outline" className="w-full rounded-full sm:w-auto">
                    <Link to={`/admin/imoveis/${imovel.id}/editar`}>
                      <Edit className="size-4" />
                      Editar
                    </Link>
                  </Button>
                  <DeleteConfirmPopover
                    title="Excluir imóvel?"
                    description={`Essa ação removerá ${imovel.title} do cadastro.`}
                    isPending={deleteImovel.isPending}
                    onConfirm={() => remove(imovel.id)}
                  >
                    <Button variant="outline" className="w-full rounded-full text-destructive sm:w-auto">
                      <Trash2 className="size-4" />
                      Excluir
                    </Button>
                  </DeleteConfirmPopover>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && !imoveis.length ? (
            <div className="rounded-[28px] border border-dashed bg-white p-10 text-center">
              <h2 className="text-xl font-semibold">Nenhum imóvel cadastrado</h2>
              <p className="mt-2 text-muted-foreground">Use o botão Novo imóvel para publicar a primeira oportunidade.</p>
            </div>
          ) : null}
          {!isLoading && imoveis.length > 0 && filtered.length === 0 ? (
            <div className="rounded-[28px] border border-dashed bg-white p-10 text-center">
              <Home className="mx-auto mb-3 size-9 text-primary" />
              <h2 className="text-xl font-semibold">Nenhum imóvel encontrado</h2>
              <p className="mt-2 text-muted-foreground">Ajuste os filtros ou limpe a busca para ver todos os cadastros.</p>
            </div>
          ) : null}
        </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full rounded-full bg-secondary/40 normal-case tracking-normal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    </label>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
      <span className="min-w-0 truncate">{label}</span>
      <button type="button" className="grid size-5 place-items-center rounded-full hover:bg-white" onClick={onRemove} aria-label={`Remover ${label}`}>
        <X className="size-3" />
      </button>
    </span>
  )
}

function StatusPill({ status }: { status: string }) {
  const available = status === "disponivel"
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${available ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
      {statusLabel(status)}
    </span>
  )
}

function Metric({ icon: Icon, value }: { icon: typeof Ruler; value: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
      <Icon className="size-3.5 text-primary" />
      <span className="min-w-0 truncate">{value}</span>
    </span>
  )
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "pt-BR"))
}

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    disponivel: "Disponível",
    vendido: "Vendido",
    alugado: "Alugado",
    reservado: "Reservado",
  }
  return labels[status] ?? (status || "Sem status")
}
