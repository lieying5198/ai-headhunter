'use client'
// src/app/consultant/dashboard/page.tsx
// 顾问数据统计面板

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Stats {
  jobs: {
    total: number
    published: number
    draft: number
    closed: number
  }
  candidates: {
    total: number
    byStatus: Record<string, number>
  }
  recentJobs: any[]
  recentCandidates: any[]
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // 获取职位统计
        const jobsRes = await fetch('/api/consultant/stats/jobs')
        const jobsData = await jobsRes.json()

        // 获取候选人统计
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
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    )
  }

  const jobStats = stats?.jobs || { total: 0, published: 0, draft: 0, closed: 0 }
  const candidateStats = stats?.candidates || { total: 0, byStatus: {} }

  // 候选人漏斗数据
  const funnelSteps = [
    { key: 'new', label: '新申请', color: 'bg-blue-500' },
    { key: 'screening', label: '初筛中', color: 'bg-purple-500' },
    { key: 'screened', label: '初筛完成', color: 'bg-indigo-500' },
    { key: 'contacted', label: '已联系', color: 'bg-cyan-500' },
    { key: 'interviewing', label: '面试中', color: 'bg-yellow-500' },
    { key: 'offered', label: 'Offer阶段', color: 'bg-orange-500' },
    { key: 'hired', label: '已入职', color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="职位总数"
          value={jobStats.total}
          icon="💼"
          href="/consultant/jobs"
          color="bg-blue-50 border-blue-200"
        />
        <StatCard
          label="发布中"
          value={jobStats.published}
          icon="✅"
          href="/consultant/jobs?status=published"
          color="bg-green-50 border-green-200"
        />
        <StatCard
          label="候选人"
          value={candidateStats.total}
          icon="👥"
          href="/consultant/candidates"
          color="bg-purple-50 border-purple-200"
        />
        <StatCard
          label="面试中"
          value={candidateStats.byStatus?.interviewing || 0}
          icon="🎯"
          href="/consultant/candidates?status=interviewing"
          color="bg-yellow-50 border-yellow-200"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 候选人漏斗 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">候选人漏斗</h2>
            <Link href="/consultant/candidates" className="text-sm text-blue-600 hover:text-blue-700">
              查看全部 →
            </Link>
          </div>
          <div className="space-y-3">
            {funnelSteps.map((step) => {
              const count = candidateStats.byStatus?.[step.key] || 0
              const maxCount = Math.max(...Object.values(candidateStats.byStatus || { new: 1 }), 1)
              const width = Math.max((count / maxCount) * 100, count > 0 ? 8 : 0)

              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className="w-20 text-sm text-gray-600">{step.label}</div>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div
                      className={`${step.color} h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500`}
                      style={{ width: `${width}%`, minWidth: count > 0 ? '24px' : '0' }}
                    >
                      {count > 0 && <span className="text-xs text-white font-medium">{count}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 近期动态 */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">近期动态</h2>
          </div>
          <div className="space-y-4">
            {/* 近期职位 */}
            {(stats?.recentJobs?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">最新职位</h3>
                <div className="space-y-2">
                  {stats!.recentJobs.slice(0, 3).map((job: any) => (
                    <Link
                      key={job.id}
                      href={`/consultant/jobs/${job.id}`}
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900">{job.title}</span>
                        <span className="text-xs text-gray-400 ml-2">{job.city}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        job.is_published
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {job.is_published ? '发布中' : '草稿'}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 近期候选人 */}
            {(stats?.recentCandidates?.length ?? 0) > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">最新候选人</h3>
                <div className="space-y-2">
                  {stats!.recentCandidates.slice(0, 3).map((candidate: any) => (
                    <Link
                      key={candidate.id}
                      href="/consultant/candidates"
                      className="flex items-center justify-between p-2 rounded hover:bg-gray-50 transition-colors"
                    >
                      <div>
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
              <p className="text-center text-gray-400 py-8">暂无动态</p>
            )}
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/consultant/jobs/import" className="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
            <span className="text-2xl">📤</span>
            <div>
              <div className="font-medium text-gray-900">导入职位</div>
              <div className="text-xs text-gray-500">Excel批量导入</div>
            </div>
          </Link>
          <Link href="/consultant/jobs" className="flex items-center gap-3 p-4 rounded-lg bg-green-50 hover:bg-green-100 transition-colors">
            <span className="text-2xl">💼</span>
            <div>
              <div className="font-medium text-gray-900">职位管理</div>
              <div className="text-xs text-gray-500">查看所有职位</div>
            </div>
          </Link>
          <Link href="/consultant/candidates" className="flex items-center gap-3 p-4 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors">
            <span className="text-2xl">👥</span>
            <div>
              <div className="font-medium text-gray-900">候选人</div>
              <div className="text-xs text-gray-500">筛选候选人</div>
            </div>
          </Link>
          <Link href="/" target="_blank" className="flex items-center gap-3 p-4 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">
            <span className="text-2xl">👁</span>
            <div>
              <div className="font-medium text-gray-900">候选人端</div>
              <div className="text-xs text-gray-500">预览效果</div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  href,
  color,
}: {
  label: string
  value: number
  icon: string
  href: string
  color: string
}) {
  return (
    <Link href={href} className={`${color} border rounded-lg p-4 hover:opacity-80 transition-opacity`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 mb-1">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Link>
  )
}
