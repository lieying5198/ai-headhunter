'use client'
// src/app/auth/login/page.tsx
// Supabase 邮箱登录

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? '邮箱或密码错误' : error.message)
      } else {
        router.push('/consultant/jobs')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}/api/auth/callback`,
        },
      })
      if (error) {
        setError(error.message)
      } else {
        setMessage('注册成功！请检查邮箱并完成验证后登录。')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">猎</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AI猎头平台</span>
          </div>
          <p className="text-gray-500 text-sm">顾问专属登录入口</p>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-bold text-gray-900 mb-6 text-center">
            {mode === 'login' ? '顾问登录' : '注册账号'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">邮箱地址</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="input"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位字符"
                className="input"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                ✅ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 text-base disabled:opacity-50"
            >
              {loading ? '处理中...' : mode === 'login' ? '登录' : '注册'}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login')
                setError('')
                setMessage('')
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          候选人无需登录，直接
          <a href="/" className="text-blue-500 hover:underline mx-1">浏览职位</a>
          即可
        </p>
      </div>
    </div>
  )
}
