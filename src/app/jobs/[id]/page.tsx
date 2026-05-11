// src/app/jobs/[id]/page.tsx
// 精美职位详情页 - 适合朋友圈传播，移动端优先

import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import JobDetailClient from '@/components/job/JobDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  // 未配置数据库时使用静态数据
  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-5xl mb-4">⚙️</div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">数据库未配置</h2>
          <p className="text-gray-500">请配置 Supabase 环境变量</p>
        </div>
      </div>
    )
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      id, title, industry, job_function, city, salary_min, salary_max,
      level, anonymized_jd, summary, tags, requirements, responsibilities,
      apply_count, view_count, created_at,
      job_number, visit_notes, required_conditions, preferred_conditions,
      target_companies, must_ask_questions, hire_count, detailed_address,
      education_requirement, experience_years, skills_certificates,
      salary_benefits, department, subordinate_count, department_structure,
      reports_to, rank_title, interview_rounds, interview_process,
      video_interview_acceptable,
      hidden_company_id,
      user_id
    `)
    .eq('id', id)
    .eq('is_published', true)
    .single()

  // 单独查询公司信息
  let company = null
  if (job?.hidden_company_id) {
    const { data: companyData } = await supabase
      .from('hidden_company_profiles')
      .select('anonymized_name, industry, scale, stage, is_listed')
      .eq('id', job.hidden_company_id)
      .single()
    company = companyData
  }

  // 查询该职位发布者的微信号列表
  let wechats: Array<{ id: string, wechat_id: string, nickname: string, is_primary: boolean, is_online: boolean }> = []
  if (job?.user_id) {
    const { data: wechatData } = await supabase
      .from('wechats')
      .select('id, wechat_id, nickname, is_primary, is_online')
      .eq('user_id', job.user_id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })
    if (wechatData) wechats = wechatData
  }

  // 详细错误提示（临时调试用）
  if (error || !job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-2xl mx-auto p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">页面加载失败</h1>
          <div className="text-left bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="font-semibold mb-2">错误信息：</h2>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto mb-4">
              {JSON.stringify(error, null, 2)}
            </pre>
            <h2 className="font-semibold mb-2">职位数据：</h2>
            <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto">
              {JSON.stringify(job, null, 2)}
            </pre>
            <h2 className="font-semibold mb-2 mt-4">查询 ID：</h2>
            <p className="bg-gray-100 p-4 rounded-lg text-sm">{id}</p>
          </div>
        </div>
      </div>
    )
  }
  // if (error || !job) notFound()

  // 增加浏览量
  supabase.from('jobs').update({ view_count: (job.view_count || 0) + 1 }).eq('id', id).then(() => {})

  const requirements = Array.isArray(job.requirements) ? job.requirements : []
  const responsibilities = Array.isArray(job.responsibilities) ? job.responsibilities : []
  const tags = Array.isArray(job.tags) ? job.tags : []
  const requiredConditions = Array.isArray(job.required_conditions) ? job.required_conditions : []
  const preferredConditions = Array.isArray(job.preferred_conditions) ? job.preferred_conditions : []
  const targetCompanies = Array.isArray(job.target_companies) ? job.target_companies : []
  const mustAskQuestions = Array.isArray(job.must_ask_questions) ? job.must_ask_questions : []
  const skillsCertificates = Array.isArray(job.skills_certificates) ? job.skills_certificates : []

  // 格式化薪资
  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return '薪资面议'
    if (min && max) return `${min}-${max}万/年`
    if (min) return `${min}万+/年`
    if (max) return `最高${max}万/年`
    return '薪资面议'
  }

  // 生成复制文本
  const generateCopyText = () => {
    let text = ''
    if (job.job_number) text += `职位编号：${job.job_number}\n`
    text += `职位名称：${job.title}\n`
    if (job.summary) text += `\n职位亮点：\n${job.summary}\n`
    if (job.visit_notes) text += `\n寻访须知：\n${job.visit_notes}\n`
    if (requiredConditions.length > 0) text += `\n必备条件：\n${requiredConditions.map((c: string) => `• ${c}`).join('\n')}\n`
    if (preferredConditions.length > 0) text += `\n优先条件：\n${preferredConditions.map((c: string) => `• ${c}`).join('\n')}\n`
    if (targetCompanies.length > 0) text += `\n目标公司/行业：\n${targetCompanies.map((c: string) => `• ${c}`).join('\n')}\n`
    if (mustAskQuestions.length > 0) text += `\n必问问题：\n${mustAskQuestions.map((c: string) => `• ${c}`).join('\n')}\n`
    text += `\nJD信息：\n`
    if (responsibilities.length > 0) text += `岗位职责：\n${responsibilities.map((r: string) => `• ${r}`).join('\n')}\n`
    if (requirements.length > 0) text += `\n任职要求：\n${requirements.map((r: string) => `• ${r}`).join('\n')}\n`
    if (job.industry) text += `\n所属行业：${job.industry}\n`
    if (job.job_function) text += `职能分类：${job.job_function}\n`
    if (job.city) text += `工作城市：${job.city}\n`
    if (job.hire_count) text += `招聘人数：${job.hire_count}人\n`
    if (job.detailed_address) text += `详细地址：${job.detailed_address}\n`
    if (job.education_requirement) text += `\n学历要求：${job.education_requirement}\n`
    if (job.experience_years) text += `工作年限：${job.experience_years}\n`
    if (skillsCertificates.length > 0) text += `技能/证书：${skillsCertificates.join('、')}\n`
    text += `\n薪资福利：\n`
    text += `年薪范围：${formatSalary(job.salary_min, job.salary_max)}\n`
    if (job.salary_benefits) text += `薪资福利：${job.salary_benefits}\n`
    if (job.department) text += `\n团队架构：\n所属部门：${job.department}\n`
    if (job.subordinate_count) text += `下属人数：${job.subordinate_count}\n`
    if (job.department_structure) text += `部门架构：${job.department_structure}\n`
    if (job.reports_to) text += `汇报对象：${job.reports_to}\n`
    if (job.rank_title) text += `职级职称：${job.rank_title}\n`
    if (job.interview_rounds) text += `\n面试信息：\n面试轮次：${job.interview_rounds}\n`
    if (job.interview_process) text += `面试流程：${job.interview_process}\n`
    if (job.video_interview_acceptable !== null) text += `视频面试：${job.video_interview_acceptable ? '可以接受' : '不可以接受'}\n`
    return text
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* 顶部渐变背景 */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 px-4 pt-8 pb-20">
        {/* 导航 */}
        <div className="max-w-xl mx-auto flex items-center justify-between mb-6">
          <Link href="/jobs" className="text-white/80 hover:text-white flex items-center gap-1 text-sm">
            ← 返回职位列表
          </Link>
          <span className="text-white/60 text-xs">猎英联盟</span>
        </div>

        {/* 职位编号 */}
        {job.job_number && (
          <div className="max-w-xl mx-auto mb-4">
            <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs text-white font-mono">
              职位编号：{job.job_number}
            </span>
          </div>
        )}

        {/* 职位卡片 */}
        <div className="max-w-xl mx-auto">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center text-2xl">
              🏢
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-1">{job.title}</h1>
              <p className="text-white/80 text-sm mb-3">{company?.anonymized_name || '优质企业'}</p>

              {/* 标签 */}
              <div className="flex flex-wrap gap-2">
                {job.city && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs text-white">
                    📍 {job.city}
                  </span>
                )}
                {job.level && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs text-white">
                    🎯 {job.level}
                  </span>
                )}
                {job.industry && (
                  <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs text-white">
                    🏭 {job.industry}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 客户端交互组件 */}
      <JobDetailClient 
        jobId={job.id}
        jobTitle={job.title}
        copyText={generateCopyText()}
        wechats={wechats}
      />

      {/* 薪资卡片 */}
      <div className="max-w-xl mx-auto px-4 -mt-10">
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-0.5">薪资范围</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {formatSalary(job.salary_min, job.salary_max)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{job.apply_count || 0} 人已申请</p>
              <p className="text-xs text-gray-400">{job.view_count || 0} 次浏览</p>
            </div>
          </div>

          {/* 职位亮点标签 */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
              {tags.slice(0, 4).map((tag: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 职位详情 */}
      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">
        {/* 职位亮点 */}
        {job.summary && (
          <div className="bg-blue-50 rounded-2xl p-4">
            <h2 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">✨</span>
              职位亮点
            </h2>
            <p className="text-sm text-blue-800 leading-relaxed">{job.summary}</p>
          </div>
        )}

        {/* 寻访须知 */}
        {job.visit_notes && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
            <h2 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-sm">📋</span>
              寻访须知
            </h2>
            <p className="text-sm text-amber-800 leading-relaxed">{job.visit_notes}</p>
          </div>
        )}

        {/* 必备条件 */}
        {requiredConditions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center text-sm">⚠️</span>
              必备条件
            </h2>
            <ul className="space-y-3">
              {requiredConditions.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-red-100 rounded flex items-center justify-center text-red-600 flex-shrink-0 text-xs">!</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 优先条件 */}
        {preferredConditions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm">⭐</span>
              优先条件
            </h2>
            <ul className="space-y-3">
              {preferredConditions.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-green-600 flex-shrink-0 text-xs">✓</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 目标公司/行业 */}
        {targetCompanies.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm">🎯</span>
              目标公司/行业
            </h2>
            <ul className="space-y-3">
              {targetCompanies.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center text-purple-600 flex-shrink-0 text-xs">•</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 必问问题 */}
        {mustAskQuestions.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-sm">❓</span>
              必问问题
            </h2>
            <ul className="space-y-3">
              {mustAskQuestions.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-orange-100 rounded flex items-center justify-center text-orange-600 flex-shrink-0 text-xs">Q</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 岗位职责 */}
        {responsibilities.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-sm">📋</span>
              岗位职责
            </h2>
            <ul className="space-y-3">
              {responsibilities.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 任职要求 */}
        {requirements.length > 0 && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm">✅</span>
              任职要求
            </h2>
            <ul className="space-y-3">
              {requirements.map((item: string, i: number) => (
                <li key={i} className="flex gap-3 text-sm text-gray-700">
                  <span className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-green-600 flex-shrink-0 text-xs">✓</span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* JD详情 */}
        {job.anonymized_jd && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm">📄</span>
              详细说明
            </h2>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {job.anonymized_jd}
            </div>
          </div>
        )}

        {/* 职位要求汇总 */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-sm">📊</span>
            职位要求
          </h2>
          <div className="space-y-3 text-sm">
            {job.education_requirement && (
              <div className="flex justify-between">
                <span className="text-gray-500">学历要求</span>
                <span className="font-medium text-gray-900">{job.education_requirement}</span>
              </div>
            )}
            {job.experience_years && (
              <div className="flex justify-between">
                <span className="text-gray-500">工作年限</span>
                <span className="font-medium text-gray-900">{job.experience_years}</span>
              </div>
            )}
            {skillsCertificates.length > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">技能/证书</span>
                <span className="font-medium text-gray-900">{skillsCertificates.join('、')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">年薪范围</span>
              <span className="font-medium text-gray-900">{formatSalary(job.salary_min, job.salary_max)}</span>
            </div>
            {job.salary_benefits && (
              <div className="flex justify-between">
                <span className="text-gray-500">薪资福利</span>
                <span className="font-medium text-gray-900">{job.salary_benefits}</span>
              </div>
            )}
          </div>
        </div>

        {/* 工作信息 */}
        {(job.city || job.hire_count || job.detailed_address) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center text-sm">📍</span>
              工作信息
            </h2>
            <div className="space-y-3 text-sm">
              {job.industry && (
                <div className="flex justify-between">
                  <span className="text-gray-500">所属行业</span>
                  <span className="font-medium text-gray-900">{job.industry}</span>
                </div>
              )}
              {job.job_function && (
                <div className="flex justify-between">
                  <span className="text-gray-500">职能分类</span>
                  <span className="font-medium text-gray-900">{job.job_function}</span>
                </div>
              )}
              {job.city && (
                <div className="flex justify-between">
                  <span className="text-gray-500">工作城市</span>
                  <span className="font-medium text-gray-900">{job.city}</span>
                </div>
              )}
              {job.hire_count && (
                <div className="flex justify-between">
                  <span className="text-gray-500">招聘人数</span>
                  <span className="font-medium text-gray-900">{job.hire_count}人</span>
                </div>
              )}
              {job.detailed_address && (
                <div className="flex justify-between">
                  <span className="text-gray-500">详细地址</span>
                  <span className="font-medium text-gray-900">{job.detailed_address}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 团队架构 */}
        {(job.department || job.subordinate_count || job.reports_to) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center text-sm">👥</span>
              团队架构
            </h2>
            <div className="space-y-3 text-sm">
              {job.department && (
                <div className="flex justify-between">
                  <span className="text-gray-500">所属部门</span>
                  <span className="font-medium text-gray-900">{job.department}</span>
                </div>
              )}
              {job.subordinate_count && (
                <div className="flex justify-between">
                  <span className="text-gray-500">下属人数</span>
                  <span className="font-medium text-gray-900">{job.subordinate_count}人</span>
                </div>
              )}
              {job.department_structure && (
                <div className="flex justify-between">
                  <span className="text-gray-500">部门架构</span>
                  <span className="font-medium text-gray-900">{job.department_structure}</span>
                </div>
              )}
              {job.reports_to && (
                <div className="flex justify-between">
                  <span className="text-gray-500">汇报对象</span>
                  <span className="font-medium text-gray-900">{job.reports_to}</span>
                </div>
              )}
              {job.rank_title && (
                <div className="flex justify-between">
                  <span className="text-gray-500">职级职称</span>
                  <span className="font-medium text-gray-900">{job.rank_title}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 面试信息 */}
        {(job.interview_rounds || job.interview_process || job.video_interview_acceptable !== null) && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center text-sm">💼</span>
              面试信息
            </h2>
            <div className="space-y-3 text-sm">
              {job.interview_rounds && (
                <div className="flex justify-between">
                  <span className="text-gray-500">面试轮次</span>
                  <span className="font-medium text-gray-900">{job.interview_rounds}</span>
                </div>
              )}
              {job.interview_process && (
                <div className="flex justify-between">
                  <span className="text-gray-500">面试流程</span>
                  <span className="font-medium text-gray-900">{job.interview_process}</span>
                </div>
              )}
              {job.video_interview_acceptable !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">视频面试</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${job.video_interview_acceptable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {job.video_interview_acceptable ? '可以接受' : '不可以接受'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 公司信息 */}
        {company && (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center text-sm">🏢</span>
              关于雇主
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">公司名称</span>
                <span className="font-medium text-gray-900">{company.anonymized_name}</span>
              </div>
              {company.industry && (
                <div className="flex justify-between">
                  <span className="text-gray-500">所属行业</span>
                  <span className="text-gray-900">{company.industry}</span>
                </div>
              )}
              {company.scale && (
                <div className="flex justify-between">
                  <span className="text-gray-500">公司规模</span>
                  <span className="text-gray-900">{company.scale}</span>
                </div>
              )}
              {company.stage && (
                <div className="flex justify-between">
                  <span className="text-gray-500">发展阶段</span>
                  <span className="text-gray-900">{company.stage}</span>
                </div>
              )}
              {company.is_listed && (
                <div className="flex justify-between">
                  <span className="text-gray-500">上市状态</span>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">已上市</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

  
    </div>
  )
}