// src/app/consultant/jobs/page.tsx
// 顾问职位管理列表（服务器组件 → 客户端组件分离）

import { createClient, createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import JobList from '@/components/consultant/JobList'

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

  // 获取顾问列表（用于分配）
  const { data: consultants } = await serviceClient
    .from('consultants')
    .select('id, name, email')
    .order('name')

  // 获取当前顾问的职位
  const { data: jobs, error } = await serviceClient
    .from('jobs')
    .select(`
      id, title, industry, city, salary_min, salary_max,
      level, status, is_published, view_count, apply_count,
      summary, tags, created_at, consultant_id,
      hidden_company:hidden_company_profiles(anonymized_name)
    `)
    .eq('consultant_id', user!.id)
    .order('created_at', { ascending: false })

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
        <JobList
          jobs={jobs as any}
          consultants={consultants || []}
        />
      )}
    </div>
  )
}
