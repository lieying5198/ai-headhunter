// src/app/api/ai/chat/route.ts
// AI职位客服，流式输出（Phase 1 完整版）
//
// Phase 1 新增能力：
// 1. 对话持久化 - AI 记住用户，历史对话越聊越懂
// 2. RAG 语义检索 - 向量搜索相关职位上下文
// 3. 顾问 AI 上下文 - 注入顾问个性化信息
//
// 双模式：优先 Supabase，降级到本地 JSON

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'
import { generateSessionId } from '@/lib/conversation'
import { saveConversation, loadConversation } from '@/lib/conversation'
import { buildRagContext, buildEnhancedSystemPrompt } from '@/lib/ai/rag'

// ==============================================
// 辅助函数
// ==============================================

function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  return !(!url || url === 'placeholder' || url.includes('placeholder.supabase'))
}

// 获取职位（双模式）
async function getJob(jobId: string): Promise<{ job: any; source: string }> {
  // 优先 Supabase
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select('id, title, city, salary_min, salary_max, level, summary, consultant_wechat, consultant_id')
        .eq('id', jobId)
        .eq('is_published', true)
        .single()
      if (!error && data) {
        return { job: data, source: 'supabase' }
      }
    } catch {
      // 降级
    }
  }
  // 降级到本地 JSON
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'jobs.json')
    const data = JSON.parse(readFileSync(filePath, 'utf-8'))
    const job = data.find((j: any) => j.id === jobId)
    if (job) return { job, source: 'static' }
  } catch {}
  return { job: null, source: 'none' }
}

// 构建基础 System Prompt
function buildBaseSystemPrompt(job: any, consultantId?: string): string {
  const salaryText = job.salary_min && job.salary_max
    ? `${job.salary_min}-${job.salary_max}万/年`
    : '薪资面议'

  const consultantWechat = job.consultant_wechat || 'LieYing-5198'

  return `你是专业AI猎头顾问助手，为候选人提供职位咨询。

【核心原则】
1. 热情、专业、有温度，像朋友聊天一样
2. 每次回复简洁有力，不超过150字
3. 遇到复杂问题，主动引导转人工

【职位信息】
职位：${job.title}
行业：保密
城市：${job.city || '未披露'}
薪资：${salaryText}
职级：${job.level || '未披露'}

${job.summary ? `【职位简介】\n${job.summary.slice(0, 500)}` : ''}

【主动识别转人工信号】- 遇到以下情况，主动邀请转微信：
- 用户说"我要推荐"、"有人选"、"帮你推荐"
- 用户说"加微信"、"微信联系"、"私信"
- 用户说"我是HR"、"帮朋友看"、"我有人选"
- 用户问题涉及具体薪资谈判、面试安排、offer细节
- 用户明确要求人工服务
- 用户提供的背景信息需要猎头深度匹配

【转人工话术模板】（必须使用以下格式，让前端能识别）
当识别到上述信号时，在回复末尾加上：
"\n\n💬 好的，我来帮您对接！
请长按复制顾问微信（任选其一）：
• LieYing-5198
• EliteBridge5198  
• lieying5198
（如您在微信朋友圈看到此链接，说明已加过其他微信，无需重复添加~）
或直接在本页面留下您的【姓名+电话+微信号】，顾问会在24小时内联系您~"

【绝对禁止】
- 禁止透露客户公司真实名称
- 禁止承诺具体薪资数字
- 禁止透露候选人具体人名
- 不要重复询问基本信息

【允许回答】
- 岗位职责和发展方向
- 任职要求（通用描述）
- 公司行业和规模（模糊描述）
- 为什么这个职位是个好机会
- 如何准备面试
- 薪资行情分析

用中文回答，语气亲切自然。`
}

// ==============================================
// 主处理函数
// ==============================================

export async function POST(request: NextRequest) {
  const body = await request.json()
  const {
    jobId,
    sessionId: providedSessionId,
    message,
    history = [],
    candidateName,
    candidatePhone,
    candidateWechat,
    consultantId,
  } = body

  if (!jobId || !message) {
    return NextResponse.json({ success: false, error: '缺少参数' }, { status: 400 })
  }

  // 1. 获取职位信息
  const { job, source } = await getJob(jobId)
  if (!job) {
    return NextResponse.json({ success: false, error: '职位不存在' }, { status: 404 })
  }

  console.log(`[AI Chat] 数据源: ${source} | 职位: ${job.title}`)

  // 2. 管理会话 ID（持久化核心）
  const sessionId = providedSessionId || generateSessionId(jobId)
  const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined

  // 3. 并行执行：保存用户消息 + 构建 RAG 上下文
  const [saveResult] = await Promise.all([
    // 保存用户消息（对话持久化）
    isSupabaseConfigured()
      ? saveConversation({
          jobId,
          sessionId,
          message,
          role: 'user',
          candidateName,
          candidatePhone,
          candidateWechat,
          ipAddress,
        })
      : Promise.resolve({ success: false, error: 'not configured' }),
  ])

  // 4. 构建 RAG 上下文（对话历史 + 向量检索 + 顾问上下文 + IMA知识库）
  const ragContext = await buildRagContext({
    jobId,
    sessionId,
    userMessage: message,
    consultantId: consultantId || job.consultant_id,
  })

  // 5. 构建增强 System Prompt
  const baseSystemPrompt = buildBaseSystemPrompt(job, consultantId)
  const systemPrompt = buildEnhancedSystemPrompt(baseSystemPrompt, ragContext)

  if (ragContext.conversationSummary) {
    console.log('[AI Chat] 已注入对话历史上下文')
  }
  if (ragContext.relatedJobs?.length) {
    console.log(`[AI Chat] 已注入 ${ragContext.relatedJobs.length} 个相关职位`)
  }
  if (ragContext.consultantContext) {
    console.log('[AI Chat] 已注入顾问个性化上下文')
  }
  if (ragContext.knowledgeBaseContent) {
    console.log('[AI Chat] 已注入 IMA 知识库内容')
  }

  // 6. 准备消息历史（从数据库加载 + 传入的历史合并）
  let messagesForAI: { role: 'system' | 'user' | 'assistant'; content: string }[] = []

  if (isSupabaseConfigured()) {
    // 从数据库加载历史对话
    const { messages: dbMessages } = await loadConversation({ jobId, sessionId })
    if (dbMessages && dbMessages.length > 0) {
      messagesForAI = dbMessages.slice(-20).map((m: any) => ({
        role: m.role,
        content: m.content,
      }))
    }
  }

  // 合并传入的历史（防止数据库未配置时使用内存历史）
  const mergedHistory = messagesForAI.length > 0
    ? messagesForAI
    : history.slice(-10).map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

  // 7. 初始化 AI 客户端（优先 SiliconFlow）
  const siliconFlowKey = process.env.SILICONFLOW_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY
  const OpenAI = (await import('openai')).default

  let model: string
  let client: InstanceType<typeof OpenAI>

  if (siliconFlowKey) {
    client = new OpenAI({
      apiKey: siliconFlowKey,
      baseURL: 'https://api.siliconflow.cn/v1',
    })
    model = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-72B-Instruct'
    console.log('[AI Chat] 使用硅基流动 API')
  } else if (openaiKey) {
    client = new OpenAI({ apiKey: openaiKey })
    model = process.env.OPENAI_MODEL || 'gpt-4o'
    console.log('[AI Chat] 使用 OpenAI API')
  } else {
    return NextResponse.json({
      success: false,
      error: 'AI服务未配置',
      message: '当前AI客服正在配置中，请稍后再试。',
    }, { status: 503 })
  }

  // 8. 构建最终消息列表
  const finalMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...mergedHistory,
    { role: 'user' as const, content: message },
  ]

  // 9. 调用 AI 流式输出
  let aiReplyText = ''

  try {
    const stream = await client.chat.completions.create({
      model,
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 500,
      stream: true,
    })

    const encoder = new TextEncoder()

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              aiReplyText += text
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
            }
          }

          // 流结束后：保存 AI 回复 + 返回 sessionId
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            sessionId,
            done: true,
          })}\n\n`))
          controller.close()

          // 后台保存 AI 回复（不阻塞响应）
          if (isSupabaseConfigured()) {
            saveConversation({
              jobId,
              sessionId,
              message: aiReplyText,
              role: 'assistant',
            }).catch(err => console.warn('[AI Chat] 保存AI回复失败:', err.message))
          }
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new NextResponse(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Session-Id': sessionId, // 返回 sessionId 给前端
      },
    })
  } catch (error: any) {
    console.error('[AI Chat] API 错误:', error.message)
    return NextResponse.json({
      success: false,
      error: error.message || 'AI服务调用失败',
    }, { status: 500 })
  }
}
