import { ArrowLeft, CalendarCheck, Mail, MessageCircle, Phone } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"

import { pageTransition } from "@/animations/page"
import { AccountMenuButton } from "@/components/layout/PremiumHeader"
import { Button } from "@/components/ui/button"

export function ContactPage() {
  return (
    <motion.section {...pageTransition} className="min-h-svh bg-secondary px-4 py-20 sm:px-6 md:py-24">
      <PageTopControls />
      <div className="mx-auto grid min-w-0 max-w-[1120px] gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0 rounded-[28px] bg-white p-6 sm:rounded-[36px] md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Consultoria de compra</p>
          <h1 className="mt-4 max-w-3xl break-words text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl">Uma curadoria precisa para encontrar seu próximo endereço.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">Fale com a Maldonado Corretor para visitas, análise de perfil e oportunidades residenciais de alto padrão.</p>
          <Button className="mt-8 h-12 rounded-full px-6">
            <CalendarCheck className="size-4" />
            Agendar consultoria
          </Button>
        </div>
        <div className="grid gap-4">
          <ContactCard icon={MessageCircle} title="WhatsApp" detail="Atendimento rápido para interessados" />
          <ContactCard icon={Phone} title="Telefone" detail="Contato direto com a consultoria" />
          <ContactCard icon={Mail} title="E-mail" detail="Envie sua intenção de compra" />
        </div>
      </div>
    </motion.section>
  )
}

function PageTopControls() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex items-center justify-between px-4 py-4 md:px-8">
      <Button
        asChild
        variant="outline"
        className="pointer-events-auto size-11 rounded-full border-border/80 bg-white/82 px-0 shadow-[0_18px_50px_rgba(0,0,0,0.10)] backdrop-blur-xl hover:bg-white"
      >
        <Link to="/" aria-label="Voltar para a página inicial">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <AccountMenuButton
        wrapperClassName="pointer-events-auto block"
        className="inline-flex border-border/80 bg-white/82 shadow-[0_18px_50px_rgba(0,0,0,0.10)] backdrop-blur-xl hover:bg-white"
        menuClassName="top-[calc(100%+10px)]"
      />
    </div>
  )
}

function ContactCard({ icon: Icon, title, detail }: { icon: typeof Mail; title: string; detail: string }) {
  return (
    <div className="min-w-0 rounded-[28px] border bg-white p-5 sm:p-6">
      <Icon className="mb-5 size-6 text-primary" />
      <h2 className="break-words text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}
