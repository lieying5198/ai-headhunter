// src/app/layout.tsx
// 猎英盟 · AI猎头平台 — 全局布局

import type { Metadata } from 'next'
import './globals.css'
import ConfigWarning from '@/components/ConfigWarning'

export const metadata: Metadata = {
  title: '猎英联盟 · AI猎头平台',
  description: '专业猎头服务 · AI驱动的高端人才招聘与初筛平台',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-gray-50 antialiased">
        <ConfigWarning />
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* 品牌区 */}
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #FF6600, #FF3300)' }}
                >
                  <span className="text-white text-xs font-bold">猎</span>
                </div>
                <span className="text-sm font-semibold text-gray-600">
                  猎英联盟
                </span>
                <span className="text-xs text-gray-400">
                  专业猎头服务
                </span>
              </div>

              {/* ICP备案 */}
              <a
                href="https://beian.miit.gov.cn/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                粤ICP备2022099477号-1
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
