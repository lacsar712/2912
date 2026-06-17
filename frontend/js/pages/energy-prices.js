const EnergyPricesPage = {
    currentPage: 1,
    pageSize: 10,
    prices: [],
    energyTypes: [],
    total: 0,
    filters: {
        energyTypeId: '',
        period: ''
    },
    monthlyCostData: [],
    comparisonData: [],

    init() {
        this.loadEnergyTypes();
        this.loadData();
    },

    async loadEnergyTypes() {
        try {
            const res = await EnergyService.getAllEnergyTypes();
            if (res.code === 200) {
                this.energyTypes = res.data || [];
            }
        } catch (e) {
            console.error(e);
        }
    },

    async loadData() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            const params = {
                page: this.currentPage,
                size: this.pageSize,
                energyTypeId: this.filters.energyTypeId || undefined,
                period: this.filters.period || undefined
            };
            const res = await EnergyService.getPrices(params);
            if (res.code === 200) {
                this.prices = res.data.items || [];
                this.total = res.data.total || 0;
            }
            this.renderPage();
        } catch (e) {
            Toast.error('加载数据失败');
            console.error(e);
            this.renderPage();
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

    renderPage() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">能源单价配置</h3>
                    <button class="btn btn-primary" onclick="EnergyPricesPage.showModal()">+ 新增单价</button>
                </div>
                <div class="card-body">
                    ${this.renderFilterBar()}
                    ${this.renderPriceTable()}
                    ${this.renderPagination()}
                </div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <div class="card-header">
                    <h3 class="card-title" style="margin: 0;">月度费用计算</h3>
                </div>
                <div class="card-body">
                    ${this.renderMonthlyCostSection()}
                </div>
            </div>
            <div class="card" style="margin-top: 20px;">
                <div class="card-header">
                    <h3 class="card-title" style="margin: 0;">费用对比分析</h3>
                </div>
                <div class="card-body">
                    ${this.renderCostComparisonSection()}
                </div>
            </div>
        `;
    },

    renderFilterBar() {
        return `
            <div class="filter-bar" style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label class="form-label" style="margin: 0; white-space: nowrap;">能源类型：</label>
                    <select class="form-control filter-select" style="width: 150px;" onchange="EnergyPricesPage.setFilter('energyTypeId', this.value)">
                        <option value="">全部</option>
                        ${this.energyTypes.map(t => `
                            <option value="${t.id}" ${this.filters.energyTypeId == t.id ? 'selected' : ''}>${Validator.sanitize(t.type_name)}</option>
                        `).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label class="form-label" style="margin: 0; white-space: nowrap;">时段：</label>
                    <select class="form-control filter-select" style="width: 120px;" onchange="EnergyPricesPage.setFilter('period', this.value)">
                        <option value="">全部</option>
                        <option value="peak" ${this.filters.period === 'peak' ? 'selected' : ''}>峰</option>
                        <option value="flat" ${this.filters.period === 'flat' ? 'selected' : ''}>平</option>
                        <option value="valley" ${this.filters.period === 'valley' ? 'selected' : ''}>谷</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="EnergyPricesPage.search()">搜索</button>
                <button class="btn btn-outline" onclick="EnergyPricesPage.clearFilters()">清除</button>
            </div>
        `;
    },

    renderPriceTable() {
        if (!this.prices.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">💰</div>
                    <div>暂无单价数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="EnergyPricesPage.showModal()">
                        新增单价
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>能源类型</th>
                        <th>时段</th>
                        <th>时段范围</th>
                        <th>单价(元/单位)</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.prices.map(p => this.renderPriceRow(p)).join('')}
                </tbody>
            </table>
        `;
    },

    renderPriceRow(p) {
        const statusClass = p.status === 1 || p.status === 'active' ? 'running' : 'stopped';
        const statusText = p.status === 1 || p.status === 'active' ? '正常' : '停用';
        const timeRange = (p.start_time || '--:--') + ' - ' + (p.end_time || '--:--');
        return `
            <tr>
                <td>${Validator.sanitize(p.energy_type_name || '-')}</td>
                <td>
                    <span class="status-badge ${p.period === 'peak' ? 'running' : p.period === 'valley' ? 'stopped' : ''}">
                        ${p.period_label || {peak:'峰',flat:'平',valley:'谷'}[p.period] || p.period}
                    </span>
                </td>
                <td>${timeRange}</td>
                <td>${parseFloat(p.price).toFixed(4)}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="EnergyPricesPage.showModal(${p.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="EnergyPricesPage.deletePrice(${p.id})">删除</button>
                </td>
            </tr>
        `;
    },

    renderPagination() {
        const totalPages = Math.ceil(this.total / this.pageSize) || 1;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 8px;">
                <div style="color: var(--text-secondary); font-size: 14px;">
                    共 ${this.total} 条记录，第 ${this.currentPage} / ${totalPages} 页
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline"
                            onclick="EnergyPricesPage.changePage(${this.currentPage - 1})"
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline"
                            onclick="EnergyPricesPage.changePage(${this.currentPage + 1})"
                            ${this.currentPage >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    renderMonthlyCostSection() {
        const now = new Date();
        const defaultMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label class="form-label" style="margin: 0; white-space: nowrap;">年月：</label>
                    <input type="month" class="form-control" id="costYearMonth" value="${defaultMonth}" style="width: 180px;">
                </div>
                <button class="btn btn-primary" onclick="EnergyPricesPage.calculateCost()">计算月度费用</button>
                <button class="btn btn-outline" onclick="EnergyPricesPage.loadMonthlyCost()">查询结果</button>
            </div>
            <div id="monthlyCostResult">
                ${this.monthlyCostData.length ? this.renderMonthlyCostTable() : '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">请选择年月后点击计算或查询</div>'}
            </div>
        `;
    },

    renderMonthlyCostTable() {
        if (!this.monthlyCostData.length) {
            return '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">暂无数据</div>';
        }
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>计量点</th>
                        <th>能源类型</th>
                        <th>车间</th>
                        <th>峰时段消耗</th>
                        <th>平时段消耗</th>
                        <th>谷时段消耗</th>
                        <th>总消耗</th>
                        <th>峰时段费用</th>
                        <th>平时段费用</th>
                        <th>谷时段费用</th>
                        <th>总费用(元)</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.monthlyCostData.map(r => `
                        <tr>
                            <td>${Validator.sanitize(r.point_name || '-')}</td>
                            <td>${Validator.sanitize(r.energy_type_name || '-')}</td>
                            <td>${Validator.sanitize(r.workshop || '-')}</td>
                            <td>${parseFloat(r.peak_consumption || 0).toFixed(2)}</td>
                            <td>${parseFloat(r.flat_consumption || 0).toFixed(2)}</td>
                            <td>${parseFloat(r.valley_consumption || 0).toFixed(2)}</td>
                            <td>${parseFloat(r.total_consumption || 0).toFixed(2)}</td>
                            <td>${parseFloat(r.peak_cost || 0).toFixed(2)}</td>
                            <td>${parseFloat(r.flat_cost || 0).toFixed(2)}</td>
                            <td>${parseFloat(r.valley_cost || 0).toFixed(2)}</td>
                            <td style="font-weight: bold;">${parseFloat(r.total_cost || 0).toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderCostComparisonSection() {
        const now = new Date();
        const defaultMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label class="form-label" style="margin: 0; white-space: nowrap;">年月：</label>
                    <input type="month" class="form-control" id="compareYearMonth" value="${defaultMonth}" style="width: 180px;">
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label class="form-label" style="margin: 0; white-space: nowrap;">对比类型：</label>
                    <select class="form-control" id="compareType" style="width: 120px;">
                        <option value="mom">环比</option>
                        <option value="yoy">同比</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="EnergyPricesPage.loadCostComparison()">查询对比</button>
            </div>
            <div id="costComparisonResult">
                ${this.comparisonData.length ? this.renderComparisonTable() : '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">请选择年月和对比类型后查询</div>'}
            </div>
        `;
    },

    renderComparisonTable() {
        if (!this.comparisonData.length) {
            return '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">暂无数据</div>';
        }
        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>能源类型</th>
                        <th>当期费用(元)</th>
                        <th>对比期费用(元)</th>
                        <th>变化金额(元)</th>
                        <th>变化率</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.comparisonData.map(r => {
                        const diff = parseFloat(r.current_cost || 0) - parseFloat(r.previous_cost || 0);
                        const rate = parseFloat(r.change_rate || 0);
                        const color = diff > 0 ? 'var(--danger-color)' : diff < 0 ? 'var(--success-color)' : '';
                        return `
                            <tr>
                                <td>${Validator.sanitize(r.energy_type_name || '-')}</td>
                                <td>${parseFloat(r.current_cost || 0).toFixed(2)}</td>
                                <td>${parseFloat(r.previous_cost || 0).toFixed(2)}</td>
                                <td style="color: ${color}; font-weight: bold;">${diff > 0 ? '+' : ''}${diff.toFixed(2)}</td>
                                <td style="color: ${color};">${rate !== 0 ? rate.toFixed(2) + '%' : '-'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    },

    setFilter(key, value) {
        this.filters[key] = value;
    },

    search() {
        this.currentPage = 1;
        this.loadData();
    },

    clearFilters() {
        this.filters.energyTypeId = '';
        this.filters.period = '';
        this.currentPage = 1;
        this.loadData();
    },

    changePage(page) {
        const totalPages = Math.ceil(this.total / this.pageSize) || 1;
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.loadData();
    },

    showModal(price = null) {
        const isEdit = price !== null && typeof price === 'number';
        let priceData = null;

        if (isEdit) {
            priceData = this.prices.find(p => p.id === price);
            if (!priceData) return;
        }

        const energyTypeOptions = this.energyTypes.map(t =>
            `<option value="${t.id}" ${priceData && priceData.energy_type_id == t.id ? 'selected' : ''}>${Validator.sanitize(t.type_name)}</option>`
        ).join('');

        const content = `
            <form id="priceForm">
                <div class="form-group">
                    <label class="form-label">能源类型 *</label>
                    <select class="form-control" name="energy_type_id" required>
                        <option value="">请选择能源类型</option>
                        ${energyTypeOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">时段 *</label>
                    <select class="form-control" name="period" required>
                        <option value="">请选择时段</option>
                        <option value="peak" ${priceData && priceData.period === 'peak' ? 'selected' : ''}>峰</option>
                        <option value="flat" ${priceData && priceData.period === 'flat' ? 'selected' : ''}>平</option>
                        <option value="valley" ${priceData && priceData.period === 'valley' ? 'selected' : ''}>谷</option>
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">时段开始时间</label>
                        <input type="time" class="form-control" name="start_time" value="${priceData ? (priceData.start_time || '') : ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">时段结束时间</label>
                        <input type="time" class="form-control" name="end_time" value="${priceData ? (priceData.end_time || '') : ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">单价(元/单位) *</label>
                    <input type="number" class="form-control" name="price" step="0.0001" min="0" required
                           value="${priceData ? priceData.price : ''}">
                </div>
            </form>
        `;

        const modal = new Modal({
            title: isEdit ? '编辑单价' : '新增单价',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('priceForm');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return false;
                }
                const formData = new FormData(form);
                const data = {
                    energy_type_id: parseInt(formData.get('energy_type_id')),
                    period: formData.get('period'),
                    start_time: formData.get('start_time'),
                    end_time: formData.get('end_time'),
                    price: parseFloat(formData.get('price'))
                };

                modal.setLoading(true);
                try {
                    let res;
                    if (isEdit) {
                        res = await EnergyService.updatePrice(priceData.id, data);
                    } else {
                        res = await EnergyService.createPrice(data);
                    }
                    if (res.code === 200 || res.code === 201) {
                        Toast.success(isEdit ? '更新成功' : '创建成功');
                        modal.close();
                        this.loadData();
                    } else {
                        Toast.error(res.message || (isEdit ? '更新失败' : '创建失败'));
                    }
                } catch (e) {
                    Toast.error(isEdit ? '更新失败' : '创建失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    async deletePrice(id) {
        const confirmed = await Modal.confirm('确定要删除该单价记录吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await EnergyService.deletePrice(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                this.loadData();
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    },

    async calculateCost() {
        const yearMonth = document.getElementById('costYearMonth')?.value;
        if (!yearMonth) {
            Toast.error('请选择年月');
            return;
        }

        try {
            const res = await EnergyService.calculateMonthlyCost({ year_month: yearMonth });
            if (res.code === 200 || res.code === 201) {
                Toast.success('费用计算完成');
                this.loadMonthlyCost();
            } else {
                Toast.error(res.message || '计算失败');
            }
        } catch (e) {
            Toast.error('计算失败');
            console.error(e);
        }
    },

    async loadMonthlyCost() {
        const yearMonth = document.getElementById('costYearMonth')?.value;
        if (!yearMonth) {
            Toast.error('请选择年月');
            return;
        }

        try {
            const res = await EnergyService.getMonthlyCost({ yearMonth });
            if (res.code === 200) {
                this.monthlyCostData = Array.isArray(res.data) ? res.data : (res.data.items || []);
                const resultContainer = document.getElementById('monthlyCostResult');
                if (resultContainer) {
                    resultContainer.innerHTML = this.renderMonthlyCostTable();
                }
            } else {
                Toast.error(res.message || '查询失败');
            }
        } catch (e) {
            Toast.error('查询失败');
            console.error(e);
        }
    },

    async loadCostComparison() {
        const yearMonth = document.getElementById('compareYearMonth')?.value;
        const compareType = document.getElementById('compareType')?.value;
        if (!yearMonth) {
            Toast.error('请选择年月');
            return;
        }

        try {
            const res = await EnergyService.getCostComparison({ yearMonth, compareType });
            if (res.code === 200) {
                const compData = res.data || {};
                this.comparisonData = compData.by_energy_type || [];
                const resultContainer = document.getElementById('costComparisonResult');
                if (resultContainer) {
                    resultContainer.innerHTML = this.renderComparisonTable();
                }
            } else {
                Toast.error(res.message || '查询失败');
            }
        } catch (e) {
            Toast.error('查询失败');
            console.error(e);
        }
    }
};

window.EnergyPricesPage = EnergyPricesPage;
