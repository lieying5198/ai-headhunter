'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [message, setMessage] = useState('')

  // 微信扫码登录状态
  const [showQR, setShowQR] = useState(false)
  const [qrImage, setQrImage] = useState('')
  const [qrToken, setQrToken] = useState('')
  const [qrStatus, setQrStatus] = useState<'idle' | 'loading' | 'scanned' | 'confirmed' | 'expired'>('idle')
  const [qrError, setQrError] = useState('')
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const router = useRouter()
  const supabase = createClient()

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message === 'Invalid login credentials' ? '邮箱或密码错误，请重试' : error.message)
      } else {
        router.push('/consultant/dashboard')
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
        setMessage('注册成功！请检查邮箱完成验证后登录。')
      }
    }

    setLoading(false)
  }

  // 生成微信扫码登录QR码
  const handleWeChatLogin = async () => {
    setShowQR(true)
    setQrStatus('loading')
    setQrError('')

    try {
      const resp = await fetch('/api/auth/qr-generate', { method: 'POST' })
      const data = await resp.json()

      if (resp.ok && data.token) {
        setQrImage(data.qrImageUrl)
        setQrToken(data.token)
        setQrStatus('idle')

        // 开始轮询
        pollRef.current = setInterval(async () => {
          try {
            const statusResp = await fetch(`/api/auth/qr-status?token=${data.token}`)
            const statusData = await statusResp.json()

            if (statusData.status === 'confirmed') {
              setQrStatus('confirmed')
              if (pollRef.current) clearInterval(pollRef.current)
              // 跳转到session创建端点（服务端处理cookie和重定向）
              window.location.href = `/api/auth/qr-session?token=${data.token}`
            } else if (statusData.status === 'expired') {
              setQrStatus('expired')
              setQrError('二维码已过期，请重新生成')
              if (pollRef.current) clearInterval(pollRef.current)
            } else if (statusData.status === 'pending') {
              // 已确认但还需要其他验证
              setQrStatus('scanned')
            }
          } catch {
            // 轮询失败，忽略
          }
        }, 2000)
      } else {
        setQrError(data.error || '生成二维码失败')
        setQrStatus('idle')
      }
    } catch {
      setQrError('网络错误，请重试')
      setQrStatus('idle')
    }
  }

  // 重新生成QR码
  const refreshQR = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    setQrToken('')
    setQrImage('')
    setQrStatus('idle')
    setQrError('')
    handleWeChatLogin()
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌展示区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, #FF6600 0%, #FF3D00 40%, #CC2900 100%)' }}
        />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />
        <div className="relative flex flex-col justify-center px-16 text-white">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">猎英联盟</h1>
                <p className="text-white/70 text-sm mt-0.5">AI猎头平台</p>
              </div>
            </div>
            <p className="text-white/80 text-lg leading-relaxed max-w-md">
              专业的AI驱动猎头服务平台<br />
              助力顾问高效完成人才招聘
            </p>
          </div>
          <div className="flex gap-4 text-white/60 text-sm">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              AI简历解析
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              智能匹配评估
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              悬赏推荐系统
            </span>
          </div>
        </div>
      </div>

      {/* 右侧登录表单 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm animate-fade-in-scale">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, #FF6600, #FF3300)' }}
              >
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">猎英联盟</span>
            </div>
          </div>

          {/* 微信扫码登录入口 */}
          {!showQR ? (
            <div className="card p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                {mode === 'login' ? '顾问登录' : '注册账号'}
              </h2>

              {/* 微信扫码登录按钮 */}
              <button
                onClick={handleWeChatLogin}
                className="w-full mb-5 py-3 flex items-center justify-center gap-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium transition-colors text-sm"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.952-7.062-6.122zm-2.935 2.705c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982z"/>
                </svg>
                微信扫码登录
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">或</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

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
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                {message && (
                  <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      处理中...
                    </span>
                  ) : mode === 'login' ? '登录' : '注册'}
                </button>
              </form>

              <div className="text-center mt-5">
                <button
                  onClick={() => {
                    setMode(mode === 'login' ? 'signup' : 'login')
                    setError('')
                    setMessage('')
                  }}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors"
                >
                  {mode === 'login' ? '没有账号？立即注册' : '已有账号？去登录'}
                </button>
              </div>
            </div>
          ) : (
            /* 微信扫码登录界面 */
            <div className="card p-8 text-center">
              <h2 className="text-xl font-bold text-gray-900 mb-2">微信扫码登录</h2>
              <p className="text-sm text-gray-500 mb-6">
                {qrStatus === 'confirmed'
                  ? '扫码确认成功！'
                  : '请使用微信扫描二维码'}
              </p>

              {/* QR码 */}
              {qrStatus === 'loading' ? (
                <div className="w-56 h-56 mx-auto bg-gray-100 rounded-xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : qrStatus === 'confirmed' ? (
                <div className="w-56 h-56 mx-auto bg-green-50 rounded-xl flex flex-col items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-600 font-medium">已确认</span>
                </div>
              ) : qrStatus === 'expired' ? (
                <div className="w-56 h-56 mx-auto bg-red-50 rounded-xl flex flex-col items-center justify-center mb-4">
                  <svg className="w-16 h-16 text-red-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-500 text-sm">已过期</span>
                </div>
              ) : (
                <div className="w-56 h-56 mx-auto bg-white rounded-xl border-2 border-gray-100 flex items-center justify-center mb-4 overflow-hidden">
                  {qrImage ? (
                    <img src={qrImage} alt="微信扫码登录" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-gray-300">加载中...</span>
                  )}
                </div>
              )}

              {/* 状态提示 */}
              <div className="text-sm mb-4">
                {qrStatus === 'idle' && qrImage && (
                  <span className="text-gray-500">扫码后在手机端输入顾问邮箱确认登录</span>
                )}
                {qrStatus === 'scanned' && (
                  <span className="text-blue-600 flex items-center justify-center gap-1.5">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    等待确认...
                  </span>
                )}
                {qrStatus === 'confirmed' && (
                  <span className="text-green-600">正在跳转...</span>
                )}
              </div>

              {/* 错误提示 */}
              {qrError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 mb-4">
                  {qrError}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="space-y-2">
                {qrStatus === 'expired' && (
                  <button onClick={refreshQR} className="text-sm text-orange-600 hover:text-orange-700 font-medium">
                    重新生成二维码
                  </button>
                )}
                <button
                  onClick={() => {
                    if (pollRef.current) clearInterval(pollRef.current)
                    setShowQR(false)
                    setQrStatus('idle')
                  }}
                  className="block w-full text-sm text-gray-400 hover:text-gray-600"
                >
                  返回邮箱登录
                </button>
              </div>
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-4">
            候选人无需登录，直接
            <Link href="/" className="text-orange-500 hover:text-orange-600 font-medium mx-1 transition-colors">
              浏览职位
            </Link>
            即可
          </p>
        </div>
      </div>
    </div>
  )
}
