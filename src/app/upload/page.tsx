'use client'
// src/app/upload/page.tsx
// 猎英盟 · 简历投递页 - 移动端优先

import { useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    }>
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

  const scoreColorGrade = (grade?: string) => {
    if (grade === 'A') return { bg: 'bg-green-500', gradient: 'from-green-400 to-emerald-500' }
    if (grade === 'B') return { bg: 'bg-blue-500', gradient: 'from-blue-400 to-blue-500' }
    if (grade === 'C') return { bg: 'bg-amber-500', gradient: 'from-amber-400 to-orange-500' }
    return { bg: 'bg-red-500', gradient: 'from-red-400 to-rose-500' }
  }

  // 成功结果页
  if (state === 'done' && result?.data?.ai_score) {
    const score = result.data.ai_score
    const colors = scoreColorGrade(score.overall_score)

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-md mx-auto px-4 py-10">
          {/* 成功标识 */}
          <div className="text-center mb-8 animate-fade-in-scale">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/20">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">投递成功</h1>
            <p className="text-gray-500 mt-1">顾问会在24小时内联系你</p>
          </div>

          {/* AI评估卡片 */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 animate-fade-in-up">
            <h2 className="text-center text-sm font-medium text-gray-400 mb-4">AI 匹配评估</h2>

            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full text-4xl font-extrabold text-white bg-gradient-to-br ${colors.gradient} mb-2 shadow-lg`}>
                {score.overall_score}
              </div>
              <p className="text-gray-400 text-sm">综合评分 {score.overall_numeric}分</p>
            </div>

            <div className="space-y-3">
              {[
                { label: '行业匹配', value: score.industry_match, color: '#2563EB' },
                { label: '职级匹配', value: score.level_match, color: '#7C3AED' },
                { label: '稳定性', value: score.stability, color: '#16A34A' },
                { label: '管理经验', value: score.management_exp, color: '#D97706' },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold text-gray-900">{value || 0}分</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${value || 0}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {score.recommendation && (
              <div className="mt-5 p-4 bg-green-50 rounded-2xl border border-green-100">
                <p className="text-sm text-green-800 leading-relaxed">{score.recommendation}</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Link
              href={`/jobs/${jobId}/chat`}
              className="btn-primary btn-size-lg w-full justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              有疑问？和AI聊聊
            </Link>
            <Link
              href="/"
              className="btn-secondary btn-size-lg w-full justify-center"
            >
              浏览更多职位
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // 上传表单
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部品牌区 */}
      <div
        className="px-4 pt-10 pb-20"
        style={{ background: 'linear-gradient(160deg, #FF6600, #FF3D00)' }}
      >
        <div className="max-w-md mx-auto">
          <Link
            href={jobId ? `/jobs/${jobId}` : '/'}
            className="text-white/70 hover:text-white text-sm flex items-center gap-1 mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </Link>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">投递简历</h1>
          <p className="text-white/70 text-sm mt-2">申请：{jobTitle}</p>
        </div>
      </div>

      {/* 表单卡片 */}
      <div className="max-w-md mx-auto px-4 -mt-12">
        <div className="bg-white rounded-3xl shadow-xl p-6 animate-fade-in-scale">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 文件上传区 */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                file
                  ? 'border-green-300 bg-green-50/50'
                  : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {file ? (
                <div>
                  <svg className="w-10 h-10 mx-auto mb-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="font-semibold text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(0)} KB · 点击更换</p>
                </div>
              ) : (
                <div>
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="font-semibold text-gray-700">点击上传简历</p>
                  <p className="text-xs text-gray-400 mt-1">支持 PDF、DOC、DOCX 格式</p>
                </div>
              )}
            </div>

            {/* 姓名 */}
            <div>
              <label className="label">姓名 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入真实姓名"
                className="input"
                required
              />
            </div>

            {/* 电话 */}
            <div>
              <label className="label">手机号 <span className="text-gray-400 text-xs font-normal">（方便联系）</span></label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="input"
              />
            </div>

            {/* 进度条 */}
            {state === 'uploading' && (
              <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-orange-700 font-medium">AI 分析简历中...</span>
                  <span className="text-orange-600 font-semibold">{progress}%</span>
                </div>
                <div className="w-full bg-orange-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, #FF6600, #FF3300)',
                    }}
                  />
                </div>
                <p className="text-xs text-orange-600 mt-2">正在解析简历，请稍候...</p>
              </div>
            )}

            {/* 错误提示 */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={state === 'uploading'}
              className="btn-primary btn-size-lg w-full justify-center"
            >
              {state === 'uploading' ? (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  分析中...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  提交简历 · AI 评估
                </span>
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4 flex items-center justify-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            您的简历仅用于本次申请，严格保密
          </p>
        </div>

        {/* AI说明 */}
        <div className="mt-5 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            AI 初筛说明
          </h3>
          <ul className="text-sm text-gray-500 space-y-1.5">
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              上传简历后，AI 自动分析匹配度
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              匹配度高的候选人，顾问优先联系
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-4 h-4 mt-0.5 text-orange-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              评估结果仅供内部参考
            </li>
          </ul>
        </div>
      </div>

      <div className="h-10" />
    </div>
  )
}
