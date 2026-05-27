import { BadgeCheck, Edit, Mail, Phone, Plus, Search, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import { DeleteConfirmPopover } from "@/components/admin/DeleteConfirmPopover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useCorretores, useCreateCorretor, useDeleteCorretor, useUpdateCorretor } from "@/hooks/useImoveis"
import { cn } from "@/lib/utils"
import type { CorretorPayload, CorretorResumo } from "@/types/imovel"

const EMPTY: CorretorPayload = { nome: "", telefone: "", whatsapp: "", email: "", creci: "", ativo: true }
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
const MAX_IMAGE_SIZE = 2 * 1024 * 1024

export function AdminCorretoresPage() {
  const { data: corretores = [], isLoading } = useCorretores()
  const createCorretor = useCreateCorretor()
  const updateCorretor = useUpdateCorretor()
  const deleteCorretor = useDeleteCorretor()
  const [filter, setFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CorretorResumo | null>(null)
  const [form, setForm] = useState<CorretorPayload>(EMPTY)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const previewRef = useRef<string | null>(null)

  const filtered = corretores.filter((corretor) =>
    [corretor.nome, corretor.email, corretor.telefone, corretor.whatsapp, corretor.creci].join(" ").toLowerCase().includes(filter.toLowerCase()),
  )
  const saving = createCorretor.isPending || updateCorretor.isPending

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
  }, [])

  function resetPhoto() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    previewRef.current = null
    setPhotoPreview(null)
    setDragActive(false)
  }

  function openCreate() {
    resetPhoto()
    setEditing(null)
    setForm(EMPTY)
    setDialogOpen(true)
  }

  function openEdit(corretor: CorretorResumo) {
    resetPhoto()
    setEditing(corretor)
    setForm({
      nome: corretor.nome,
      telefone: corretor.telefone ?? "",
      whatsapp: corretor.whatsapp ?? "",
      email: corretor.email ?? "",
      creci: corretor.creci ?? "",
      ativo: corretor.ativo ?? true,
      remove_foto: false,
    })
    setDialogOpen(true)
  }

  function addPhoto(files: FileList | null) {
    const file = Array.from(files ?? [])[0]
    if (!file) return
    const ext = file.name.split(".").pop()?.toLowerCase()
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || !ext || !ACCEPTED_EXTENSIONS.includes(ext)) {
      toast.error("Envie somente JPG, JPEG, PNG ou WEBP")
      return
    }
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("A foto pode ter no máximo 2 MB")
      return
    }
    resetPhoto()
    const url = URL.createObjectURL(file)
    previewRef.current = url
    setPhotoPreview(url)
    setForm((current) => ({ ...current, foto: file, remove_foto: false }))
  }

  function clearPhoto() {
    resetPhoto()
    setForm((current) => ({ ...current, foto: null, remove_foto: true }))
  }

  async function save() {
    if (!form.nome) {
      toast.error("Nome é obrigatório")
      return
    }
    try {
      if (editing) await updateCorretor.mutateAsync({ id: editing.id, payload: form })
      else await createCorretor.mutateAsync(form)
      toast.success(editing ? "Corretor atualizado" : "Corretor cadastrado")
      setDialogOpen(false)
    } catch {
      toast.error("Não foi possível salvar o corretor")
    }
  }

  async function remove(corretor: CorretorResumo) {
    try {
      await deleteCorretor.mutateAsync(corretor.id)
      toast.success("Corretor removido")
    } catch {
      toast.error("Não foi possível remover o corretor")
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold">Corretores</h1>
          <p className="mt-2 text-muted-foreground">{corretores.length} corretores cadastrados</p>
        </div>
        <Button className="w-full rounded-full sm:w-auto" onClick={openCreate}><Plus className="size-4" />Novo corretor</Button>
      </div>

      <div className="relative min-w-0 w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 w-full rounded-full bg-white pl-9" placeholder="Buscar corretores..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>

      <div className="max-w-full overflow-x-auto rounded-[24px] border bg-white premium-scrollbar">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-secondary/70 text-muted-foreground">
            <tr>
              <th className="px-5 py-4 text-left font-medium">Nome</th>
              <th className="px-5 py-4 text-left font-medium">Telefone</th>
              <th className="px-5 py-4 text-left font-medium">WhatsApp</th>
              <th className="px-5 py-4 text-left font-medium">E-mail</th>
              <th className="px-5 py-4 text-left font-medium">CRECI</th>
              <th className="px-5 py-4 text-left font-medium">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-t"><td colSpan={7} className="px-5 py-4"><Skeleton className="h-10 rounded-full" /></td></tr>
            )) : filtered.map((corretor) => (
              <tr key={corretor.id} className="border-t transition hover:bg-secondary/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={corretor.foto_url ?? undefined} />
                      <AvatarFallback>{corretor.nome[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{corretor.nome}</span>
                  </div>
                </td>
                <td className="px-5 py-4"><TableBadge icon={Phone} value={corretor.telefone || "—"} /></td>
                <td className="px-5 py-4"><TableBadge icon={Phone} value={corretor.whatsapp || "—"} tone="green" /></td>
                <td className="px-5 py-4"><TableBadge icon={Mail} value={corretor.email || "—"} /></td>
                <td className="px-5 py-4"><TableBadge icon={ShieldCheck} value={corretor.creci || "Sem CRECI"} tone="gold" /></td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${corretor.ativo === false ? "bg-zinc-100 text-zinc-600" : "bg-emerald-50 text-emerald-700"}`}>
                    <BadgeCheck className="size-3.5" />
                    {corretor.ativo === false ? "Inativo" : "Ativo"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button size="icon" variant="ghost" className="rounded-full" onClick={() => openEdit(corretor)}><Edit className="size-4" /></Button>
                    <DeleteConfirmPopover
                      title="Excluir corretor?"
                      description={`Essa ação removerá ${corretor.nome} do cadastro.`}
                      isPending={deleteCorretor.isPending}
                      onConfirm={() => remove(corretor)}
                    >
                      <Button size="icon" variant="ghost" className="rounded-full text-destructive" aria-label={`Excluir ${corretor.nome}`}>
                        <Trash2 className="size-4" />
                      </Button>
                    </DeleteConfirmPopover>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">Nenhum corretor encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] sm:!max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar corretor" : "Novo corretor"}</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="grid min-w-0 gap-4">
              <Field label="Nome *"><Input value={form.nome} onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))} /></Field>
              <div className="grid min-w-0 gap-4 md:grid-cols-2">
                <Field label="Telefone"><Input value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))} /></Field>
                <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(event) => setForm((current) => ({ ...current, whatsapp: event.target.value }))} /></Field>
              </div>
              <Field label="E-mail"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
              <Field label="CRECI"><Input value={form.creci} onChange={(event) => setForm((current) => ({ ...current, creci: event.target.value }))} /></Field>
              <Label className="flex items-center gap-3 text-sm font-medium">
                <input type="checkbox" checked={form.ativo} onChange={(event) => setForm((current) => ({ ...current, ativo: event.target.checked }))} />
                Corretor ativo
              </Label>
            </div>
            <div className="min-w-0">
              <Label className="text-sm font-semibold">Foto</Label>
              <label
                onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
                onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
                onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
                onDrop={(event) => { event.preventDefault(); setDragActive(false); addPhoto(event.dataTransfer.files) }}
                className={cn(
                  "mt-2 flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[20px] border bg-white text-center transition",
                  dragActive && "border-primary/50",
                )}
              >
                {photoPreview || (!form.remove_foto && editing?.foto_url) ? (
                  <img src={photoPreview ?? editing?.foto_url ?? ""} alt="Foto do corretor" className="size-full object-cover" />
                ) : (
                  <div className="grid gap-2 px-4 text-muted-foreground">
                    <UploadCloud className="mx-auto size-7" />
                    <span className="text-xs">Arraste ou clique</span>
                  </div>
                )}
                <input className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={(event) => addPhoto(event.target.files)} />
              </label>
              {(photoPreview || (!form.remove_foto && editing?.foto_url)) ? (
                <Button variant="outline" className="mt-3 w-full rounded-full" onClick={clearPhoto}><X className="size-4" />Remover foto</Button>
              ) : null}
            </div>
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

function TableBadge({ icon: Icon, value, tone = "neutral" }: { icon: typeof Phone; value: string; tone?: "neutral" | "green" | "gold" }) {
  const toneClass = {
    neutral: "bg-secondary text-foreground",
    green: "bg-emerald-50 text-emerald-700",
    gold: "bg-amber-50 text-amber-700",
  }[tone]

  return (
    <span className={`inline-flex max-w-[220px] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  )
}
