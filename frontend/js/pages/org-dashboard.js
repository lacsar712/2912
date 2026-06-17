/**
 * 组织架构统计看板页面
 */
const OrgDashboardPage = {
    overview: null,
    deptStats: [],
    chart: null,
    currentView: 'chart',

    init() {
        this.loadView();
    },

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    },

    async loadView() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            await Promise.all([
                this.loadOverview(),
                this.loadDeptStats()
            ]);
            this.render();
        } catch (error) {
            Toast.error('加载数据失败');
            console.error(error);
        }
    },

    renderLoading() {
        return `
            <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
                <div>加载中...</div>
            </div>
        `;
    },

    async loadOverview() {
        const res = await OrganizationService.getEmployeeOverview();
        if (res.code === 200) {
            this.overview = res.data;
        }
    },

    async loadDeptStats() {
        const res = await OrganizationService.getEmployeeCountByDepartment();
        if (res.code === 200) {
            this.deptStats = res.data || [];
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div>
                ${this.renderOverviewCards()}
                ${this.renderStatsContent()}
            </div>
        `;
        this.initChart();
    },

    renderOverviewCards() {
        const o = this.overview || {};
        const cards = [
            { label: '员工总数', value: o.total_employees || 0, icon: '👥', color: '#667eea', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
            { label: '在职人数', value: o.active_employees || 0, icon: '✅', color: '#28a745', bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
            { label: '离职人数', value: o.inactive_employees || 0, icon: '🚪', color: '#6c757d', bg: 'linear-gradient(135deg, #757f9a 0%, #d7dde8 100%)' },
            { label: '部门数量', value: o.department_count || 0, icon: '🏢', color: '#17a2b8', bg: 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)' },
            { label: '岗位数量', value: o.position_count || 0, icon: '📋', color: '#ffc107', bg: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)' }
        ];

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${cards.map(card => `
                    <div class="stat-card" style="background: ${card.bg}; color: white; border-radius: 12px; padding: 20px; 
                           box-shadow: 0 4px 15px rgba(0,0,0,0.1); transition: transform 0.3s;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">${card.label}</div>
                                <div style="font-size: 36px; font-weight: bold;">${card.value}</div>
                            </div>
                            <div style="font-size: 48px; opacity: 0.8;">${card.icon}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderStatsContent() {
        return `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">📊 按部门统计在职人数</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn ${this.currentView === 'chart' ? 'btn-primary' : 'btn-outline'}" 
                                onclick="OrgDashboardPage.switchView('chart')">
                            📈 图表视图
                        </button>
                        <button class="btn ${this.currentView === 'tree' ? 'btn-primary' : 'btn-outline'}" 
                                onclick="OrgDashboardPage.switchView('tree')">
                            🌲 树形视图
                        </button>
                        <button class="btn btn-outline" onclick="OrgDashboardPage.refresh()">
                            🔄 刷新
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.currentView === 'chart' ? this.renderChartView() : this.renderTreeView()}
                </div>
            </div>
        `;
    },

    renderChartView() {
        return `
            <div style="height: 400px;">
                <canvas id="deptChart"></canvas>
            </div>
        `;
    },

    renderTreeView() {
        return `
            <div style="max-height: 500px; overflow-y: auto;">
                ${this.renderStatTree(this.deptStats, 0)}
            </div>
        `;
    },

    renderStatTree(nodes, level) {
        if (!nodes || nodes.length === 0) {
            if (level === 0) {
                return `
                    <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
                        <div>暂无统计数据</div>
                    </div>
                `;
            }
            return '';
        }

        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const maxCount = Math.max(...this.flattenStats(this.deptStats).map(n => n.employee_count), 1);
            const percentage = (node.employee_count / maxCount) * 100;

            return `
                <div style="margin-left: ${level * 24}px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 12px; padding: 8px 12px; 
                                background: var(--bg-light); border-radius: var(--radius-sm);">
                        <span style="min-width: 20px;">${hasChildren ? '📂' : '📁'}</span>
                        <span style="font-weight: 500; min-width: 150px;">${Validator.sanitize(node.department_name)}</span>
                        <div style="flex: 1; height: 24px; background: var(--bg-white); border-radius: 12px; overflow: hidden; position: relative;">
                            <div style="height: 100%; width: ${percentage}%; 
                                        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                                        border-radius: 12px; transition: width 0.5s;"></div>
                            <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); 
                                       font-weight: 500; font-size: 14px;">
                                ${node.employee_count} 人
                            </span>
                        </div>
                    </div>
                    ${hasChildren ? this.renderStatTree(node.children, level + 1) : ''}
                </div>
            `;
        }).join('');
    },

    flattenStats(nodes, result = []) {
        nodes.forEach(node => {
            result.push(node);
            if (node.children) {
                this.flattenStats(node.children, result);
            }
        });
        return result;
    },

    switchView(view) {
        this.currentView = view;
        this.render();
    },

    async refresh() {
        await Promise.all([
            this.loadOverview(),
            this.loadDeptStats()
        ]);
        this.render();
    },

    initChart() {
        if (this.currentView !== 'chart') return;

        const canvas = document.getElementById('deptChart');
        if (!canvas) return;

        if (this.chart) {
            this.chart.destroy();
        }

        const allDepts = this.flattenStats(this.deptStats);
        const labels = allDepts.map(d => d.department_name);
        const data = allDepts.map(d => d.employee_count);

        const colors = [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(17, 153, 142, 0.8)',
            'rgba(56, 239, 125, 0.8)',
            'rgba(86, 204, 242, 0.8)',
            'rgba(47, 128, 237, 0.8)',
            'rgba(242, 153, 74, 0.8)',
            'rgba(242, 201, 76, 0.8)',
            'rgba(235, 51, 73, 0.8)',
            'rgba(244, 92, 67, 0.8)'
        ];

        const borderColors = colors.map(c => c.replace('0.8', '1'));

        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '在职人数',
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderColor: borderColors.slice(0, data.length),
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `在职人数: ${context.raw} 人`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        title: {
                            display: true,
                            text: '人数'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: '部门'
                        }
                    }
                }
            }
        });
    }
};

window.OrgDashboardPage = OrgDashboardPage;
