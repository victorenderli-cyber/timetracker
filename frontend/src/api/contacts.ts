import api from './client'

export interface LeadInput {
  full_name?: string
  email?: string
  role?: string
  area?: string
  city?: string
  source?: string
  newsletter_optin?: boolean
  website?: string
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
}
