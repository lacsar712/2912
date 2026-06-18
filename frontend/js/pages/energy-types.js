const EnergyTypesPage = {
    currentPage: 1,
    pageSize: 10,
    types: [],
    total: 0,

    init() {
        this.loadData();
    },

    async loadData() {
        try {
            const params = { page: this.currentPage, size: this.pageSize };
            const keyword = document.getElementById('filterKeyword')?.value?.trim();
            if (keyword) params.keyword = keyword;
            const res = await EnergyService.getEnergyTypes(params);
            if (res.code === 200) {
                this.types = res.data.items || [];
                this.total = res.data.total || 0;
            }
            this.renderPage();
        } catch (e) {
            Toast.error('加载能源类型数据失败');
            this.renderPage();
        }
    },

    renderPage() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">能源类型管理</h3>
                    <button class="btn btn-primary btn-sm" id="addEnergyTypeBtn">新增能源类型</button>
                </div>
                <div class="card-body">
                    <div class="filter-bar">
                        <input type="text" class="form-control" id="filterKeyword" placeholder="搜索编码或名称" value="${this._keyword || ''}">
                        <button class="btn btn-primary btn-sm" id="searchBtn">搜索</button>
                        <button class="btn btn-outline btn-sm" id="resetBtn">重置</button>
                    </div>
                    ${this.renderTable()}
                    ${this.renderPagination()}
                </div>
            </div>
        `;
        document.getElementById('addEnergyTypeBtn').addEventListener('click', () => this.showModal());
        document.getElementById('searchBtn').addEventListener('click', () => this.search());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetFilters());
    },

    renderTable() {
        if (this.types.length === 0) {
            return '<table class="data-table"><thead><tr><th>编码</th><th>名称</th><th>计量单位</th><th>关联计量点数</th><th>状态</th><th>操作</th></tr></thead><tbody><tr><td colspan="6" style="text-align:center">暂无数据</td></tr></tbody></table>';
        }
        let html = '<table class="data-table"><thead><tr><th>编码</th><th>名称</th><th>计量单位</th><th>关联计量点数</th><th>状态</th><th>操作</th></tr></thead><tbody>';
        this.types.forEach(item => {
            html += `<tr>
                <td>${item.type_code || ''}</td>
                <td>${item.type_name || ''}</td>
                <td>${item.unit || '-'}</td>
                <td>${item.metering_point_count || 0}</td>
                <td><span class="status-badge ${item.status === 1 ? 'status-active' : 'status-inactive'}">${item.status === 1 ? '正常' : '停用'}</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="EnergyTypesPage.showModal(${item.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="EnergyTypesPage.deleteType(${item.id})">删除</button>
                </td>
            </tr>`;
        });
        html += '</tbody></table>';
        return html;
    },

    renderPagination() {
        const totalPages = Math.ceil(this.total / this.pageSize) || 1;
        let html = '<div class="pagination">';
        html += `<button class="btn btn-sm btn-outline" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="EnergyTypesPage.goToPage(${this.currentPage - 1})">上一页</button>`;
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="btn btn-sm ${i === this.currentPage ? 'btn-primary' : 'btn-outline'}" onclick="EnergyTypesPage.goToPage(${i})">${i}</button>`;
        }
        html += `<button class="btn btn-sm btn-outline" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="EnergyTypesPage.goToPage(${this.currentPage + 1})">下一页</button>`;
        html += `<span style="margin-left:10px">共 ${this.total} 条</span>`;
        html += '</div>';
        return html;
    },

    goToPage(page) {
        this.currentPage = page;
        this.loadData();
    },

    search() {
        this._keyword = document.getElementById('filterKeyword')?.value?.trim() || '';
        this.currentPage = 1;
        this.loadData();
    },

    resetFilters() {
        this._keyword = '';
        this.currentPage = 1;
        this.loadData();
    },

    async showModal(typeId = null) {
        let typeData = null;
        if (typeof typeId === 'number' && typeId) {
            try {
                const res = await EnergyService.getEnergyTypeById(typeId);
                typeData = res.data;
            } catch (e) {
                Toast.error('获取能源类型信息失败');
                return;
            }
        }
        const isEdit = !!typeData;
        const content = `
            <div class="form-group">
                <label class="form-label">类型编码 <span class="required">*</span></label>
                <input type="text" class="form-control" id="typeCode" value="${typeData ? typeData.type_code || '' : ''}" placeholder="如：electricity">
            </div>
            <div class="form-group">
                <label class="form-label">类型名称 <span class="required">*</span></label>
                <input type="text" class="form-control" id="typeName" value="${typeData ? typeData.type_name || '' : ''}" placeholder="如：电力">
            </div>
            <div class="form-group">
                <label class="form-label">计量单位</label>
                <input type="text" class="form-control" id="typeUnit" value="${typeData ? typeData.unit || '' : ''}" placeholder="如：kWh、吨、m³">
            </div>
            <div class="form-group">
                <label class="form-label">描述</label>
                <textarea class="form-control" id="typeDesc" rows="3" placeholder="能源类型描述">${typeData ? typeData.description || '' : ''}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">状态</label>
                <select class="form-control" id="typeStatus">
                    <option value="1" ${!typeData || typeData.status === 1 ? 'selected' : ''}>正常</option>
                    <option value="0" ${typeData && typeData.status === 0 ? 'selected' : ''}>停用</option>
                </select>
            </div>
        `;
        const modal = new Modal({
            title: isEdit ? '编辑能源类型' : '新增能源类型',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: () => {
                const typeCode = document.getElementById('typeCode').value.trim();
                const typeName = document.getElementById('typeName').value.trim();
                const unit = document.getElementById('typeUnit').value.trim();
                const description = document.getElementById('typeDesc').value.trim();
                const status = parseInt(document.getElementById('typeStatus').value);
                if (!typeCode) { Toast.error('请输入类型编码'); return false; }
                if (!typeName) { Toast.error('请输入类型名称'); return false; }
                const data = { type_code: typeCode, type_name: typeName, unit, description, status };
                const saveId = isEdit ? typeData.id : null;
                (async () => {
                    try {
                        if (saveId) {
                            await EnergyService.updateEnergyType(saveId, data);
                            Toast.success('更新成功');
                        } else {
                            await EnergyService.createEnergyType(data);
                            Toast.success('创建成功');
                        }
                        modal.close();
                        this.loadData();
                    } catch (e) {
                        Toast.error(saveId ? '更新失败' : '创建失败');
                    }
                })();
                return false;
            }
        });
        modal.show();
    },

    async deleteType(id) {
        const confirmed = await Modal.confirm('确定要删除该能源类型吗？关联的计量点和单价配置将受影响，此操作不可撤销。');
        if (!confirmed) return;
        try {
            await EnergyService.deleteEnergyType(id);
            Toast.success('删除成功');
            this.loadData();
        } catch (e) {
            Toast.error('删除失败');
        }
    }
};

window.EnergyTypesPage = EnergyTypesPage;
