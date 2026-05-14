import { Building2, Star, TrendingUp, Users } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useAdminStats } from "@/hooks/useImoveis"

export function AdminHomePage() {
  const { data: stats, isLoading } = useAdminStats()

  const cards = [
    { label: "Imóveis cadastrados", value: stats?.imoveis, icon: Building2, color: "text-primary" },
    { label: "Disponíveis", value: stats?.imoveis_disponiveis, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Corretores ativos", value: stats?.corretores, icon: Users, color: "text-sky-600" },
    { label: "Destaques", value: stats?.destaque, icon: Star, color: "text-amber-500" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Visão geral do sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="rounded-[24px] border-border/80 bg-white shadow-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className={`size-5 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-9 w-20 rounded-full" /> : <div className="text-3xl font-semibold">{value ?? "—"}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
