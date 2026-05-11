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
      <body className="bg-gray-50 min-h-screen">
        <ConfigWarning />
        {children}
      </body>
    </html>
  )
}
