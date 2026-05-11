// src/app/api/candidates/route.ts
// 获取候选人列表（顾问）

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const status = searchParams.get('status')
  const jobId = searchParams.get('jobId')

  const serviceClient = createServiceClient()

  if (!serviceClient) {
    return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 })
  }

  let query = serviceClient
    .from('candidates')
    .select(`
      id, name, email, phone, current_company, current_title,
      current_industry, years_exp, status, source, created_at,
      resumes(id, job_id, created_at),
      ai_scores(id, job_id, overall_score, overall_numeric, industry_match, level_match, created_at)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  let { data, error, count } = await query

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // 如果指定了 jobId，过滤关联该职位的候选人
  if (jobId && data) {
    data = data.filter((c: any) =>
      c.resumes?.some((r: any) => r.job_id === jobId) ||
      c.ai_scores?.some((s: any) => s.job_id === jobId)
    )
  }

  return NextResponse.json({
    success: true,
    data,
    total: count || 0,
    page,
    pageSize,
  })
}
