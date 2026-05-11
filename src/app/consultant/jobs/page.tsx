// src/app/consultant/jobs/page.tsx
// 顾问职位管理列表

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getJobStatusLabel, formatSalary } from '@/lib/utils/helpers'
import JobActions from './JobActions'
import Link from 'next/link'

export default async function ConsultantJobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const serviceClient = createServiceClient()

  // 未配置数据库时显示空状态
  if (!serviceClient) {
    return (
      <div className="card p-16 text-center">
        <div className="text-5xl mb-4">⚙️</div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">数据库未配置</h2>
        <p className="text-gray-500">请配置 Supabase 环境变量</p>
      </div>
    )
  }

  const { data: jobs } = await serviceClient
    .from('jobs')
    .select(`
      id, title, industry, city, salary_min, salary_max,
      level, status, is_published, view_count, apply_count,
      summary, tags, created_at,
      hidden_company:hidden_company_profiles(anonymized_name)
    `)
    .eq('consultant_id', user!.id)
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    draft:      'bg-gray-100 text-gray-600',
    processing: 'bg-yellow-100 text-yellow-700',
    published:  'bg-green-100 text-green-700',
    closed:     'bg-red-100 text-red-600',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">职位管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {jobs?.length || 0} 个职位</p>
        </div>
        <Link href="/consultant/jobs/import" className="btn-primary flex items-center gap-2">
          <span>+</span> 导入新职位
        </Link>
      </div>

      {!jobs || jobs.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">还没有职位</h2>
          <p className="text-gray-500 mb-6">导入Excel/Word/PDF或手动输入来创建职位</p>
          <Link href="/consultant/jobs/import" className="btn-primary">
            立即导入职位
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job: any) => (
            <div key={job.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-base font-semibold text-gray-900">{job.title}</h2>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[job.status]}`}>
                      {getJobStatusLabel(job.status)}
                    </span>
                    {job.is_published && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        ✓ 已上架
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                    {job.industry && <span>{job.industry}</span>}
                    {job.city && <span>📍 {job.city}</span>}
                    {(job.salary_min || job.salary_max) && (
                      <span className="text-blue-600 font-medium">
                        {formatSalary(job.salary_min, job.salary_max)}
                      </span>
                    )}
                    <span className="text-gray-400">
                      👁 {job.view_count} · 📄 {job.apply_count}人申请
                    </span>
                  </div>

                  {(job.hidden_company as any)?.anonymized_name && (
                    <div className="text-xs text-gray-400">
                      客户：{(job.hidden_company as any).anonymized_name}
                    </div>
                  )}
                </div>

                <JobActions jobId={job.id} status={job.status} isPublished={job.is_published} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
