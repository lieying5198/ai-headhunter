// src/lib/ai/rag.ts
// RAG（检索增强生成）工具
// 功能：为 AI 对话注入相关上下文（对话历史 + 向量检索 + 顾问上下文）

import { createServiceClient } from '@/lib/supabase/server'
import { generateEmbedding } from './embedding'
import { loadConversation, extractConversationSummary, type ConversationContext } from '@/lib/conversation'

// ==============================================
// 类型定义
// ==============================================
export interface RagContext {
  /** 对话历史摘要 */
  conversationSummary?: string
  /** 从向量检索中找到的相关职位 */
  relatedJobs?: Array<{
    id: string
    title: string
    similarity: number
    summary?: string
  }>
  /** 顾问上下文（AI 个性化） */
  consultantContext?: {
    specialty?: string
    communicationStyle?: string
    recentWins?: string
  }
  /** IMA 知识库检索结果 */
  knowledgeBaseContent?: string
}

// ==============================================
// 核心函数：构建 RAG 上下文
// ==============================================

/**
 * 获取完整 RAG 上下文（对话历史 + 向量检索 + 顾问上下文）
 * 在 AI 回复前调用，为 System Prompt 注入个性化内容
 */
export async function buildRagContext(params: {
  jobId: string
  sessionId: string
  userMessage: string
  consultantId?: string
}): Promise<RagContext> {
  const supabase = createServiceClient()
  const context: RagContext = {}

  // 1. 加载对话历史（AI 越聊越懂用户）
  if (params.sessionId) {
    const { messages, context: convContext } = await loadConversation({
      jobId: params.jobId,
      sessionId: params.sessionId,
    })

    if (messages && messages.length > 0) {
      context.conversationSummary = extractConversationSummary(messages)
      console.log(`[RAG] 加载对话历史 ${messages.length} 条`)
    }
  }

  // 2. 向量检索（语义搜索相关职位）
  if (supabase) {
    try {
      const queryResult = await generateEmbedding(params.userMessage)
      if (queryResult) {
        const { data } = await supabase.rpc('match_jobs', {
          query_embedding: queryResult.embedding,
          match_threshold: 0.6,  // 适度放宽，找更多相关内容
          match_count: 3,
        })
        if (data && data.length > 0) {
          context.relatedJobs = data.map((j: any) => ({
            id: j.id,
            title: j.title,
            similarity: j.similarity,
            summary: j.summary,
          }))
          console.log(`[RAG] 向量检索找到 ${data.length} 个相关职位`)
        }
      }
    } catch (err: any) {
      console.warn('[RAG] 向量检索失败（embedding 可能尚未生成）:', err.message)
      // 不阻塞，向量检索失败不影响对话
    }
  }

  // 3. 顾问上下文（顾问 AI 个性化）
  if (params.consultantId && supabase) {
    try {
      const { data } = await supabase
        .from('consultant_context')
        .select('*')
        .eq('consultant_id', params.consultantId)
        .single()

      if (data) {
        context.consultantContext = {
          specialty: data.specialty,
          communicationStyle: data.communication_style,
          recentWins: data.recent_wins,
        }
        console.log(`[RAG] 加载顾问上下文: ${data.specialty || '未设置'}`)
      }
    } catch {
      // 顾问上下文不存在也继续
    }
  }

  // 4. IMA 知识库检索（可选）
  const { searchKnowledgeBase } = await import('./ima-knowledge')
  const kbContent = await searchKnowledgeBase(params.userMessage)
  if (kbContent) {
    context.knowledgeBaseContent = kbContent
    console.log('[RAG] IMA 知识库检索命中')
  }

  return context
}

// ==============================================
// 构建增强后的 System Prompt
// ==============================================

/**
 * 将 RAG 上下文注入到 System Prompt
 * 返回增强后的 system prompt
 */
export function buildEnhancedSystemPrompt(
  basePrompt: string,
  ragContext: RagContext
): string {
  const additions: string[] = []

  // 注入 IMA 知识库内容（最高优先级）
  if (ragContext.knowledgeBaseContent) {
    additions.push(`\n【知识库参考】（如有冲突以此为准）\n${ragContext.knowledgeBaseContent}`)
  }

  // 注入顾问上下文（AI 个性化）
  if (ragContext.consultantContext) {
    const cc = ragContext.consultantContext
    const consultantSection = [
      '\n【顾问个性化设置】',
      cc.specialty && `- 专注领域：${cc.specialty}`,
      cc.communicationStyle && `- 沟通风格：${cc.communicationStyle}`,
      cc.recentWins && `- 近期成功案例：${cc.recentWins}`,
    ].filter(Boolean).join('\n')
    if (consultantSection !== '\n【顾问个性化设置】') {
      additions.push(consultantSection)
    }
  }

  // 注入对话历史（让 AI "记住"用户）
  if (ragContext.conversationSummary) {
    additions.push(`\n【对话历史摘要】\n${ragContext.conversationSummary}\n（AI 可基于以上历史提供更个性化的回复）`)
  }

  // 注入相关职位（跨职位推荐可能性）
  if (ragContext.relatedJobs && ragContext.relatedJobs.length > 0) {
    const jobsList = ragContext.relatedJobs
      .map(j => `- ${j.title}（相关度 ${Math.round(j.similarity * 100)}%）`)
      .join('\n')
    additions.push(`\n【相关职位参考】\n${jobsList}\n（如用户有相关背景可适当推荐）`)
  }

  if (additions.length === 0) return basePrompt

  return basePrompt + additions.join('\n')
}
