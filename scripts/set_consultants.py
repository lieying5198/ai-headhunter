# scripts/set_consultants.py
# 为职位分配顾问微信
# 用法: python scripts/set_consultants.py

import json

# 顾问配置：可以按城市、行业、薪资段分配不同顾问
CONSULTANTS = {
    # 默认顾问
    'default': {
        'wechat': 'LieYing5198',
        'name': '猎英盟顾问'
    },
    # 按城市分配
    # '昆明': 'LieYing5198',
    # '深圳': 'other_wechat',
}

# 职位匹配规则（按优先级）
RULES = [
    # 规则格式: (字段, 值, 顾问微信)
    # ('city', '昆明', 'wechat_1'),
    # ('level', '高级', 'wechat_2'),
]

def get_consultant_for_job(job):
    """根据职位信息匹配顾问"""
    # 1. 优先检查职位是否已有顾问微信
    if job.get('consultant_wechat'):
        return job.get('consultant_wechat')

    # 2. 按城市匹配
    city = job.get('city', '')
    if city in CONSULTANTS:
        return CONSULTANTS[city]

    # 3. 按职位级别匹配
    level = job.get('level', '')
    if level in ['高级', '资深', '专家']:
        return 'LieYing5198'  # 高端职位指定顾问

    # 4. 返回默认顾问
    return CONSULTANTS['default']['wechat']

def main():
    # 读取职位数据
    with open('public/data/jobs.json', 'r', encoding='utf-8') as f:
        jobs = json.load(f)

    print(f"共有 {len(jobs)} 个职位")

    # 统计各顾问分配数量
    consultant_counts = {}

    for job in jobs:
        wechat = get_consultant_for_job(job)
        job['consultant_wechat'] = wechat

        consultant_counts[wechat] = consultant_counts.get(wechat, 0) + 1

    # 保存
    with open('public/data/jobs.json', 'w', encoding='utf-8') as f:
        json.dump(jobs, f, ensure_ascii=False, indent=2)

    print("\n分配完成！各顾问负责的职位数量：")
    for wechat, count in sorted(consultant_counts.items()):
        print(f"  {wechat}: {count} 个职位")

if __name__ == '__main__':
    main()
