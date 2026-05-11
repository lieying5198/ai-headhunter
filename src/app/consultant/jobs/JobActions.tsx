'use client'
// src/app/consultant/jobs/JobActions.tsx
// 职位操作按钮（发布/关闭/预览）

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function JobActions({
  jobId,
  status,
  isPublished,
}: {
  jobId: string
  status: string
  isPublished: boolean
}) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const updateJob = async (updates: Record<string, unknown>) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const json = await res.json()
      if (json.success) {
        router.refresh()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2 ml-4">
      {status === 'processing' && !isPublished && (
        <button
          onClick={() => updateJob({ status: 'published', is_published: true })}
          disabled={loading}
          className="text-xs btn-primary py-1.5 px-3"
        >
          发布
        </button>
      )}

      {isPublished && (
        <>
          <Link
            href={`/jobs/${jobId}`}
            target="_blank"
            className="text-xs btn-secondary py-1.5 px-3"
          >
            预览
          </Link>
          <button
            onClick={() => updateJob({ status: 'closed', is_published: false })}
            disabled={loading}
            className="text-xs px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          >
            关闭
          </button>
        </>
      )}

      {status === 'closed' && (
        <button
          onClick={() => updateJob({ status: 'published', is_published: true })}
          disabled={loading}
          className="text-xs btn-secondary py-1.5 px-3"
        >
          重新发布
        </button>
      )}

      {status === 'draft' && (
        <span className="text-xs text-gray-400">待AI处理</span>
      )}
    </div>
  )
}
