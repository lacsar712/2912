/**
 * 工艺模板审核工作台
 */
const ProcessAuditPage = {
    pendingTemplates: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    selectedTemplate: null,

    init() {
        this.loadPendingAudits();
    },

    destroy() {
    },

    async loadPendingAudits() {
        try {
            const response = await ProcessService.getPendingAudits({
                page: this.currentPage,
                size: this.pageSize
            });
            if (response.code === 200) {
                this.pendingTemplates = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载待审核列表失败');
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">审核工作台</h3>
                    <span class="badge badge-warning" style="margin-left: 8px;">待审 ${this.total} 条</span>
                </div>
                <div class="card-body">
                    <div id="auditTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
    },

    renderSubNav() {
        const current = 'process-audit';
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

    renderTable() {
        const tableContainer = document.getElementById('auditTable');
        if (!this.pendingTemplates || this.pendingTemplates.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无待审核的模板</p>';
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
                            <th>创建人</th>
                            <th>提交时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.pendingTemplates.map(t => this.renderRow(t)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(template) {
        return `
            <tr>
                <td>${Validator.sanitize(template.template_code)}</td>
                <td>${Validator.sanitize(template.template_name)}</td>
                <td>${Validator.sanitize(template.product_name || '-')}</td>
                <td>${Validator.sanitize(template.version || '-')}</td>
                <td><span class="badge badge-primary">${template.param_count || 0}</span></td>
                <td>${Validator.sanitize(template.creator || '-')}</td>
                <td>${template.create_time || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="ProcessAuditPage.showDetail(${template.id})">查看</button>
                    <button class="btn btn-sm btn-success" onclick="ProcessAuditPage.auditPass(${template.id})">通过</button>
                    <button class="btn btn-sm btn-danger" onclick="ProcessAuditPage.auditReject(${template.id})">驳回</button>
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
                    共 ${this.total} 条待审记录，第 ${this.currentPage} / ${totalPages} 页
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="ProcessAuditPage.changePage(${this.currentPage - 1})"
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="ProcessAuditPage.changePage(${this.currentPage + 1})"
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
        this.loadPendingAudits();
    },

    async showDetail(id) {
        try {
            const response = await ProcessService.getTemplateById(id);
            if (response.code === 200) {
                const template = response.data;
                const params = template.params || [];

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

                new Modal({
                    title: '模板详情',
                    content: `
                        <div style="display: grid; gap: 16px; max-height: 450px; overflow-y: auto;">
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
                                    <label style="color: var(--text-secondary); font-size: 12px;">创建人</label>
                                    <div style="font-weight: 500;">${Validator.sanitize(template.creator || '-')}</div>
                                </div>
                            </div>
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
                            ${template.remark ? `
                            <div>
                                <label style="color: var(--text-secondary); font-size: 12px;">备注</label>
                                <div>${Validator.sanitize(template.remark)}</div>
                            </div>
                            ` : ''}
                        </div>
                    `,
                    width: '600px',
                    showCancel: false,
                    confirmText: '关闭'
                }).show();
            }
        } catch (error) {
            Toast.error('获取模板详情失败');
        }
    },

    async auditPass(id) {
        const confirmed = await Modal.confirm('确定要审核通过该模板吗？');
        if (!confirmed) return;

        try {
            const response = await ProcessService.auditPass(id);
            if (response.code === 200) {
                Toast.success('审核通过');
                this.loadPendingAudits();
            } else {
                Toast.error(response.message || '操作失败');
            }
        } catch (error) {
            Toast.error('操作失败');
        }
    },

    auditReject(id) {
        const modal = new Modal({
            title: '审核驳回',
            content: `
                <div class="form-group">
                    <label class="form-label">驳回原因</label>
                    <textarea class="form-control" id="rejectComment" rows="4" placeholder="请输入驳回原因"></textarea>
                </div>
            `,
            confirmText: '确认驳回',
            confirmClass: 'btn-danger',
            onConfirm: async () => {
                const comment = document.getElementById('rejectComment').value.trim();
                if (!comment) {
                    Toast.warning('请输入驳回原因');
                    return false;
                }

                try {
                    const response = await ProcessService.auditReject(id, comment);
                    if (response.code === 200) {
                        Toast.success('已驳回');
                        this.loadPendingAudits();
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
    }
};

window.ProcessAuditPage = ProcessAuditPage;
