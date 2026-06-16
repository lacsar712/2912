/**
 * 物料库存管理页面
 */
const InventoryPage = {
    currentTab: 'materials',
    materials: [],
    categories: [],
    stockIns: [],
    stockOuts: [],
    stockFlows: [],
    lowStockMaterials: [],
    stockTrend: [],
    stats: {},
    pagination: { page: 1, size: 10, total: 0 },
    filters: {
        category: '',
        keyword: '',
        startDate: '',
        endDate: '',
        flowType: ''
    },
    trendChart: null,

    init() {
        this.loadCategories();
        this.loadTabData();
    },

    destroy() {
        if (this.trendChart) {
            this.trendChart.destroy();
            this.trendChart = null;
        }
    },

    async loadCategories() {
        try {
            const res = await InventoryService.getMaterialCategories();
            if (res.code === 200) {
                this.categories = res.data || [];
            }
        } catch (e) {
            console.error(e);
        }
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.pagination.page = 1;
        this.loadTabData();
    },

    async loadTabData() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            switch (this.currentTab) {
                case 'materials':
                    await this.loadMaterials();
                    break;
                case 'stock-in':
                    await this.loadStockIns();
                    break;
                case 'stock-out':
                    await this.loadStockOuts();
                    break;
                case 'stock-flow':
                    await this.loadStockFlows();
                    break;
                case 'dashboard':
                    await this.loadDashboard();
                    break;
            }
            this.renderPage();
        } catch (error) {
            Toast.error('加载数据失败');
            console.error(error);
            this.renderPage();
        }
    },

    async loadMaterials() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            category: this.filters.category || undefined,
            keyword: this.filters.keyword || undefined
        };
        const res = await InventoryService.getMaterials(params);
        if (res.code === 200) {
            this.materials = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    async loadStockIns() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            startDate: this.filters.startDate || undefined,
            endDate: this.filters.endDate || undefined
        };
        const res = await InventoryService.getStockIns(params);
        if (res.code === 200) {
            this.stockIns = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    async loadStockOuts() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            startDate: this.filters.startDate || undefined,
            endDate: this.filters.endDate || undefined
        };
        const res = await InventoryService.getStockOuts(params);
        if (res.code === 200) {
            this.stockOuts = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    async loadStockFlows() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            flowType: this.filters.flowType || undefined,
            startDate: this.filters.startDate || undefined,
            endDate: this.filters.endDate || undefined
        };
        const res = await InventoryService.getStockFlows(params);
        if (res.code === 200) {
            this.stockFlows = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    async loadDashboard() {
        const res = await InventoryService.getInventoryDashboard();
        if (res.code === 200) {
            this.stats = res.data.stats || {};
            this.lowStockMaterials = res.data.low_stock_materials || [];
            this.stockTrend = res.data.stock_trend || [];
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
                    <h3 class="card-title" style="margin: 0;">物料库存管理</h3>
                    ${this.renderTabButtons()}
                </div>
                <div class="card-body">
                    ${this.renderTabContent()}
                </div>
            </div>
        `;
        this.initTrendChart();
    },

    renderTabButtons() {
        const tabs = [
            { key: 'materials', label: '物料档案', icon: '📦' },
            { key: 'stock-in', label: '入库管理', icon: '📥' },
            { key: 'stock-out', label: '出库管理', icon: '📤' },
            { key: 'stock-flow', label: '库存流水', icon: '📋' },
            { key: 'dashboard', label: '库存看板', icon: '📊' }
        ];
        return `
            <div class="tab-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${tabs.map(tab => `
                    <button class="btn ${this.currentTab === tab.key ? 'btn-primary' : 'btn-outline'}" 
                            onclick="InventoryPage.switchTab('${tab.key}')"
                            style="padding: 6px 16px;">
                        <span>${tab.icon}</span> ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderTabContent() {
        switch (this.currentTab) {
            case 'materials':
                return this.renderMaterialsTab();
            case 'stock-in':
                return this.renderStockInTab();
            case 'stock-out':
                return this.renderStockOutTab();
            case 'stock-flow':
                return this.renderStockFlowTab();
            case 'dashboard':
                return this.renderDashboardTab();
            default:
                return '';
        }
    },

    renderMaterialsTab() {
        return `
            ${this.renderMaterialFilters()}
            ${this.renderMaterialTable()}
            ${this.renderPagination()}
        `;
    },

    renderMaterialFilters() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">类目：</label>
                    <select class="form-control" style="width: 150px;" onchange="InventoryPage.filterByCategory(this.value)">
                        <option value="">全部</option>
                        ${this.categories.map(c => `
                            <option value="${c}" ${this.filters.category === c ? 'selected' : ''}>${c}</option>
                        `).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" placeholder="搜索编号/名称/规格..." 
                           value="${this.filters.keyword || ''}"
                           onkeyup="if(event.key==='Enter') InventoryPage.searchMaterials(this.value)"
                           style="flex: 1;">
                    <button class="btn btn-primary" onclick="InventoryPage.searchMaterials(this.previousElementSibling.value)">搜索</button>
                </div>
                <button class="btn btn-primary" onclick="InventoryPage.showAddMaterialModal()">
                    + 新增物料
                </button>
            </div>
        `;
    },

    renderMaterialTable() {
        if (!this.materials.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                    <div>暂无物料数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="InventoryPage.showAddMaterialModal()">
                        新增物料
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>物料编号</th>
                        <th>物料名称</th>
                        <th>规格</th>
                        <th>单位</th>
                        <th>类目</th>
                        <th>安全库存</th>
                        <th>当前库存</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.materials.map(m => this.renderMaterialRow(m)).join('')}
                </tbody>
            </table>
        `;
    },

    renderMaterialRow(m) {
        const isLow = parseFloat(m.current_stock) < parseFloat(m.safety_stock);
        return `
            <tr class="${isLow ? 'table-danger' : ''}">
                <td>${Validator.sanitize(m.material_code)}</td>
                <td>${Validator.sanitize(m.material_name)}</td>
                <td>${Validator.sanitize(m.specification || '-')}</td>
                <td>${Validator.sanitize(m.unit || '-')}</td>
                <td>${Validator.sanitize(m.category || '-')}</td>
                <td>${m.safety_stock}</td>
                <td>${m.current_stock} ${isLow ? '<span style="color: var(--danger-color);">⚠️</span>' : ''}</td>
                <td>
                    <span class="status-badge ${m.status === 'active' ? 'running' : 'stopped'}">
                        ${m.status === 'active' ? '正常' : '停用'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="InventoryPage.showEditMaterialModal(${m.id})">编辑</button>
                    <button class="btn btn-sm ${m.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                            onclick="InventoryPage.toggleMaterialStatus(${m.id})">
                        ${m.status === 'active' ? '停用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="InventoryPage.deleteMaterial(${m.id})">删除</button>
                </td>
            </tr>
        `;
    },

    renderStockInTab() {
        return `
            ${this.renderDateFilters()}
            <div style="margin-bottom: 16px;">
                <button class="btn btn-primary" onclick="InventoryPage.showStockInModal()">
                    + 新增入库
                </button>
            </div>
            ${this.renderStockInTable()}
            ${this.renderPagination()}
        `;
    },

    renderDateFilters() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">开始日期：</label>
                    <input type="date" class="form-control" style="width: 150px;" 
                           value="${this.filters.startDate || ''}"
                           onchange="InventoryPage.filterByDate('startDate', this.value)">
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">结束日期：</label>
                    <input type="date" class="form-control" style="width: 150px;" 
                           value="${this.filters.endDate || ''}"
                           onchange="InventoryPage.filterByDate('endDate', this.value)">
                </div>
                <button class="btn btn-outline" onclick="InventoryPage.clearDateFilters()">清除筛选</button>
            </div>
        `;
    },

    renderStockInTable() {
        if (!this.stockIns.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📥</div>
                    <div>暂无入库记录</div>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>入库单号</th>
                        <th>物料</th>
                        <th>批次号</th>
                        <th>数量</th>
                        <th>来源</th>
                        <th>操作人</th>
                        <th>入库时间</th>
                        <th>备注</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.stockIns.map(s => `
                        <tr>
                            <td>${Validator.sanitize(s.order_code)}</td>
                            <td>${Validator.sanitize(s.material_name || '-')}</td>
                            <td>${Validator.sanitize(s.batch_no || '-')}</td>
                            <td>${s.quantity}</td>
                            <td>${Validator.sanitize(s.source || '-')}</td>
                            <td>${Validator.sanitize(s.operator || '-')}</td>
                            <td>${s.in_time || '-'}</td>
                            <td>${Validator.sanitize(s.remark || '-')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderStockOutTab() {
        return `
            ${this.renderDateFilters()}
            <div style="margin-bottom: 16px;">
                <button class="btn btn-primary" onclick="InventoryPage.showStockOutModal()">
                    + 新增出库
                </button>
            </div>
            ${this.renderStockOutTable()}
            ${this.renderPagination()}
        `;
    },

    renderStockOutTable() {
        if (!this.stockOuts.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📤</div>
                    <div>暂无出库记录</div>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>出库单号</th>
                        <th>物料</th>
                        <th>批次号</th>
                        <th>数量</th>
                        <th>领用部门</th>
                        <th>用途</th>
                        <th>操作人</th>
                        <th>出库时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.stockOuts.map(s => `
                        <tr>
                            <td>${Validator.sanitize(s.order_code)}</td>
                            <td>${Validator.sanitize(s.material_name || '-')}</td>
                            <td>${Validator.sanitize(s.batch_no || '-')}</td>
                            <td>${s.quantity}</td>
                            <td>${Validator.sanitize(s.department || '-')}</td>
                            <td>${Validator.sanitize(s.purpose || '-')}</td>
                            <td>${Validator.sanitize(s.operator || '-')}</td>
                            <td>${s.out_time || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderStockFlowTab() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">类型：</label>
                    <select class="form-control" style="width: 120px;" onchange="InventoryPage.filterByFlowType(this.value)">
                        <option value="">全部</option>
                        <option value="in" ${this.filters.flowType === 'in' ? 'selected' : ''}>入库</option>
                        <option value="out" ${this.filters.flowType === 'out' ? 'selected' : ''}>出库</option>
                    </select>
                </div>
                ${this.renderDateFilters().replace('clearDateFilters', 'clearFlowFilters')}
            </div>
            ${this.renderStockFlowTable()}
            ${this.renderPagination()}
        `;
    },

    renderStockFlowTable() {
        if (!this.stockFlows.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                    <div>暂无库存流水记录</div>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>流水号</th>
                        <th>类型</th>
                        <th>物料</th>
                        <th>批次号</th>
                        <th>变动数量</th>
                        <th>变动前库存</th>
                        <th>变动后库存</th>
                        <th>操作人</th>
                        <th>操作时间</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.stockFlows.map(f => `
                        <tr>
                            <td>${Validator.sanitize(f.flow_code)}</td>
                            <td>
                                <span class="status-badge ${f.flow_type === 'in' ? 'running' : 'stopped'}">
                                    ${f.flow_type === 'in' ? '入库' : '出库'}
                                </span>
                            </td>
                            <td>${Validator.sanitize(f.material_name || '-')}</td>
                            <td>${Validator.sanitize(f.batch_no || '-')}</td>
                            <td class="${f.flow_type === 'in' ? 'text-success' : 'text-danger'}">
                                ${f.flow_type === 'in' ? '+' : '-'}${f.quantity}
                            </td>
                            <td>${f.stock_before}</td>
                            <td>${f.stock_after}</td>
                            <td>${Validator.sanitize(f.operator || '-')}</td>
                            <td>${f.operate_time || '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    renderDashboardTab() {
        return `
            ${this.renderDashboardStats()}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                ${this.renderLowStockTable()}
                ${this.renderTrendChart()}
            </div>
        `;
    },

    renderDashboardStats() {
        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                <div class="card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; margin: 0;">
                    <div style="font-size: 14px; opacity: 0.9;">物料总数</div>
                    <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${this.stats.total_materials || 0}</div>
                </div>
                <div class="card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; margin: 0;">
                    <div style="font-size: 14px; opacity: 0.9;">低库存物料</div>
                    <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${this.stats.low_stock_count || 0}</div>
                </div>
                <div class="card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; margin: 0;">
                    <div style="font-size: 14px; opacity: 0.9;">总库存量</div>
                    <div style="font-size: 32px; font-weight: bold; margin-top: 8px;">${this.stats.total_stock || 0}</div>
                </div>
            </div>
        `;
    },

    renderLowStockTable() {
        return `
            <div class="card" style="margin: 0;">
                <div class="card-header">
                    <h3 class="card-title" style="margin: 0;">⚠️ 前10低库存物料</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    ${this.lowStockMaterials.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                            <div>暂无低库存物料</div>
                        </div>
                    ` : `
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>物料编号</th>
                                    <th>物料名称</th>
                                    <th>当前库存</th>
                                    <th>安全库存</th>
                                    <th>缺口</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.lowStockMaterials.map(m => `
                                    <tr class="table-danger">
                                        <td>${Validator.sanitize(m.material_code)}</td>
                                        <td>${Validator.sanitize(m.material_name)}</td>
                                        <td>${m.current_stock}</td>
                                        <td>${m.safety_stock}</td>
                                        <td style="color: var(--danger-color); font-weight: bold;">
                                            ${parseFloat(m.safety_stock) - parseFloat(m.current_stock)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    `}
                </div>
            </div>
        `;
    },

    renderTrendChart() {
        return `
            <div class="card" style="margin: 0;">
                <div class="card-header">
                    <h3 class="card-title" style="margin: 0;">📈 近7天出入库趋势</h3>
                </div>
                <div class="card-body">
                    <canvas id="trendChart" height="250"></canvas>
                </div>
            </div>
        `;
    },

    initTrendChart() {
        if (this.currentTab !== 'dashboard') return;
        
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;

        if (this.trendChart) {
            this.trendChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const labels = this.stockTrend.map(t => t.date.slice(5));
        const inData = this.stockTrend.map(t => t.stock_in);
        const outData = this.stockTrend.map(t => t.stock_out);

        this.trendChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '入库量',
                        data: inData,
                        backgroundColor: 'rgba(40, 167, 69, 0.7)',
                        borderColor: 'rgba(40, 167, 69, 1)',
                        borderWidth: 1
                    },
                    {
                        label: '出库量',
                        data: outData,
                        backgroundColor: 'rgba(220, 53, 69, 0.7)',
                        borderColor: 'rgba(220, 53, 69, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    },

    renderPagination() {
        if (this.currentTab === 'dashboard') return '';
        
        const totalPages = Math.ceil(this.pagination.total / this.pagination.size) || 1;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 8px;">
                <div style="color: var(--text-secondary); font-size: 14px;">
                    共 ${this.pagination.total} 条记录，第 ${this.pagination.page} / ${totalPages} 页
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="InventoryPage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="InventoryPage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadTabData();
    },

    filterByCategory(category) {
        this.filters.category = category;
        this.pagination.page = 1;
        this.loadTabData();
    },

    searchMaterials(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadTabData();
    },

    filterByDate(field, value) {
        this.filters[field] = value;
        this.pagination.page = 1;
        this.loadTabData();
    },

    filterByFlowType(flowType) {
        this.filters.flowType = flowType;
        this.pagination.page = 1;
        this.loadTabData();
    },

    clearDateFilters() {
        this.filters.startDate = '';
        this.filters.endDate = '';
        this.pagination.page = 1;
        this.loadTabData();
    },

    clearFlowFilters() {
        this.filters.startDate = '';
        this.filters.endDate = '';
        this.filters.flowType = '';
        this.pagination.page = 1;
        this.loadTabData();
    },

    showAddMaterialModal() {
        const content = `
            <form id="materialForm">
                <div class="form-group">
                    <label>物料编号 *</label>
                    <input type="text" class="form-control" name="material_code" required>
                </div>
                <div class="form-group">
                    <label>物料名称 *</label>
                    <input type="text" class="form-control" name="material_name" required>
                </div>
                <div class="form-group">
                    <label>规格</label>
                    <input type="text" class="form-control" name="specification">
                </div>
                <div class="form-group">
                    <label>单位</label>
                    <input type="text" class="form-control" name="unit">
                </div>
                <div class="form-group">
                    <label>所属类目</label>
                    <input type="text" class="form-control" name="category">
                </div>
                <div class="form-group">
                    <label>安全库存</label>
                    <input type="number" class="form-control" name="safety_stock" value="0" min="0">
                </div>
                <div class="form-group">
                    <label>当前库存</label>
                    <input type="number" class="form-control" name="current_stock" value="0" min="0">
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增物料',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('materialForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await InventoryService.createMaterial(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        this.loadCategories();
                        this.loadTabData();
                    } else {
                        Toast.error(res.message || '创建失败');
                    }
                } catch (e) {
                    Toast.error('创建失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    showEditMaterialModal(id) {
        const material = this.materials.find(m => m.id === id);
        if (!material) return;

        const content = `
            <form id="materialForm">
                <div class="form-group">
                    <label>物料编号 *</label>
                    <input type="text" class="form-control" name="material_code" value="${Validator.sanitize(material.material_code)}" required>
                </div>
                <div class="form-group">
                    <label>物料名称 *</label>
                    <input type="text" class="form-control" name="material_name" value="${Validator.sanitize(material.material_name)}" required>
                </div>
                <div class="form-group">
                    <label>规格</label>
                    <input type="text" class="form-control" name="specification" value="${Validator.sanitize(material.specification || '')}">
                </div>
                <div class="form-group">
                    <label>单位</label>
                    <input type="text" class="form-control" name="unit" value="${Validator.sanitize(material.unit || '')}">
                </div>
                <div class="form-group">
                    <label>所属类目</label>
                    <input type="text" class="form-control" name="category" value="${Validator.sanitize(material.category || '')}">
                </div>
                <div class="form-group">
                    <label>安全库存</label>
                    <input type="number" class="form-control" name="safety_stock" value="${material.safety_stock}" min="0">
                </div>
                <div class="form-group">
                    <label>当前库存</label>
                    <input type="number" class="form-control" name="current_stock" value="${material.current_stock}" min="0">
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑物料',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('materialForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await InventoryService.updateMaterial(id, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        this.loadCategories();
                        this.loadTabData();
                    } else {
                        Toast.error(res.message || '更新失败');
                    }
                } catch (e) {
                    Toast.error('更新失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    async toggleMaterialStatus(id) {
        const confirmed = await Modal.confirm('确定要切换该物料的状态吗？');
        if (!confirmed) return;

        try {
            const res = await InventoryService.toggleMaterialStatus(id);
            if (res.code === 200) {
                Toast.success('状态更新成功');
                this.loadTabData();
            } else {
                Toast.error(res.message || '操作失败');
            }
        } catch (e) {
            Toast.error('操作失败');
            console.error(e);
        }
    },

    async deleteMaterial(id) {
        const confirmed = await Modal.confirm('确定要删除该物料吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await InventoryService.deleteMaterial(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                this.loadCategories();
                this.loadTabData();
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    },

    showStockInModal() {
        const materialOptions = this.materials
            .filter(m => m.status === 'active')
            .map(m => `<option value="${m.id}">${m.material_code} - ${m.material_name} (库存: ${m.current_stock})</option>`)
            .join('');

        const content = `
            <form id="stockInForm">
                <div class="form-group">
                    <label>物料 *</label>
                    <select class="form-control" name="material_id" required>
                        <option value="">请选择物料</option>
                        ${materialOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>数量 *</label>
                    <input type="number" class="form-control" name="quantity" required min="0.01" step="0.01">
                </div>
                <div class="form-group">
                    <label>批次号</label>
                    <input type="text" class="form-control" name="batch_no">
                </div>
                <div class="form-group">
                    <label>来源</label>
                    <input type="text" class="form-control" name="source">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '物料入库',
            content: content,
            width: '500px',
            confirmText: '确认入库',
            onConfirm: async () => {
                const form = document.getElementById('stockInForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await InventoryService.createStockIn(data);
                    if (res.code === 201) {
                        Toast.success('入库成功');
                        modal.close();
                        this.loadTabData();
                    } else {
                        Toast.error(res.message || '入库失败');
                    }
                } catch (e) {
                    Toast.error('入库失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    showStockOutModal() {
        const materialOptions = this.materials
            .filter(m => m.status === 'active')
            .map(m => `<option value="${m.id}">${m.material_code} - ${m.material_name} (库存: ${m.current_stock})</option>`)
            .join('');

        const content = `
            <form id="stockOutForm">
                <div class="form-group">
                    <label>物料 *</label>
                    <select class="form-control" name="material_id" required>
                        <option value="">请选择物料</option>
                        ${materialOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>数量 *</label>
                    <input type="number" class="form-control" name="quantity" required min="0.01" step="0.01">
                </div>
                <div class="form-group">
                    <label>批次号</label>
                    <input type="text" class="form-control" name="batch_no">
                </div>
                <div class="form-group">
                    <label>领用部门/任务</label>
                    <input type="text" class="form-control" name="department">
                </div>
                <div class="form-group">
                    <label>用途</label>
                    <textarea class="form-control" name="purpose" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '物料出库',
            content: content,
            width: '500px',
            confirmText: '确认出库',
            onConfirm: async () => {
                const form = document.getElementById('stockOutForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await InventoryService.createStockOut(data);
                    if (res.code === 201) {
                        Toast.success('出库成功');
                        modal.close();
                        this.loadTabData();
                    } else {
                        Toast.error(res.message || '出库失败');
                    }
                } catch (e) {
                    Toast.error('出库失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    }
};

window.InventoryPage = InventoryPage;
