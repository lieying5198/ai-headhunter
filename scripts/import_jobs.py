import pandas as pd
import os
import re
import json
import sys
import uuid

# ==========================================
# 配置区 - 请修改以下变量
# ==========================================

SUPABASE_URL = ""
SUPABASE_KEY = ""

FILES = [
    "C:/Users/lieying/Desktop/人力类职位20260423.xlsx",
    "C:/Users/lieying/Desktop/合作职位清单1.xlsx",
    "C:/Users/lieying/Desktop/HW人力职位04272026.xlsx",
]

# ==========================================

def parse_salary(salary_str):
    if not salary_str or pd.isna(salary_str):
        return None, None
    s = str(salary_str).strip()
    match = re.search(r'(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)', s)
    if match:
        min_val = float(match.group(1))
        max_val = float(match.group(2))
        if '万' in s or 'w' in s.lower():
            return int(min_val), int(max_val)
        return int(min_val / 10000), int(max_val / 10000)
    match = re.search(r'(\d+(?:\.\d+)?)', s)
    if match:
        val = float(match.group(1))
        if '万' in s or 'w' in s.lower():
            return int(val), None
        return int(val / 10000), None
    return None, None

def map_columns(df):
    """自动映射列名"""
    mapping = {
        'title': ['title', 'postion-title', '职位', '岗位名称', 'job_title', '岗位', 'position'],
        'salary': ['jobInfo', 'salary', '薪资', '薪酬', '薪'],
        'city': ['jobInfo 2', 'base（工作地）', '城市', '工作地', '工作地点', 'base', 'city'],
        'education': ['jobInfo 3', '学历', '教育要求', '学历要求'],
        'experience': ['jobInfo 4', '经验要求', '经验', '工作经验'],
        'hc': ['jobInfo 5', '需求人数', 'HC', 'hc'],
        'company': ['companyTitle', 'enterprise-name', '公司', '企业名称', 'company', '公司名称'],
    }
    result = {}
    for key, aliases in mapping.items():
        for alias in aliases:
            if alias in df.columns:
                result[key] = alias
                break
    return result

def import_excel(file_path):
    print(f"\n📂 {os.path.basename(file_path)}")
    if not os.path.exists(file_path):
        print(f"  ❌ 文件不存在")
        return []

    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"  ❌ 读取失败: {e}")
        return []

    print(f"  行数: {len(df)}, 列: {list(df.columns)[:5]}...")
    col_map = map_columns(df)
    print(f"  列映射: {col_map}")

    jobs = []
    for i, (_, row) in enumerate(df.iterrows()):
        job = {}
        job['id'] = str(uuid.uuid4())

        if 'title' not in col_map or pd.isna(row[col_map['title']]):
            continue

        job['title'] = str(row[col_map['title']]).strip()
        job['status'] = 'published'
        job['is_published'] = True
        job['tags'] = []
        job['view_count'] = 0
        job['apply_count'] = 0
        job['summary'] = f"急招{job['title']}岗位，欢迎投递！"

        if 'salary' in col_map:
            mn, mx = parse_salary(row[col_map['salary']])
            job['salary_min'] = mn
            job['salary_max'] = mx

        if 'city' in col_map and pd.notna(row[col_map['city']]):
            city = re.sub(r'\s+', '', str(row[col_map['city']]))
            if city and city not in ['不限', 'nan', 'NaN']:
                job['city'] = city

        if 'education' in col_map and pd.notna(row[col_map['education']]):
            edu = str(row[col_map['education']]).strip()
            if '本科' in edu or '学士' in edu:
                job['level'] = '中级'
            elif '硕士' in edu or '研究生' in edu:
                job['level'] = '高级'
            elif '大专' in edu:
                job['level'] = '初级'

        if 'company' in col_map and pd.notna(row[col_map['company']]):
            job['company_name_temp'] = str(row[col_map['company']]).strip()

        jobs.append(job)

    print(f"  ✅ 解析 {len(jobs)} 个职位")
    return jobs

def main():
    all_jobs = []
    for f in FILES:
        jobs = import_excel(f)
        all_jobs.extend(jobs)

    print(f"\n📊 总计: {len(all_jobs)} 个职位")

    if not all_jobs:
        print("❌ 没有可导入的数据")
        return

    # 导出 JSON
    out = os.path.join(os.path.dirname(__file__), 'jobs_import.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(all_jobs, f, ensure_ascii=False, indent=2)
    print(f"✅ 已导出到 {out}")

    # 尝试导入 Supabase
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("\n⚠️  请在脚本中填写 SUPABASE_URL 和 SUPABASE_KEY")
        print("   然后重新运行")
        return

    try:
        from supabase import create_client
        sb = create_client(SUPABASE_URL, SUPABASE_KEY)
        result = sb.table('jobs').insert(all_jobs).execute()
        print(f"\n✅ Supabase 导入成功: {len(result.data)} 条")
    except ImportError:
        print("\n⚠️  未安装 supabase-py，请运行: pip install supabase")
    except Exception as e:
        print(f"\n❌ Supabase 导入失败: {e}")

if __name__ == '__main__':
    main()
