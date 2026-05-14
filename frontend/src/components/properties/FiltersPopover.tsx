import { SlidersHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { defaultFilters } from "@/features/filters/filterImoveis"
import type { Imovel, ImoveisFilters } from "@/types/imovel"

interface FiltersPopoverProps {
  filters: ImoveisFilters
  setFilters: (filters: ImoveisFilters) => void
  imoveis: Imovel[]
}

export function FiltersPopover({ filters, setFilters, imoveis }: FiltersPopoverProps) {
  const cidades = unique(imoveis.map((item) => item.city).filter(Boolean))
  const bairros = unique(imoveis.map((item) => item.neighborhood).filter(Boolean))
  const tipos = unique(imoveis.map((item) => item.type).filter(Boolean))
  const activeCount = Object.values(filters).filter(Boolean).length

  const update = (key: keyof ImoveisFilters, value: string) => setFilters({ ...filters, [key]: value })

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button className="fixed bottom-6 right-6 z-[800] rounded-full px-5 shadow-[0_18px_44px_rgba(0,0,0,0.16)] md:bottom-8 md:right-8">
          <SlidersHorizontal className="size-4" />
          Filtros
          {activeCount ? <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-primary">{activeCount}</span> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[900] w-[min(92vw,430px)] rounded-[24px] p-0">
        <PopoverHeader>
          <PopoverTitle>Filtros de compra</PopoverTitle>
          <PopoverDescription>Refine a seleção de imóveis residenciais à venda.</PopoverDescription>
        </PopoverHeader>
        <div className="grid grid-cols-2 gap-3 p-5">
          <Field label="Cidade">
            <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={filters.cidade} onChange={(event) => update("cidade", event.target.value)}>
              <option value="">Todas</option>
              {cidades.map((cidade) => <option key={cidade}>{cidade}</option>)}
            </select>
          </Field>
          <Field label="Bairro">
            <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={filters.bairro} onChange={(event) => update("bairro", event.target.value)}>
              <option value="">Todos</option>
              {bairros.map((bairro) => <option key={bairro}>{bairro}</option>)}
            </select>
          </Field>
          <Field label="Valor minimo">
            <Input inputMode="numeric" value={filters.valorMin} onChange={(event) => update("valorMin", event.target.value)} />
          </Field>
          <Field label="Valor maximo">
            <Input inputMode="numeric" value={filters.valorMax} onChange={(event) => update("valorMax", event.target.value)} />
          </Field>
          <Field label="Tipo">
            <select className="h-10 rounded-md border border-input bg-white px-3 text-sm" value={filters.tipo} onChange={(event) => update("tipo", event.target.value)}>
              <option value="">Todos</option>
              {tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
            </select>
          </Field>
          <Field label="Quartos">
            <Input inputMode="numeric" value={filters.quartos} onChange={(event) => update("quartos", event.target.value)} />
          </Field>
          <Field label="Banheiros">
            <Input inputMode="numeric" value={filters.banheiros} onChange={(event) => update("banheiros", event.target.value)} />
          </Field>
          <Field label="Garagem">
            <Input inputMode="numeric" value={filters.vagas} onChange={(event) => update("vagas", event.target.value)} />
          </Field>
          <Field label="Area minima">
            <Input inputMode="numeric" value={filters.areaMin} onChange={(event) => update("areaMin", event.target.value)} />
          </Field>
          <Field label="Area maxima">
            <Input inputMode="numeric" value={filters.areaMax} onChange={(event) => update("areaMax", event.target.value)} />
          </Field>
        </div>
        <div className="flex justify-between gap-3 border-t border-border/60 p-3">
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setFilters(defaultFilters)}>Limpar</Button>
          <Button type="button" className="rounded-full px-5">Aplicar filtros</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Label className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
      {label}
      {children}
    </Label>
  )
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "pt-BR"))
}
