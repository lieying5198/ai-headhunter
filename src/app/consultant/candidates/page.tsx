'use client'
// src/app/consultant/candidates/page.tsx
// 猎英盟 · 候选人管理

import { useState, useEffect, useCallback } from 'react'
import { getStatusLabel, getScoreColor } from '@/lib/utils/helpers'

const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'new', label: '新申请' },
  { value: 'screening', label: '初筛中' },
  { value: 'screened', label: '初筛完成' },
  { value: 'contacted', label: '已联系' },
  { value: 'interviewing', label: '面试中' },
  { value: 'offered', label: 'Offer阶段' },
  { value: 'hired', label: '已入职' },
  { value: 'rejected', label: '已淘汰' },
]

const NEXT_STATUSES: Record<string, string[]> = {
  new: ['screening', 'contacted', 'rejected'],
  screening: ['screened', 'rejected'],
  screened: ['contacted', 'rejected'],
  contacted: ['interviewing', 'rejected'],
  interviewing: ['offered', 'rejected'],
  offered: ['hired', 'rejected'],
  hired: [],
  rejected: ['screened'],
}

const STATUS_COLORS: Record<string, string> = {
  new: '#FF6600',
  screening: '#7C3AED',
  screened: '#6366F1',
  contacted: '#0891B2',
  interviewing: '#D97706',
  offered: '#EA580C',
  hired: '#16A34A',
  rejected: '#9CA3AF',
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<any | null>(null)
  const [updating, setUpdating] = useState(false)

  const fetchCandidates = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ pageSize: '50' })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/candidates?${params}`)
    const json = await res.json()
    if (json.success) { setCandidates(json.data); setTotal(json.total) }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  const updateStatus = async (candidateId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if ((await res.json()).success) {
        await fetchCandidates()
        if (selected?.id === candidateId) setSelected((prev: any) => ({ ...prev, status: newStatus }))
      }
    } finally { setUpdating(false) }
  }

  const getLatestScore = (candidate: any) => {
    const scores = candidate.ai_scores || []
    return scores[scores.length - 1] || null
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)] animate-fade-in-up">
      {/* 左侧列表 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">候选人管理</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">共 <span className="font-bold text-gray-900">{total}</span> 人</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-36 text-sm py-2">
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4">
                <div className="skeleton h-4 rounded w-1/4 mb-2" />
                <div className="skeleton h-3 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <svg className="w-8 h-8 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="empty-state-title">暂无候选人</h3>
            <p className="empty-state-desc">候选人提交简历后会自动出现在这里</p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-2 pr-1">
            {candidates.map((candidate) => {
              const score = getLatestScore(candidate)
              const isSelected = selected?.id === candidate.id
              const statusColor = STATUS_COLORS[candidate.status] || '#9CA3AF'
              return (
                <div key={candidate.id}
                  onClick={() => setSelected(isSelected ? null : candidate)}
                  className={`card p-4 cursor-pointer transition-all duration-200 ${
                    isSelected ? 'border-orange-300 bg-orange-50/50 shadow-md' : 'hover:border-gray-200 hover:shadow-sm'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">{candidate.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: statusColor }}>
                          {getStatusLabel(candidate.status)}
                        </span>
                        {score?.overall_score && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-bold ${getScoreColor(score.overall_score)}`}>
                            {score.overall_score}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 flex gap-3 flex-wrap">
                        {candidate.current_company && <span>{candidate.current_company}</span>}
                        {candidate.current_title && <span>{candidate.current_title}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 shrink-0">
                      {new Date(candidate.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 右侧详情面板 */}
      {selected && (
        <div className="w-80 shrink-0 overflow-y-auto animate-fade-in-scale">
          <div className="card p-5 sticky top-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900 text-lg">{selected.name}</h2>
                <p className="text-sm text-gray-400">{getStatusLabel(selected.status)}</p>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 基础信息 */}
            <div className="space-y-2.5 text-sm mb-5">
              {[
                { label: '邮箱', value: selected.email },
                { label: '电话', value: selected.phone },
                { label: '公司', value: selected.current_company },
                { label: '职位', value: selected.current_title },
                { label: '工作年限', value: selected.years_exp ? `${selected.years_exp} 年` : null },
              ].filter(item => item.value).map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-gray-400 w-16 shrink-0">{label}</span>
                  <span className="text-gray-900 truncate">{value}</span>
                </div>
              ))}
            </div>

            {/* AI评分 */}
            {(() => {
              const score = getLatestScore(selected)
              if (!score) return (
                <div className="mb-5 p-3 bg-gray-50 rounded-xl text-xs text-gray-400 text-center">暂无AI评分</div>
              )
              return (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className="text-sm font-bold text-gray-900">AI 评分</h3>
                    <span className={`text-sm px-2 py-0.5 rounded-lg border font-bold ${getScoreColor(score.overall_score)}`}>
                      {score.overall_score} &middot; {score.overall_numeric}分
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: '行业匹配', value: score.industry_match },
                      { label: '职级匹配', value: score.level_match },
                      { label: '稳定性', value: score.stability },
                      { label: '管理经验', value: score.management_exp },
                      { label: '项目经验', value: score.project_exp },
                    ].map(({ label, value }) => value !== null && value !== undefined ? (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{label}</span>
                          <span className="font-semibold text-gray-700">{value}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${value}%`, background: 'linear-gradient(90deg, #FF6600, #FF3300)' }} />
                        </div>
                      </div>
                    ) : null)}
                  </div>
                  {score.recommendation && (
                    <div className="mt-3 p-3 bg-orange-50 rounded-xl text-xs text-orange-700 border border-orange-100">
                      {score.recommendation}
                    </div>
                  )}
                  {score.risks && (
                    <div className="mt-2 p-3 bg-amber-50 rounded-xl text-xs text-amber-700 border border-amber-100 flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {score.risks}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* 状态更新 */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2.5">更新状态</h3>
              <div className="flex flex-wrap gap-1.5">
                {(NEXT_STATUSES[selected.status] || []).map((nextStatus) => (
                  <button key={nextStatus}
                    onClick={() => updateStatus(selected.id, nextStatus)}
                    disabled={updating}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-gray-600 rounded-lg transition-colors disabled:opacity-50 font-medium">
                    &rarr; {getStatusLabel(nextStatus)}
                  </button>
                ))}
                {(NEXT_STATUSES[selected.status] || []).length === 0 && (
                  <span className="text-xs text-gray-400">已是最终状态</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
