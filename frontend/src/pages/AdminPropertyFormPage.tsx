import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createPortal } from "react-dom"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft, ChevronRight, Home, Image as ImageIcon, LoaderCircle, MapPin, Minus, Plus, Save, Search, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"

import { axiosClient } from "@/api/axiosClient"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCidades, useCorretores, useCreateImovel, useImovel, useUpdateImovel } from "@/hooks/useImoveis"
import { cn } from "@/lib/utils"
import type { Cidade, EnderecoResultado, ImagemImovel, ImovelPayload } from "@/types/imovel"

const STATUS_OPTIONS = [
  { value: "disponivel", label: "Disponível" },
  { value: "vendido", label: "Vendido" },
  { value: "alugado", label: "Alugado" },
  { value: "reservado", label: "Reservado" },
]

const FINALIDADE_OPTIONS = [
  { value: "_", label: "Selecionar" },
  { value: "residencial", label: "Residencial" },
  { value: "comercial", label: "Comercial" },
  { value: "misto", label: "Misto" },
  { value: "industrial", label: "Industrial" },
]

const REGIAO_OPTIONS = [
  { value: "urbano", label: "Urbano" },
  { value: "rural", label: "Rural" },
]

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const ACCEPTED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"]
const MAX_IMAGE_SIZE = 2 * 1024 * 1024
const MAX_TOTAL_SIZE = 25 * 1024 * 1024
const MAX_IMAGES = 15

type FormState = {
  titulo: string
  descricao: string
  preco: string
  cep: string
  endereco: string
  bairro_nome: string
  cidade_id: string
  cidade_nome: string
  latitude: string
  longitude: string
  area: string
  regiao: "urbano" | "rural"
  alqueres: string
  casas: number | string
  quartos: number | string
  banheiros: number | string
  vagas: number | string
  cozinhas: number | string
  salas: number | string
  varandas: number | string
  status: string
  destaque: boolean
  finalidade: string
  corretor_id: string
}

type ImageFilePreview = {
  id: string
  file: File
  name: string
  size: number
  url: string
}

type GalleryImage = {
  key: string
  url: string
  name: string
}

const EMPTY: FormState = {
  titulo: "",
  descricao: "",
  preco: "",
  cep: "",
  endereco: "",
  bairro_nome: "",
  cidade_id: "",
  cidade_nome: "",
  latitude: "",
  longitude: "",
  area: "",
  regiao: "urbano",
  alqueres: "",
  casas: 0,
  quartos: 0,
  banheiros: 0,
  vagas: 0,
  cozinhas: 0,
  salas: 0,
  varandas: 0,
  status: "disponivel",
  destaque: false,
  finalidade: "",
  corretor_id: "",
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-2">
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      {children}
    </div>
  )
}

function buildCoordinateMapEmbedUrl(latitude?: string, longitude?: string) {
  const lat = Number(latitude)
  const lng = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ""

  const padding = 0.006
  const bbox = [lng - padding, lat - padding, lng + padding, lat + padding].join(",")
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lng}`)}`
}

function addressTitle(address: EnderecoResultado) {
  const primary = address.address?.road || address.address?.pedestrian || address.display_name.split(",")[0] || ""
  const secondary = address.address?.suburb || address.address?.neighbourhood || address.address?.city || address.address?.town || ""
  return [primary, secondary].filter(Boolean).join(", ") || address.display_name.split(",").slice(0, 2).map((part) => part.trim()).filter(Boolean).join(", ") || "Endereço"
}

function addressSubtitle(address: EnderecoResultado) {
  const title = addressTitle(address)
  const parts = address.display_name.split(",").map((part) => part.trim()).filter(Boolean)
  return parts[0] === title ? parts.slice(1).join(", ") : address.display_name
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "")
}

function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

function formatCurrencyInput(value: string) {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, "")
  if (!digits) return ""
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number(digits))
}

function formatCurrencyValue(value: string) {
  if (!value) return ""
  const parsed = Number(String(value).replace(",", "."))
  if (Number.isFinite(parsed)) return formatCurrencyInput(String(Math.round(parsed)))
  return formatCurrencyInput(value)
}

function formatAreaInput(value: string) {
  const digits = onlyDigits(value).replace(/^0+(?=\d)/, "")
  return digits ? `${digits} m²` : ""
}

function formatAreaValue(value: string) {
  if (!value) return ""
  const parsed = Number(String(value).replace(",", "."))
  return Number.isFinite(parsed) ? formatAreaInput(String(Math.round(parsed))) : formatAreaInput(value)
}

function numericPayload(value: string | number) {
  return onlyDigits(String(value)) || "0"
}

function counterValue(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0
}

function CounterField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | number
  onChange: (value: number) => void
}) {
  const current = counterValue(value)
  return (
    <Field label={label}>
      <div className="grid h-11 grid-cols-[44px_1fr_44px] overflow-hidden rounded-md border bg-background">
        <Button type="button" variant="ghost" className="h-11 rounded-none" onClick={() => onChange(Math.max(current - 1, 0))} aria-label={`Diminuir ${label}`}>
          <Minus className="h-4 w-4" />
        </Button>
        <input
          className="min-w-0 border-x bg-transparent text-center text-sm font-semibold outline-none"
          inputMode="numeric"
          value={current}
          onChange={(event) => onChange(counterValue(event.target.value))}
          aria-label={label}
        />
        <Button type="button" variant="ghost" className="h-11 rounded-none" onClick={() => onChange(current + 1)} aria-label={`Aumentar ${label}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </Field>
  )
}

function PhotoPreview({
  photo,
  count,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
}: {
  photo: GalleryImage | null
  count: number
  currentIndex: number
  onClose: (event?: React.MouseEvent | KeyboardEvent) => void
  onPrevious: (event?: React.MouseEvent | KeyboardEvent) => void
  onNext: (event?: React.MouseEvent | KeyboardEvent) => void
}) {
  if (!photo || typeof document === "undefined") return null
  const canNavigate = count > 1

  return createPortal(
    <div
      data-photo-viewer
      className="pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center bg-black"
      role="dialog"
      aria-modal="true"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="absolute right-5 top-5 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
        onClick={onClose}
        aria-label="Fechar foto"
      >
        <X className="h-6 w-6" />
      </button>
      {canNavigate ? (
        <>
          <button
            type="button"
            className="absolute left-5 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            onClick={onPrevious}
            aria-label="Foto anterior"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            type="button"
            className="absolute right-5 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
            onClick={onNext}
            aria-label="Próxima foto"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white">
            {currentIndex + 1} / {count}
          </div>
        </>
      ) : null}
      <img src={photo.url} alt={photo.name} className="h-screen w-screen object-contain" />
    </div>,
    document.body,
  )
}

export function AdminPropertyFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: imovel } = useImovel(id)
  const { data: cidades = [] } = useCidades()
  const { data: corretores = [] } = useCorretores()
  const createImovel = useCreateImovel()
  const updateImovel = useUpdateImovel(id ?? "")
  const [dialogOpen, setDialogOpen] = useState(true)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [imageFiles, setImageFiles] = useState<ImageFilePreview[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)
  const [cepLoading, setCepLoading] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)
  const [addressDialogOpen, setAddressDialogOpen] = useState(false)
  const [addressResult, setAddressResult] = useState<EnderecoResultado | null>(null)
  const [addressResults, setAddressResults] = useState<EnderecoResultado[]>([])
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)
  const [hasSearchedAddress, setHasSearchedAddress] = useState(false)
  const imageFilesRef = useRef<ImageFilePreview[]>([])
  const selectedAddressQueryRef = useRef("")
  const addressMapUrl = useMemo(
    () => buildCoordinateMapEmbedUrl(addressResult?.latitude, addressResult?.longitude),
    [addressResult?.latitude, addressResult?.longitude],
  )

  const visibleExistingImages = useMemo(
    () => (imovel?.raw.imagens ?? []).filter((image) => !removedImageIds.includes(image.id)),
    [imovel?.raw.imagens, removedImageIds],
  )

  const galleryImages: GalleryImage[] = useMemo(
    () => [
      ...visibleExistingImages.map((image) => ({
        key: `existing-${image.id}`,
        url: image.url,
        name: image.legenda || form.titulo || "Foto salva",
      })),
      ...imageFiles.map((image) => ({
        key: image.id,
        url: image.url,
        name: image.name,
      })),
    ],
    [form.titulo, imageFiles, visibleExistingImages],
  )

  const previewPhoto = previewIndex !== null ? galleryImages[previewIndex] ?? null : null
  const selectedImageTotal = [...visibleExistingImages, ...imageFiles].reduce((total, item) => total + ("size" in item ? item.size : 0), 0)
  const saving = createImovel.isPending || updateImovel.isPending

  useEffect(() => {
    imageFilesRef.current = imageFiles
  }, [imageFiles])

  useEffect(() => {
    const query = form.endereco.trim()
    if (selectedAddressQueryRef.current && selectedAddressQueryRef.current === query) {
      setAddressResults([])
      setHasSearchedAddress(false)
      setIsSearchingAddress(false)
      return
    }
    if (query.length < 3) {
      setAddressResults([])
      setHasSearchedAddress(false)
      setIsSearchingAddress(false)
      return
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(async () => {
      setIsSearchingAddress(true)
      try {
        const { data } = await axiosClient.get<{ results: EnderecoResultado[] }>("/imoveis/api/buscar-endereco/", {
          params: { query },
          signal: controller.signal,
        })
        setAddressResults(data.results ?? [])
        setHasSearchedAddress(true)
      } catch {
        if (!controller.signal.aborted) {
          setAddressResults([])
          setHasSearchedAddress(true)
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingAddress(false)
      }
    }, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [form.endereco])

  useEffect(() => {
    return () => {
      imageFilesRef.current.forEach((item) => URL.revokeObjectURL(item.url))
    }
  }, [])

  useEffect(() => {
    if (!editing) {
      setForm(EMPTY)
      return
    }
    if (!imovel?.raw) return
    const raw = imovel.raw
    setForm({
      titulo: raw.titulo,
      descricao: raw.descricao || "",
      preco: formatCurrencyValue(raw.preco || ""),
      cep: formatCep(raw.cep || ""),
      endereco: raw.endereco || "",
      bairro_nome: raw.bairro?.nome || "",
      cidade_id: raw.cidade?.id ? String(raw.cidade.id) : "",
      cidade_nome: raw.cidade ? `${raw.cidade.nome} - ${raw.cidade.estado || ""}` : "",
      latitude: raw.latitude || "",
      longitude: raw.longitude || "",
      area: formatAreaValue(raw.area || ""),
      regiao: raw.regiao === "rural" ? "rural" : "urbano",
      alqueres: raw.alqueres && Number(raw.alqueres) > 0 ? String(raw.alqueres).replace(".", ",") : "",
      casas: raw.casas ?? 0,
      quartos: raw.quartos ?? 0,
      banheiros: raw.banheiros ?? 0,
      vagas: raw.vagas ?? 0,
      cozinhas: raw.cozinhas ?? 0,
      salas: raw.salas ?? 0,
      varandas: raw.varandas ?? 0,
      status: raw.status || "disponivel",
      destaque: raw.destaque || false,
      finalidade: raw.finalidade || "",
      corretor_id: raw.corretor?.id ? String(raw.corretor.id) : "",
    })
  }, [editing, imovel?.raw])

  useEffect(() => {
    if (previewIndex === null) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") showPreviousPhoto(event)
      if (event.key === "ArrowRight") showNextPhoto(event)
      if (event.key === "Escape") closePreview(event)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  })

  useEffect(() => {
    if (previewIndex !== null && previewIndex >= galleryImages.length) {
      setPreviewIndex(galleryImages.length ? galleryImages.length - 1 : null)
    }
  }, [galleryImages.length, previewIndex])

  function resetImages() {
    imageFiles.forEach((item) => URL.revokeObjectURL(item.url))
    setImageFiles([])
    setRemovedImageIds([])
    setDragActive(false)
    setPreviewIndex(null)
  }

  function closeDialog() {
    setDialogOpen(false)
    resetImages()
    navigate("/admin/imoveis")
  }

  function handleDialogOpenChange(open: boolean) {
    if (open) {
      setDialogOpen(true)
      return
    }
    if (previewPhoto) return
    closeDialog()
  }

  function closePreview(event?: React.MouseEvent | KeyboardEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setPreviewIndex(null)
  }

  function openPreview(index: number) {
    setPreviewIndex(index)
  }

  function showPreviousPhoto(event?: React.MouseEvent | KeyboardEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setPreviewIndex((index) => {
      if (index === null || galleryImages.length === 0) return index
      return (index - 1 + galleryImages.length) % galleryImages.length
    })
  }

  function showNextPhoto(event?: React.MouseEvent | KeyboardEvent) {
    event?.preventDefault()
    event?.stopPropagation()
    setPreviewIndex((index) => {
      if (index === null || galleryImages.length === 0) return index
      return (index + 1) % galleryImages.length
    })
  }

  function validateImageFiles(files: FileList | File[]) {
    const currentCount = visibleExistingImages.length + imageFiles.length
    const incoming = Array.from(files)
    const accepted: File[] = []
    let runningTotal = selectedImageTotal

    if (currentCount + incoming.length > MAX_IMAGES) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens por imóvel`)
      return []
    }

    for (const file of incoming) {
      const ext = file.name.split(".").pop()?.toLowerCase()
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || !ext || !ACCEPTED_EXTENSIONS.includes(ext)) {
        toast.error("Envie somente JPG, JPEG, PNG ou WEBP")
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name} passa de 2 MB`)
        continue
      }
      runningTotal += file.size
      if (runningTotal > MAX_TOTAL_SIZE) {
        toast.error("O total de imagens passa de 25 MB")
        break
      }
      accepted.push(file)
    }

    return accepted
  }

  function addImages(files: FileList | File[] | null) {
    if (!files) return
    const accepted = validateImageFiles(files)
    if (!accepted.length) return
    setImageFiles((prev) => [
      ...prev,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        name: file.name,
        size: file.size,
        url: URL.createObjectURL(file),
      })),
    ])
  }

  function removeNewImage(imageId: string) {
    setImageFiles((prev) => {
      const item = prev.find((image) => image.id === imageId)
      if (item) URL.revokeObjectURL(item.url)
      return prev.filter((image) => image.id !== imageId)
    })
  }

  function removeExistingImage(imageId: number) {
    setRemovedImageIds((prev) => [...prev, imageId])
  }

  function handleDrop(event: React.DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setDragActive(false)
    addImages(event.dataTransfer.files)
  }

  async function buscarCep() {
    const cep = form.cep.replace(/\D/g, "")
    if (cep.length !== 8) {
      toast.error("Informe um CEP com 8 dígitos")
      return
    }
    setCepLoading(true)
    try {
      const { data } = await axiosClient.get(`/imoveis/api/cep/${cep}/`)
      const cepData = data.data ?? data
      if (cepData.cidade) {
        queryClient.setQueryData<Cidade[]>(["cidades"], (current = []) => {
          const exists = current.some((cidade) => cidade.id === cepData.cidade.id)
          return exists
            ? current.map((cidade) => cidade.id === cepData.cidade.id ? cepData.cidade : cidade)
            : [...current, cepData.cidade]
        })
      }
      setForm((current) => ({
        ...current,
        cep: cepData.cep || current.cep,
        endereco: cepData.logradouro || current.endereco,
        bairro_nome: cepData.bairro || current.bairro_nome,
        cidade_id: cepData.cidade_id ? String(cepData.cidade_id) : current.cidade_id,
        cidade_nome: cepData.cidade ? `${cepData.cidade.nome} - ${cepData.cidade.estado}` : current.cidade_nome,
        latitude: cepData.latitude || cepData.lat || current.latitude,
        longitude: cepData.longitude || cepData.lng || current.longitude,
      }))
      toast.success("CEP encontrado")
    } catch {
      toast.error("Erro ao buscar CEP")
    } finally {
      setCepLoading(false)
    }
  }

  async function buscarCoordenadasEndereco() {
    const query = form.endereco.trim()
    if (query.length < 5) {
      toast.error("Informe o endereço para buscar coordenadas")
      return
    }

    if (addressResults[0]) {
      selecionarEndereco(addressResults[0])
      return
    }

    setAddressLoading(true)
    try {
      const { data } = await axiosClient.get<{ results: EnderecoResultado[] }>("/imoveis/api/buscar-endereco/", {
        params: { query },
      })
      const result = data.results?.[0]
      if (!result) {
        toast.error("Nenhuma coordenada encontrada para este endereço")
        return
      }
      setAddressResult(result)
      setAddressDialogOpen(true)
    } catch {
      toast.error("Erro ao buscar coordenadas do endereço")
    } finally {
      setAddressLoading(false)
    }
  }

  function selecionarEndereco(address: EnderecoResultado) {
    const title = addressTitle(address)
    selectedAddressQueryRef.current = title
    setForm((current) => ({ ...current, endereco: title }))
    setAddressResults([])
    setHasSearchedAddress(false)
    setIsSearchingAddress(false)
    setAddressResult(address)
    setAddressDialogOpen(true)
  }

  function aplicarCoordenadasEndereco() {
    if (!addressResult) return
    setForm((current) => ({
      ...current,
      latitude: addressResult.latitude,
      longitude: addressResult.longitude,
    }))
    setAddressDialogOpen(false)
    toast.success("Latitude e longitude adicionadas")
  }

  async function save() {
    const cep = onlyDigits(form.cep)
    const preco = numericPayload(form.preco)
    const area = numericPayload(form.area)
    if (!form.titulo || !preco) {
      toast.error("Título e preço são obrigatórios")
      return
    }
    if (cep.length !== 8) {
      toast.error("Informe um CEP com 8 dígitos")
      return
    }

    const isRural = form.regiao === "rural"
    const ruralHouses = isRural ? counterValue(form.casas) : 0
    const hasRuralHouse = isRural && ruralHouses > 0

    const payload: ImovelPayload = {
      titulo: form.titulo,
      descricao: form.descricao,
      preco,
      cep: formatCep(cep),
      endereco: form.endereco,
      area,
      regiao: form.regiao,
      alqueres: isRural ? form.alqueres : "0",
      casas: ruralHouses,
      quartos: !isRural || hasRuralHouse ? counterValue(form.quartos) : 0,
      banheiros: !isRural || hasRuralHouse ? counterValue(form.banheiros) : 0,
      vagas: !isRural || hasRuralHouse ? counterValue(form.vagas) : 0,
      cozinhas: !isRural || hasRuralHouse ? counterValue(form.cozinhas) : 0,
      salas: !isRural || hasRuralHouse ? counterValue(form.salas) : 0,
      varandas: !isRural || hasRuralHouse ? counterValue(form.varandas) : 0,
      status: form.status,
      destaque: form.destaque,
      finalidade: form.finalidade,
      latitude: form.latitude,
      longitude: form.longitude,
      cidade_id: form.cidade_id,
      bairro_nome: form.bairro_nome,
      corretor_id: form.corretor_id,
      imagens: imageFiles.map((image) => image.file),
      remove_image_ids: removedImageIds,
    }

    try {
      if (editing && id) await updateImovel.mutateAsync(payload)
      else await createImovel.mutateAsync(payload)
      toast.success(editing ? "Imóvel atualizado" : "Imóvel cadastrado")
      closeDialog()
    } catch {
      toast.error("Não foi possível salvar. Confira os dados e permissões.")
    }
  }

  return (
    <section className="min-h-[calc(100svh-88px)] bg-secondary px-0 py-4 sm:py-6 lg:py-8">
      <div className="mx-auto min-w-0 max-w-[1180px] px-0">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Painel administrativo</p>
        <h1 className="mt-2 break-words text-3xl font-semibold">{editing ? "Editar imóvel" : "Cadastrar imóvel"}</h1>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="max-h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] !max-w-[1368px] gap-0 overflow-hidden p-0 sm:max-h-[calc(100svh-2.5rem)] sm:w-[calc(100vw-3rem)] sm:rounded-xl"
          onInteractOutside={(event) => {
            const target = event.detail.originalEvent.target as HTMLElement | null
            if (previewPhoto || target?.closest?.("[data-photo-viewer]")) event.preventDefault()
          }}
          onEscapeKeyDown={(event) => {
            if (previewPhoto) {
              event.preventDefault()
              setPreviewIndex(null)
            }
          }}
        >
          <DialogHeader className="border-b px-4 py-4 sm:px-7 sm:text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-foreground">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {editing ? "Editar imóvel" : "Novo imóvel"}
                </DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Preencha as informações do imóvel
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(100svh-13rem)] overflow-y-auto">
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="grid min-w-0 gap-4 px-4 py-5 sm:px-7 sm:py-6 lg:pr-8">
                <Field label="Título *">
                  <Input className="h-11" value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} placeholder="Ex: Apartamento 3 quartos em Botafogo" />
                </Field>
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Preço (R$) *">
                    <Input className="h-11" inputMode="numeric" value={form.preco} onChange={(event) => setForm((current) => ({ ...current, preco: formatCurrencyInput(event.target.value) }))} placeholder="R$ 350.000" />
                  </Field>
                  <Field label="Área (m²)">
                    <Input className="h-11" inputMode="numeric" value={form.area} onChange={(event) => setForm((current) => ({ ...current, area: formatAreaInput(event.target.value) }))} placeholder="80 m²" />
                  </Field>
                </div>
                <Field label="CEP *">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input className="h-11 min-w-0" inputMode="numeric" maxLength={9} value={form.cep} onChange={(event) => setForm((current) => ({ ...current, cep: formatCep(event.target.value) }))} placeholder="00000-000" />
                    <Button type="button" className="h-11 w-full sm:w-auto sm:min-w-[118px]" onClick={buscarCep} disabled={cepLoading}>
                      <Search className="h-4 w-4" />
                      {cepLoading ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </Field>
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Bairro">
                    <Input className="h-11" value={form.bairro_nome} onChange={(event) => setForm((current) => ({ ...current, bairro_nome: event.target.value }))} placeholder="Bairro" />
                  </Field>
                  <Field label="Cidade">
                    <Select value={form.cidade_id || "_"} onValueChange={(value) => {
                      const cidade = cidades.find((item) => String(item.id) === value)
                      setForm((current) => ({
                        ...current,
                        cidade_id: value === "_" ? "" : value,
                        cidade_nome: cidade ? `${cidade.nome} - ${cidade.estado || ""}` : "",
                      }))
                    }}>
                      <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Selecione</SelectItem>
                        {cidades.map((cidade) => <SelectItem key={cidade.id} value={String(cidade.id)}>{cidade.nome} - {cidade.estado}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <p className="-mt-2 text-xs text-muted-foreground">
                  A cidade pode vir do CEP. O ponto do mapa usa latitude e longitude confirmadas.
                </p>
                <Field label="Endereço">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Input
                        className="h-11 min-w-0 pr-10"
                        value={form.endereco}
                        onChange={(event) => {
                          selectedAddressQueryRef.current = ""
                          setForm((current) => ({ ...current, endereco: event.target.value }))
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            void buscarCoordenadasEndereco()
                          }
                          if (event.key === "Escape") {
                            setAddressResults([])
                            setHasSearchedAddress(false)
                          }
                        }}
                        placeholder="Rua, número"
                      />
                      {isSearchingAddress ? (
                        <LoaderCircle className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                      ) : null}
                      {form.endereco.trim().length >= 3 && (addressResults.length > 0 || hasSearchedAddress || isSearchingAddress) ? (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-[9020] w-full overflow-hidden rounded-2xl border border-border/80 bg-white">
                          <div className="max-h-72 overflow-y-auto py-1 premium-scrollbar">
                            {addressResults.map((address) => (
                              <button
                                key={address.place_id}
                                type="button"
                                className="group flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-secondary/80 focus:bg-secondary focus:outline-none"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => selecionarEndereco(address)}
                              >
                                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition group-hover:bg-white group-hover:text-primary">
                                  <MapPin className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold leading-5 text-foreground">{addressTitle(address)}</span>
                                  <span className="mt-0.5 line-clamp-2 text-xs leading-4 text-muted-foreground">{addressSubtitle(address)}</span>
                                </span>
                              </button>
                            ))}
                            {!isSearchingAddress && hasSearchedAddress && addressResults.length === 0 ? (
                              <div className="px-4 py-5 text-sm text-muted-foreground">Nenhum endereço encontrado.</div>
                            ) : null}
                            {isSearchingAddress && addressResults.length === 0 ? (
                              <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
                                <LoaderCircle className="size-4 animate-spin" />
                                Buscando endereços...
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <Button type="button" variant="outline" className="h-11 w-full sm:w-auto sm:min-w-[118px]" onClick={buscarCoordenadasEndereco} disabled={addressLoading}>
                      <MapPin className="h-4 w-4" />
                      {addressLoading ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </Field>
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Latitude">
                    <Input className="h-11" value={form.latitude} onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))} placeholder="-23.5505200" />
                  </Field>
                  <Field label="Longitude">
                    <Input className="h-11" value={form.longitude} onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))} placeholder="-46.6333080" />
                  </Field>
                </div>
                <Field label="Região do imóvel">
                  <Select
                    value={form.regiao}
                    onValueChange={(value) => setForm((current) => ({
                      ...current,
                      regiao: value === "rural" ? "rural" : "urbano",
                      alqueres: value === "rural" ? current.alqueres : "",
                      casas: value === "rural" ? current.casas : 0,
                    }))}
                  >
                    <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{REGIAO_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                {form.regiao === "rural" ? (
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Quantidade de alqueires">
                      <Input
                        className="h-11"
                        inputMode="decimal"
                        value={form.alqueres}
                        onChange={(event) => setForm((current) => ({ ...current, alqueres: event.target.value.replace(/[^\d,.]/g, "") }))}
                        placeholder="Ex: 12,5"
                      />
                    </Field>
                    <CounterField label="Casas no terreno" value={form.casas} onChange={(value) => setForm((current) => ({ ...current, casas: value }))} />
                  </div>
                ) : null}
                {form.regiao === "urbano" || counterValue(form.casas) > 0 ? (
                  <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <CounterField label="Quartos" value={form.quartos} onChange={(value) => setForm((current) => ({ ...current, quartos: value }))} />
                    <CounterField label="Banheiros" value={form.banheiros} onChange={(value) => setForm((current) => ({ ...current, banheiros: value }))} />
                    <CounterField label="Vagas" value={form.vagas} onChange={(value) => setForm((current) => ({ ...current, vagas: value }))} />
                    <CounterField label="Cozinhas" value={form.cozinhas} onChange={(value) => setForm((current) => ({ ...current, cozinhas: value }))} />
                    <CounterField label="Salas" value={form.salas} onChange={(value) => setForm((current) => ({ ...current, salas: value }))} />
                    <CounterField label="Varandas" value={form.varandas} onChange={(value) => setForm((current) => ({ ...current, varandas: value }))} />
                  </div>
                ) : null}
                <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Status">
                    <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                      <SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Finalidade">
                    <Select value={form.finalidade || "_"} onValueChange={(value) => setForm((current) => ({ ...current, finalidade: value === "_" ? "" : value }))}>
                      <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Selecionar" /></SelectTrigger>
                      <SelectContent>{FINALIDADE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Corretor responsável">
                  <Select value={form.corretor_id || "_"} onValueChange={(value) => setForm((current) => ({ ...current, corretor_id: value === "_" ? "" : value }))}>
                    <SelectTrigger className="h-11 w-full"><SelectValue placeholder="Selecionar corretor" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Sem corretor</SelectItem>
                      {corretores.map((corretor) => <SelectItem key={corretor.id} value={String(corretor.id)}>{corretor.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Descrição">
                  <Textarea
                    className="min-h-[86px] rounded-md"
                    value={form.descricao}
                    onChange={(event) => setForm((current) => ({ ...current, descricao: event.target.value }))}
                    placeholder="Descrição do imóvel..."
                  />
                </Field>
                <div className="flex items-start gap-3">
                  <input type="checkbox" id="destaque" checked={form.destaque} onChange={(event) => setForm((current) => ({ ...current, destaque: event.target.checked }))} className="mt-1 h-4 w-4 rounded border-input" />
                  <div>
                    <Label htmlFor="destaque" className="font-semibold text-foreground">Imóvel em destaque</Label>
                    <p className="text-sm text-muted-foreground">Marque esta opção para destacar o imóvel.</p>
                  </div>
                </div>
              </div>

              <div className="min-w-0 border-t px-4 py-5 sm:px-7 sm:py-6 lg:border-l lg:border-t-0 lg:pl-8">
                <div className="rounded-lg border bg-background p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <Label className="text-base font-bold text-foreground">Fotos do imóvel</Label>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {visibleExistingImages.length + imageFiles.length}/{MAX_IMAGES} fotos · {(selectedImageTotal / 1024 / 1024).toFixed(1)} MB de 25 MB
                    </span>
                  </div>

                  <label
                    onDragEnter={(event) => { event.preventDefault(); setDragActive(true) }}
                    onDragOver={(event) => { event.preventDefault(); setDragActive(true) }}
                    onDragLeave={(event) => { event.preventDefault(); setDragActive(false) }}
                    onDrop={handleDrop}
                    className={cn(
                      "mt-5 flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-md border border-dashed px-6 py-6 text-center transition-colors",
                      dragActive ? "border-primary bg-primary/5" : "border-input hover:bg-muted/40",
                    )}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-foreground">
                      <UploadCloud className="h-7 w-7" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-foreground">Arraste imagens aqui ou clique para selecionar</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">JPG, JPEG, PNG ou WEBP.</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">2 MB por imagem, 25 MB no total, até 15 fotos.</p>
                      <p className="text-xs leading-5 text-muted-foreground">Recomendado: WEBP até 1920px de largura.</p>
                    </div>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={(event) => { addImages(event.target.files); event.target.value = "" }}
                    />
                  </label>

                  {visibleExistingImages.length + imageFiles.length > 0 ? (
                    <div className="mt-6">
                      <p className="text-sm font-bold text-foreground">Fotos selecionadas</p>
                      <div className="mt-3 grid max-h-[430px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                        {visibleExistingImages.map((image: ImagemImovel, index) => (
                          <div key={`existing-${image.id}`} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                            <button type="button" className="h-full w-full" onClick={() => openPreview(index)}>
                              <img src={image.url} alt={image.legenda || form.titulo} className="h-full w-full object-cover" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/65 px-2 py-1 text-left text-[11px] text-white">Foto salva</div>
                            <button
                              type="button"
                              aria-label="Remover imagem"
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => removeExistingImage(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        {imageFiles.map((image, index) => (
                          <div key={image.id} className="group relative aspect-square overflow-hidden rounded-md border bg-muted">
                            <button type="button" className="h-full w-full" onClick={() => openPreview(visibleExistingImages.length + index)}>
                              <img src={image.url} alt={image.name} className="h-full w-full object-cover" />
                            </button>
                            <button
                              type="button"
                              aria-label="Remover imagem"
                              className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                              onClick={() => removeNewImage(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 truncate bg-black/65 px-2 py-1 text-left text-[11px] text-white">{image.name}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-6 text-sm font-bold text-foreground">Nenhuma foto selecionada</p>
                      <div className="mt-3 flex min-h-[230px] flex-col items-center justify-center rounded-md border bg-muted/40 px-6 text-center">
                        <span className="flex h-16 w-16 items-center justify-center rounded-full border bg-background text-muted-foreground">
                          <ImageIcon className="h-8 w-8" />
                        </span>
                        <p className="mt-4 text-sm font-bold text-foreground">Selecione uma foto</p>
                        <p className="mt-2 max-w-[250px] text-sm leading-6 text-muted-foreground">
                          A imagem selecionada aparecerá aqui para visualização.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-1 gap-2 border-t bg-background px-4 py-4 sm:flex sm:px-7">
            <Button variant="outline" className="h-12 w-full sm:w-auto sm:min-w-[120px]" onClick={closeDialog}>Cancelar</Button>
            <Button className="h-12 w-full sm:w-auto sm:min-w-[150px]" onClick={save} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PhotoPreview
        photo={previewPhoto}
        count={galleryImages.length}
        currentIndex={previewIndex ?? 0}
        onClose={closePreview}
        onPrevious={showPreviousPhoto}
        onNext={showNextPhoto}
      />
      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] overflow-y-auto rounded-[28px] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Coordenadas encontradas</DialogTitle>
            <DialogDescription>
              Confira no Maps se latitude e longitude correspondem ao imóvel antes de adicionar.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border bg-secondary/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Endereço retornado</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{addressResult?.display_name}</p>
          </div>
          {addressMapUrl ? (
            <div className="overflow-hidden rounded-2xl border bg-secondary">
              <iframe
                title="Mapa das coordenadas encontradas"
                src={addressMapUrl}
                className="h-56 w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : null}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Field label="Latitude">
              <Input readOnly className="h-11 bg-secondary" value={addressResult?.latitude ?? ""} />
            </Field>
            <Field label="Longitude">
              <Input readOnly className="h-11 bg-secondary" value={addressResult?.longitude ?? ""} />
            </Field>
          </div>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:flex">
            <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setAddressDialogOpen(false)}>
              Adicionar manual
            </Button>
            <Button className="w-full rounded-full sm:w-auto" onClick={aplicarCoordenadasEndereco}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}
