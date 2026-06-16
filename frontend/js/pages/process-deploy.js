/**
 * 工艺模板下发记录页面
 */
const ProcessDeployPage = {
    records: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,

    init() {
        this.loadRecords();
    },

    destroy() {
    },

    async loadRecords() {
        try {
            const response = await ProcessService.getDeployRecords({
                page: this.currentPage,
                size: this.pageSize
            });
            if (response.code === 200) {
                this.records = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载下发记录失败');
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">下发记录</h3>
                    <button class="btn btn-primary" onclick="ProcessDeployPage.showDeployModal()">
                        新下发
                    </button>
                </div>
                <div class="card-body">
                    <div id="deployTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
    },

    renderSubNav() {
        const current = 'process-deploy';
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
        const tableContainer = document.getElementById('deployTable');
        if (!this.records || this.records.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无下发记录</p>';
            return;
        }

        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>下发时间</th>
                            <th>模板名称</th>
                            <th>版本</th>
                            <th>目标设备</th>
                            <th>下发人</th>
                            <th>结果</th>
                            <th>错误信息</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.records.map(r => this.renderRow(r)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    getResultBadge(result) {
        const map = {
            'success': { text: '成功', class: 'badge-success' },
            'failed': { text: '失败', class: 'badge-danger' },
            'partial': { text: '部分成功', class: 'badge-warning' }
        };
        const info = map[result] || { text: result, class: 'badge-secondary' };
        return `<span class="badge ${info.class}">${info.text}</span>`;
    },

    renderRow(record) {
        return `
            <tr>
                <td>${record.deploy_time || '-'}</td>
                <td>${Validator.sanitize(record.template_name || '-')}</td>
                <td>${Validator.sanitize(record.template_version || '-')}</td>
                <td>${Validator.sanitize(record.equipment_name || '-')} (${Validator.sanitize(record.equipment_code || '-')})</td>
                <td>${Validator.sanitize(record.deployer || '-')}</td>
                <td>${this.getResultBadge(record.result)}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" 
                    title="${Validator.sanitize(record.error_msg || '')}">
                    ${Validator.sanitize(record.error_msg || '-')}
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
                            onclick="ProcessDeployPage.changePage(${this.currentPage - 1})"
                            ${this.currentPage <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="ProcessDeployPage.changePage(${this.currentPage + 1})"
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
        this.loadRecords();
    },

    async showDeployModal() {
        try {
            const templatesRes = await ProcessService.getTemplates({ page: 1, size: 100, status: 'active' });
            const equipRes = await ProductionService.getEquipments({ page: 1, size: 100 });

            if (templatesRes.code !== 200) {
                Toast.error('获取模板列表失败');
                return;
            }
            if (equipRes.code !== 200) {
                Toast.error('获取设备列表失败');
                return;
            }

            const templates = templatesRes.data.items || [];
            const equipments = equipRes.data.items || [];

            if (templates.length === 0) {
                Toast.warning('暂无启用状态的模板');
                return;
            }

            const modal = new Modal({
                title: '下发工艺参数',
                content: `
                    <div style="display: grid; gap: 16px;">
                        <div class="form-group" style="margin-bottom: 0;">
                            <label class="form-label">选择模板 <span style="color:red;">*</span></label>
                            <select class="form-control" id="deployTemplate">
                                <option value="">请选择模板</option>
                                ${templates.map(t => `
                                    <option value="${t.id}">
                                        ${Validator.sanitize(t.template_name)} (v${t.version}) - ${t.param_count}个参数
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="form-label" style="display: block; margin-bottom: 8px;">选择目标设备 <span style="color:red;">*</span></label>
                            <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px;">
                                ${equipments.length === 0 ? '<p class="empty-text">暂无设备</p>' : equipments.map(eq => `
                                    <label style="display: flex; align-items: center; padding: 8px; cursor: pointer; border-radius: 4px;" 
                                           onmouseover="this.style.background='var(--bg-light)'" onmouseout="this.style.background='transparent'">
                                        <input type="checkbox" class="deploy-equipment" value="${eq.id}" style="margin-right: 10px;">
                                        <div>
                                            <div style="font-weight: 500;">${Validator.sanitize(eq.equipment_name)}</div>
                                            <div style="font-size: 12px; color: var(--text-secondary);">
                                                ${Validator.sanitize(eq.equipment_code)} | 
                                                ${eq.status === 'running' ? '运行中' : eq.status === 'idle' ? '空闲' : eq.status}
                                            </div>
                                        </div>
                                    </label>
                                `).join('')}
                            </div>
                            <div style="margin-top: 8px; display: flex; gap: 8px;">
                                <button type="button" class="btn btn-sm btn-outline" onclick="ProcessDeployPage.selectAllEquipments()">全选</button>
                                <button type="button" class="btn btn-sm btn-outline" onclick="ProcessDeployPage.clearEquipments()">清空</button>
                            </div>
                        </div>
                        <div style="padding: 12px; background: #fff3cd; border-radius: 8px; font-size: 13px; color: #856404;">
                            ⚠️ 下发将直接更新设备的运行参数，请确认后操作
                        </div>
                    </div>
                `,
                width: '520px',
                confirmText: '确认下发',
                confirmClass: 'btn-success',
                onConfirm: async () => {
                    const templateId = parseInt(document.getElementById('deployTemplate').value);
                    const checked = document.querySelectorAll('.deploy-equipment:checked');
                    const equipmentIds = Array.from(checked).map(cb => parseInt(cb.value));

                    if (!templateId) {
                        Toast.error('请选择模板');
                        return false;
                    }
                    if (equipmentIds.length === 0) {
                        Toast.error('请选择至少一台设备');
                        return false;
                    }

                    const confirmed = await Modal.confirm(`确定要下发到 ${equipmentIds.length} 台设备吗？`);
                    if (!confirmed) return false;

                    const confirmBtn = document.querySelector('.modal-footer .btn-primary, .modal-footer .btn-success');
                    if (confirmBtn) {
                        confirmBtn.disabled = true;
                        confirmBtn.textContent = '下发中...';
                    }

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
                            this.loadRecords();
                            return true;
                        } else {
                            Toast.error(response.message || '下发失败');
                            return false;
                        }
                    } catch (error) {
                        Toast.error('下发失败');
                        return false;
                    } finally {
                        if (confirmBtn) {
                            confirmBtn.disabled = false;
                            confirmBtn.textContent = '确认下发';
                        }
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

window.ProcessDeployPage = ProcessDeployPage;
