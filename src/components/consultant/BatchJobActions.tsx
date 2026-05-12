// src/components/consultant/BatchJobActions.tsx
'use client'

import { useState } from 'react'

interface Props {
  jobIds: string[]
  consultants: { id: string; name: string }[]
  onSelectionChange: (selectedIds: string[]) => void
}

export default function BatchJobActions({ jobIds, consultants, onSelectionChange }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(jobIds)
    } else {
      setSelectedIds([])
    }
    onSelectionChange(checked ? jobIds : [])
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    let newSelected: string[]
    if (checked) {
      newSelected = [...selectedIds, id]
    } else {
      newSelected = selectedIds.filter(x => x !== id)
    }
    setSelectedIds(newSelected)
    onSelectionChange(newSelected)
  }

  const count = selectedIds.length

  return (
    <>
      {/* 批量操作栏 */}
      {count > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <span className="text-sm font-medium text-blue-700">
            已选择 {count} 个职位
          </span>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              type="submit"
              form="batch-form"
              name="action"
              value="publish"
              className="btn-sm btn-success"
            >
              📤 批量上架
            </button>
            <button
              type="submit"
              form="batch-form"
              name="action"
              value="unpublish"
              className="btn-sm btn-warning"
            >
              📥 批量下架
            </button>
            <button
              type="submit"
              form="batch-form"
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
              form="batch-form"
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
              form="batch-form"
              name="action"
              value="assign_consultant"
              className="btn-sm btn-primary"
            >
              👤 分配顾问
            </button>
          </div>
        </div>
      )}

      {/* 全选复选框（在列表中） */}
      <div className="flex items-center gap-3 mb-2">
        <input
          type="checkbox"
          className="w-4 h-4"
          checked={count === jobIds.length && jobIds.length > 0}
          onChange={(e) => handleSelectAll(e.target.checked)}
        />
        <span className="text-sm text-gray-500">全选</span>
      </div>
    </>
  )
}
