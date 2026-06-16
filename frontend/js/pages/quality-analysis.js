/**
 * 不合格分析页面
 */
const QualityAnalysisPage = {
    paretoData: null,
    overviewData: null,
    days: 30,
    chart: null,

    init() {
        this.loadData();
    },

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    },

    async loadData() {
        try {
            const [paretoRes, overviewRes] = await Promise.all([
                QualityService.getPareto(this.days),
                QualityService.getOverview()
            ]);

            if (paretoRes.code === 200) {
                this.paretoData = paretoRes.data;
            }
            if (overviewRes.code === 200) {
                this.overviewData = overviewRes.data;
            }

            this.render();
        } catch (error) {
            Toast.error('加载统计数据失败');
        }
    },

    render() {
        const container = document.getElementById('pageContainer');

        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="stat-cards">
                <div class="stat-card">
                    <div class="stat-card-icon primary">📋</div>
                    <div class="stat-card-title">质检单总数</div>
                    <div class="stat-card-value">${Formatter.formatNumber(this.overviewData?.total_orders || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon success">✅</div>
                    <div class="stat-card-title">合格数</div>
                    <div class="stat-card-value">${Formatter.formatNumber(this.overviewData?.qualified_orders || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon danger">❌</div>
                    <div class="stat-card-title">不合格数</div>
                    <div class="stat-card-value">${Formatter.formatNumber(this.overviewData?.unqualified_orders || 0)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon warning">📈</div>
                    <div class="stat-card-title">合格率</div>
                    <div class="stat-card-value">${this.overviewData?.pass_rate || 0}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card-icon info">🔍</div>
                    <div class="stat-card-title">缺陷总数</div>
                    <div class="stat-card-value">${Formatter.formatNumber(this.overviewData?.total_defect_quantity || 0)}</div>
                </div>
            </div>

            <div class="grid grid-2">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">缺陷类型帕累托图</h3>
                        <div>
                            <select class="form-control form-control-sm" id="daysSelect" onchange="QualityAnalysisPage.changeDays(this.value)">
                                <option value="7" ${this.days === 7 ? 'selected' : ''}>近7天</option>
                                <option value="30" ${this.days === 30 ? 'selected' : ''}>近30天</option>
                                <option value="90" ${this.days === 90 ? 'selected' : ''}>近90天</option>
                                <option value="365" ${this.days === 365 ? 'selected' : ''}>近一年</option>
                            </select>
                        </div>
                    </div>
                    <div class="card-body">
                        <canvas id="paretoChart" height="300"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Top 5 缺陷类型</h3>
                    </div>
                    <div class="card-body">
                        <div id="top5Cards" style="display: grid; gap: 12px;">
                            ${this.renderTop5Cards()}
                        </div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">缺陷类型明细</h3>
                </div>
                <div class="card-body">
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 60px;">排名</th>
                                    <th>缺陷类型</th>
                                    <th>缺陷数量</th>
                                    <th>占比</th>
                                    <th>累计占比</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.renderDefectTable()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.renderParetoChart();
    },

    renderTop5Cards() {
        const top5 = this.paretoData?.top5 || [];

        if (top5.length === 0) {
            return '<p class="empty-text">暂无数据</p>';
        }

        const colors = ['#dc3545', '#fd7e14', '#ffc107', '#17a2b8', '#6f42c1'];
        const icons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

        return top5.map((item, idx) => `
            <div style="display: flex; align-items: center; gap: 12px; padding: 12px; 
                        background: var(--bg-light); border-radius: 8px; 
                        border-left: 4px solid ${colors[idx]};">
                <div style="font-size: 28px;">${icons[idx]}</div>
                <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 15px;">${Validator.sanitize(item.defect_type)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">
                        缺陷数量: <strong>${item.quantity}</strong> | 占比: ${item.percent}%
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 24px; font-weight: bold; color: ${colors[idx]};">
                        ${item.quantity}
                    </div>
                    <div style="font-size: 11px; color: var(--text-secondary);">件</div>
                </div>
            </div>
        `).join('');
    },

    renderDefectTable() {
        const labels = this.paretoData?.labels || [];
        const values = this.paretoData?.values || [];
        const cumulative = this.paretoData?.cumulative_percents || [];
        const total = this.paretoData?.total_quantity || 1;

        if (labels.length === 0) {
            return '<tr><td colspan="5" class="empty-text">暂无数据</td></tr>';
        }

        return labels.map((label, idx) => {
            const percent = total > 0 ? ((values[idx] / total) * 100).toFixed(2) : 0;
            return `
                <tr>
                    <td><span class="badge ${idx < 3 ? 'badge-danger' : 'badge-secondary'}">${idx + 1}</span></td>
                    <td>${Validator.sanitize(label)}</td>
                    <td><strong>${values[idx]}</strong></td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="flex: 1; max-width: 100px; background: var(--border-light); 
                                        height: 6px; border-radius: 3px;">
                                <div style="width: ${percent}%; height: 100%; 
                                            background: var(--primary-color); border-radius: 3px;"></div>
                            </div>
                            <span style="font-size: 12px; min-width: 50px;">${percent}%</span>
                        </div>
                    </td>
                    <td>${cumulative[idx] || 0}%</td>
                </tr>
            `;
        }).join('');
    },

    renderParetoChart() {
        const canvas = document.getElementById('paretoChart');
        if (!canvas) return;

        const labels = this.paretoData?.labels || [];
        const values = this.paretoData?.values || [];
        const cumulative = this.paretoData?.cumulative_percents || [];

        if (labels.length === 0) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#999';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
            return;
        }

        const ctx = canvas.getContext('2d');

        if (this.chart) {
            this.chart.destroy();
        }

        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        type: 'bar',
                        label: '缺陷数量',
                        data: values,
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderColor: '#dc3545',
                        borderWidth: 1,
                        yAxisID: 'y',
                        order: 2
                    },
                    {
                        type: 'line',
                        label: '累计占比 (%)',
                        data: cumulative,
                        borderColor: '#ffc107',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        borderWidth: 2,
                        pointBackgroundColor: '#ffc107',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        tension: 0.1,
                        yAxisID: 'y1',
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.datasetIndex === 0) {
                                    label += context.parsed.y + ' 件';
                                } else {
                                    label += context.parsed.y + '%';
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: '缺陷数量'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: '累计占比 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    },

    changeDays(days) {
        this.days = parseInt(days);
        this.loadData();
    },

    renderSubNav() {
        const current = 'quality-analysis';
        const items = [
            { key: 'quality-templates', label: '模板管理', icon: '📋' },
            { key: 'quality-orders', label: '质检单列表', icon: '📝' },
            { key: 'quality-analysis', label: '不合格分析', icon: '📊' }
        ];
        return `
            <div style="display: flex; gap: 4px; margin-bottom: 16px; background: var(--bg-light); 
                        padding: 4px; border-radius: 8px; width: fit-content;">
                ${items.map(item => `
                    <a href="#${item.key}" 
                       style="padding: 8px 16px; border-radius: 6px; text-decoration: none; 
                              color: var(--text-color); font-size: 14px;
                              ${current === item.key ? 'background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-weight: 500;' : ''}"
                       onmouseover="this.style.background='${current === item.key ? 'white' : 'rgba(0,0,0,0.04)'}';"
                       onmouseout="this.style.background='${current === item.key ? 'white' : 'transparent'}';">
                        <span style="margin-right: 6px;">${item.icon}</span>${item.label}
                    </a>
                `).join('')}
            </div>
        `;
    }
};

window.QualityAnalysisPage = QualityAnalysisPage;
