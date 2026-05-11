// src/lib/conversation.ts
// AI 对话持久化 - 支持保存、加载、更新对话记录
// AI 持续学习的基础：记住用户的偏好、问题历史

import { createServiceClient } from './supabase/server'

// ==============================================
// 类型定义
// ==============================================
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface ConversationContext {
  candidateName?: string
  candidateTitle?: string
  candidateCompany?: string
  candidateExperience?: number
  keyRequirements?: string[]
  userPreferences?: string[]
  [key: string]: any
}

export interface ConversationRecord {
  id: string
  job_id: string
  session_id: string
  candidate_name?: string
  candidate_phone?: string
  candidate_wechat?: string
  messages: ChatMessage[]
  context: ConversationContext
  message_count: number
  last_message_at: string
  created_at: string
}

// ==============================================
// 核心函数
// ==============================================

/**
 * 生成会话 ID（基于职位ID + 客户端标识）
 * 如果已有 sessionId 就复用，没有则新建
 */
export function generateSessionId(jobId: string, clientId?: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  const base = clientId ? `${jobId}-${clientId}` : jobId
  return `${base}-${timestamp}-${random}`
}

/**
 * 保存或更新对话（每次用户发消息时调用）
 * - 新会话：创建记录
 * - 已有会话：追加消息，更新 last_message_at
 */
export async function saveConversation(params: {
  jobId: string
  sessionId: string
  message: string
  role: 'user' | 'assistant'
  context?: ConversationContext
  candidateName?: string
  candidatePhone?: string
  candidateWechat?: string
  ipAddress?: string
}): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const supabase = createServiceClient()
  if (!supabase) {
    return { success: false, error: '数据库未配置' }
  }

  try {
    // 1. 先查找是否有这个 sessionId 的对话
    const { data: existing } = await supabase
      .from('ai_conversations')
      .select('id, messages, context, message_count, candidate_name')
      .eq('session_id', params.sessionId)
      .eq('job_id', params.jobId)
      .single()

    const now = new Date().toISOString()
    const newMessage: ChatMessage = {
      role: params.role,
      content: params.message,
      timestamp: now,
    }

    if (existing) {
      // 已有会话：追加消息
      const updatedMessages = [...(existing.messages || []), newMessage]
      const updatedCount = (existing.message_count || 0) + 1

      // 合并上下文（新的覆盖旧的）
      const mergedContext = {
        ...(existing.context || {}),
        ...(params.context || {}),
      }

      // 如果用户第一次留了姓名，更新 candidate_name
      const nameToUse = params.candidateName || existing.candidate_name

      const { error } = await supabase
        .from('ai_conversations')
        .update({
          messages: updatedMessages,
          context: mergedContext,
          message_count: updatedCount,
          last_message_at: now,
          candidate_name: nameToUse,
          candidate_phone: params.candidatePhone || undefined,
          candidate_wechat: params.candidateWechat || undefined,
          updated_at: now,
        })
        .eq('id', existing.id)

      if (error) {
        console.error('[Conversation] 更新对话失败:', error.message)
        return { success: false, error: error.message }
      }

      return { success: true, conversationId: existing.id }
    } else {
      // 新会话：创建记录
      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          job_id: params.jobId,
          session_id: params.sessionId,
          messages: [newMessage],
          context: params.context || {},
          candidate_name: params.candidateName,
          candidate_phone: params.candidatePhone,
          candidate_wechat: params.candidateWechat,
          message_count: 1,
          last_message_at: now,
          ip_address: params.ipAddress,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[Conversation] 创建对话失败:', error.message)
        return { success: false, error: error.message }
      }

      return { success: true, conversationId: data.id }
    }
  } catch (err: any) {
    console.error('[Conversation] 异常:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * 加载对话历史（用户发消息时恢复上下文）
 */
export async function loadConversation(params: {
  jobId: string
  sessionId: string
}): Promise<{ success: boolean; conversation?: ConversationRecord; messages?: ChatMessage[]; context?: ConversationContext }> {
  const supabase = createServiceClient()
  if (!supabase) {
    return { success: false }
  }

  try {
    const { data, error } = await supabase
      .from('ai_conversations')
      .select('*')
      .eq('session_id', params.sessionId)
      .eq('job_id', params.jobId)
      .single()

    if (error || !data) {
      return { success: false }
    }

    return {
      success: true,
      conversation: data as ConversationRecord,
      messages: data.messages || [],
      context: data.context || {},
    }
  } catch {
    return { success: false }
  }
}

/**
 * 提取对话摘要（用于 RAG 检索）
 * 从对话历史中提取关键信息：用户背景、需求、偏好
 */
export function extractConversationSummary(messages: ChatMessage[]): string {
  const userMessages = messages.filter(m => m.role === 'user').slice(-10)
  const assistantMessages = messages.filter(m => m.role === 'assistant').slice(-5)

  const userContent = userMessages.map(m => m.content).join('\n---\n')
  const assistantContent = assistantMessages.map(m => m.content).join('\n---\n')

  return `【用户最近提问】\n${userContent}\n\n【AI 最近回复摘要】\n${assistantContent.slice(0, 500)}`
}

/**
 * 收集候选人信息（用户留联系方式时）
 */
export async function saveLead(params: {
  conversationId?: string
  jobId: string
  name: string
  phone?: string
  wechat?: string
  currentTitle?: string
  currentCompany?: string
  experienceYears?: number
}): Promise<{ success: boolean; leadId?: string; error?: string }> {
  const supabase = createServiceClient()
  if (!supabase) {
    return { success: false, error: '数据库未配置' }
  }

  try {
    const { data, error } = await supabase
      .from('conversation_leads')
      .insert({
        conversation_id: params.conversationId,
        job_id: params.jobId,
        name: params.name,
        phone: params.phone,
        wechat: params.wechat,
        current_title: params.currentTitle,
        current_company: params.currentCompany,
        experience_years: params.experienceYears,
        source: 'ai_chat',
        status: 'new',
      })
      .select('id')
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, leadId: data.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * 记录反馈（顾问评价 AI 回复）
 */
export async function saveFeedback(params: {
  conversationId: string
  messageIndex?: number
  consultantRating: number
  consultantComment?: string
  isPositive?: boolean
}): Promise<{ success: boolean }> {
  const supabase = createServiceClient()
  if (!supabase) return { success: false }

  try {
    await supabase.from('ai_feedback').insert({
      conversation_id: params.conversationId,
      message_index: params.messageIndex,
      consultant_rating: params.consultantRating,
      consultant_comment: params.consultantComment,
      is_positive: params.isPositive,
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
