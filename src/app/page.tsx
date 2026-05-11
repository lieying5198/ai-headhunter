// src/app/page.tsx
// 候选人端首页 - 简洁版，直接展示职位

import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/jobs')
}
