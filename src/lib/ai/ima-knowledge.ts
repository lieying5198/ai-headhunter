// src/lib/ai/ima-knowledge.ts
// 腾讯 IMA 知识库集成
// 当用户提问时，搜索 IMA 知识库获取相关文档片段
// 支持 IMA OpenAPI（可选功能，未配置时静默跳过）

// ==============================================
// 配置检查
// ==============================================
function isImaConfigured(): boolean {
  return !!(
    process.env.IMA_API_KEY ||
    process.env.IMA_APP_ID
  )
}

// ==============================================
// 搜索 IMA 知识库
// ==============================================

/**
 * 搜索 IMA 知识库（向量检索 + 全文检索）
 * @param query 用户问题
 * @param topK 返回条数
 * @returns 相关文档片段，未配置时返回 null
 */
export async function searchKnowledgeBase(
  query: string,
  topK: number = 3
): Promise<string | null> {
  if (!isImaConfigured()) {
    return null
  }

  try {
    // IMA OpenAPI 向量搜索接口
    const apiKey = process.env.IMA_API_KEY!
    const appId = process.env.IMA_APP_ID || process.env.NEXT_PUBLIC_IMA_APP_ID

    const response = await fetch(
      `https://api.ima.tencent.com/v1/knowledge/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          top_k: topK,
          app_id: appId,
          use_rerank: true,
        }),
      }
    )

    if (!response.ok) {
      console.warn(`[IMA Knowledge] API 错误: ${response.status}`)
      return null
    }

    const data = await response.json()
    const results = data.results || data.hits || []

    if (!results.length) return null

    // 拼接相关文档片段
    const content = results
      .slice(0, topK)
      .map((r: any, idx: number) =>
        `【参考${idx + 1}】${r.title ? `来源：${r.title}` : ''}\n${r.content || r.text || r.chunk || ''}`
      )
      .join('\n\n')

    console.log(`[IMA Knowledge] 检索到 ${results.length} 条结果`)
    return content.slice(0, 2000) // 限制上下文长度
  } catch (error: any) {
    console.warn('[IMA Knowledge] 搜索失败:', error.message)
    return null
  }
}

// ==============================================
// 同步文档到 IMA 知识库（可选）
// ==============================================

/**
 * 将职位信息同步到 IMA 知识库
 * 在创建/更新职位时调用
 */
export async function syncJobToIma(job: {
  id: string
  title: string
  summary?: string
  tags?: string[]
}): Promise<boolean> {
  if (!isImaConfigured()) return false

  try {
    const apiKey = process.env.IMA_API_KEY!
    const response = await fetch(
      'https://api.ima.tencent.com/v1/knowledge/chunk',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          title: job.title,
          content: [
            job.title,
            job.summary,
            job.tags?.join('、'),
          ].filter(Boolean).join('\n'),
          source_id: `job_${job.id}`,
          metadata: {
            type: 'job',
            job_id: job.id,
          },
        }),
      }
    )

    return response.ok
  } catch {
    return false
  }
}

// ==============================================
// 获取顾问在 IMA 的文档（可选上下文来源）
// ==============================================

/**
 * 从 IMA 获取顾问提供的参考文档
 * 可用于加载"FAQ"、"面试指南"等
 */
export async function getConsultantDocuments(consultantId: string): Promise<string[]> {
  if (!isImaConfigured()) return []

  try {
    const apiKey = process.env.IMA_API_KEY!
    const response = await fetch(
      `https://api.ima.tencent.com/v1/knowledge/list?source_id=consultant_${consultantId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    )

    if (!response.ok) return []
    const data = await response.json()
    return (data.documents || []).map((d: any) => d.content || '')
  } catch {
    return []
  }
}
