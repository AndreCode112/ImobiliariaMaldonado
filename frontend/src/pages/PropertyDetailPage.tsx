import { ArrowLeft, Bath, BedDouble, Car, ChevronLeft, ChevronRight, Copy, Home, Images, MapPin, Ruler, Send, Share2, Sofa, Utensils, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useEffect, useLayoutEffect, useState } from "react"
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
  const [galleryIndex, setGalleryIndex] = useState(0)
  const previewImage = previewIndex !== null ? imovel?.images[previewIndex] : null
  const realtor = imovel?.realtor?.whatsapp || imovel?.realtor?.telefone
    ? imovel.realtor
    : corretores.find((corretor) => corretor.id === imovel?.realtor?.id) ?? corretores.find((corretor) => corretor.ativo !== false) ?? imovel?.realtor ?? null
  const whatsappHref = imovel && realtor ? buildWhatsappLink(imovel, realtor) : null
  const shareUrl = imovel ? buildPropertyUrl(imovel.uuid) : ""

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
    setGalleryIndex(0)
    setPreviewIndex(null)
  }, [publicUuid])

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

  useEffect(() => {
    if (!imovel?.images.length) return
    const nextIndexes = [
      (galleryIndex + 1) % imovel.images.length,
      previewIndex !== null ? (previewIndex + 1) % imovel.images.length : null,
    ].filter((index): index is number => index !== null)

    nextIndexes.forEach((index) => {
      const src = imovel.images[index]
      if (!src) return
      const image = new Image()
      image.src = src
    })
  }, [galleryIndex, imovel?.images, previewIndex])

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
      <div className="mx-auto max-w-[1280px] px-4 pb-28 pt-24 md:px-8 md:pb-8 md:pt-28">
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

        <MobilePropertyGallery
          images={imovel.images}
          title={imovel.title}
          currentIndex={galleryIndex}
          onChange={setGalleryIndex}
          onOpen={setPreviewIndex}
        />

        <div className="relative hidden h-[56vh] min-h-[420px] grid-cols-1 gap-2 overflow-hidden rounded-[28px] md:grid md:grid-cols-4">
          <GalleryImage src={imovel.images[0]} title={imovel.title} className="md:col-span-2 md:row-span-2" loading="eager" onClick={() => setPreviewIndex(0)} />
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
        images={imovel.images}
        src={previewImage}
        title={imovel.title}
        count={imovel.images.length}
        currentIndex={previewIndex ?? 0}
        onClose={closePreview}
        onPrevious={showPreviousImage}
        onNext={showNextImage}
        onSelect={setPreviewIndex}
      />
      {whatsappHref ? (
        <div className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/70 bg-white/92 px-4 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_52px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden">
          <Button asChild className="h-12 w-full rounded-full bg-[#25D366] text-white shadow-[0_14px_34px_rgba(37,211,102,0.24)] hover:bg-[#1ebe5d]">
            <a href={whatsappHref} target="_blank" rel="noreferrer">
              <WhatsappIcon className="size-5" />
              Chamar no WhatsApp
            </a>
          </Button>
        </div>
      ) : null}
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

function MobilePropertyGallery({
  images,
  title,
  currentIndex,
  onChange,
  onOpen,
}: {
  images: string[]
  title: string
  currentIndex: number
  onChange: (index: number) => void
  onOpen: (index: number) => void
}) {
  const image = images[currentIndex]
  const canNavigate = images.length > 1

  function goTo(index: number) {
    if (!images.length) return
    onChange((index + images.length) % images.length)
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) {
    if (!canNavigate) return
    if (info.offset.x < -56 || info.velocity.x < -460) {
      goTo(currentIndex + 1)
      return
    }
    if (info.offset.x > 56 || info.velocity.x > 460) {
      goTo(currentIndex - 1)
    }
  }

  return (
    <section className="md:hidden">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-secondary">
        {image ? (
          <AnimatePresence mode="wait" initial={false}>
            <motion.button
              key={image}
              type="button"
              className="absolute inset-0 cursor-zoom-in [touch-action:pan-y]"
              drag={canNavigate ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.12}
              onDragEnd={handleDragEnd}
              onClick={() => onOpen(currentIndex)}
              initial={{ opacity: 0.5, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0.5, scale: 0.99 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <img src={image} alt={title} className="size-full object-cover" loading={currentIndex === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
            </motion.button>
          </AnimatePresence>
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Images className="size-8" />
          </div>
        )}
        {images.length ? (
          <>
            <div className="absolute left-3 top-3 rounded-full bg-black/52 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
              {currentIndex + 1} / {images.length}
            </div>
            <Button
              type="button"
              variant="outline"
              className="absolute bottom-3 right-3 h-9 rounded-full border-white/60 bg-white/92 px-3 text-xs shadow-[0_12px_34px_rgba(0,0,0,0.16)] backdrop-blur hover:bg-white"
              onClick={() => onOpen(currentIndex)}
            >
              <Images className="size-4" />
              Fotos
            </Button>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className={`h-14 w-16 shrink-0 overflow-hidden rounded-[12px] border transition ${index === currentIndex ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-70"}`}
              onClick={() => onChange(index)}
              aria-label={`Ver foto ${index + 1}`}
            >
              <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function GalleryImage({ src, title, className, loading = "lazy", onClick }: { src?: string; title: string; className?: string; loading?: "eager" | "lazy"; onClick: () => void }) {
  return (
    <button type="button" className={`bg-secondary ${src ? "cursor-zoom-in" : "cursor-default"} ${className ?? ""}`} onClick={src ? onClick : undefined}>
      {src ? <img src={src} alt={title} className="size-full object-cover transition hover:scale-[1.02]" loading={loading} decoding="async" /> : null}
    </button>
  )
}

function PhotoViewer({
  images,
  src,
  title,
  count,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  onSelect,
}: {
  images: string[]
  src?: string | null
  title: string
  count: number
  currentIndex: number
  onClose: (event?: React.MouseEvent | KeyboardEvent) => void
  onPrevious: (event?: React.MouseEvent | KeyboardEvent) => void
  onNext: (event?: React.MouseEvent | KeyboardEvent) => void
  onSelect: (index: number) => void
}) {
  if (!src || typeof document === "undefined") return null
  const canNavigate = count > 1

  function handlePhotoDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { x: number; y: number }; velocity: { x: number; y: number } }) {
    if (info.offset.y > 86 || info.velocity.y > 720) {
      onClose()
      return
    }
    if (!canNavigate) return
    const dragDistance = info.offset.x
    const dragVelocity = info.velocity.x
    if (dragDistance < -70 || dragVelocity < -520) {
      onNext()
      return
    }
    if (dragDistance > 70 || dragVelocity > 520) {
      onPrevious()
    }
  }

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
            className="absolute left-3 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 sm:grid"
            onClick={onPrevious}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="size-8" />
          </button>
          <button
            type="button"
            className="absolute right-3 top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60 sm:grid"
            onClick={onNext}
            aria-label="Próxima foto"
          >
            <ChevronRight className="size-8" />
          </button>
          <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full bg-white/14 px-4 py-2 text-sm font-bold text-white shadow-[0_14px_38px_rgba(0,0,0,0.22)] ring-1 ring-white/16 backdrop-blur-xl">
            {currentIndex + 1} / {count}
          </div>
        </>
      ) : null}
      <div className="flex h-screen w-screen items-center justify-center overflow-hidden [touch-action:none]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.img
            key={src}
            src={src}
            alt={title}
            decoding="async"
            className={canNavigate ? "h-screen w-screen cursor-grab object-contain active:cursor-grabbing" : "h-screen w-screen object-contain"}
            draggable={false}
            drag={canNavigate ? true : "y"}
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.16}
            onDragEnd={handlePhotoDragEnd}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          />
        </AnimatePresence>
      </div>
      {canNavigate ? (
        <div className="absolute inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4">
          <div className="flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-black/24 p-2 backdrop-blur-xl">
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className={`h-12 w-14 shrink-0 overflow-hidden rounded-[10px] border transition ${index === currentIndex ? "border-white opacity-100" : "border-white/10 opacity-58"}`}
                onClick={() => onSelect(index)}
                aria-label={`Abrir foto ${index + 1}`}
              >
              <img src={image} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
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
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 pb-28 pt-24 md:px-8 md:pt-28">
      <div className="space-y-3">
        <Skeleton className="h-9 w-4/5 rounded-full md:h-12 md:w-2/3" />
        <Skeleton className="h-5 w-3/5 rounded-full" />
      </div>
      <div className="grid gap-2 overflow-hidden rounded-[28px] md:h-[56vh] md:min-h-[420px] md:grid-cols-4">
        <Skeleton className="aspect-[4/3] rounded-[24px] md:col-span-2 md:row-span-2 md:aspect-auto md:rounded-none" />
        <Skeleton className="hidden rounded-none md:block" />
        <Skeleton className="hidden rounded-none md:block" />
        <Skeleton className="hidden rounded-none md:block" />
        <Skeleton className="hidden rounded-none md:block" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            {Array.from({ length: 7 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-[22px]" />)}
          </div>
          <Skeleton className="h-44 rounded-[24px]" />
        </div>
        <Skeleton className="h-80 rounded-[28px]" />
      </div>
    </div>
  )
}
