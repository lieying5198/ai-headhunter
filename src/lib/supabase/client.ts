// src/lib/supabase/client.ts
// 客户端组件使用（浏览器端）

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
  return createBrowserClient(supabaseUrl, supabaseKey)
}
