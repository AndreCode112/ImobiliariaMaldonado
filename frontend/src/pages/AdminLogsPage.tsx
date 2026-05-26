import { AlertTriangle, ArrowDownUp, CheckCircle2, FileWarning, ListFilter, RefreshCw, Search, Trash2, X } from "lucide-react"
import type { ReactNode } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteSystemLogs, useSystemLogs } from "@/hooks/useImoveis"
import { cn } from "@/lib/utils"
import type { SystemLogFilters } from "@/types/imovel"

const ALL_ROUTES = "_"
const DEFAULT_FILTERS: SystemLogFilters = {
  query: "",
  route: "",
  date: "",
  time: "",
  order: "recent",
  limit: 250,
}

export function AdminLogsPage() {
  const [filters, setFilters] = useState<SystemLogFilters>(DEFAULT_FILTERS)
  const { data, isLoading, isFetching, refetch } = useSystemLogs(filters)
  const deleteLogs = useDeleteSystemLogs()
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)

  const logs = data?.results ?? []
  const routes = data?.routes ?? []
  const total = data?.total ?? logs.length
  const selectedCount = selectedIds.size
  const allVisibleSelected = logs.length > 0 && logs.every((item) => selectedIds.has(item.id))
  const hasFilters = Boolean(filters.query || filters.route || filters.date || filters.time || filters.order !== "recent")

  function updateFilter<Key extends keyof SystemLogFilters>(key: Key, value: SystemLogFilters[Key]) {
    setSelectedIds(new Set())
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilters() {
    setSelectedIds(new Set())
    setFilters(DEFAULT_FILTERS)
  }

  function toggleLog(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function toggleVisibleLogs() {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (allVisibleSelected) {
        logs.forEach((item) => next.delete(item.id))
      } else {
        logs.forEach((item) => next.add(item.id))
      }
      return next
    })
  }

  async function deleteSelectedLogs() {
    try {
      const ids = Array.from(selectedIds)
      const result = await deleteLogs.mutateAsync(ids)
      setSelectedIds(new Set())
      setConfirmOpen(false)
      toast.success(`${result.deleted} ${result.deleted === 1 ? "log removido" : "logs removidos"}`)
    } catch {
      toast.error("Não foi possível deletar os logs selecionados")
    }
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-hidden">
      <div className="shrink-0">
        <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold">Logs do sistema</h1>
          <p className="mt-2 text-muted-foreground">Erros e respostas inesperadas gravadas automaticamente pelo backend.</p>
        </div>
        <Button variant="outline" className="h-11 w-full rounded-full bg-white sm:w-auto" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
          Atualizar
        </Button>
        </div>
      </div>

      <div className="premium-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div className="min-w-0 space-y-5">
      <Card className="min-w-0 rounded-[28px] border-border/80 bg-white shadow-none">
        <CardContent className="min-w-0 space-y-4 p-4 md:p-5">
          <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(220px,1.4fr)_minmax(200px,1fr)_minmax(150px,0.7fr)_minmax(140px,0.6fr)_minmax(200px,0.85fr)]">
            <FilterField label="Buscar nos logs">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-11 w-full rounded-full bg-secondary/40 pl-9 pr-10"
                  placeholder="Mensagem ou controller..."
                  value={filters.query ?? ""}
                  onChange={(event) => updateFilter("query", event.target.value)}
                />
                {filters.query ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-white hover:text-foreground"
                    onClick={() => updateFilter("query", "")}
                    aria-label="Limpar busca"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>
            </FilterField>

            <FilterField label="Rota">
              <Select value={filters.route || ALL_ROUTES} onValueChange={(value) => updateFilter("route", value === ALL_ROUTES ? "" : value)}>
                <SelectTrigger className="h-11 w-full rounded-full bg-secondary/40">
                  <ListFilter className="size-4" />
                  <SelectValue placeholder="Todas as rotas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_ROUTES}>Todas as rotas</SelectItem>
                  {routes.map((route) => (
                    <SelectItem key={route} value={route}>{route}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>

            <FilterField label="Data">
              <Input
                type="date"
                className="h-11 w-full rounded-full bg-secondary/40 px-4"
                value={filters.date ?? ""}
                onChange={(event) => updateFilter("date", event.target.value)}
              />
            </FilterField>

            <FilterField label="Hora">
              <Input
                type="time"
                step={3600}
                className="h-11 w-full rounded-full bg-secondary/40 px-4"
                value={filters.time ?? ""}
                onChange={(event) => updateFilter("time", event.target.value)}
              />
            </FilterField>

            <FilterField label="Ordenação">
              <Select value={filters.order ?? "recent"} onValueChange={(value) => updateFilter("order", value as SystemLogFilters["order"])}>
                <SelectTrigger className="h-11 w-full rounded-full bg-secondary/40">
                  <ArrowDownUp className="size-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Mais recentes primeiro</SelectItem>
                  <SelectItem value="oldest">Mais antigos primeiro</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                <FileWarning className="size-3.5" />
                {logs.length} de {total} logs
              </span>
              {filters.route ? <FilterChip label={`Rota: ${filters.route}`} onRemove={() => updateFilter("route", "")} /> : null}
              {filters.date ? <FilterChip label={`Data: ${formatDateOnly(filters.date)}`} onRemove={() => updateFilter("date", "")} /> : null}
              {filters.time ? <FilterChip label={`Hora: ${filters.time}`} onRemove={() => updateFilter("time", "")} /> : null}
              {filters.query ? <FilterChip label={`Busca: ${filters.query}`} onRemove={() => updateFilter("query", "")} /> : null}
              {selectedCount ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                  {selectedCount} selecionado{selectedCount > 1 ? "s" : ""}
                </span>
              ) : null}
            </div>

            <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
              {hasFilters ? (
                <Button variant="ghost" className="h-11 w-full rounded-full text-muted-foreground sm:w-auto" onClick={clearFilters}>
                  <X className="size-4" />
                  Limpar filtros
                </Button>
              ) : null}
              <Button variant="outline" className="h-11 w-full rounded-full bg-white sm:w-auto" onClick={toggleVisibleLogs} disabled={!logs.length}>
                <CheckCircle2 className="size-4" />
                {allVisibleSelected ? "Desmarcar visíveis" : "Selecionar visíveis"}
              </Button>
              <Button
                variant="outline"
                className="h-11 w-full rounded-full bg-white text-destructive hover:text-destructive sm:w-auto"
                onClick={() => setConfirmOpen(true)}
                disabled={!selectedCount}
              >
                <Trash2 className="size-4" />
                Deletar {selectedCount ? `(${selectedCount})` : ""}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-3">
        {isLoading ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-36 rounded-[24px]" />) : null}

        {!isLoading && logs.map((item) => {
          const selected = selectedIds.has(item.id)
          return (
            <Card key={item.id} className={cn("min-w-0 rounded-[24px] border-border/80 bg-white shadow-none transition", selected && "border-primary/40 bg-primary/[0.035]")}>
              <CardContent className="grid gap-4 p-4 md:grid-cols-[auto_minmax(0,1fr)] md:p-5">
                <label className="flex items-start gap-3 md:pt-1">
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 rounded border-border accent-primary"
                    checked={selected}
                    onChange={() => toggleLog(item.id)}
                    aria-label={`Selecionar log ${item.id}`}
                  />
                  <span className="sr-only">Selecionar log</span>
                </label>

                <div className="min-w-0">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground">
                        <AlertTriangle className="size-3.5 shrink-0 text-primary" />
                        <span className="truncate">{item.route || "Controller não identificada"}</span>
                      </span>
                      <p className="mt-2 text-xs text-muted-foreground">ID #{item.id}</p>
                    </div>
                    <time className="shrink-0 text-sm text-muted-foreground" dateTime={item.criado_em ?? undefined}>
                      {formatDate(item.criado_em)}
                    </time>
                  </div>

                  <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-[18px] border border-border/70 bg-secondary/45 p-4 text-xs leading-5 text-foreground [scrollbar-color:#c1c1c1_transparent] [scrollbar-width:thin]">
                    {prettyMessage(item.message)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {!isLoading && !logs.length ? (
          <div className="rounded-[28px] border border-dashed bg-white p-10 text-center">
            <FileWarning className="mx-auto mb-3 size-9 text-primary" />
            <h2 className="text-xl font-semibold">{hasFilters ? "Nenhum log encontrado" : "Nenhum log gravado"}</h2>
            <p className="mt-2 text-muted-foreground">
              {hasFilters ? "Ajuste os filtros para visualizar outros registros." : "Quando uma controller responder diferente de 200, o backend registrará aqui."}
            </p>
          </div>
        ) : null}
      </div>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-[28px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deletar logs selecionados?</DialogTitle>
            <DialogDescription>
              Esta ação removerá {selectedCount} {selectedCount === 1 ? "registro" : "registros"} do histórico do sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={deleteSelectedLogs} disabled={deleteLogs.isPending}>
              <Trash2 className="size-4" />
              Deletar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid min-w-0 gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      <span className="min-w-0 truncate">{label}</span>
      {children}
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

function prettyMessage(message: string) {
  try {
    return JSON.stringify(JSON.parse(message), null, 2)
  } catch {
    return message || "Sem mensagem."
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Data indisponível"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Data indisponível"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(date)
}

function formatDateOnly(value: string) {
  const [year, month, day] = value.split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}
