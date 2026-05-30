// src/app/admin/layout.tsx
export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: consultant } = await supabase
    .from('consultants')
    .select('role')
    .eq('id', user.id)
    .single()

  if (consultant?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">无访问权限</h2>
          <p className="text-sm text-gray-500 mb-4">需要管理员权限才能访问此页面</p>
          <Link href="/consultant/dashboard" className="btn-primary text-sm">
            返回后台
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="font-bold text-gray-900">猎英盟管理</Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link href="/admin" className="px-3 py-1.5 rounded-lg text-gray-600 hover:bg-gray-100">总览</Link>
              <Link href="/consultant/dashboard" className="px-3 py-1.5 rounded-lg text-gray-500 hover:bg-gray-100">返回后台</Link>
            </nav>
          </div>
          <span className="text-xs text-gray-400">管理员</span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  )
}
