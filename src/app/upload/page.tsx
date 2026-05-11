'use client'
// src/app/upload/page.tsx
// 精美简历投递页 - 移动端优先

import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="text-gray-400">加载中...</div></div>}>
      <UploadContent />
    </Suspense>
  )
}

function UploadContent() {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId') || ''
  const jobTitle = searchParams.get('jobTitle') || '目标职位'

  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [state, setState] = useState<UploadState>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) setFile(f)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError('请选择简历文件')
    if (!name.trim()) return setError('请填写姓名')
    if (!jobId) return setError('缺少职位信息')

    setState('uploading')
    setError('')
    setProgress(10)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('jobId', jobId)
    formData.append('name', name)
    formData.append('phone', phone)

    const progressTimer = setInterval(() => {
      setProgress(p => Math.min(p + 12, 90))
    }, 600)

    try {
      const res = await fetch('/api/upload/resume', {
        method: 'POST',
        body: formData,
      })
      clearInterval(progressTimer)
      setProgress(100)
      const json = await res.json()
      if (json.success) {
        setResult(json)
        setState('done')
      } else {
        setError(json.error || '上传失败，请重试')
        setState('error')
      }
    } catch (err) {
      clearInterval(progressTimer)
      setError('网络错误，请检查网络后重试')
      setState('error')
    }
  }

  const scoreColor = (grade?: string) => {
    if (grade === 'A') return 'from-green-500 to-emerald-600'
    if (grade === 'B') return 'from-blue-500 to-blue-600'
    if (grade === 'C') return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-rose-600'
  }

  // 成功结果页面
  if (state === 'done' && result?.data?.ai_score) {
    const score = result.data.ai_score
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-md mx-auto px-4 py-10">
          {/* 成功图标 */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-4xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">投递成功</h1>
            <p className="text-gray-500 mt-1">顾问会在24小时内联系你</p>
          </div>

          {/* AI评估卡片 */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <h2 className="text-center text-sm text-gray-500 mb-4">AI 匹配评估</h2>

            {/* 评级大圆圈 */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-bold text-white bg-gradient-to-br ${scoreColor(score.overall_score)} mb-2 shadow-lg`}>
                {score.overall_score}
              </div>
              <p className="text-gray-500 text-sm">综合评分 {score.overall_numeric}分</p>
            </div>

            {/* 评分条 */}
            <div className="space-y-3">
              {[
                { label: '行业匹配', value: score.industry_match, color: 'bg-blue-500' },
                { label: '职级匹配', value: score.level_match, color: 'bg-purple-500' },
                { label: '稳定性', value: score.stability, color: 'bg-green-500' },
                { label: '管理经验', value: score.management_exp, color: 'bg-yellow-500' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-gray-900">{value || 0}分</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: `${value || 0}%` }} />
                  </div>
                </div>
              ))}
            </div>

            {/* AI推荐 */}
            {score.recommendation && (
              <div className="mt-6 p-4 bg-green-50 rounded-2xl">
                <p className="text-sm text-green-800 leading-relaxed">{score.recommendation}</p>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="space-y-3">
            <Link href={`/jobs/${jobId}/chat`} className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-4 rounded-2xl font-semibold shadow-lg">
              💬 有疑问？和AI聊聊
            </Link>
            <Link href="/" className="block w-full bg-white text-gray-700 text-center py-4 rounded-2xl font-medium border border-gray-200">
              浏览更多职位
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 上传表单页面
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部 */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 px-4 pt-8 pb-16">
        <div className="max-w-md mx-auto">
          <Link href={jobId ? `/jobs/${jobId}` : '/'} className="text-white/80 hover:text-white text-sm flex items-center gap-1 mb-4">
            ← 返回
          </Link>
          <h1 className="text-2xl font-bold text-white">投递简历</h1>
          <p className="text-white/80 text-sm mt-1">申请：{jobTitle}</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="max-w-md mx-auto px-4 -mt-8">
        <div className="bg-white rounded-3xl shadow-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 文件上传区 */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                file ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className="hidden" />
              {file ? (
                <div>
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB · 点击更换</p>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-3">📤</div>
                  <p className="font-medium text-gray-700">点击上传简历</p>
                  <p className="text-xs text-gray-400 mt-1">支持 PDF、DOC、DOCX</p>
                </div>
              )}
            </div>

            {/* 姓名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">姓名 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入真实姓名"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                required
              />
            </div>

            {/* 电话 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">手机号（方便联系）</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
              />
            </div>

            {/* 进度条 */}
            {state === 'uploading' && (
              <div className="p-4 bg-blue-50 rounded-2xl">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-blue-700">🤖 AI分析中...</span>
                  <span className="text-blue-600 font-medium">{progress}%</span>
                </div>
                <div className="w-full bg-blue-100 rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-blue-600 mt-2">正在解析简历，请稍候...</p>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                ⚠️ {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={state === 'uploading'}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {state === 'uploading' ? '🤖 分析中...' : '📄 提交简历 · AI评估'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4">
            🔒 您的简历仅用于本次申请，严格保密
          </p>
        </div>

        {/* AI说明 */}
        <div className="mt-6 p-4 bg-purple-50 rounded-2xl">
          <h3 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
            <span>🤖</span> AI初筛说明
          </h3>
          <ul className="text-sm text-purple-800 space-y-1">
            <li>• 上传简历后，AI自动分析匹配度</li>
            <li>• 匹配度高的候选人，顾问优先联系</li>
            <li>• 评估结果仅供内部参考</li>
          </ul>
        </div>
      </div>

      <div className="h-10"></div>
    </div>
  )
}
