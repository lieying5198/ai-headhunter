'use client'
// src/components/job/JobDetailClient.tsx
// 猎英盟 · 职位详情操作栏 — 品牌化设计

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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-2xl text-sm font-medium z-50 shadow-xl animate-fade-in-scale">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {alertMessage}
          </span>
        </div>
      )}

      {/* 微信号选择弹窗 */}
      {showWechatModal && hasWechats && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowWechatModal(false)}>
          <div className="bg-white rounded-t-3xl w-full max-w-xl max-h-[70vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white rounded-t-3xl p-5 border-b border-gray-100">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 text-center">选择微信联系人</h3>
              <p className="text-xs text-gray-400 text-center mt-1">点击复制微信号，去微信添加好友</p>
            </div>
            <div className="p-5 space-y-3">
              {wechats!.map((wc) => (
                <button
                  key={wc.id}
                  onClick={() => handleCopyWechat(wc.wechat_id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50 transition-all text-left group"
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    wc.is_primary ? 'text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                  style={wc.is_primary ? { background: 'linear-gradient(135deg, #16A34A, #22C55E)' } : {}}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM24 16.22c0-3.498-3.466-6.34-7.733-6.34a7.34 7.34 0 00-5.312 2.145c-1.646 1.584-2.553 3.74-2.553 6.09 0 3.887 3.466 7.036 7.733 7.036.99 0 1.935-.168 2.796-.468a.837.837 0 01.677.09l1.72.992c.046.025.098.047.15.047.141 0 .253-.113.253-.253a.358.358 0 00-.042-.185l-.354-1.33a.567.567 0 01.2-.6C23.457 22.723 24 21.528 24 20.142c0-.65-.14-1.272-.396-1.836-.09-.2-.126-.396-.126-.592 0-.1.02-.21.06-.33C23.85 16.62 24 15.93 24 15.22z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                        {wc.nickname || wc.wechat_id}
                      </span>
                      {wc.is_primary && <span className="badge bg-amber-100 text-amber-700">主号</span>}
                      {wc.is_online && <span className="badge bg-green-100 text-green-700">在线</span>}
                    </div>
                    <p className="text-sm text-gray-500 font-mono">{wc.wechat_id}</p>
                  </div>
                  <div className="px-3 py-1.5 bg-gray-100 group-hover:bg-orange-500 group-hover:text-white rounded-xl text-xs text-gray-600 transition-all shrink-0 font-medium">
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    复制
                  </div>
                </button>
              ))}
            </div>
            <div className="p-5 pt-0">
              <p className="text-xs text-gray-400 text-center">复制后打开微信添加好友，备注&ldquo;悬赏推荐+{jobTitle}&rdquo;</p>
            </div>
          </div>
        </div>
      )}

      {/* 操作栏（非固定） */}
      <div className="max-w-xl mx-auto px-4 -mt-10 mb-4">
        <div className="bg-white rounded-2xl shadow-xl p-4 border border-gray-100 flex gap-3">
          <button onClick={handleCopy}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            复制信息
          </button>
          {hasWechats && (
            <button onClick={() => setShowWechatModal(true)}
              className="flex-1 text-white py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #16A34A, #22C55E)' }}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z" /></svg>
              联系微信
            </button>
          )}
          <Link href={`/jobs/${jobId}/chat`}
            className="btn-primary flex-1 justify-center text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            AI 聊聊
          </Link>
        </div>
      </div>

      {/* 微信号快捷展示 */}
      {hasWechats && wechats!.length <= 2 && (
        <div className="max-w-xl mx-auto px-4 mb-4">
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <p className="text-sm text-amber-800 font-semibold mb-3 flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z" /></svg>
              微信联系人
            </p>
            <div className="space-y-2">
              {wechats!.map((wc) => (
                <div key={wc.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-amber-900 font-medium">{wc.nickname || wc.wechat_id}</span>
                    {wc.is_primary && <span className="badge bg-amber-200 text-amber-800">主号</span>}
                  </div>
                  <button onClick={() => handleCopyWechat(wc.wechat_id)}
                    className="px-3 py-1.5 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-medium transition-all">
                    <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {wc.wechat_id}
                  </button>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-600 mt-3">复制后打开微信添加好友，备注&ldquo;悬赏推荐+{jobTitle}&rdquo;</p>
          </div>
        </div>
      )}

      {/* 底部操作栏（固定） */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-4">
        <div className="max-w-xl mx-auto flex gap-3">
          <Link href={`/jobs/${jobId}/chat`}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-semibold shadow-md hover:shadow-lg transition-all text-white"
            style={{ background: 'linear-gradient(135deg, #FF6600, #FF3300)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            AI 助手聊聊
          </Link>
          <Link href={`/upload?jobId=${jobId}&jobTitle=${encodeURIComponent(jobTitle)}`}
            className="btn-secondary flex-1 justify-center py-4 rounded-2xl font-semibold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            投递简历
          </Link>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">
          上传简历，AI 自动评估匹配度，顾问优先联系
        </p>
      </div>

      <div className="h-32" />
    </>
  )
}
