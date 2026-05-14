import { ArrowLeft, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authService } from "@/services/authService"

export function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setIsSubmitting(true)
    try {
      await authService.register({
        username: String(formData.get("username") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      })
      toast.success("Cadastro realizado", {
        description: "Agora você pode entrar com sua nova conta.",
      })
      window.setTimeout(() => navigate("/login"), 450)
    } catch {
      toast.error("Não foi possível criar a conta", {
        description: "Confira os dados informados e tente novamente.",
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
        <div className="text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-white">
            <UserPlus className="size-6" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold">Criar conta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Crie sua conta para favoritar imóveis e acompanhar oportunidades.</p>
        </div>
        <div className="mt-8 grid gap-4">
          <Label className="grid gap-2">Usuário<Input name="username" required /></Label>
          <Label className="grid gap-2">E-mail<Input name="email" type="email" /></Label>
          <Label className="grid gap-2">Senha<Input name="password" type="password" required /></Label>
          <Button type="submit" className="h-12 rounded-full" disabled={isSubmitting}>
            {isSubmitting ? "Enviando..." : "Criar conta"}
          </Button>
          <div className="mt-3 rounded-2xl bg-secondary p-4 text-center">
            <p className="text-sm font-medium">Já tem conta?</p>
            <Button asChild type="button" variant="ghost" className="mt-2 h-10 rounded-full text-primary hover:text-primary">
              <Link to="/login">
                <ArrowLeft className="size-4" />
                Entrar
              </Link>
            </Button>
          </div>
        </div>
      </motion.form>
    </section>
  )
}
