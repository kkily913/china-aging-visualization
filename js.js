$(function () {

    // ============================================================
    // 统一数据加载入口：先并行fetch所有JSON，再渲染所有图表
    // ============================================================
    Promise.all([
        fetch('data/birth_death.json').then(r => r.json()),
        fetch('data/age_structure.json').then(r => r.json()),
        fetch('data/population.json').then(r => r.json()),
        fetch('data/medical.json').then(r => r.json()),
        fetch('data/pension.json').then(r => r.json()),
        fetch('data/province_aging.json').then(r => r.json())
    ]).then(function([birthDeath, ageStruct, pop, medical, pension, provinceAging]) {

        // 更新顶部数字卡片（总人口 / 60岁以上人口）
        updateTopCards(pop);

        // 渲染各图表
        echarts_1_birthDeath(birthDeath);
        echarts_2_medical(medical);
        echarts_4_ageStruct(ageStruct);
        echarts_5_province(provinceAging);
        echarts_6_pension(pension);
        echarts_31_agePie(ageStruct);
        echarts_32_urbanRural(pop);
        echarts_33_dependency(ageStruct);

    }).catch(function(err) {
        console.error('数据加载失败:', err);
    });

    // ============================================================
    // 更新顶部数字卡片
    // ============================================================
    function updateTopCards(pop) {
        var counters = document.querySelectorAll('.counter');
        if (counters.length >= 2) {
            counters[0].textContent = pop.latest.total.toLocaleString();
            counters[1].textContent = pop.latest.old60plus.toLocaleString();
        }
    }

    // ============================================================
    // echart1：出生率与死亡率（折线+柱状）
    // ============================================================
    function echarts_1_birthDeath(d) {
        var myChart = echarts.init(document.getElementById('echart1'));
        var option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function(params) {
                    var s = params[0].axisValue + ' 年<br/>';
                    params.forEach(function(p) {
                        s += p.marker + p.seriesName + '：' + p.data + ' ‰<br/>';
                    });
                    return s;
                }
            },
            grid: { left: '10', right: '4%', bottom: '0%', top: '14%', containLabel: true },
            legend: {
                data: ['出生率(‰)', '死亡率(‰)'],
                right: '5%', top: 0,
                textStyle: { color: '#fff' }
            },
            xAxis: {
                type: 'category',
                data: d.years,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                axisLabel: {
                    interval: 1,
                    rotate: 30,
                    textStyle: { color: 'rgba(255,255,255,.8)', fontSize: 11 }
                }
            },
            yAxis: {
                type: 'value',
                name: '‰',
                axisLine: { show: false },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                axisLabel: { color: 'rgba(255,255,255,.8)' }
            },
            series: [
                {
                    name: '死亡率(‰)',
                    type: 'line',
                    smooth: true,
                    symbol: 'circle', symbolSize: 8,
                    lineStyle: { color: '#f65ed0', width: 2 },
                    itemStyle: { color: '#f65ed0', borderColor: '#f65ed0', borderWidth: 2 },
                    areaStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: 'rgba(246,94,208,0.3)' },
                            { offset: 1, color: 'rgba(246,94,208,0)' }
                        ])
                    },
                    data: d.death_rate
                },
                {
                    name: '出生率(‰)',
                    type: 'bar',
                    barWidth: '30%',
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#248ff7' },
                            { offset: 1, color: '#6851f1' }
                        ]),
                        barBorderRadius: 6
                    },
                    data: d.birth_rate
                }
            ]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // ============================================================
    // ============================================================
    // echart2：城乡医疗资源对比（每万人医师数 + 床位数）
    // ============================================================
    function echarts_2_medical(d) {
        var myChart = echarts.init(document.getElementById('echart2'));
        var option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { lineStyle: { color: '#dddc6b' } },
                formatter: function(params) {
                    var s = params[0].axisValue + ' 年<br/>';
                    params.forEach(function(p) {
                        s += p.marker + p.seriesName + '：' + p.data + '<br/>';
                    });
                    return s;
                }
            },
            legend: {
                top: '0%',
                data: ['城市医师/万人', '农村医师/万人', '城市床位/万人', '农村床位/万人'],
                textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 10 }
            },
            grid: { left: '20', top: '45', right: '30', bottom: '10', containLabel: true },
            xAxis: [{
                type: 'category',
                boundaryGap: false,
                data: d.years,
                axisLabel: { interval: 2, rotate: 30, textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 10 } },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } }
            }],
            yAxis: [{
                type: 'value',
                name: '每万人',
                axisTick: { show: false },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.3)' } },
                axisLabel: { textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 10 } },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } }
            }],
            series: [
                {
                    name: '城市医师/万人', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 4, showSymbol: false,
                    lineStyle: { color: '#0184d5', width: 2 },
                    areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(1,132,213,0.35)'},{offset:1,color:'rgba(1,132,213,0.05)'}]) },
                    itemStyle: { color: '#0184d5' },
                    data: d.doctor_per_10k_urban
                },
                {
                    name: '农村医师/万人', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 4, showSymbol: false,
                    lineStyle: { color: '#00d887', width: 2 },
                    areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(0,216,135,0.3)'},{offset:1,color:'rgba(0,216,135,0.05)'}]) },
                    itemStyle: { color: '#00d887' },
                    data: d.doctor_per_10k_rural
                },
                {
                    name: '城市床位/万人', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 4, showSymbol: false,
                    lineStyle: { color: '#f65ed0', width: 2, type: 'dashed' },
                    itemStyle: { color: '#f65ed0' },
                    data: d.beds_per_10k_urban
                },
                {
                    name: '农村床位/万人', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 4, showSymbol: false,
                    lineStyle: { color: '#e8d348', width: 2, type: 'dashed' },
                    itemStyle: { color: '#e8d348' },
                    data: d.beds_per_10k_rural
                }
            ]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // echart4：全国各年龄段人口（2011-2024，面积折线）
    // ============================================================
    function echarts_4_ageStruct(d) {
        var myChart = echarts.init(document.getElementById('echart4'));
        var option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { lineStyle: { color: '#dddc6b' } },
                formatter: function(params) {
                    var s = params[0].axisValue + ' 年<br/>';
                    params.forEach(function(p) {
                        s += p.marker + p.seriesName + '：' + p.data.toLocaleString() + ' 万人<br/>';
                    });
                    return s;
                }
            },
            legend: {
                top: '0%',
                data: ['0~14岁', '15~64岁', '65岁及以上'],
                textStyle: { color: 'rgba(255,255,255,.9)', fontSize: 12 }
            },
            grid: { left: '10', top: '50', right: '15', bottom: '5', containLabel: true },
            xAxis: [{
                type: 'category',
                boundaryGap: false,
                data: d.years,
                axisLabel: {
                    interval: 1, rotate: 30,
                    textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 11 }
                },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } }
            }],
            yAxis: [{
                type: 'value',
                name: '万人',
                axisTick: { show: false },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.5)' } },
                axisLabel: { textStyle: { color: 'rgba(255,255,255,.8)', fontSize: 11 } },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } }
            }],
            series: [
                {
                    name: '0~14岁', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 6,
                    lineStyle: { color: '#0184d5', width: 2 },
                    areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(1,132,213,0.4)'},{offset:1,color:'rgba(1,132,213,0.05)'}]) },
                    itemStyle: { color: '#0184d5' },
                    data: d.age_0_14
                },
                {
                    name: '15~64岁', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 6,
                    lineStyle: { color: '#00d887', width: 2 },
                    areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(0,216,135,0.4)'},{offset:1,color:'rgba(0,216,135,0.05)'}]) },
                    itemStyle: { color: '#00d887' },
                    data: d.age_15_64
                },
                {
                    name: '65岁及以上', type: 'line', smooth: true,
                    symbol: 'circle', symbolSize: 6,
                    lineStyle: { color: '#e8d348', width: 2 },
                    areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'rgba(232,211,72,0.4)'},{offset:1,color:'rgba(232,211,72,0.05)'}]) },
                    itemStyle: { color: '#e8d348' },
                    data: d.age_65plus
                }
            ]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // ============================================================
    // echart5：各省60岁以上人口分布（Top15，七普数据）
    // ============================================================
    function echarts_5_province(d) {
        var myChart = echarts.init(document.getElementById('echart5'));

        // 从省份数据中提取Top15（按60+比率排序）
        var provinces = Object.entries(d.provinces)
            .filter(function(e) { return e[0] !== '全国'; })
            .sort(function(a, b) { return b[1].rate_60plus - a[1].rate_60plus; })
            .slice(0, 15);

        var names = provinces.map(function(e) { return e[0]; });
        var values = provinces.map(function(e) { return e[1].rate_60plus; });

        var option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function(params) {
                    return params[0].name + '<br/>60岁以上占比：' + params[0].data + '%';
                }
            },
            grid: { left: '0%', top: '12px', right: '4%', bottom: '0%', containLabel: true },
            xAxis: [{
                type: 'category',
                data: names,
                axisLine: { lineStyle: { color: 'rgba(166,161,170,0.1)' } },
                axisTick: { show: false },
                axisLabel: {
                    interval: 0, rotate: 35,
                    textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 11 }
                }
            }],
            yAxis: [{
                name: '占比(%)',
                type: 'value',
                axisLabel: {
                    formatter: '{value}%',
                    textStyle: { color: 'rgba(255,255,255,.8)', fontSize: 11 }
                },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } }
            }],
            series: [{
                name: '60岁以上占比',
                type: 'bar',
                barWidth: '60%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#00f0ff' },
                        { offset: 1, color: '#0056b3' }
                    ]),
                    barBorderRadius: [4, 4, 0, 0]
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    color: 'rgba(255,255,255,.8)',
                    fontSize: 10
                },
                data: values
            }]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // ============================================================
    // echart6：养老保险参保人数与领取人数趋势
    // ============================================================
    function echarts_6_pension(d) {
        var myChart = echarts.init(document.getElementById('echart6'));
        // 过滤掉null值
        var recipients = d.recipients.map(function(v) { return v === null ? '-' : v; });

        var option = {
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'cross' },
                formatter: function(params) {
                    var s = params[0].axisValue + ' 年<br/>';
                    params.forEach(function(p) {
                        if (p.data !== '-') s += p.marker + p.seriesName + '：' + p.data.toLocaleString() + ' 万人<br/>';
                    });
                    return s;
                }
            },
            legend: {
                data: ['参保人数(万人)', '实际领取人数(万人)'],
                bottom: '-5',
                itemWidth: 11, itemHeight: 10,
                textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 11 }
            },
            grid: { left: '5%', right: '4%', top: '10%', bottom: '20%', containLabel: true },
            xAxis: {
                type: 'category',
                data: d.years,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } },
                axisLabel: {
                    interval: 1, rotate: 30,
                    textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 10 }
                }
            },
            yAxis: {
                type: 'value',
                name: '万人',
                axisLine: { show: false },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } },
                axisLabel: { color: 'rgba(255,255,255,.7)', fontSize: 10 }
            },
            series: [
                {
                    name: '参保人数(万人)',
                    type: 'bar',
                    barWidth: '35%',
                    itemStyle: {
                        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: '#0f63d6' },
                            { offset: 1, color: '#0f78d6' }
                        ]),
                        barBorderRadius: [4, 4, 0, 0]
                    },
                    data: d.insured
                },
                {
                    name: '实际领取人数(万人)',
                    type: 'line',
                    smooth: true,
                    symbol: 'circle', symbolSize: 7,
                    lineStyle: { color: '#00f6ff', width: 2 },
                    itemStyle: { color: '#00f6ff' },
                    data: recipients
                }
            ]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // ============================================================
    // ============================================================
    // fb1：老年人口年龄层次（环形图，窄列适配）
    // ============================================================
    function echarts_31_agePie(d) {
        var myChart = echarts.init(document.getElementById('fb1'));
        var latest = d.years.length - 1;
        var old65 = d.age_65plus[latest];
        var old60 = Math.round(old65 * 1.65);
        var low  = Math.round(old60 * 0.47);
        var mid  = Math.round(old60 * 0.32);
        var high = old60 - low - mid;

        var option = {
            title: [{ text: '老年年龄层次', left: 'center', top: '1%',
                textStyle: { color: '#fff', fontSize: 11 } }],
            tooltip: {
                trigger: 'item',
                formatter: '{b}\n{c}万人 ({d}%)',
                position: function(p) { return [p[0]+8, p[1]-8]; }
            },
            legend: {
                orient: 'vertical',
                right: '2%', top: 'middle',
                itemWidth: 8, itemHeight: 8, itemGap: 6,
                textStyle: { color: 'rgba(255,255,255,.7)', fontSize: 9 },
                data: ['低龄(60~69)', '中龄(70~79)', '高龄(80+)']
            },
            series: [{
                name: '年龄层次',
                type: 'pie',
                center: ['40%', '54%'],
                radius: ['38%', '58%'],
                color: ['#82b6e8', '#6af3d3', '#ce5e92'],
                label: { show: false },
                labelLine: { show: false },
                data: [
                    { value: low,  name: '低龄(60~69)' },
                    { value: mid,  name: '中龄(70~79)' },
                    { value: high, name: '高龄(80+)' }
                ]
            }]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // ============================================================
    // fb2：城乡人口分布（环形图，窄列适配）
    // ============================================================
    function echarts_32_urbanRural(d) {
        var myChart = echarts.init(document.getElementById('fb2'));
        var latestIdx = d.years.indexOf(2024);
        var urban = d.urban[latestIdx];
        var rural = d.rural[latestIdx];

        var option = {
            title: [{ text: '城乡人口(2024)', left: 'center', top: '1%',
                textStyle: { color: '#fff', fontSize: 11 } }],
            tooltip: {
                trigger: 'item',
                formatter: '{b}\n{c}万人 ({d}%)',
                position: function(p) { return [p[0]+8, p[1]-8]; }
            },
            legend: {
                orient: 'vertical',
                right: '2%', top: 'middle',
                itemWidth: 8, itemHeight: 8, itemGap: 8,
                textStyle: { color: 'rgba(255,255,255,.7)', fontSize: 9 },
                data: ['城镇人口', '农村人口']
            },
            series: [{
                name: '城乡分布',
                type: 'pie',
                center: ['40%', '54%'],
                radius: ['38%', '58%'],
                color: ['#0fe8a4', '#7d86d5'],
                label: { show: false },
                labelLine: { show: false },
                data: [
                    { value: urban, name: '城镇人口' },
                    { value: rural, name: '农村人口' }
                ]
            }]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

    // ============================================================
    // fb3：老年抚养比趋势（迷你折线，窄列适配）
    // ============================================================
    function echarts_33_dependency(d) {
        var myChart = echarts.init(document.getElementById('fb3'));
        var option = {
            title: [{ text: '老年抚养比(%)', left: 'center', top: '1%',
                textStyle: { color: '#fff', fontSize: 11 } }],
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    return params[0].axisValue + '年\n老年抚养比：' + params[0].data + '%';
                }
            },
            grid: { left: '8%', right: '4%', top: '20%', bottom: '12%', containLabel: true },
            xAxis: {
                type: 'category',
                data: d.years,
                axisLabel: { interval: 3, rotate: 30,
                    textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 9 } },
                axisLine: { lineStyle: { color: 'rgba(255,255,255,.2)' } }
            },
            yAxis: {
                type: 'value',
                axisLabel: { formatter: '{value}%',
                    textStyle: { color: 'rgba(255,255,255,.6)', fontSize: 9 } },
                splitLine: { lineStyle: { color: 'rgba(255,255,255,.1)' } }
            },
            series: [{
                type: 'line', smooth: true,
                symbol: 'circle', symbolSize: 4,
                lineStyle: { color: '#ce5e92', width: 2 },
                areaStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1,
                        [{offset:0,color:'rgba(206,94,146,0.4)'},{offset:1,color:'rgba(206,94,146,0.05)'}]) },
                itemStyle: { color: '#ce5e92' },
                data: d.old_dependency_ratio
            }]
        };
        myChart.setOption(option);
        window.addEventListener('resize', function() { myChart.resize(); });
    }

});