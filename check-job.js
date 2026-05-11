// 检查测试职位状态
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function checkJob() {
  // 查询刚才创建的职位
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', '7d2345fe-8670-4644-9ea4-23786b01f96c')
    .single()
  
  console.log('Error:', error)
  console.log('Data:', JSON.stringify(data, null, 2))
  
  //  also query all jobs
  const { data: allJobs, error: allError } = await supabase
    .from('jobs')
    .select('id, title, is_published')
  
  console.log('\nAll jobs:', allError, allJobs)
}

checkJob()
