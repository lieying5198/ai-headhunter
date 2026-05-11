# 数据导入说明

## 数据来源

已读取以下文件：
1. `人力类职位20260423.xlsx` - 标题/薪资/城市/经验/公司
2. `合作职位清单1.xlsx` - 职位/薪资/城市/经验/公司
3. `HW人力职位04272026.xlsx` - 标题/薪资/城市/学历/经验/公司

## 导入步骤

### 1. 配置 Supabase（如果还未配置）

1. 访问 https://supabase.com 创建项目
2. 在 SQL Editor 执行 `supabase/schema.sql`
3. 复制 URL 和 anon/public key 到 `.env.local`：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

### 2. 运行导入脚本

```bash
cd ai-headhunter
pip install pandas openpyxl supabase
python scripts/import_jobs.py
```

## 导入脚本

文件：`scripts/import_jobs.py`

```python
import pandas as pd
import os
import sys
import re

# 添加父目录到路径以便导入 supabase client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from supabase import create_client, Client
    
    # 从 .env.local 读取配置
    supabase_url = None
    supabase_key = None
    with open('.env.local', 'r') as f:
        for line in f:
            if line.startswith('NEXT_PUBLIC_SUPABASE_URL='):
                supabase_url = line.strip().split('=', 1)[1]
            elif line.startswith('NEXT_PUBLIC_SUPABASE_ANON_KEY='):
                supabase_key = line.strip().split('=', 1)[1]
    
    if not supabase_url or not supabase_key:
        print("❌ 请在 .env.local 中配置 Supabase URL 和 Key")
        sys.exit(1)
        
    supabase: Client = create_client(supabase_url, supabase_key)
    print("✅ Supabase 连接成功")
    
except ImportError:
    print("⚠️  supabase-py 未安装，将仅导出 SQL 文件")
    supabase = None

def parse_salary(salary_str):
    """解析薪资字符串，返回 (min, max) 单位：万/年"""
    if not salary_str or pd.isna(salary_str):
        return None, None
    
    s = str(salary_str).strip()
    
    # 匹配 "15-30万" 或 "35-40w" 或 "60-100W"
    match = re.search(r'(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)', s)
    if match:
        min_val = float(match.group(1))
        max_val = float(match.group(2))
        
        # 如果是 "w" 或 "万"，已经是万为单位
        if '万' in s or 'w' in s.lower():
            return int(min_val), int(max_val)
        else:
            # 假设是元，转换为万
            return int(min_val / 10000), int(max_val / 10000)
    
    # 单个数字
    match = re.search(r'(\d+(?:\.\d+)?)', s)
    if match:
        val = float(match.group(1))
        if '万' in s or 'w' in s.lower():
            return int(val), None
        else:
            return int(val / 10000), None
    
    return None, None

def import_excel(file_path, consultant_id=None):
    """导入单个 Excel 文件"""
    print(f"\n📂 读取文件: {os.path.basename(file_path)}")
    
    try:
        df = pd.read_excel(file_path)
    except Exception as e:
        print(f"❌ 读取失败: {e}")
        return []
    
    print(f"   共 {len(df)} 行数据")
    print(f"   列名: {list(df.columns)}")
    
    jobs = []
    
    for idx, row in df.iterrows():
        job = {}
        
        # 通用字段映射（适配不同文件的列名）
        # title
        for col in ['title', 'postion-title', '职位', '岗位名称', 'job_title', '岗位']:
            if col in df.columns and pd.notna(row[col]):
                job['title'] = str(row[col]).strip()
                break
        
        if 'title' not in job:
            continue  # 没有标题的跳过
        
        # salary
        salary_col = None
        for col in ['jobInfo', 'salary', '薪资', '薪酬']:
            if col in df.columns:
                salary_col = col
                break
        
        if salary_col:
            min_s, max_s = parse_salary(row[salary_col])
            job['salary_min'] = min_s
            job['salary_max'] = max_s
        
        # city
        city_col = None
        for col in ['jobInfo 2', 'base（工作地）', '城市', '工作地', 'base']:
            if col in df.columns:
                city_col = col
                break
        
        if city_col and pd.notna(row[city_col]):
            city = str(row[city_col]).strip()
            # 清理城市名
            city = re.sub(r'\s+', '', city)
            if city and city not in ['不限', 'NAN', 'nan']:
                job['city'] = city
        
        # industry / company
        company_col = None
        for col in ['companyTitle', 'enterprise-name', '公司', '企业名称']:
            if col in df.columns:
                company_col = col
                break
        
        if company_col and pd.notna(row[company_col]):
            job['company_name'] = str(row[company_col]).strip()
        
        # experience
        exp_col = None
        for col in ['jobInfo 4', '经验要求', '经验', '工作经验']:
            if col in df.columns:
                exp_col = col
                break
        
        if exp_col and pd.notna(row[exp_col]):
            job['experience'] = str(row[exp_col]).strip()
        
        # education
        edu_col = None
        for col in ['jobInfo 3', '学历', '教育要求']:
            if col in df.columns:
                edu_col = col
                break
        
        job['status'] = 'published'
        job['is_published'] = True
        job['consultant_id'] = consultant_id
        job['tags'] = []
        job['apply_count'] = 0
        
        jobs.append(job)
    
    print(f"   成功解析 {len(jobs)} 个职位")
    return jobs

def main():
    # 要导入的 Excel 文件列表
    files = [
        "C:/Users/lieying/Desktop/人力类职位20260423.xlsx",
        "C:/Users/lieying/Desktop/合作职位清单1.xlsx",
        "C:/Users/lieying/Desktop/HW人力职位04272026.xlsx",
    ]
    
    all_jobs = []
    
    for f in files:
        if os.path.exists(f):
            jobs = import_excel(f)
            all_jobs.extend(jobs)
        else:
            print(f"⚠️  文件不存在: {f}")
    
    print(f"\n📊 总共解析 {len(all_jobs)} 个职位")
    
    if not all_jobs:
        print("❌ 没有可导入的职位")
        return
    
    # 导出为 JSON（方便检查）
    import json
    with open('scripts/jobs_import.json', 'w', encoding='utf-8') as f:
        json.dump(all_jobs, f, ensure_ascii=False, indent=2)
    print("✅ 已导出到 scripts/jobs_import.json")
    
    # 如果 Supabase 已配置，直接导入
    if supabase:
        print("\n🚀 开始导入 Supabase...")
        try:
            result = supabase.table('jobs').insert(all_jobs).execute()
            print(f"✅ 成功导入 {len(result.data)} 条记录")
        except Exception as e:
            print(f"❌ 导入失败: {e}")
            print("请检查：")
            print("  1. Supabase 表结构是否正确创建")
            print("  2. RLS 策略是否允许插入")
            print("  3. consultant_id 是否有效")
    else:
        print("\n⚠️  未安装 supabase-py，仅导出 JSON")
        print("   请运行: pip install supabase")
        print("   然后重新运行此脚本")

if __name__ == '__main__':
    main()
```

## 下一步

1. 安装依赖：`pip install pandas openpyxl supabase`
2. 配置 `.env.local` 中的 Supabase 凭证
3. 执行导入：`python scripts/import_jobs.py`
