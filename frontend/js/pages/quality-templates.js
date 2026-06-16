/**
 * 质检模板管理页面
 */
const QualityTemplatesPage = {
    templates: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,

    init() {
        this.loadTemplates();
    },

    async loadTemplates() {
        try {
            const response = await QualityService.getTemplates({
                page: this.currentPage,
                size: this.pageSize
            });
            if (response.code === 200) {
                this.templates = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载模板失败');
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">质检模板管理</h3>
                    <button class="btn btn-primary" onclick="QualityTemplatesPage.showAddModal()">
                        新建模板
                    </button>
                </div>
                <div class="card-body">
                    <div id="templateTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
    },

    renderTable() {
        const tableContainer = document.getElementById('templateTable');
        if (!this.templates || this.templates.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无模板数据</p>';
            return;
        }

        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>模板编号</th>
                            <th>模板名称</th>
                            <th>产品名称</th>
                            <th>产品规格</th>
                            <th>版本号</th>
                            <th>检测项数</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.templates.map(t => this.renderRow(t)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(template) {
        const statusText = template.is_active === 1 ? '启用' : '停用';
        const statusClass = template.is_active === 1 ? 'badge-success' : 'badge-secondary';
        const itemCount = (template.items || []).length;

        return `
            <tr>
                <td>${Validator.sanitize(template.template_code)}</td>
                <td>${Validator.sanitize(template.template_name)}</td>
                <td>${Validator.sanitize(template.product_name || '-')}</td>
                <td>${Validator.sanitize(template.product_spec || '-')}</td>
                <td>${Validator.sanitize(template.version || '-')}</td>
                <td><span class="badge badge-primary">${itemCount}</span></td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="QualityTemplatesPage.showDetail(${template.id})">查看</button>
                    <button class="btn btn-sm btn-warning" onclick="QualityTemplatesPage.showEditModal(${template.id})">编辑</button>
                    <button class="btn btn-sm btn-${template.is_active === 1 ? 'secondary' : 'success'}" 
                            onclick="QualityTemplatesPage.toggleStatus(${template.id})">
                        ${template.is_active === 1 ? '停用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="QualityTemplatesPage.deleteTemplate(${template.id})">删除</button>
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
                            onclick="QualityTemplatesPage.changePage(${this.currentPage - 1})"
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="QualityTemplatesPage.changePage(${this.currentPage + 1})"
                            ${this.currentPage >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    changePage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadTemplates();
    },

    showDetail(id) {
        const template = this.templates.find(t => t.id === id);
        if (!template) return;

        const itemsHtml = (template.items || []).map((item, idx) => `
            <tr>
                <td>${idx + 1}</td>
                <td>${Validator.sanitize(item.item_name)}</td>
                <td>${Validator.sanitize(item.standard || '-')}</td>
                <td>${item.lower_limit !== null && item.lower_limit !== undefined ? item.lower_limit : '-'}</td>
                <td>${item.upper_limit !== null && item.upper_limit !== undefined ? item.upper_limit : '-'}</td>
                <td>${Validator.sanitize(item.unit || '-')}</td>
                <td>${item.required === 1 ? '<span class="badge badge-danger">必检</span>' : '<span class="badge badge-secondary">选检</span>'}</td>
            </tr>
        `).join('');

        new Modal({
            title: '模板详情',
            content: `
                <div style="display: grid; gap: 12px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">模板编号</label>
                            <div style="font-weight: 500;">${Validator.sanitize(template.template_code)}</div>
                        </div>
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">版本号</label>
                            <div style="font-weight: 500;">${Validator.sanitize(template.version || '-')}</div>
                        </div>
                    </div>
                    <div>
                        <label style="color: var(--text-secondary); font-size: 12px;">模板名称</label>
                        <div style="font-weight: 500;">${Validator.sanitize(template.template_name)}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">产品名称</label>
                            <div style="font-weight: 500;">${Validator.sanitize(template.product_name || '-')}</div>
                        </div>
                        <div>
                            <label style="color: var(--text-secondary); font-size: 12px;">产品规格</label>
                            <div style="font-weight: 500;">${Validator.sanitize(template.product_spec || '-')}</div>
                        </div>
                    </div>
                    <div>
                        <label style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px; display: block;">检测项列表</label>
                        <div class="table-wrapper" style="max-height: 300px; overflow-y: auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th style="width: 50px;">序号</th>
                                        <th>检测项</th>
                                        <th>标准值</th>
                                        <th>下限</th>
                                        <th>上限</th>
                                        <th>单位</th>
                                        <th>是否必检</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml || '<tr><td colspan="7" class="empty-text">暂无检测项</td></tr>'}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    ${template.remark ? `
                    <div>
                        <label style="color: var(--text-secondary); font-size: 12px;">备注</label>
                        <div>${Validator.sanitize(template.remark)}</div>
                    </div>
                    ` : ''}
                </div>
            `,
            showCancel: false,
            confirmText: '关闭'
        }).show();
    },

    showAddModal() {
        this.showTemplateModal();
    },

    async showEditModal(id) {
        try {
            const response = await QualityService.getTemplateById(id);
            if (response.code === 200) {
                this.showTemplateModal(response.data);
            }
        } catch (error) {
            Toast.error('获取模板详情失败');
        }
    },

    showTemplateModal(template = null) {
        const isEdit = !!template;
        const items = template?.items || [];

        const modal = new Modal({
            title: isEdit ? '编辑质检模板' : '新建质检模板',
            content: this.buildTemplateForm(template),
            width: '800px',
            onConfirm: async () => {
                const form = document.getElementById('templateForm');
                const data = this.collectFormData(form);

                if (!data.template_code || !data.template_name) {
                    Toast.error('请填写模板编号和名称');
                    return false;
                }

                try {
                    let response;
                    if (isEdit) {
                        response = await QualityService.updateTemplate(template.id, data);
                    } else {
                        response = await QualityService.createTemplate(data);
                    }

                    if (response.code === 200 || response.code === 201) {
                        Toast.success(isEdit ? '更新成功' : '创建成功');
                        this.loadTemplates();
                        return true;
                    } else {
                        Toast.error(response.message || '操作失败');
                        return false;
                    }
                } catch (error) {
                    Toast.error('操作失败');
                    return false;
                }
            }
        });
        modal.show();

        this.initItemsTable(items);
    },

    buildTemplateForm(template) {
        return `
            <form id="templateForm">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="form-group">
                        <label class="form-label">模板编号 <span style="color:red;">*</span></label>
                        <input type="text" class="form-control" name="template_code" 
                               value="${template?.template_code || ''}" ${template ? 'readonly' : ''}>
                    </div>
                    <div class="form-group">
                        <label class="form-label">版本号</label>
                        <input type="text" class="form-control" name="version" 
                               value="${template?.version || '1.0'}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">模板名称 <span style="color:red;">*</span></label>
                    <input type="text" class="form-control" name="template_name" 
                           value="${template?.template_name || ''}">
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                    <div class="form-group">
                        <label class="form-label">产品名称</label>
                        <input type="text" class="form-control" name="product_name" 
                               value="${template?.product_name || ''}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">产品规格</label>
                        <input type="text" class="form-control" name="product_spec" 
                               value="${template?.product_spec || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">状态</label>
                    <select class="form-control" name="is_active">
                        <option value="1" ${template?.is_active === 1 ? 'selected' : ''}>启用</option>
                        <option value="0" ${template?.is_active === 0 ? 'selected' : ''}>停用</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">检测项列表</label>
                    <div class="table-wrapper" style="max-height: 300px; overflow-y: auto; margin-bottom: 8px;">
                        <table class="data-table" id="itemsTable">
                            <thead>
                                <tr>
                                    <th style="width: 40px;">序号</th>
                                    <th>检测项名称</th>
                                    <th>标准值</th>
                                    <th>下限</th>
                                    <th>上限</th>
                                    <th>单位</th>
                                    <th style="width: 60px;">必检</th>
                                    <th style="width: 60px;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="itemsBody">
                            </tbody>
                        </table>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline" onclick="QualityTemplatesPage.addItemRow()">
                        + 添加检测项
                    </button>
                </div>
                <div class="form-group">
                    <label class="form-label">备注</label>
                    <textarea class="form-control" name="remark" rows="2">${template?.remark || ''}</textarea>
                </div>
            </form>
        `;
    },

    initItemsTable(items) {
        const tbody = document.getElementById('itemsBody');
        if (!tbody) return;

        if (items.length === 0) {
            this.addItemRow();
        } else {
            items.forEach(item => this.addItemRow(item));
        }
    },

    addItemRow(item = null) {
        const tbody = document.getElementById('itemsBody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'item-row';
        row.innerHTML = `
            <td class="row-index">1</td>
            <td><input type="text" class="form-control form-control-sm" name="item_name" 
                       value="${item?.item_name || ''}" placeholder="检测项名称"></td>
            <td><input type="text" class="form-control form-control-sm" name="standard" 
                       value="${item?.standard || ''}" placeholder="标准值"></td>
            <td><input type="number" step="0.0001" class="form-control form-control-sm" name="lower_limit" 
                       value="${item?.lower_limit ?? ''}" placeholder="下限"></td>
            <td><input type="number" step="0.0001" class="form-control form-control-sm" name="upper_limit" 
                       value="${item?.upper_limit ?? ''}" placeholder="上限"></td>
            <td><input type="text" class="form-control form-control-sm" name="unit" 
                       value="${item?.unit || ''}" placeholder="单位"></td>
            <td style="text-align: center;">
                <input type="checkbox" name="required" ${item?.required === 1 ? 'checked' : ''}>
            </td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-sm btn-danger" onclick="QualityTemplatesPage.removeItemRow(this)">删除</button>
            </td>
        `;
        tbody.appendChild(row);
        this.updateRowIndexes();
    },

    removeItemRow(btn) {
        const row = btn.closest('tr');
        const tbody = row.parentElement;
        if (tbody.children.length <= 1) {
            Toast.warning('至少保留一个检测项');
            return;
        }
        row.remove();
        this.updateRowIndexes();
    },

    updateRowIndexes() {
        const rows = document.querySelectorAll('#itemsBody .item-row');
        rows.forEach((row, idx) => {
            const indexCell = row.querySelector('.row-index');
            if (indexCell) indexCell.textContent = idx + 1;
        });
    },

    collectFormData(form) {
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        data.is_active = parseInt(data.is_active);

        const items = [];
        const itemRows = form.querySelectorAll('#itemsBody .item-row');
        itemRows.forEach(row => {
            const item = {
                item_name: row.querySelector('[name="item_name"]').value,
                standard: row.querySelector('[name="standard"]').value,
                lower_limit: row.querySelector('[name="lower_limit"]').value || null,
                upper_limit: row.querySelector('[name="upper_limit"]').value || null,
                unit: row.querySelector('[name="unit"]').value,
                required: row.querySelector('[name="required"]').checked ? 1 : 0
            };
            if (item.item_name) {
                items.push(item);
            }
        });
        data.items = items;

        return data;
    },

    async toggleStatus(id) {
        if (!confirm('确定要切换模板状态吗？')) return;

        try {
            const response = await QualityService.toggleTemplateStatus(id);
            if (response.code === 200) {
                Toast.success('状态更新成功');
                this.loadTemplates();
            } else {
                Toast.error(response.message || '操作失败');
            }
        } catch (error) {
            Toast.error('操作失败');
        }
    },

    async deleteTemplate(id) {
        if (!confirm('确定要删除此模板吗？删除后不可恢复。')) return;

        try {
            const response = await QualityService.deleteTemplate(id);
            if (response.code === 200) {
                Toast.success('删除成功');
                this.loadTemplates();
            } else {
                Toast.error(response.message || '删除失败');
            }
        } catch (error) {
            Toast.error('删除失败');
        }
    },

    renderSubNav() {
        const current = 'quality-templates';
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

window.QualityTemplatesPage = QualityTemplatesPage;
