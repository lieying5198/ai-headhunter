// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import ConfigWarning from '@/components/ConfigWarning'

export const metadata: Metadata = {
  title: 'AI猎头职位平台',
  description: '专业的AI驱动猎头职位发布与初筛平台',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 min-h-screen flex flex-col">
        <ConfigWarning />
        <main className="flex-1">
          {children}
        </main>
        {/* ICP备案信息 */}
        <footer className="bg-gray-800 py-4 text-center text-xs">
          <p className="text-gray-400 mb-1">猎英联盟 · 专业猎头服务</p>
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-300 hover:text-white font-medium transition-colors"
          >
            粤ICP备2022099477号-1
          </a>
        </footer>
      </body>
    </html>
  )
}
