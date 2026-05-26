import { BadgeCheck, Copy, Edit, KeyRound, Mail, Search, Shield, UserRound, Users } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { AxiosError } from "axios"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useUpdateUsuario, useUsuarioResetLink, useUsuarios } from "@/hooks/useImoveis"
import type { AdminUser, AdminUserPayload, PasswordResetLink } from "@/types/auth"

const EMPTY: AdminUserPayload = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  is_active: true,
  is_staff: false,
  is_superuser: false,
}

export function AdminUsuariosPage() {
  const { data: usuarios = [], isLoading } = useUsuarios()
  const updateUsuario = useUpdateUsuario()
  const resetLink = useUsuarioResetLink()
  const [filter, setFilter] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<AdminUserPayload>(EMPTY)
  const [generatedLink, setGeneratedLink] = useState<PasswordResetLink | null>(null)

  const filtered = usuarios.filter((usuario) =>
    [usuario.username, usuario.email, usuario.first_name, usuario.last_name].join(" ").toLowerCase().includes(filter.toLowerCase()),
  )

  function openEdit(usuario: AdminUser) {
    setEditing(usuario)
    setGeneratedLink(null)
    setForm({
      username: usuario.username,
      email: usuario.email ?? "",
      first_name: usuario.first_name ?? "",
      last_name: usuario.last_name ?? "",
      is_active: usuario.is_active,
      is_staff: usuario.is_staff,
      is_superuser: usuario.is_superuser,
    })
    setDialogOpen(true)
  }

  async function save() {
    if (!editing) return
    if (!form.username.trim()) {
      toast.error("Usuário é obrigatório")
      return
    }
    try {
      await updateUsuario.mutateAsync({ id: editing.id, payload: form })
      toast.success("Usuário atualizado")
      setDialogOpen(false)
    } catch {
      toast.error("Não foi possível atualizar o usuário")
    }
  }

  async function generateResetLink() {
    if (!editing) return
    try {
      const link = await resetLink.mutateAsync(editing.id)
      setGeneratedLink(link)
      await navigator.clipboard?.writeText(link.reset_url)
      toast.success("Link de redefinição copiado")
    } catch (error) {
      const message = error instanceof AxiosError
        ? error.response?.data?.message || error.response?.data?.detail || `Erro ${error.response?.status ?? "desconhecido"} ao gerar o link`
        : "Não foi possível gerar o link"
      toast.error("Não foi possível gerar o link", { description: message })
    }
  }

  async function copyGeneratedLink() {
    if (!generatedLink) return
    await navigator.clipboard?.writeText(generatedLink.reset_url)
    toast.success("Link copiado")
  }

  return (
    <div className="space-y-5">
      <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
          <h1 className="mt-2 text-3xl font-semibold">Usuários</h1>
          <p className="mt-2 text-muted-foreground">{usuarios.length} usuários cadastrados</p>
        </div>
      </div>

      <div className="relative min-w-0 w-full max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-11 w-full rounded-full bg-white pl-9" placeholder="Buscar usuários..." value={filter} onChange={(event) => setFilter(event.target.value)} />
      </div>

      <div className="max-w-full overflow-x-auto rounded-[24px] border bg-white premium-scrollbar">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-secondary/70 text-muted-foreground">
            <tr>
              <th className="px-5 py-4 text-left font-medium">Usuário</th>
              <th className="px-5 py-4 text-left font-medium">Nome</th>
              <th className="px-5 py-4 text-left font-medium">E-mail</th>
              <th className="px-5 py-4 text-left font-medium">Permissões</th>
              <th className="px-5 py-4 text-left font-medium">Status</th>
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 4 }).map((_, index) => (
              <tr key={index} className="border-t"><td colSpan={6} className="px-5 py-4"><Skeleton className="h-10 rounded-full" /></td></tr>
            )) : filtered.map((usuario) => (
              <tr key={usuario.id} className="border-t transition hover:bg-secondary/50">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{usuario.username.slice(0, 1).toUpperCase()}</span>
                    <span className="font-semibold">{usuario.username}</span>
                  </div>
                </td>
                <td className="px-5 py-4">{[usuario.first_name, usuario.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-5 py-4"><TableBadge icon={Mail} value={usuario.email || "Sem e-mail"} /></td>
                <td className="px-5 py-4">
                  <TableBadge
                    icon={usuario.is_superuser ? Shield : Users}
                    value={usuario.is_superuser ? "Admin" : usuario.is_staff ? "Equipe" : "Comum"}
                    tone={usuario.is_superuser ? "gold" : usuario.is_staff ? "blue" : "neutral"}
                  />
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${usuario.is_active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"}`}>
                    <BadgeCheck className="size-3.5" />
                    {usuario.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end">
                    <Button size="icon" variant="ghost" className="rounded-full" onClick={() => openEdit(usuario)}><Edit className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Nenhum usuário encontrado.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserRound className="size-5 text-primary" />Editar usuário</DialogTitle>
          </DialogHeader>
          <div className="grid min-w-0 gap-4">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Usuário"><Input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} /></Field>
              <Field label="E-mail"><Input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></Field>
            </div>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <Field label="Nome"><Input value={form.first_name} onChange={(event) => setForm((current) => ({ ...current, first_name: event.target.value }))} /></Field>
              <Field label="Sobrenome"><Input value={form.last_name} onChange={(event) => setForm((current) => ({ ...current, last_name: event.target.value }))} /></Field>
            </div>
            <div className="grid gap-3 rounded-2xl border bg-secondary/50 p-4 sm:grid-cols-3">
              <Checkbox label="Ativo" checked={form.is_active} onChange={(value) => setForm((current) => ({ ...current, is_active: value }))} />
              <Checkbox label="Equipe" checked={form.is_staff} onChange={(value) => setForm((current) => ({ ...current, is_staff: value }))} />
              <Checkbox label="Administrador" checked={form.is_superuser} onChange={(value) => setForm((current) => ({ ...current, is_superuser: value }))} />
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">Redefinição de senha</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">O admin gera um link seguro. O usuário define a nova senha por conta própria.</p>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={generateResetLink} disabled={resetLink.isPending}>
                  <KeyRound className="size-4" />
                  {resetLink.isPending ? "Gerando..." : "Gerar link"}
                </Button>
              </div>
              {generatedLink ? (
                <div className="mt-4 flex min-w-0 gap-2 rounded-2xl bg-secondary p-2">
                  <Input readOnly className="h-10 min-w-0 bg-white" value={generatedLink.reset_url} />
                  <Button type="button" size="icon" variant="outline" className="size-10 rounded-full bg-white" onClick={copyGeneratedLink} aria-label="Copiar link">
                    <Copy className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:flex">
            <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button className="w-full rounded-full sm:w-auto" onClick={save} disabled={updateUsuario.isPending}>{updateUsuario.isPending ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Label className="grid min-w-0 gap-2 text-sm font-medium">{label}{children}</Label>
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Label className="flex items-center gap-3 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </Label>
  )
}

function TableBadge({ icon: Icon, value, tone = "neutral" }: { icon: typeof Mail; value: string; tone?: "neutral" | "blue" | "gold" }) {
  const toneClass = {
    neutral: "bg-secondary text-foreground",
    blue: "bg-sky-50 text-sky-700",
    gold: "bg-amber-50 text-amber-700",
  }[tone]

  return (
    <span className={`inline-flex max-w-[240px] items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${toneClass}`}>
      <Icon className="size-3.5 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  )
}
