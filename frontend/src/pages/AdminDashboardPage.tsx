import { Edit, Plus, Trash2 } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeleteImovel, useImoveis } from "@/hooks/useImoveis"

export function AdminDashboardPage() {
  const { data: imoveis = [], isLoading } = useImoveis()
  const deleteImovel = useDeleteImovel()

  async function remove(id: number) {
    if (!confirm("Excluir este imóvel?")) return
    try {
      await deleteImovel.mutateAsync(id)
      toast.success("Imóvel excluído")
    } catch {
      toast.error("Não foi possível excluir o imóvel")
    }
  }

  return (
    <div className="space-y-5">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
            <h1 className="mt-2 text-3xl font-semibold">Imóveis</h1>
            <p className="mt-2 text-muted-foreground">Cadastro, edição, exclusão e publicação permanecem validados pelo backend Django.</p>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/admin/imoveis/novo">
              <Plus className="size-4" />
              Novo imóvel
            </Link>
          </Button>
        </div>

        <div className="grid gap-4">
          {isLoading && Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[24px]" />)}
          {!isLoading && imoveis.map((imovel) => (
            <Card key={imovel.id} className="rounded-[24px] border-border/80 bg-white shadow-none">
              <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                <div className="h-24 w-full overflow-hidden rounded-[18px] bg-secondary md:w-36">
                  {imovel.images[0] ? <img src={imovel.images[0]} alt={imovel.title} className="size-full object-cover" /> : null}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{imovel.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ")}</p>
                  <p className="mt-2 text-sm font-semibold">{imovel.priceLabel}</p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to={`/admin/imoveis/${imovel.id}/editar`}>
                      <Edit className="size-4" />
                      Editar
                    </Link>
                  </Button>
                  <Button variant="outline" className="rounded-full text-destructive" onClick={() => remove(imovel.id)}>
                    <Trash2 className="size-4" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && !imoveis.length ? (
            <div className="rounded-[28px] border border-dashed bg-white p-10 text-center">
              <h2 className="text-xl font-semibold">Nenhum imóvel cadastrado</h2>
              <p className="mt-2 text-muted-foreground">Use o botão Novo imóvel para publicar a primeira oportunidade.</p>
            </div>
          ) : null}
        </div>
    </div>
  )
}
