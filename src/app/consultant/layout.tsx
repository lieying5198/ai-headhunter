// src/app/consultant/layout.tsx
// 顾问后台布局

export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConsultantNav from '@/components/ConsultantNav'

export default async function ConsultantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // 获取顾问信息
  const { data: consultant } = await supabase
    .from('consultants')
    .select('name, email, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <ConsultantNav
        name={consultant?.name || user.email || '顾问'}
        email={consultant?.email || user.email || ''}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
