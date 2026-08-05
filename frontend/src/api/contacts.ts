import api from './client'

export interface LeadInput {
  full_name?: string
  email?: string
  role?: string
  area?: string
  city?: string
  source?: string
  newsletter_optin?: boolean
  consent?: boolean
  website?: string
}

export interface LeadRecord {
  id: number
  email?: string | null
  full_name?: string | null
  role?: string | null
  area?: string | null
  city?: string | null
  source?: string
  newsletter_optin: boolean
  consent?: string | null
  created_at: string
}

export interface QuizRecord {
  id: number
  email?: string | null
  question_key: string
  answer: string
  created_at: string
}

export interface QuizInput {
  email?: string
  question_key: string
  answer: string
}

export interface ContactSummary {
  total_leads: number
  total_quiz: number
}

export const contactsApi = {
  submitLead: async (lead: LeadInput) => {
    const { data } = await api.post('/leads', { source: 'portal', ...lead })
    return data
  },
  submitQuiz: async (quiz: QuizInput) => {
    const { data } = await api.post('/quiz', quiz)
    return data
  },
  summary: async () => {
    const { data } = await api.get('/contacts/summary')
    return data as ContactSummary
  },
  listLeads: async () => {
    const { data } = await api.get('/contacts/leads')
    return data as LeadRecord[]
  },
  listQuiz: async () => {
    const { data } = await api.get('/contacts/quiz')
    return data as QuizRecord[]
  },
  exportCsv: async () => {
    const { data, headers } = await api.get('/contacts/export.csv', { responseType: 'blob' })
    const disposition = headers['content-disposition'] || ''
    const match = disposition.match(/filename="?([^"]+)"?/)
    const filename = match?.[1] || `leads-${new Date().toISOString().slice(0, 10)}.csv`
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
