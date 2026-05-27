import { KeyRound } from "lucide-react"
import { useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/authService"

export function ResetPasswordPage() {
  const { uid = "", token = "" } = useParams()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const password = String(formData.get("password") ?? "")
    const passwordConfirm = String(formData.get("password_confirm") ?? "")

    if (password !== passwordConfirm) {
      toast.error("As senhas não conferem")
      return
    }

    setIsSubmitting(true)
    try {
      await authService.confirmPasswordReset({ uid, token, password })
      toast.success("Senha alterada", { description: "Entre com sua nova senha." })
      navigate("/login", { replace: true })
    } catch {
      toast.error("Não foi possível alterar a senha", {
        description: "O link pode estar expirado ou a senha não atende aos critérios.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid min-h-[calc(100svh-88px)] place-items-center bg-secondary px-6 py-12">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-[32px] border bg-white p-8">
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-white">
            <KeyRound className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Redefinir senha</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Defina uma nova senha para sua conta.</p>
        </div>
        <div className="grid gap-4">
          <Label className="grid gap-2">
            Nova senha
            <Input name="password" type="password" autoComplete="new-password" required />
          </Label>
          <Label className="grid gap-2">
            Confirmar senha
            <Input name="password_confirm" type="password" autoComplete="new-password" required />
          </Label>
          <Button type="submit" className="mt-2 h-12 rounded-full" disabled={isSubmitting}>
            {isSubmitting ? "Alterando..." : "Alterar senha"}
          </Button>
          <Button asChild type="button" variant="ghost" className="rounded-full">
            <Link to="/login">Voltar para login</Link>
          </Button>
        </div>
      </form>
    </section>
  )
}
