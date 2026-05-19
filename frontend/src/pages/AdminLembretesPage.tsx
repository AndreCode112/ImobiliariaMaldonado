import { CalendarClock, Clock, Heart, Home, Mail, MessageCircle, Pencil, Phone, Save, Send, Users } from "lucide-react"
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
import type { LembreteFavoritosPayload } from "@/types/imovel"

const DEFAULT_MESSAGE = "Ola, tenho interesse no imovel {titulo}: {url}"

export function AdminLembretesPage() {
  const { data, isLoading } = useLembreteFavoritos()
  const { data: corretores = [] } = useCorretores()
  const update = useUpdateLembreteFavoritos()
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [messageOpen, setMessageOpen] = useState(false)
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
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold">Lembretes de favoritos</h1>
          <p className="mt-2 text-muted-foreground">Agende a rotina diária e personalize a mensagem enviada pelo WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-full bg-white" onClick={() => setMessageOpen(true)}>
            <MessageCircle className="size-4" />
            Editar WhatsApp
          </Button>
          <Button className="rounded-full" onClick={() => setScheduleOpen(true)}>
            <CalendarClock className="size-4" />
            Agendar rotina
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-[24px] border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="size-5 text-primary" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-20 rounded-full" /> : <div className="text-3xl font-semibold">{value ?? 0}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="rounded-[28px] border-border/80 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="size-5 text-primary" />
              Agendamento no servidor
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-40 rounded-3xl" />
            ) : (
              <>
                <InfoRow label="Status" value={config?.ativo ? "Ativo" : "Inativo"} />
                <InfoRow label="Horário diário" value={config?.horario ?? "09:00"} />
                <InfoRow label="Cron instalado" value={config?.cron_instalado ? "Sim" : "Não"} />
                <div className="rounded-2xl border bg-secondary/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Comando no Ubuntu</p>
                  <p className="mt-2 break-all font-mono text-xs leading-5 text-foreground">{config?.cron_linha || "Nenhuma rotina instalada."}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/80 bg-white shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="size-5 text-primary" />
              Mensagem do WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-40 rounded-3xl" />
            ) : (
              <>
                <div className="rounded-2xl border bg-secondary/50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Template</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{config?.whatsapp_mensagem}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prévia</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{preview}</p>
                </div>
                <div className="rounded-2xl border bg-white p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Phone className="size-4 text-primary" />
                    Corretor do WhatsApp
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">{whatsappDestinoLabel}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{whatsappNumeroAtivo ? formatWhatsappNumber(whatsappNumeroAtivo) : "Selecione um corretor para usar o telefone cadastrado."}</p>
                </div>
                <p className="text-xs leading-5 text-muted-foreground">
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
          <div className="overflow-hidden rounded-[22px] border">
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
                        <span className="font-semibold">{item.titulo}</span>
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

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="rounded-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarClock className="size-5 text-primary" />Agendar rotina</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Label className="grid gap-2 text-sm font-medium">
              Horário diário
              <Input type="time" value={form.horario} onChange={(event) => setForm((current) => ({ ...current, horario: event.target.value }))} />
            </Label>
            <Label className="flex items-center gap-3 rounded-2xl border bg-secondary/50 p-4 text-sm font-medium">
              <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))} />
              Ativar envio diário no cron do Ubuntu
            </Label>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={() => save()} disabled={update.isPending}>
              <Save className="size-4" />
              {update.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={messageOpen} onOpenChange={setMessageOpen}>
        <DialogContent className="rounded-[28px] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="size-5 text-primary" />Editar mensagem do WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <Label className="grid gap-2 text-sm font-medium">
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
            <Label className="grid gap-2 text-sm font-medium">
              Mensagem
              <Textarea rows={5} value={form.whatsapp_mensagem} onChange={(event) => setForm((current) => ({ ...current, whatsapp_mensagem: event.target.value }))} />
            </Label>
            <div className="rounded-2xl border bg-secondary/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Prévia</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{preview}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setMessageOpen(false)}>Cancelar</Button>
            <Button className="rounded-full" onClick={() => save()} disabled={update.isPending}>
              <Save className="size-4" />
              {update.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border bg-white p-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold text-foreground">{value}</span>
    </div>
  )
}

function formatWhatsappNumber(value: string) {
  const digits = value.replace(/\D/g, "")
  if (!digits) return "Sem número"
  return `+${digits}`
}
