// scripts/batch_embed_jobs.ts
// 批量为职位生成 embedding 并写入 Supabase
// 用法：node --experimental-specifier-resolution=node scripts/batch_embed_jobs.js
// 或：npx ts-node scripts/batch_embed_jobs.ts（需要 ts-node）
//
// 前置条件：
// 1. 已在 Supabase 执行 migration_pgvector.sql
// 2. NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 已配置在 .env.local
// 3. SILICONFLOW_API_KEY 或 OPENAI_API_KEY 已配置

import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import * as fs from 'fs'
import * as path from 'path'

// ==============================================
// 配置
// ==============================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const siliconFlowKey = process.env.SILICONFLOW_API_KEY
const openaiKey = process.env.OPENAI_API_KEY

const EMBEDDING_MODEL = 'BAAI/bge-large-zh-v1.5' // 中文优化，1024维
const BATCH_SIZE = 20
const EMBEDDING_DIM = 1024

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ 缺少 Supabase 配置')
  process.exit(1)
}

// ==============================================
// 初始化客户端
// ==============================================
const supabase = createClient(supabaseUrl, serviceRoleKey)

let embeddingClient: OpenAI | null = null
if (siliconFlowKey) {
  embeddingClient = new OpenAI({
    apiKey: siliconFlowKey,
    baseURL: 'https://api.siliconflow.cn/v1',
  })
  console.log('✅ 使用 SiliconFlow API')
} else if (openaiKey) {
  embeddingClient = new OpenAI({ apiKey: openaiKey })
  console.log('✅ 使用 OpenAI API')
} else {
  console.error('❌ 未配置任何 embedding API（SiliconFlow 或 OpenAI）')
  process.exit(1)
}

// ==============================================
// 核心逻辑
// ==============================================

/**
 * 生成单条文本的 embedding
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await embeddingClient!.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    })
    return response.data[0]?.embedding || null
  } catch (error: any) {
    console.error(`  ❌ 生成失败: ${error.message}`)
    return null
  }
}

/**
 * 构造职位的 embedding 文本
 */
function buildJobText(job: any): string {
  const parts = [
    job.title,
    job.city && `工作城市：${job.city}`,
    job.level && `职级：${job.level}`,
    job.industry && `行业：${job.industry}`,
    job.job_function && `职能：${job.job_function}`,
    Array.isArray(job.tags) ? job.tags.join('、') : job.tags,
    job.summary,
  ].filter(Boolean)
  return parts.join(' | ')
}

/**
 * 主流程
 */
async function main() {
  console.log('🚀 开始批量生成职位 embedding...\n')

  // 1. 从 Supabase 获取所有未 embedding 的已发布职位
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('id, title, city, level, industry, job_function, tags, summary')
    .eq('is_published', true)
    .is('embedding', null) // 只处理还没有 embedding 的职位

  if (error) {
    console.error('❌ 查询职位失败:', error.message)
    process.exit(1)
  }

  if (!jobs || jobs.length === 0) {
    console.log('✅ 所有职位已有 embedding，无需处理')
    process.exit(0)
  }

  console.log(`📋 共 ${jobs.length} 个职位需要生成 embedding\n`)

  let successCount = 0
  let failCount = 0

  // 2. 批量处理
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(jobs.length / BATCH_SIZE)

    console.log(`\n📦 批次 ${batchNum}/${totalBatches}（${batch.length} 个职位）`)

    for (const job of batch) {
      const text = buildJobText(job)
      const embedding = await generateEmbedding(text)

      if (embedding && embedding.length === EMBEDDING_DIM) {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ embedding })
          .eq('id', job.id)

        if (updateError) {
          console.error(`  ❌ ${job.title}: 更新失败 - ${updateError.message}`)
          failCount++
        } else {
          console.log(`  ✅ ${job.title}`)
          successCount++
        }
      } else {
        console.error(`  ❌ ${job.title}: 生成失败或维度不匹配（${embedding?.length || 0}维）`)
        failCount++
      }

      // 批次内间隔（避免限流）
      await new Promise(r => setTimeout(r, 300))
    }
  }

  // 3. 统计结果
  console.log(`\n${'='.repeat(40)}`)
  console.log(`✅ 成功: ${successCount} 个`)
  console.log(`❌ 失败: ${failCount} 个`)
  console.log(`${'='.repeat(40)}`)

  // 4. 如果本地也有 jobs.json，同步生成 embedding 文件（可选）
  try {
    const localPath = path.join(process.cwd(), 'public', 'data', 'jobs.json')
    if (fs.existsSync(localPath)) {
      const localJobs = JSON.parse(fs.readFileSync(localPath, 'utf-8'))
      const localEmbeddings: Record<string, number[]> = {}

      for (const job of localJobs.slice(0, 10)) { // 限制本地处理数量
        const text = buildJobText(job)
        const embedding = await generateEmbedding(text)
        if (embedding) {
          localEmbeddings[job.id] = embedding
        }
        await new Promise(r => setTimeout(r, 300))
      }

      const embPath = path.join(process.cwd(), 'public', 'data', 'job_embeddings.json')
      fs.writeFileSync(embPath, JSON.stringify(localEmbeddings, null, 2))
      console.log(`\n💾 本地 embedding 已保存到 public/data/job_embeddings.json`)
    }
  } catch (err) {
    // 本地 embedding 失败不影响主流程
  }
}

main().catch(console.error)
