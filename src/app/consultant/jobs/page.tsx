// src/app/consultant/jobs/page.tsx
// 猎英盟 · 顾问职位管理

import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import JobList from '@/components/consultant/JobList'

export default async function ConsultantJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const serviceClient = createServiceClient()

  if (!serviceClient) {
    return (
      <div className="empty-state animate-fade-in-scale">
        <div className="empty-state-icon">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="empty-state-title">数据库未配置</h3>
        <p className="empty-state-desc">请配置 Supabase 环境变量后重试</p>
      </div>
    )
  }

  const { data: consultants } = await serviceClient
    .from('consultants')
    .select('id, name, email')
    .order('name')

  const { data: jobs, error } = await serviceClient
    .from('jobs')
    .select(`
      id, title, industry, city, salary_min, salary_max,
      level, status, is_published, view_count, apply_count,
      summary, tags, created_at, consultant_id,
      hidden_company:hidden_company_profiles(anonymized_name, real_name)
    `)
    .eq('consultant_id', user!.id)
    .order('created_at', { ascending: false })

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">职位管理</h1>
          <p className="text-sm text-gray-400 mt-1">共 {jobs?.length || 0} 个职位</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/consultant/jobs/create" className="btn-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            手动发布
          </Link>
          <Link href="/consultant/jobs/import" className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            导入新职位
          </Link>
        </div>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="empty-state-title">还没有职位</h3>
          <p className="empty-state-desc">导入 Excel / Word / PDF 或手动输入来创建职位</p>
          <Link href="/consultant/jobs/import" className="btn-primary mt-4">
            立即导入职位
          </Link>
        </div>
      ) : (
        <JobList jobs={jobs as any} consultants={consultants || []} />
      )}
    </div>
  )
}
