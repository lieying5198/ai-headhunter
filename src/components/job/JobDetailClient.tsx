'use client'

import { useState } from 'react'
import Link from 'next/link'

interface JobDetailClientProps {
  jobId: string
  jobTitle: string
  consultantWechat?: string
  copyText: string
}

export default function JobDetailClient({ jobId, jobTitle, consultantWechat, copyText }: JobDetailClientProps) {
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const handleCopyWechat = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(consultantWechat!)
      setAlertMessage('微信号已复制，快去微信添加好友吧！')
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3000)
    }
  }

  const handleCopy = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(copyText)
      setAlertMessage('职位信息已复制到剪贴板！')
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3000)
    }
  }

  return (
    <>
      {/* 提示消息 */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm z-50 shadow-lg">
          {alertMessage}
        </div>
      )}

      {/* 操作栏 */}
      <div className="max-w-xl mx-auto px-4 -mt-10 mb-4">
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold transition-all"
          >
            📋 复制信息
          </button>
          <Link
            href={`/jobs/${jobId}/chat`}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-center py-3 rounded-xl text-sm font-semibold transition-all text-nowrap"
          >
            🤖 AI聊聊
          </Link>
        </div>
      </div>

      {/* 顾问微信联系 */}
      {consultantWechat && (
        <div className="max-w-xl mx-auto px-4 mb-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-800 font-semibold">💬 顾问微信</p>
                <p className="text-lg font-bold text-amber-900 font-mono mt-1">{consultantWechat}</p>
              </div>
              <button
                onClick={handleCopyWechat}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl text-sm font-semibold transition-all"
              >
                📋 复制微信号
              </button>
            </div>
            <p className="text-xs text-amber-600 mt-2">复制后打开微信添加好友，备注"悬赏推荐+{jobTitle}"</p>
          </div>
        </div>
      )}

      {/* 底部操作栏（固定） */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 p-4 safe-area-inset-bottom">
        <div className="max-w-xl mx-auto flex gap-3">
          <Link
            href={`/jobs/${jobId}/chat`}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            💬 AI助手聊聊
          </Link>
          <Link
            href={`/upload?jobId=${jobId}&jobTitle=${encodeURIComponent(jobTitle)}`}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-center py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            📄 投递简历
          </Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          上传简历，AI自动评估匹配度，顾问优先联系
        </p>
      </div>

      {/* 底部占位（避免内容被固定导航遮挡） */}
      <div className="h-32"></div>
    </>
  )
}
