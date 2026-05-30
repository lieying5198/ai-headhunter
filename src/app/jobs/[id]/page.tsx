// src/app/jobs/[id]/page.tsx
// 猎英盟 · 职位详情页 - 品牌化设计，移动端优先

import { createServiceClient, createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JobDetailClient from '@/components/job/JobDetailClient'
import { readFileSync } from 'fs'
import path from 'path'

interface Props {
  params: Promise<{ id: string }>
}

function loadStaticJob(id: string): any {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'jobs.json')
    const content = readFileSync(filePath, 'utf-8')
    const jobs = JSON.parse(content)
    return jobs.find((j: any) => j.id === id && j.is_published !== false) || null
  } catch { return null }
}

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !(!url || url === 'placeholder' || url.includes('placeholder.supabase'))
}

/* ── SVG 区块图标 ── */
function SectionIcon({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
      style={{ backgroundColor: color }}>
      {children}
    </div>
  )
}

function BulletDot({ color }: { color: string }) {
  return <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: color }} />
}

function BulletCheck({ color }: { color: string }) {
  return (
    <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 text-xs font-bold text-white"
      style={{ backgroundColor: color }}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </span>
  )
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params
  let job: any = null
  let company: any = null
  let isAuthenticated = false
  let wechats: Array<{ id: string, wechat_id: string, nickname: string, is_primary: boolean, is_online: boolean }> = []
  let error: any = null

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServiceClient()
      // 检查当前用户是否已登录
      const authClient = await createClient()
      const { data: { session } } = await authClient.auth.getSession()
      isAuthenticated = !!session
      
      if (supabase) {
        const { data: dbJob, error: dbError } = await supabase
          .from('jobs')
          .select(`
            id, title, industry, job_function, city, salary_min, salary_max,
            level, anonymized_jd, summary, tags, requirements, responsibilities,
            apply_count, view_count, created_at,
            job_number, visit_notes, required_conditions, preferred_conditions,
            target_companies, must_ask_questions, hire_count, detailed_address,
            education_requirement, experience_years, skills_certificates,
            salary_benefits, department, subordinate_count, department_structure,
            reports_to, rank_title, interview_rounds, interview_process,
            video_interview_acceptable, hidden_company_id, user_id
          `)
          .eq('id', id)
          .eq('is_published', true)
          .single()
        if (dbJob) {
          job = dbJob
          if (job.hidden_company_id) {
            const { data: companyData } = await supabase
              .from('hidden_company_profiles')
              .select('anonymized_name, real_name, industry, scale, stage, is_listed')
              .eq('id', job.hidden_company_id).single()
            company = companyData
          }
          if (job.user_id) {
            const { data: wechatData } = await supabase
              .from('wechats')
              .select('id, wechat_id, nickname, is_primary, is_online')
              .eq('user_id', job.user_id)
              .order('is_primary', { ascending: false })
              .order('created_at', { ascending: true })
            if (wechatData) wechats = wechatData
          }
        } else { error = dbError }
      }
    } catch (err: any) {
      console.warn('[JobDetail] Supabase 降级:', err.message)
      error = err
    }
  }

  if (!job) {
    job = loadStaticJob(id)
    if (job) { company = null; wechats = [] }
  }

  if (!job) notFound()

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServiceClient()
      if (supabase) supabase.from('jobs').update({ view_count: (job.view_count || 0) + 1 }).eq('id', id).then(() => {})
    } catch { /* ignore */ }
  }

  const requirements = Array.isArray(job.requirements) ? job.requirements : []
  const responsibilities = Array.isArray(job.responsibilities) ? job.responsibilities : []
  const tags = Array.isArray(job.tags) ? job.tags : []
  const requiredConditions = Array.isArray(job.required_conditions) ? job.required_conditions : []
  const preferredConditions = Array.isArray(job.preferred_conditions) ? job.preferred_conditions : []
  const targetCompanies = Array.isArray(job.target_companies) ? job.target_companies : []
  const mustAskQuestions = Array.isArray(job.must_ask_questions) ? job.must_ask_questions : []
  const skillsCertificates = Array.isArray(job.skills_certificates) ? job.skills_certificates : []

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return '薪资面议'
    if (min && max) return `${min}-${max}万/年`
    if (min) return `${min}万+/年`
    if (max) return `最高${max}万/年`
    return '薪资面议'
  }

  const generateCopyText = () => {
    let text = ''
    if (job.job_number) text += `职位编号：${job.job_number}\n`
    text += `职位名称：${job.title}\n`
    if (job.summary) text += `\n职位亮点：\n${job.summary}\n`
    if (job.visit_notes) text += `\n寻访须知：\n${job.visit_notes}\n`
    if (requiredConditions.length > 0) text += `\n必备条件：\n${requiredConditions.map((c: string) => `\u2022 ${c}`).join('\n')}\n`
    if (preferredConditions.length > 0) text += `\n优先条件：\n${preferredConditions.map((c: string) => `\u2022 ${c}`).join('\n')}\n`
    if (targetCompanies.length > 0) text += `\n目标公司/行业：\n${targetCompanies.map((c: string) => `\u2022 ${c}`).join('\n')}\n`
    if (mustAskQuestions.length > 0) text += `\n必问问题：\n${mustAskQuestions.map((c: string) => `\u2022 ${c}`).join('\n')}\n`
    text += `\nJD信息：\n`
    if (responsibilities.length > 0) text += `岗位职责：\n${responsibilities.map((r: string) => `\u2022 ${r}`).join('\n')}\n`
    if (requirements.length > 0) text += `\n任职要求：\n${requirements.map((r: string) => `\u2022 ${r}`).join('\n')}\n`
    if (job.industry) text += `\n所属行业：${job.industry}\n`
    if (job.job_function) text += `职能分类：${job.job_function}\n`
    if (job.city) text += `工作城市：${job.city}\n`
    if (job.hire_count) text += `招聘人数：${job.hire_count}人\n`
    if (job.detailed_address) text += `详细地址：${job.detailed_address}\n`
    if (job.education_requirement) text += `\n学历要求：${job.education_requirement}\n`
    if (job.experience_years) text += `工作年限：${job.experience_years}\n`
    if (skillsCertificates.length > 0) text += `技能/证书：${skillsCertificates.join('\u3001')}\n`
    text += `\n薪资福利：\n年薪范围：${formatSalary(job.salary_min, job.salary_max)}\n`
    if (job.salary_benefits) text += `薪资福利：${job.salary_benefits}\n`
    if (job.department) text += `\n团队架构：\n所属部门：${job.department}\n`
    if (job.subordinate_count) text += `下属人数：${job.subordinate_count}\n`
    if (job.department_structure) text += `部门架构：${job.department_structure}\n`
    if (job.reports_to) text += `汇报对象：${job.reports_to}\n`
    if (job.rank_title) text += `职级职称：${job.rank_title}\n`
    if (job.interview_rounds) text += `\n面试信息：\n面试轮次：${job.interview_rounds}\n`
    if (job.interview_process) text += `面试流程：${job.interview_process}\n`
    if (job.video_interview_acceptable !== null) text += `视频面试：${job.video_interview_acceptable ? '可以接受' : '不可以接受'}\n`
    return text
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部品牌区 */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #FF6600 0%, #FF3D00 50%, #CC2900 100%)' }}>
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/2 right-0 w-[300px] h-[300px] rounded-full bg-white/5 blur-3xl" />

        <div className="relative px-4 pt-8 pb-20">
          {/* 导航 */}
          <div className="max-w-xl mx-auto flex items-center justify-between mb-6">
            <Link href="/jobs" className="text-white/70 hover:text-white flex items-center gap-1 text-sm transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              返回职位列表
            </Link>
            <span className="text-white/50 text-xs font-medium">猎英联盟</span>
          </div>

          {/* 职位编号 */}
          {job.job_number && (
            <div className="max-w-xl mx-auto mb-4">
              <span className="inline-block px-3 py-1 bg-white/15 backdrop-blur rounded-lg text-xs text-white/90 font-mono">
                职位编号：{job.job_number}
              </span>
            </div>
          )}

          {/* 职位主卡片 */}
          <div className="max-w-xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/15 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
                <svg className="w-7 h-7 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-extrabold text-white mb-1 tracking-tight">{job.title}</h1>
                <p className="text-white/70 text-sm mb-3">{company?.anonymized_name || '优质企业'}</p>
                <div className="flex flex-wrap gap-2">
                  {job.city && (
                    <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs text-white/90 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                      {job.city}
                    </span>
                  )}
                  {job.level && (
                    <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs text-white/90 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                      {job.level}
                    </span>
                  )}
                  {job.industry && (
                    <span className="px-3 py-1 bg-white/15 backdrop-blur rounded-full text-xs text-white/90 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      {job.industry}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 客户端交互组件 */}
      <JobDetailClient
        jobId={job.id}
        jobTitle={job.title}
        copyText={generateCopyText()}
        wechats={wechats}
      />

      {/* 薪资卡片 */}
      <div className="max-w-xl mx-auto px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-0.5">薪资范围</p>
              <p className="text-2xl font-extrabold brand-text">
                {formatSalary(job.salary_min, job.salary_max)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-500">{job.apply_count || 0} 人已申请</p>
              <p className="text-xs text-gray-400">{job.view_count || 0} 次浏览</p>
            </div>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-50">
              {tags.slice(0, 4).map((tag: string, i: number) => (
                <span key={i} className="badge-brand">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 职位详情区块 */}
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* 职位亮点 */}
        {job.summary && (
          <div className="rounded-2xl p-5 border border-orange-100" style={{ background: 'linear-gradient(135deg, #FFF1E6, rgba(255,255,255,0))' }}>
            <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <SectionIcon color="#FFF1E6">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </SectionIcon>
              职位亮点
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{job.summary}</p>
          </div>
        )}

        {/* 寻访须知 */}
        {job.visit_notes && (
          <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
            <h2 className="font-bold text-amber-900 mb-3 flex items-center gap-2">
              <SectionIcon color="#FEF3C7">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </SectionIcon>
              寻访须知
            </h2>
            <p className="text-sm text-amber-800 leading-relaxed">{job.visit_notes}</p>
          </div>
        )}

        {/* 必备条件 */}
        {requiredConditions.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#FEE2E2">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </SectionIcon>
              必备条件
            </h2>
            <ul className="space-y-3">
              {requiredConditions.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-red-100 rounded-md flex items-center justify-center text-red-600 shrink-0 text-xs font-bold">!</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 优先条件 */}
        {preferredConditions.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#DCFCE7">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </SectionIcon>
              优先条件
            </h2>
            <ul className="space-y-3">
              {preferredConditions.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <BulletCheck color="#16A34A" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 目标公司/行业 */}
        {targetCompanies.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#EDE9FE">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                </svg>
              </SectionIcon>
              目标公司/行业
            </h2>
            <ul className="space-y-3">
              {targetCompanies.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <BulletDot color="#7C3AED" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 必问问题 */}
        {mustAskQuestions.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#FFE8D4">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </SectionIcon>
              必问问题
            </h2>
            <ul className="space-y-3">
              {mustAskQuestions.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-orange-100 rounded-md flex items-center justify-center text-orange-600 shrink-0 text-xs font-bold">Q</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 岗位职责 */}
        {responsibilities.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#DBEAFE">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </SectionIcon>
              岗位职责
            </h2>
            <ul className="space-y-3">
              {responsibilities.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <BulletDot color="#3B82F6" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 任职要求 */}
        {requirements.length > 0 && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#DCFCE7">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </SectionIcon>
              任职要求
            </h2>
            <ul className="space-y-3">
              {requirements.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <BulletCheck color="#16A34A" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* JD详情 */}
        {job.anonymized_jd && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#EDE9FE">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </SectionIcon>
              详细说明
            </h2>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {job.anonymized_jd}
            </div>
          </div>
        )}

        {/* 职位要求汇总 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <SectionIcon color="#E0E7FF">
              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </SectionIcon>
            职位要求
          </h2>
          <div className="space-y-3 text-sm">
            {job.education_requirement && (
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">学历要求</span>
                <span className="font-semibold text-gray-900">{job.education_requirement}</span>
              </div>
            )}
            {job.experience_years && (
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">工作年限</span>
                <span className="font-semibold text-gray-900">{job.experience_years}</span>
              </div>
            )}
            {skillsCertificates.length > 0 && (
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-400">技能/证书</span>
                <span className="font-semibold text-gray-900">{skillsCertificates.join('\u3001')}</span>
              </div>
            )}
            <div className="flex justify-between py-1 border-b border-gray-50">
              <span className="text-gray-400">年薪范围</span>
              <span className="font-semibold text-brand" style={{ color: '#FF6600' }}>{formatSalary(job.salary_min, job.salary_max)}</span>
            </div>
            {job.salary_benefits && (
              <div className="flex justify-between py-1">
                <span className="text-gray-400">薪资福利</span>
                <span className="font-semibold text-gray-900">{job.salary_benefits}</span>
              </div>
            )}
          </div>
        </div>

        {/* 工作信息 */}
        {(job.city || job.hire_count || job.detailed_address || job.industry || job.job_function) && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#CFFAFE">
                <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </SectionIcon>
              工作信息
            </h2>
            <div className="space-y-3 text-sm">
              {job.industry && <InfoRow label="所属行业" value={job.industry} />}
              {job.job_function && <InfoRow label="职能分类" value={job.job_function} />}
              {job.city && <InfoRow label="工作城市" value={job.city} />}
              {job.hire_count && <InfoRow label="招聘人数" value={`${job.hire_count}人`} />}
              {job.detailed_address && <InfoRow label="详细地址" value={job.detailed_address} />}
            </div>
          </div>
        )}

        {/* 团队架构 */}
        {(job.department || job.subordinate_count || job.reports_to) && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#CCFBF1">
                <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </SectionIcon>
              团队架构
            </h2>
            <div className="space-y-3 text-sm">
              {job.department && <InfoRow label="所属部门" value={job.department} />}
              {job.subordinate_count && <InfoRow label="下属人数" value={`${job.subordinate_count}人`} />}
              {job.department_structure && <InfoRow label="部门架构" value={job.department_structure} />}
              {job.reports_to && <InfoRow label="汇报对象" value={job.reports_to} />}
              {job.rank_title && <InfoRow label="职级职称" value={job.rank_title} />}
            </div>
          </div>
        )}

        {/* 面试信息 */}
        {(job.interview_rounds || job.interview_process || job.video_interview_acceptable !== null) && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#FCE7F3">
                <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </SectionIcon>
              面试信息
            </h2>
            <div className="space-y-3 text-sm">
              {job.interview_rounds && <InfoRow label="面试轮次" value={job.interview_rounds} />}
              {job.interview_process && <InfoRow label="面试流程" value={job.interview_process} />}
              {job.video_interview_acceptable !== null && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">视频面试</span>
                  <span className={`badge text-xs ${job.video_interview_acceptable ? 'badge-success' : 'badge-error'}`}>
                    {job.video_interview_acceptable ? '可以接受' : '不可以接受'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 公司信息 */}
        {company && (
          <div className="card p-5">
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <SectionIcon color="#FEF3C7">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </SectionIcon>
              关于雇主
            </h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="公司名称" value={company.anonymized_name} />
              {/* 内部信息：登录用户可见真实名称 */}
              {isAuthenticated && company.real_name && company.real_name !== company.anonymized_name && (
                <div className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-400">真实名称（内部）</span>
                  <span className="font-semibold text-orange-600">{company.real_name}</span>
                </div>
              )}
              {company.industry && <InfoRow label="所属行业" value={company.industry} />}
              {company.scale && <InfoRow label="公司规模" value={company.scale} />}
              {company.stage && <InfoRow label="发展阶段" value={company.stage} />}
              {company.is_listed && (
                <div className="flex justify-between py-1">
                  <span className="text-gray-400">上市状态</span>
                  <span className="badge bg-amber-100 text-amber-700">已上市</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 底部留白 */}
      <div className="h-8" />
    </div>
  )
}

/* ── 信息行 ── */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 border-b border-gray-50 last:border-0">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold text-gray-900 truncate max-w-[60%]">{value}</span>
    </div>
  )
}
