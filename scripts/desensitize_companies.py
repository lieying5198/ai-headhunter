import json
import re

# 读取原始数据
with open('scripts/jobs_import.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# 具体公司名 → 模糊化映射
REPLACE_MAP = {
    '昆明伊之味餐饮服务有限公司': '某知名餐饮企业',
    '安徽老乡鸡餐饮有限公司': '某知名餐饮连锁企业',
    '海鸿达（北京）餐饮管理有限公司': '某知名餐饮集团',
    '广州齐成商务有限公司': '某知名商务服务企业',
    '美宜佳控股有限公司': '某知名连锁零售企业',
    '深圳雷特网络科技有限公司': '某知名互联网企业',
    '湖北煜林丰华控股集团有限公司': '某知名控股集团',
    '江苏梧桐人工智能科技有限公司': '某知名AI科技企业',
    '抖音视界有限公司': '某知名短视频平台',
}

# 模糊化规则（按关键词匹配）
KEYWORD_MAP = {
    '餐饮': '某知名餐饮企业',
    '科技': '某知名科技企业',
    '网络': '某知名互联网企业',
    '人力资源': '某知名人力资源服务企业',
    '管理咨询': '某知名管理咨询公司',
    '投资': '某知名投资机构',
    '基金': '某知名金融机构',
    '医药': '某知名医药企业',
    '医疗': '某知名医疗企业',
    '地产': '某知名地产企业',
    '房地产': '某知名地产企业',
    '汽车': '某知名汽车企业',
    '新能源': '某知名新能源企业',
    '教育': '某知名教育机构',
    '物流': '某知名物流企业',
    '供应链': '某知名供应链企业',
}

def desensitize(company_name: str) -> str:
    if not company_name or company_name.strip() == '':
        return ''
    name = company_name.strip()
    # 已经是模糊化的，保留
    if name.startswith('某') or name.startswith('知名'):
        return name
    # 精确匹配
    if name in REPLACE_MAP:
        return REPLACE_MAP[name]
    # 关键词匹配
    for kw, replacement in KEYWORD_MAP.items():
        if kw in name:
            return replacement
    # 兜底：取行业猜测
    return '某知名企业'

updated = 0
for job in data:
    if job.get('company_name_temp'):
        old = job['company_name_temp']
        new = desensitize(old)
        if old != new:
            updated += 1
        job['company_name_temp'] = new

# 保存
with open('public/data/jobs.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f'✅ 处理完成，共 {len(data)} 条')
print(f'   模糊化公司名: {updated} 条')
print(f'   已保存到 public/data/jobs.json')
