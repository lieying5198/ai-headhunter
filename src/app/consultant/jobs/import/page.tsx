'use client';
// src/app/consultant/jobs/import/page.tsx
// 猎英盟 · 职位 Excel 导入

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function JobImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');
  const supabase = createClient();

  const handleDownloadTemplate = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) { setError('请先登录'); return; }
      const response = await fetch('/api/jobs/import-template', {
        headers: { 'Authorization': `Bearer ${data.session.access_token}` },
      });
      if (!response.ok) throw new Error('下载模板失败');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = '职位导入模板.xlsx';
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) { setError(err.message); }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) { setError('请选择文件'); return; }
    setUploading(true);
    setError('');
    setResults(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error('请先登录');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${data.session.access_token}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '导入失败');
      setResults(result.results);
    } catch (err: any) {
      setError(err.message);
    } finally { setUploading(false); }
  };

  return (
    <div className="animate-fade-in-up">
      {/* 说明卡片 */}
      <div className="card p-5 mb-6 border-l-4 border-l-orange-500" style={{ background: 'linear-gradient(135deg, #FFF1E6, rgba(255,255,255,0))' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: 'linear-gradient(135deg, #FF6600, #FF3300)' }}>
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-1.5">使用说明</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>点击「下载模板」获取 Excel 导入模板</li>
              <li>按模板格式填写职位信息（带 * 为必填项）</li>
              <li>保存文件后点击「选择文件」上传</li>
              <li><strong className="text-gray-900">智能匹配：</strong>系统根据「职位名称+公司简称」自动识别新增/更新</li>
              <li>本次未导入的旧职位将自动下架</li>
            </ol>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="card p-4 mb-6 border-l-4 border-l-red-500 bg-red-50 flex items-start gap-2">
          <svg className="w-5 h-5 text-red-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 操作区 */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={handleDownloadTemplate}
            className="btn-secondary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            下载导入模板
          </button>

          <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-4 flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="input flex-1 text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:cursor-pointer file:transition-colors"
              style={{
                // Brand file input styling
                padding: '0.375rem',
              }}
            />
            <button type="submit" disabled={uploading}
              className="btn-primary shrink-0 flex items-center gap-2">
              {uploading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  导入中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  开始导入
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* 导入结果 */}
      {results && (
        <div className="card p-6 mb-6 animate-fade-in-scale">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            导入结果
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="stat-card text-center border-green-100 bg-green-50/50">
              <p className="text-sm text-green-600 font-medium mb-1">新增</p>
              <p className="text-3xl font-extrabold text-green-700">{results.success}</p>
            </div>
            <div className="stat-card text-center border-blue-100 bg-blue-50/50">
              <p className="text-sm text-blue-600 font-medium mb-1">更新</p>
              <p className="text-3xl font-extrabold text-blue-700">{results.updated}</p>
            </div>
            <div className="stat-card text-center border-amber-100 bg-amber-50/50">
              <p className="text-sm text-amber-600 font-medium mb-1">下架</p>
              <p className="text-3xl font-extrabold text-amber-700">{results.unpublished || 0}</p>
            </div>
            <div className="stat-card text-center border-red-100 bg-red-50/50">
              <p className="text-sm text-red-600 font-medium mb-1">失败</p>
              <p className="text-3xl font-extrabold text-red-700">{results.failed}</p>
            </div>
          </div>
          {results.errors && results.errors.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                错误详情
              </h3>
              <ul className="bg-red-50 border border-red-100 rounded-xl p-4 max-h-64 overflow-y-auto space-y-1">
                {results.errors.map((err: string, idx: number) => (
                  <li key={idx} className="text-sm text-red-700">{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 字段说明 */}
      <div className="card p-6">
        <h2 className="text-base font-bold text-gray-900 mb-4">字段说明</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">字段</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">说明</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">必填</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50 text-sm">
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">职位名称</td><td className="text-gray-500">职位标题</td><td className="text-green-600 font-semibold">必填</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">公司简称</td><td className="text-gray-500">脱敏后的公司名称</td><td className="text-green-600 font-semibold">必填</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">城市</td><td className="text-gray-500">工作城市</td><td className="text-green-600 font-semibold">必填</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">最低薪资(万/年)</td><td className="text-gray-500">数字，如 150</td><td className="text-gray-400">可选</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">最高薪资(万/年)</td><td className="text-gray-500">数字，如 240</td><td className="text-gray-400">可选</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">薪资福利说明</td><td className="text-gray-500">年薪open、股权激励等</td><td className="text-gray-400">可选</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">学历要求</td><td className="text-gray-500">本科·一本 等</td><td className="text-gray-400">可选</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">工作年限</td><td className="text-gray-500">10年及以上 等</td><td className="text-gray-400">可选</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">技能/证书</td><td className="text-gray-500">多个用中文逗号分隔</td><td className="text-gray-400">可选</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">职位描述</td><td className="text-gray-500">详细职位说明</td><td className="text-green-600 font-semibold">必填</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">顾问微信号</td><td className="text-gray-500">用于匹配顾问账号</td><td className="text-green-600 font-semibold">必填</td></tr>
              <tr><td className="px-5 py-2.5 font-medium text-gray-900">是否发布</td><td className="text-gray-500">1=发布，0=下架（默认1）</td><td className="text-gray-400">可选</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
