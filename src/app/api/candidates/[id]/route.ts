// src/app/api/candidates/[id]/route.ts
// 更新候选人状态

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
    .from('candidates')
    .update({
      status: body.status,
      notes: body.notes,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
