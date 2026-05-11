'use client';

import { useEffect, useState } from 'react';

/**
 * 环境配置警告横幅
 * 当环境变量未配置时显示，引导用户完成配置
 */
export default function ConfigWarning() {
  const [show, setShow] = useState(false);
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    fetch('/api/config-check')
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setShow(!data.configured);
      })
      .catch(() => {});
  }, []);

  if (!show || !config) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-yellow-800 text-sm">
            ⚠️ 环境配置未完成，部分功能不可用
          </span>
          <a
            href="/SETUP.md"
            target="_blank"
            className="text-yellow-900 underline text-sm font-medium"
          >
            查看配置指南
          </a>
        </div>
        <button
          onClick={() => setShow(false)}
          className="text-yellow-600 hover:text-yellow-800"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
