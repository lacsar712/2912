const EnergyMeteringPointsPage = {
    currentPage: 1,
    pageSize: 10,
    filters: {},

    init() {
        this.filters = {};
        this.currentPage = 1;
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">计量点管理</h3>
                    <button class="btn btn-primary btn-sm" id="addMeteringPointBtn">新增计量点</button>
                </div>
                <div class="card-body">
                    <div class="filter-bar">
                        <input type="text" class="form-control" id="filterKeyword" placeholder="关键字搜索">
                        <select class="form-control" id="filterEnergyType">
                            <option value="">全部能源类型</option>
                        </select>
                        <select class="form-control" id="filterProductionLine">
                            <option value="">全部生产线</option>
                        </select>
                        <input type="text" class="form-control" id="filterWorkshop" placeholder="车间">
                        <button class="btn btn-primary btn-sm" id="searchBtn">搜索</button>
                        <button class="btn btn-outline btn-sm" id="resetBtn">重置</button>
                    </div>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>编号</th>
                                <th>名称</th>
                                <th>能源类型</th>
                                <th>关联生产线</th>
                                <th>车间</th>
                                <th>安装位置</th>
                                <th>状态</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="meteringPointsTableBody"></tbody>
                    </table>
                    <div class="pagination" id="pagination"></div>
                </div>
            </div>
        `;
        document.getElementById('addMeteringPointBtn').addEventListener('click', () => this.showModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.search());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
        this.loadDropdowns();
        this.loadData();
    },

    async loadDropdowns() {
        try {
            const [energyTypesRes, linesRes] = await Promise.all([
                EnergyService.getAllEnergyTypes(),
                ProductionService.getLines({ size: 100 })
            ]);
            const energyTypeSelect = document.getElementById('filterEnergyType');
            const energyTypes = Array.isArray(energyTypesRes) ? energyTypesRes : (energyTypesRes.data || []);
            if (energyTypeSelect) {
                energyTypes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.type_name;
                energyTypeSelect.appendChild(opt);
            });
            }
            const lineSelect = document.getElementById('filterProductionLine');
            const lines = linesRes.data && linesRes.data.items ? linesRes.data.items : [];
            if (lineSelect) {
            lines.forEach(l => {
                const opt = document.createElement('option');
                opt.value = l.id;
                opt.textContent = l.line_name;
                lineSelect.appendChild(opt);
            });
            }
        } catch (e) {
            Toast.error('加载下拉选项失败');
        }
    },

    async loadData() {
        try {
            const params = {
                page: this.currentPage,
                size: this.pageSize,
                ...this.filters
            };
            const res = await EnergyService.getMeteringPoints(params);
            this.renderTable(res.data || {});
        } catch (e) {
            Toast.error('加载计量点数据失败');
        }
    },

    renderTable(data) {
        const tbody = document.getElementById('meteringPointsTableBody');
        const items = data.items || [];
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center">暂无数据</td></tr>';
        } else {
            tbody.innerHTML = items.map(item => `
                <tr>
                    <td>${item.point_code || item.id || ''}</td>
                    <td>${item.point_name || ''}</td>
                    <td>${item.energy_type_name || ''}</td>
                    <td>${item.production_line_name || ''}</td>
                    <td>${item.workshop || ''}</td>
                    <td>${item.location || ''}</td>
                    <td><span class="status-badge ${item.status === 1 ? 'status-active' : 'status-inactive'}">${item.status === 1 ? '正常' : '停用'}</span></td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="EnergyMeteringPointsPage.showModal(${item.id})">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="EnergyMeteringPointsPage.deletePoint(${item.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
        this.renderPagination(data);
    },

    renderPagination(data) {
        const total = data.total || 0;
        const totalPages = Math.ceil(total / this.pageSize) || 1;
        const container = document.getElementById('pagination');
        let html = '';
        html += `<button class="btn btn-sm btn-outline" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="EnergyMeteringPointsPage.goToPage(${this.currentPage - 1})">上一页</button>`;
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-outline'}" onclick="EnergyMeteringPointsPage.goToPage(${i})">${i}</button>`;
        }
        html += `<button class="btn btn-sm btn-outline" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="EnergyMeteringPointsPage.goToPage(${this.currentPage + 1})">下一页</button>`;
        html += `<span style="margin-left:10px">共 ${total} 条</span>`;
        container.innerHTML = html;
    },

    goToPage(page) {
        this.currentPage = page;
        this.loadData();
    },

    search() {
        this.filters = {};
        const keyword = document.getElementById('filterKeyword').value.trim();
        const energyTypeId = document.getElementById('filterEnergyType').value;
        const productionLineId = document.getElementById('filterProductionLine').value;
        const workshop = document.getElementById('filterWorkshop').value.trim();
        if (keyword) this.filters.keyword = keyword;
        if (energyTypeId) this.filters.energyTypeId = energyTypeId;
        if (productionLineId) this.filters.productionLineId = productionLineId;
        if (workshop) this.filters.workshop = workshop;
        this.currentPage = 1;
        this.loadData();
    },

    resetFilters() {
        this.filters = {};
        this.currentPage = 1;
        document.getElementById('filterKeyword').value = '';
        document.getElementById('filterEnergyType').value = '';
        document.getElementById('filterProductionLine').value = '';
        document.getElementById('filterWorkshop').value = '';
        this.loadData();
    },

    async showModal(point = null) {
        let pointData = null;
        if (typeof point === 'number' && point) {
            try {
                const res = await EnergyService.getMeteringPointById(point);
                pointData = res.data;
            } catch (e) {
                Toast.error('获取计量点信息失败');
                return;
            }
        }
        const isEdit = !!pointData;
        let energyTypeOptions = '';
        let productionLineOptions = '';
        try {
            const [energyTypesRes, linesRes] = await Promise.all([
                EnergyService.getAllEnergyTypes(),
                ProductionService.getLines({ size: 100 })
            ]);
            const energyTypes = Array.isArray(energyTypesRes) ? energyTypesRes : (energyTypesRes.data || []);
            energyTypeOptions = energyTypes.map(t =>
                `<option value="${t.id}" ${pointData && pointData.energy_type_id == t.id ? 'selected' : ''}>${t.type_name}</option>`
            ).join('');
            const lines = linesRes.data && linesRes.data.items ? linesRes.data.items : [];
            productionLineOptions = lines.map(l =>
                `<option value="${l.id}" ${pointData && pointData.production_line_id == l.id ? 'selected' : ''}>${l.line_name}</option>`
            ).join('');
        } catch (e) {
            Toast.error('加载选项失败');
        }
        const content = `
            <div class="form-group">
                <label class="form-label">计量点编号 <span class="required">*</span></label>
                <input type="text" class="form-control" id="pointCode" value="${pointData ? pointData.point_code || '' : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">计量点名称 <span class="required">*</span></label>
                <input type="text" class="form-control" id="pointName" value="${pointData ? pointData.point_name || '' : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">能源类型 <span class="required">*</span></label>
                <select class="form-control" id="pointEnergyType">
                    <option value="">请选择能源类型</option>
                    ${energyTypeOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">关联生产线</label>
                <select class="form-control" id="pointProductionLine">
                    <option value="">请选择生产线</option>
                    ${productionLineOptions}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">车间</label>
                <input type="text" class="form-control" id="pointWorkshop" value="${pointData ? pointData.workshop || '' : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">安装位置</label>
                <input type="text" class="form-control" id="pointInstallLocation" value="${pointData ? pointData.location || '' : ''}">
            </div>
            <div class="form-group">
                <label class="form-label">状态</label>
                <select class="form-control" id="pointStatus">
                    <option value="1" ${!pointData || pointData.status === 1 ? 'selected' : ''}>正常</option>
                    <option value="0" ${pointData && pointData.status === 0 ? 'selected' : ''}>停用</option>
                </select>
            </div>
        `;
        Modal.show({
            title: isEdit ? '编辑计量点' : '新增计量点',
            content: content,
            onConfirm: () => this.savePoint(isEdit ? pointData.id : null)
        });
    },

    async savePoint(id) {
        const code = document.getElementById('pointCode').value.trim();
        const name = document.getElementById('pointName').value.trim();
        const energyTypeId = document.getElementById('pointEnergyType').value;
        const productionLineId = document.getElementById('pointProductionLine').value;
        const workshop = document.getElementById('pointWorkshop').value.trim();
        const installLocation = document.getElementById('pointInstallLocation').value.trim();
        const status = parseInt(document.getElementById('pointStatus').value);
        if (!code) {
            Toast.error('请输入计量点编号');
            return;
        }
        if (!name) {
            Toast.error('请输入计量点名称');
            return;
        }
        if (!energyTypeId) {
            Toast.error('请选择能源类型');
            return;
        }
        const data = { point_code: code, point_name: name, energy_type_id: energyTypeId, production_line_id: productionLineId || null, workshop, location: installLocation, status };
        try {
            if (id) {
                await EnergyService.updateMeteringPoint(id, data);
                Toast.success('更新成功');
            } else {
                await EnergyService.createMeteringPoint(data);
                Toast.success('创建成功');
            }
            Modal.hide();
            this.loadData();
        } catch (e) {
            Toast.error(id ? '更新失败' : '创建失败');
        }
    },

    async deletePoint(id) {
        Modal.confirm({
            title: '确认删除',
            content: '确定要删除该计量点吗？此操作不可撤销。',
            onConfirm: async () => {
                try {
                    await EnergyService.deleteMeteringPoint(id);
                    Toast.success('删除成功');
                    this.loadData();
                } catch (e) {
                    Toast.error('删除失败');
                }
            }
        });
    }
};

window.EnergyMeteringPointsPage = EnergyMeteringPointsPage;
