// src/app/api/jobs/route.ts
// GET 职位列表（公开）、POST 创建职位（顾问）
// 双模式：优先 Supabase，失败时自动降级到本地 JSON

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

// 检查 Supabase 是否已配置
function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !(!url || url === 'placeholder' || url.includes('placeholder.supabase'))
}

// 从静态 JSON 加载职位数据
function loadStaticJobs(): any[] {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'jobs.json')
    const content = readFileSync(filePath, 'utf-8')
    const jobs = JSON.parse(content)
    return jobs.filter((j: any) => j.is_published !== false).map((j: any) => ({
      id: j.id,
      job_number: j.job_number,
      title: j.title,
      industry: j.industry,
      job_function: j.job_function || j.function,
      city: typeof j.city === 'string' ? j.city : (j.city && typeof j.city === 'object' ? (j.city.city || j.city.name || '') : ''),
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      level: j.level,
      summary: j.summary,
      tags: j.tags,
      status: j.status,
      is_published: j.is_published,
      company_name_temp: j.company_name_temp || '',
      consultant_wechat: j.consultant_wechat || '',
      view_count: j.view_count || 0,
      apply_count: j.apply_count || 0,
      created_at: j.created_at || new Date().toISOString(),
    }))
  } catch {
    return []
  }
}

// 对静态职位列表应用过滤和分页
function filterAndPaginate(jobs: any[], request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const industry = searchParams.get('industry')
  const city = searchParams.get('city')
  const jobFunction = searchParams.get('function')
  const salaryMin = searchParams.get('salaryMin')
  const salaryMax = searchParams.get('salaryMax')
  const q = searchParams.get('q') || searchParams.get('keyword') || ''
  const sort = searchParams.get('sort') || 'latest'

  let filtered = jobs

  if (industry) filtered = filtered.filter((j: any) => j.industry === industry)
  if (city) filtered = filtered.filter((j: any) => j.city === city)
  if (jobFunction) filtered = filtered.filter((j: any) => j.job_function === jobFunction)
  if (salaryMin) filtered = filtered.filter((j: any) => j.salary_min >= parseInt(salaryMin))
  if (salaryMax) filtered = filtered.filter((j: any) => j.salary_max <= parseInt(salaryMax))
  if (q) {
    const lowerQ = q.toLowerCase()
    filtered = filtered.filter((j: any) =>
      j.title?.toLowerCase().includes(lowerQ) ||
      j.summary?.toLowerCase().includes(lowerQ) ||
      (j.company_name_temp && j.company_name_temp.toLowerCase().includes(lowerQ))
    )
  }

  // 排序
  if (sort === 'salary_high') {
    filtered.sort((a: any, b: any) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0))
  } else if (sort === 'hot') {
    filtered.sort((a: any, b: any) => (b.apply_count || 0) - (a.apply_count || 0))
  }
  // 'latest' 保持默认顺序（created_at desc）

  const total = filtered.length
  const from = (page - 1) * pageSize
  const paginatedJobs = filtered.slice(from, from + pageSize)

  return NextResponse.json({
    success: true,
    data: paginatedJobs,
    total,
    page,
    pageSize,
    source: 'static',
  })
}

// GET /api/jobs - 公开获取已发布职位（双模式）
export async function GET(request: NextRequest) {
  // 1. 未配置 Supabase 时直接使用静态数据
  if (!isSupabaseConfigured()) {
    console.log('[Jobs API] Supabase 未配置，使用静态数据')
    const jobs = loadStaticJobs()
    return filterAndPaginate(jobs, request)
  }

  // 2. 已配置 Supabase：优先用数据库，失败时降级到静态数据
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const industry = searchParams.get('industry')
    const city = searchParams.get('city')
    const jobFunction = searchParams.get('function')
    const salaryMin = searchParams.get('salaryMin')
    const salaryMax = searchParams.get('salaryMax')
    const q = searchParams.get('q') || searchParams.get('keyword') || ''
    const sort = searchParams.get('sort') || 'latest'

    let query = supabase
      .from('jobs')
      .select('id, job_number, title, industry, job_function, city, salary_min, salary_max, level, summary, tags, status, is_published, consultant_wechat, view_count, apply_count, created_at, company_name_temp', { count: 'exact' })
      .eq('is_published', true)
      .order('created_at', { ascending: false })

    if (industry) query = query.eq('industry', industry)
    if (city) query = query.eq('city', city)
    if (jobFunction) query = query.eq('job_function', jobFunction)
    if (salaryMin) query = query.gte('salary_min', parseInt(salaryMin))
    if (salaryMax) query = query.lte('salary_max', parseInt(salaryMax))
    if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,company_name_temp.ilike.%${q}%`)

    // 排序（覆盖默认的 created_at desc）
    if (sort === 'salary_high') {
      query = query.order('salary_max', { ascending: false, nullsFirst: false })
    } else if (sort === 'hot') {
      query = query.order('apply_count', { ascending: false, nullsFirst: false })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    // 数据库返回空结果时也降级（数据未导入的情况）
    if (!data || data.length === 0) {
      console.log('[Jobs API] Supabase 返回空，降级到静态数据')
      const jobs = loadStaticJobs()
      return filterAndPaginate(jobs, request)
    }

    return NextResponse.json({
      success: true,
      data,
      total: count || 0,
      page,
      pageSize,
      source: 'supabase',
    })
  } catch (err: any) {
    console.warn('[Jobs API] Supabase 查询失败，降级到静态数据:', err.message)
    const jobs = loadStaticJobs()
    return filterAndPaginate(jobs, request)
  }
}

// POST /api/jobs - 创建职位（需要登录，仅 Supabase 模式）
export async function POST(request: NextRequest) {
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
    .insert({
      consultant_id: user.id,
      title: body.title || '待处理',
      raw_jd: body.raw_jd,
      status: 'draft',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
