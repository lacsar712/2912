/**
 * 质检单列表页面
 */
const QualityOrdersPage = {
    orders: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    filters: {
        keyword: '',
        taskKeyword: '',
        productName: '',
        overallResult: '',
        taskId: ''
    },

    init() {
        this.loadOrders();
    },

    async loadOrders() {
        try {
            const params = {
                page: this.currentPage,
                size: this.pageSize,
                keyword: this.filters.keyword || undefined,
                taskKeyword: this.filters.taskKeyword || undefined,
                productName: this.filters.productName || undefined,
                overallResult: this.filters.overallResult || undefined,
                taskId: this.filters.taskId || undefined
            };
            const response = await QualityService.getOrders(params);
            if (response.code === 200) {
                this.orders = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载质检单失败');
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">质检单管理</h3>
                    <button class="btn btn-primary" onclick="QualityOrdersPage.goToCreate()">
                        新建质检单
                    </button>
                </div>
                <div class="card-body">
                    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                        <div style="display: flex; gap: 8px; align-items: center; min-width: 200px; flex: 1;">
                            <label style="margin: 0; white-space: nowrap; font-size: 14px;">质检单号：</label>
                            <input type="text" class="form-control" id="filterOrderCode" 
                                   placeholder="请输入质检单号" 
                                   value="${this.filters.keyword}"
                                   style="flex: 1;">
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; min-width: 200px; flex: 1;">
                            <label style="margin: 0; white-space: nowrap; font-size: 14px;">任务：</label>
                            <input type="text" class="form-control" id="filterTask" 
                                   placeholder="任务编号/名称" 
                                   value="${this.filters.taskKeyword}"
                                   style="flex: 1;">
                        </div>
                    </div>
                    <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                        <div style="display: flex; gap: 8px; align-items: center; min-width: 200px; flex: 1;">
                            <label style="margin: 0; white-space: nowrap; font-size: 14px;">产品名称：</label>
                            <input type="text" class="form-control" id="filterProduct" 
                                   placeholder="请输入产品名称" 
                                   value="${this.filters.productName}"
                                   style="flex: 1;">
                        </div>
                        <div style="display: flex; gap: 8px; align-items: center; min-width: 150px;">
                            <label style="margin: 0; white-space: nowrap; font-size: 14px;">结论：</label>
                            <select class="form-control" id="filterResult" style="width: 100px; flex: 1;">
                                <option value="">全部</option>
                                <option value="qualified" ${this.filters.overallResult === 'qualified' ? 'selected' : ''}>合格</option>
                                <option value="unqualified" ${this.filters.overallResult === 'unqualified' ? 'selected' : ''}>不合格</option>
                                <option value="pending" ${this.filters.overallResult === 'pending' ? 'selected' : ''}>待检</option>
                            </select>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-primary" onclick="QualityOrdersPage.search()">搜索</button>
                            <button class="btn btn-outline" onclick="QualityOrdersPage.resetFilter()">重置</button>
                        </div>
                    </div>
                    <div id="orderTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
    },

    renderTable() {
        const tableContainer = document.getElementById('orderTable');
        if (!this.orders || this.orders.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无质检单数据</p>';
            return;
        }

        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>质检单号</th>
                            <th>关联任务</th>
                            <th>产品名称</th>
                            <th>抽检数量</th>
                            <th>合格数</th>
                            <th>不合格数</th>
                            <th>检测人</th>
                            <th>检测时间</th>
                            <th>结论</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.orders.map(o => this.renderRow(o)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(order) {
        const resultMap = {
            qualified: { text: '合格', class: 'badge-success' },
            unqualified: { text: '不合格', class: 'badge-danger' },
            pending: { text: '待检', class: 'badge-warning' }
        };
        const result = resultMap[order.overall_result] || resultMap.pending;

        return `
            <tr>
                <td><strong>${Validator.sanitize(order.order_code)}</strong></td>
                <td>${Validator.sanitize(order.task_name || order.task_code || '-')}</td>
                <td>${Validator.sanitize(order.product_name || '-')}</td>
                <td>${order.sample_quantity || 0}</td>
                <td><span class="text-success">${order.qualified_quantity || 0}</span></td>
                <td><span class="text-danger">${order.unqualified_quantity || 0}</span></td>
                <td>${Validator.sanitize(order.inspector || '-')}</td>
                <td>${Formatter.formatDate(order.inspection_time)}</td>
                <td><span class="badge ${result.class}">${result.text}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="QualityOrdersPage.viewDetail(${order.id})">查看</button>
                    <button class="btn btn-sm btn-warning" onclick="QualityOrdersPage.editOrder(${order.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="QualityOrdersPage.deleteOrder(${order.id})">删除</button>
                </td>
            </tr>
        `;
    },

    renderPagination() {
        const totalPages = Math.ceil(this.total / this.pageSize) || 1;
        const paginationContainer = document.getElementById('pagination');

        paginationContainer.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 8px;">
                <div style="color: var(--text-secondary); font-size: 14px;">
                    共 ${this.total} 条记录，第 ${this.currentPage} / ${totalPages} 页
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="QualityOrdersPage.changePage(${this.currentPage - 1})"
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="QualityOrdersPage.changePage(${this.currentPage + 1})"
                            ${this.currentPage >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    search() {
        this.filters.keyword = document.getElementById('filterOrderCode').value;
        this.filters.taskKeyword = document.getElementById('filterTask').value;
        this.filters.productName = document.getElementById('filterProduct').value;
        this.filters.overallResult = document.getElementById('filterResult').value;
        this.currentPage = 1;
        this.loadOrders();
    },

    resetFilter() {
        this.filters = {
            keyword: '',
            taskKeyword: '',
            productName: '',
            overallResult: '',
            taskId: ''
        };
        this.currentPage = 1;
        this.loadOrders();
    },

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadOrders();
    },

    goToCreate() {
        window.location.hash = 'quality-order-form';
    },

    async viewDetail(id) {
        try {
            const response = await QualityService.getOrderById(id);
            if (response.code === 200) {
                this.showDetailModal(response.data);
            }
        } catch (error) {
            Toast.error('获取详情失败');
        }
    },

    showDetailModal(order) {
        const resultMap = {
            qualified: { text: '合格', class: 'badge-success' },
            unqualified: { text: '不合格', class: 'badge-danger' },
            pending: { text: '待检', class: 'badge-warning' }
        };
        const result = resultMap[order.overall_result] || resultMap.pending;

        const resultsHtml = (order.results || []).map((r, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${Validator.sanitize(r.item_name)}</td>
                <td>${Validator.sanitize(r.standard || '-')}</td>
                <td>${r.lower_limit !== null && r.lower_limit !== undefined ? r.lower_limit : '-'}</td>
                <td>${r.upper_limit !== null && r.upper_limit !== undefined ? r.upper_limit : '-'}</td>
                <td>${Validator.sanitize(r.actual_value || '-')}</td>
                <td>${r.is_qualified === 1 ? '<span class="badge badge-success">合格</span>' : '<span class="badge badge-danger">不合格</span>'}</td>
            </tr>
        `).join('');

        const defectsHtml = (order.defects || []).map((d, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${Validator.sanitize(d.defect_type || '-')}</td>
                <td>${this.getSeverityText(d.severity)}</td>
                <td>${this.getDispositionText(d.disposition)}</td>
                <td>${d.quantity || 1}</td>
                <td>${Validator.sanitize(d.description || '-')}</td>
            </tr>
        `).join('');

        new Modal({
            title: '质检单详情',
            content: `
                <div style="display: grid; gap: 16px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">质检单号</label>
                            <div style="font-weight: 500;">${Validator.sanitize(order.order_code)}</div>
                        </div>
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">整体结论</label>
                            <div><span class="badge ${result.class}">${result.text}</span></div>
                        </div>
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">检测人</label>
                            <div style="font-weight: 500;">${Validator.sanitize(order.inspector || '-')}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">产品名称</label>
                            <div style="font-weight: 500;">${Validator.sanitize(order.product_name || '-')}</div>
                        </div>
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">产品规格</label>
                            <div style="font-weight: 500;">${Validator.sanitize(order.product_spec || '-')}</div>
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
                        <div style="text-align: center; padding: 12px; background: var(--bg-light); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: var(--primary-color);">${order.sample_quantity || 0}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">抽检数量</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(40,167,69,0.1); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #28a745;">${order.qualified_quantity || 0}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">合格数</div>
                        </div>
                        <div style="text-align: center; padding: 12px; background: rgba(220,53,69,0.1); border-radius: 8px;">
                            <div style="font-size: 24px; font-weight: bold; color: #dc3545;">${order.unqualified_quantity || 0}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">不合格数</div>
                        </div>
                    </div>
                    <div>
                        <label style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px; display: block;">检测项结果</label>
                        <div class="table-wrapper" style="max-height: 200px; overflow-y: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40px;">序号</th>
                                        <th>检测项</th>
                                        <th>标准值</th>
                                        <th>下限</th>
                                        <th>上限</th>
                                        <th>实测值</th>
                                        <th>结果</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${resultsHtml || '<tr><td colspan="7" class="empty-text">暂无数据</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div>
                        <label style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px; display: block;">不合格记录</label>
                        <div class="table-wrapper" style="max-height: 150px; overflow-y: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 40px;">序号</th>
                                        <th>缺陷类型</th>
                                        <th>严重程度</th>
                                        <th>处置建议</th>
                                        <th>数量</th>
                                        <th>描述</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${defectsHtml || '<tr><td colspan="6" class="empty-text">暂无不合格记录</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ${order.remark ? `
                    <div>
                        <label style="color: var(--text-secondary); font-size: 12px;">备注</label>
                        <div>${Validator.sanitize(order.remark)}</div>
                    </div>
                    ` : ''}
                </div>
            `,
            width: '700px',
            showCancel: false,
            confirmText: '关闭'
        }).show();
    },

    getSeverityText(severity) {
        const map = {
            minor: '<span class="badge badge-warning">轻微</span>',
            major: '<span class="badge badge-danger">严重</span>',
            critical: '<span class="badge badge-danger" style="background:#721c24;">致命</span>'
        };
        return map[severity] || '-';
    },

    getDispositionText(disposition) {
        const map = {
            rework: '返工',
            scrap: '报废',
            concession: '让步接收'
        };
        return map[disposition] || '-';
    },

    editOrder(id) {
        window.location.hash = `quality-order-form?id=${id}`;
    },

    async deleteOrder(id) {
        if (!confirm('确定要删除此质检单吗？删除后不可恢复。')) return;

        try {
            const response = await QualityService.deleteOrder(id);
            if (response.code === 200) {
                Toast.success('删除成功');
                this.loadOrders();
            } else {
                Toast.error(response.message || '删除失败');
            }
        } catch (error) {
            Toast.error('删除失败');
        }
    },

    renderSubNav() {
        const current = 'quality-orders';
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

window.QualityOrdersPage = QualityOrdersPage;
