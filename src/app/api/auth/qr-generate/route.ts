// POST /api/auth/qr-generate
// 生成扫码登录Token和QR码

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import QRCode from 'qrcode'

export async function POST() {
  try {
    const token = crypto.randomUUID().replace(/-/g, '')
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5分钟过期

    // 直接通过REST API写入Supabase（使用service key）
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Supabase未配置' }, { status: 500 })
    }

    const res = await fetch(`${supabaseUrl}/rest/v1/auth_qr_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        token,
        status: 'pending',
        expires_at: expiresAt,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('QR token insert error:', errText)
      return NextResponse.json({ error: '创建登录Token失败' }, { status: 500 })
    }

    const qrUrl = `${origin}/api/auth/qr-confirm?token=${token}`
    // 本地生成QR码SVG（不依赖第三方API）
    const qrImageUrl = await QRCode.toDataURL(qrUrl, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

    return NextResponse.json({
      token,
      qrUrl,
      qrImageUrl,
      expiresAt,
    })
  } catch (err) {
    console.error('QR generate error:', err)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
