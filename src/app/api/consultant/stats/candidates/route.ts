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
      return NextResponse.json({ candidates: null, recentCandidates: [] })
    }

    // 候选人总数
    const { count: total } = await serviceClient
      .from('candidates')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'platform')

    // 按状态统计
    const { data: statusData } = await serviceClient
      .from('candidates')
      .select('status')
      .eq('source', 'platform')

    const byStatus: Record<string, number> = {}
    statusData?.forEach(c => {
      byStatus[c.status] = (byStatus[c.status] || 0) + 1
    })

    // 近期候选人
    const { data: recentCandidates } = await serviceClient
      .from('candidates')
      .select('id, name, current_company, current_title, status, created_at')
      .eq('source', 'platform')
      .order('created_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      candidates: {
        total: total || 0,
        byStatus,
      },
      recentCandidates: recentCandidates || [],
    })
  } catch (error: any) {
    console.error('候选人统计失败:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
