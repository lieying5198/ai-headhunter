'use client';

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
      if (error || !data.session) {
        setError('请先登录');
        return;
      }

      const response = await fetch('/api/jobs/import-template', {
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
        },
      });

      if (!response.ok) throw new Error('下载模板失败');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '职位导入模板.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('请选择文件');
      return;
    }

    setUploading(true);
    setError('');
    setResults(null);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        throw new Error('请先登录');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/jobs/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${data.session.access_token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || '导入失败');
      }

      setResults(result.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/consultant/dashboard" className="text-gray-500 hover:text-gray-700">
                ← 返回控制台
              </Link>
              <h1 className="text-xl font-bold text-gray-900">职位 Excel 导入</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 说明卡片 */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">使用说明</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <ol className="list-decimal list-inside space-y-1">
                    <li>点击「下载模板」按钮，获取 Excel 导入模板</li>
                    <li>按照模板格式填写职位信息（带 * 为必填项）</li>
                    <li>保存 Excel 文件后，点击「选择文件」上传</li>
                    <li><strong>智能匹配：</strong>系统会根据「职位名称+公司简称」自动识别是新增还是更新</li>
                    <li>本次未导入的旧职位会自动下架</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 操作区 */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                📥 下载导入模板
              </button>

              <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row gap-4 flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {uploading ? '导入中...' : '📤 开始导入'}
                </button>
              </form>
            </div>
          </div>

          {/* 导入结果 */}
          {results && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">导入结果</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">新增</p>
                  <p className="text-2xl font-bold text-green-800">{results.success}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">更新</p>
                  <p className="text-2xl font-bold text-blue-800">{results.updated}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-600">下架</p>
                  <p className="text-2xl font-bold text-yellow-800">{results.unpublished || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600">失败</p>
                  <p className="text-2xl font-bold text-red-800">{results.failed}</p>
                </div>
              </div>

              {results.errors && results.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-red-800 mb-2">错误详情：</h3>
                  <ul className="bg-red-50 p-4 rounded-md max-h-64 overflow-y-auto">
                    {results.errors.map((err: string, idx: number) => (
                      <li key={idx} className="text-sm text-red-700 mb-1">{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 字段说明 */}
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">字段说明</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">字段</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">说明</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">必填</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  <tr><td className="px-6 py-2">职位名称</td><td>职位标题</td><td>✅</td></tr>
                  <tr><td className="px-6 py-2">公司简称</td><td>脱敏后的公司名称</td><td>✅</td></tr>
                  <tr><td className="px-6 py-2">城市</td><td>工作城市</td><td>✅</td></tr>
                  <tr><td className="px-6 py-2">最低薪资(万/年)</td><td>数字，如 150</td><td>可选</td></tr>
                  <tr><td className="px-6 py-2">最高薪资(万/年)</td><td>数字，如 240</td><td>可选</td></tr>
                  <tr><td className="px-6 py-2">薪资福利说明</td><td>年薪open、股权激励等</td><td>可选</td></tr>
                  <tr><td className="px-6 py-2">学历要求</td><td>本科·一本 等</td><td>可选</td></tr>
                  <tr><td className="px-6 py-2">工作年限</td><td>10年及以上 等</td><td>可选</td></tr>
                  <tr><td className="px-6 py-2">技能/证书</td><td>多个用中文逗号分隔</td><td>可选</td></tr>
                  <tr><td className="px-6 py-2">职位描述</td><td>详细职位说明</td><td>✅</td></tr>
                  <tr><td className="px-6 py-2">顾问微信号</td><td>用于匹配顾问账号</td><td>✅</td></tr>
                  <tr><td className="px-6 py-2">是否发布</td><td>1=发布，0=下架（默认1）</td><td>可选</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
