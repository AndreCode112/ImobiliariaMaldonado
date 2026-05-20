import { ArrowLeft, Bath, BedDouble, Car, ChevronLeft, ChevronRight, Copy, Home, Images, MapPin, Ruler, Send, Share2, Sofa, Utensils, X } from "lucide-react"
import { motion } from "framer-motion"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"

import { pageTransition } from "@/animations/page"
import { AccountMenuButton } from "@/components/layout/PremiumHeader"
import { FavoriteButton } from "@/components/properties/FavoriteButton"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { useCorretores, useImovel } from "@/hooks/useImoveis"
import type { CorretorResumo, Imovel } from "@/types/imovel"

export function PropertyDetailPage() {
  const { uuid } = useParams()
  const publicUuid = uuid && isUuidParam(uuid) ? uuid : undefined
  const { data: imovel, isLoading } = useImovel(publicUuid)
  const { data: corretores = [] } = useCorretores()
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const previewImage = previewIndex !== null ? imovel?.images[previewIndex] : null
  const realtor = imovel?.realtor?.whatsapp || imovel?.realtor?.telefone
    ? imovel.realtor
    : corretores.find((corretor) => corretor.id === imovel?.realtor?.id) ?? corretores.find((corretor) => corretor.ativo !== false) ?? imovel?.realtor ?? null
  const whatsappHref = imovel && realtor ? buildWhatsappLink(imovel, realtor) : null
  const shareUrl = imovel ? buildPropertyUrl(imovel.uuid) : ""

  function closePreview(event?: React.MouseEvent | KeyboardEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setPreviewIndex(null)
  }

  function showPreviousImage(event?: React.MouseEvent | KeyboardEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setPreviewIndex((index) => {
      if (index === null || !imovel?.images.length) return index
      return (index - 1 + imovel.images.length) % imovel.images.length
    })
  }

  function showNextImage(event?: React.MouseEvent | KeyboardEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setPreviewIndex((index) => {
      if (index === null || !imovel?.images.length) return index
      return (index + 1) % imovel.images.length
    })
  }

  async function shareProperty() {
    if (!imovel) return
    const shareData = {
      title: imovel.title,
      text: `${imovel.title} - ${imovel.priceLabel}`,
      url: shareUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }

    await copyPropertyLink()
  }

  async function copyPropertyLink() {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success("Link copiado", {
        id: "property-link-copied",
        description: "O endereço do imóvel está pronto para compartilhar.",
      })
    } catch (error) {
      toast.error("Não foi possível copiar", {
        id: "property-link-copy-error",
        description: "Tente novamente ou use a opção de compartilhamento.",
      })
    }
  }

  useEffect(() => {
    if (previewIndex === null) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePreview(event)
      if (event.key === "ArrowLeft") showPreviousImage(event)
      if (event.key === "ArrowRight") showNextImage(event)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  if (isLoading) {
    return (
      <div className="relative min-h-svh bg-white">
        <DetailTopControls />
        <DetailSkeleton />
      </div>
    )
  }

  if (!imovel) {
    return (
      <section className="relative min-h-svh bg-white px-6 py-24 text-center">
        <DetailTopControls />
        <h1 className="text-3xl font-semibold">Imóvel não encontrado</h1>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/imoveis">Voltar aos imóveis</Link>
        </Button>
      </section>
    )
  }

  return (
    <motion.section {...pageTransition} className="relative min-h-svh bg-white">
      <DetailTopControls />
      <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-24 md:px-8 md:pt-28">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="max-w-4xl text-3xl font-semibold tracking-tight md:text-5xl">{imovel.title}</h1>
            <p className="mt-3 flex items-center gap-2 text-muted-foreground">
              <MapPin className="size-4" />
              {[imovel.neighborhood, imovel.city, imovel.address].filter(Boolean).join(" • ")}
            </p>
          </div>
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  <Share2 className="size-4" />
                  Compartilhar
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="z-[1000] w-72 rounded-2xl p-0">
                <PopoverHeader>
                  <PopoverTitle>Compartilhar imóvel</PopoverTitle>
                  <PopoverDescription>Envie este imóvel ou copie o link direto.</PopoverDescription>
                </PopoverHeader>
                <div className="p-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition hover:bg-secondary focus:bg-secondary focus:outline-none"
                  onClick={shareProperty}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <Send className="size-4" />
                  </span>
                  Compartilhar via...
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition hover:bg-secondary focus:bg-secondary focus:outline-none"
                  onClick={copyPropertyLink}
                >
                  <span className="grid size-9 place-items-center rounded-full bg-secondary text-foreground">
                    <Copy className="size-4" />
                  </span>
                  Copiar link
                </button>
                </div>
              </PopoverContent>
            </Popover>
            <FavoriteButton id={imovel.id} />
          </div>
        </div>

        <div className="relative grid h-[56vh] min-h-[420px] grid-cols-1 gap-2 overflow-hidden rounded-[28px] md:grid-cols-4">
          <GalleryImage src={imovel.images[0]} title={imovel.title} className="md:col-span-2 md:row-span-2" onClick={() => setPreviewIndex(0)} />
          <GalleryImage src={imovel.images[1]} title={imovel.title} onClick={() => setPreviewIndex(1)} />
          <GalleryImage src={imovel.images[2]} title={imovel.title} onClick={() => setPreviewIndex(2)} />
          <GalleryImage src={imovel.images[3]} title={imovel.title} onClick={() => setPreviewIndex(3)} />
          <GalleryImage src={imovel.images[4]} title={imovel.title} onClick={() => setPreviewIndex(4)} />
          {imovel.images.length ? (
            <>
              <div className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur">
                1 / {imovel.images.length}
              </div>
              <Button
                type="button"
                variant="outline"
                className="absolute bottom-4 right-4 h-10 rounded-full border-white/60 bg-white/90 px-4 shadow-[0_12px_34px_rgba(0,0,0,0.18)] backdrop-blur hover:bg-white"
                onClick={() => setPreviewIndex(0)}
              >
                <Images className="size-4" />
                Ver todas as fotos
              </Button>
            </>
          ) : null}
        </div>

        <div className="grid gap-10 py-10 lg:grid-cols-[1fr_380px]">
          <article className="space-y-12">
            <nav className="sticky top-[104px] z-20 -mx-1 flex gap-2 overflow-x-auto rounded-full border bg-white/88 p-1 shadow-[0_12px_36px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              {["Sobre", "Estrutura", "Localização"].map((item) => (
                <a key={item} href={`#${item.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}`} className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                  {item}
                </a>
              ))}
            </nav>
            <section>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
                <Metric icon={Ruler} label="Área" value={`${imovel.area} m²`} />
                <Metric icon={BedDouble} label="Quartos" value={String(imovel.bedrooms)} />
                <Metric icon={Bath} label="Banheiros" value={String(imovel.bathrooms)} />
                <Metric icon={Car} label="Garagem" value={String(imovel.parking)} />
                <Metric icon={Utensils} label="Cozinhas" value={String(imovel.kitchens)} />
                <Metric icon={Sofa} label="Salas" value={String(imovel.livingRooms)} />
                <Metric icon={Home} label="Varandas" value={String(imovel.balconies)} />
              </div>
            </section>

            <Section id="sobre" title="Sobre o imóvel">
              <p className="max-w-3xl text-lg leading-8 text-[#3f3f3f]">{imovel.description}</p>
            </Section>

            <Section id="estrutura" title="Estrutura e diferenciais">
              <div className="grid gap-3 sm:grid-cols-2">
                {[imovel.type, ...imovel.amenities].filter(Boolean).map((item) => (
                  <div key={item} className="rounded-2xl border bg-white p-4 text-sm font-medium">{item}</div>
                ))}
              </div>
            </Section>

            <Section id="localizacao" title="Localização">
              <div className="rounded-[28px] border bg-secondary p-6">
                <p className="font-medium">{imovel.address}</p>
                <p className="mt-1 text-sm text-muted-foreground">{[imovel.neighborhood, imovel.city].filter(Boolean).join(", ")}</p>
              </div>
            </Section>
          </article>

          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] border bg-white p-6 shadow-[0_24px_80px_rgba(0,0,0,0.08)]">
              <p className="text-sm text-muted-foreground">Preço de venda</p>
              <p className="mt-1 text-3xl font-semibold">{imovel.priceLabel}</p>
              <div className="mt-6 grid gap-3">
                {whatsappHref ? (
                  <Button asChild className="h-12 rounded-full bg-[#25D366] text-white shadow-[0_14px_34px_rgba(37,211,102,0.26)] hover:bg-[#1ebe5d]">
                    <a href={whatsappHref} target="_blank" rel="noreferrer">
                      <WhatsappIcon className="size-5" />
                      Converse agora por WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="h-12 rounded-full bg-[#25D366] text-white">
                    <WhatsappIcon className="size-5" />
                    WhatsApp indisponível
                  </Button>
                )}
              </div>
              <div className="mt-6 flex gap-3 rounded-2xl bg-secondary/70 p-4">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-primary shadow-[0_12px_28px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
                  {realtor?.foto_url ? <img src={realtor.foto_url} alt={realtor.nome} className="size-full object-cover" /> : <span className="text-base font-bold">{(realtor?.nome ?? "M")[0]}</span>}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{realtor?.nome ?? "Maldonado Corretor"}</p>
                  {realtor?.creci ? <p className="mt-0.5 text-xs font-medium text-primary">CRECI {realtor.creci}</p> : null}
                  <p className="mt-1 text-sm text-muted-foreground">Atendimento consultivo para compra de imóveis residenciais.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <PhotoViewer
        src={previewImage}
        title={imovel.title}
        count={imovel.images.length}
        currentIndex={previewIndex ?? 0}
        onClose={closePreview}
        onPrevious={showPreviousImage}
        onNext={showNextImage}
      />
    </motion.section>
  )
}

function buildPropertyUrl(uuid: string) {
  if (typeof window === "undefined") return `/imoveis/${uuid}`
  return `${window.location.origin}/imoveis/${uuid}`
}

function DetailTopControls() {
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

function isUuidParam(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function buildWhatsappLink(imovel: Imovel, realtor: CorretorResumo) {
  const number = normalizeWhatsappNumber(realtor.whatsapp || realtor.telefone)
  if (!number) return null
  const message = [
    "Olá, desejo mais informações sobre o imóvel.",
    `Imóvel: ${imovel.title}`,
    `Valor: ${imovel.priceLabel}`,
    `Localização: ${[imovel.neighborhood, imovel.city].filter(Boolean).join(", ")}`,
    `Link: ${window.location.href}`,
  ].filter(Boolean).join("\n")
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

function normalizeWhatsappNumber(value?: string) {
  const digits = value?.replace(/\D/g, "") ?? ""
  if (!digits) return ""
  if (digits.startsWith("55")) return digits
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.04 3.2A12.65 12.65 0 0 0 5.23 22.4L3.2 28.8l6.58-1.94A12.64 12.64 0 1 0 16.04 3.2Zm0 2.32a10.33 10.33 0 0 1 8.78 15.78 10.38 10.38 0 0 1-13.93 3.17l-.46-.27-3.81 1.12 1.17-3.69-.3-.48A10.34 10.34 0 0 1 16.04 5.52Zm-4.02 5.41c-.24 0-.62.09-.95.45-.33.36-1.24 1.21-1.24 2.95s1.27 3.42 1.44 3.66c.18.24 2.46 3.94 6.08 5.36 3.01 1.18 3.63.95 4.28.89.65-.06 2.11-.86 2.41-1.69.3-.83.3-1.54.21-1.69-.09-.15-.33-.24-.69-.42-.36-.18-2.11-1.04-2.44-1.16-.33-.12-.57-.18-.81.18-.24.36-.93 1.16-1.14 1.39-.21.24-.42.27-.78.09-.36-.18-1.52-.56-2.9-1.78-1.07-.96-1.8-2.14-2.01-2.5-.21-.36-.02-.55.16-.73.16-.16.36-.42.54-.63.18-.21.24-.36.36-.6.12-.24.06-.45-.03-.63-.09-.18-.8-1.98-1.12-2.7-.29-.69-.6-.7-.84-.71h-.59Z" />
    </svg>
  )
}

function GalleryImage({ src, title, className, onClick }: { src?: string; title: string; className?: string; onClick: () => void }) {
  return (
    <button type="button" className={`bg-secondary ${src ? "cursor-zoom-in" : "cursor-default"} ${className ?? ""}`} onClick={src ? onClick : undefined}>
      {src ? <img src={src} alt={title} className="size-full object-cover transition hover:scale-[1.02]" /> : null}
    </button>
  )
}

function PhotoViewer({
  src,
  title,
  count,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  src?: string | null
  title: string
  count: number
  currentIndex: number
  onClose: (event?: React.MouseEvent | KeyboardEvent) => void
  onPrevious: (event?: React.MouseEvent | KeyboardEvent) => void
  onNext: (event?: React.MouseEvent | KeyboardEvent) => void
}) {
  if (!src || typeof document === "undefined") return null
  const canNavigate = count > 1

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/92 backdrop-blur-md" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute right-5 top-5 z-10 grid size-11 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
        onClick={onClose}
        aria-label="Fechar foto"
      >
        <X className="size-6" />
      </button>
      {canNavigate ? (
        <>
          <button
            type="button"
            className="absolute left-5 top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            onClick={onPrevious}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="size-8" />
          </button>
          <button
            type="button"
            className="absolute right-5 top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            onClick={onNext}
            aria-label="Próxima foto"
          >
            <ChevronRight className="size-8" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
            {currentIndex + 1} / {count}
          </div>
        </>
      ) : null}
      <img src={src} alt={title} className="h-screen w-screen object-contain" />
    </div>,
    document.body,
  )
}

function Metric({ icon: Icon, label, value }: { icon: typeof Ruler; label: string; value: string }) {
  return (
    <div className="rounded-[22px] border bg-white p-5">
      <Icon className="mb-3 size-5 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  )
}

function Section({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32">
      <h2 className="mb-5 text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-8 py-8">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-[52vh] rounded-[28px]" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-96 rounded-[28px]" />
        <Skeleton className="h-80 rounded-[28px]" />
      </div>
    </div>
  )
}
