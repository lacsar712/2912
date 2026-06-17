const EnergyDashboardPage = {
    trendChart: null,
    workshopChart: null,
    currentYearMonth: new Date().toISOString().slice(0, 7),

    init() {
        this.loadDashboard();
    },

    async loadDashboard() {
        try {
            const [dashboardRes, trendRes, comparisonRes] = await Promise.all([
                EnergyService.getDashboard(),
                EnergyService.getConsumptionTrend({ days: 7 }),
                EnergyService.getWorkshopComparison({ yearMonth: this.currentYearMonth })
            ]);
            const dashboardData = dashboardRes.data || {};
            const trendData = trendRes.data || [];
            const comparisonData = comparisonRes.data || {};
            this.renderDashboard(dashboardData, trendData, comparisonData);
        } catch (err) {
            document.getElementById('pageContainer').innerHTML = '<div class="card"><div class="card-body"><p>加载数据失败，请稍后重试</p></div></div>';
        }
    },

    getEnergyIcon(name) {
        const n = (name || '').toLowerCase();
        if (n.includes('电')) return '⚡';
        if (n.includes('水')) return '💧';
        if (n.includes('气') || n.includes('天然')) return '🔥';
        if (n.includes('压缩')) return '💨';
        if (n.includes('蒸')) return '♨️';
        return '🔋';
    },

    getEnergyGradient(name) {
        const n = (name || '').toLowerCase();
        if (n.includes('电')) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        if (n.includes('水')) return 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)';
        if (n.includes('气') || n.includes('天然')) return 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
        return 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)';
    },

    getEnergyColor(name) {
        const n = (name || '').toLowerCase();
        if (n.includes('电')) return '#764ba2';
        if (n.includes('水')) return '#4facfe';
        if (n.includes('气') || n.includes('天然')) return '#f5576c';
        return '#43e97b';
    },

    renderDashboard(dashboardData, trendData, comparisonData) {
        const cards = dashboardData.energy_cards || [];
        const totalTodayCost = dashboardData.total_today_cost || 0;
        const totalMonthCost = dashboardData.total_month_cost || 0;

        let energyCardsHtml = '';
        cards.forEach(card => {
            energyCardsHtml += `
                <div class="stat-card">
                    <div class="stat-card-icon" style="background: ${this.getEnergyGradient(card.energy_type_name)}; color: #fff; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 22px;">
                        ${this.getEnergyIcon(card.energy_type_name)}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="stat-card-title">${card.energy_type_name || ''}</div>
                        <div style="display: flex; gap: 16px; margin-top: 6px; flex-wrap: wrap;">
                            <div>
                                <span style="color: #8b95a5; font-size: 12px;">今日用量</span>
                                <div style="font-size: 18px; font-weight: 600; color: #2c3e50;">${card.today_consumption ?? '-'} <span style="font-size: 12px; font-weight: 400; color: #8b95a5;">${card.unit || ''}</span></div>
                            </div>
                            <div>
                                <span style="color: #8b95a5; font-size: 12px;">今日费用</span>
                                <div style="font-size: 18px; font-weight: 600; color: #2c3e50;">¥${card.today_cost ?? '-'}</div>
                            </div>
                            <div>
                                <span style="color: #8b95a5; font-size: 12px;">本月费用</span>
                                <div style="font-size: 18px; font-weight: 600; color: #2c3e50;">¥${card.month_cost ?? '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        });

        const html = `
            <div style="margin-bottom: 24px;">
                <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
                    <div class="stat-card" style="min-width: 180px;">
                        <div class="stat-card-title">今日总费用</div>
                        <div class="stat-card-value" style="color: #667eea;">¥${totalTodayCost}</div>
                    </div>
                    <div class="stat-card" style="min-width: 180px;">
                        <div class="stat-card-title">本月总费用</div>
                        <div class="stat-card-value" style="color: #764ba2;">¥${totalMonthCost}</div>
                    </div>
                </div>
                <div class="grid grid-2" style="gap: 16px;">
                    ${energyCardsHtml}
                </div>
            </div>
            <div class="grid grid-2" style="gap: 16px; margin-bottom: 24px;">
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">近7日能耗趋势</div>
                    </div>
                    <div class="card-body">
                        <canvas id="trendChart" height="280"></canvas>
                    </div>
                </div>
                <div class="card">
                    <div class="card-header">
                        <div class="card-title">车间能耗对比</div>
                        <div class="filter-bar" style="margin: 0;">
                            <input type="month" class="form-control" id="workshopMonthFilter" value="${this.currentYearMonth}" style="width: 180px;">
                        </div>
                    </div>
                    <div class="card-body">
                        <canvas id="workshopChart" height="280"></canvas>
                    </div>
                </div>
            </div>`;

        document.getElementById('pageContainer').innerHTML = html;

        document.getElementById('workshopMonthFilter').addEventListener('change', (e) => {
            this.currentYearMonth = e.target.value;
            this.loadWorkshopComparison();
        });

        this.renderTrendChart(trendData);
        this.renderWorkshopChart(comparisonData);
    },

    renderTrendChart(trendData) {
        const ctx = document.getElementById('trendChart');
        if (!ctx) return;

        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }

        if (!trendData || !trendData.length) return;

        const allDates = new Set();
        trendData.forEach(item => {
            (item.trend || []).forEach(t => allDates.add(t.date));
        });
        const sortedDates = [...allDates].sort();
        const labels = sortedDates.map(d => d.slice(5));

        const datasets = trendData.map(item => {
            const dateValueMap = {};
            (item.trend || []).forEach(t => {
                dateValueMap[t.date] = t.value;
            });
            return {
                label: `${item.energy_type_name} (${item.unit || ''})`,
                data: sortedDates.map(d => dateValueMap[d] ?? null),
                borderColor: this.getEnergyColor(item.energy_type_name),
                backgroundColor: this.getEnergyColor(item.energy_type_name) + '20',
                borderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                tension: 0.3,
                fill: false
            };
        });

        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 16 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                },
                scales: {
                    x: {
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' }
                    }
                }
            }
        });
    },

    async loadWorkshopComparison() {
        try {
            const comparisonRes = await EnergyService.getWorkshopComparison({ yearMonth: this.currentYearMonth });
            this.renderWorkshopChart(comparisonRes.data || {});
        } catch (err) {}
    },

    renderWorkshopChart(comparisonData) {
        const ctx = document.getElementById('workshopChart');
        if (!ctx) return;

        if (this.workshopChart) {
            this.workshopChart.destroy();
            this.workshopChart = null;
        }

        if (!comparisonData || !comparisonData.workshops || !comparisonData.workshops.length) return;

        const workshops = comparisonData.workshops;
        const energyTypes = comparisonData.energy_types || [];
        const labels = workshops.map(w => w.workshop);

        const barColors = ['#667eea', '#4facfe', '#f5576c', '#43e97b', '#f093fb', '#ffd93d'];

        const datasets = energyTypes.map((et, i) => ({
            label: et,
            data: workshops.map(w => w.by_energy_type?.[et] ?? 0),
            backgroundColor: barColors[i % barColors.length],
            borderColor: barColors[i % barColors.length],
            borderWidth: 0,
            borderRadius: 4
        }));

        this.workshopChart = new Chart(ctx, {
            type: 'bar',
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 16 }
                    },
                    tooltip: {
                        mode: 'index'
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grid: { color: '#f0f0f0' },
                        ticks: {
                            callback: (val) => '¥' + val
                        }
                    }
                }
            }
        });
    },

    destroy() {
        if (this.trendChart) { this.trendChart.destroy(); this.trendChart = null; }
        if (this.workshopChart) { this.workshopChart.destroy(); this.workshopChart = null; }
    }
};

window.EnergyDashboardPage = EnergyDashboardPage;
