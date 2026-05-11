// src/lib/ai/openai.ts
// OpenAI 客户端配置

import OpenAI from 'openai'

export const MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

// 懒加载 OpenAI 客户端（避免构建时缺少 API Key 报错）
let _openai: OpenAI | null = null
export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return _openai
}

// ==============================================
// JD 解析
// ==============================================
export async function parseJD(rawJD: string) {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是专业的猎头JD分析师。从原始职位描述中提取结构化信息，以JSON格式返回。

返回格式：
{
  "title": "职位标题",
  "company_name": "公司名称（如有）",
  "industry": "行业",
  "job_function": "职能类别",
  "city": "城市",
  "salary_min": 数字（万/年，无则null）,
  "salary_max": 数字（万/年，无则null）,
  "level": "职级（初级/中级/高级/专家/总监/VP/C-level）",
  "reporting_to": "汇报对象",
  "team_size": "团队规模",
  "responsibilities": ["职责1", "职责2", ...],
  "requirements": ["要求1", "要求2", ...],
  "preferred": ["优先条件1", ...],
  "tags": ["标签1", "标签2", ...],
  "summary": "80字以内的职位摘要"
}

注意：
- 薪资统一换算为万/年
- tags 包含行业、职能、薪资区间、城市等维度（最多8个）
- summary 要简洁吸引人`,
      },
      {
        role: 'user',
        content: `请解析以下JD：\n\n${rawJD}`,
      },
    ],
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('OpenAI返回空内容')

  return JSON.parse(content)
}

// ==============================================
// JD 脱敏
// ==============================================
export async function anonymizeJD(rawJD: string, companyInfo?: {
  realName?: string
  industry?: string
}) {
  const systemPrompt = `你是信息安全专家，负责对职位描述进行脱敏处理。

脱敏规则：
1. 公司名称 → 模糊描述：
   - 上市公司 → "某A股/港股/美股上市公司"
   - 头部企业 → "某头部[行业]企业"
   - 知名公司 → "某知名[行业]集团"
   - 创业公司 → "某快速成长的[行业]公司"
2. 人名 → 职位（"向张明汇报" → "向高管层汇报"）
3. 具体部门名 → "相关部门" 或 "核心团队"
4. 营收/利润等财务数字 → 删除
5. 融资信息 → "已完成多轮融资"
6. 客户名称 → 删除

保留：
- 职位职责描述
- 任职要求
- 薪资范围
- 城市
- 团队规模
- 发展前景

返回完整的脱敏后JD文本，格式与原文一致。`

  const userContent = companyInfo?.realName
    ? `请对以下JD进行脱敏（公司：${companyInfo.realName}，行业：${companyInfo.industry || '未知'}）：\n\n${rawJD}`
    : `请对以下JD进行脱敏：\n\n${rawJD}`

  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })

  return response.choices[0].message.content || ''
}

// ==============================================
// 简历初筛
// ==============================================
export async function screenResume(resumeText: string, jobInfo: {
  title: string
  industry?: string
  level?: string
  requirements: string[]
  responsibilities: string[]
  anonymized_jd?: string
}) {
  const response = await getOpenAI().chat.completions.create({
    model: MODEL,
    temperature: 0.1,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `你是专业猎头评估专家，对候选人与职位的匹配度进行客观评估。

评估维度（0-100分）：
1. industry_match: 行业匹配度（行业经验相关性）
2. level_match: 职级匹配度（职级/资历是否符合）
3. stability: 稳定性评分（平均任职时长，频繁跳槽扣分）
4. management_exp: 管理经验（有管理经验加分）
5. project_exp: 项目经验（相关项目数量和规模）

综合评级：
- A（90-100）: 强烈推荐
- B（75-89）: 推荐
- C（60-74）: 考虑
- D（60以下）: 不推荐

返回JSON：
{
  "industry_match": 数字,
  "level_match": 数字,
  "stability": 数字,
  "management_exp": 数字,
  "project_exp": 数字,
  "overall_numeric": 综合分数,
  "overall_score": "A/B/C/D",
  "recommendation": "推荐理由（100字内）",
  "risks": "风险提示（50字内）",
  "summary": "候选人简介（80字内）"
}`,
      },
      {
        role: 'user',
        content: `目标职位：
标题：${jobInfo.title}
行业：${jobInfo.industry || '未知'}
职级：${jobInfo.level || '未知'}
岗位职责：${jobInfo.responsibilities.slice(0, 5).join('；')}
任职要求：${jobInfo.requirements.slice(0, 5).join('；')}

候选人简历：
${resumeText.slice(0, 3000)}`,
      },
    ],
  })

  const content = response.choices[0].message.content
  if (!content) throw new Error('OpenAI返回空内容')

  return JSON.parse(content)
}

// ==============================================
// AI 聊天（流式）
// ==============================================
export async function createChatStream(messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
  return getOpenAI().chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    stream: true,
    messages,
  })
}
