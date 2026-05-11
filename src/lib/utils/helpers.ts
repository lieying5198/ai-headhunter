// src/lib/utils/helpers.ts

export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return '薪资面议'
  if (min && max) return `${min}-${max}万/年`
  if (min) return `${min}万+/年`
  if (max) return `最高${max}万/年`
  return '薪资面议'
}

export function getScoreColor(grade?: string): string {
  switch (grade) {
    case 'A': return 'text-green-600 bg-green-50 border-green-200'
    case 'B': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'C': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'D': return 'text-red-600 bg-red-50 border-red-200'
    default:  return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    new:          '新申请',
    screening:    'AI初筛中',
    screened:     '初筛完成',
    contacted:    '已联系',
    interviewing: '面试中',
    offered:      'Offer阶段',
    hired:        '已入职',
    rejected:     '已淘汰',
  }
  return map[status] || status
}

export function getJobStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft:      '草稿',
    processing: 'AI处理中',
    published:  '已发布',
    closed:     '已关闭',
  }
  return map[status] || status
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
