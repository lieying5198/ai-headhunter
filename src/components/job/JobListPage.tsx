'use client'
// src/components/job/JobListPage.tsx
// 猎英盟 · 职位列表页（候选人端） — 品牌化设计

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
  { value: 'latest', label: '最新发布' },
  { value: 'salary_high', label: '薪资最高' },
  { value: 'hot', label: '最热职位' },
]

// 职能分类定义（关键词匹配职位标题）
const FUNCTION_CATEGORIES = [
  {
    value: '',
    label: '全部',
  },
  {
    value: 'hr',
    label: '人力资源类',
    keywords: ['人事', '人力', 'HR', 'HRBP', '招聘', '薪酬', '培训', '人才', '员工关系', 'COE', '人资', '组织发展', 'OD', '绩效', '干部'],
  },
  {
    value: 'finance',
    label: '财务类',
    keywords: ['财务', 'CFO', '会计', '审计', '税务', '资金', '预算', '成本', '投资', '融资', 'FD', '总账', '财控', '内控'],
  },
  {
    value: 'tech',
    label: '技术类',
    keywords: ['技术', 'CTO', '研发', '工程师', '架构', 'IT', '数据', 'AI', '开发', '产品', 'PM', '算法', '运维', '前端', '后端', '全栈', '软件', '硬件', '芯片'],
  },
  {
    value: 'admin',
    label: '董秘总助行政文秘类',
    keywords: ['董秘', '总助', '行政', '文秘', '秘书', '总裁助理', '助理总裁', '行政总监', '行政经理', '总经理助理', '副总助', 'CEO助理', 'COO助理', '执行助理', '办公室主任'],
  },
]

// 薪资档位定义（万/年）
const SALARY_OPTIONS = [
  { value: '', label: '全部待遇' },
  { value: 'under50', label: '50万以下', min: 0, max: 50 },
  { value: '50to100', label: '50-100万', min: 50, max: 100 },
  { value: '100to200', label: '100-200万', min: 100, max: 200 },
  { value: 'above200', label: '200万以上', min: 200, max: Infinity },
]

// 判断职位是否属于某职能类别
function matchesFunction(job: Job, funcValue: string): boolean {
  if (!funcValue) return true
  const category = FUNCTION_CATEGORIES.find(c => c.value === funcValue)
  if (!category || !category.keywords) return false
  const title = (job.title || '').toUpperCase()
  return category.keywords.some(k => title.includes(k.toUpperCase()))
}

// 判断职位薪资是否在某个档位范围
function matchesSalary(job: Job, salaryOption: string): boolean {
  if (!salaryOption) return true
  const opt = SALARY_OPTIONS.find(o => o.value === salaryOption)
  if (!opt || !opt.value) return true

  // 以 salary_max 为主判断（无则用 salary_min）
  const salaryRef = job.salary_max ?? job.salary_min ?? 0

  if (opt.value === 'under50') return salaryRef < 50
  if (opt.value === '50to100') return salaryRef >= 50 && salaryRef <= 100
  if (opt.value === '100to200') return salaryRef >= 100 && salaryRef <= 200
  if (opt.value === 'above200') return salaryRef > 200
  return true
}

export default function JobListPage() {
  const [allJobs, setAllJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 12
  const [filters, setFilters] = useState({
    city: '',
    q: '',
    sort: 'latest',
    func: '',
    salary: '',
  })
  const [showBountyModal, setShowBountyModal] = useState(false)
  const [bountyJob, setBountyJob] = useState<Job | null>(null)

  const copyWeChat = (wechat: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(wechat).then(() => alert('微信号已复制！打开微信添加好友吧'))
        .catch(() => prompt('微信号：', wechat))
    }
  }

  const loadJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.q) params.set('q', filters.q)
      if (filters.city) params.set('city', filters.city)
      params.set('sort', filters.sort)
      params.set('pageSize', '9999')
      const res = await fetch(`/api/jobs?${params.toString()}`)
      const json = await res.json()
      if (json.success) setAllJobs(json.data || [])
    } catch (e) { console.error('加载职位数据失败:', e) }
    setLoading(false)
  }, [filters.q, filters.city, filters.sort])

  useEffect(() => { loadJobs() }, [loadJobs])

  const cityList = useMemo(() => {
    const set = new Set<string>()
    allJobs.forEach(j => {
      let cityValue: string | undefined
      if (typeof j.city === 'string') {
        cityValue = j.city
      } else if (j.city && typeof j.city === 'object') {
        cityValue = (j.city as any).city || (j.city as any).name || String(j.city)
      }
      if (cityValue && cityValue !== 'nan' && cityValue !== 'NaN' && cityValue !== '不限' && cityValue !== '[object Object]') {
        set.add(cityValue)
      }
    })
    return ['全部', ...Array.from(set).sort()]
  }, [allJobs])

  // 前端筛选（职能 + 薪资档位）
  const filteredJobs = useMemo(() => {
    return allJobs.filter(job => {
      if (!matchesFunction(job, filters.func)) return false
      if (!matchesSalary(job, filters.salary)) return false
      return true
    })
  }, [allJobs, filters.func, filters.salary])

  // 客户端分页（服务端已做排序和过滤，前端再做职能+薪资过滤）
  const totalPages = Math.ceil(filteredJobs.length / pageSize)
  const pagedJobs = filteredJobs.slice((page - 1) * pageSize, page * pageSize)

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航 */}
      <header className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow"
              style={{ background: 'linear-gradient(135deg, #FF6600, #FF3300)' }}>
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">猎英联盟</span>
          </Link>
          <Link href="/auth/login" className="text-sm text-gray-400 hover:text-orange-500 transition-colors font-medium">
            顾问入口 &rarr;
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, #FF6600 0%, #FF3D00 50%, #CC2900 100%)' }} />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white/5 blur-3xl" />
        <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-16">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-3 text-center tracking-tight">
            发现你的下一个职业机会
          </h1>
          <p className="text-white/70 text-center mb-8 text-sm md:text-base">
            精选 <span className="font-bold text-white">{allJobs.length}</span> 个高薪职位 &middot; 一键投递 &middot; 悬赏推荐
          </p>
          <div className="max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl shadow-black/10 overflow-hidden focus-within:ring-2 focus-within:ring-orange-400/30 transition-all">
              <svg className="absolute left-5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="搜索职位、关键词..." value={filters.q}
                onChange={(e) => handleFilterChange('q', e.target.value)}
                className="w-full pl-14 pr-4 py-4 text-gray-900 placeholder-gray-400 focus:outline-none text-base" />
              <button className="px-6 py-4 text-white font-semibold shrink-0 transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #FF6600, #FF3300)' }}>
                搜索
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 内容 */}
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* ===== 筛选面板 ===== */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 mb-6 space-y-4">

          {/* 城市筛选 */}
          <div className="flex items-start gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-14 shrink-0 pt-1.5">城市</span>
            <div className="flex flex-wrap gap-2">
              {cityList.map((city) => (
                <button
                  key={city}
                  onClick={() => handleFilterChange('city', city === '全部' ? '' : city)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    (city === '全部' && !filters.city) || filters.city === city
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md shadow-blue-500/25 scale-105'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 border border-gray-200'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-100" />

          {/* 职能筛选 */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-14 shrink-0">职能</span>
            <div className="flex flex-wrap gap-2">
              {FUNCTION_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => handleFilterChange('func', cat.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filters.func === cat.value
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 scale-105'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 border border-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className="border-t border-gray-100" />

          {/* 待遇筛选 */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider w-14 shrink-0">待遇</span>
            <div className="flex flex-wrap gap-2">
              {SALARY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFilterChange('salary', opt.value)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                    filters.salary === opt.value
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 scale-105'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:scale-105 border border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 排序 + 计数 */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-500">
            找到 <span className="font-bold text-gray-900">{filteredJobs.length}</span> 个职位
            {(filters.func || filters.salary || filters.city) && (
              <button
                onClick={() => {
                  setFilters(prev => ({ ...prev, func: '', salary: '', city: '' }))
                  setPage(1)
                }}
                className="ml-3 text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2"
              >
                清除筛选
              </button>
            )}
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
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="skeleton h-5 rounded-lg w-48 mb-3" />
                <div className="skeleton h-4 rounded-lg w-32 mb-4" />
                <div className="flex gap-2">
                  <div className="skeleton h-10 rounded-2xl flex-1" />
                  <div className="skeleton h-10 rounded-2xl flex-1" />
                </div>
              </div>
            ))}
          </div>
        ) : pagedJobs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">暂无符合条件的职位</p>
            <p className="text-sm text-gray-400 mt-1">试试调整筛选条件</p>
            <button
              onClick={() => {
                setFilters(prev => ({ ...prev, func: '', salary: '', city: '' }))
                setPage(1)
              }}
              className="mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl text-sm font-semibold hover:shadow-lg transition-all"
            >
              清除所有筛选
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {pagedJobs.map(job => (
              <JobCard key={job.id} job={job} onReferral={(j) => { setBountyJob(j); setShowBountyModal(true) }} />
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-3 mt-10">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary btn-size-sm disabled:opacity-30">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              上一页
            </button>
            <span className="px-4 py-2 text-sm font-semibold text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}
              className="btn-secondary btn-size-sm disabled:opacity-30">
              下一页
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {showBountyModal && bountyJob && (
        <BountyModal job={bountyJob} onClose={() => setShowBountyModal(false)} onCopyWeChat={copyWeChat} />
      )}
    </div>
  )
}

/* JobCard */
function JobCard({ job, onReferral }: { job: Job; onReferral: (job: Job) => void }) {
  const tags = Array.isArray(job.tags) ? job.tags.slice(0, 3) : []
  return (
    <div className="card-hover group p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <Link href={`/jobs/${job.id}`} className="flex items-start gap-2 group/title">
            {job.job_number && (
              <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-600 text-xs rounded font-mono shrink-0 mt-0.5 border border-orange-100">
                {job.job_number}
              </span>
            )}
            <h3 className="font-bold text-gray-900 group-hover/title:text-orange-600 transition-colors text-base leading-snug">
              {job.title}
            </h3>
          </Link>
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
            {(() => {
              let cityDisplay: string | null = null
              if (typeof job.city === 'string' && job.city !== 'nan' && job.city !== 'NaN') {
                cityDisplay = job.city
              } else if (job.city && typeof job.city === 'object') {
                cityDisplay = (job.city as any).city || (job.city as any).name || null
              }
              return cityDisplay && cityDisplay !== '[object Object]' ? (
                <span className="inline-flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {cityDisplay}
                </span>
              ) : null
            })()}
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
        <div className="text-right shrink-0">
          <div className="text-lg font-extrabold brand-text">{formatSalary(job.salary_min, job.salary_max)}</div>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {tags.map((tag, i) => (
            <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500 border border-gray-100">{tag}</span>
          ))}
        </div>
      )}
      {job.summary && job.summary !== 'nan' && (
        <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">{job.summary}</p>
      )}
      <div className="flex gap-2 pt-4 border-t border-gray-50">
        <Link href={`/jobs/${job.id}/chat`}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-orange-50 text-orange-600 hover:bg-orange-100 hover:shadow-md hover:shadow-orange-500/10 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          AI 咨询
        </Link>
        <button onClick={() => onReferral(job)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 hover:shadow-md hover:shadow-amber-500/10 transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          悬赏推荐
        </button>
      </div>
    </div>
  )
}

/* BountyModal */
function BountyModal({ job, onClose, onCopyWeChat }: { job: Job; onClose: () => void; onCopyWeChat: (wechat: string) => void }) {
  const wechat = job.consultant_wechat || ''
  const handleCopy = () => { if (wechat) onCopyWeChat(wechat) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl animate-fade-in-scale">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
          <h2 className="text-xl font-bold text-gray-900">悬赏推荐</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">推荐人才拿奖金，三种合作方式任你选</p>
        <div className="rounded-2xl p-4 mb-6 border border-gray-100" style={{ background: 'linear-gradient(135deg, #FFF1E6, #FFE8D4)' }}>
          <p className="font-semibold text-gray-900">{job.title}</p>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-3">
            <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599-1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08.402-2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>{formatSalary(job.salary_min, job.salary_max)}</span>
            {job.city && job.city !== 'nan' && <span className="flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>{job.city}</span>}
          </p>
        </div>
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            悬赏标准
          </h3>
          {[
            { num: 1, color: '#16A34A', bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', accent: 'text-green-600', label: '提供人才线索', desc: '提供人才线索、电话、微信等联系方式', fee: '5%' },
            { num: 2, color: '#2563EB', bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', accent: 'text-blue-600', label: '初步沟通 + 提供简历', desc: '初步沟通过人选意向，提供简历及联系方式', fee: '10%' },
            { num: 3, color: '#7C3AED', bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', accent: 'text-purple-600', label: '兼职顾问全程跟进', desc: '完成推荐报告，人选全流程跟进', fee: '至少50%', note: '具体可以和公司详谈签约，以详谈约定的合约为准' },
          ].map(({ num, color, bg, border: bdr, text: tclr, accent, label, desc, fee, note }) => (
            <div key={num} className={`${bg} rounded-2xl p-4 border ${bdr}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white" style={{ backgroundColor: color }}>{num}</div>
                <div className="flex-1">
                  <p className={`font-semibold ${tclr} text-sm`}>{label}</p>
                  <p className="text-xs text-gray-500 mt-1">{desc}</p>
                  <p className={`text-lg font-extrabold ${accent} mt-2`}>过保回款的 <span className="text-xl">{fee}</span></p>
                  {note && <p className="text-xs text-gray-400 mt-1">{note}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        {wechat && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <h3 className="font-semibold text-amber-800 text-sm mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              联系顾问（微信）
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-amber-200">
                <span className="font-mono text-lg font-bold text-amber-900">{wechat}</span>
              </div>
              <button onClick={handleCopy} className="btn-primary btn-size-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                复制
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2">复制后打开微信添加好友，备注&ldquo;悬赏推荐+职位名&rdquo;</p>
          </div>
        )}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">知道了</button>
          {wechat && (
            <button onClick={handleCopy} className="btn-primary flex-1 justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              复制顾问微信
            </button>
          )}
        </div>
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
