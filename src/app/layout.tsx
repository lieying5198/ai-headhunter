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
        <footer className="bg-gray-100 py-4 text-center text-xs text-gray-700">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors font-medium"
          >
            粤ICP备2022099477号-1
          </a>
        </footer>
      </body>
    </html>
  )
}
