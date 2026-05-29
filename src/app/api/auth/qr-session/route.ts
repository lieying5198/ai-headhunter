// GET /api/auth/qr-session?token=xxx
// 扫码确认后，客户端跳转到此URL以创建Supabase Session

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${origin}/auth/login?error=qr_no_token`)
  }

  try {
    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.redirect(`${origin}/auth/login?error=no_supabase`)
    }

    // 1. 验证token
    const { data: tokenData, error: tokenError } = await supabase
      .from('auth_qr_tokens')
      .select('*')
      .eq('token', token)
      .eq('status', 'confirmed')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.redirect(`${origin}/auth/login?error=qr_invalid`)
    }

    if (!tokenData.user_id) {
      return NextResponse.redirect(`${origin}/auth/login?error=qr_no_user`)
    }

    // 2. 用service role获取用户的email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(tokenData.user_id)

    if (userError || !user || !user.email) {
      return NextResponse.redirect(`${origin}/auth/login?error=user_not_found`)
    }

    // 3. 生成一个临时的sign-in link（passwordless magic link方式）
    // Supabase没有直接"以某用户身份登录"的API，但可以用generateLink
    // 更简单的方法：生成一个sign-in magic link并自动follow
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email,
      options: {
        redirectTo: `${origin}/api/auth/callback?next=/consultant/dashboard`,
      },
    })

    if (linkError || !linkData) {
      console.error('Magic link error:', linkError)
      return NextResponse.redirect(`${origin}/auth/login?error=session_failed`)
    }

    // 4. 自动follow magic link来建立session
    const magicUrl = new URL(linkData.properties.action_link)
    const emailOtp = magicUrl.searchParams.get('token')

    if (emailOtp) {
      const verifyResp = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
        body: JSON.stringify({
          type: 'magiclink',
          token: emailOtp,
          email: user.email,
        }),
      })

      if (verifyResp.ok) {
        const verifyData = await verifyResp.json()

        // 5. 设置session cookie并redirect
        const response = NextResponse.redirect(`${origin}/consultant/dashboard`)

        if (verifyData.access_token) {
          // Set Supabase session cookie
          response.cookies.set('sb-kiylvnmxtorqbqlqcssv-auth-token', JSON.stringify({
            access_token: verifyData.access_token,
            refresh_token: verifyData.refresh_token,
            expires_at: Math.floor(Date.now() / 1000) + verifyData.expires_in,
          }), {
            path: '/',
            httpOnly: true,
            secure: origin.startsWith('https'),
            sameSite: 'lax',
            maxAge: verifyData.expires_in,
          })
        }

        // 清理已使用的token
        await supabase.from('auth_qr_tokens').delete().eq('token', token)

        return response
      }
    }

    return NextResponse.redirect(`${origin}/auth/login?error=qr_verify_failed`)
  } catch (err) {
    console.error('QR session error:', err)
    return NextResponse.redirect(`${origin}/auth/login?error=qr_session_error`)
  }
}
