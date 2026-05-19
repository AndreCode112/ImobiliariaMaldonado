import { AlertCircle, Building2, CheckCircle2, KeyRound, Pencil, RefreshCw, ServerCog, Star, TrendingUp, Users, XCircle } from "lucide-react"
import { useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminStats, useIntegracoesHealth } from "@/hooks/useImoveis"
import type { ApiHealthCheck } from "@/types/imovel"

type PlaceholderHealthCheck = Pick<ApiHealthCheck, "name" | "service" | "base_url"> & { tested: false }
type VisibleHealthCheck = (ApiHealthCheck & { tested: true }) | PlaceholderHealthCheck

export function AdminHomePage() {
  const { data: stats, isLoading } = useAdminStats()
  const { data: health, isLoading: isLoadingHealth, isFetching: isFetchingHealth, refetch } = useIntegracoesHealth()
  const [selectedCheck, setSelectedCheck] = useState<ApiHealthCheck | null>(null)

  const cards = [
    { label: "Imóveis cadastrados", value: stats?.imoveis, icon: Building2, color: "text-primary" },
    { label: "Disponíveis", value: stats?.imoveis_disponiveis, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Corretores ativos", value: stats?.corretores, icon: Users, color: "text-sky-600" },
    { label: "Destaques", value: stats?.destaque, icon: Star, color: "text-amber-500" },
  ]
  const placeholderChecks = [
    { tested: false, name: "Nominatim", service: "Busca inteligente de endereço", base_url: "https://nominatim.openstreetmap.org/search" },
    { tested: false, name: "ViaCEP", service: "Consulta de CEP", base_url: "https://viacep.com.br/ws/01310930/json/" },
    { tested: false, name: "Geoapify", service: "Pontos de interesse pagos/otimizados", base_url: "https://api.geoapify.com/v2/places" },
    { tested: false, name: "Foursquare", service: "Pontos de interesse pagos/alternativos", base_url: "https://places-api.foursquare.com/places/search" },
    { tested: false, name: "Overpass", service: "Pontos de interesse no mapa", base_url: "https://overpass-api.de/api/interpreter" },
  ] satisfies PlaceholderHealthCheck[]
  const healthChecks: VisibleHealthCheck[] = health?.results.length ? health.results.map((check) => ({ ...check, tested: true })) : placeholderChecks

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Visão geral do sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="overflow-hidden rounded-[24px] border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <span className="grid size-11 place-items-center rounded-2xl bg-secondary">
                <Icon className={`size-5 ${color}`} />
              </span>
            </CardHeader>
            <CardContent className="pt-0">
              {isLoading ? <Skeleton className="h-10 w-24 rounded-full" /> : (
                <div className="flex items-end justify-between gap-3">
                  <div className="text-4xl font-semibold tracking-tight">{value ?? "—"}</div>
                  <span className="mb-1 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Total</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-[28px] border-border/80 bg-white shadow-none">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ServerCog className="size-5 text-primary" />
              Testes de APIs externas
            </CardTitle>
            <p className="mt-2 text-sm text-muted-foreground">
              Checagem dos serviços usados por busca de endereço, CEP e pontos próximos.
            </p>
          </div>
          <Button variant="outline" className="h-10 rounded-full" onClick={() => refetch()} disabled={isFetchingHealth}>
            <RefreshCw className={`size-4 ${isFetchingHealth ? "animate-spin" : ""}`} />
            Testar agora
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingHealth ? (
            <div className="grid gap-3 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[22px]" />)}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {healthChecks.map((check) => {
                const tested = check.tested
                return (
                <div
                  key={check.name}
                  className="rounded-[22px] border border-border/80 bg-secondary/40 p-4 transition hover:border-primary/25 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{check.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{check.service}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full bg-white"
                        aria-label={`Ver configuração de ${check.name}`}
                        disabled={!tested}
                        onClick={() => tested && setSelectedCheck(check)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <span
                        className={`grid size-9 place-items-center rounded-full ${
                          tested ? check.ok ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600" : "bg-white text-muted-foreground"
                        }`}
                        title={tested ? check.ok ? "OK" : "Erro" : "Aguardando teste"}
                      >
                        {tested ? check.ok ? <CheckCircle2 className="size-5" /> : <XCircle className="size-5" /> : <RefreshCw className="size-4" />}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-border/70 bg-white/80 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Base URL</p>
                    <p className="mt-1 truncate text-xs font-medium text-foreground" title={check.base_url}>{check.base_url}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tested ? `HTTP ${check.status_code ?? "sem resposta"}` : "Aguardando teste"}</span>
                    <span className="size-1 rounded-full bg-muted-foreground/40" />
                    <span>{tested ? check.latency_ms ? `${check.latency_ms}ms` : "sem latência" : "sem requisição inicial"}</span>
                    {tested && !check.configured ? (
                      <>
                        <span className="size-1 rounded-full bg-muted-foreground/40" />
                        <span>não configurado</span>
                      </>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {tested ? check.message : "Clique em Testar agora para checar este serviço."}
                  </p>
                  <Button variant="ghost" className="mt-3 h-9 rounded-full px-3 text-primary hover:text-primary" disabled={!tested} onClick={() => tested && setSelectedCheck(check)}>
                    {tested ? "Ver detalhes" : "Aguardando"}
                  </Button>
                </div>
                )
              })}
            </div>
          )}
          {health?.checked_at ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Última checagem: {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium" }).format(new Date(health.checked_at))}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedCheck)} onOpenChange={(open) => !open && setSelectedCheck(null)}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] lg:w-[1040px] lg:max-w-[1040px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedCheck?.ok ? <CheckCircle2 className="size-5 text-emerald-600" /> : <AlertCircle className="size-5 text-red-600" />}
              {selectedCheck?.name}
            </DialogTitle>
            <DialogDescription>{selectedCheck?.service}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <InfoPill label="Método" value={selectedCheck?.method ?? "—"} />
                <InfoPill label="Status" value={selectedCheck?.status_code ? `HTTP ${selectedCheck.status_code}` : "Sem resposta"} />
                <InfoPill label="Latência" value={selectedCheck?.latency_ms ? `${selectedCheck.latency_ms}ms` : "—"} />
              </div>
              <div className="grid gap-3 text-sm">
                <InfoPill label="Base URL" value={selectedCheck?.base_url ?? "—"} />
                <InfoPill label={selectedCheck?.api_key_env ? `Chave ${selectedCheck.api_key_env}` : "Chave API"} value={selectedCheck?.api_key_masked ?? "—"} />
              </div>
              <div className="rounded-2xl border bg-secondary/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Request URL</p>
                <p className="mt-2 break-all text-sm text-foreground">{selectedCheck?.url}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Controllers mapeadas</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCheck?.controllers?.length ? selectedCheck.controllers.map((controller) => (
                      <span key={controller} className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground">{controller}</span>
                    )) : <span className="text-sm text-muted-foreground">Nenhuma controller vinculada.</span>}
                  </div>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <KeyRound className="size-3.5" />
                    Segurança
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    A chave é lida no backend via variável de ambiente/settings e enviada ao painel somente mascarada.
                  </p>
                </div>
              </div>
              {selectedCheck?.request_body ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Corpo da request teste</p>
                  <pre className="max-h-48 overflow-auto rounded-2xl bg-[#111827] p-4 text-xs leading-5 text-white [scrollbar-color:#9ca3af_transparent] [scrollbar-width:thin]">
                    {selectedCheck.request_body}
                  </pre>
                </div>
              ) : null}
            </div>
            <pre className="min-h-[420px] overflow-auto rounded-2xl bg-[#111827] p-4 text-xs leading-5 text-white [scrollbar-color:#9ca3af_transparent] [scrollbar-width:thin] lg:max-h-[calc(100svh-12rem)]">
              {selectedCheck?.log || "Sem log disponível."}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-semibold leading-6 text-foreground">{value}</p>
    </div>
  )
}
