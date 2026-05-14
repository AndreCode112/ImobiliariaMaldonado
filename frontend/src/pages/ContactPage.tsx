import { CalendarCheck, Mail, MessageCircle, Phone } from "lucide-react"
import { motion } from "framer-motion"

import { pageTransition } from "@/animations/page"
import { Button } from "@/components/ui/button"

export function ContactPage() {
  return (
    <motion.section {...pageTransition} className="min-h-[calc(100svh-88px)] bg-secondary px-6 py-12">
      <div className="mx-auto grid max-w-[1120px] gap-8 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[36px] bg-white p-8 md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Consultoria de compra</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Uma curadoria precisa para encontrar seu próximo endereço.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">Fale com a Maldonado Corretor para visitas, análise de perfil e oportunidades residenciais de alto padrão.</p>
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

function ContactCard({ icon: Icon, title, detail }: { icon: typeof Mail; title: string; detail: string }) {
  return (
    <div className="rounded-[28px] border bg-white p-6">
      <Icon className="mb-5 size-6 text-primary" />
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  )
}
