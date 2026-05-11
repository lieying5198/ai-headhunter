// src/app/api/jobs/[id]/route.ts
// GET 职位详情（双模式）、PUT 更新职位

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

// 检查 Supabase 是否已配置
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !(!url || url === 'placeholder' || url.includes('placeholder.supabase'))
}

// 从静态 JSON 加载单个职位
function getStaticJobById(id: string): any | null {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'jobs.json')
    const content = readFileSync(filePath, 'utf-8')
    const jobs = JSON.parse(content)
    const job = jobs.find((j: any) => j.id === id && j.is_published !== false)
    if (!job) return null
    return {
      id: job.id,
      title: job.title,
      industry: job.industry,
      job_function: job.job_function || job.function,
      city: job.city,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      level: job.level,
      anonymized_jd: job.summary || '',
      summary: job.summary,
      tags: job.tags || [],
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
      status: job.status || 'published',
      is_published: job.is_published !== false,
      view_count: job.view_count || 0,
      apply_count: job.apply_count || 0,
      created_at: job.created_at || new Date().toISOString(),
      hidden_company: null,
    }
  } catch {
    return null
  }
}

// GET /api/jobs/:id（双模式）
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // 1. 未配置 Supabase 时直接用静态数据
  if (!isSupabaseConfigured()) {
    const job = getStaticJobById(id)
    if (!job) {
      return NextResponse.json({ success: false, error: '职位不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: job, source: 'static' })
  }

  // 2. 已配置：优先 Supabase，失败时降级
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id, title, industry, job_function, city, salary_min, salary_max,
        level, anonymized_jd, summary, tags, requirements, responsibilities,
        status, is_published, view_count, apply_count, created_at,
        hidden_company:hidden_company_profiles(anonymized_name, industry, scale, stage, is_listed)
      `)
      .eq('id', id)
      .eq('is_published', true)
      .single()

    if (error || !data) throw error || new Error('未找到')

    // 增加浏览量（静默失败）
    const serviceClient = createServiceClient()
    if (serviceClient) {
      serviceClient
        .from('jobs')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id)
        .then(() => {}, () => {})
    }

    return NextResponse.json({ success: true, data, source: 'supabase' })
  } catch (err: any) {
    console.warn('[Job Detail API] Supabase 失败，降级到静态数据:', err.message)
    const job = getStaticJobById(id)
    if (!job) {
      return NextResponse.json({ success: false, error: '职位不存在' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: job, source: 'static' })
  }
}

// PUT /api/jobs/:id - 更新职位（仅 Supabase 模式）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const body = await request.json()
  const serviceClient = createServiceClient()

  if (!serviceClient) {
    return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 })
  }

  const { data, error } = await serviceClient
    .from('jobs')
    .update(body)
    .eq('id', id)
    .eq('consultant_id', user.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
