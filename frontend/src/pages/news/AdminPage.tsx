import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { contactsApi, LeadRecord, QuizRecord, ContactSummary } from '@/api/contacts'
import { useAuthStore } from '@/store/authStore'
import { toast, toastError } from '@/store/toastStore'
import { ShieldCheck, Download, Mail, TrendingUp, Database, Users, ArrowLeft, ExternalLink } from 'lucide-react'

const QUIZ_LABELS: Record<string, string> = {
  momento_profissional: 'Momento profissional',
}

function fmtDate(iso?: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Stat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number; accent: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-2xl text-white ${accent}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      </div>
    </div>
  )
}

export function AdminPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const demoLogin = useAuthStore((s) => s.demoLogin)

  const [summary, setSummary] = useState<ContactSummary | null>(null)
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [quiz, setQuiz] = useState<QuizRecord[]>([])
  const [tab, setTab] = useState<'leads' | 'quiz'>('leads')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const load = async () => {
    try {
      if (!isAuthenticated) {
        await demoLogin()
      }
      const [s, l, q] = await Promise.all([contactsApi.summary(), contactsApi.listLeads(), contactsApi.listQuiz()])
      setSummary(s)
      setLeads(l)
      setQuiz(q)
    } catch (e: any) {
      toastError(e.response?.data?.detail || 'Não foi possível carregar os dados.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleExport = async () => {
    setExporting(true)
    try {
      await contactsApi.exportCsv()
      toast('CSV exportado!')
    } catch (e: any) {
      toastError('Falha ao exportar CSV.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b1120]">
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white leading-tight">Painel de Dados</div>
              <div className="text-[11px] text-gray-500 -mt-0.5">Leads, newsletter e pesquisas (LGPD)</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-lg shadow-primary-600/25"
            >
              <Download className="h-4 w-4" /> {exporting ? 'Exportando...' : 'Exportar CSV'}
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary-600 dark:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4" /> Portal
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid sm:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl h-24 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-3 gap-5 mb-6">
              <Stat icon={Users} label="Leads / cadastros" value={summary?.total_leads ?? 0} accent="bg-gradient-to-br from-primary-500 to-primary-700" />
              <Stat icon={TrendingUp} label="Respostas de pesquisa" value={summary?.total_quiz ?? 0} accent="bg-gradient-to-br from-emerald-500 to-emerald-700" />
              <Stat icon={Database} label="Total coletado" value={(summary?.total_leads ?? 0) + (summary?.total_quiz ?? 0)} accent="bg-gradient-to-br from-violet-500 to-violet-700" />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="flex gap-2 p-4 pb-0 overflow-x-auto">
                <button
                  onClick={() => setTab('leads')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${tab === 'leads' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <Mail className="h-4 w-4" /> Cadastros ({leads.length})
                </button>
                <button
                  onClick={() => setTab('quiz')}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${tab === 'quiz' ? 'bg-primary-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >
                  <TrendingUp className="h-4 w-4" /> Pesquisas ({quiz.length})
                </button>
              </div>

              <div className="p-4">
                {tab === 'leads' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2 pr-3">Nome</th>
                          <th className="py-2 pr-3">E-mail</th>
                          <th className="py-2 pr-3">Cargo</th>
                          <th className="py-2 pr-3">Origem</th>
                          <th className="py-2 pr-3">Newsletter</th>
                          <th className="py-2 pr-3">Consentimento</th>
                          <th className="py-2">Criado em</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leads.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-400">Nenhum cadastro ainda.</td>
                          </tr>
                        )}
                        {leads.map((l) => (
                          <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2.5 pr-3 font-medium text-gray-900 dark:text-white">{l.full_name || '—'}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{l.email || '—'}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{l.role || '—'}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{l.source || 'portal'}</td>
                            <td className="py-2.5 pr-3">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${l.newsletter_optin ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                                {l.newsletter_optin ? 'Sim' : 'Não'}
                              </span>
                            </td>
                            <td className="py-2.5 pr-3 text-xs text-gray-500 dark:text-gray-400">{fmtDate(l.consent)}</td>
                            <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400">{fmtDate(l.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tab === 'quiz' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                          <th className="py-2 pr-3">Pergunta</th>
                          <th className="py-2 pr-3">Resposta</th>
                          <th className="py-2 pr-3">E-mail</th>
                          <th className="py-2">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quiz.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400">Nenhuma resposta ainda.</td>
                          </tr>
                        )}
                        {quiz.map((q) => (
                          <tr key={q.id} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="py-2.5 pr-3 text-gray-900 dark:text-white">{QUIZ_LABELS[q.question_key] || q.question_key}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300 capitalize">{q.answer}</td>
                            <td className="py-2.5 pr-3 text-gray-600 dark:text-gray-300">{q.email || '—'}</td>
                            <td className="py-2.5 text-xs text-gray-500 dark:text-gray-400">{fmtDate(q.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              Dados coletados com consentimento (LGPD). O CSV é útil para backups e atendimento a pedidos de exclusão.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
