import { Building2 } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-primary text-white">
            <Building2 className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Maldonado Corretor</p>
            <p className="text-sm text-muted-foreground">Curadoria residencial de alto padrão para compra.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
          <a href="/imoveis" className="hover:text-foreground">Comprar imóveis</a>
          <a href="/contato" className="hover:text-foreground">Contato</a>
          <a href="/login" className="hover:text-foreground">Entrar</a>
        </div>
      </div>
    </footer>
  )
}
