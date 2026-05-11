// src/app/api/ai/parse-jd/route.ts
// 上传文件或文本，AI解析JD + 脱敏 + 生成摘要

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { parseJD, anonymizeJD } from '@/lib/ai/openai'
import { parseFile } from '@/lib/utils/file-parser'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  let rawText = ''
  let jobId: string | undefined

  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    // 文件上传
    const formData = await request.formData()
    const file = formData.get('file') as File
    jobId = formData.get('jobId') as string || undefined

    if (!file) {
      return NextResponse.json({ success: false, error: '未上传文件' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    rawText = await parseFile(buffer, file.type)

    // 上传文件到 Supabase Storage
    const serviceClient = createServiceClient()
    if (!serviceClient) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 })
    }
    const fileName = `${user.id}/${Date.now()}-${file.name}`
    await serviceClient.storage
      .from('jd-files')
      .upload(fileName, buffer, { contentType: file.type })
  } else {
    // JSON 文本输入
    const body = await request.json()
    rawText = body.text || body.raw_jd || ''
    jobId = body.jobId
  }

  if (!rawText.trim()) {
    return NextResponse.json({ success: false, error: '内容为空' }, { status: 400 })
  }

  // Step 1: 结构化解析
  const parsed = await parseJD(rawText)

  // Step 2: 脱敏
  const anonymizedJD = await anonymizeJD(rawText, {
    realName: parsed.company_name,
    industry: parsed.industry,
  })

  // Step 3: 如有 jobId，更新数据库
  if (jobId) {
    const serviceClient = createServiceClient()

    if (!serviceClient) {
      return NextResponse.json({ success: false, error: '数据库未配置' }, { status: 500 })
    }

    // 检查或创建 hidden_company
    let hiddenCompanyId: string | undefined
    if (parsed.company_name) {
      const { data: existing } = await serviceClient
        .from('hidden_company_profiles')
        .select('id')
        .eq('real_name', parsed.company_name)
        .single()

      if (existing) {
        hiddenCompanyId = existing.id
      } else {
        // 让 AI 生成脱敏名称
        const anonymizedCompanyName = anonymizedJD.match(/某[^，。\n]{2,20}(?:公司|企业|集团|机构|平台)/)?.[0] || `某${parsed.industry || ''}知名企业`
        const { data: newCompany } = await serviceClient
          .from('hidden_company_profiles')
          .insert({
            real_name: parsed.company_name,
            anonymized_name: anonymizedCompanyName,
            industry: parsed.industry,
            created_by: user.id,
          })
          .select('id')
          .single()
        hiddenCompanyId = newCompany?.id
      }
    }

    await serviceClient
      .from('jobs')
      .update({
        title: parsed.title,
        industry: parsed.industry,
        job_function: parsed.job_function,
        city: parsed.city,
        salary_min: parsed.salary_min,
        salary_max: parsed.salary_max,
        level: parsed.level,
        raw_jd: rawText,
        anonymized_jd: anonymizedJD,
        summary: parsed.summary,
        tags: parsed.tags,
        requirements: parsed.requirements,
        responsibilities: parsed.responsibilities,
        hidden_company_id: hiddenCompanyId,
        status: 'processing',
      })
      .eq('id', jobId)
      .eq('consultant_id', user.id)
  }

  return NextResponse.json({
    success: true,
    data: {
      parsed,
      anonymized_jd: anonymizedJD,
    },
  })
}
