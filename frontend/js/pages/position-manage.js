/**
 * 岗位字典管理页面
 */
const PositionManagePage = {
    positions: [],
    categories: [],
    pagination: { page: 1, size: 10, total: 0 },
    filters: {
        keyword: '',
        category: ''
    },

    init() {
        this.loadView();
    },

    destroy() {
    },

    async loadView() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            await Promise.all([
                this.loadCategories(),
                this.loadPositions()
            ]);
            this.render();
        } catch (error) {
            Toast.error('加载数据失败');
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

    async loadCategories() {
        const res = await OrganizationService.getPositionCategories();
        if (res.code === 200) {
            this.categories = res.data || [];
        }
    },

    async loadPositions() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            keyword: this.filters.keyword || undefined,
            category: this.filters.category || undefined
        };
        const res = await OrganizationService.getPositions(params);
        if (res.code === 200) {
            this.positions = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">岗位字典管理</h3>
                    <button class="btn btn-primary" onclick="PositionManagePage.showAddModal()">
                        + 新增岗位
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderFilters()}
                    ${this.renderTable()}
                    ${this.renderPagination()}
                </div>
            </div>
        `;
    },

    renderFilters() {
        const categoryOptions = this.categories.map(c => 
            `<option value="${Validator.sanitize(c)}" ${this.filters.category === c ? 'selected' : ''}>${Validator.sanitize(c)}</option>`
        ).join('');

        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">类别：</label>
                    <select class="form-control" style="width: 150px;" onchange="PositionManagePage.filterByCategory(this.value)">
                        <option value="">全部</option>
                        ${categoryOptions}
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" placeholder="搜索岗位编码/名称..." 
                           value="${this.filters.keyword || ''}"
                           onkeyup="if(event.key==='Enter') PositionManagePage.searchPositions(this.value)"
                           style="flex: 1;">
                    <button class="btn btn-primary" onclick="PositionManagePage.searchPositions(this.previousElementSibling.value)">搜索</button>
                </div>
            </div>
        `;
    },

    renderTable() {
        if (!this.positions.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">📋</div>
                    <div>暂无岗位数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="PositionManagePage.showAddModal()">
                        新增岗位
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>岗位编码</th>
                        <th>岗位名称</th>
                        <th>所属类别</th>
                        <th>描述</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.positions.map(p => this.renderRow(p)).join('')}
                </tbody>
            </table>
        `;
    },

    renderRow(p) {
        return `
            <tr>
                <td>${Validator.sanitize(p.position_code)}</td>
                <td>${Validator.sanitize(p.position_name)}</td>
                <td>
                    ${p.category ? `
                        <span style="display: inline-block; padding: 2px 10px; background: var(--primary-bg); color: var(--primary-color); border-radius: 12px; font-size: 12px;">
                            ${Validator.sanitize(p.category)}
                        </span>
                    ` : '<span style="color: var(--text-secondary);">-</span>'}
                </td>
                <td>${Validator.sanitize(p.description || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="PositionManagePage.showEditModal(${p.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="PositionManagePage.deletePosition(${p.id})">删除</button>
                </td>
            </tr>
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
                            onclick="PositionManagePage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="PositionManagePage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadPositions().then(() => this.render());
    },

    filterByCategory(category) {
        this.filters.category = category;
        this.pagination.page = 1;
        this.loadPositions().then(() => this.render());
    },

    searchPositions(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadPositions().then(() => this.render());
    },

    showAddModal() {
        const categoryOptions = this.categories.map(c => 
            `<option value="${Validator.sanitize(c)}">${Validator.sanitize(c)}</option>`
        ).join('');

        const content = `
            <form id="positionForm">
                <div class="form-group">
                    <label>岗位编码 *</label>
                    <input type="text" class="form-control" name="position_code" required>
                </div>
                <div class="form-group">
                    <label>岗位名称 *</label>
                    <input type="text" class="form-control" name="position_name" required>
                </div>
                <div class="form-group">
                    <label>所属类别</label>
                    <select class="form-control" name="category">
                        <option value="">请选择或输入</option>
                        ${categoryOptions}
                    </select>
                    <small style="color: var(--text-secondary);">或在下方输入新类别</small>
                    <input type="text" class="form-control" name="new_category" placeholder="输入新类别..." style="margin-top: 4px;">
                </div>
                <div class="form-group">
                    <label>岗位描述</label>
                    <textarea class="form-control" name="description" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增岗位',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('positionForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                if (data.new_category && data.new_category.trim()) {
                    data.category = data.new_category.trim();
                }
                delete data.new_category;

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.createPosition(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        this.loadCategories();
                        this.loadPositions().then(() => this.render());
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

    showEditModal(id) {
        const position = this.positions.find(p => p.id === id);
        if (!position) return;

        const categoryOptions = this.categories.map(c => 
            `<option value="${Validator.sanitize(c)}" ${position.category === c ? 'selected' : ''}>${Validator.sanitize(c)}</option>`
        ).join('');

        const content = `
            <form id="positionForm">
                <div class="form-group">
                    <label>岗位编码 *</label>
                    <input type="text" class="form-control" name="position_code" value="${Validator.sanitize(position.position_code)}" required>
                </div>
                <div class="form-group">
                    <label>岗位名称 *</label>
                    <input type="text" class="form-control" name="position_name" value="${Validator.sanitize(position.position_name)}" required>
                </div>
                <div class="form-group">
                    <label>所属类别</label>
                    <select class="form-control" name="category">
                        <option value="">请选择或输入</option>
                        ${categoryOptions}
                    </select>
                    <small style="color: var(--text-secondary);">或在下方输入新类别</small>
                    <input type="text" class="form-control" name="new_category" placeholder="输入新类别..." style="margin-top: 4px;">
                </div>
                <div class="form-group">
                    <label>岗位描述</label>
                    <textarea class="form-control" name="description" rows="3">${Validator.sanitize(position.description || '')}</textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑岗位',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('positionForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                if (data.new_category && data.new_category.trim()) {
                    data.category = data.new_category.trim();
                }
                delete data.new_category;

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.updatePosition(id, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        this.loadCategories();
                        this.loadPositions().then(() => this.render());
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

    async deletePosition(id) {
        const position = this.positions.find(p => p.id === id);
        if (!position) return;

        const confirmed = await Modal.confirm(`确定要删除岗位 "${position.position_name}" 吗？\n\n注意：只有没有员工使用的岗位才能删除。`);
        if (!confirmed) return;

        try {
            const res = await OrganizationService.deletePosition(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                this.loadPositions().then(() => this.render());
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    }
};

window.PositionManagePage = PositionManagePage;
