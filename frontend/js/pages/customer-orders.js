/**
 * 客户订单管理页面
 */
const CustomerOrdersPage = {
    currentView: 'table',
    orders: [],
    customers: [],
    delayRiskOrders: [],
    pagination: { page: 1, size: 10, total: 0 },
    filters: {
        keyword: '',
        customer_id: '',
        status: '',
        delay_risk: ''
    },

    STATUS_MAP: {
        pending: { text: '待审', color: 'warning' },
        approved: { text: '已审', color: 'info' },
        in_production: { text: '生产中', color: 'running' },
        partial_shipped: { text: '部分发货', color: 'maintenance' },
        completed: { text: '已完成', color: 'success' },
        cancelled: { text: '已取消', color: 'error' }
    },

    LANE_STATUSES: ['pending', 'approved', 'in_production', 'partial_shipped', 'completed', 'cancelled'],

    init() {
        this.loadData();
    },

    destroy() {
    },

    async loadData() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            await Promise.all([
                this.loadCustomers(),
                this.loadDelayRiskOrders(),
                this.loadOrders()
            ]);
            this.renderPage();
        } catch (error) {
            Toast.error('加载数据失败');
            console.error(error);
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

    async loadCustomers() {
        try {
            const res = await CustomerOrderService.getCustomers({ size: 1000 });
            if (res.code === 200) {
                this.customers = res.data.items || res.data || [];
            }
        } catch (e) {
            console.error(e);
        }
    },

    async loadDelayRiskOrders() {
        try {
            const res = await CustomerOrderService.getDelayRiskOrders({ size: 20 });
            if (res.code === 200) {
                this.delayRiskOrders = res.data.items || res.data || [];
            }
        } catch (e) {
            console.error(e);
        }
    },

    async loadOrders() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            keyword: this.filters.keyword || undefined,
            customer_id: this.filters.customer_id || undefined,
            status: this.filters.status || undefined,
            delay_risk: this.filters.delay_risk || undefined
        };
        const res = await CustomerOrderService.getOrders(params);
        if (res.code === 200) {
            this.orders = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    renderPage() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderDelayRiskPanel()}
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">客户订单管理</h3>
                    ${this.renderViewToggle()}
                </div>
                <div class="card-body">
                    ${this.renderFilters()}
                    ${this.currentView === 'table' ? this.renderTableView() : this.renderLaneView()}
                    ${this.currentView === 'table' ? this.renderPagination() : ''}
                </div>
            </div>
        `;
    },

    renderDelayRiskPanel() {
        if (!this.delayRiskOrders.length) {
            return '';
        }
        return `
            <div class="card" style="margin-bottom: 16px; border-left: 4px solid var(--danger-color);">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <h3 class="card-title" style="margin: 0; color: var(--danger-color);">
                        🔴 延期风险订单 (${this.delayRiskOrders.length})
                    </h3>
                </div>
                <div class="card-body" style="padding: 12px;">
                    <div style="display: flex; gap: 12px; flex-wrap: wrap; overflow-x: auto;">
                        ${this.delayRiskOrders.map(order => this.renderDelayRiskCard(order)).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderDelayRiskCard(order) {
        const customerName = this.getCustomerName(order.customer_id);
        return `
            <div style="
                background: #fff5f5;
                border: 1px solid #fed7d7;
                border-radius: 8px;
                padding: 12px 16px;
                min-width: 220px;
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.boxShadow='0 2px 8px rgba(220,53,69,0.2)'"
               onmouseout="this.style.boxShadow='none'"
               onclick="CustomerOrdersPage.goToDetail(${order.id})">
                <div style="font-weight: bold; color: var(--danger-color); margin-bottom: 4px;">
                    ${Validator.sanitize(order.order_no || '-')}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
                    ${Validator.sanitize(customerName)}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    ${Validator.sanitize(order.product_name || '-')} · ${order.quantity || 0}件
                </div>
                <div style="font-size: 12px; color: var(--danger-color); margin-top: 4px; font-weight: 500;">
                    交期: ${order.delivery_date || '-'}
                </div>
            </div>
        `;
    },

    renderViewToggle() {
        return `
            <div class="tab-buttons" style="display: flex; gap: 8px;">
                <button class="btn ${this.currentView === 'table' ? 'btn-primary' : 'btn-outline'}" 
                        onclick="CustomerOrdersPage.switchView('table')"
                        style="padding: 6px 16px;">
                    📋 表格视图
                </button>
                <button class="btn ${this.currentView === 'lane' ? 'btn-primary' : 'btn-outline'}" 
                        onclick="CustomerOrdersPage.switchView('lane')"
                        style="padding: 6px 16px;">
                    🏊 泳道视图
                </button>
            </div>
        `;
    },

    switchView(view) {
        this.currentView = view;
        this.renderPage();
    },

    renderFilters() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">客户：</label>
                    <select class="form-control" style="width: 160px;" onchange="CustomerOrdersPage.filterByCustomer(this.value)">
                        <option value="">全部客户</option>
                        ${this.customers.map(c => `
                            <option value="${c.id}" ${this.filters.customer_id == c.id ? 'selected' : ''}>
                                ${Validator.sanitize(c.customer_name || c.name || c.customer_code || c.id)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">状态：</label>
                    <select class="form-control" style="width: 120px;" onchange="CustomerOrdersPage.filterByStatus(this.value)">
                        <option value="">全部状态</option>
                        ${Object.entries(this.STATUS_MAP).map(([key, val]) => `
                            <option value="${key}" ${this.filters.status === key ? 'selected' : ''}>${val.text}</option>
                        `).join('')}
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">延期风险：</label>
                    <select class="form-control" style="width: 120px;" onchange="CustomerOrdersPage.filterByDelayRisk(this.value)">
                        <option value="">全部</option>
                        <option value="1" ${this.filters.delay_risk === '1' ? 'selected' : ''}>有风险</option>
                        <option value="0" ${this.filters.delay_risk === '0' ? 'selected' : ''}>无风险</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" placeholder="搜索订单号/产品/客户..." 
                           value="${this.filters.keyword || ''}"
                           onkeyup="if(event.key==='Enter') CustomerOrdersPage.searchOrders(this.value)"
                           style="flex: 1;">
                    <button class="btn btn-primary" onclick="CustomerOrdersPage.searchOrders(this.previousElementSibling.value)">搜索</button>
                </div>
                <button class="btn btn-primary" onclick="CustomerOrdersPage.showAddOrderModal()">
                    + 新增订单
                </button>
            </div>
        `;
    },

    renderTableView() {
        if (!this.orders.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                    <div>暂无订单数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="CustomerOrdersPage.showAddOrderModal()">
                        新增订单
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>订单号</th>
                        <th>客户</th>
                        <th>产品</th>
                        <th>规格</th>
                        <th>数量</th>
                        <th>金额</th>
                        <th>交期</th>
                        <th>状态</th>
                        <th>完成率</th>
                        <th>延期风险</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.orders.map(o => this.renderOrderRow(o)).join('')}
                </tbody>
            </table>
        `;
    },

    renderOrderRow(o) {
        const statusInfo = this.STATUS_MAP[o.status] || { text: o.status, color: 'info' };
        const customerName = this.getCustomerName(o.customer_id);
        const amount = (o.quantity || 0) * (o.unit_price || 0);
        const completion = o.completion_rate !== undefined && o.completion_rate !== null ? o.completion_rate : 0;
        const isDelayRisk = o.delay_risk || this.delayRiskOrders.some(d => d.id === o.id);

        return `
            <tr style="cursor: pointer;" onclick="CustomerOrdersPage.goToDetail(${o.id})">
                <td onclick="event.stopPropagation()">${Validator.sanitize(o.order_no || '-')}</td>
                <td onclick="event.stopPropagation()">${Validator.sanitize(customerName)}</td>
                <td onclick="event.stopPropagation()">${Validator.sanitize(o.product_name || '-')}</td>
                <td onclick="event.stopPropagation()">${Validator.sanitize(o.specification || '-')}</td>
                <td onclick="event.stopPropagation()">${o.quantity || 0}</td>
                <td onclick="event.stopPropagation()">${Formatter.formatCurrency(amount)}</td>
                <td onclick="event.stopPropagation()">${o.delivery_date || '-'}</td>
                <td onclick="event.stopPropagation()">
                    <span class="status-badge ${statusInfo.color}">
                        ${statusInfo.text}
                    </span>
                </td>
                <td onclick="event.stopPropagation()">
                    ${this.renderProgressBar(completion)}
                </td>
                <td onclick="event.stopPropagation()">
                    ${isDelayRisk ? '<span style="color: var(--danger-color); font-weight: bold;">🔴 延期风险</span>' : '<span style="color: var(--text-secondary);">-</span>'}
                </td>
                <td onclick="event.stopPropagation()">
                    ${this.renderOrderActions(o)}
                </td>
            </tr>
        `;
    },

    renderProgressBar(rate) {
        const percent = Math.min(100, Math.max(0, rate * 100));
        let color = 'var(--primary-color)';
        if (percent >= 100) color = 'var(--success-color)';
        else if (percent < 30) color = 'var(--warning-color)';

        return `
            <div style="display: flex; align-items: center; gap: 8px;">
                <div style="flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; min-width: 60px;">
                    <div style="width: ${percent}%; height: 100%; background: ${color}; transition: width 0.3s;"></div>
                </div>
                <span style="font-size: 12px; color: var(--text-secondary); white-space: nowrap;">${percent.toFixed(0)}%</span>
            </div>
        `;
    },

    renderOrderActions(o) {
        const isPending = o.status === 'pending';
        const canApprove = o.status === 'pending';
        const canCancel = o.status === 'pending' || o.status === 'approved' || o.status === 'in_production';
        const canSplit = o.status === 'approved' || o.status === 'in_production';
        const canDelivery = o.status === 'in_production' || o.status === 'partial_shipped' || o.status === 'approved';

        let buttons = `
            <button class="btn btn-sm btn-outline" onclick="CustomerOrdersPage.goToDetail(${o.id})">详情</button>
        `;

        if (isPending) {
            buttons += `
                <button class="btn btn-sm btn-outline" onclick="CustomerOrdersPage.showEditOrderModal(${o.id})">编辑</button>
                <button class="btn btn-sm btn-danger" onclick="CustomerOrdersPage.deleteOrder(${o.id})">删除</button>
            `;
        }

        if (canApprove) {
            buttons += `<button class="btn btn-sm btn-success" onclick="CustomerOrdersPage.approveOrder(${o.id})">审核</button>`;
        }

        if (canCancel) {
            buttons += `<button class="btn btn-sm btn-warning" onclick="CustomerOrdersPage.cancelOrder(${o.id})">取消</button>`;
        }

        if (canSplit) {
            buttons += `<button class="btn btn-sm btn-primary" onclick="CustomerOrdersPage.showSplitOrderModal(${o.id})">拆单</button>`;
        }

        if (canDelivery) {
            buttons += `<button class="btn btn-sm btn-info" onclick="CustomerOrdersPage.showDeliveryModal(${o.id})">发货</button>`;
        }

        return buttons;
    },

    renderLaneView() {
        const ordersByStatus = {};
        this.LANE_STATUSES.forEach(s => ordersByStatus[s] = []);
        this.orders.forEach(o => {
            if (ordersByStatus[o.status]) {
                ordersByStatus[o.status].push(o);
            }
        });

        return `
            <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; min-height: 500px;">
                ${this.LANE_STATUSES.map(status => this.renderLane(status, ordersByStatus[status] || [])).join('')}
            </div>
        `;
    },

    renderLane(status, orders) {
        const statusInfo = this.STATUS_MAP[status];
        const laneColors = {
            pending: '#ffc107',
            approved: '#17a2b8',
            in_production: '#007bff',
            partial_shipped: '#fd7e14',
            completed: '#28a745',
            cancelled: '#dc3545'
        };
        const color = laneColors[status] || '#6c757d';

        return `
            <div style="flex: 1; min-width: 240px; display: flex; flex-direction: column;">
                <div style="
                    background: ${color}15;
                    border-top: 3px solid ${color};
                    border-radius: 8px 8px 0 0;
                    padding: 10px 12px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <span style="font-weight: bold; color: ${color};">${statusInfo.text}</span>
                    <span style="background: ${color}; color: white; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                        ${orders.length}
                    </span>
                </div>
                <div style="
                    flex: 1;
                    background: ${color}08;
                    border: 1px solid ${color}30;
                    border-top: none;
                    border-radius: 0 0 8px 8px;
                    padding: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    min-height: 200px;
                ">
                    ${orders.length === 0 ? `
                        <div style="text-align: center; padding: 30px 0; color: var(--text-secondary); font-size: 12px;">
                            暂无订单
                        </div>
                    ` : orders.map(o => this.renderLaneCard(o, color)).join('')}
                </div>
            </div>
        `;
    },

    renderLaneCard(o, color) {
        const customerName = this.getCustomerName(o.customer_id);
        const completion = o.completion_rate !== undefined && o.completion_rate !== null ? o.completion_rate : 0;
        const isDelayRisk = o.delay_risk || this.delayRiskOrders.some(d => d.id === o.id);

        return `
            <div style="
                background: white;
                border-radius: 8px;
                padding: 10px 12px;
                border-left: 3px solid ${color};
                box-shadow: 0 1px 3px rgba(0,0,0,0.08);
                cursor: pointer;
                transition: all 0.2s;
            " onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.15)'"
               onmouseout="this.style.boxShadow='0 1px 3px rgba(0,0,0,0.08)'"
               onclick="CustomerOrdersPage.goToDetail(${o.id})">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                    <span style="font-weight: bold; font-size: 13px;">${Validator.sanitize(o.order_no || '-')}</span>
                    ${isDelayRisk ? '<span style="color: var(--danger-color); font-size: 12px;">🔴</span>' : ''}
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
                    ${Validator.sanitize(customerName)}
                </div>
                <div style="font-size: 12px; margin-bottom: 6px;">
                    ${Validator.sanitize(o.product_name || '-')} · ${o.quantity || 0}件
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
                    交期: ${o.delivery_date || '-'}
                </div>
                ${this.renderProgressBar(completion)}
            </div>
        `;
    },

    renderPagination() {
        const totalPages = Math.ceil(this.pagination.total / this.pagination.size) || 1;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 8px;">
                <div style="color: var(--text-secondary); font-size: 14px;">
                    共 ${this.pagination.total} 条记录，第 ${this.pagination.page} / ${totalPages} 页
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="CustomerOrdersPage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="CustomerOrdersPage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    getCustomerName(customerId) {
        if (!customerId) return '-';
        const customer = this.customers.find(c => c.id == customerId);
        if (!customer) return '-';
        return customer.customer_name || customer.name || customer.customer_code || customer.id;
    },

    goToDetail(orderId) {
        App.navigate(`customer-order-detail?id=${orderId}`);
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadOrders().then(() => this.renderPage());
    },

    filterByCustomer(customerId) {
        this.filters.customer_id = customerId;
        this.pagination.page = 1;
        this.loadOrders().then(() => this.renderPage());
    },

    filterByStatus(status) {
        this.filters.status = status;
        this.pagination.page = 1;
        this.loadOrders().then(() => this.renderPage());
    },

    filterByDelayRisk(value) {
        this.filters.delay_risk = value;
        this.pagination.page = 1;
        this.loadOrders().then(() => this.renderPage());
    },

    searchOrders(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadOrders().then(() => this.renderPage());
    },

    showAddOrderModal() {
        const customerOptions = this.customers.map(c => `
            <option value="${c.id}">${Validator.sanitize(c.customer_name || c.name || c.customer_code || c.id)}</option>
        `).join('');

        const content = `
            <form id="orderForm">
                <div class="form-group">
                    <label>订单号 *</label>
                    <input type="text" class="form-control" name="order_no" required>
                </div>
                <div class="form-group">
                    <label>客户 *</label>
                    <select class="form-control" name="customer_id" required>
                        <option value="">请选择客户</option>
                        ${customerOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>产品名称 *</label>
                    <input type="text" class="form-control" name="product_name" required>
                </div>
                <div class="form-group">
                    <label>规格</label>
                    <input type="text" class="form-control" name="specification">
                </div>
                <div class="form-group">
                    <label>数量 *</label>
                    <input type="number" class="form-control" name="quantity" required min="1" step="1">
                </div>
                <div class="form-group">
                    <label>单价 *</label>
                    <input type="number" class="form-control" name="unit_price" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>交期</label>
                    <input type="date" class="form-control" name="delivery_date">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增订单',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('orderForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.createOrder(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        await this.loadOrders();
                        await this.loadDelayRiskOrders();
                        this.renderPage();
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

    showEditOrderModal(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;

        const customerOptions = this.customers.map(c => `
            <option value="${c.id}" ${order.customer_id == c.id ? 'selected' : ''}>
                ${Validator.sanitize(c.customer_name || c.name || c.customer_code || c.id)}
            </option>
        `).join('');

        const content = `
            <form id="orderForm">
                <div class="form-group">
                    <label>订单号 *</label>
                    <input type="text" class="form-control" name="order_no" value="${Validator.sanitize(order.order_no || '')}" required>
                </div>
                <div class="form-group">
                    <label>客户 *</label>
                    <select class="form-control" name="customer_id" required>
                        <option value="">请选择客户</option>
                        ${customerOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>产品名称 *</label>
                    <input type="text" class="form-control" name="product_name" value="${Validator.sanitize(order.product_name || '')}" required>
                </div>
                <div class="form-group">
                    <label>规格</label>
                    <input type="text" class="form-control" name="specification" value="${Validator.sanitize(order.specification || '')}">
                </div>
                <div class="form-group">
                    <label>数量 *</label>
                    <input type="number" class="form-control" name="quantity" value="${order.quantity || 0}" required min="1" step="1">
                </div>
                <div class="form-group">
                    <label>单价 *</label>
                    <input type="number" class="form-control" name="unit_price" value="${order.unit_price || 0}" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>交期</label>
                    <input type="date" class="form-control" name="delivery_date" value="${order.delivery_date || ''}">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="3">${Validator.sanitize(order.remark || '')}</textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑订单',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('orderForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.updateOrder(id, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        await this.loadOrders();
                        await this.loadDelayRiskOrders();
                        this.renderPage();
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

    async approveOrder(id) {
        const confirmed = await Modal.confirm('确定要审核该订单吗？');
        if (!confirmed) return;

        try {
            const res = await CustomerOrderService.approveOrder(id);
            if (res.code === 200) {
                Toast.success('审核成功');
                await this.loadOrders();
                this.renderPage();
            } else {
                Toast.error(res.message || '审核失败');
            }
        } catch (e) {
            Toast.error('审核失败');
            console.error(e);
        }
    },

    async cancelOrder(id) {
        const confirmed = await Modal.confirm('确定要取消该订单吗？此操作不可撤销。');
        if (!confirmed) return;

        try {
            const res = await CustomerOrderService.cancelOrder(id);
            if (res.code === 200) {
                Toast.success('取消成功');
                await this.loadOrders();
                await this.loadDelayRiskOrders();
                this.renderPage();
            } else {
                Toast.error(res.message || '取消失败');
            }
        } catch (e) {
            Toast.error('取消失败');
            console.error(e);
        }
    },

    async deleteOrder(id) {
        const confirmed = await Modal.confirm('确定要删除该订单吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await CustomerOrderService.deleteOrder(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                await this.loadOrders();
                await this.loadDelayRiskOrders();
                this.renderPage();
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    },

    showSplitOrderModal(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;

        const content = `
            <form id="splitForm">
                <div class="form-group">
                    <label>产品名称</label>
                    <input type="text" class="form-control" value="${Validator.sanitize(order.product_name || '')}" disabled>
                </div>
                <div class="form-group">
                    <label>规格</label>
                    <input type="text" class="form-control" value="${Validator.sanitize(order.specification || '')}" disabled>
                </div>
                <div class="form-group">
                    <label>拆单数量 *</label>
                    <input type="number" class="form-control" name="quantity" required min="1" max="${order.quantity || 0}" step="1" placeholder="最多 ${order.quantity || 0}">
                </div>
                <div class="form-group">
                    <label>生产线</label>
                    <input type="text" class="form-control" name="line_id" placeholder="可选">
                </div>
                <div class="form-group">
                    <label>优先级</label>
                    <select class="form-control" name="priority">
                        <option value="low">低</option>
                        <option value="medium" selected>中</option>
                        <option value="high">高</option>
                        <option value="urgent">紧急</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>计划开始时间</label>
                    <input type="datetime-local" class="form-control" name="start_time">
                </div>
                <div class="form-group">
                    <label>计划结束时间</label>
                    <input type="datetime-local" class="form-control" name="end_time">
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="2"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '拆单 - 创建生产任务',
            content: content,
            width: '500px',
            confirmText: '确认拆单',
            onConfirm: async () => {
                const form = document.getElementById('splitForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.splitOrder(id, data);
                    if (res.code === 201 || res.code === 200) {
                        Toast.success('拆单成功，生产任务已创建');
                        modal.close();
                        await this.loadOrders();
                        this.renderPage();
                    } else {
                        Toast.error(res.message || '拆单失败');
                    }
                } catch (e) {
                    Toast.error('拆单失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    showDeliveryModal(id) {
        const order = this.orders.find(o => o.id === id);
        if (!order) return;

        const content = `
            <form id="deliveryForm">
                <div class="form-group">
                    <label>订单号</label>
                    <input type="text" class="form-control" value="${Validator.sanitize(order.order_no || '')}" disabled>
                </div>
                <div class="form-group">
                    <label>发货单号 *</label>
                    <input type="text" class="form-control" name="delivery_no" required>
                </div>
                <div class="form-group">
                    <label>发货数量 *</label>
                    <input type="number" class="form-control" name="shipped_quantity" required min="1" max="${order.quantity || 0}" step="1" placeholder="最多 ${order.quantity || 0}">
                </div>
                <div class="form-group">
                    <label>物流单号</label>
                    <input type="text" class="form-control" name="logistics_no">
                </div>
                <div class="form-group">
                    <label>发货时间 *</label>
                    <input type="datetime-local" class="form-control" name="shipped_time" required>
                </div>
                <div class="form-group">
                    <label>签收状态</label>
                    <select class="form-control" name="sign_status">
                        <option value="pending">待签收</option>
                        <option value="signed">已签收</option>
                        <option value="rejected">拒收</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="2"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '订单发货',
            content: content,
            width: '500px',
            confirmText: '确认发货',
            onConfirm: async () => {
                const form = document.getElementById('deliveryForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.order_id = id;

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.createDelivery(data);
                    if (res.code === 201 || res.code === 200) {
                        Toast.success('发货成功');
                        modal.close();
                        await this.loadOrders();
                        await this.loadDelayRiskOrders();
                        this.renderPage();
                    } else {
                        Toast.error(res.message || '发货失败');
                    }
                } catch (e) {
                    Toast.error('发货失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    }
};

window.CustomerOrdersPage = CustomerOrdersPage;
