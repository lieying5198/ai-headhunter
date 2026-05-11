import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';

// Excel 模板字段定义
const TEMPLATE_FIELDS = [
  { key: 'title', label: '职位名称*', required: true },
  { key: 'company_anon', label: '公司简称*', required: true },
  { key: 'city', label: '城市*', required: true },
  { key: 'salary_min', label: '最低薪资(万/年)', required: false },
  { key: 'salary_max', label: '最高薪资(万/年)', required: false },
  { key: 'salary_benefits', label: '薪资福利说明', required: false },
  { key: 'education_requirement', label: '学历要求', required: false },
  { key: 'experience_years', label: '工作年限', required: false },
  { key: 'skills_certificates', label: '技能/证书(逗号分隔)', required: false },
  { key: 'department', label: '所属部门', required: false },
  { key: 'subordinate_count', label: '下属人数', required: false },
  { key: 'reports_to', label: '汇报对象', required: false },
  { key: 'rank_title', label: '职级职称', required: false },
  { key: 'interview_rounds', label: '面试轮次', required: false },
  { key: 'interview_process', label: '面试流程', required: false },
  { key: 'tags', label: '职位亮点(逗号分隔)', required: false },
  { key: 'anonymized_jd', label: '职位描述*', required: true },
  { key: 'required_conditions', label: '必备条件(逗号分隔)', required: false },
  { key: 'preferred_conditions', label: '优先条件(逗号分隔)', required: false },
  { key: 'consultant_wechat', label: '顾问微信号*', required: true },
  { key: 'is_published', label: '是否发布(1=发布,0=下架)', required: false },
];

export async function GET(request: NextRequest) {
  try {
    // 创建工作簿
    const wb = xlsx.utils.book_new();

    // 创建模板数据（带说明行）
    const templateData = [
      // 第一行：字段说明
      TEMPLATE_FIELDS.map(f => f.label),
      // 第二行：示例数据
      [
        '销售总监',
        '某知名互联网公司',
        '深圳',
        '150',
        '240',
        '年薪open，配套股权激励计划',
        '本科·一本',
        '10年及以上',
        'PMP证书',
        '信息中心',
        '10',
        '董事长',
        '高级总监',
        '4轮',
        '面试流程比较灵活，特别优秀可以缩短流程',
        '高薪激励,股权激励,快速晋升',
        '负责公司销售团队管理，制定销售策略...',
        '10年以上销售管理经验',
        '有互联网行业背景',
        'lieying123',
        '1',
      ],
    ];

    const ws = xlsx.utils.aoa_to_sheet(templateData);

    // 设置列宽
    ws['!cols'] = TEMPLATE_FIELDS.map(() => ({ wch: 20 }));

    xlsx.utils.book_append_sheet(wb, ws, '职位导入模板');

    // 生成 Excel 文件
    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent('职位导入模板.xlsx')}`,
      },
    });
  } catch (error: any) {
    console.error('生成模板失败:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
