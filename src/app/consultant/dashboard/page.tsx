'use client'
// src/app/consultant/dashboard/page.tsx
// 猎英盟 · 顾问数据仪表盘

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Stats {
  jobs: { total: number; published: number; draft: number; closed: number }
  candidates: { total: number; byStatus: Record<string, number> }
  recentJobs: any[]
  recentCandidates: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const jobsRes = await fetch('/api/consultant/stats/jobs')
        const jobsData = await jobsRes.json()
        const candidatesRes = await fetch('/api/consultant/stats/candidates')
        const candidatesData = await candidatesRes.json()
        setStats({
          jobs: jobsData.jobs || { total: 0, published: 0, draft: 0, closed: 0 },
          candidates: candidatesData.candidates || { total: 0, byStatus: {} },
          recentJobs: jobsData.recentJobs || [],
          recentCandidates: candidatesData.recentCandidates || [],
        })
      } catch (err) {
        console.error('获取统计数据失败:', err)
      } finally { setLoading(false) }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="stat-card">
              <div className="skeleton h-4 w-16 mb-3" />
              <div className="skeleton h-8 w-12" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6"><div className="skeleton h-48 rounded-xl" /></div>
          <div className="card p-6"><div className="skeleton h-48 rounded-xl" /></div>
        </div>
      </div>
    )
  }

  const jobStats = stats?.jobs || { total: 0, published: 0, draft: 0, closed: 0 }
  const candidateStats = stats?.candidates || { total: 0, byStatus: {} }

  const funnelSteps = [
    { key: 'new', label: '新申请', color: '#FF6600' },
    { key: 'screening', label: '初筛中', color: '#7C3AED' },
    { key: 'screened', label: '初筛完成', color: '#6366F1' },
    { key: 'contacted', label: '已联系', color: '#0891B2' },
    { key: 'interviewing', label: '面试中', color: '#D97706' },
    { key: 'offered', label: 'Offer阶段', color: '#EA580C' },
    { key: 'hired', label: '已入职', color: '#16A34A' },
  ]

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/consultant/jobs" className="stat-card group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">职位总数</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{jobStats.total}</div>
          <div className="stat-card-label">
            <span className="badge-success">{jobStats.published} 发布中</span>
            <span className="text-gray-300 mx-1">&middot;</span>
            <span className="text-xs text-gray-400">{jobStats.draft} 草稿</span>
          </div>
        </Link>

        <Link href="/consultant/candidates" className="stat-card group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">候选人</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-purple-50">
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{candidateStats.total}</div>
          <div className="stat-card-label">
            <span className="badge-warning">{candidateStats.byStatus?.interviewing || 0} 面试中</span>
          </div>
        </Link>

        <Link href="/consultant/candidates?status=new" className="stat-card group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">新申请</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-green-50">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{candidateStats.byStatus?.new || 0}</div>
          <div className="stat-card-label text-xs text-gray-400">待处理</div>
        </Link>

        <Link href="/consultant/candidates?status=offered" className="stat-card group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-400">Offer</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-orange-50">
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>
          <div className="stat-card-value">{candidateStats.byStatus?.offered || 0}</div>
          <div className="stat-card-label text-xs text-gray-400">Offer阶段</div>
        </Link>
      </div>

      {/* 图表区 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 候选人漏斗 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-gray-900">候选人漏斗</h2>
            <Link href="/consultant/candidates" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
              查看全部 &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {funnelSteps.map((step) => {
              const count = candidateStats.byStatus?.[step.key] || 0
              const maxCount = Math.max(...Object.values(candidateStats.byStatus || { new: 1 }), 1)
              const width = Math.max((count / maxCount) * 100, count > 0 ? 6 : 0)
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="w-20 text-sm font-medium text-gray-500">{step.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-7 overflow-hidden">
                    <div
                      className="h-full rounded-full flex items-center justify-end pr-2.5 transition-all duration-700"
                      style={{ width: `${width}%`, minWidth: count > 0 ? '28px' : '0', backgroundColor: step.color }}
                    >
                      {count > 0 && <span className="text-xs text-white font-bold">{count}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 近期动态 */}
        <div className="card p-6">
          <h2 className="text-base font-bold text-gray-900 mb-5">近期动态</h2>
          <div className="space-y-4">
            {(stats?.recentJobs?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">最新职位</h3>
                <div className="space-y-1.5">
                  {stats!.recentJobs.slice(0, 3).map((job: any) => (
                    <Link key={job.id} href={`/consultant/jobs/${job.id}`}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-orange-600 transition-colors">{job.title}</span>
                        <span className="text-xs text-gray-400 ml-2">{job.city}</span>
                      </div>
                      <span className={`badge text-xs shrink-0 ${job.is_published ? 'badge-success' : 'badge bg-gray-100 text-gray-500'}`}>
                        {job.is_published ? '发布中' : '草稿'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {(stats?.recentCandidates?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">最新候选人</h3>
                <div className="space-y-1.5">
                  {stats!.recentCandidates.slice(0, 3).map((candidate: any) => (
                    <Link key={candidate.id} href="/consultant/candidates"
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-gray-900">{candidate.name}</span>
                        <span className="text-xs text-gray-400 ml-2">{candidate.current_title}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(candidate.created_at), { addSuffix: true })}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {(!stats?.recentJobs?.length && !stats?.recentCandidates?.length) && (
              <div className="text-center py-10 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">暂无动态</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/consultant/jobs/import', icon: 'import', color: '#6366F1', bg: 'bg-indigo-50', label: '导入职位', desc: 'Excel批量导入' },
            { href: '/consultant/jobs', icon: 'jobs', color: '#16A34A', bg: 'bg-green-50', label: '职位管理', desc: '查看所有职位' },
            { href: '/consultant/candidates', icon: 'candidates', color: '#7C3AED', bg: 'bg-purple-50', label: '候选人', desc: '筛选候选人' },
            { href: '/', icon: 'preview', color: '#D97706', bg: 'bg-amber-50', label: '候选人端', desc: '预览效果' },
          ].map(({ href, icon, color, bg, label, desc }) => (
            <Link key={href} href={href} target={href === '/' ? '_blank' : undefined}
              className={`flex items-center gap-3 p-4 rounded-2xl ${bg} hover:opacity-80 transition-all group`}>
              <QuickIcon type={icon} color={color} />
              <div>
                <div className="font-semibold text-gray-900 text-sm">{label}</div>
                <div className="text-xs text-gray-400">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function QuickIcon({ type, color }: { type: string; color: string }) {
  const cls = 'w-6 h-6'
  switch (type) {
    case 'import':
      return (
        <svg className={cls} fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      )
    case 'jobs':
      return (
        <svg className={cls} fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case 'candidates':
      return (
        <svg className={cls} fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    case 'preview':
      return (
        <svg className={cls} fill="none" stroke={color} strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )
    default: return null
  }
}
