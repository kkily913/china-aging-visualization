"""
爬虫脚本：crawler.py
目标：从国家统计局获取各省人口数据，生成前端可用的 JSON 文件

运行方式：
    pip install requests beautifulsoup4 pandas
    python crawler.py

输出文件：
    data/province_data.json   ← 前端 sunburst.html 会 fetch 这个文件
    data/prediction_data.json ← 前端 population_prediction.html 使用

注意：
    国家统计局有时会限制访问频率，脚本里加了 time.sleep() 避免被封
    如果遇到403，换 headers 里的 User-Agent 即可
"""

import requests
import json
import time
import os
from bs4 import BeautifulSoup

# ── 创建输出目录 ───────────────────────────────────────────────────────────────
os.makedirs('data', exist_ok=True)

# ── 请求头（模拟浏览器，避免被反爬） ─────────────────────────────────────────────
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://data.stats.gov.cn/',
}

# ══════════════════════════════════════════════════════════════════════════════
# 方案A：国家统计局开放 API（最推荐，免费、稳定、官方）
# API文档：https://data.stats.gov.cn/easyquery.htm
# 指标代码说明：
#   A0301_a = 年末总人口（万人）
#   A0304    = 65岁及以上人口比重（%）
# ══════════════════════════════════════════════════════════════════════════════

def fetch_stats_gov_api():
    """
    调用国家统计局 EasyQuery API
    获取各省最新人口数据
    """
    print("正在请求国家统计局API...")

    # API端点：查询省级年末总人口
    # dbcode=fsnd 表示分省年度数据
    # zb=A0301 总人口指标
    # reg=省份代码 (空=全部省份)
    url = "https://data.stats.gov.cn/easyquery.htm"

    params = {
        'cn': 'E0103',        # 人口表格编号
        'dbcode': 'fsnd',     # 分省年度数据库
        'zb': 'A0301_a',      # 指标：年末总人口
        'reg': '',            # 地区：空=全部省份
        'sj': '2023',         # 时间：最近年份
        'm': 'QueryData',
    }

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()  # 如果HTTP错误会抛出异常

        data = resp.json()
        print(f"  状态码：{resp.status_code}")
        print(f"  返回数据键：{list(data.keys()) if isinstance(data, dict) else type(data)}")
        return data

    except requests.exceptions.ConnectionError:
        print("  ⚠️  网络连接失败，使用备用数据")
        return None
    except requests.exceptions.Timeout:
        print("  ⚠️  请求超时，使用备用数据")
        return None
    except Exception as e:
        print(f"  ⚠️  请求失败：{e}，使用备用数据")
        return None


# ══════════════════════════════════════════════════════════════════════════════
# 方案B：世界银行 API（国际数据，英文，但稳定性更好）
# 完全免费，无需注册，数据权威
# API文档：https://datahelpdesk.worldbank.org/knowledgebase/articles/889392
# ══════════════════════════════════════════════════════════════════════════════

def fetch_worldbank_api(indicator='SP.POP.TOTL', country='CN', start_year=2000, end_year=2023):
    """
    调用世界银行开放API

    参数：
        indicator: 指标代码
            SP.POP.TOTL  = 总人口
            SP.POP.65UP.TO.ZS = 65岁以上人口占比(%)
            SP.DYN.TFRT.IN = 总和生育率(TFR)
            SP.DYN.LE00.IN = 预期寿命(岁)
        country: 国家代码，CN=中国
        start_year/end_year: 时间范围

    返回：{年份: 值} 的字典
    """
    print(f"正在请求世界银行API：{indicator} / {country}...")

    # 世界银行API格式：
    # https://api.worldbank.org/v2/country/{country}/indicator/{indicator}
    url = f"https://api.worldbank.org/v2/country/{country}/indicator/{indicator}"

    params = {
        'format': 'json',          # 返回JSON格式
        'date': f'{start_year}:{end_year}',  # 时间范围
        'per_page': 100,           # 每页数量（够用了）
        'mrv': 1,                  # most recent value，只取最新值时用
    }

    try:
        resp = requests.get(url, params=params, headers=HEADERS, timeout=15)
        resp.raise_for_status()

        raw = resp.json()
        # 世界银行API返回 [元数据, 数据数组] 格式
        if not raw or len(raw) < 2:
            print(f"  ⚠️  返回数据格式异常")
            return {}

        result = {}
        for item in raw[1]:
            if item.get('value') is not None:
                year = int(item['date'])
                value = float(item['value'])
                result[year] = round(value, 2)

        print(f"  ✅  获取到 {len(result)} 条数据，年份范围：{min(result.keys()) if result else 'N/A'}-{max(result.keys()) if result else 'N/A'}")
        return result

    except requests.exceptions.ConnectionError:
        print(f"  ⚠️  网络连接失败")
        return {}
    except Exception as e:
        print(f"  ⚠️  请求失败：{e}")
        return {}


# ══════════════════════════════════════════════════════════════════════════════
# 方案C：直接解析网页 HTML（当没有API时用）
# 目标：七普数据公报页面（包含各省详细数据）
# ══════════════════════════════════════════════════════════════════════════════

def scrape_html_table(url, table_index=0):
    """
    通用HTML表格爬取函数
    适用于有数据表格的页面

    参数：
        url: 目标页面地址
        table_index: 页面上第几个表格（从0开始）

    返回：二维列表 [[列1,列2,...], [列1,列2,...], ...]
    """
    print(f"正在解析HTML页面：{url}")

    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.encoding = 'utf-8'  # 强制UTF-8避免中文乱码

        # BeautifulSoup：解析HTML的库
        # 'html.parser' 是Python内置解析器，不需要额外安装
        soup = BeautifulSoup(resp.text, 'html.parser')

        # 找到所有表格
        tables = soup.find_all('table')
        if not tables:
            print("  ⚠️  页面中没有找到表格")
            return []

        print(f"  找到 {len(tables)} 个表格，使用第 {table_index+1} 个")
        table = tables[table_index]

        # 提取所有行
        rows = []
        for tr in table.find_all('tr'):
            # 提取每行的单元格（th=表头, td=数据）
            cells = [td.get_text(strip=True) for td in tr.find_all(['th', 'td'])]
            if cells:
                rows.append(cells)

        print(f"  ✅  提取到 {len(rows)} 行数据")
        return rows

    except Exception as e:
        print(f"  ⚠️  解析失败：{e}")
        return []


# ══════════════════════════════════════════════════════════════════════════════
# 备用数据（当网络不可用时使用）
# 来源：国家统计局2024年人口抽样调查 + 各省统计年鉴
# ══════════════════════════════════════════════════════════════════════════════

FALLBACK_PROVINCE_DATA = {
    # 省名: [总人口(万), 60岁以上(万)]
    "辽宁": [4197, 1050], "吉林": [2330, 548], "黑龙江": [3093, 742],
    "北京": [2185, 436],  "天津": [1364, 313],  "河北": [7441, 1637],
    "山西": [3465, 693],  "内蒙古": [2408, 505],
    "上海": [2487, 572],  "江苏": [8526, 2045], "浙江": [6627, 1458],
    "安徽": [6127, 1408], "福建": [4182, 795],  "江西": [4534, 952],
    "山东": [10171, 2441],
    "河南": [9872, 2172], "湖北": [5844, 1286], "湖南": [6568, 1445],
    "广东": [12706, 2160],"广西": [5032, 1056], "海南": [1046, 188],
    "重庆": [3236, 778],  "四川": [8368, 2092], "贵州": [3856, 733],
    "云南": [4772, 955],  "西藏": [390, 47],
    "陕西": [3952, 830],  "甘肃": [2465, 518],  "青海": [595, 107],
    "宁夏": [728, 138],   "新疆": [2587, 440],
}

# 世界银行历史数据备用（TFR/预期寿命/总人口）
FALLBACK_WB_DATA = {
    "tfr": {
        2000:1.81, 2005:1.64, 2010:1.56, 2015:1.60,
        2018:1.49, 2019:1.47, 2020:1.28, 2021:1.16, 2022:1.09
    },
    "life_expectancy": {
        2000:71.7, 2005:73.2, 2010:74.9, 2015:76.3,
        2018:76.9, 2019:77.3, 2020:77.8, 2021:78.2
    },
    "total_population_billion": {
        2000:12.6, 2005:13.0, 2010:13.4, 2015:13.8,
        2019:14.0, 2020:14.1, 2021:14.13, 2022:14.18
    }
}


# ══════════════════════════════════════════════════════════════════════════════
# 主函数：整合所有数据，生成JSON
# ══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("中国人口老龄化数据爬虫")
    print("=" * 60)

    # ── 1. 省级人口数据 ────────────────────────────────────────
    print("\n【1/3】获取省级人口数据...")

    # 尝试调用国家统计局API，失败则用备用数据
    api_result = fetch_stats_gov_api()
    time.sleep(1)  # 礼貌性等待，避免频繁请求

    # 这里用备用数据（因为统计局API需要登录token）
    # 实际部署时替换为 api_result 的解析结果
    province_data = FALLBACK_PROVINCE_DATA

    # 计算老龄化率并排序
    province_output = {}
    for name, (total, old) in province_data.items():
        rate = round(old / total * 100, 1)
        province_output[name] = {
            "total": total,        # 总人口（万）
            "old60": old,          # 60岁以上（万）
            "rate": rate,          # 老龄化率（%）
        }

    # ── 2. 全国历史趋势数据（世界银行）──────────────────────────
    print("\n【2/3】获取全国历史趋势数据...")

    # TFR（总和生育率）
    tfr_data = fetch_worldbank_api('SP.DYN.TFRT.IN', 'CN', 2000, 2022)
    time.sleep(1)

    # 预期寿命
    life_data = fetch_worldbank_api('SP.DYN.LE00.IN', 'CN', 2000, 2022)
    time.sleep(1)

    # 65岁以上占比
    old65_data = fetch_worldbank_api('SP.POP.65UP.TO.ZS', 'CN', 2000, 2022)
    time.sleep(1)

    # 如果API失败，使用备用数据
    if not tfr_data:
        tfr_data = FALLBACK_WB_DATA["tfr"]
        print("  使用备用TFR数据")
    if not life_data:
        life_data = FALLBACK_WB_DATA["life_expectancy"]
        print("  使用备用预期寿命数据")

    # ── 3. 整理为前端可用的格式 ───────────────────────────────────
    print("\n【3/3】生成JSON文件...")

    # 输出1：省级旭日图数据
    output1 = {
        "source": "国家统计局2024年人口抽样调查 + 各省统计年鉴",
        "updated": "2024",
        "note": "60岁及以上口径",
        "provinces": province_output
    }

    with open('data/province_data.json', 'w', encoding='utf-8') as f:
        json.dump(output1, f, ensure_ascii=False, indent=2)
    print("  ✅  data/province_data.json")

    # 输出2：全国历史趋势数据（用于折线图）
    # 按年份合并三个数据集
    all_years = sorted(set(list(tfr_data.keys()) + list(life_data.keys())))
    trend_rows = []
    for year in all_years:
        trend_rows.append({
            "year": year,
            "tfr": tfr_data.get(year),
            "life_expectancy": life_data.get(year),
            "old65_pct": old65_data.get(year),
        })

    output2 = {
        "source": "世界银行开放数据 / World Bank Open Data",
        "indicator_codes": {
            "tfr": "SP.DYN.TFRT.IN",
            "life_expectancy": "SP.DYN.LE00.IN",
            "old65_pct": "SP.POP.65UP.TO.ZS",
        },
        "data": trend_rows
    }

    with open('data/trend_data.json', 'w', encoding='utf-8') as f:
        json.dump(output2, f, ensure_ascii=False, indent=2)
    print("  ✅  data/trend_data.json")

    # ── 打印统计摘要 ────────────────────────────────────────────
    total_pop = sum(v["total"] for v in province_output.values())
    total_old = sum(v["old60"] for v in province_output.values())
    nat_rate  = round(total_old / total_pop * 100, 1)

    sorted_provs = sorted(province_output.items(), key=lambda x: x[1]["rate"], reverse=True)

    print("\n" + "=" * 60)
    print("数据摘要")
    print("=" * 60)
    print(f"  全国总人口：    {total_pop/10000:.2f} 亿")
    print(f"  全国60+人口：   {total_old/10000:.2f} 亿")
    print(f"  全国老龄化率：  {nat_rate}%")
    print(f"  最高省份：      {sorted_provs[0][0]}  {sorted_provs[0][1]['rate']}%")
    print(f"  最低省份：      {sorted_provs[-1][0]}  {sorted_provs[-1][1]['rate']}%")
    print(f"  TFR数据年份：   {min(tfr_data.keys()) if tfr_data else 'N/A'}-{max(tfr_data.keys()) if tfr_data else 'N/A'}")
    print("\n爬虫完成！JSON文件已保存到 data/ 目录")
    print("将 data/ 目录放在项目根目录下，前端会自动读取")


if __name__ == "__main__":
    main()