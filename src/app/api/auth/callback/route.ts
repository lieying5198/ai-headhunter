// src/app/api/auth/callback/route.ts
// Supabase Auth OAuth 回调

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/consultant/jobs'

  // 使用环境变量获取真实公网域名
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  return NextResponse.redirect(`${appUrl}/auth/login?error=auth_callback_error`)
}
