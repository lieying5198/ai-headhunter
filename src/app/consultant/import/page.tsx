'use client'
// src/app/consultant/import/page.tsx
// 职位导入工作台（文件上传 + 手动输入 + AI处理）

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type ImportMode = 'file' | 'manual'
type Step = 'input' | 'processing' | 'review' | 'done'

export default function ImportPage() {
  const [mode, setMode] = useState<ImportMode>('manual')
  const [step, setStep] = useState<Step>('input')
  const [file, setFile] = useState<File | null>(null)
  const [manualText, setManualText] = useState('')
  const [jobId, setJobId] = useState('')
  const [parsed, setParsed] = useState<any>(null)
  const [anonymizedJD, setAnonymizedJD] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Step 1: 创建职位草稿
  const createDraft = async () => {
    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_jd: '' }),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
    return json.data.id
  }

  // Step 2: 提交解析
  const handleProcess = async () => {
    setLoading(true)
    setError('')

    try {
      // 创建草稿职位
      const newJobId = await createDraft()
      setJobId(newJobId)

      let res: Response
      setStep('processing')

      if (mode === 'file' && file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('jobId', newJobId)

        res = await fetch('/api/ai/parse-jd', {
          method: 'POST',
          body: formData,
        })
      } else {
        res = await fetch('/api/ai/parse-jd', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: manualText, jobId: newJobId }),
        })
      }

      const json = await res.json()

      if (!json.success) {
        throw new Error(json.error || 'AI处理失败')
      }

      setParsed(json.data.parsed)
      setAnonymizedJD(json.data.anonymized_jd)
      setStep('review')
    } catch (err: any) {
      setError(err.message || '处理失败，请重试')
      setStep('input')
    } finally {
      setLoading(false)
    }
  }

  // Step 3: 确认发布
  const handlePublish = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'published',
          is_published: true,
          anonymized_jd: anonymizedJD,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setStep('done')
      }
    } catch (err) {
      setError('发布失败')
    } finally {
      setLoading(false)
    }
  }

  // 保存草稿（不发布）
  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'processing' }),
      })
      router.push('/consultant/jobs')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">职位已发布！</h2>
        <p className="text-gray-500 mb-8">候选人现在可以在职位列表中看到这个职位</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push('/consultant/jobs')}
            className="btn-secondary"
          >
            查看职位列表
          </button>
          <button
            onClick={() => {
              setStep('input')
              setFile(null)
              setManualText('')
              setParsed(null)
              setAnonymizedJD('')
              setJobId('')
            }}
            className="btn-primary"
          >
            继续导入
          </button>
        </div>
      </div>
    )
  }

  if (step === 'processing') {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-5xl mb-6 animate-bounce">🤖</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">AI正在处理...</h2>
        <p className="text-gray-500">正在解析JD、提取结构化信息、进行脱敏处理</p>
        <div className="mt-6 flex justify-center gap-1">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (step === 'review' && parsed) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setStep('input')} className="text-sm text-gray-500 hover:text-gray-700">
            ← 重新上传
          </button>
          <h1 className="text-xl font-bold text-gray-900">AI处理结果 - 审核确认</h1>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* 结构化信息 */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">📋 解析结果</h2>
            <div className="space-y-3 text-sm">
              <InfoRow label="职位标题" value={parsed.title} />
              <InfoRow label="行业" value={parsed.industry} />
              <InfoRow label="职能" value={parsed.job_function} />
              <InfoRow label="城市" value={parsed.city} />
              <InfoRow label="薪资范围" value={parsed.salary_min && parsed.salary_max ? `${parsed.salary_min}-${parsed.salary_max}万/年` : '未识别'} />
              <InfoRow label="职级" value={parsed.level} />
              <InfoRow label="客户公司" value={parsed.company_name || '未识别（已安全处理）'} />

              {parsed.tags && parsed.tags.length > 0 && (
                <div>
                  <span className="text-gray-500">标签：</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {parsed.tags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {parsed.summary && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">AI生成摘要</p>
                  <p className="text-gray-700">{parsed.summary}</p>
                </div>
              )}
            </div>
          </div>

          {/* 脱敏JD */}
          <div className="card p-6">
            <h2 className="font-semibold text-gray-900 mb-4">🔒 脱敏后的JD（公开内容）</h2>
            <textarea
              value={anonymizedJD}
              onChange={(e) => setAnonymizedJD(e.target.value)}
              className="w-full h-80 text-sm border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="脱敏后的JD内容..."
            />
            <p className="text-xs text-gray-400 mt-1">可以手动编辑脱敏内容后再发布</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="btn-secondary"
          >
            保存草稿
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="btn-primary px-8"
          >
            {loading ? '发布中...' : '✓ 确认发布'}
          </button>
        </div>
      </div>
    )
  }

  // Step 1: 输入
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">导入职位</h1>
      <p className="text-gray-500 mb-6">上传文件或手动输入JD，AI自动完成解析、脱敏和优化</p>

      {/* 模式切换 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setMode('file')}
          className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            mode === 'file'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          📁 上传文件
          <div className="text-xs font-normal mt-0.5 opacity-70">Excel · Word · PDF</div>
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`flex-1 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
            mode === 'manual'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          ✏️ 手动输入
          <div className="text-xs font-normal mt-0.5 opacity-70">直接粘贴JD文本</div>
        </button>
      </div>

      <div className="card p-6">
        {mode === 'file' ? (
          <div>
            <label className="label">选择文件</label>
            <div
              onClick={() => document.getElementById('jd-file')?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <input
                id="jd-file"
                type="file"
                accept=".pdf,.doc,.docx,.xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-2">📄</div>
                  <p className="font-medium text-gray-900">{file.name}</p>
                  <p className="text-sm text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-3">📁</div>
                  <p className="font-medium text-gray-700">点击选择文件</p>
                  <p className="text-sm text-gray-400 mt-1">支持 Excel / Word / PDF</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <label className="label">粘贴JD内容</label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="将职位描述、任职要求等内容粘贴到这里...

支持格式：
- 直接从JD文件复制粘贴
- 邮件内容
- 网页内容

AI会自动提取和整理信息。"
              className="input h-56 resize-none leading-relaxed"
            />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        <button
          onClick={handleProcess}
          disabled={loading || (mode === 'file' ? !file : !manualText.trim())}
          className="w-full btn-primary py-3 mt-5 text-base disabled:opacity-50"
        >
          🤖 AI解析并处理
        </button>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-lg mb-1">🔍</div>
            结构化提取
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-lg mb-1">🔒</div>
            自动脱敏
          </div>
          <div className="p-2 bg-gray-50 rounded">
            <div className="text-lg mb-1">✨</div>
            AI优化文案
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-20 flex-shrink-0">{label}：</span>
      <span className="text-gray-900">{value}</span>
    </div>
  )
}
