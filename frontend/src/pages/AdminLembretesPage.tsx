import { CalendarClock, Clock, Eye, Heart, Home, Mail, MessageCircle, Pencil, Phone, Save, Send, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { useCorretores, useLembreteFavoritos, useUpdateLembreteFavoritos } from "@/hooks/useImoveis"
import type { LembreteFavoritosHistorico, LembreteFavoritosPayload } from "@/types/imovel"

const DEFAULT_MESSAGE = "Ola, tenho interesse no imovel {titulo}: {url}"

export function AdminLembretesPage() {
  const { data, isLoading } = useLembreteFavoritos()
  const { data: corretores = [] } = useCorretores()
  const update = useUpdateLembreteFavoritos()
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
  const [selectedRun, setSelectedRun] = useState<LembreteFavoritosHistorico | null>(null)
  const [form, setForm] = useState<LembreteFavoritosPayload>({
    horario: "09:00",
    ativo: false,
    whatsapp_mensagem: DEFAULT_MESSAGE,
    whatsapp_destino: "corretor",
    whatsapp_corretor_id: null,
    whatsapp_numero_manual: "",
  })

  useEffect(() => {
    if (!data?.config) return
    setForm({
      horario: data.config.horario,
      ativo: data.config.ativo,
      whatsapp_mensagem: data.config.whatsapp_mensagem,
      whatsapp_destino: "corretor",
      whatsapp_corretor_id: data.config.whatsapp_corretor_id ?? null,
      whatsapp_numero_manual: "",
    })
  }, [data])

  const stats = data?.stats
  const config = data?.config
  const historico = data?.historico ?? []
  const cards = [
    { label: "Clientes que receberão", value: stats?.clientes_com_favoritos, icon: Users },
    { label: "Favoritos cadastrados", value: stats?.favoritos_cadastrados, icon: Heart },
    { label: "Favoritos disponíveis", value: stats?.favoritos_disponiveis, icon: Send },
    { label: "Imóveis favoritados", value: stats?.imoveis_favoritados, icon: Home },
  ]
  const preview = useMemo(
    () =>
      form.whatsapp_mensagem
        .replaceAll("{titulo}", "apartamento azalheias")
        .replaceAll("{url}", "https://maldonadocorretorimoveis.com.br/imoveis/2")
        .replaceAll("{preco}", "R$ 250.000,00")
        .replaceAll("{endereco}", "Rua Coronel Carvalhães - Mococa - SP"),
    [form.whatsapp_mensagem],
  )
  const whatsappSelectValue = form.whatsapp_corretor_id ? String(form.whatsapp_corretor_id) : "_"
  const selectedCorretor = corretores.find((corretor) => corretor.id === form.whatsapp_corretor_id)
  const whatsappDestinoLabel = config?.whatsapp_corretor?.nome ?? "Nenhum corretor fixo selecionado"
  const whatsappNumeroAtivo = config?.whatsapp_numero_ativo || config?.whatsapp_corretor?.whatsapp || config?.whatsapp_corretor?.telefone || ""

  function changeWhatsappCorretor(value: string) {
    setForm((current) => ({
      ...current,
      whatsapp_destino: "corretor",
      whatsapp_corretor_id: value === "_" ? null : Number(value),
      whatsapp_numero_manual: "",
    }))
  }

  async function save(nextForm = form) {
    if (messageOpen && !nextForm.whatsapp_corretor_id) {
      toast.error("Selecione um corretor para usar o telefone cadastrado")
      return
    }

    try {
      const response = await update.mutateAsync(nextForm)
      toast.success(response.message ?? "Configuração salva")
      setScheduleOpen(false)
      setMessageOpen(false)
    } catch {
      toast.error("Não foi possível salvar a configuração")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold">Lembretes de favoritos</h1>
          <p className="mt-2 text-muted-foreground">Agende a rotina diária e personalize a mensagem enviada pelo WhatsApp.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:flex-wrap">
          <Button variant="outline" className="w-full rounded-full bg-white sm:w-auto" onClick={() => setMessageOpen(true)}>
            <MessageCircle className="size-4" />
            Editar WhatsApp
          </Button>
          <Button className="w-full rounded-full sm:w-auto" onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="size-4" />
            Agendar rotina
          </Button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="min-w-0 rounded-[24px] border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="min-w-0 text-sm font-medium leading-5 text-muted-foreground">{label}</CardTitle>
              <Icon className="size-5 shrink-0 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-20 rounded-full" /> : <div className="text-3xl font-semibold">{value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="min-w-0 max-w-full overflow-hidden rounded-[28px] border-border/80 bg-white shadow-none">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
              <Clock className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 break-words">Agendamento no servidor</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4 px-4 sm:px-6">
            {isLoading ? (
              <Skeleton className="h-40 rounded-3xl" />
            ) : (
              <>
                <InfoRow label="Status" value={config?.ativo ? "Ativo" : "Inativo"} />
                <InfoRow label="Horário diário" value={config?.horario ?? "09:00"} />
                <InfoRow label="Cron instalado" value={config?.cron_instalado ? "Sim" : "Não"} />
              </>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 max-w-full overflow-hidden rounded-[28px] border-border/80 bg-white shadow-none">
          <CardHeader className="px-4 sm:px-6">
            <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
              <MessageCircle className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 break-words">Mensagem do WhatsApp</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="min-w-0 space-y-4 px-4 sm:px-6">
            {isLoading ? (
              <Skeleton className="h-40 rounded-3xl" />
            ) : (
              <>
                <div className="min-w-0 rounded-2xl border bg-secondary/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Template</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{config?.whatsapp_mensagem}</p>
                </div>
                <div className="min-w-0 rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prévia</p>
                  <p className="mt-2 whitespace-pre-wrap break-all text-sm leading-6 text-muted-foreground">{preview}</p>
                </div>
                <div className="min-w-0 rounded-2xl border bg-white p-4">
                  <p className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Phone className="size-4 shrink-0 text-primary" />
                    <span className="min-w-0 break-words">Corretor do WhatsApp</span>
                  </p>
                  <p className="mt-2 break-words text-sm font-semibold text-foreground">{whatsappDestinoLabel}</p>
                  <p className="mt-1 break-words text-sm text-muted-foreground">{whatsappNumeroAtivo ? formatWhatsappNumber(whatsappNumeroAtivo) : "Selecione um corretor para usar o telefone cadastrado."}</p>
                </div>
                <p className="break-words text-xs leading-5 text-muted-foreground">
                  Variáveis aceitas: <code>{"{titulo}"}</code>, <code>{"{url}"}</code>, <code>{"{preco}"}</code>, <code>{"{endereco}"}</code>.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="text-lg">Imóveis mais favoritados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-full overflow-x-auto rounded-[22px] border premium-scrollbar">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-secondary/70 text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 text-left font-medium">Imóvel</th>
                  <th className="px-5 py-4 text-left font-medium">Clientes</th>
                  <th className="px-5 py-4 text-left font-medium">Favoritos</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.top_imoveis ?? []).map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><Home className="size-4" /></span>
                        <span className="min-w-0 break-words font-semibold">{item.titulo}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        {item.clientes.map((cliente) => (
                          <span key={cliente.id} className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground" title={cliente.email || cliente.nome}>
                            <Users className="size-3.5 text-primary" />
                            <span>{cliente.nome}</span>
                            {cliente.email ? <Mail className="size-3.5 text-muted-foreground" /> : null}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-primary">
                        <Heart className="size-3.5 fill-current" />
                        {item.favoritos}
                      </span>
                    </td>
                  </tr>
                ))}
                {!isLoading && !stats?.top_imoveis.length ? (
                  <tr><td colSpan={3} className="px-5 py-10 text-center text-muted-foreground">Nenhum favorito disponível.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/80 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="size-5 text-primary" />
            Histórico de execuções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-full overflow-x-auto rounded-[22px] border premium-scrollbar">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-secondary/70 text-muted-foreground">
                <tr>
                  <th className="px-5 py-4 text-left font-medium">Execução</th>
                  <th className="px-5 py-4 text-left font-medium">Horário</th>
                  <th className="px-5 py-4 text-left font-medium">Status</th>
                  <th className="px-5 py-4 text-left font-medium">Log</th>
                  <th className="px-5 py-4 text-right font-medium">Response</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="px-5 py-4 font-semibold text-foreground">{formatDateTime(item.executado_em)}</td>
                    <td className="px-5 py-4 text-muted-foreground">{item.horario || config?.horario || "09:00"}</td>
                    <td className="px-5 py-4">
                      <span className={statusClassName(item.status)}>{statusLabel(item.status)}</span>
                    </td>
                    <td className="max-w-[360px] px-5 py-4">
                      <p className="line-clamp-2 break-words text-muted-foreground">{item.log || "Sem detalhes registrados."}</p>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="outline" size="sm" className="rounded-full bg-white" onClick={() => setSelectedRun(item)}>
                        <Eye className="size-4" />
                        Ver response
                      </Button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !historico.length ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">Nenhuma execução registrada ainda.</td></tr>
                ) : null}
                {isLoading ? (
                  <tr><td colSpan={5} className="px-5 py-6"><Skeleton className="h-10 rounded-full" /></td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" />Agendar rotina</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 gap-4">
            <Label className="grid min-w-0 gap-2 text-sm font-medium">
              Horário diário
              <Input className="w-full" type="time" value={form.horario} onChange={(event) => setForm((current) => ({ ...current, horario: event.target.value }))} />
            </Label>
            <Label className="flex items-center gap-3 rounded-2xl border bg-secondary/50 p-4 text-sm font-medium">
              <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))} />
              Ativar envio diário no cron do Ubuntu
            </Label>
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:flex">
            <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button className="w-full rounded-full sm:w-auto" onClick={() => save()} disabled={update.isPending}>
              <Save className="size-4" />
              {update.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="size-5 text-primary" />Editar mensagem do WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 gap-4">
            <Label className="grid min-w-0 gap-2 text-sm font-medium">
              Corretor do WhatsApp
              <Select value={whatsappSelectValue} onValueChange={changeWhatsappCorretor}>
                <SelectTrigger className="h-11 w-full">
                  <SelectValue placeholder="Selecionar corretor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_">Selecionar corretor</SelectItem>
                  {corretores.map((corretor) => (
                    <SelectItem key={corretor.id} value={String(corretor.id)}>
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {corretor.foto_url ? (
                            <img src={corretor.foto_url} alt="" className="size-full object-cover" />
                          ) : (
                            corretor.nome.slice(0, 1).toUpperCase()
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">{corretor.nome}</span>
                          <span className="block truncate text-xs text-muted-foreground">{formatWhatsappNumber(corretor.whatsapp || corretor.telefone || "")}</span>
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
            {selectedCorretor ? (
              <div className="rounded-2xl border bg-secondary/50 p-4 text-sm text-muted-foreground">
                O link será enviado para o telefone cadastrado de <strong className="text-foreground">{selectedCorretor.nome}</strong>: {formatWhatsappNumber(selectedCorretor.whatsapp || selectedCorretor.telefone || "")}.
              </div>
            ) : (
              <div className="rounded-2xl border bg-secondary/50 p-4 text-sm text-muted-foreground">
                Selecione um corretor para definir o número usado nos links de WhatsApp do lembrete.
              </div>
            )}
            <Label className="grid min-w-0 gap-2 text-sm font-medium">
              Mensagem
              <Textarea rows={5} value={form.whatsapp_mensagem} onChange={(event) => setForm((current) => ({ ...current, whatsapp_mensagem: event.target.value }))} />
            </Label>
            <div className="min-w-0 rounded-2xl border bg-secondary/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prévia</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{preview}</p>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:flex">
            <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setMessageOpen(false)}>Cancelar</Button>
            <Button className="w-full rounded-full sm:w-auto" onClick={() => save()} disabled={update.isPending}>
              <Save className="size-4" />
              {update.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRun)} onOpenChange={(open) => !open && setSelectedRun(null)}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="size-5 text-primary" />
              Response da execução
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <InfoRow label="Execução" value={formatDateTime(selectedRun?.executado_em)} />
              <InfoRow label="Horário" value={selectedRun?.horario || config?.horario || "09:00"} />
              <InfoRow label="Status" value={statusLabel(selectedRun?.status)} />
            </div>
            <pre className="max-h-[52svh] overflow-auto rounded-2xl border bg-secondary/50 p-4 text-xs leading-5 text-foreground premium-scrollbar">
              {JSON.stringify(selectedRun?.response ?? {}, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-full sm:w-auto" onClick={() => setSelectedRun(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-sm font-semibold text-foreground sm:text-right">{value}</span>
    </div>
  )
}

function formatWhatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return "Sem número"
  return `+${digits}`
}

function formatDateTime(value?: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

function statusLabel(value?: string) {
  const labels: Record<string, string> = {
    concluido: "Concluído",
    executando: "Executando",
    erro: "Erro",
    sem_destinatarios: "Sem destinatários",
    log: "Log",
  }
  return labels[value ?? ""] ?? "Registrado"
}

function statusClassName(value: string) {
  const base = "inline-flex rounded-full px-3 py-1.5 text-xs font-bold"
  if (value === "concluido") return `${base} bg-emerald-50 text-emerald-700`
  if (value === "erro") return `${base} bg-red-50 text-red-700`
  if (value === "executando") return `${base} bg-blue-50 text-blue-700`
  if (value === "sem_destinatarios") return `${base} bg-amber-50 text-amber-700`
  return `${base} bg-secondary text-muted-foreground`
}
