'use client'
// src/app/consultant/candidates/page.tsx
// 候选人管理（Client Component）

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

    if (json.success) {
      setCandidates(json.data)
      setTotal(json.total)
    }
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchCandidates() }, [fetchCandidates])

  const updateStatus = async (candidateId: string, newStatus: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/candidates/${candidateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if ((await res.json()).success) {
        await fetchCandidates()
        if (selected?.id === candidateId) {
          setSelected((prev: any) => ({ ...prev, status: newStatus }))
        }
      }
    } finally {
      setUpdating(false)
    }
  }

  const getLatestScore = (candidate: any) => {
    const scores = candidate.ai_scores || []
    return scores[scores.length - 1] || null
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* 候选人列表 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">候选人管理</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">共 {total} 人</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-36 text-sm"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-400">暂无候选人</p>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-2">
            {candidates.map((candidate) => {
              const score = getLatestScore(candidate)
              const isSelected = selected?.id === candidate.id

              return (
                <div
                  key={candidate.id}
                  onClick={() => setSelected(isSelected ? null : candidate)}
                  className={`card p-4 cursor-pointer transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">{candidate.name}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                          {getStatusLabel(candidate.status)}
                        </span>
                        {score?.overall_score && (
                          <span className={`text-xs px-1.5 py-0.5 border rounded font-bold ${getScoreColor(score.overall_score)}`}>
                            {score.overall_score}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex gap-3">
                        {candidate.current_company && <span>{candidate.current_company}</span>}
                        {candidate.current_title && <span>{candidate.current_title}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(candidate.created_at).toLocaleDateString('zh-CN')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 详情面板 */}
      {selected && (
        <div className="w-80 flex-shrink-0 overflow-y-auto">
          <div className="card p-5 sticky top-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-bold text-gray-900">{selected.name}</h2>
                <p className="text-sm text-gray-500">
                  {getStatusLabel(selected.status)}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            {/* 基础信息 */}
            <div className="space-y-2 text-sm mb-4">
              {selected.email && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-14">邮箱</span>
                  <span className="text-gray-900">{selected.email}</span>
                </div>
              )}
              {selected.phone && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-14">电话</span>
                  <span className="text-gray-900">{selected.phone}</span>
                </div>
              )}
              {selected.current_company && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-14">公司</span>
                  <span className="text-gray-900">{selected.current_company}</span>
                </div>
              )}
              {selected.current_title && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-14">职位</span>
                  <span className="text-gray-900">{selected.current_title}</span>
                </div>
              )}
              {selected.years_exp && (
                <div className="flex gap-2">
                  <span className="text-gray-500 w-14">工作年限</span>
                  <span className="text-gray-900">{selected.years_exp} 年</span>
                </div>
              )}
            </div>

            {/* AI评分 */}
            {(() => {
              const score = getLatestScore(selected)
              if (!score) return <p className="text-xs text-gray-400 mb-4">暂无AI评分</p>
              return (
                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-gray-900">AI评分</h3>
                    <span className={`text-sm px-2 py-0.5 border rounded font-bold ${getScoreColor(score.overall_score)}`}>
                      {score.overall_score} · {score.overall_numeric}分
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      { label: '行业匹配', value: score.industry_match },
                      { label: '职级匹配', value: score.level_match },
                      { label: '稳定性', value: score.stability },
                      { label: '管理经验', value: score.management_exp },
                      { label: '项目经验', value: score.project_exp },
                    ].map(({ label, value }) => value !== null && value !== undefined ? (
                      <div key={label}>
                        <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                          <span>{label}</span>
                          <span>{value}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-blue-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ) : null)}
                  </div>

                  {score.recommendation && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                      {score.recommendation}
                    </div>
                  )}
                  {score.risks && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                      ⚠️ {score.risks}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* 状态更新 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">更新状态</h3>
              <div className="flex flex-wrap gap-1.5">
                {(NEXT_STATUSES[selected.status] || []).map((nextStatus) => (
                  <button
                    key={nextStatus}
                    onClick={() => updateStatus(selected.id, nextStatus)}
                    disabled={updating}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-700 rounded transition-colors disabled:opacity-50"
                  >
                    → {getStatusLabel(nextStatus)}
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
