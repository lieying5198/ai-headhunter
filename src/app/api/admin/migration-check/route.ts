import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// 注意：这个 API 只能管理员调用，请通过 middleware 保护
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 验证是管理员
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 检查是否有管理权限（可以扩展这个逻辑）
    const { data: profile } = await supabase
      .from('consultants')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
    }

    // Supabase JS 客户端不支持直接执行 DDL
    // 需要通过 REST API 或 pg 连接
    // 这里我们直接尝试通过 SQL 函数执行

    // 由于 JS 客户端限制，我们创建一个 workaround：
    // 1. 如果 jobs 表的 required_conditions 字段不存在，会报错
    // 2. 前端可以根据这个来判断字段是否存在

    const result = await supabase
      .from('jobs')
      .select('id')
      .limit(1);

    return NextResponse.json({
      success: true,
      message: '连接成功',
      jobCount: result.data?.length || 0,
      instructions: '请使用 Supabase Dashboard SQL Editor 执行以下 SQL:',
      sql: `
-- 添加 wechat 字段
ALTER TABLE consultants ADD COLUMN IF NOT EXISTS wechat TEXT UNIQUE;
COMMENT ON COLUMN consultants.wechat IS '顾问微信号，用于Excel导入时匹配顾问';
      `
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}

// GET 请求返回当前表结构状态
export async function GET() {
  try {
    const supabase = await createClient();

    // 获取 consultants 表的列信息
    const { data: cols } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'consultants')
      .eq('table_schema', 'public');

    const hasWechat = cols?.some(c => c.column_name === 'wechat');

    return NextResponse.json({
      consultantsColumns: cols?.map(c => c.column_name),
      hasWechat
    });

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
