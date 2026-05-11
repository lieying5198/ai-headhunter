'use client'

import { useState } from 'react'

interface CopyButtonProps {
  copyText: string
}

export default function CopyButton({ copyText }: CopyButtonProps) {
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(copyText)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      alert('复制失败，请手动复制')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-center py-3 rounded-xl text-sm font-semibold transition-all"
    >
      {copySuccess ? '✅ 复制成功！' : '📋 复制职位信息'}
    </button>
  )
}
