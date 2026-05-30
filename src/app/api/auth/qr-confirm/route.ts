// GET/POST /api/auth/qr-confirm
// GET: 显示确认页面（WeChat浏览器打开）
// POST: 提交邮箱确认登录

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('无效的登录链接', { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    if (!supabase) {
      return new NextResponse('系统配置错误', { status: 500 })
    }

    // 检查token有效性
    const { data, error } = await supabase
      .from('auth_qr_tokens')
      .select('status, expires_at')
      .eq('token', token)
      .single()

    if (error || !data) {
      return new NextResponse(
        '<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f5f5"><div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1)"><h2 style="color:#e53e3e">二维码已失效</h2><p style="color:#666">请返回重新扫码</p></div></body></html>',
        { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    if (new Date(data.expires_at) < new Date() || data.status !== 'pending') {
      return new NextResponse(
        '<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f5f5"><div style="text-align:center;background:white;padding:40px;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1)"><h2 style="color:#e53e3e">二维码已过期</h2><p style="color:#666">请返回重新扫码</p></div></body></html>',
        { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    // Token有效，显示确认页面
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>猎英盟 · 扫码登录</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:linear-gradient(160deg,#FF6600 0%,#FF3D00 40%,#CC2900 100%);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:white;border-radius:20px;padding:32px 24px;width:100%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.15);text-align:center}
.logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#FF6600,#FF3300);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px}
.logo svg{width:28px;height:28px;fill:white}
h2{font-size:22px;color:#1a1a1a;margin-bottom:8px}
.sub{color:#888;font-size:14px;margin-bottom:28px}
.input-group{text-align:left;margin-bottom:20px}
.input-group label{display:block;font-size:13px;color:#555;margin-bottom:6px;font-weight:500}
.input-group input{width:100%;padding:12px 16px;border:2px solid #e5e7eb;border-radius:12px;font-size:16px;transition:border-color .2s;outline:none}
.input-group input:focus{border-color:#FF6600}
.input-group input::placeholder{color:#bbb}
.btn{width:100%;padding:14px;background:linear-gradient(135deg,#FF6600,#FF3300);color:white;border:none;border-radius:12px;font-size:17px;font-weight:600;cursor:pointer;transition:transform .1s,box-shadow .2s}
.btn:active{transform:scale(0.98)}
.btn:disabled{opacity:0.6;cursor:not-allowed}
.error{color:#e53e3e;font-size:13px;margin-top:10px;display:none}
.success{color:#38a169;font-size:14px;line-height:1.6;display:none}
.success svg{display:inline-block;width:48px;height:48px;margin-bottom:12px}
.footer{margin-top:20px;font-size:12px;color:#aaa}
.footer a{color:#FF6600;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo">
    <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
  </div>
  <h2>猎英联盟</h2>
  <p class="sub">确认登录 · 顾问端</p>
  <form id="form">
    <div class="input-group">
      <label>顾问邮箱</label>
      <input type="email" id="email" placeholder="your@email.com" required autocomplete="email">
    </div>
    <button type="submit" class="btn" id="btn">确认登录</button>
  </form>
  <div class="error" id="error"></div>
  <div class="success" id="success">
    <svg viewBox="0 0 24 24" fill="none" stroke="#38a169" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    <p>登录确认成功！</p>
    <p style="font-size:13px;color:#888">请返回电脑端页面</p>
  </div>
  <p class="footer">猎英盟 &copy; 2026 · AI猎头平台</p>
</div>
<script>
const form = document.getElementById('form')
const btn = document.getElementById('btn')
const errorEl = document.getElementById('error')
const successEl = document.getElementById('success')
const token = '${token}'

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const email = document.getElementById('email').value.trim()
  if (!email) return

  btn.disabled = true
  btn.textContent = '验证中...'
  errorEl.style.display = 'none'

  try {
    const resp = await fetch('/api/auth/qr-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, email }),
    })
    const result = await resp.json()
    if (resp.ok && result.success) {
      form.style.display = 'none'
      successEl.style.display = 'block'
      document.querySelector('.sub').textContent = '已确认 · ' + email
    } else {
      errorEl.textContent = result.error || '验证失败，请重试'
      errorEl.style.display = 'block'
      btn.disabled = false
      btn.textContent = '确认登录'
    }
  } catch (err) {
    errorEl.textContent = '网络错误，请重试'
    errorEl.style.display = 'block'
    btn.disabled = false
    btn.textContent = '确认登录'
  }
})
</script>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch (err) {
    console.error('QR confirm GET error:', err)
    return new NextResponse('服务器错误', { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json()

    if (!token || !email) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    const supabase = createServiceClient()
    if (!supabase) {
      return NextResponse.json({ error: '系统配置错误' }, { status: 500 })
    }

    // 1. 验证token
    const { data: tokenData, error: tokenError } = await supabase
      .from('auth_qr_tokens')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: '二维码已失效或已使用' }, { status: 400 })
    }

    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json({ error: '二维码已过期' }, { status: 400 })
    }

    // 2. 查找顾问（先在consultants表确认邮箱合法）
    const { data: consultant, error: consultantError } = await supabase
      .from('consultants')
      .select('id, email, name')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (consultantError || !consultant) {
      return NextResponse.json({ error: '该邮箱未注册为顾问，请联系管理员' }, { status: 404 })
    }

    // 3. 获取 auth.users.id（qr-session 需要用这个来 getUserById）
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authUser = users?.find((u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase().trim())

    if (listError || !authUser) {
      return NextResponse.json({ error: '该邮箱尚未创建登录账号，请先通过邮箱密码登录一次激活账号' }, { status: 404 })
    }

    // 4. 生成 magic link 并获取真实 session token
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    let accessToken: string | null = null
    let refreshToken: string | null = null
    let expiresAt: number | null = null

    console.log('[QR-Confirm] Starting magic link generation for:', email)

    try {
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: authUser.email!,
        options: {
          redirectTo: `${appUrl}/api/auth/callback?next=/consultant/dashboard`,
        },
      })

      console.log('[QR-Confirm] generateLink result:', linkError ? 'ERROR: ' + linkError.message : 'SUCCESS')

      if (!linkError && linkData) {
        console.log('[QR-Confirm] Link data available, action_link:', linkData.properties?.action_link?.substring(0, 60) + '...')
        // 解析 magic link 中的 token_hash
        const magicUrl = new URL(linkData.properties.action_link)
        const tokenHash = magicUrl.searchParams.get('token_hash')
        const type = magicUrl.searchParams.get('type') || 'magiclink'

        console.log('[QR-Confirm] Extracted token_hash:', tokenHash ? 'YES (len=' + tokenHash.length + ')' : 'NO')

        if (tokenHash) {
          // 调用 Supabase verify 端点换取真实 session
          const verifyUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/verify`
          console.log('[QR-Confirm] Calling verify endpoint...')

          const verifyResp = await fetch(verifyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            },
            body: JSON.stringify({
              type,
              token_hash: tokenHash,
            }),
          })

          console.log('[QR-Confirm] Verify response status:', verifyResp.status)

          if (verifyResp.ok) {
            const verifyData = await verifyResp.json()
            accessToken = verifyData.access_token || null
            refreshToken = verifyData.refresh_token || null
            expiresAt = verifyData.expires_in
              ? Math.floor(Date.now() / 1000) + verifyData.expires_in
              : null
            console.log('[QR-Confirm] Session tokens obtained:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken })
          } else {
            const verifyErrText = await verifyResp.text()
            console.error('[QR-Confirm] Verify failed:', verifyResp.status, verifyErrText.substring(0, 200))
          }
        }
      }
    } catch (magicErr) {
      console.error('[QR-Confirm] Magic link generation failed:', magicErr)
      // 即使 magic link 失败，仍然标记 confirmed（用户仍可用邮箱密码登录）
    }

    // 5. 标记token为已确认，附上 session token（供前端 setSession 使用）
    const sessionDataToStore = {
      user_id: authUser.id,
      email: consultant.email,
      name: consultant.name,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
    }
    console.log('[QR-Confirm] Storing session_data:', { ...sessionDataToStore, access_token: accessToken ? '***' : null, refresh_token: refreshToken ? '***' : null })

    const { error: updateError } = await supabase
      .from('auth_qr_tokens')
      .update({
        status: 'confirmed',
        user_id: authUser.id,
        confirmed_at: new Date().toISOString(),
        session_data: sessionDataToStore,
      })
      .eq('token', token)

    if (updateError) {
      console.error('[QR-Confirm] Token update error:', updateError)
      return NextResponse.json({ error: '确认失败，请重试' }, { status: 500 })
    }

    console.log('[QR-Confirm] Success, returning to client')
    return NextResponse.json({
      success: true,
      name: consultant.name,
    })
  } catch (err) {
    console.error('QR confirm POST error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
