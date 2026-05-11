import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const serviceClient = createServiceClient()
    if (!serviceClient) {
      return NextResponse.json({ jobs: null, recentJobs: [] })
    }

    // 职位统计
    const { count: total } = await serviceClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('consultant_id', user.id)

    const { count: published } = await serviceClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('consultant_id', user.id)
      .eq('is_published', true)

    const { count: draft } = await serviceClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('consultant_id', user.id)
      .eq('is_published', false)
      .eq('status', 'draft')

    const { count: closed } = await serviceClient
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('consultant_id', user.id)
      .eq('status', 'closed')

    // 近期职位
    const { data: recentJobs } = await serviceClient
      .from('jobs')
      .select('id, title, city, is_published, status, created_at')
      .eq('consultant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      jobs: {
        total: total || 0,
        published: published || 0,
        draft: draft || 0,
        closed: closed || 0,
      },
      recentJobs: recentJobs || [],
    })
  } catch (error: any) {
    console.error('职位统计失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
