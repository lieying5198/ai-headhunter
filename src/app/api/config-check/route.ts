// src/app/api/config-check/route.ts
// 环境配置检查接口
// 当前项目使用本地 JSON 数据 + 硅基流动 API，无需 Supabase

import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  const hasSiliconFlow = !!process.env.SILICONFLOW_API_KEY
  const hasLocalData = checkLocalData()

  const configured = hasSiliconFlow && hasLocalData

  return NextResponse.json({
    configured,
    checks: {
      siliconFlow: hasSiliconFlow,
      localData: hasLocalData,
    },
    message: configured 
      ? '环境配置完成' 
      : '请配置 SILICONFLOW_API_KEY 并确保 public/data/jobs.json 存在',
  })
}

function checkLocalData(): boolean {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'jobs.json')
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return Array.isArray(data) && data.length > 0
  } catch {
    return false
  }
}
