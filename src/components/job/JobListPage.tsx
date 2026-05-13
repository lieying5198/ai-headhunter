'use client'
// src/components/job/JobListPage.tsx
// 职位列表页（候选人端）- 高颜值版
// 数据源：/data/jobs.json（本地 JSON 文件，无需 Supabase）

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'

interface Job {
  id: string
  job_number?: string
  title: string
  status: string
  is_published: boolean
  tags: string[]
  view_count: number
  apply_count: number
  summary: string
  salary_min?: number
  salary_max?: number
  city?: string
  level?: string
  company_name_temp?: string
  consultant_wechat?: string
}

const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布', icon: '🆕' },
  { value: 'salary_high', label: '薪资最高', icon: '💰' },
  { value: 'hot', label: '最热职位', icon: '🔥' },
]

export default function JobListPage() {
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [filters, setFilters] = useState({
    city: '',
    q: '',
    sort: 'latest',
  })
  const [showBountyModal, setShowBountyModal] = useState(false)
  const [bountyJob, setBountyJob] = useState<Job | null>(null)

  const copyWeChat = (wechat: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(wechat).then(() => {
        alert('微信号已复制，快去微信添加好友吧！')
      }).catch(() => {
        prompt('微信号：', wechat)
      })
    }
  }

  // 从 JSON 文件加载所有职位
  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/jobs')
      const json = await res.json()
      setAllJobs(json.success ? json.data : [])
    } catch (e) {
      console.error('加载职位数据失败:', e)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadJobs()
  }, [loadJobs])

  // 提取城市列表（从实际数据）
  const cityList = useMemo(() => {
    const set = new Set<string>()
    allJobs.forEach(j => {
      if (j.city && j.city !== 'nan' && j.city !== 'NaN' && j.city !== '不限') set.add(j.city!)
    })
    return ['全部', ...Array.from(set).sort()]
  }, [allJobs])

  // 筛选 + 排序
  const filteredJobs = useMemo(() => {
    let result = [...allJobs]

    if (filters.city && filters.city !== '全部') {
      result = result.filter(j => j.city === filters.city)
    }
    if (filters.q) {
      const q = filters.q.toLowerCase()
      result = result.filter(j =>
        j.title.toLowerCase().includes(q) ||
        (j.summary && j.summary.toLowerCase().includes(q)) ||
        (j.company_name_temp && j.company_name_temp.toLowerCase().includes(q))
      )
    }

    // 排序
    if (filters.sort === 'salary_high') {
      result.sort((a, b) => (b.salary_max || b.salary_min || 0) - (a.salary_max || a.salary_min || 0))
    } else if (filters.sort === 'hot') {
      result.sort((a, b) => (b.apply_count || 0) - (a.apply_count || 0))
    }

    return result
  }, [allJobs, filters])

  const totalPages = Math.ceil(filteredJobs.length / pageSize)
  const pagedJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize)

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleReferral = (job: Job) => {
    setBountyJob(job)
    setShowBountyModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30">
      {/* 顶部导航 */}
      <header className="bg-white/70 backdrop-blur-xl sticky top-0 z-50 border-b border-white/50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <span className="text-white font-bold text-lg">猎</span>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">猎英联盟</span>
          </Link>
          <Link
            href="/auth/login"
            className="text-sm text-gray-500 hover:text-blue-600 transition-colors font-medium"
          >
            顾问入口 →
          </Link>
        </div>
      </header>

      {/* Hero 搜索区 */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 opacity-95" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'0.05\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 text-center">
            发现你的下一个职业机会
          </h1>
            <p className="text-blue-100 text-center mb-8 text-sm md:text-base">
              精选 {allJobs.length} 个高薪职位 · 一键投递 · 悬赏推荐
            </p>

          {/* 搜索框 */}
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
              <div className="relative flex items-center bg-white rounded-2xl shadow-2xl overflow-hidden">
                <svg className="absolute left-5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索职位、关键词..."
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                  className="w-full pl-14 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-base"
                />
                <button className="px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shrink-0">
                  搜索
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选 + 列表区 */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 筛选标签 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-12 shrink-0">城市</span>
            {cityList.map((city, i) => (
              <button
                key={city}
                onClick={() => handleFilterChange('city', city === '全部' ? '' : city)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  (city === '全部' && !filters.city) || filters.city === city
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25 scale-105'
                    : 'bg-white text-gray-600 hover:bg-gray-100 hover:scale-105'
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>

        {/* 排序 + 计数 */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            找到 <span className="font-bold text-gray-900">{filteredJobs.length}</span> 个职位
          </p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFilterChange('sort', opt.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  filters.sort === opt.value
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 职位列表 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 animate-pulse shadow-sm">
                <div className="flex justify-between mb-4">
                  <div className="flex-1">
                    <div className="h-5 bg-gray-200 rounded-lg w-48 mb-3" />
                    <div className="h-4 bg-gray-100 rounded-lg w-32" />
                  </div>
                  <div className="h-6 bg-gray-200 rounded-full w-20" />
                </div>
                <div className="h-10 bg-gray-50 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : pagedJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">暂无符合条件的职位</p>
            <p className="text-sm text-gray-400 mt-1">试试调整筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pagedJobs.map((job) => (
              <JobCard key={job.id} job={job} onReferral={handleReferral} />
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
            >
              ← 上一页
            </button>
            <span className="px-5 py-2.5 text-sm text-gray-500 font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:border-gray-300 transition-all font-medium"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>

      {/* 悬赏推荐 Modal */}
      {showBountyModal && bountyJob && (
        <BountyModal
          job={bountyJob}
          onClose={() => setShowBountyModal(false)}
          onCopyWeChat={(wechat) => copyWeChat(wechat)}
        />
      )}

      {/* 页脚 */}
      <footer className="bg-white/50 backdrop-blur border-t border-gray-100 mt-16 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-400 mb-2">猎英联盟 · 专业猎头服务 · 用心成就每一份职业梦想</p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            粤ICP备2022099477号-1
          </a>
        </div>
      </footer>
    </div>
  )
}

// ==========================================
// BountyModal 组件 - 悬赏推荐标准 + 顾问微信
// ==========================================

function BountyModal({ job, onClose, onCopyWeChat }: {
  job: Job
  onClose: () => void
  onCopyWeChat: (wechat: string) => void
}) {
  const wechat = job.consultant_wechat || ''
  const handleCopy = () => {
    if (wechat) onCopyWeChat(wechat)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      {/* Modal 主体 */}
      <div className="relative bg-white rounded-3xl p-6 max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto shadow-2xl">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-all"
        >
          ✕
        </button>

        {/* 标题 */}
        <h2 className="text-xl font-bold text-gray-900 mb-1">🏆 悬赏推荐</h2>
        <p className="text-sm text-gray-500 mb-6">推荐人才拿奖金，三种合作方式任你选！</p>

        {/* 职位信息 */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-6">
          <p className="font-semibold text-gray-900">{job.title}</p>
          <p className="text-sm text-gray-600 mt-1">
            💰 {formatSalary(job.salary_min, job.salary_max)} · 📍 {job.city || '不限'}
          </p>
        </div>

        {/* 悬赏标准 */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-800 text-sm">🎯 悬赏标准</h3>

          {/* 标准1 */}
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
              <div className="flex-1">
                <p className="font-semibold text-green-800 text-sm">提供人才线索</p>
                <p className="text-xs text-green-700 mt-1">
                  提供人才线索、电话、微信等联系方式
                </p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  过保回款的 <span className="text-xl">5%</span>
                </p>
              </div>
            </div>
          </div>

          {/* 标准2 */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
              <div className="flex-1">
                <p className="font-semibold text-blue-800 text-sm">初步沟通 + 提供简历</p>
                <p className="text-xs text-blue-700 mt-1">
                  初步沟通过人选意向，提供简历及联系方式
                </p>
                <p className="text-lg font-bold text-blue-600 mt-2">
                  过保回款的 <span className="text-xl">10%</span>
                </p>
              </div>
            </div>
          </div>

          {/* 标准3 */}
          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
              <div className="flex-1">
                <p className="font-semibold text-purple-800 text-sm">兼职顾问全程跟进</p>
                <p className="text-xs text-purple-700 mt-1">
                  完成推荐报告，人选全流程跟进
                </p>
                <p className="text-lg font-bold text-purple-600 mt-2">
                  过保回款的 <span className="text-xl">至少50%</span>
                </p>
                <p className="text-xs text-purple-500 mt-1">📝 具体可以和公司详谈签约，以详谈约定的合约为准</p>
              </div>
            </div>
          </div>
        </div>

        {/* 顾问微信联系 */}
        {wechat && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="font-semibold text-amber-800 text-sm mb-3">💬 联系顾问（微信）</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-amber-200">
                <span className="font-mono text-lg font-bold text-amber-900">{wechat}</span>
              </div>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl text-sm font-semibold shadow-lg shadow-green-500/25 transition-all"
              >
                📋 复制微信号
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2">复制后打开微信添加好友，备注"悬赏推荐+职位名"</p>
          </div>
        )}

        {/* 底部按钮 */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-semibold transition-all"
          >
            知道了
          </button>
          {wechat && (
            <button
              onClick={handleCopy}
              className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 transition-all"
            >
              💬 复制顾问微信
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ==========================================
// JobCard 组件 - 高颜值卡片
// ==========================================

function JobCard({ job, onReferral }: { job: Job; onReferral: (job: Job) => void }) {
  const tags = Array.isArray(job.tags) ? job.tags.slice(0, 3) : []

  return (
    <div className="group bg-white rounded-3xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-1">
      {/* 顶部：职位名 + 薪资 */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <Link href={`/jobs/${job.id}`} className="flex items-start gap-2">
            {job.job_number && (
              <span className="inline-block px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded font-mono shrink-0 mt-0.5 border border-blue-100">
                {job.job_number}
              </span>
            )}
            <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors cursor-pointer text-base leading-snug">
              {job.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            {job.city && job.city !== 'nan' && (
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {job.city}
              </span>
            )}
            {job.level && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{job.level}</span>
              </>
            )}
            {job.company_name_temp && job.company_name_temp !== 'nan' && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-xs text-gray-400">{job.company_name_temp}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
            {formatSalary(job.salary_min, job.salary_max)}
          </div>
        </div>
      </div>

      {/* 标签 */}
      {tags.length > 0 && (
        <div className="flex gap-1.5 mb-4">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500 border border-gray-100"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-4 border-t border-gray-50">
        <Link
          href={`/jobs/${job.id}/chat`}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 rounded-2xl text-sm font-semibold hover:from-blue-100 hover:to-purple-100 transition-all hover:shadow-md hover:shadow-blue-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          AI 咨询
        </Link>
        <button
          onClick={() => onReferral(job)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-600 rounded-2xl text-sm font-semibold hover:from-amber-100 hover:to-orange-100 transition-all hover:shadow-md hover:shadow-amber-500/20"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          悬赏推荐
        </button>
      </div>
    </div>
  )
}

function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return '薪资面议'
  if (min && max) return `${min}-${max}万/年`
  if (min) return `${min}万+/年`
  if (max) return `最高${max}万/年`
  return '薪资面议'
}
