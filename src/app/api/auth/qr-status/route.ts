// GET /api/auth/qr-status?token=xxx
// 轮询扫码登录状态

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: '缺少token参数' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase未配置' }, { status: 500 })
    }

    const { data, error } = await supabase
      .from('auth_qr_tokens')
      .select('status, session_data, expires_at')
      .eq('token', token)
      .single()

    if (error) {
      return NextResponse.json({ status: 'expired', message: 'Token已过期或不存在' })
    }

    if (!data) {
      return NextResponse.json({ status: 'expired', message: 'Token不存在' })
    }

    if (new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ status: 'expired', message: '二维码已过期' })
    }

    if (data.status === 'confirmed') {
      return NextResponse.json({
        status: 'confirmed',
        session: data.session_data,
      })
    }

    return NextResponse.json({ status: data.status })
  } catch (err) {
    console.error('QR status error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
