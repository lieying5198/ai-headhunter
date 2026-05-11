// src/lib/ai/embedding.ts
// 文本向量化工具 - 支持 SiliconFlow（国内）、OpenAI（海外）
// 使用 text-embedding-3-small（1536维）或 bge-large-zh-v1.5（1024维）

import OpenAI from 'openai'

// ==============================================
// 辅助函数：获取 AI 客户端
// ==============================================
async function getEmbeddingClient(): Promise<{ client: InstanceType<typeof OpenAI>; baseURL: string } | null> {
  const siliconFlowKey = process.env.SILICONFLOW_API_KEY
  const openaiKey = process.env.OPENAI_API_KEY

  if (siliconFlowKey) {
    const client = new OpenAI({
      apiKey: siliconFlowKey,
      baseURL: 'https://api.siliconflow.cn/v1',
    })
    return { client, baseURL: 'siliconflow' }
  }

  if (openaiKey) {
    const client = new OpenAI({ apiKey: openaiKey })
    return { client, baseURL: 'openai' }
  }

  return null
}

// ==============================================
// 核心函数：生成单条文本的 embedding 向量
// ==============================================
export async function generateEmbedding(
  text: string,
  options?: {
    model?: string
    dimensions?: number
  }
): Promise<{ embedding: number[]; model: string; dimensions: number } | null> {
  const result = await getEmbeddingClient()
  if (!result) {
    console.error('[Embedding] 未配置任何 AI API（SiliconFlow / OpenAI）')
    return null
  }

  const { client, baseURL } = result

  // SiliconFlow 支持的中文优化 embedding 模型
  const siliconFlowModels = [
    'BAAI/bge-large-zh-v1.5',  // 中文优化，1024维，推荐
    'BAAI/bge-large-zh-v15',   // 中文优化，1024维
    'thenlper/gte-large-zh',   // 中文通用，1024维
  ]

  // 决定使用哪个模型
  let model = options?.model
  if (!model) {
    model = baseURL === 'siliconflow' ? 'BAAI/bge-large-zh-v1.5' : 'text-embedding-3-small'
  }

  // 决定向量维度（text-embedding-3-small 支持 truncation）
  let dimensions = options?.dimensions
  if (!dimensions) {
    dimensions = baseURL === 'siliconflow' ? 1024 : 1536
  }

  try {
    const response = await client.embeddings.create({
      model,
      input: text.slice(0, 8000), // 截断超长文本
      ...(baseURL !== 'siliconflow' ? { dimensions } : {}), // OpenAI 支持 dimensions，SiliconFlow 不支持则省略
    })

    const embedding = response.data[0]?.embedding
    if (!embedding) {
      console.error('[Embedding] API 返回空 embedding')
      return null
    }

    console.log(`[Embedding] 成功，模型: ${model}, 维度: ${embedding.length}`)
    return {
      embedding,
      model,
      dimensions: embedding.length,
    }
  } catch (error: any) {
    console.error('[Embedding] 生成失败:', error.message)
    return null
  }
}

// ==============================================
// 批量生成 embedding（用于批量处理职位）
// ==============================================
export async function generateEmbeddings(
  texts: string[],
  options?: {
    model?: string
    batchSize?: number
  }
): Promise<Array<{ text: string; embedding: number[]; dimensions: number } | { text: string; error: string }>> {
  const result = await getEmbeddingClient()
  if (!result) return texts.map(t => ({ text: t, error: '未配置 API' }))

  const { client, baseURL } = result
  const model = options?.model || (baseURL === 'siliconflow' ? 'BAAI/bge-large-zh-v1.5' : 'text-embedding-3-small')
  const batchSize = options?.batchSize || 20

  const results: Array<{ text: string; embedding: number[]; dimensions: number } | { text: string; error: string }> = []

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const batchTexts = batch.map(t => t.slice(0, 8000))

    try {
      const response = await client.embeddings.create({
        model,
        input: batchTexts,
      })

      batch.forEach((text, idx) => {
        const emb = response.data[idx]?.embedding
        if (emb) {
          results.push({ text, embedding: emb, dimensions: emb.length })
        } else {
          results.push({ text, error: '未返回 embedding' })
        }
      })
    } catch (error: any) {
      console.error(`[Embedding] 批次 ${i / batchSize + 1} 失败:`, error.message)
      batch.forEach(text => results.push({ text, error: error.message }))
    }

    // 批次间隔（避免限流）
    if (i + batchSize < texts.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  return results
}

// ==============================================
// 向量检索：基于 embedding 找相似职位（应用层实现）
// 注意：这里只负责生成查询文本的 embedding
// 实际的向量检索由 Supabase RPC 函数 match_jobs 实现
// ==============================================
export async function searchSimilarJobs(
  queryText: string,
  supabase: any,
  options?: {
    matchThreshold?: number
    matchCount?: number
  }
) {
  const embeddingResult = await generateEmbedding(queryText)
  if (!embeddingResult) return []

  const { data, error } = await supabase.rpc('match_jobs', {
    query_text: queryText,
    match_threshold: options?.matchThreshold ?? 0.7,
    match_count: options?.matchCount ?? 3,
  })

  if (error) {
    console.error('[Embedding] 向量检索失败:', error.message)
    return []
  }

  return data || []
}

// ==============================================
// 为职位生成 embedding 并更新到数据库
// ==============================================
export async function embedAndUpdateJob(supabase: any, job: {
  id: string
  title: string
  summary?: string
  tags?: string[]
  city?: string
  level?: string
}): Promise<boolean> {
  // 构造职位文本（用于 embedding）
  const text = [
    job.title,
    job.city && `工作地点：${job.city}`,
    job.level && `职级：${job.level}`,
    job.tags?.join('、'),
    job.summary,
  ].filter(Boolean).join(' | ')

  const result = await generateEmbedding(text)
  if (!result) return false

  const { error } = await supabase
    .from('jobs')
    .update({ embedding: result.embedding })
    .eq('id', job.id)

  if (error) {
    console.error(`[Embedding] 更新职位 ${job.id} 失败:`, error.message)
    return false
  }

  return true
}
