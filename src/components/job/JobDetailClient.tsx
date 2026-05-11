'use client'

import { useState } from 'react'
import Link from 'next/link'

interface WechatContact {
  id: string
  wechat_id: string
  nickname?: string
  is_primary: boolean
  is_online: boolean
}

interface JobDetailClientProps {
  jobId: string
  jobTitle: string
  wechats?: WechatContact[]
  copyText: string
}

export default function JobDetailClient({ jobId, jobTitle, wechats, copyText }: JobDetailClientProps) {
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [showWechatModal, setShowWechatModal] = useState(false)

  const handleCopy = async () => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(copyText)
      setAlertMessage('职位信息已复制到剪贴板！')
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3000)
    }
  }

  const handleCopyWechat = async (wechatId: string) => {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(wechatId)
      setShowWechatModal(false)
      setAlertMessage('微信号已复制，快去微信添加好友吧！')
      setShowAlert(true)
      setTimeout(() => setShowAlert(false), 3000)
    }
  }

  const hasWechats = wechats && wechats.length > 0

  return (
    <>
      {/* 提示消息 */}
      {showAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm z-50 shadow-lg">
          {alertMessage}
        </div>
      )}

      {/* 微信号选择弹窗 */}
      {showWechatModal && hasWechats && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowWechatModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* 弹窗头部 */}
            <div className="sticky top-0 bg-white rounded-t-3xl p-5 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-bold text-gray-900 text-center">选择微信联系人</h3>
              <p className="text-xs text-gray-400 text-center mt-1">点击复制微信号，去微信添加好友</p>
            </div>

            {/* 微信号列表 */}
            <div className="p-5 space-y-3">
              {wechats!.map((wc) => (
                <button
                  key={wc.id}
                  onClick={() => handleCopyWechat(wc.wechat_id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-green-300 hover:bg-green-50 transition-all text-left"
                >
                  {/* 头像 */}
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl flex-shrink-0 ${
                    wc.is_primary ? 'bg-gradient-to-br from-green-400 to-emerald-500' : 'bg-gradient-to-br from-gray-300 to-gray-400'
                  }`}>
                    💬
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate">
                        {wc.nickname || wc.wechat_id}
                      </span>
                      {wc.is_primary && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full flex-shrink-0">
                          ⭐ 主号
                        </span>
                      )}
                      {wc.is_online && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex-shrink-0">
                          🟢 在线
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 font-mono">{wc.wechat_id}</p>
                  </div>

                  {/* 复制按钮 */}
                  <div className="px-3 py-1.5 bg-gray-100 hover:bg-green-500 hover:text-white rounded-xl text-xs text-gray-600 transition-all flex-shrink-0">
                    📋 复制
                  </div>
                </button>
              ))}
            </div>

            {/* 底部提示 */}
            <div className="p-5 pt-0">
              <p className="text-xs text-gray-400 text-center">
                复制后打开微信添加好友，备注"悬赏推荐+{jobTitle}"
              </p>
            </div>
          </div>
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
          {hasWechats && (
            <button
              onClick={() => setShowWechatModal(true)}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-3 rounded-xl text-sm font-semibold transition-all"
            >
              💬 联系微信
            </button>
          )}
          <Link
            href={`/jobs/${jobId}/chat`}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-center py-3 rounded-xl text-sm font-semibold transition-all text-nowrap"
          >
            🤖 AI聊聊
          </Link>
        </div>
      </div>

      {/* 微信号快捷展示（无弹窗时直接显示） */}
      {hasWechats && wechats!.length <= 2 && (
        <div className="max-w-xl mx-auto px-4 mb-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-sm text-amber-800 font-semibold mb-3">💬 微信联系人</p>
            <div className="space-y-2">
              {wechats!.map((wc) => (
                <div key={wc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-900 font-medium">
                      {wc.nickname || wc.wechat_id}
                    </span>
                    {wc.is_primary && (
                      <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 text-xs rounded">主号</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleCopyWechat(wc.wechat_id)}
                    className="px-3 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-medium transition-all"
                  >
                    📋 {wc.wechat_id}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-3">复制后打开微信添加好友，备注"悬赏推荐+{jobTitle}"</p>
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
