import { Compass, Edit, Fingerprint, LocateFixed, MapPin, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useCidades, useCreateCidade, useDeleteCidade, useUpdateCidade } from "@/hooks/useImoveis"
import type { Cidade, CidadePayload } from "@/types/imovel"

const EMPTY: CidadePayload = { nome: "", estado: "", codigo_ibge: "" }

export function AdminCidadesPage() {
  const { data: cidades = [], isLoading } = useCidades()
  const createCidade = useCreateCidade()
  const updateCidade = useUpdateCidade()
  const deleteCidade = useDeleteCidade()
  const [filter, setFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Cidade | null>(null)
  const [form, setForm] = useState<CidadePayload>(EMPTY)

  const filtered = cidades.filter((cidade) =>
    [cidade.nome, cidade.estado, cidade.codigo_ibge].join(" ").toLowerCase().includes(filter.toLowerCase()),
  )
  const saving = createCidade.isPending || updateCidade.isPending

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setDialogOpen(true)
  }

  function openEdit(cidade: Cidade) {
    setEditing(cidade)
    setForm({ nome: cidade.nome, estado: cidade.estado || "", codigo_ibge: cidade.codigo_ibge || "" })
    setDialogOpen(true)
  }

  async function save() {
    if (!form.nome || !form.estado) {
      toast.error("Nome e UF são obrigatórios")
      return
    }
    const payload = { ...form, estado: form.estado.toUpperCase().slice(0, 2) }
    try {
      if (editing) await updateCidade.mutateAsync({ id: editing.id, payload })
      else await createCidade.mutateAsync(payload)
      toast.success(editing ? "Cidade atualizada" : "Cidade cadastrada")
      setDialogOpen(false)
    } catch {
      toast.error("Não foi possível salvar a cidade")
    }
  }

  async function remove(cidade: Cidade) {
    if (!confirm(`Excluir ${cidade.nome}?`)) return
    try {
      await deleteCidade.mutateAsync(cidade.id)
      toast.success("Cidade removida")
    } catch {
      toast.error("Não foi possível remover a cidade")
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold">Cidades</h1>
          <p className="mt-2 text-muted-foreground">{cidades.length} cidades cadastradas</p>
        </div>
        <Button className="w-full rounded-full sm:w-auto" onClick={openCreate}><Plus className="size-4" />Nova cidade</Button>
      </div>

      <div className="relative min-w-0 w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 w-full rounded-full bg-white pl-9" placeholder="Buscar cidades..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>

      <div className="max-w-full overflow-x-auto rounded-[24px] border bg-white premium-scrollbar">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/70 text-muted-foreground">
            <tr>
              <th className="px-5 py-4 text-left font-medium">Cidade</th>
              <th className="px-5 py-4 text-left font-medium">UF</th>
              <th className="px-5 py-4 text-left font-medium">IBGE</th>
              <th className="px-5 py-4 text-left font-medium">Latitude</th>
              <th className="px-5 py-4 text-left font-medium">Longitude</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-t"><td colSpan={6} className="px-5 py-4"><Skeleton className="h-10 rounded-full" /></td></tr>
            )) : filtered.map((cidade) => (
              <tr key={cidade.id} className="border-t transition hover:bg-secondary/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"><MapPin className="size-4" /></span>
                    <span className="font-medium">{cidade.nome}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">{cidade.estado}</span>
                </td>
                <td className="px-5 py-4"><TableBadge icon={Fingerprint} value={cidade.codigo_ibge || "Sem IBGE"} /></td>
                <td className="px-5 py-4"><TableBadge icon={LocateFixed} value={cidade.latitude || "Auto"} tone="blue" /></td>
                <td className="px-5 py-4"><TableBadge icon={Compass} value={cidade.longitude || "Auto"} tone="blue" /></td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" className="rounded-full" onClick={() => openEdit(cidade)}><Edit className="size-4" /></Button>
                    <Button size="icon" variant="ghost" className="rounded-full text-destructive" onClick={() => remove(cidade)}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Nenhuma cidade encontrada.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-[28px] sm:!max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cidade" : "Nova cidade"}</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 gap-4">
            <Field label="Nome *">
              <Input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} placeholder="São Paulo" />
            </Field>
            <Field label="UF *">
              <Input value={form.estado} maxLength={2} onChange={(event) => setForm((current) => ({ ...current, estado: event.target.value.toUpperCase().slice(0, 2) }))} placeholder="SP" />
            </Field>
            <Field label="Código IBGE">
              <Input value={form.codigo_ibge} onChange={(event) => setForm((current) => ({ ...current, codigo_ibge: event.target.value }))} placeholder="3550308" />
            </Field>
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:flex">
            <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="w-full rounded-full sm:w-auto" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="grid min-w-0 gap-2 text-sm font-medium">{label}{children}</Label>
}

function TableBadge({ icon: Icon, value, tone = "neutral" }: { icon: typeof Fingerprint; value: string; tone?: "neutral" | "blue" }) {
  const toneClass = tone === "blue" ? "bg-sky-50 text-sky-700" : "bg-secondary text-foreground"
  return (
    <span className={`inline-flex max-w-[180px] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  )
}
