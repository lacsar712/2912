/**
 * 巡检报表页面
 */
const PatrolReportsPage = {
    reportData: null,
    statistics: null,
    filters: {
        start_date: '',
        end_date: ''
    },
    passRateChart: null,
    abnormalChart: null,

    init() {
        this.loadData();
    },

    async loadData() {
        try {
            const [statsResponse, reportResponse] = await Promise.all([
                PatrolService.getStatistics(),
                PatrolService.getReport(this.filters)
            ]);

            if (statsResponse.code === 200) {
                this.statistics = statsResponse.data;
            }
            if (reportResponse.code === 200) {
                this.reportData = reportResponse.data;
            }

            this.render();
            this.renderCharts();
        } catch (error) {
            Toast.error('加载报表数据失败');
        }
    },

    renderSubNav() {
        return `
            <div class="tab-nav">
                <div class="tab-item" data-page="patrol-routes" onclick="App.navigate('patrol-routes')">路线管理</div>
                <div class="tab-item" data-page="patrol-plans" onclick="App.navigate('patrol-plans')">计划管理</div>
                <div class="tab-item" data-page="patrol-tasks" onclick="App.navigate('patrol-tasks')">任务列表</div>
                <div class="tab-item active" data-page="patrol-reports" onclick="App.navigate('patrol-reports')">巡检报表</div>
            </div>
        `;
    },

    render() {
        const container = document.getElementById('pageContainer');
        const stats = this.statistics || {};
        const report = this.reportData || {};

        container.innerHTML = `
            ${this.renderSubNav()}
            
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">巡检统计报表</h3>
                    <div style="display: flex; gap: 8px;">
                        <input type="date" class="filter-select" id="filterStartDate" value="${this.filters.start_date}" placeholder="开始日期">
                        <input type="date" class="filter-select" id="filterEndDate" value="${this.filters.end_date}" placeholder="结束日期">
                        <button class="btn btn-sm btn-primary" onclick="PatrolReportsPage.applyFilters()">查询</button>
                        <button class="btn btn-sm btn-outline" onclick="PatrolReportsPage.resetFilters()">重置</button>
                        <button class="btn btn-sm btn-outline" onclick="PatrolReportsPage.exportData()">导出</button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.renderStatsCards(stats)}
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">合格率统计</h4>
                                </div>
                                <div class="card-body">
                                    <canvas id="passRateChart" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h4 class="card-title">Top 异常项排行</h4>
                                </div>
                                <div class="card-body">
                                    <canvas id="abnormalChart" height="300"></canvas>
                                </div>
                            </div>
                        </div>
                    </div>

                    ${this.renderTopAbnormalTable(report)}
                    ${this.renderRouteStatsTable(report)}
                </div>
            </div>
        `;

        this.bindFilterEvents();
    },

    renderStatsCards(stats) {
        const byStatus = stats.by_status || {};
        return `
            <div class="dashboard-stats">
                <div class="dashboard-card">
                    <div class="stat-icon" style="background: rgba(0,123,255,0.1);">📋</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.total || 0}</div>
                        <div class="stat-label">总任务数</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="stat-icon" style="background: rgba(40,167,69,0.1);">✅</div>
                    <div class="stat-content">
                        <div class="stat-value">${byStatus.completed || 0}</div>
                        <div class="stat-label">已完成</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="stat-icon" style="background: rgba(255,193,7,0.1);">⏳</div>
                    <div class="stat-content">
                        <div class="stat-value">${byStatus.pending || 0}</div>
                        <div class="stat-label">待执行</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="stat-icon" style="background: rgba(23,162,184,0.1);">🔄</div>
                    <div class="stat-content">
                        <div class="stat-value">${byStatus.in_progress || 0}</div>
                        <div class="stat-label">进行中</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="stat-icon" style="background: rgba(220,53,69,0.1);">⚠️</div>
                    <div class="stat-content">
                        <div class="stat-value">${byStatus.overdue || 0}</div>
                        <div class="stat-label">已逾期</div>
                    </div>
                </div>
                <div class="dashboard-card">
                    <div class="stat-icon" style="background: rgba(111,66,193,0.1);">📊</div>
                    <div class="stat-content">
                        <div class="stat-value">${stats.pass_rate || 0}%</div>
                        <div class="stat-label">合格率</div>
                    </div>
                </div>
            </div>
        `;
    },

    renderTopAbnormalTable(report) {
        const topAbnormal = report.top_abnormal || [];
        if (topAbnormal.length === 0) return '';

        return `
            <div class="card" style="margin-top: 16px;">
                <div class="card-header">
                    <h4 class="card-title">Top 异常项排行</h4>
                </div>
                <div class="card-body">
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>排名</th>
                                    <th>巡检项名称</th>
                                    <th>异常次数</th>
                                    <th>占比</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topAbnormal.map((item, idx) => {
                                    const totalAbnormal = report.abnormal_count || 1;
                                    const percent = ((item.count / totalAbnormal) * 100).toFixed(1);
                                    return `
                                        <tr>
                                            <td>
                                                <span class="badge ${idx < 3 ? 'badge-danger' : 'badge-secondary'}">${idx + 1}</span>
                                            </td>
                                            <td>${Validator.sanitize(item.item_name)}</td>
                                            <td><span class="text-danger">${item.count}</span></td>
                                            <td>
                                                <div class="progress-bar" style="width: 200px;">
                                                    <div class="progress-fill" style="width: ${percent}%; background: var(--danger-color);"></div>
                                                    <span class="progress-text">${percent}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderRouteStatsTable(report) {
        const routeStats = report.route_stats || [];
        if (routeStats.length === 0) return '';

        return `
            <div class="card" style="margin-top: 16px;">
                <div class="card-header">
                    <h4 class="card-title">各路线执行统计</h4>
                </div>
                <div class="card-body">
                    <div class="table-wrapper">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>巡检路线</th>
                                    <th>任务总数</th>
                                    <th>已完成</th>
                                    <th>完成率</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${routeStats.map(item => {
                                    const completeRate = item.total > 0 
                                        ? ((item.completed / item.total) * 100).toFixed(1) 
                                        : 0;
                                    return `
                                        <tr>
                                            <td>${Validator.sanitize(item.route_name)}</td>
                                            <td>${item.total}</td>
                                            <td>${item.completed}</td>
                                            <td>
                                                <div class="progress-bar" style="width: 200px;">
                                                    <div class="progress-fill" style="width: ${completeRate}%;"></div>
                                                    <span class="progress-text">${completeRate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderCharts() {
        const report = this.reportData || {};
        const stats = this.statistics || {};

        this.renderPassRateChart(stats);
        this.renderAbnormalChart(report);
    },

    renderPassRateChart(stats) {
        const ctx = document.getElementById('passRateChart');
        if (!ctx) return;

        if (this.passRateChart) {
            this.passRateChart.destroy();
        }

        const normal = stats.normal_count || 0;
        const abnormal = stats.abnormal_count || 0;

        this.passRateChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['合格', '异常'],
                datasets: [{
                    data: [normal, abnormal],
                    backgroundColor: ['#28a745', '#dc3545'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    renderAbnormalChart(report) {
        const ctx = document.getElementById('abnormalChart');
        if (!ctx) return;

        if (this.abnormalChart) {
            this.abnormalChart.destroy();
        }

        const topAbnormal = report.top_abnormal || [];
        const labels = topAbnormal.map(item => item.item_name);
        const data = topAbnormal.map(item => item.count);

        this.abnormalChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '异常次数',
                    data: data,
                    backgroundColor: 'rgba(220, 53, 69, 0.7)',
                    borderColor: 'rgba(220, 53, 69, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    },

    bindFilterEvents() {
        const startDate = document.getElementById('filterStartDate');
        startDate?.addEventListener('change', (e) => {
            this.filters.start_date = e.target.value;
        });

        const endDate = document.getElementById('filterEndDate');
        endDate?.addEventListener('change', (e) => {
            this.filters.end_date = e.target.value;
        });
    },

    applyFilters() {
        this.loadData();
    },

    resetFilters() {
        this.filters = { start_date: '', end_date: '' };
        this.loadData();
    },

    exportData() {
        const report = this.reportData || {};
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += '巡检项,异常次数\n';
        
        (report.top_abnormal || []).forEach(item => {
            csvContent += `${item.item_name},${item.count}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `巡检报表_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        Toast.success('导出成功');
    },

    destroy() {
        if (this.passRateChart) {
            this.passRateChart.destroy();
            this.passRateChart = null;
        }
        if (this.abnormalChart) {
            this.abnormalChart.destroy();
            this.abnormalChart = null;
        }
    }
};

window.PatrolReportsPage = PatrolReportsPage;
