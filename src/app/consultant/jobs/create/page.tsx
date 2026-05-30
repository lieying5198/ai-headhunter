'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const CITIES = ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '南京', '苏州', '东莞', '西安', '其他']
const INDUSTRIES = ['互联网/IT', '人工智能', '金融', '半导体', '新能源', '汽车', '生物医药', '消费品', '房地产', '教育', '其他']
const LEVELS = ['初级', '中级', '高级', '专家', '总监', 'VP', 'C-level']
const FUNCTIONS = ['技术研发', '产品', '设计', '运营', '市场', '销售', '财务', 'HR', '法务', '其他']

export default function CreateJobPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    industry: '',
    job_function: '',
    city: '',
    level: '',
    salary_min: '',
    salary_max: '',
    raw_jd: '',
    summary: '',
    requirements: '',
    responsibilities: '',
    education_requirement: '',
    experience_years: '',
    hire_count: '',
    department: '',
    reports_to: '',
    interview_process: '',
    company_name: '',
    company_anonymized_name: '',
    company_industry: '',
    company_scale: '',
    company_stage: '',
  })

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) { setError('请填写职位名称'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          industry: form.industry || null,
          job_function: form.job_function || null,
          city: form.city || null,
          level: form.level || null,
          salary_min: form.salary_min ? Number(form.salary_min) : null,
          salary_max: form.salary_max ? Number(form.salary_max) : null,
          raw_jd: form.raw_jd.trim() || null,
          summary: form.summary.trim() || null,
          requirements: form.requirements.trim() ? form.requirements.split('\n').filter(Boolean) : [],
          responsibilities: form.responsibilities.trim() ? form.responsibilities.split('\n').filter(Boolean) : [],
          education_requirement: form.education_requirement || null,
          experience_years: form.experience_years || null,
          hire_count: form.hire_count ? Number(form.hire_count) : null,
          department: form.department || null,
          reports_to: form.reports_to || null,
          interview_process: form.interview_process || null,
          company_name: form.company_name.trim() || null,
          company_anonymized_name: form.company_anonymized_name.trim() || null,
          company_industry: form.company_industry || null,
          company_scale: form.company_scale || null,
          company_stage: form.company_stage || null,
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setError(result.error || '创建失败')
        return
      }
      router.push('/consultant/jobs')
    } catch (err: any) {
      setError('网络错误: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const field = (label: string, key: string, options?: string[]) => (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {options ? (
        <select
          value={(form as any)[key]}
          onChange={(e) => update(key, e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
        >
          <option value="">请选择</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={(form as any)[key]}
          onChange={(e) => update(key, e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
          placeholder={`请输入${label}`}
        />
      )}
    </label>
  )

  const textarea = (label: string, key: string, rows: number = 3) => (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <textarea
        value={(form as any)[key]}
        onChange={(e) => update(key, e.target.value)}
        rows={rows}
        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
        placeholder={`请输入${label}，多条可用换行分隔`}
      />
    </label>
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">发布新职位</h1>
          <p className="text-sm text-gray-400 mt-1">填写职位信息，保存后可继续编辑和发布</p>
        </div>
        <Link href="/consultant/jobs" className="text-sm text-gray-500 hover:text-gray-700">
          取消
        </Link>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基础信息 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">基础信息</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('职位名称 *', 'title')}
            {field('行业', 'industry', INDUSTRIES)}
            {field('职能', 'job_function', FUNCTIONS)}
            {field('城市', 'city', CITIES)}
            {field('级别', 'level', LEVELS)}
            {field('薪资下限（万/年）', 'salary_min')}
            {field('薪资上限（万/年）', 'salary_max')}
            {field('招聘人数', 'hire_count')}
          </div>
        </div>

        {/* 客户信息 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">客户信息（可选）</h2>
          <p className="text-xs text-gray-400 mb-3">填写真实客户名称仅顾问内部可见，候选人端显示脱敏名称</p>
          <div className="grid grid-cols-2 gap-4">
            {field('真实客户名称', 'company_name')}
            {field('脱敏展示名称', 'company_anonymized_name')}
            {field('客户行业', 'company_industry', INDUSTRIES)}
            {field('客户规模', 'company_scale')}
            {field('发展阶段', 'company_stage')}
          </div>
        </div>

        {/* JD内容 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">JD内容</h2>
          <div className="space-y-4">
            {field('职位摘要', 'summary')}
            {textarea('原始JD（内部可见）', 'raw_jd', 6)}
            {textarea('任职要求（一行一条）', 'requirements', 4)}
            {textarea('岗位职责（一行一条）', 'responsibilities', 4)}
          </div>
        </div>

        {/* 详细要求 */}
        <div className="card p-5">
          <h2 className="font-bold text-gray-900 mb-4">详细要求（可选）</h2>
          <div className="grid grid-cols-2 gap-4">
            {field('学历要求', 'education_requirement')}
            {field('工作年限', 'experience_years')}
            {field('所属部门', 'department')}
            {field('汇报对象', 'reports_to')}
            {field('面试流程', 'interview_process')}
          </div>
        </div>

        {/* 提交 */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                保存为草稿
              </>
            )}
          </button>
          <Link href="/consultant/jobs" className="text-sm text-gray-500">
            取消
          </Link>
        </div>
      </form>
    </div>
  )
}
