/**
 * 客户订单详情页面
 */
const CustomerOrderDetailPage = {
    orderId: null,
    order: null,

    STATUS_MAP: {
        pending: { text: '待审', color: 'warning' },
        approved: { text: '已审', color: 'info' },
        in_production: { text: '生产中', color: 'running' },
        partial_shipped: { text: '部分发货', color: 'maintenance' },
        completed: { text: '已完成', color: 'success' },
        cancelled: { text: '已取消', color: 'error' }
    },

    TASK_STATUS_MAP: {
        pending: { text: '待开始', color: 'warning' },
        in_progress: { text: '进行中', color: 'running' },
        paused: { text: '已暂停', color: 'maintenance' },
        completed: { text: '已完成', color: 'success' },
        cancelled: { text: '已取消', color: 'error' }
    },

    DELIVERY_STATUS_MAP: {
        pending: { text: '待发货', color: 'warning' },
        shipped: { text: '运输中', color: 'info' },
        signed: { text: '已签收', color: 'success' },
        returned: { text: '已退回', color: 'error' }
    },

    init() {
        const params = new URLSearchParams(location.hash.split('?')[1] || '');
        this.orderId = params.get('id');
        if (this.orderId) {
            this.loadOrder();
        } else {
            const container = document.getElementById('pageContainer');
            container.innerHTML = '<div class="empty-text">缺少订单ID参数</div>';
        }
    },

    destroy() {
    },

    async loadOrder() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            const res = await CustomerOrderService.getOrderById(this.orderId);
            if (res.code === 200) {
                this.order = res.data;
                this.render();
            } else {
                Toast.error(res.message || '加载订单失败');
            }
        } catch (error) {
            Toast.error('加载订单失败');
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

    render() {
        const container = document.getElementById('pageContainer');
        const o = this.order;
        if (!o) {
            container.innerHTML = '<div class="empty-text">订单不存在</div>';
            return;
        }

        const statusInfo = this.STATUS_MAP[o.status] || { text: o.status, color: 'info' };
        const completion = o.completion_rate !== undefined && o.completion_rate !== null ? o.completion_rate : 0;
        const completionPercent = Math.min(100, Math.max(0, completion * 100));
        const isDelayRisk = o.delay_risk;
        const amount = (o.quantity || 0) * (o.unit_price || 0);

        container.innerHTML = `
            <div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <button class="btn btn-outline" onclick="CustomerOrderDetailPage.goBack()">
                    ← 返回列表
                </button>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    ${this.renderActionButtons(o)}
                </div>
            </div>

            ${isDelayRisk ? this.renderDelayWarning() : ''}

            ${this.renderBasicInfo(o, statusInfo, amount)}

            ${this.renderCompletionCard(completionPercent)}

            ${this.renderProductionTasks(o.production_tasks || [])}

            ${this.renderDeliveries(o.deliveries || [])}
        `;
    },

    renderDelayWarning() {
        return `
            <div class="card" style="margin-bottom: 16px; border-left: 4px solid var(--danger-color); background: #fff5f5;">
                <div class="card-body" style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; color: var(--danger-color); font-weight: bold;">
                        <span style="font-size: 20px;">🔴</span>
                        <span>该订单存在延期风险，请及时关注生产进度和交期</span>
                    </div>
                </div>
            </div>
        `;
    },

    renderBasicInfo(o, statusInfo, amount) {
        return `
            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header">
                    <h3 class="card-title">订单基本信息</h3>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">订单号</div>
                            <div style="font-weight: 500;">${Validator.sanitize(o.order_no || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">订单状态</div>
                            <div><span class="status-badge ${statusInfo.color}">${statusInfo.text}</span></div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">交期</div>
                            <div style="font-weight: 500;">${o.delivery_date || '-'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">延期风险</div>
                            <div style="font-weight: 500; ${o.delay_risk ? 'color: var(--danger-color);' : ''}">
                                ${o.delay_risk ? '🔴 有风险' : '✅ 无风险'}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">客户</div>
                            <div style="font-weight: 500;">${Validator.sanitize(o.customer_name || o.customer?.customer_name || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">客户联系人</div>
                            <div style="font-weight: 500;">${Validator.sanitize(o.contact_person || o.customer?.contact_person || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">联系电话</div>
                            <div style="font-weight: 500;">${Validator.sanitize(o.contact_phone || o.customer?.contact_phone || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">产品名称</div>
                            <div style="font-weight: 500;">${Validator.sanitize(o.product_name || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">规格</div>
                            <div style="font-weight: 500;">${Validator.sanitize(o.specification || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">订单数量</div>
                            <div style="font-weight: 500;">${o.quantity || 0}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">单价</div>
                            <div style="font-weight: 500;">${Formatter.formatCurrency(o.unit_price || 0)}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">订单金额</div>
                            <div style="font-weight: bold; color: var(--primary-color);">${Formatter.formatCurrency(amount)}</div>
                        </div>
                    </div>
                    ${o.remark ? `
                    <div style="margin-top: 16px;">
                        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">备注</div>
                        <div>${Validator.sanitize(o.remark)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
    },

    renderCompletionCard(percent) {
        let color = 'var(--primary-color)';
        let bgColor = 'rgba(102, 126, 234, 0.1)';
        if (percent >= 100) {
            color = 'var(--success-color)';
            bgColor = 'rgba(40, 167, 69, 0.1)';
        } else if (percent < 30) {
            color = 'var(--warning-color)';
            bgColor = 'rgba(255, 193, 7, 0.1)';
        }

        return `
            <div class="card" style="margin-bottom: 16px;">
                <div class="card-body" style="padding: 24px;">
                    <div style="display: flex; align-items: center; gap: 32px; flex-wrap: wrap;">
                        <div style="text-align: center; padding: 24px; background: ${bgColor}; border-radius: 16px; min-width: 180px;">
                            <div style="font-size: 56px; font-weight: bold; color: ${color}; line-height: 1;">
                                ${percent.toFixed(0)}%
                            </div>
                            <div style="font-size: 14px; color: var(--text-secondary); margin-top: 8px;">完成率</div>
                        </div>
                        <div style="flex: 1; min-width: 200px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 14px; color: var(--text-secondary);">生产进度</span>
                                <span style="font-size: 14px; font-weight: 500;">${percent.toFixed(1)}%</span>
                            </div>
                            <div style="height: 12px; background: #e9ecef; border-radius: 6px; overflow: hidden;">
                                <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, ${color}, ${color}dd); transition: width 0.3s;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    renderProductionTasks(tasks) {
        const rows = tasks.length ? tasks.map(t => this.renderTaskRow(t)).join('') :
            '<tr><td colspan="8" class="empty-text">暂无关联生产任务</td></tr>';

        return `
            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header">
                    <h3 class="card-title">关联生产任务进度</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>任务编号</th>
                                <th>任务名称</th>
                                <th>状态</th>
                                <th>计划数量</th>
                                <th>已完成</th>
                                <th>进度</th>
                                <th>计划结束</th>
                                <th>实际结束</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderTaskRow(task) {
        const statusInfo = this.TASK_STATUS_MAP[task.status] || { text: task.status, color: 'info' };
        const progress = task.progress !== undefined && task.progress !== null ? task.progress :
            (task.quantity ? (task.completed_quantity || 0) / task.quantity * 100 : 0);
        const progressPercent = Math.min(100, Math.max(0, progress));
        let progressColor = 'var(--primary-color)';
        if (progressPercent >= 100) progressColor = 'var(--success-color)';
        else if (progressPercent < 30) progressColor = 'var(--warning-color)';

        return `
            <tr>
                <td>${Validator.sanitize(task.task_code || '-')}</td>
                <td>${Validator.sanitize(task.task_name || '-')}</td>
                <td><span class="status-badge ${statusInfo.color}">${statusInfo.text}</span></td>
                <td>${task.quantity || 0}</td>
                <td>${task.completed_quantity || 0}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="flex: 1; height: 8px; background: #e9ecef; border-radius: 4px; overflow: hidden; min-width: 80px;">
                            <div style="width: ${progressPercent}%; height: 100%; background: ${progressColor}; transition: width 0.3s;"></div>
                        </div>
                        <span style="font-size: 12px; color: var(--text-secondary); white-space: nowrap;">${progressPercent.toFixed(0)}%</span>
                    </div>
                </td>
                <td>${task.planned_end_time || task.end_time || '-'}</td>
                <td>${task.actual_end_time || '-'}</td>
            </tr>
        `;
    },

    renderDeliveries(deliveries) {
        const rows = deliveries.length ? deliveries.map(d => this.renderDeliveryRow(d)).join('') :
            '<tr><td colspan="7" class="empty-text">暂无发货记录</td></tr>';

        return `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">发货记录</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>发货单号</th>
                                <th>发货数量</th>
                                <th>物流单号</th>
                                <th>发货时间</th>
                                <th>签收状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderDeliveryRow(delivery) {
        const statusInfo = this.DELIVERY_STATUS_MAP[delivery.sign_status || delivery.status] ||
            { text: delivery.sign_status || delivery.status || '-', color: 'info' };

        return `
            <tr>
                <td>${Validator.sanitize(delivery.delivery_no || '-')}</td>
                <td>${delivery.shipped_quantity || delivery.quantity || 0}</td>
                <td>${Validator.sanitize(delivery.tracking_no || '-')}</td>
                <td>${delivery.delivery_time || delivery.shipped_time || delivery.created_at || '-'}</td>
                <td><span class="status-badge ${statusInfo.color}">${statusInfo.text}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="CustomerOrderDetailPage.showEditDeliveryStatusModal(${delivery.id}, '${delivery.sign_status || delivery.status || ''}')">
                        编辑签收
                    </button>
                </td>
            </tr>
        `;
    },

    renderActionButtons(o) {
        const buttons = [];

        if (o.status === 'pending') {
            buttons.push(`<button class="btn btn-success" onclick="CustomerOrderDetailPage.approveOrder()">审核</button>`);
        }

        if (o.status === 'approved' || o.status === 'in_production') {
            buttons.push(`<button class="btn btn-primary" onclick="CustomerOrderDetailPage.showSplitOrderModal()">拆单</button>`);
        }

        if (o.status === 'in_production' || o.status === 'partial_shipped' || o.status === 'approved') {
            buttons.push(`<button class="btn btn-info" onclick="CustomerOrderDetailPage.showDeliveryModal()">发货</button>`);
        }

        if (o.status === 'pending' || o.status === 'approved' || o.status === 'in_production') {
            buttons.push(`<button class="btn btn-warning" onclick="CustomerOrderDetailPage.cancelOrder()">取消订单</button>`);
        }

        return buttons.join('');
    },

    goBack() {
        App.navigate('customer-orders');
    },

    async approveOrder() {
        const confirmed = await Modal.confirm('确定要审核该订单吗？');
        if (!confirmed) return;

        try {
            const res = await CustomerOrderService.approveOrder(this.orderId);
            if (res.code === 200) {
                Toast.success('审核成功');
                await this.loadOrder();
            } else {
                Toast.error(res.message || '审核失败');
            }
        } catch (e) {
            Toast.error('审核失败');
            console.error(e);
        }
    },

    async cancelOrder() {
        const confirmed = await Modal.confirm('确定要取消该订单吗？此操作不可撤销。');
        if (!confirmed) return;

        try {
            const res = await CustomerOrderService.cancelOrder(this.orderId);
            if (res.code === 200) {
                Toast.success('取消成功');
                await this.loadOrder();
            } else {
                Toast.error(res.message || '取消失败');
            }
        } catch (e) {
            Toast.error('取消失败');
            console.error(e);
        }
    },

    showSplitOrderModal() {
        const o = this.order;
        if (!o) return;

        const content = `
            <form id="splitForm">
                <div class="form-group">
                    <label>产品名称</label>
                    <input type="text" class="form-control" value="${Validator.sanitize(o.product_name || '')}" disabled>
                </div>
                <div class="form-group">
                    <label>规格</label>
                    <input type="text" class="form-control" value="${Validator.sanitize(o.specification || '')}" disabled>
                </div>
                <div class="form-group">
                    <label>拆单数量 *</label>
                    <input type="number" class="form-control" name="quantity" required min="1" max="${o.quantity || 0}" step="1" placeholder="最多 ${o.quantity || 0}">
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
                    const res = await CustomerOrderService.splitOrder(this.orderId, data);
                    if (res.code === 201 || res.code === 200) {
                        Toast.success('拆单成功，生产任务已创建');
                        modal.close();
                        await this.loadOrder();
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

    showDeliveryModal() {
        const o = this.order;
        if (!o) return;

        const content = `
            <form id="deliveryForm">
                <div class="form-group">
                    <label>订单号</label>
                    <input type="text" class="form-control" value="${Validator.sanitize(o.order_no || '')}" disabled>
                </div>
                <div class="form-group">
                    <label>发货单号 *</label>
                    <input type="text" class="form-control" name="delivery_no" required>
                </div>
                <div class="form-group">
                    <label>发货数量 *</label>
                    <input type="number" class="form-control" name="shipped_quantity" required min="1" max="${o.quantity || 0}" step="1" placeholder="最多 ${o.quantity || 0}">
                </div>
                <div class="form-group">
                    <label>物流单号</label>
                    <input type="text" class="form-control" name="tracking_no">
                </div>
                <div class="form-group">
                    <label>发货时间</label>
                    <input type="datetime-local" class="form-control" name="delivery_time">
                </div>
                <div class="form-group">
                    <label>签收状态</label>
                    <select class="form-control" name="sign_status">
                        <option value="pending">待发货</option>
                        <option value="shipped">运输中</option>
                        <option value="signed">已签收</option>
                        <option value="returned">已退回</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="2"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '发货',
            content: content,
            width: '500px',
            confirmText: '确认发货',
            onConfirm: async () => {
                const form = document.getElementById('deliveryForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.order_id = this.orderId;

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.createDelivery(data);
                    if (res.code === 201 || res.code === 200) {
                        Toast.success('发货成功');
                        modal.close();
                        await this.loadOrder();
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
    },

    showEditDeliveryStatusModal(deliveryId, currentStatus) {
        const content = `
            <form id="editDeliveryStatusForm">
                <div class="form-group">
                    <label>签收状态 *</label>
                    <select class="form-control" name="sign_status" required>
                        <option value="pending" ${currentStatus === 'pending' ? 'selected' : ''}>待发货</option>
                        <option value="shipped" ${currentStatus === 'shipped' ? 'selected' : ''}>运输中</option>
                        <option value="signed" ${currentStatus === 'signed' ? 'selected' : ''}>已签收</option>
                        <option value="returned" ${currentStatus === 'returned' ? 'selected' : ''}>已退回</option>
                    </select>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑签收状态',
            content: content,
            width: '400px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('editDeliveryStatusForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.updateDelivery(deliveryId, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        await this.loadOrder();
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
    }
};

window.CustomerOrderDetailPage = CustomerOrderDetailPage;
