'use client'
// src/components/ConsultantNav.tsx

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

export default function ConsultantNav({
  name,
  email,
}: {
  name: string
  email: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const navItems = [
    { href: '/consultant/jobs', label: '职位管理', icon: '💼' },
    { href: '/consultant/import', label: '导入职位', icon: '📤' },
    { href: '/consultant/candidates', label: '候选人', icon: '👥' },
  ]

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/consultant/jobs" className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                <span className="text-white text-xs font-bold">猎</span>
              </div>
              <span className="font-bold text-gray-900 text-sm">AI猎头平台</span>
            </Link>

            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="text-xs text-gray-500 hover:text-blue-600"
            >
              查看候选人端 →
            </Link>
            <div className="text-right">
              <div className="text-xs font-medium text-gray-900">{name}</div>
              <div className="text-xs text-gray-400">{email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              退出
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
