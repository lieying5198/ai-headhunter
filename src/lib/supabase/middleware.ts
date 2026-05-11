// src/lib/supabase/middleware.ts
// Next.js middleware 中刷新 session
// 如果未配置 Supabase，跳过认证逻辑（用于本地开发）

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // 检查是否配置了 Supabase
  const hasSupabaseConfig = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://your-project.supabase.co' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your-anon-key'
  )

  // 如果没有配置 Supabase，跳过认证逻辑
  if (!hasSupabaseConfig) {
    return supabaseResponse
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // 刷新 session
    const { data: { user } } = await supabase.auth.getUser()

    // 保护顾问路由
    if (
      !user &&
      (request.nextUrl.pathname.startsWith('/consultant') ||
        request.nextUrl.pathname.startsWith('/admin'))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
  } catch (e) {
    console.error('Supabase middleware error:', e)
    // Supabase 出错时继续放行，不阻断请求
  }

  return supabaseResponse
}
