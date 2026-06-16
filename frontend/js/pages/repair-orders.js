/**
 * 维修工单页面 - Kanban看板
 */
const RepairOrdersPage = {
    orders: [],
    statistics: null,
    equipments: [],
    draggedOrder: null,

    init() {
        this.render();
        this.loadEquipments();
        this.loadStatistics();
        this.loadOrders();
    },

    async loadEquipments() {
        try {
            const response = await ProductionService.getEquipments({ size: 100 });
            if (response.code === 200) {
                this.equipments = response.data.items || [];
            }
        } catch (e) {
            console.error('加载设备列表失败', e);
        }
    },

    async loadStatistics() {
        try {
            const response = await RepairService.getStatistics();
            if (response.code === 200) {
                this.statistics = response.data;
                this.renderStatistics();
            }
        } catch (e) {
            console.error('加载统计失败', e);
        }
    },

    async loadOrders() {
        try {
            const response = await RepairService.getOrders({ size: 100 });
            if (response.code === 200) {
                this.orders = response.data.items || [];
                this.renderKanban();
            }
        } catch (e) {
            Toast.error('加载工单列表失败');
        }
    },

    renderStatistics() {
        const stats = this.statistics || {};
        const byStatus = stats.by_status || {};
        const container = document.getElementById('repairStats');
        if (!container) return;

        const statusOrder = ['pending', 'dispatched', 'repairing', 'repaired', 'accepted', 'closed'];
        const html = statusOrder.map(status => `
            <div class="stat-card" style="background: rgba(23,162,184,0.08);">
                <div class="stat-card-title" style="color: var(--text-secondary);">${RepairService.STATUS_LABELS[status]}</div>
                <div class="stat-card-value" style="color: var(--info-color);">${byStatus[status] || 0}</div>
            </div>
        `).join('');
        container.innerHTML = html;
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">维修工单</h3>
                    <div class="card-actions">
                        <button class="btn btn-primary" id="createOrderBtn">
                            <span>+ 新建报修单</span>
                        </button>
                        <button class="btn btn-outline" id="refreshOrdersBtn" style="margin-left: 8px;">
                            <span>刷新</span>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="toolbar" style="margin-bottom: 16px;">
                        <div class="toolbar-left">
                            <select class="form-control" id="filterStatus" style="width: 130px;">
                                <option value="">全部状态</option>
                                <option value="pending">待派工</option>
                                <option value="dispatched">已派工</option>
                                <option value="repairing">维修中</option>
                                <option value="repaired">已修复</option>
                                <option value="accepted">已验收</option>
                                <option value="closed">已关闭</option>
                            </select>
                            <select class="form-control" id="filterSeverity" style="width: 110px; margin-left: 8px;">
                                <option value="">全部严重度</option>
                                <option value="low">低</option>
                                <option value="medium">中</option>
                                <option value="high">高</option>
                                <option value="critical">紧急</option>
                            </select>
                            <input type="text" class="form-control" id="filterKeyword"
                                   placeholder="搜索工单号/描述/报修人..."
                                   style="width: 240px; margin-left: 8px;">
                        </div>
                    </div>

                    <div id="repairStats" class="grid grid-6" style="margin-bottom: 20px;">
                    </div>

                    <div id="kanbanBoard" style="min-height: 500px;">
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('createOrderBtn')?.addEventListener('click', () => this.showCreateModal());
        document.getElementById('refreshOrdersBtn')?.addEventListener('click', () => {
            this.loadStatistics();
            this.loadOrders();
        });
        document.getElementById('filterStatus')?.addEventListener('change', () => this.applyFilter());
        document.getElementById('filterSeverity')?.addEventListener('change', () => this.applyFilter());
        document.getElementById('filterKeyword')?.addEventListener('input', () => this.applyFilter());
    },

    applyFilter() {
        const status = document.getElementById('filterStatus')?.value;
        const severity = document.getElementById('filterSeverity')?.value;
        const keyword = document.getElementById('filterKeyword')?.value?.toLowerCase() || '';

        let filtered = this.orders;
        if (status) filtered = filtered.filter(o => o.status === status);
        if (severity) filtered = filtered.filter(o => o.severity === severity);
        if (keyword) {
            filtered = filtered.filter(o =>
                (o.order_code || '').toLowerCase().includes(keyword) ||
                (o.fault_description || '').toLowerCase().includes(keyword) ||
                (o.reporter || '').toLowerCase().includes(keyword)
            );
        }
        this.renderKanban(filtered);
    },

    renderKanban(orders = null) {
        const board = document.getElementById('kanbanBoard');
        if (!board) return;

        const orderList = orders !== null ? orders : this.orders;
        const columns = [
            { key: 'pending', label: '待派工', next: ['dispatched', 'closed'] },
            { key: 'dispatched', label: '已派工', next: ['repairing', 'closed'] },
            { key: 'repairing', label: '维修中', next: ['repaired', 'closed'] },
            { key: 'repaired', label: '已修复', next: ['accepted', 'repairing', 'closed'] },
            { key: 'accepted', label: '已验收', next: ['closed'] },
            { key: 'closed', label: '已关闭', next: [] }
        ];

        const columnColors = {
            pending: '#ffc107',
            dispatched: '#17a2b8',
            repairing: '#007bff',
            repaired: '#28a745',
            accepted: '#28a745',
            closed: '#6c757d'
        };

        board.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px;">
                ${columns.map(col => {
                    const colOrders = orderList.filter(o => o.status === col.key);
                    return `
                        <div class="kanban-column" data-status="${col.key}"
                             style="background: var(--bg-light); border-radius: var(--radius-md); padding: 12px; min-height: 400px;
                                    border-top: 3px solid ${columnColors[col.key]};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                                <h4 style="margin: 0; font-size: 14px;">${col.label}</h4>
                                <span class="badge badge-info">${colOrders.length}</span>
                            </div>
                            <div class="kanban-cards" data-status="${col.key}"
                                 style="min-height: 350px; display: flex; flex-direction: column; gap: 10px;">
                                ${colOrders.map(o => this.renderCard(o)).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.bindDragEvents();
    },

    renderCard(order) {
        const severityColor = RepairService.SEVERITY_COLORS[order.severity] || '#6c757d';
        const severityText = RepairService.SEVERITY_LABELS[order.severity] || order.severity;
        const equipment = this.equipments.find(e => e.id === order.equipment_id);
        const equipmentName = order.equipment_name || (equipment ? equipment.equipment_name : '未知设备');

        return `
            <div class="kanban-card" draggable="true" data-id="${order.id}"
                 style="background: white; border-radius: var(--radius-sm); padding: 12px;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: grab; border-left: 3px solid ${severityColor};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <span style="font-size: 12px; color: var(--text-secondary); font-family: monospace;">${order.order_code}</span>
                    <span class="badge" style="background: ${severityColor}20; color: ${severityColor}; font-size: 11px;">${severityText}</span>
                </div>
                <div style="font-weight: 600; margin-bottom: 6px; font-size: 13px;">${equipmentName}</div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.4;
                            overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">
                    ${order.fault_description || '-'}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                    <span>👤 ${order.reporter || '-'}</span>
                    <span>${this.formatTime(order.create_time)}</span>
                </div>
                <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
                    <button class="btn btn-xs btn-outline" onclick="RepairOrdersPage.showDetail(${order.id})">详情</button>
                    ${this.renderCardActions(order)}
                </div>
            </div>
        `;
    },

    renderCardActions(order) {
        const actions = [];
        switch (order.status) {
            case 'pending':
                actions.push(`<button class="btn btn-xs btn-primary" onclick="RepairOrdersPage.showDispatchModal(${order.id})">派工</button>`);
                break;
            case 'dispatched':
                actions.push(`<button class="btn btn-xs btn-primary" onclick="RepairOrdersPage.startRepair(${order.id})">开始维修</button>`);
                break;
            case 'repairing':
                actions.push(`<button class="btn btn-xs btn-success" onclick="RepairOrdersPage.showProcessModal(${order.id})">维修记录</button>`);
                actions.push(`<button class="btn btn-xs btn-primary" onclick="RepairOrdersPage.completeRepair(${order.id})">完成维修</button>`);
                break;
            case 'repaired':
                actions.push(`<button class="btn btn-xs btn-success" onclick="RepairOrdersPage.showAcceptModal(${order.id})">验收</button>`);
                break;
            case 'accepted':
                actions.push(`<button class="btn btn-xs btn-secondary" onclick="RepairOrdersPage.closeOrder(${order.id})">关闭</button>`);
                break;
        }
        if (order.status !== 'closed') {
            actions.push(`<button class="btn btn-xs btn-outline" onclick="RepairOrdersPage.tryClose(${order.id})">关闭</button>`);
        }
        return actions.join('');
    },

    bindDragEvents() {
        document.querySelectorAll('.kanban-card').forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.draggedOrder = parseInt(card.dataset.id);
                card.style.opacity = '0.5';
                e.dataTransfer.effectAllowed = 'move';
            });
            card.addEventListener('dragend', (e) => {
                card.style.opacity = '1';
                this.draggedOrder = null;
                document.querySelectorAll('.kanban-cards').forEach(col => {
                    col.style.background = '';
                });
            });
        });

        document.querySelectorAll('.kanban-cards').forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.style.background = 'rgba(0,123,255,0.08)';
            });
            zone.addEventListener('dragleave', () => {
                zone.style.background = '';
            });
            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                zone.style.background = '';
                const targetStatus = zone.dataset.status;
                if (this.draggedOrder) {
                    this.tryTransition(this.draggedOrder, targetStatus);
                }
            });
        });
    },

    async tryTransition(orderId, targetStatus) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const validTransitions = {
            pending: ['dispatched', 'closed'],
            dispatched: ['repairing', 'closed'],
            repairing: ['repaired', 'closed'],
            repaired: ['accepted', 'repairing', 'closed'],
            accepted: ['closed'],
            closed: []
        };

        if (!validTransitions[order.status]?.includes(targetStatus)) {
            Toast.show(`不能从「${RepairService.STATUS_LABELS[order.status]}」拖到「${RepairService.STATUS_LABELS[targetStatus]}」`, 'warning');
            return;
        }

        if (targetStatus === 'dispatched') {
            this.showDispatchModal(orderId);
        } else if (targetStatus === 'repairing') {
            this.startRepair(orderId);
        } else if (targetStatus === 'repaired') {
            this.completeRepair(orderId);
        } else if (targetStatus === 'accepted') {
            this.showAcceptModal(orderId);
        } else if (targetStatus === 'closed') {
            this.tryClose(orderId);
        }
    },

    formatTime(timeStr) {
        if (!timeStr) return '-';
        try {
            const date = new Date(timeStr);
            return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        } catch {
            return timeStr;
        }
    },

    showCreateModal(prefill = {}) {
        const equipmentOptions = this.equipments.map(e =>
            `<option value="${e.id}" ${prefill.equipment_id == e.id ? 'selected' : ''}>${e.equipment_code} - ${e.equipment_name}</option>`
        ).join('');

        const currentUser = AuthService.getCurrentUser();

        const modalHtml = `
            <div class="form-group">
                <label>设备 <span style="color: red;">*</span></label>
                <select class="form-control" name="equipment_id" required>
                    <option value="">请选择设备</option>
                    ${equipmentOptions}
                </select>
            </div>
            <div class="form-group">
                <label>报修人 <span style="color: red;">*</span></label>
                <input type="text" class="form-control" name="reporter" required
                       value="${prefill.reporter || (currentUser ? currentUser.username : '') || ''}"
                       placeholder="请输入报修人">
            </div>
            <div class="form-group">
                <label>故障描述 <span style="color: red;">*</span></label>
                <textarea class="form-control" name="fault_description" required rows="3"
                          placeholder="请详细描述故障现象">${prefill.fault_description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>严重程度</label>
                <select class="form-control" name="severity">
                    <option value="low">低</option>
                    <option value="medium" selected>中</option>
                    <option value="high">高</option>
                    <option value="critical">紧急</option>
                </select>
            </div>
            <div class="form-group">
                <label>附件图片</label>
                <div id="imagePreviewArea" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;"></div>
                <input type="file" class="form-control" id="imageUploader" accept="image/*" multiple>
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea class="form-control" name="remark" rows="2" placeholder="可选"></textarea>
            </div>
            ${prefill.alert_id ? `<input type="hidden" name="alert_id" value="${prefill.alert_id}">` : ''}
        `;

        const modal = new Modal({
            title: '新建报修单',
            content: modalHtml,
            width: '600px',
            confirmText: '提交报修',
            onConfirm: () => {
                const form = modal.modal.querySelector('.modal-body');
                const equipment_id = form.querySelector('[name=equipment_id]').value;
                const reporter = form.querySelector('[name=reporter]').value;
                const fault_description = form.querySelector('[name=fault_description]').value;
                const severity = form.querySelector('[name=severity]').value;
                const remark = form.querySelector('[name=remark]')?.value;
                const alert_id = form.querySelector('[name=alert_id]')?.value;

                if (!equipment_id || !reporter || !fault_description) {
                    Toast.show('请填写必填项', 'warning');
                    return false;
                }

                const images = [];
                form.querySelectorAll('#imagePreviewArea img').forEach(img => {
                    images.push(img.src);
                });

                modal.setLoading(true);
                RepairService.createOrder({
                    equipment_id: parseInt(equipment_id),
                    reporter,
                    fault_description,
                    severity,
                    attachment_images: images,
                    remark,
                    alert_id: alert_id ? parseInt(alert_id) : undefined
                }).then(resp => {
                    modal.setLoading(false);
                    if (resp.code === 200 || resp.code === 201) {
                        Toast.success('报修单创建成功');
                        modal.close();
                        this.loadStatistics();
                        this.loadOrders();
                    } else {
                        Toast.error(resp.message || '创建失败');
                    }
                }).catch(() => {
                    modal.setLoading(false);
                    Toast.error('创建失败');
                });
                return false;
            }
        }).show();

        const uploader = modal.modal.querySelector('#imageUploader');
        uploader?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            const previewArea = modal.modal.querySelector('#imagePreviewArea');
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = 'position:relative;width:80px;height:80px;border-radius:4px;overflow:hidden;';
                    wrapper.innerHTML = `
                        <img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">
                        <button type="button" style="position:absolute;top:0;right:0;background:rgba(0,0,0,0.6);color:white;
                            border:none;width:20px;height:20px;cursor:pointer;font-size:12px;">×</button>
                    `;
                    wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
                    previewArea.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            });
            uploader.value = '';
        });
    },

    async showDetail(orderId) {
        try {
            const response = await RepairService.getOrder(orderId);
            if (response.code !== 200) {
                Toast.error(response.message || '获取详情失败');
                return;
            }
            const order = response.data;
            const severityColor = RepairService.SEVERITY_COLORS[order.severity] || '#6c757d';
            const severityText = RepairService.SEVERITY_LABELS[order.severity] || order.severity;

            const dispatches = (order.dispatches || []).map(d => `
                <tr>
                    <td>${d.repairer || '-'}</td>
                    <td>${this.formatTime(d.planned_start_time)}</td>
                    <td>${this.formatTime(d.planned_end_time)}</td>
                    <td>${d.dispatcher || '-'}</td>
                    <td>${this.formatTime(d.create_time)}</td>
                </tr>
            `).join('') || '<tr><td colspan="5" style="text-align:center;">暂无派工记录</td></tr>';

            const processes = (order.processes || []).map((p, idx) => `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${p.step_description || '-'}</td>
                    <td>${(p.materials_used || []).map(m => m.name || m).join('、') || '-'}</td>
                    <td>${p.minutes_spent || 0} 分钟</td>
                    <td>${p.recorder || '-'}</td>
                    <td>${this.formatTime(p.create_time)}</td>
                </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;">暂无维修记录</td></tr>';

            const acceptances = (order.acceptances || []).map(a => `
                <tr>
                    <td>${a.acceptor || '-'}</td>
                    <td><span class="badge ${a.is_passed ? 'badge-success' : 'badge-danger'}">${a.is_passed ? '合格' : '不合格'}</span></td>
                    <td>${a.remark || '-'}</td>
                    <td>${this.formatTime(a.create_time)}</td>
                </tr>
            `).join('') || '<tr><td colspan="4" style="text-align:center;">暂无验收记录</td></tr>';

            const images = (order.attachment_images || []).map(src =>
                `<img src="${src}" style="width:100px;height:100px;object-fit:cover;border-radius:4px;margin-right:8px;">`
            ).join('');

            await Modal.alert(`
                <div class="detail-section">
                    <h4>基本信息</h4>
                    <table class="detail-table">
                        <tr><td>工单编号</td><td>${order.order_code}</td></tr>
                        <tr><td>设备</td><td>${order.equipment_name || order.equipment_code || '-'}</td></tr>
                        <tr><td>报修人</td><td>${order.reporter || '-'}</td></tr>
                        <tr><td>状态</td><td><span class="status-badge" style="background:${severityColor}20;color:${severityColor};">${RepairService.STATUS_LABELS[order.status]}</span></td></tr>
                        <tr><td>严重程度</td><td><span style="color:${severityColor};">● ${severityText}</span></td></tr>
                        <tr><td>创建时间</td><td>${this.formatTime(order.create_time)}</td></tr>
                        <tr><td>故障描述</td><td>${order.fault_description || '-'}</td></tr>
                        <tr><td>累计耗时</td><td>${order.total_minutes || 0} 分钟</td></tr>
                        ${order.remark ? `<tr><td>备注</td><td>${order.remark}</td></tr>` : ''}
                    </table>
                </div>
                ${images ? `
                <div class="detail-section" style="margin-top:16px;">
                    <h4>附件图片</h4>
                    <div style="display:flex;flex-wrap:wrap;">${images}</div>
                </div>` : ''}
                <div class="detail-section" style="margin-top:16px;">
                    <h4>派工记录</h4>
                    <table class="data-table">
                        <thead><tr><th>维修人</th><th>计划开始</th><th>计划完成</th><th>派工人</th><th>派工时间</th></tr></thead>
                        <tbody>${dispatches}</tbody>
                    </table>
                </div>
                <div class="detail-section" style="margin-top:16px;">
                    <h4>维修过程</h4>
                    <table class="data-table">
                        <thead><tr><th>步骤</th><th>描述</th><th>耗材</th><th>耗时</th><th>记录人</th><th>时间</th></tr></thead>
                        <tbody>${processes}</tbody>
                    </table>
                </div>
                <div class="detail-section" style="margin-top:16px;">
                    <h4>验收记录</h4>
                    <table class="data-table">
                        <thead><tr><th>验收人</th><th>结果</th><th>备注</th><th>时间</th></tr></thead>
                        <tbody>${acceptances}</tbody>
                    </table>
                </div>
            `, { title: '工单详情', width: '800px' });
        } catch (e) {
            console.error(e);
            Toast.error('获取详情失败');
        }
    },

    showDispatchModal(orderId) {
        const currentUser = AuthService.getCurrentUser();
        const modalHtml = `
            <div class="form-group">
                <label>维修人 <span style="color: red;">*</span></label>
                <input type="text" class="form-control" name="repairer" required placeholder="请输入维修人姓名">
            </div>
            <div class="form-group">
                <label>计划开始时间</label>
                <input type="datetime-local" class="form-control" name="planned_start_time">
            </div>
            <div class="form-group">
                <label>计划完成时间</label>
                <input type="datetime-local" class="form-control" name="planned_end_time">
            </div>
            <div class="form-group">
                <label>派工人</label>
                <input type="text" class="form-control" name="dispatcher" value="${currentUser ? currentUser.username : ''}" placeholder="请输入派工人">
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea class="form-control" name="remark" rows="2"></textarea>
            </div>
        `;

        const modal = new Modal({
            title: '派工',
            content: modalHtml,
            width: '500px',
            confirmText: '确认派工',
            onConfirm: () => {
                const form = modal.modal.querySelector('.modal-body');
                const repairer = form.querySelector('[name=repairer]').value;
                const planned_start_time = form.querySelector('[name=planned_start_time]').value;
                const planned_end_time = form.querySelector('[name=planned_end_time]').value;
                const dispatcher = form.querySelector('[name=dispatcher]').value;
                const remark = form.querySelector('[name=remark]').value;

                if (!repairer) {
                    Toast.show('请填写维修人', 'warning');
                    return false;
                }

                modal.setLoading(true);
                RepairService.dispatchOrder(orderId, {
                    repairer,
                    planned_start_time: planned_start_time ? planned_start_time.replace('T', ' ') + ':00' : undefined,
                    planned_end_time: planned_end_time ? planned_end_time.replace('T', ' ') + ':00' : undefined,
                    dispatcher,
                    remark
                }).then(resp => {
                    modal.setLoading(false);
                    if (resp.code === 200) {
                        Toast.success('派工成功');
                        modal.close();
                        this.loadStatistics();
                        this.loadOrders();
                    } else {
                        Toast.error(resp.message || '派工失败');
                    }
                }).catch(() => {
                    modal.setLoading(false);
                    Toast.error('派工失败');
                });
                return false;
            }
        }).show();
    },

    async startRepair(orderId) {
        const confirmed = await Modal.confirm('确定开始维修吗？');
        if (!confirmed) return;
        try {
            const resp = await RepairService.startRepair(orderId);
            if (resp.code === 200) {
                Toast.success('已开始维修');
                this.loadStatistics();
                this.loadOrders();
            } else {
                Toast.error(resp.message || '操作失败');
            }
        } catch {
            Toast.error('操作失败');
        }
    },

    showProcessModal(orderId) {
        const loadAndShow = async () => {
            const resp = await RepairService.getOrder(orderId);
            if (resp.code !== 200) {
                Toast.error('加载工单详情失败');
                return;
            }
            const order = resp.data;
            const currentUser = AuthService.getCurrentUser();
            let stepCounter = (order.processes || []).length;

            const renderProcesses = () => {
                const list = order.processes || [];
                if (list.length === 0) {
                    return '<div style="text-align:center;color:var(--text-secondary);padding:20px;">暂无维修记录</div>';
                }
                return list.map((p, idx) => `
                    <div style="border:1px solid var(--border-color);border-radius:6px;padding:12px;margin-bottom:10px;background:var(--bg-light);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <strong>步骤 ${idx + 1}</strong>
                            <span style="font-size:12px;color:var(--text-secondary);">${this.formatTime(p.create_time)} · ${p.recorder || '-'}</span>
                        </div>
                        <div style="margin-bottom:6px;">${p.step_description}</div>
                        <div style="font-size:12px;color:var(--text-secondary);">
                            ${(p.materials_used || []).length ? `耗材：${(p.materials_used || []).map(m => m.name || m).join('、')}  ` : ''}
                            耗时：${p.minutes_spent || 0} 分钟
                        </div>
                    </div>
                `).join('');
            };

            const modalHtml = `
                <div style="margin-bottom:16px;">
                    <h5 style="margin:0 0 12px 0;">维修记录</h5>
                    <div id="processListContainer" style="max-height:280px;overflow-y:auto;margin-bottom:16px;">
                        ${renderProcesses()}
                    </div>
                </div>
                <hr style="margin:16px 0;">
                <div>
                    <h5 style="margin:0 0 12px 0;">添加新步骤</h5>
                    <div class="form-group">
                        <label>步骤描述 <span style="color: red;">*</span></label>
                        <textarea class="form-control" name="step_description" rows="2" placeholder="请描述这一步做了什么"></textarea>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div class="form-group">
                            <label>使用耗材</label>
                            <textarea class="form-control" name="materials_used" rows="2" placeholder="多个用逗号分隔，如: 螺丝x2, 密封圈x1"></textarea>
                        </div>
                        <div class="form-group">
                            <label>耗时(分钟)</label>
                            <input type="number" class="form-control" name="minutes_spent" min="0" value="0">
                        </div>
                    </div>
                    <div class="form-group">
                        <label>记录人</label>
                        <input type="text" class="form-control" name="recorder" value="${currentUser ? currentUser.username : ''}">
                    </div>
                    <div style="text-align:right;">
                        <button class="btn btn-primary" id="addProcessBtn">添加记录</button>
                    </div>
                </div>
            `;

            const modal = new Modal({
                title: '维修过程记录',
                content: modalHtml,
                width: '600px',
                showFooter: false
            }).show();

            modal.modal.querySelector('#addProcessBtn')?.addEventListener('click', async () => {
                const form = modal.modal;
                const step_description = form.querySelector('[name=step_description]').value;
                const materials_text = form.querySelector('[name=materials_used]').value;
                const minutes_spent = parseInt(form.querySelector('[name=minutes_spent]').value || '0');
                const recorder = form.querySelector('[name=recorder]').value;

                if (!step_description) {
                    Toast.show('请填写步骤描述', 'warning');
                    return;
                }

                let materials_used = [];
                if (materials_text) {
                    materials_used = materials_text.split(/[,，]/).map(s => s.trim()).filter(Boolean).map(name => ({ name }));
                }

                try {
                    const resp = await RepairService.addProcess(orderId, {
                        step_description,
                        materials_used,
                        minutes_spent,
                        recorder
                    });
                    if (resp.code === 200) {
                        Toast.success('记录添加成功');
                        const detailResp = await RepairService.getOrder(orderId);
                        if (detailResp.code === 200) {
                            order.processes = detailResp.data.processes || [];
                        }
                        modal.modal.querySelector('#processListContainer').innerHTML = renderProcesses();
                        form.querySelector('[name=step_description]').value = '';
                        form.querySelector('[name=materials_used]').value = '';
                        form.querySelector('[name=minutes_spent]').value = '0';
                        this.loadStatistics();
                        this.loadOrders();
                    } else {
                        Toast.error(resp.message || '添加失败');
                    }
                } catch {
                    Toast.error('添加失败');
                }
            });
        };
        loadAndShow();
    },

    async completeRepair(orderId) {
        const confirmed = await Modal.confirm('确定维修已完成？完成后进入待验收状态。');
        if (!confirmed) return;
        try {
            const resp = await RepairService.completeRepair(orderId);
            if (resp.code === 200) {
                Toast.success('维修完成，等待验收');
                this.loadStatistics();
                this.loadOrders();
            } else {
                Toast.error(resp.message || '操作失败');
            }
        } catch {
            Toast.error('操作失败');
        }
    },

    showAcceptModal(orderId) {
        const currentUser = AuthService.getCurrentUser();
        const modalHtml = `
            <div class="form-group">
                <label>验收人 <span style="color: red;">*</span></label>
                <input type="text" class="form-control" name="acceptor" required value="${currentUser ? currentUser.username : ''}">
            </div>
            <div class="form-group">
                <label>验收结果 <span style="color: red;">*</span></label>
                <select class="form-control" name="is_passed">
                    <option value="true">合格</option>
                    <option value="false">不合格（需重新维修）</option>
                </select>
            </div>
            <div class="form-group">
                <label>验收备注</label>
                <textarea class="form-control" name="remark" rows="3" placeholder="请填写验收意见"></textarea>
            </div>
        `;

        const modal = new Modal({
            title: '工单验收',
            content: modalHtml,
            width: '500px',
            confirmText: '提交验收',
            onConfirm: () => {
                const form = modal.modal.querySelector('.modal-body');
                const acceptor = form.querySelector('[name=acceptor]').value;
                const is_passed = form.querySelector('[name=is_passed]').value === 'true';
                const remark = form.querySelector('[name=remark]').value;

                if (!acceptor) {
                    Toast.show('请填写验收人', 'warning');
                    return false;
                }

                modal.setLoading(true);
                RepairService.acceptOrder(orderId, { acceptor, is_passed, remark })
                    .then(resp => {
                        modal.setLoading(false);
                        if (resp.code === 200) {
                            Toast.success(is_passed ? '验收通过' : '验收未通过，返回维修中');
                            modal.close();
                            this.loadStatistics();
                            this.loadOrders();
                        } else {
                            Toast.error(resp.message || '验收失败');
                        }
                    })
                    .catch(() => {
                        modal.setLoading(false);
                        Toast.error('验收失败');
                    });
                return false;
            }
        }).show();
    },

    async tryClose(orderId) {
        const confirmed = await Modal.confirm('确定关闭此工单吗？关闭后设备状态若为error将自动切回idle。');
        if (!confirmed) return;
        try {
            const resp = await RepairService.closeOrder(orderId);
            if (resp.code === 200) {
                Toast.success('工单已关闭');
                this.loadStatistics();
                this.loadOrders();
            } else {
                Toast.error(resp.message || '操作失败');
            }
        } catch {
            Toast.error('操作失败');
        }
    },

    async closeOrder(orderId) {
        await this.tryClose(orderId);
    }
};

window.RepairOrdersPage = RepairOrdersPage;
