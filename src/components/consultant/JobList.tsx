// src/components/consultant/JobList.tsx
'use client'

import { useState } from 'react'
import { getJobStatusLabel, formatSalary } from '@/lib/utils/helpers'
import JobActions from '@/app/consultant/jobs/JobActions'
import { batchJobAction } from '@/lib/actions/job-actions'

interface Job {
  id: string
  title: string
  industry?: string
  city?: string
  salary_min?: number
  salary_max?: number
  level?: string
  status: string
  is_published: boolean
  view_count: number
  apply_count: number
  summary?: string
  tags?: string[]
  created_at: string
  consultant_id?: string
  hidden_company?: { anonymized_name: string }
}

interface Props {
  jobs: Job[]
  consultants: { id: string; name: string }[]
}

export default function JobList({ jobs, consultants }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(jobs.map(j => j.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(x => x !== id))
    }
  }

  const allSelected = selectedIds.length === jobs.length && jobs.length > 0
  const count = selectedIds.length

  return (
    <form action={batchJobAction} id="batch-form">
      {/* 批量操作栏 */}
      {count > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-700">
            已选择 {count} 个职位
          </span>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              type="submit"
              name="action"
              value="publish"
              className="btn-sm btn-success"
            >
              📤 批量上架
            </button>
            <button
              type="submit"
              name="action"
              value="unpublish"
              className="btn-sm btn-warning"
            >
              📥 批量下架
            </button>
            <button
              type="submit"
              name="action"
              value="delete"
              className="btn-sm btn-danger"
              onClick={(e) => {
                if (!confirm(`确定删除选中的 ${count} 个职位吗？`)) e.preventDefault()
              }}
            >
              🗑️ 批量删除
            </button>
          </div>

          {/* 分配给顾问 */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              name="consultant_id"
              className="text-sm border rounded px-2 py-1"
              defaultValue=""
            >
              <option value="" disabled>选择顾问...</option>
              {consultants.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              type="submit"
              name="action"
              value="assign_consultant"
              className="btn-sm btn-primary"
            >
              👤 分配顾问
            </button>
          </div>
        </div>
      )}

      {/* 全选 */}
      <div className="flex items-center gap-3 mb-3">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={allSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
        <span className="text-sm text-gray-500">全选</span>
      </div>

      {/* 职位列表 */}
      <div className="space-y-3">
        {jobs.map((job) => (
          <div key={job.id} className="card p-5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="jobIds"
                value={job.id}
                checked={selectedIds.includes(job.id)}
                onChange={(e) => handleSelectOne(job.id, e.target.checked)}
                className="w-4 h-4 mt-1"
              />

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-base font-semibold text-gray-900">{job.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    job.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                    job.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                    job.status === 'published' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-600'
                  }`}>
                    {getJobStatusLabel(job.status)}
                  </span>
                  {job.is_published && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                      ✓ 已上架
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                  {job.industry && <span>{job.industry}</span>}
                  {job.city && <span>📍 {job.city}</span>}
                  {(job.salary_min || job.salary_max) && (
                    <span className="text-blue-600 font-medium">
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                  )}
                  <span className="text-gray-400">
                    👁 {job.view_count} · 📄 {job.apply_count}人申请
                  </span>
                </div>

                {job.hidden_company?.anonymized_name && (
                  <div className="text-xs text-gray-400">
                    客户：{job.hidden_company.anonymized_name}
                  </div>
                )}

                {job.consultant_id && (
                  <div className="text-xs text-blue-500 mt-1">
                    负责顾问：{consultants.find(c => c.id === job.consultant_id)?.name || '未知'}
                  </div>
                )}
              </div>

              <JobActions jobId={job.id} status={job.status} isPublished={job.is_published} />
            </div>
          </div>
        ))}
      </div>
    </form>
  )
}
