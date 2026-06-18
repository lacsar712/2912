/**
 * 巡检路线管理页面
 */
const PatrolRoutesPage = {
    routes: [],
    equipments: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    editingRoute: null,
    checkpoints: [],
    draggedIndex: null,

    init() {
        this.loadEquipments();
        this.loadRoutes();
    },

    async loadEquipments() {
        try {
            const response = await ProductionService.getEquipments({ size: 100 });
            if (response.code === 200) {
                this.equipments = response.data.items || [];
            }
        } catch (error) {
            console.error('加载设备列表失败:', error);
        }
    },

    async loadRoutes() {
        try {
            const response = await PatrolService.getRoutes({
                page: this.currentPage,
                size: this.pageSize
            });
            if (response.code === 200) {
                this.routes = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载路线列表失败');
        }
    },

    renderSubNav() {
        return `
            <div class="tab-nav">
                <div class="tab-item active" data-page="patrol-routes" onclick="App.navigate('patrol-routes')">路线管理</div>
                <div class="tab-item" data-page="patrol-plans" onclick="App.navigate('patrol-plans')">计划管理</div>
                <div class="tab-item" data-page="patrol-tasks" onclick="App.navigate('patrol-tasks')">任务列表</div>
                <div class="tab-item" data-page="patrol-reports" onclick="App.navigate('patrol-reports')">巡检报表</div>
            </div>
        `;
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">巡检路线管理</h3>
                    <button class="btn btn-primary" onclick="PatrolRoutesPage.showAddModal()">
                        <span class="btn-icon">+</span> 新建路线
                    </button>
                </div>
                <div class="card-body">
                    <div id="routeTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
    },

    renderTable() {
        const tableContainer = document.getElementById('routeTable');
        if (!this.routes || this.routes.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无路线数据</p>';
            return;
        }

        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>路线编号</th>
                            <th>路线名称</th>
                            <th>检查点数</th>
                            <th>预计时长</th>
                            <th>状态</th>
                            <th>创建时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.routes.map(r => this.renderRow(r)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(route) {
        const statusText = route.status === 'active' ? '启用' : '停用';
        const statusClass = route.status === 'active' ? 'badge-success' : 'badge-secondary';

        return `
            <tr>
                <td>${Validator.sanitize(route.route_code)}</td>
                <td>${Validator.sanitize(route.route_name)}</td>
                <td><span class="badge badge-primary">${route.checkpoint_count || 0}</span></td>
                <td>${route.estimated_duration || 0} 分钟</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>${Formatter.formatDateTime(route.create_time)}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="PatrolRoutesPage.showDetail(${route.id})">查看</button>
                    <button class="btn btn-sm btn-warning" onclick="PatrolRoutesPage.showEditModal(${route.id})">编辑</button>
                    <button class="btn btn-sm btn-${route.status === 'active' ? 'secondary' : 'success'}" 
                            onclick="PatrolRoutesPage.toggleStatus(${route.id})">
                        ${route.status === 'active' ? '停用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="PatrolRoutesPage.deleteRoute(${route.id})">删除</button>
                </td>
            </tr>
        `;
    },

    renderPagination() {
        Pagination.render('pagination', {
            current: this.currentPage,
            size: this.pageSize,
            total: this.total,
            onChange: (page) => {
                this.currentPage = page;
                this.loadRoutes();
            }
        });
    },

    showAddModal() {
        this.editingRoute = null;
        this.checkpoints = [];
        this.showRouteModal();
    },

    async showEditModal(routeId) {
        try {
            const response = await PatrolService.getRoute(routeId);
            if (response.code === 200) {
                this.editingRoute = response.data;
                this.checkpoints = JSON.parse(JSON.stringify(response.data.checkpoints || []));
                this.showRouteModal();
            }
        } catch (error) {
            Toast.error('加载路线详情失败');
        }
    },

    async showDetail(routeId) {
        try {
            const response = await PatrolService.getRoute(routeId);
            if (response.code === 200) {
                const route = response.data;
                const checkpointsHtml = (route.checkpoints || []).map((cp, idx) => `
                    <div class="card" style="margin-bottom: 12px;">
                        <div class="card-header">
                            <h4 class="card-title">检查点 ${idx + 1}: ${Validator.sanitize(cp.checkpoint_name)}</h4>
                        </div>
                        <div class="card-body">
                            <p><strong>关联设备:</strong> ${Validator.sanitize(cp.equipment_name || '-')}</p>
                            <p><strong>位置:</strong> ${Validator.sanitize(cp.location || '-')}</p>
                            <p><strong>备注:</strong> ${Validator.sanitize(cp.remark || '-')}</p>
                            <h5>巡检项:</h5>
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>项目名</th>
                                        <th>标准值</th>
                                        <th>单位</th>
                                        <th>是否必填</th>
                                        <th>类型</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(cp.items || []).map(item => `
                                        <tr>
                                            <td>${Validator.sanitize(item.item_name)}</td>
                                            <td>${Validator.sanitize(item.expected_value || '-')}</td>
                                            <td>${Validator.sanitize(item.unit || '-')}</td>
                                            <td>${item.is_required === 1 ? '是' : '否'}</td>
                                            <td>${item.item_type === 'input' ? '输入' : item.item_type === 'select' ? '选择' : '多选'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join('');

                new Modal({
                    title: '路线详情 - ' + route.route_name,
                    content: `
                        <div>
                            <p><strong>路线编号:</strong> ${Validator.sanitize(route.route_code)}</p>
                            <p><strong>描述:</strong> ${Validator.sanitize(route.description || '-')}</p>
                            <p><strong>预计时长:</strong> ${route.estimated_duration || 0} 分钟</p>
                            <h4 style="margin-top: 16px;">检查点列表</h4>
                            ${checkpointsHtml}
                        </div>
                    `,
                    width: '800px',
                    showFooter: false
                }).show();
            }
        } catch (error) {
            Toast.error('加载路线详情失败');
        }
    },

    showRouteModal() {
        const isEdit = !!this.editingRoute;
        const route = this.editingRoute || {};

        new Modal({
            title: isEdit ? '编辑路线' : '新建路线',
            content: this.renderRouteForm(route),
            width: '900px',
            onConfirm: () => this.saveRoute()
        }).show();

        setTimeout(() => {
            this.bindDragEvents();
        }, 100);
    },

    renderRouteForm(route) {
        return `
            <div class="form-group">
                <label class="form-label">路线编号 <span class="text-danger">*</span></label>
                <input type="text" id="route_code" class="form-input" value="${Validator.sanitize(route.route_code || '')}" placeholder="请输入路线编号">
            </div>
            <div class="form-group">
                <label class="form-label">路线名称 <span class="text-danger">*</span></label>
                <input type="text" id="route_name" class="form-input" value="${Validator.sanitize(route.route_name || '')}" placeholder="请输入路线名称">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">预计时长（分钟）</label>
                    <input type="number" id="estimated_duration" class="form-input" value="${route.estimated_duration || 0}" placeholder="预计巡检时长">
                </div>
                <div class="form-group">
                    <label class="form-label">状态</label>
                    <select id="status" class="form-input">
                        <option value="active" ${route.status === 'inactive' ? '' : 'selected'}>启用</option>
                        <option value="inactive" ${route.status === 'inactive' ? 'selected' : ''}>停用</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">描述</label>
                <textarea id="description" class="form-input" rows="2" placeholder="请输入路线描述">${Validator.sanitize(route.description || '')}</textarea>
            </div>
            
            <div class="form-group">
                <div class="d-flex justify-between align-center">
                    <label class="form-label m-0">检查点配置（拖拽排序）</label>
                    <button type="button" class="btn btn-sm btn-primary" onclick="PatrolRoutesPage.addCheckpoint()">
                        <span class="btn-icon">+</span> 添加检查点
                    </button>
                </div>
            </div>
            
            <div id="checkpointsContainer" class="checkpoints-container">
                ${this.checkpoints.map((cp, idx) => this.renderCheckpointCard(cp, idx)).join('')}
            </div>
        `;
    },

    renderCheckpointCard(checkpoint, index) {
        const equipmentOptions = this.equipments.map(e => 
            `<option value="${e.id}" ${checkpoint.equipment_id == e.id ? 'selected' : ''}>${Validator.sanitize(e.equipment_name)}</option>`
        ).join('');

        return `
            <div class="checkpoint-card" draggable="true" data-index="${index}">
                <div class="checkpoint-header">
                    <div class="checkpoint-drag-handle">⋮⋮</div>
                    <span class="checkpoint-title">检查点 ${index + 1}</span>
                    <button type="button" class="btn btn-sm btn-danger" onclick="PatrolRoutesPage.removeCheckpoint(${index})">删除</button>
                </div>
                <div class="checkpoint-body">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">检查点名称 <span class="text-danger">*</span></label>
                            <input type="text" class="form-input cp-name" value="${Validator.sanitize(checkpoint.checkpoint_name || '')}" placeholder="检查点名称">
                        </div>
                        <div class="form-group">
                            <label class="form-label">关联设备</label>
                            <select class="form-input cp-equipment">
                                <option value="">请选择设备</option>
                                ${equipmentOptions}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">位置描述</label>
                        <input type="text" class="form-input cp-location" value="${Validator.sanitize(checkpoint.location || '')}" placeholder="位置描述">
                    </div>
                    <div class="form-group">
                        <label class="form-label">备注</label>
                        <input type="text" class="form-input cp-remark" value="${Validator.sanitize(checkpoint.remark || '')}" placeholder="备注">
                    </div>
                    
                    <div class="form-group">
                        <div class="d-flex justify-between align-center">
                            <label class="form-label m-0">巡检项</label>
                            <button type="button" class="btn btn-sm btn-outline" onclick="PatrolRoutesPage.addItem(${index})">
                                + 添加巡检项
                            </button>
                        </div>
                    </div>
                    
                    <div class="items-container" data-cp-index="${index}">
                        ${(checkpoint.items || []).map((item, itemIdx) => this.renderItemRow(item, index, itemIdx)).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderItemRow(item, cpIndex, itemIndex) {
        return `
            <div class="item-row">
                <input type="text" class="form-input item-name" value="${Validator.sanitize(item.item_name || '')}" placeholder="项目名">
                <input type="text" class="form-input item-expected" value="${Validator.sanitize(item.expected_value || '')}" placeholder="标准值">
                <input type="text" class="form-input item-unit" value="${Validator.sanitize(item.unit || '')}" placeholder="单位" style="width: 80px;">
                <select class="form-input item-type" style="width: 100px;">
                    <option value="input" ${item.item_type === 'input' ? 'selected' : ''}>输入</option>
                    <option value="select" ${item.item_type === 'select' ? 'selected' : ''}>选择</option>
                    <option value="checkbox" ${item.item_type === 'checkbox' ? 'selected' : ''}>多选</option>
                </select>
                <label style="display: flex; align-items: center; gap: 4px; min-width: 60px;">
                    <input type="checkbox" class="item-required" ${item.is_required === 1 ? 'checked' : ''}> 必填
                </label>
                <button type="button" class="btn btn-sm btn-danger" onclick="PatrolRoutesPage.removeItem(${cpIndex}, ${itemIndex})">删除</button>
            </div>
        `;
    },

    addCheckpoint() {
        this.syncCheckpointsFromDOM();
        this.checkpoints.push({
            checkpoint_name: '',
            equipment_id: null,
            location: '',
            remark: '',
            items: []
        });
        this.refreshCheckpoints();
    },

    removeCheckpoint(index) {
        this.syncCheckpointsFromDOM();
        this.checkpoints.splice(index, 1);
        this.refreshCheckpoints();
    },

    addItem(cpIndex) {
        this.syncCheckpointsFromDOM();
        if (!this.checkpoints[cpIndex].items) {
            this.checkpoints[cpIndex].items = [];
        }
        this.checkpoints[cpIndex].items.push({
            item_name: '',
            expected_value: '',
            unit: '',
            is_required: 1,
            item_type: 'input'
        });
        this.refreshCheckpoints();
    },

    removeItem(cpIndex, itemIndex) {
        this.syncCheckpointsFromDOM();
        this.checkpoints[cpIndex].items.splice(itemIndex, 1);
        this.refreshCheckpoints();
    },

    collectFormData() {
        const routeCode = document.getElementById('route_code').value.trim();
        const routeName = document.getElementById('route_name').value.trim();

        if (!routeCode || !routeName) {
            Toast.warning('请填写路线编号和名称');
            return null;
        }

        const cpCards = document.querySelectorAll('.checkpoint-card');
        const checkpoints = [];

        cpCards.forEach((card, idx) => {
            const nameInput = card.querySelector('.cp-name');
            const equipmentSelect = card.querySelector('.cp-equipment');
            const locationInput = card.querySelector('.cp-location');
            const remarkInput = card.querySelector('.cp-remark');

            const items = [];
            const itemRows = card.querySelectorAll('.item-row');
            itemRows.forEach((row, itemIdx) => {
                const itemName = row.querySelector('.item-name').value.trim();
                if (itemName) {
                    items.push({
                        item_name: itemName,
                        expected_value: row.querySelector('.item-expected').value.trim(),
                        unit: row.querySelector('.item-unit').value.trim(),
                        is_required: row.querySelector('.item-required').checked ? 1 : 0,
                        item_type: row.querySelector('.item-type').value
                    });
                }
            });

            if (nameInput.value.trim()) {
                checkpoints.push({
                    checkpoint_name: nameInput.value.trim(),
                    equipment_id: equipmentSelect.value || null,
                    location: locationInput.value.trim(),
                    remark: remarkInput.value.trim(),
                    items: items
                });
            }
        });

        return {
            route_code: routeCode,
            route_name: routeName,
            description: document.getElementById('description').value.trim(),
            estimated_duration: parseInt(document.getElementById('estimated_duration').value) || 0,
            status: document.getElementById('status').value,
            checkpoints: checkpoints
        };
    },

    async saveRoute() {
        const data = this.collectFormData();
        if (!data) return false;

        try {
            let response;
            if (this.editingRoute) {
                response = await PatrolService.updateRoute(this.editingRoute.id, data);
            } else {
                response = await PatrolService.createRoute(data);
            }

            if (response.code === 200) {
                Toast.success(this.editingRoute ? '更新成功' : '创建成功');
                this.loadRoutes();
                return true;
            } else {
                Toast.error(response.message || '保存失败');
                return false;
            }
        } catch (error) {
            Toast.error('保存失败');
            return false;
        }
    },

    async toggleStatus(routeId) {
        const confirmed = await Modal.confirm('确定要切换该路线的状态吗？');
        if (!confirmed) return;

        try {
            const response = await PatrolService.toggleRouteStatus(routeId);
            if (response.code === 200) {
                Toast.success('状态已更新');
                this.loadRoutes();
            }
        } catch (error) {
            Toast.error('操作失败');
        }
    },

    async deleteRoute(routeId) {
        const confirmed = await Modal.confirm('确定要删除该路线吗？删除后不可恢复。');
        if (!confirmed) return;

        try {
            const response = await PatrolService.deleteRoute(routeId);
            if (response.code === 200) {
                Toast.success('删除成功');
                this.loadRoutes();
            } else {
                Toast.error(response.message || '删除失败');
            }
        } catch (error) {
            Toast.error('删除失败');
        }
    },

    refreshCheckpoints() {
        const container = document.getElementById('checkpointsContainer');
        if (container) {
            container.innerHTML = this.checkpoints.map((cp, idx) => this.renderCheckpointCard(cp, idx)).join('');
            this.bindDragEvents();
        }
    },

    syncCheckpointsFromDOM() {
        const cpCards = document.querySelectorAll('.checkpoint-card');
        const checkpoints = [];

        cpCards.forEach((card, idx) => {
            const nameInput = card.querySelector('.cp-name');
            const equipmentSelect = card.querySelector('.cp-equipment');
            const locationInput = card.querySelector('.cp-location');
            const remarkInput = card.querySelector('.cp-remark');

            const items = [];
            const itemRows = card.querySelectorAll('.item-row');
            itemRows.forEach((row, itemIdx) => {
                items.push({
                    item_name: row.querySelector('.item-name').value.trim(),
                    expected_value: row.querySelector('.item-expected').value.trim(),
                    unit: row.querySelector('.item-unit').value.trim(),
                    is_required: row.querySelector('.item-required').checked ? 1 : 0,
                    item_type: row.querySelector('.item-type').value
                });
            });

            checkpoints.push({
                checkpoint_name: nameInput.value.trim(),
                equipment_id: equipmentSelect.value || null,
                location: locationInput.value.trim(),
                remark: remarkInput.value.trim(),
                items: items
            });
        });

        this.checkpoints = checkpoints;
    },

    bindDragEvents() {
        const cards = document.querySelectorAll('.checkpoint-card');
        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                this.syncCheckpointsFromDOM();
                this.draggedIndex = parseInt(card.dataset.index);
                card.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
                document.querySelectorAll('.checkpoint-card').forEach(c => c.classList.remove('drag-over'));
            });

            card.addEventListener('dragover', (e) => {
                e.preventDefault();
                card.classList.add('drag-over');
            });

            card.addEventListener('dragleave', () => {
                card.classList.remove('drag-over');
            });

            card.addEventListener('drop', (e) => {
                e.preventDefault();
                card.classList.remove('drag-over');
                
                const targetIndex = parseInt(card.dataset.index);
                if (this.draggedIndex !== null && this.draggedIndex !== targetIndex) {
                    const draggedItem = this.checkpoints.splice(this.draggedIndex, 1)[0];
                    this.checkpoints.splice(targetIndex, 0, draggedItem);
                    this.refreshCheckpoints();
                }
                this.draggedIndex = null;
            });
        });
    }
};

window.PatrolRoutesPage = PatrolRoutesPage;
