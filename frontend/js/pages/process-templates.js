/**
 * 工艺模板管理页面
 */
const ProcessTemplatesPage = {
    templates: [],
    products: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    filters: {
        productName: '',
        status: '',
        keyword: ''
    },

    init() {
        this.loadProducts();
        this.loadTemplates();
    },

    destroy() {
    },

    async loadProducts() {
        try {
            const response = await ProcessService.getProducts();
            if (response.code === 200) {
                this.products = response.data || [];
            }
        } catch (e) {
            console.error('加载产品列表失败', e);
        }
    },

    async loadTemplates() {
        try {
            const params = {
                page: this.currentPage,
                size: this.pageSize
            };
            if (this.filters.productName) {
                params.productName = this.filters.productName;
            }
            if (this.filters.status) {
                params.status = this.filters.status;
            }
            if (this.filters.keyword) {
                params.keyword = this.filters.keyword;
            }

            const response = await ProcessService.getTemplates(params);
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
                    <h3 class="card-title">工艺模板管理</h3>
                    <button class="btn btn-primary" onclick="ProcessTemplatesPage.showAddModal()">
                        新建模板
                    </button>
                </div>
                <div class="card-body">
                    ${this.renderFilters()}
                    <div id="templateTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
        this.bindFilterEvents();
    },

    renderSubNav() {
        const current = 'process-templates';
        const items = [
            { key: 'process-templates', label: '模板管理', icon: '📋' },
            { key: 'process-compare', label: '版本对比', icon: '🔄' },
            { key: 'process-audit', label: '审核工作台', icon: '✅' },
            { key: 'process-deploy', label: '下发记录', icon: '📡' }
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
    },

    renderFilters() {
        const statusOptions = [
            { value: '', label: '全部状态' },
            { value: 'draft', label: '草稿' },
            { value: 'pending', label: '待审' },
            { value: 'active', label: '启用' },
            { value: 'archived', label: '归档' }
        ];

        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                <div class="form-group" style="margin-bottom: 0; min-width: 160px;">
                    <select class="form-control" id="filterProduct">
                        <option value="">全部产品</option>
                        ${this.products.map(p => `
                            <option value="${Validator.sanitize(p)}" ${this.filters.productName === p ? 'selected' : ''}>
                                ${Validator.sanitize(p)}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0; min-width: 140px;">
                    <select class="form-control" id="filterStatus">
                        ${statusOptions.map(opt => `
                            <option value="${opt.value}" ${this.filters.status === opt.value ? 'selected' : ''}>
                                ${opt.label}
                            </option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" id="filterKeyword" 
                           placeholder="搜索模板编号/名称" value="${Validator.sanitize(this.filters.keyword)}">
                </div>
                <button class="btn btn-primary" id="btnSearch">搜索</button>
                <button class="btn btn-outline" id="btnReset">重置</button>
            </div>
        `;
    },

    bindFilterEvents() {
        const searchBtn = document.getElementById('btnSearch');
        const resetBtn = document.getElementById('btnReset');
        const filterProduct = document.getElementById('filterProduct');
        const filterStatus = document.getElementById('filterStatus');
        const filterKeyword = document.getElementById('filterKeyword');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.filters.productName = filterProduct.value;
                this.filters.status = filterStatus.value;
                this.filters.keyword = filterKeyword.value.trim();
                this.currentPage = 1;
                this.loadTemplates();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.filters = { productName: '', status: '', keyword: '' };
                this.currentPage = 1;
                this.loadTemplates();
            });
        }

        if (filterKeyword) {
            filterKeyword.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    searchBtn.click();
                }
            });
        }
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
                            <th>关联产品</th>
                            <th>版本号</th>
                            <th>参数数量</th>
                            <th>状态</th>
                            <th>创建人</th>
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

    getStatusBadge(status) {
        const statusMap = {
            'draft': { text: '草稿', class: 'badge-secondary' },
            'pending': { text: '待审', class: 'badge-warning' },
            'active': { text: '启用', class: 'badge-success' },
            'archived': { text: '归档', class: 'badge-dark' }
        };
        const info = statusMap[status] || { text: status, class: 'badge-secondary' };
        return `<span class="badge ${info.class}">${info.text}</span>`;
    },

    renderRow(template) {
        return `
            <tr>
                <td>${Validator.sanitize(template.template_code)}</td>
                <td>${Validator.sanitize(template.template_name)}</td>
                <td>${Validator.sanitize(template.product_name || '-')}</td>
                <td>${Validator.sanitize(template.version || '-')}</td>
                <td><span class="badge badge-primary">${template.param_count || 0}</span></td>
                <td>${this.getStatusBadge(template.status)}</td>
                <td>${Validator.sanitize(template.creator || '-')}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="ProcessTemplatesPage.showDetail(${template.id})">查看</button>
                    ${template.status === 'draft' ? `
                        <button class="btn btn-sm btn-warning" onclick="ProcessTemplatesPage.showEditModal(${template.id})">编辑</button>
                    ` : ''}
                    ${template.status === 'draft' ? `
                        <button class="btn btn-sm btn-primary" onclick="ProcessTemplatesPage.submitAudit(${template.id})">提交审核</button>
                    ` : ''}
                    ${template.status === 'active' ? `
                        <button class="btn btn-sm btn-success" onclick="ProcessTemplatesPage.showDeployModal(${template.id})">下发</button>
                    ` : ''}
                    ${template.status === 'active' ? `
                        <button class="btn btn-sm btn-outline" onclick="ProcessTemplatesPage.showNewVersionModal(${template.id})">新版本</button>
                    ` : ''}
                    ${template.status === 'active' ? `
                        <button class="btn btn-sm btn-secondary" onclick="ProcessTemplatesPage.archiveTemplate(${template.id})">归档</button>
                    ` : ''}
                    ${template.status === 'draft' ? `
                        <button class="btn btn-sm btn-danger" onclick="ProcessTemplatesPage.deleteTemplate(${template.id})">删除</button>
                    ` : ''}
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
                            onclick="ProcessTemplatesPage.changePage(${this.currentPage - 1})"
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="ProcessTemplatesPage.changePage(${this.currentPage + 1})"
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

    async showDetail(id) {
        try {
            const response = await ProcessService.getTemplateById(id);
            if (response.code === 200) {
                const template = response.data;
                const params = template.params || [];
                const auditRecords = template.audit_records || [];

                const paramsHtml = params.map((p, idx) => `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${Validator.sanitize(p.param_name)}</td>
                        <td>${p.param_value !== null && p.param_value !== undefined ? p.param_value : '-'}</td>
                        <td>${Validator.sanitize(p.unit || '-')}</td>
                        <td>${p.min_value !== null && p.min_value !== undefined ? p.min_value : '-'}</td>
                        <td>${p.max_value !== null && p.max_value !== undefined ? p.max_value : '-'}</td>
                    </tr>
                `).join('');

                const auditHtml = auditRecords.map(r => `
                    <tr>
                        <td>${r.operate_time || '-'}</td>
                        <td>${this.getAuditActionText(r.action)}</td>
                        <td>${Validator.sanitize(r.operator || '-')}</td>
                        <td>${Validator.sanitize(r.comment || '-')}</td>
                    </tr>
                `).join('');

                new Modal({
                    title: '模板详情',
                    content: `
                        <div style="display: grid; gap: 16px; max-height: 500px; overflow-y: auto;">
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
                                    <label style="color: var(--text-secondary); font-size: 12px;">关联产品</label>
                                    <div style="font-weight: 500;">${Validator.sanitize(template.product_name || '-')}</div>
                                </div>
                                <div>
                                    <label style="color: var(--text-secondary); font-size: 12px;">关联工序</label>
                                    <div style="font-weight: 500;">${Validator.sanitize(template.process_step || '-')}</div>
                                </div>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="color: var(--text-secondary); font-size: 12px;">状态</label>
                                    <div>${this.getStatusBadge(template.status)}</div>
                                </div>
                                <div>
                                    <label style="color: var(--text-secondary); font-size: 12px;">创建人</label>
                                    <div style="font-weight: 500;">${Validator.sanitize(template.creator || '-')}</div>
                                </div>
                            </div>
                            ${template.auditor ? `
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div>
                                    <label style="color: var(--text-secondary); font-size: 12px;">审核人</label>
                                    <div style="font-weight: 500;">${Validator.sanitize(template.auditor)}</div>
                                </div>
                                <div>
                                    <label style="color: var(--text-secondary); font-size: 12px;">审核时间</label>
                                    <div style="font-weight: 500;">${template.audit_time || '-'}</div>
                                </div>
                            </div>
                            ` : ''}
                            <div>
                                <label style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px; display: block;">参数列表</label>
                                <div class="table-wrapper" style="max-height: 200px; overflow-y: auto;">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th style="width: 50px;">序号</th>
                                                <th>参数名</th>
                                                <th>值</th>
                                                <th>单位</th>
                                                <th>最小值</th>
                                                <th>最大值</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${paramsHtml || '<tr><td colspan="6" class="empty-text">暂无参数</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ${auditRecords.length > 0 ? `
                            <div>
                                <label style="color: var(--text-secondary); font-size: 12px; margin-bottom: 8px; display: block;">审核记录</label>
                                <div class="table-wrapper" style="max-height: 150px; overflow-y: auto;">
                                    <table class="data-table">
                                        <thead>
                                            <tr>
                                                <th>操作时间</th>
                                                <th>操作</th>
                                                <th>操作人</th>
                                                <th>备注</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${auditHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            ` : ''}
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
            }
        } catch (error) {
            Toast.error('获取模板详情失败');
        }
    },

    getAuditActionText(action) {
        const map = {
            'submit': '提交审核',
            'pass': '审核通过',
            'reject': '审核驳回'
        };
        return map[action] || action;
    },

    showAddModal() {
        this.showTemplateModal();
    },

    async showEditModal(id) {
        try {
            const response = await ProcessService.getTemplateById(id);
            if (response.code === 200) {
                this.showTemplateModal(response.data);
            }
        } catch (error) {
            Toast.error('获取模板详情失败');
        }
    },

    showTemplateModal(template = null) {
        const isEdit = !!template;

        const modal = new Modal({
            title: isEdit ? '编辑工艺模板' : '新建工艺模板',
            content: this.buildTemplateForm(template),
            width: '900px',
            onConfirm: async () => {
                const data = this.collectFormData();

                if (!data.template_code || !data.template_name) {
                    Toast.error('请填写模板编号和名称');
                    return false;
                }

                if (data.params.length === 0) {
                    Toast.error('至少需要一个参数');
                    return false;
                }

                const validation = this.validateParams(data.params);
                if (!validation.valid) {
                    Toast.error(validation.message);
                    return false;
                }

                try {
                    let response;
                    if (isEdit) {
                        response = await ProcessService.updateTemplate(template.id, data);
                    } else {
                        response = await ProcessService.createTemplate(data);
                    }

                    if (response.code === 200 || response.code === 201) {
                        Toast.success(isEdit ? '更新成功' : '创建成功');
                        this.loadTemplates();
                        this.loadProducts();
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

        this.initParamsTable(template?.params || []);
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
                        <label class="form-label">关联产品</label>
                        <input type="text" class="form-control" name="product_name" 
                               value="${template?.product_name || ''}" placeholder="如：A产品">
                    </div>
                    <div class="form-group">
                        <label class="form-label">关联工序</label>
                        <input type="text" class="form-control" name="process_step" 
                               value="${template?.process_step || ''}" placeholder="如：注塑工序">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">参数列表 <span style="color:red;">*</span></label>
                    <div class="table-wrapper" style="max-height: 300px; overflow-y: auto; margin-bottom: 8px;">
                        <table class="data-table" id="paramsTable">
                            <thead>
                                <tr>
                                    <th style="width: 40px;">序号</th>
                                    <th>参数名称</th>
                                    <th>参数值</th>
                                    <th>单位</th>
                                    <th>最小值</th>
                                    <th>最大值</th>
                                    <th style="width: 60px;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="paramsBody">
                            </tbody>
                        </table>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline" onclick="ProcessTemplatesPage.addParamRow()">
                        + 添加参数
                    </button>
                    <div style="margin-top: 8px; font-size: 12px; color: var(--text-secondary);">
                        提示：可下发的参数名需为 temperature（温度）、pressure（压力）、speed（速度）
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">备注</label>
                    <textarea class="form-control" name="remark" rows="2">${template?.remark || ''}</textarea>
                </div>
            </form>
        `;
    },

    initParamsTable(params) {
        const tbody = document.getElementById('paramsBody');
        if (!tbody) return;

        if (params.length === 0) {
            this.addParamRow();
        } else {
            params.forEach(p => this.addParamRow(p));
        }
    },

    addParamRow(param = null) {
        const tbody = document.getElementById('paramsBody');
        if (!tbody) return;

        const row = document.createElement('tr');
        row.className = 'param-row';
        row.innerHTML = `
            <td class="row-index">1</td>
            <td><input type="text" class="form-control form-control-sm" name="param_name" 
                       value="${param?.param_name || ''}" placeholder="参数名"></td>
            <td><input type="number" step="0.0001" class="form-control form-control-sm" name="param_value" 
                       value="${param?.param_value ?? ''}" placeholder="参数值"></td>
            <td><input type="text" class="form-control form-control-sm" name="unit" 
                       value="${param?.unit || ''}" placeholder="单位"></td>
            <td><input type="number" step="0.0001" class="form-control form-control-sm" name="min_value" 
                       value="${param?.min_value ?? ''}" placeholder="最小值"></td>
            <td><input type="number" step="0.0001" class="form-control form-control-sm" name="max_value" 
                       value="${param?.max_value ?? ''}" placeholder="最大值"></td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-sm btn-danger" onclick="ProcessTemplatesPage.removeParamRow(this)">删除</button>
            </td>
        `;
        tbody.appendChild(row);
        this.updateRowIndexes();
    },

    removeParamRow(btn) {
        const row = btn.closest('tr');
        const tbody = row.parentElement;
        if (tbody.children.length <= 1) {
            Toast.warning('至少保留一个参数');
            return;
        }
        row.remove();
        this.updateRowIndexes();
    },

    updateRowIndexes() {
        const rows = document.querySelectorAll('#paramsBody .param-row');
        rows.forEach((row, idx) => {
            const indexCell = row.querySelector('.row-index');
            if (indexCell) indexCell.textContent = idx + 1;
        });
    },

    validateParams(params) {
        for (const p of params) {
            if (!p.param_name || !p.param_name.trim()) {
                return { valid: false, message: '参数名称不能为空' };
            }
            if (p.min_value !== null && p.min_value !== undefined && p.min_value !== '' &&
                p.max_value !== null && p.max_value !== undefined && p.max_value !== '') {
                if (parseFloat(p.min_value) > parseFloat(p.max_value)) {
                    return { valid: false, message: `参数 ${p.param_name} 的最小值不能大于最大值` };
                }
            }
            if (p.param_value !== null && p.param_value !== undefined && p.param_value !== '') {
                const value = parseFloat(p.param_value);
                if (p.min_value !== null && p.min_value !== undefined && p.min_value !== '') {
                    if (value < parseFloat(p.min_value)) {
                        return { valid: false, message: `参数 ${p.param_name} 的值低于最小值` };
                    }
                }
                if (p.max_value !== null && p.max_value !== undefined && p.max_value !== '') {
                    if (value > parseFloat(p.max_value)) {
                        return { valid: false, message: `参数 ${p.param_name} 的值高于最大值` };
                    }
                }
            }
        }
        return { valid: true };
    },

    collectFormData() {
        const form = document.getElementById('templateForm');
        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        const params = [];
        const paramRows = form.querySelectorAll('#paramsBody .param-row');
        paramRows.forEach(row => {
            const param = {
                param_name: row.querySelector('[name="param_name"]').value.trim(),
                param_value: row.querySelector('[name="param_value"]').value || null,
                unit: row.querySelector('[name="unit"]').value || null,
                min_value: row.querySelector('[name="min_value"]').value || null,
                max_value: row.querySelector('[name="max_value"]').value || null
            };
            if (param.param_name) {
                params.push(param);
            }
        });
        data.params = params;

        return data;
    },

    async submitAudit(id) {
        const confirmed = await Modal.confirm('确定要提交审核吗？');
        if (!confirmed) return;

        try {
            const response = await ProcessService.submitAudit(id);
            if (response.code === 200) {
                Toast.success('提交审核成功');
                this.loadTemplates();
            } else {
                Toast.error(response.message || '操作失败');
            }
        } catch (error) {
            Toast.error('操作失败');
        }
    },

    async deleteTemplate(id) {
        const confirmed = await Modal.confirm('确定要删除此模板吗？删除后不可恢复。');
        if (!confirmed) return;

        try {
            const response = await ProcessService.deleteTemplate(id);
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

    async archiveTemplate(id) {
        const confirmed = await Modal.confirm('确定要归档此模板吗？归档后不可编辑。');
        if (!confirmed) return;

        try {
            const response = await ProcessService.archiveTemplate(id);
            if (response.code === 200) {
                Toast.success('归档成功');
                this.loadTemplates();
            } else {
                Toast.error(response.message || '归档失败');
            }
        } catch (error) {
            Toast.error('归档失败');
        }
    },

    showNewVersionModal(id) {
        const modal = new Modal({
            title: '新建版本',
            content: `
                <div class="form-group">
                    <label class="form-label">新版本号 <span style="color:red;">*</span></label>
                    <input type="text" class="form-control" id="newVersion" placeholder="例如：1.1">
                </div>
                <div style="font-size: 12px; color: var(--text-secondary);">
                    新版本将复制当前模板的所有参数，状态为草稿。
                </div>
            `,
            onConfirm: async () => {
                const version = document.getElementById('newVersion').value.trim();
                if (!version) {
                    Toast.error('请输入版本号');
                    return false;
                }

                try {
                    const response = await ProcessService.createNewVersion(id, { version });
                    if (response.code === 201) {
                        Toast.success('新版本创建成功');
                        this.loadTemplates();
                        return true;
                    } else {
                        Toast.error(response.message || '创建失败');
                        return false;
                    }
                } catch (error) {
                    Toast.error('创建失败');
                    return false;
                }
            }
        });
        modal.show();
    },

    async showDeployModal(templateId) {
        try {
            const templateRes = await ProcessService.getTemplateById(templateId);
            const equipRes = await ProductionService.getEquipments({ page: 1, size: 100 });

            if (templateRes.code !== 200) {
                Toast.error('获取模板信息失败');
                return;
            }
            if (equipRes.code !== 200) {
                Toast.error('获取设备列表失败');
                return;
            }

            const template = templateRes.data;
            const equipments = equipRes.data.items || [];

            const modal = new Modal({
                title: `下发模板 - ${template.template_name}`,
                content: `
                    <div style="margin-bottom: 16px;">
                        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 8px;">
                            版本: ${template.version} | 参数数: ${(template.params || []).length}
                        </div>
                        <div style="font-weight: 500; margin-bottom: 12px;">选择目标设备：</div>
                        <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px;">
                            ${equipments.length === 0 ? '<p class="empty-text">暂无设备</p>' : equipments.map(eq => `
                                <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px;" 
                                       onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background='transparent'">
                                    <input type="checkbox" class="deploy-equipment" value="${eq.id}" style="margin-right: 10px;">
                                    <div>
                                        <div style="font-weight: 500;">${Validator.sanitize(eq.equipment_name)}</div>
                                        <div style="font-size: 12px; color: var(--text-secondary);">
                                            ${Validator.sanitize(eq.equipment_code)} | ${eq.status === 'running' ? '运行中' : eq.status === 'idle' ? '空闲' : eq.status}
                                        </div>
                                    </div>
                                </label>
                            `).join('')}
                        </div>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="btn btn-sm btn-outline" onclick="ProcessTemplatesPage.selectAllEquipments()">全选</button>
                            <button class="btn btn-sm btn-outline" onclick="ProcessTemplatesPage.clearEquipments()">清空</button>
                        </div>
                    </div>
                    <div style="padding: 12px; background: #fff3cd; border-radius: 8px; font-size: 13px; color: #856404;">
                        ⚠️ 下发将直接更新设备的运行参数，请确认后操作
                    </div>
                `,
                width: '500px',
                confirmText: '确认下发',
                confirmClass: 'btn-success',
                onConfirm: async () => {
                    const checked = document.querySelectorAll('.deploy-equipment:checked');
                    const equipmentIds = Array.from(checked).map(cb => parseInt(cb.value));

                    if (equipmentIds.length === 0) {
                        Toast.error('请选择至少一台设备');
                        return false;
                    }

                    const confirmed = await Modal.confirm(`确定要下发到 ${equipmentIds.length} 台设备吗？`);
                    if (!confirmed) return false;

                    try {
                        const response = await ProcessService.deployTemplate(templateId, equipmentIds);
                        if (response.code === 200) {
                            const data = response.data;
                            const msg = `下发完成：成功${data.success}台，失败${data.failed}台，部分成功${data.partial}台`;
                            if (data.failed > 0 || data.partial > 0) {
                                Toast.warning(msg);
                            } else {
                                Toast.success(msg);
                            }
                            return true;
                        } else {
                            Toast.error(response.message || '下发失败');
                            return false;
                        }
                    } catch (error) {
                        Toast.error('下发失败');
                        return false;
                    }
                }
            });
            modal.show();
        } catch (error) {
            Toast.error('获取数据失败');
        }
    },

    selectAllEquipments() {
        document.querySelectorAll('.deploy-equipment').forEach(cb => cb.checked = true);
    },

    clearEquipments() {
        document.querySelectorAll('.deploy-equipment').forEach(cb => cb.checked = false);
    }
};

window.ProcessTemplatesPage = ProcessTemplatesPage;
