import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as xlsx from 'xlsx';

// 解析 Excel 日期序列号
function parseExcelDate(serial: number): string {
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

// 生成职位编号：LY + 日期 + 3位序号
function generateJobNumber(index: number): string {
  const now = new Date();
  const date = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
  const seq = index.toString().padStart(3, '0');
  return `LY${date}_${seq}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 验证用户身份
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    // 获取用户信息
    const { data: consultant } = await supabase
      .from('consultants')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!consultant || consultant.role !== 'consultant') {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 解析表单数据
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '未上传文件' }, { status: 400 });
    }

    // 读取 Excel
    const bytes = await file.arrayBuffer();
    const workbook = xlsx.read(bytes, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    // 解析表头（第一行）
    const headers = data[0] as string[];
    const rows = data.slice(1).filter(row => row && (row as any[]).length > 0);

    const results = {
      success: 0,
      updated: 0,
      failed: 0,
      errors: [] as string[],
    };

    // 获取所有顾问（用于匹配微信号）
    const { data: consultants } = await supabase
      .from('consultants')
      .select('id, wechat');

    const consultantMap = new Map(
      consultants?.filter(c => c.wechat).map(c => [c.wechat!.toLowerCase(), c.id]) || []
    );

    // 获取所有脱敏公司（用于匹配）
    const { data: companies } = await supabase
      .from('hidden_company_profiles')
      .select('id, anonymized_name');

    const companyMap = new Map(
      companies?.map(c => [c.anonymized_name.toLowerCase(), c.id]) || []
    );

    // 下架该顾问之前发布的所有职位（按用户要求：覆盖以前的所有职位）
    const { data: myJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('consultant_id', consultant.id)
      .eq('is_published', true);

    if (myJobs && myJobs.length > 0) {
      await supabase
        .from('jobs')
        .update({ is_published: false, status: 'closed' })
        .in('id', myJobs.map(j => j.id));
    }

    // 处理每一行
    for (let i = 0; i < rows.length; i++) {
      try {
        const row = rows[i] as any[];
        const rowData: Record<string, any> = {};
        headers.forEach((header, idx) => {
          rowData[header] = row[idx];
        });

        // 必填字段检查
        const title = rowData['职位名称*'] || rowData['职位名称'];
        const companyAnon = rowData['公司简称*'] || rowData['公司简称'];
        const city = rowData['城市*'] || rowData['城市'];
        const consultantWechat = rowData['顾问微信号*'] || rowData['顾问微信号'];
        const anonymizedJd = rowData['职位描述*'] || rowData['职位描述'];

        if (!title || !companyAnon || !city || !consultantWechat || !anonymizedJd) {
          results.failed++;
          results.errors.push(`第${i + 2}行：缺少必填字段`);
          continue;
        }

        // 匹配顾问
        const matchedConsultantId = consultantMap.get(consultantWechat.toLowerCase());
        if (!matchedConsultantId) {
          results.failed++;
          results.errors.push(`第${i + 2}行：未找到微信号对应的顾问（${consultantWechat}）`);
          continue;
        }

        // 匹配或创建脱敏公司
        let companyId = companyMap.get(companyAnon.toLowerCase());
        if (!companyId) {
          const { data: newCompany } = await supabase
            .from('hidden_company_profiles')
            .insert({ real_name: companyAnon, anonymized_name: companyAnon })
            .select('id')
            .single();
          companyId = newCompany?.id;
          if (companyId) companyMap.set(companyAnon.toLowerCase(), companyId);
        }

        // 解析字段
        const salaryMin = parseInt(rowData['最低薪资(万/年)']) || null;
        const salaryMax = parseInt(rowData['最高薪资(万/年)']) || null;
        const subordinateCount = parseInt(rowData['下属人数']) || null;
        const isPublished = rowData['是否发布(1=发布,0=下架)'] !== '0';

        const skills = rowData['技能/证书(逗号分隔)']
          ? (rowData['技能/证书(逗号分隔)'] as string).split('，').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const tags = rowData['职位亮点(逗号分隔)']
          ? (rowData['职位亮点(逗号分隔)'] as string).split('，').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const requiredConditions = rowData['必备条件(逗号分隔)']
          ? (rowData['必备条件(逗号分隔)'] as string).split('，').map((s: string) => s.trim()).filter(Boolean)
          : [];

        const preferredConditions = rowData['优先条件(逗号分隔)']
          ? (rowData['优先条件(逗号分隔)'] as string).split('，').map((s: string) => s.trim()).filter(Boolean)
          : [];

        // 构建职位数据
        const jobData = {
          consultant_id: matchedConsultantId,
          hidden_company_id: companyId,
          title,
          city,
          salary_min: salaryMin,
          salary_max: salaryMax,
          anonymized_jd: anonymizedJd,
          tags,
          requirements: requiredConditions,
          responsibilities: [],
          salary_benefits: rowData['薪资福利说明'] || null,
          education_requirement: rowData['学历要求'] || null,
          experience_years: rowData['工作年限'] || null,
          skills_certificates: skills,
          department: rowData['所属部门'] || null,
          subordinate_count: subordinateCount,
          reports_to: rowData['汇报对象'] || null,
          rank_title: rowData['职级职称'] || null,
          interview_rounds: rowData['面试轮次'] || null,
          interview_process: rowData['面试流程'] || null,
          required_conditions: requiredConditions,
          preferred_conditions: preferredConditions,
          is_published: isPublished,
          status: isPublished ? 'published' : 'draft',
          job_number: generateJobNumber(i + 1),
        };

        // 插入职位
        const { error: insertError } = await supabase
          .from('jobs')
          .insert(jobData);

        if (insertError) {
          results.failed++;
          results.errors.push(`第${i + 2}行：插入失败 - ${insertError.message}`);
        } else {
          results.success++;
        }
      } catch (rowError: any) {
        results.failed++;
        results.errors.push(`第${i + 2}行：处理失败 - ${rowError.message}`);
      }
    }

    return NextResponse.json({
      message: '导入完成',
      results,
    });
  } catch (error: any) {
    console.error('导入失败:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
