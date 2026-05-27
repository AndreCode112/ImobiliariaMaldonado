import { ArrowLeft, BadgeCheck, Mail, MessageCircle, Phone } from "lucide-react"
import { motion } from "framer-motion"
import { Link } from "react-router-dom"

import { pageTransition } from "@/animations/page"
import { AccountMenuButton } from "@/components/layout/PremiumHeader"
import { Button } from "@/components/ui/button"

const CONTACT = {
  creci: "247665 F",
  email: "tiagosecco@creci.org.br",
  whatsappLabel: "+55 19 98138-9243",
  whatsappNumber: "5519981389243",
}

const WHATSAPP_MESSAGE = "Olá, Tiago. Vim pelo site da Maldonado Imóveis e gostaria de falar sobre imóveis."
const WHATSAPP_URL = `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`
const EMAIL_URL = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Contato pelo site Maldonado Imóveis")}`

export function ContactPage() {
  return (
    <motion.section {...pageTransition} className="min-h-svh bg-secondary px-4 py-20 sm:px-6 md:py-24">
      <PageTopControls />
      <div className="mx-auto grid min-w-0 max-w-[1120px] gap-5 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="min-w-0 rounded-[28px] bg-white p-6 sm:rounded-[36px] md:p-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Contato direto</p>
          <h1 className="mt-4 max-w-3xl break-words text-3xl font-semibold tracking-tight sm:text-4xl md:text-6xl">Fale com Tiago Secco sobre seu próximo imóvel.</h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
            Atendimento para visitas, dúvidas sobre imóveis, análise de perfil e oportunidades em negociação.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <InfoPill icon={BadgeCheck} label={`CRECI ${CONTACT.creci}`} />
            <InfoPill icon={Mail} label={CONTACT.email} />
          </div>
          <Button asChild className="mt-8 h-12 rounded-full px-6">
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <MessageCircle className="size-4" />
              Chamar no WhatsApp
            </a>
          </Button>
        </div>
        <div className="grid gap-4">
          <ContactCard
            icon={MessageCircle}
            title="WhatsApp"
            detail={CONTACT.whatsappLabel}
            href={WHATSAPP_URL}
            action="Abrir conversa"
          />
          <ContactCard
            icon={Phone}
            title="Telefone"
            detail={CONTACT.whatsappLabel}
            href={WHATSAPP_URL}
            action="Enviar mensagem"
          />
          <ContactCard
            icon={Mail}
            title="E-mail"
            detail={CONTACT.email}
            href={EMAIL_URL}
            action="Enviar e-mail"
          />
          <ContactCard
            icon={BadgeCheck}
            title="CRECI"
            detail={CONTACT.creci}
          />
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
        className="pointer-events-auto size-11 rounded-full border-border/80 bg-white/82 px-0 hover:bg-white"
      >
        <Link to="/" aria-label="Voltar para a página inicial">
          <ArrowLeft className="size-4" />
        </Link>
      </Button>
      <AccountMenuButton
        wrapperClassName="pointer-events-auto block"
        className="inline-flex border-border/80 bg-white/82 hover:bg-white"
        menuClassName="top-[calc(100%+10px)]"
      />
    </div>
  )
}

function InfoPill({ icon: Icon, label }: { icon: typeof Mail; label: string }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-foreground">
      <Icon className="size-4 shrink-0 text-primary" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}

function ContactCard({ icon: Icon, title, detail, href, action }: { icon: typeof Mail; title: string; detail: string; href?: string; action?: string }) {
  const content = (
    <>
      <Icon className="mb-5 size-6 text-primary" />
      <h2 className="break-words text-lg font-semibold">{title}</h2>
      <p className="mt-2 break-words text-sm font-medium text-foreground">{detail}</p>
      {action ? <p className="mt-4 text-sm font-semibold text-primary">{action}</p> : null}
    </>
  )

  if (href) {
    return (
      <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel={href.startsWith("http") ? "noreferrer" : undefined} className="min-w-0 rounded-[28px] border bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary/30 sm:p-6">
        {content}
      </a>
    )
  }

  return (
    <div className="min-w-0 rounded-[28px] border bg-white p-5 sm:p-6">
      {content}
    </div>
  )
}
