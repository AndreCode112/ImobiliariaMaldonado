import { Mail, MapPin, Phone } from "lucide-react"

const LOGO_SRC = "/media/logo/logo.png"

export function Footer() {
  return (
    <footer className="relative isolate border-t border-border/70 bg-white">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="mx-auto grid max-w-[1280px] gap-8 px-6 py-16 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="flex items-center gap-5">
          <img src={LOGO_SRC} alt="Maldonado Imóveis" className="h-32 w-24 shrink-0 object-contain" />
          <div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Curadoria residencial com atendimento próximo, visitas agendadas e oportunidades selecionadas.</p>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
          <FooterContact icon={Phone} label="Atendimento" value="WhatsApp dos corretores" />
          <FooterContact icon={Mail} label="E-mail" value="contato@maldonadoimoveis.com.br" />
          <FooterContact icon={MapPin} label="Região" value="Mococa e interior de SP" />
        </div>
      </div>
    </footer>
  )
}

function FooterContact({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-secondary/35 p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value}</p>
    </div>
  )
}
