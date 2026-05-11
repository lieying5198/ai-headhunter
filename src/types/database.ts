// src/types/database.ts
// Supabase 数据库类型定义

export type UserRole = 'admin' | 'consultant'
export type JobStatus = 'draft' | 'processing' | 'published' | 'closed'
export type CandidateStatus =
  | 'new' | 'screening' | 'screened' | 'contacted'
  | 'interviewing' | 'offered' | 'hired' | 'rejected'
export type ScoreGrade = 'A' | 'B' | 'C' | 'D'

export interface Consultant {
  id: string
  email: string
  name: string
  phone?: string
  wechat?: string
  role: UserRole
  company?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface HiddenCompanyProfile {
  id: string
  real_name: string
  anonymized_name: string
  industry?: string
  description?: string
  scale?: string
  stage?: string
  is_listed: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  consultant_id?: string
  hidden_company_id?: string
  job_number?: string
  title: string
  industry?: string
  job_function?: string
  city?: string
  salary_min?: number
  salary_max?: number
  salary_benefits?: string
  level?: string
  education_requirement?: string
  experience_years?: string
  department?: string
  subordinate_count?: number
  reports_to?: string
  rank_title?: string
  interview_rounds?: string
  interview_process?: string
  hire_count?: number
  video_interview_acceptable?: boolean
  raw_jd?: string
  anonymized_jd?: string
  summary?: string
  tags: string[]
  requirements: string[]
  required_conditions?: string[]
  preferred_conditions?: string[]
  target_companies?: string[]
  skills_certificates?: string[]
  responsibilities: string[]
  visit_notes?: string
  must_ask_questions?: string[]
  status: JobStatus
  is_published: boolean
  view_count: number
  apply_count: number
  created_at: string
  updated_at: string
  consultant?: Consultant
  hidden_company?: HiddenCompanyProfile
}

export interface Candidate {
  id: string
  name: string
  email?: string
  phone?: string
  current_company?: string
  current_title?: string
  current_industry?: string
  years_exp?: number
  status: CandidateStatus
  source: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface Resume {
  id: string
  candidate_id: string
  job_id?: string
  file_url: string
  file_name?: string
  file_type?: string
  file_size?: number
  parsed_text?: string
  parsed_data?: Record<string, unknown>
  created_at: string
}

export interface AIConversation {
  id: string
  job_id: string
  candidate_id?: string
  session_id: string
  messages: ChatMessage[]
  context: Record<string, unknown>
  ip_address?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface AIScore {
  id: string
  candidate_id: string
  job_id: string
  resume_id?: string
  industry_match?: number
  level_match?: number
  stability?: number
  management_exp?: number
  project_exp?: number
  overall_score?: ScoreGrade
  overall_numeric?: number
  recommendation?: string
  risks?: string
  summary?: string
  raw_response?: string
  created_at: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
}

// Job parsing types
export interface ParsedJD {
  title: string
  company_name?: string
  industry?: string
  job_function?: string
  city?: string
  salary_min?: number
  salary_max?: number
  level?: string
  reporting_to?: string
  team_size?: string
  responsibilities: string[]
  requirements: string[]
  preferred: string[]
  tags: string[]
  summary: string
}

// Resume parsing types
export interface ParsedResume {
  name?: string
  email?: string
  phone?: string
  current_company?: string
  current_title?: string
  current_industry?: string
  years_exp?: number
  education?: string
  skills?: string[]
  raw_text: string
}
