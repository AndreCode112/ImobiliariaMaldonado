import { ArrowRight, Shield, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"

export function AdminLoginPage() {
  const { isAuthenticated, isSuperuser, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated) return <Navigate to={isSuperuser ? "/admin" : "/"} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const session = await login({
        username: String(formData.get("username") ?? ""),
        password: String(formData.get("password") ?? ""),
      })
      toast.success("Login realizado", {
        description: "Bem-vindo de volta.",
      })
      const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
      const target = from?.pathname ? `${from.pathname}${from.search ?? ""}` : undefined
      const safeTarget = target?.startsWith("/admin") && !session.user.is_superuser ? "/" : target
      navigate(session.user.is_superuser ? safeTarget ?? "/admin" : safeTarget ?? "/", { replace: true })
    } catch {
      toast.error("Não foi possível entrar", {
        description: "Confira usuário e senha e tente novamente.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="grid min-h-[calc(100svh-88px)] place-items-center bg-secondary px-6 py-12">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-[32px] border bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.08)]"
      >
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-white">
            <Shield className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Entrar</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use sua conta do Django para acessar favoritos ou o painel administrativo.</p>
        </div>
        <div className="grid gap-4">
          <Label className="grid gap-2">
            Usuário
            <Input name="username" autoComplete="username" required />
          </Label>
          <Label className="grid gap-2">
            Senha
            <Input name="password" type="password" autoComplete="current-password" required />
          </Label>
          <Button type="submit" className="mt-2 h-12 rounded-full" disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
          <div className="mt-3 rounded-2xl bg-secondary p-4 text-center">
            <p className="text-sm font-medium">Ainda não tem conta?</p>
            <Button asChild type="button" variant="ghost" className="mt-2 h-10 rounded-full text-primary hover:text-primary">
              <Link to="/cadastro">
                <UserPlus className="size-4" />
                Criar conta
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </motion.form>
    </section>
  )
}
