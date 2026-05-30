// src/app/admin/page.tsx
import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const serviceClient = createServiceClient()
  if (!serviceClient) {
    return <div className="p-8 text-center text-gray-500">数据库未配置</div>
  }

  // 统计数据
  const [jobsRes, consultantsRes, companiesRes, publishedRes] = await Promise.all([
    serviceClient.from('jobs').select('id, status, is_published, view_count, apply_count, created_at').order('created_at', { ascending: false }),
    serviceClient.from('consultants').select('id, name, email, role, created_at').order('created_at'),
    serviceClient.from('hidden_company_profiles').select('id, anonymized_name, real_name, industry, scale, stage'),
    serviceClient.from('jobs').select('id').eq('is_published', true),
  ])

  const jobs = jobsRes.data || []
  const consultants = consultantsRes.data || []
  const companies = companiesRes.data || []
  const publishedCount = publishedRes.data?.length || 0

  const totalViews = jobs.reduce((sum, j) => sum + (j.view_count || 0), 0)
  const totalApplies = jobs.reduce((sum, j) => sum + (j.apply_count || 0), 0)

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="总职位" value={jobs.length} color="blue" />
        <StatCard label="已发布" value={publishedCount} color="green" />
        <StatCard label="总浏览" value={totalViews} color="purple" />
        <StatCard label="总申请" value={totalApplies} color="orange" />
      </div>

      {/* 职位列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">职位管理</h2>
          <span className="text-xs text-gray-400">{jobs.length} 个职位</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">ID</th>
                <th className="text-left px-4 py-2 font-medium">状态</th>
                <th className="text-left px-4 py-2 font-medium">上架</th>
                <th className="text-right px-4 py-2 font-medium">浏览</th>
                <th className="text-right px-4 py-2 font-medium">申请</th>
                <th className="text-right px-4 py-2 font-medium">创建时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {jobs.slice(0, 50).map(job => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/jobs/${job.id}`} className="text-blue-600 hover:underline font-mono text-xs">
                      {job.id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      job.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                      job.status === 'published' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {job.is_published ? '✅' : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{job.view_count || 0}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{job.apply_count || 0}</td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                    {new Date(job.created_at).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 顾问列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">顾问管理</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">姓名</th>
                <th className="text-left px-4 py-2 font-medium">邮箱</th>
                <th className="text-center px-4 py-2 font-medium">角色</th>
                <th className="text-right px-4 py-2 font-medium">注册时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {consultants.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium">{c.name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.email || '—'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {c.role || 'consultant'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('zh-CN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 客户档案 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">客户档案</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs">
              <tr>
                <th className="text-left px-4 py-2 font-medium">脱敏名称</th>
                <th className="text-left px-4 py-2 font-medium">真实名称</th>
                <th className="text-left px-4 py-2 font-medium">行业</th>
                <th className="text-left px-4 py-2 font-medium">规模</th>
                <th className="text-left px-4 py-2 font-medium">阶段</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companies.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{c.anonymized_name || '—'}</td>
                  <td className="px-4 py-2.5 text-orange-600 font-medium">{c.real_name || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.industry || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.scale || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-500">{c.stage || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    green: 'bg-green-50 border-green-100 text-green-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  }
  return (
    <div className={`rounded-xl p-5 border ${colors[color]}`}>
      <p className="text-sm opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-extrabold">{value.toLocaleString()}</p>
    </div>
  )
}
