// src/app/api/upload/resume/route.ts
// 上传简历 → 解析文本 → AI初筛

import { createServiceClient } from '@/lib/supabase/server'
import { parseFile } from '@/lib/utils/file-parser'
import { screenResume } from '@/lib/ai/openai'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File
  const jobId = formData.get('jobId') as string
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const phone = formData.get('phone') as string

  if (!file) {
    return NextResponse.json({ success: false, error: '请上传简历文件' }, { status: 400 })
  }
  if (!jobId) {
    return NextResponse.json({ success: false, error: '缺少职位ID' }, { status: 400 })
  }

  // 文件大小限制 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: '文件大小不能超过10MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const serviceClient = createServiceClient()

  if (!serviceClient) {
    return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 })
  }

  // Step 1: 获取职位信息
  const { data: job, error: jobError } = await serviceClient
    .from('jobs')
    .select('id, title, industry, level, requirements, responsibilities, apply_count')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ success: false, error: '职位不存在' }, { status: 404 })
  }

  // Step 2: 解析简历文本
  let parsedText = ''
  try {
    parsedText = await parseFile(buffer, file.type)
  } catch (parseError) {
    return NextResponse.json({ success: false, error: `文件解析失败: ${parseError}` }, { status: 400 })
  }

  if (!parsedText.trim()) {
    return NextResponse.json({ success: false, error: '简历内容为空，请检查文件' }, { status: 400 })
  }

  // Step 3: 上传文件到 Supabase Storage
  const fileName = `resumes/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from('resumes')
    .upload(fileName, buffer, { contentType: file.type })

  if (uploadError) {
    console.error('文件上传失败:', uploadError)
    // 不中断流程，继续处理
  }

  // Step 4: 创建候选人记录
  const { data: candidate, error: candidateError } = await serviceClient
    .from('candidates')
    .insert({
      name: name || parsedText.split('\n')[0].slice(0, 20) || '未知候选人',
      email: email || null,
      phone: phone || null,
      status: 'screening',
      source: 'platform',
    })
    .select()
    .single()

  if (candidateError) {
    return NextResponse.json({ success: false, error: '创建候选人失败' }, { status: 500 })
  }

  // Step 5: 创建简历记录
  const { data: resume } = await serviceClient
    .from('resumes')
    .insert({
      candidate_id: candidate.id,
      job_id: jobId,
      file_url: uploadData?.path || fileName,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      parsed_text: parsedText.slice(0, 10000), // 限制存储长度
    })
    .select()
    .single()

  // Step 6: AI 初筛
  let aiScore = null
  try {
    const scoreData = await screenResume(parsedText, {
      title: job.title,
      industry: job.industry,
      level: job.level,
      requirements: job.requirements || [],
      responsibilities: job.responsibilities || [],
    })

    const { data: scoreRecord } = await serviceClient
      .from('ai_scores')
      .insert({
        candidate_id: candidate.id,
        job_id: jobId,
        resume_id: resume?.id,
        industry_match: scoreData.industry_match,
        level_match: scoreData.level_match,
        stability: scoreData.stability,
        management_exp: scoreData.management_exp,
        project_exp: scoreData.project_exp,
        overall_score: scoreData.overall_score,
        overall_numeric: scoreData.overall_numeric,
        recommendation: scoreData.recommendation,
        risks: scoreData.risks,
        summary: scoreData.summary,
        raw_response: JSON.stringify(scoreData),
      })
      .select()
      .single()

    aiScore = scoreRecord

    // 更新候选人状态
    await serviceClient
      .from('candidates')
      .update({ status: 'screened' })
      .eq('id', candidate.id)

    // 增加职位申请计数
    try {
      await serviceClient.rpc('increment_apply_count', { job_id: jobId })
    } catch {
      await serviceClient.from('jobs').update({ apply_count: (job.apply_count ?? 0) + 1 }).eq('id', jobId)
    }

  } catch (screenError) {
    console.error('AI初筛失败:', screenError)
    // 不中断流程
  }

  return NextResponse.json({
    success: true,
    data: {
      candidate_id: candidate.id,
      resume_id: resume?.id,
      ai_score: aiScore,
    },
    message: aiScore ? `初筛完成，综合评级：${aiScore.overall_score}` : '简历已上传，等待初筛',
  })
}
