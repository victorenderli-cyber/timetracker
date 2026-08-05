import { useState } from 'react'
import { contactsApi, LeadInput } from '@/api/contacts'
import { Button } from '@/components/ui/Button'
import { toast, toastError } from '@/store/toastStore'
import { Mail, User, Briefcase, MapPin, X, CheckCircle2, TrendingUp } from 'lucide-react'
import { cn } from '@/utils/cn'

// Campo honeypot: invisível para humanos, bots preenchem. A API rejeita e
// responde sucesso falso. Manter a classe oculta via CSS (.hidden-hp).
const HONEYPOT = 'website'

const QUIZ_OPTIONS = [
  { key: 'crescimento', label: 'Quero crescer na carreira' },
  { key: 'transicao', label: 'Estou pensando em mudar de área' },
  { key: 'concurso', label: 'Estou focando em concursos' },
  { key: 'salario', label: 'Busco um salário melhor' },
  { key: 'estavel', label: 'Estou bem onde estou' },
]

const STORAGE_KEY = 'career_data_collection_dismissed'

export function DataCollection() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  const [openSection, setOpenSection] = useState<'newsletter' | 'lead' | 'quiz'>('newsletter')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Newsletter
  const [newsEmail, setNewsEmail] = useState('')

  // Lead
  const [lead, setLead] = useState<LeadInput>({})
  const [leadOptin, setLeadOptin] = useState(false)
  const [hp, setHp] = useState('')

  // Quiz
  const [quizEmail, setQuizEmail] = useState('')
  const [quizKey, setQuizKey] = useState<string | null>(null)

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  const submitNewsletter = async () => {
    if (!newsEmail.trim()) return
    setSending(true)
    try {
      await contactsApi.submitLead({ email: newsEmail.trim(), newsletter_optin: true, [HONEYPOT]: hp })
      setSent(true)
      toast('Inscrição confirmada! Você receberá novidades do mercado de trabalho.')
    } catch (e: any) {
      toastError(e.response?.data?.detail || 'Não foi possível se inscrever. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  const submitLead = async () => {
    if (!lead.email?.trim()) {
      toastError('Informe pelo menos um e-mail para contato.')
      return
    }
    setSending(true)
    try {
      await contactsApi.submitLead({
        ...lead,
        email: lead.email.trim(),
        newsletter_optin: leadOptin,
        [HONEYPOT]: hp,
      })
      setSent(true)
      toast('Cadastro realizado com sucesso!')
    } catch (e: any) {
      toastError(e.response?.data?.detail || 'Não foi possível enviar. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  const submitQuiz = async () => {
    if (!quizKey) return
    setSending(true)
    try {
      await contactsApi.submitQuiz({
        email: quizEmail.trim() || undefined,
        question_key: 'momento_profissional',
        answer: quizKey,
      })
      setSent(true)
      toast('Obrigado por participar! Sua resposta nos ajuda a trazer conteúdo relevante.')
    } catch (e: any) {
      toastError(e.response?.data?.detail || 'Não foi possível enviar. Tente de novo.')
    } finally {
      setSending(false)
    }
  }

  if (dismissed) return null

  if (sent) {
    return (
      <section className="max-w-6xl mx-auto px-4 pb-2">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-6 flex items-start gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-800 dark:text-emerald-200">Recebido, obrigado!</h3>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              Seus dados ajudam a melhorar o conteúdo do portal.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-emerald-500 hover:text-emerald-700"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </section>
    )
  }

  const tabs: { key: typeof openSection; label: string; icon: typeof Mail }[] = [
    { key: 'newsletter', label: 'Newsletter', icon: Mail },
    { key: 'lead', label: 'Cadastro', icon: User },
    { key: 'quiz', label: 'Pesquisa', icon: TrendingUp },
  ]

  return (
    <section className="max-w-6xl mx-auto px-4 pb-2">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5 pb-0">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              Participe (opcional)
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Receba novidades do mercado de trabalho e ajude a melhorar o portal.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Dispensar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 p-5 pb-3 overflow-x-auto">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setOpenSection(key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors border',
                openSection === key
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-primary-400'
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="p-5 pt-2">
          {openSection === 'newsletter' && (
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={newsEmail}
                  onChange={(e) => setNewsEmail(e.target.value)}
                  placeholder="Seu e-mail"
                  className="input !pl-10 w-full"
                />
                <input
                  type="text"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  className="hidden-hp"
                  name={HONEYPOT}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                />
              </div>
              <Button onClick={submitNewsletter} loading={sending} className="sm:w-auto">
                Assinar newsletter
              </Button>
            </div>
          )}

          {openSection === 'lead' && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={lead.full_name || ''}
                  onChange={(e) => setLead({ ...lead, full_name: e.target.value })}
                  placeholder="Nome completo"
                  className="input !pl-10 w-full"
                />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={lead.email || ''}
                  onChange={(e) => setLead({ ...lead, email: e.target.value })}
                  placeholder="E-mail *"
                  className="input !pl-10 w-full"
                />
              </div>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={lead.role || ''}
                  onChange={(e) => setLead({ ...lead, role: e.target.value })}
                  placeholder="Cargo"
                  className="input !pl-10 w-full"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  value={lead.city || ''}
                  onChange={(e) => setLead({ ...lead, city: e.target.value })}
                  placeholder="Cidade"
                  className="input !pl-10 w-full"
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={leadOptin}
                  onChange={(e) => setLeadOptin(e.target.checked)}
                  className="rounded"
                />
                Quero receber a newsletter semanal
              </label>
              <input
                type="text"
                value={hp}
                onChange={(e) => setHp(e.target.value)}
                className="hidden-hp"
                name={HONEYPOT}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />
              <div className="sm:col-span-2">
                <Button onClick={submitLead} loading={sending} className="w-full">
                  Enviar cadastro
                </Button>
              </div>
            </div>
          )}

          {openSection === 'quiz' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Qual é o seu momento profissional no momento?
              </p>
              <div className="grid sm:grid-cols-2 gap-2 mb-3">
                {QUIZ_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setQuizKey(opt.key)}
                    className={cn(
                      'text-left text-sm px-3 py-2 rounded-xl border transition-colors',
                      quizKey === opt.key
                        ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-400 text-primary-700 dark:text-primary-300'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-primary-400'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="email"
                    value={quizEmail}
                    onChange={(e) => setQuizEmail(e.target.value)}
                    placeholder="E-mail (opcional)"
                    className="input !pl-10 w-full"
                  />
                </div>
                <Button onClick={submitQuiz} loading={sending} disabled={!quizKey} className="sm:w-auto">
                  Enviar resposta
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
