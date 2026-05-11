'use client'
// src/app/jobs/[id]/chat/page.tsx
// AI职位客服聊天页面

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { generateSessionId } from '@/lib/utils/helpers'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Job {
  id: string
  title: string
  consultant_wechat?: string  // 顾问微信号
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [consultantWechat, setConsultantWechat] = useState('LieYing-5198')
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `您好！我是猎英盟AI招聘助手 🤖

我可以为您介绍这个职位的详细情况，解答您关于岗位职责、任职要求、发展前景等问题。

请问您想了解什么？`,
      timestamp: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(generateSessionId)
  const [showWechatPanel, setShowWechatPanel] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', wechat: '' })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 加载职位信息
  useEffect(() => {
    fetch('/data/jobs.json')
      .then(res => res.json())
      .then((data: Job[]) => {
        const found = data.find((j: Job) => j.id === jobId)
        if (found) {
          setJob(found)
          if (found.consultant_wechat) {
            setConsultantWechat(found.consultant_wechat)
          }
        }
      })
      .catch(console.error)
  }, [jobId])

  // 检测AI回复是否包含转人工信号
  const hasTransferSignal = (content: string) => {
    return content.includes('💬')
  }

  // 从AI回复中提取微信号
  const extractWechatFromContent = (content: string): string | null => {
    // 匹配微信号格式：猎人_lieying、LieYing5198 等
    const match = content.match(/顾问微信[：:]\s*([a-zA-Z0-9_]{5,20})/)
    return match ? match[1] : null
  }

  // 提交联系方式
  const handleContactSubmit = () => {
    if (!contactForm.name || !contactForm.phone) {
      alert('请填写姓名和电话')
      return
    }
    // TODO: 发送到后端保存或发送邮件/微信通知
    console.log('联系方式已记录:', contactForm)
    setShowWechatPanel(false)
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ 收到！顾问会在24小时内通过微信联系您。

📱 您填写的信息：
• 姓名：${contactForm.name}
• 电话：${contactForm.phone}
${contactForm.wechat ? `• 微信：${contactForm.wechat}` : ''}

感谢您的信任，祝您求职顺利！🎯`,
      timestamp: new Date().toISOString(),
    }])
    // 清空表单
    setContactForm({ name: '', phone: '', wechat: '' })
  }

  // 一键复制微信 - 优先从AI回复提取，否则用职位配置的
  const getWechatToCopy = (content: string): string => {
    const extracted = extractWechatFromContent(content)
    return extracted || consultantWechat
  }

  // 一键复制微信
  const copyWechat = (content?: string) => {
    const wechat = content ? getWechatToCopy(content) : consultantWechat
    navigator.clipboard.writeText(wechat)
    alert(`微信号 ${wechat} 已复制，请粘贴到微信添加好友`)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    // 添加 AI 占位消息
    const aiMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, aiMessage])

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          sessionId,
          message: userMessage.content,
          history: messages.slice(-8).map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || errData.error || '请求失败')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('无法读取响应')

      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                fullText += parsed.text
                setMessages(prev => {
                  const updated = [...prev]
                  updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: fullText,
                  }
                  return updated
                })
              }
            } catch {}
          }
        }
      }
    } catch (error: any) {
      // 检查是否是配置错误
      if (error?.message?.includes('未配置') || error?.message?.includes('503')) {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: '🔧 AI客服正在配置中，请稍后再试。\n\n您可以通过以下方式了解更多职位信息：\n• 直接联系猎头顾问\n• 查看职位详情页的更多信息',
            timestamp: new Date().toISOString(),
          }
          return updated
        })
      } else {
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: '抱歉，AI服务暂时不可用。请稍后重试，或联系猎头顾问了解详情。',
          }
          return updated
        })
      }
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickQuestions = [
    '这个职位主要做什么？',
    '有什么任职要求？',
    '公司规模怎么样？',
    '发展前景如何？',
    '薪资构成是什么？',
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link
            href={`/jobs/${jobId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 返回职位详情
          </Link>
          <div className="h-4 border-l border-gray-300" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">AI</span>
            </div>
            <span className="text-sm font-medium text-gray-900">AI招聘助手</span>
            <span className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        </div>
      </header>

      {/* 联系方式提示条 - 顶部固定 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">💬</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800 mb-1">
                🤖 AI助手为您服务 · 也可直接联系顾问
              </p>
              <p className="text-xs text-gray-600 mb-2">
                您可以选择与AI对话，或直接添加顾问微信人工咨询：
              </p>
              <div className="flex flex-wrap gap-2">
                {['LieYing-5198', 'EliteBridge5198', 'lieying5198'].map((wechat) => (
                  <button
                    key={wechat}
                    onClick={() => {
                      navigator.clipboard.writeText(wechat)
                      alert(`微信号 ${wechat} 已复制！请在微信中添加好友`)
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border-2 border-blue-300 rounded-full text-sm font-mono text-blue-700 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-colors cursor-pointer"
                  >
                    📋 {wechat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 消息区 */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 overflow-y-auto">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">AI</span>
                </div>
              )}
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.content ? (
                  <>
                    <span className="whitespace-pre-wrap">{msg.content}</span>
                    {/* AI 回复且包含转微信信号时，显示快捷按钮 */}
                    {msg.role === 'assistant' && hasTransferSignal(msg.content) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 flex-wrap">
                        <button
                          onClick={() => copyWechat(msg.content)}
                          className="text-xs px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
                        >
                          📋 复制顾问微信
                        </button>
                        <button
                          onClick={() => setShowWechatPanel(true)}
                          className="text-xs px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
                        >
                          📝 留信息给顾问
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="flex gap-1 items-center text-gray-400">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷问题 */}
      {messages.length <= 2 && !showWechatPanel && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(q)
                  inputRef.current?.focus()
                }}
                className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 联系顾问面板 */}
      {showWechatPanel && (
        <div className="max-w-3xl w-full mx-auto px-4 pb-2">
          <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-lg">
            <h4 className="text-sm font-medium text-gray-800 mb-3">📬 留下信息，顾问将在24h内联系您</h4>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="您的姓名 *"
                value={contactForm.name}
                onChange={(e) => setContactForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="tel"
                placeholder="联系电话 *"
                value={contactForm.phone}
                onChange={(e) => setContactForm(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="微信号（选填，如不填将用电话联系）"
                value={contactForm.wechat}
                onChange={(e) => setContactForm(prev => ({ ...prev, wechat: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleContactSubmit}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg transition-colors"
                >
                  提交，等待联系 →
                </button>
                <button
                  onClick={() => setShowWechatPanel(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">🔒 您的信息仅用于猎头顾问联系，不会对外泄露</p>
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="bg-white border-t">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入您的问题..."
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            >
              <svg className="w-4 h-4 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            💡 AI助手为您服务 · 上方可直接复制顾问微信
          </p>
        </div>
      </div>
    </div>
  )
}
