// 创建测试数据脚本
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function seed() {
  // 创建测试公司
  const { data: company, error: companyError } = await supabase
    .from('hidden_company_profiles')
    .insert([
      {
        real_name: '真实科技有限公司',
        anonymized_name: '测试科技有限公司',
        industry: '互联网',
        scale: '1000-5000人',
        stage: 'C轮',
        is_listed: false
      }
    ])
    .select()
    .single()

  if (companyError) {
    console.error('创建公司失败:', companyError)
    return
  }

  console.log('创建公司成功:', company.id)

  // 创建测试职位
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .insert([
      {
        title: '高级前端工程师',
        industry: '互联网',
        job_function: '技术研发',
        city: '北京',
        salary_min: 40,
        salary_max: 70,
        level: 'P7',
        anonymized_jd: '负责公司核心产品的前端开发，使用 React/Next.js 等技术栈。',
        summary: '团队氛围好，技术栈前沿，有股票期权',
        tags: ['React', 'Next.js', 'TypeScript'],
        requirements: ['本科及以上学历', '3年以上前端开发经验', '熟练掌握 React'],
        responsibilities: ['负责前端页面开发', '参与技术方案设计', '优化用户体验'],
        apply_count: 5,
        view_count: 50,
        // consultant_wechat: 'test_wechat',  // 字段可能不存在，先注释
        job_number: 'JOB-001',
        visit_notes: '有大厂经验优先',
        required_conditions: ['本科', '3年前端经验'],
        preferred_conditions: ['有 AI 产品经验', '有大厂背景'],
        target_companies: ['字节跳动', '阿里巴巴'],
        must_ask_questions: ['React Hooks 原理', '性能优化经验'],
        hire_count: 2,
        detailed_address: '北京市海淀区',
        education_requirement: '本科',
        experience_years: '3-5年',
        skills_certificates: ['React', 'TypeScript'],
        salary_benefits: '五险一金+股票期权',
        department: '技术部',
        subordinate_count: 0,
        department_structure: '技术部 > 前端团队',
        reports_to: '技术总监',
        rank_title: '高级工程师',
        interview_rounds: '3轮',
        interview_process: '笔试+技术面+HR面',
        video_interview_acceptable: true,
        hidden_company_id: company.id,
        is_published: true
      }
    ])
    .select()
    .single()

  if (jobError) {
    console.error('创建职位失败:', jobError)
    return
  }

  console.log('创建职位成功:', job.id)
  console.log('访问地址:', `http://localhost:3000/jobs/${job.id}`)
}

seed()
