// src/lib/supabase/server.ts
// 服务端组件 & API Routes 使用

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key',
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component 中设置 cookie 会报错，忽略即可
          }
        },
      },
    }
  )
}

// Service Role 客户端（绕过 RLS，仅在服务端使用）
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  // 未配置 Supabase 时返回 null，避免报错
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl === 'placeholder') {
    console.warn('Supabase 未配置，跳过 Service Client 创建')
    return null
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
