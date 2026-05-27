import { ShieldCheck } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const TERMS_STORAGE_KEY = "maldonado:terms-of-use-consent"
const TERMS_VERSION = "2026-05-19-03-12"

const TERMS_PARAGRAPHS = [
  "A sua privacidade é importante para nós. É política do Maldonado Corretor respeitar a sua privacidade em relação a qualquer informação sua que possamos coletar no site Maldonado Corretor e outros sites que possuímos e operamos.",
  "Solicitamos informações pessoais apenas quando realmente precisamos delas para lhe fornecer um serviço. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Também informamos por que estamos coletando e como será usado.",
  "Apenas retemos as informações coletadas pelo tempo necessário para fornecer o serviço solicitado. Quando armazenamos dados, protegemos dentro de meios comercialmente aceitáveis para evitar perdas e roubos, bem como acesso, divulgação, cópia, uso ou modificação não autorizados.",
  "Não compartilhamos informações de identificação pessoal publicamente ou com terceiros, exceto quando exigido por lei.",
  "O nosso site pode ter links para sites externos que não são operados por nós. Esteja ciente de que não temos controle sobre o conteúdo e práticas desses sites e não podemos aceitar responsabilidade por suas respectivas políticas de privacidade.",
  "Você é livre para recusar a nossa solicitação de informações pessoais, entendendo que talvez não possamos fornecer alguns dos serviços desejados.",
  "O uso continuado de nosso site será considerado como aceitação de nossas práticas em torno de privacidade e informações pessoais. Se você tiver alguma dúvida sobre como lidamos com dados do usuário e informações pessoais, entre em contacto connosco.",
  "O serviço Google AdSense que usamos para veicular publicidade usa um cookie DoubleClick para veicular anúncios mais relevantes em toda a Web e limitar o número de vezes que um determinado anúncio é exibido para você.",
  "Para mais informações sobre o Google AdSense, consulte as FAQs oficiais sobre privacidade do Google AdSense.",
  "Utilizamos anúncios para compensar os custos de funcionamento deste site e fornecer financiamento para futuros desenvolvimentos. Os cookies de publicidade comportamental usados por este site foram projetados para garantir que você receba os anúncios mais relevantes sempre que possível, rastreando anonimamente seus interesses e apresentando coisas semelhantes que possam ser do seu interesse.",
  "Vários parceiros anunciam em nosso nome e os cookies de rastreamento de afiliados simplesmente nos permitem ver se nossos clientes acessaram o site através de um dos sites de nossos parceiros, para que possamos creditá-los adequadamente e, quando aplicável, permitir que nossos parceiros afiliados ofereçam qualquer promoção que possa ser fornecida para fazer uma compra.",
]

const USER_COMMITMENTS = [
  "Não se envolver em atividades que sejam ilegais ou contrárias à boa fé e à ordem pública.",
  "Não difundir propaganda ou conteúdo de natureza racista, xenofóbica, jogos de sorte ou azar, qualquer tipo de pornografia ilegal, apologia ao terrorismo ou conteúdo contra os direitos humanos.",
  "Não causar danos aos sistemas físicos e lógicos do Maldonado Corretor, de seus fornecedores ou terceiros, nem introduzir ou disseminar vírus informáticos ou quaisquer outros sistemas capazes de causar danos.",
]

function hasAcceptedTerms() {
  try {
    return window.localStorage.getItem(TERMS_STORAGE_KEY) === TERMS_VERSION
  } catch {
    return false
  }
}

function persistTermsConsent() {
  try {
    window.localStorage.setItem(TERMS_STORAGE_KEY, TERMS_VERSION)
  } catch {
    return
  }
}

export function TermsConsentModal() {
  const [open, setOpen] = useState(() => !hasAcceptedTerms())
  const [checked, setChecked] = useState(false)

  function acceptTerms() {
    persistTermsConsent()
    setOpen(false)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen && setOpen(true)}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        className="max-h-[calc(100dvh-1rem)] overflow-hidden rounded-[24px] border-border/70 bg-white p-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-[28px]"
      >
        <DialogHeader className="border-b border-border/70 px-6 py-5 text-left">
          <div className="mb-3 grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <DialogTitle className="text-2xl font-semibold tracking-tight">Termos de uso e privacidade</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-muted-foreground">
            Para continuar usando o sistema, leia e aceite os termos abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="premium-scrollbar max-h-[46dvh] space-y-5 overflow-y-auto px-5 py-5 text-sm leading-6 text-[#3f3f3f] sm:max-h-[52dvh] sm:px-6">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Política de Privacidade</h2>
            {TERMS_PARAGRAPHS.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Compromisso do Usuário</h2>
            <p>O usuário se compromete a fazer uso adequado dos conteúdos e da informação que o Maldonado Corretor oferece no site, incluindo, mas não se limitando a:</p>
            <ol className="space-y-2 pl-5">
              {USER_COMMITMENTS.map((commitment, index) => (
                <li key={commitment}>
                  {String.fromCharCode(65 + index)}) {commitment}
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">Mais informações</h2>
            <p>
              Esperemos que esteja esclarecido e, como mencionado anteriormente, se houver algo que você não tem certeza se precisa ou não,
              geralmente é mais seguro deixar os cookies ativados, caso interaja com um dos recursos que você usa em nosso site.
            </p>
            <p className="text-xs font-medium text-muted-foreground">Esta política é efetiva a partir de 19 May 2026 03:12.</p>
          </section>
        </div>

        <div className="border-t border-border/70 bg-secondary/55 px-5 py-4 sm:px-6">
          <label className="flex items-start gap-3 text-sm leading-5 text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 size-4 rounded border-border accent-primary"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>Li e aceito os termos de uso e a política de privacidade do Maldonado Corretor.</span>
          </label>
          <Button className="mt-4 h-12 w-full rounded-full" disabled={!checked} onClick={acceptTerms}>
            Aceitar e continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
