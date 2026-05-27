import { ArrowLeft, ArrowRight, Eye, EyeOff, Shield, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import { AxiosError } from "axios"
import { useState, type FormEvent } from "react"
import { Link, Navigate, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"

export function AdminLoginPage() {
  const { isAuthenticated, isSuperuser, login } = useAuth()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  if (isAuthenticated) return <Navigate to={isSuperuser ? "/admin" : "/"} replace />

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const session = await login({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      })
      toast.success("Login realizado", {
        description: "Bem-vindo de volta.",
      })
      setIsRedirecting(true)
      window.setTimeout(() => {
        navigate(session.user.is_superuser ? "/admin" : "/", { replace: true })
      }, 240)
    } catch (error) {
      const description = error instanceof AxiosError
        ? error.response?.data?.detail || "Confira e-mail e senha e tente novamente."
        : "Confira e-mail e senha e tente novamente."
      toast.error("Não foi possível entrar", {
        description,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="relative grid min-h-dvh items-start justify-items-center bg-secondary px-4 pb-8 pt-24 sm:px-6 md:place-items-center md:py-12">
      <Button
        asChild
        variant="outline"
        className="absolute left-4 top-4 size-11 rounded-full border-border/80 bg-white/82 px-0 hover:bg-white md:left-8 md:top-8"
      >
        <Link to="/" aria-label="Voltar para a página inicial">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={isRedirecting ? { opacity: 0, y: -14, scale: 0.985, filter: "blur(6px)" } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, y: -12, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-[24px] border bg-white p-6 sm:rounded-[32px] sm:p-8"
      >
        <div className="mb-8 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-white">
            <Shield className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Entrar</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use seu e-mail para acessar favoritos ou o painel administrativo.</p>
        </div>
        <div className="grid gap-4">
          <Label className="grid gap-2">
            Email
            <Input name="email" type="email" inputMode="email" autoComplete="email" required />
          </Label>
          <Label className="grid gap-2">
            Senha
            <span className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pr-11"
                required
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </Label>
          <Button type="submit" className="mt-2 h-12 rounded-full" disabled={isSubmitting || isRedirecting}>
            {isSubmitting || isRedirecting ? "Entrando..." : "Entrar"}
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
