$(function () {
    drawAgingMap();

    function drawAgingMap() {
        var myChart = echarts.init(document.getElementById('map_1'));

        var data = [
            {name: "山东", value: 2184}, {name: "河南", value: 1822}, {name: "四川", value: 1821},
            {name: "江苏", value: 1732}, {name: "广东", value: 1586}, {name: "河北", value: 1459},
            {name: "湖南", value: 1384}, {name: "安徽", value: 1344}, {name: "湖北", value: 1320},
            {name: "浙江", value: 1271}, {name: "云南", value: 1057}, {name: "广西", value: 1028},
            {name: "黑龙江", value: 1010}, {name: "江西", value: 1010}, {name: "辽宁", value: 989},
            {name: "山西", value: 909}, {name: "贵州", value: 874}, {name: "重庆", value: 711},
            {name: "陕西", value: 706}, {name: "福建", value: 700}, {name: "吉林", value: 585},
            {name: "北京", value: 441}, {name: "上海", value: 426}, {name: "新疆", value: 423},
            {name: "内蒙古", value: 388}, {name: "天津", value: 256}, {name: "甘肃", value: 244},
            {name: "海南", value: 121}, {name: "宁夏", value: 78}, {name: "青海", value: 55},
            {name: "西藏", value: 22}
        ];

        var option = {
            title: {
                text: '中国各省60岁及以上人口分布（万人）',
                subtext: '数据来源：国家统计局',
                left: 'center',
                textStyle: { color: '#e8f3f4', fontSize: 18, textShadowBlur: 10, textShadowColor: '#d8e3e4' }
            },
            tooltip: {
                trigger: 'item',
                backgroundColor: 'rgba(11, 26, 74, 0.85)',
                borderColor: '#00f6ff',
                textStyle: { color: '#fff' },
                formatter: function (params) {
                    if (!params.value) return params.name + '：暂无数据';
                    return '<b style="color:#00f6ff">' + params.name + '</b><br/>老龄人口：' + params.value + ' 万人';
                }
            },
            visualMap: {
                type: 'piecewise',
                left: '25%',
                bottom: '5%',
                textStyle: { color: '#e0e0e0' },
                pieces: [
                    {min: 2000, label: '≥2000万人', color: '#800026'},
                    {min: 1500, max: 1999, label: '1500-1999万人', color: '#BD0026'},
                    {min: 1000, max: 1499, label: '1000-1499万人', color: '#E31A1C'},
                    {min: 500, max: 999, label: '500-999万人', color: '#FC4E2A'},
                    {min: 100, max: 499, label: '100-499万人', color: '#FD8D3C'},
                    {min: 10, max: 99, label: '10-99万人', color: '#FEB24C'},
                    {max: 9, label: '<10万人', color: '#FED976'}
                ]
            },
            series: [
                {
                    name: '老龄人口',
                    type: 'map',
                    map: 'china1',
                    roam: true,
                    label: { show: true, color: '#fff' },
                    itemStyle: {
                        borderColor: 'rgba(0, 246, 255, 0.5)',
                        areaColor: 'rgba(0,0,0,0.1)'
                    },
                    emphasis: {
                        label: { color: '#fff' },
                        itemStyle: { areaColor: '#0056b3', shadowBlur: 10, shadowColor: '#00f6ff' }
                    },
                    data: data
                }
            ]
        };

        myChart.setOption(option);

        // 优化：极大削减跳转动画强加的延迟，增强流畅感
        myChart.on('click', function (params) {
            if (params && params.name) {
                document.body.style.animation = "fadeOut 0.15s forwards";
                setTimeout(() => {
                    var target = 'detail.html?name=' + encodeURIComponent(params.name);
                    window.location.href = target;
                }, 100);
            }
        });
    }
});