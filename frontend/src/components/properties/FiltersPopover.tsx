import { AnimatePresence, motion } from "framer-motion"
import { SlidersHorizontal, X } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { defaultFilters } from "@/features/filters/filterImoveis"
import type { Imovel, ImoveisFilters } from "@/types/imovel"

interface FiltersPopoverProps {
  filters: ImoveisFilters
  setFilters: (filters: ImoveisFilters) => void
  imoveis: Imovel[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideFloatingButton?: boolean
}

export function FiltersPopover({ filters, setFilters, imoveis, open: controlledOpen, onOpenChange, hideFloatingButton = false }: FiltersPopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen
  const cidades = unique(imoveis.map((item) => item.city).filter(Boolean))
  const bairros = unique(imoveis.map((item) => item.neighborhood).filter(Boolean))
  const tipos = unique(imoveis.map((item) => item.type).filter(Boolean))
  const activeCount = Object.values(filters).filter(Boolean).length

  const update = (key: keyof ImoveisFilters, value: string) => setFilters({ ...filters, [key]: value })

  return (
    <>
      {!hideFloatingButton ? (
        <Button className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] right-4 z-[830] rounded-full px-5 md:bottom-8 md:right-8" onClick={() => setOpen(true)}>
          <SlidersHorizontal className="size-4" />
          Filtros
          {activeCount ? <span className="ml-1 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-primary">{activeCount}</span> : null}
        </Button>
      ) : null}
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Fechar filtros"
              className="fixed inset-0 z-[920] bg-black/25-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-x-0 bottom-0 z-[930] max-h-[88svh] overflow-hidden rounded-t-[30px] border border-white/70 bg-white md:inset-x-auto md:bottom-8 md:right-8 md:w-[430px] md:rounded-[28px]"
              initial={{ y: 36, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 36, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-border/60 p-5">
                <div>
                  <h2 className="text-lg font-semibold">Filtros de compra</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Refine a seleção de imóveis residenciais à venda.</p>
                </div>
                <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
                  <X className="size-4" />
                </Button>
              </div>
              <div className="premium-scrollbar grid max-h-[calc(88svh-142px)] grid-cols-2 gap-3 overflow-y-auto p-5">
                <Field label="Cidade">
                  <select className="h-11 rounded-xl border border-input bg-white px-3 text-sm" value={filters.cidade} onChange={(event) => update("cidade", event.target.value)}>
                    <option value="">Todas</option>
                    {cidades.map((cidade) => <option key={cidade}>{cidade}</option>)}
                  </select>
                </Field>
                <Field label="Bairro">
                  <select className="h-11 rounded-xl border border-input bg-white px-3 text-sm" value={filters.bairro} onChange={(event) => update("bairro", event.target.value)}>
                    <option value="">Todos</option>
                    {bairros.map((bairro) => <option key={bairro}>{bairro}</option>)}
                  </select>
                </Field>
                <Field label="Valor minimo">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.valorMin} onChange={(event) => update("valorMin", event.target.value)} />
                </Field>
                <Field label="Valor maximo">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.valorMax} onChange={(event) => update("valorMax", event.target.value)} />
                </Field>
                <Field label="Tipo">
                  <select className="h-11 rounded-xl border border-input bg-white px-3 text-sm" value={filters.tipo} onChange={(event) => update("tipo", event.target.value)}>
                    <option value="">Todos</option>
                    {tipos.map((tipo) => <option key={tipo}>{tipo}</option>)}
                  </select>
                </Field>
                <Field label="Quartos">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.quartos} onChange={(event) => update("quartos", event.target.value)} />
                </Field>
                <Field label="Banheiros">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.banheiros} onChange={(event) => update("banheiros", event.target.value)} />
                </Field>
                <Field label="Garagem">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.vagas} onChange={(event) => update("vagas", event.target.value)} />
                </Field>
                <Field label="Cozinha">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.cozinhas} onChange={(event) => update("cozinhas", event.target.value)} />
                </Field>
                <Field label="Sala">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.salas} onChange={(event) => update("salas", event.target.value)} />
                </Field>
                <Field label="Varanda">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.varandas} onChange={(event) => update("varandas", event.target.value)} />
                </Field>
                <Field label="Area minima">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.areaMin} onChange={(event) => update("areaMin", event.target.value)} />
                </Field>
                <Field label="Area maxima">
                  <Input className="h-11 rounded-xl" inputMode="numeric" value={filters.areaMax} onChange={(event) => update("areaMax", event.target.value)} />
                </Field>
              </div>
              <div className="flex justify-between gap-3 border-t border-border/60 p-4">
                <Button type="button" variant="ghost" className="rounded-full" onClick={() => setFilters(defaultFilters)}>Limpar</Button>
                <Button type="button" className="rounded-full px-5" onClick={() => setOpen(false)}>Aplicar filtros</Button>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
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
