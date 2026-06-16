/**
 * 工艺模板版本对比页面
 */
const ProcessComparePage = {
    templates: [],
    selectedTemplateId1: null,
    selectedTemplateId2: null,
    compareResult: null,
    templateCode: '',
    versions: [],

    init() {
        this.loadTemplates();
    },

    destroy() {
    },

    async loadTemplates() {
        try {
            const response = await ProcessService.getTemplates({ page: 1, size: 100 });
            if (response.code === 200) {
                this.templates = response.data.items || [];
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
                    <h3 class="card-title">版本对比</h3>
                </div>
                <div class="card-body">
                    ${this.renderSelector()}
                    <div id="compareResult"></div>
                </div>
            </div>
        `;

        this.bindEvents();
        if (this.compareResult) {
            this.renderCompareResult();
        }
    },

    renderSubNav() {
        const current = 'process-compare';
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

    renderSelector() {
        const templateCodeOptions = [...new Set(this.templates.map(t => t.template_code))];

        return `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; align-items: end;">
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">模板编号</label>
                    <select class="form-control" id="selectTemplateCode">
                        <option value="">请选择模板编号</option>
                        ${templateCodeOptions.map(code => `
                            <option value="${Validator.sanitize(code)}">${Validator.sanitize(code)}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">版本 1（旧版本）</label>
                    <select class="form-control" id="selectVersion1" disabled>
                        <option value="">请先选择模板编号</option>
                    </select>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">版本 2（新版本）</label>
                    <select class="form-control" id="selectVersion2" disabled>
                        <option value="">请先选择模板编号</option>
                    </select>
                </div>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
                <button class="btn btn-primary" id="btnCompare" disabled>
                    开始对比
                </button>
            </div>
        `;
    },

    bindEvents() {
        const codeSelect = document.getElementById('selectTemplateCode');
        const v1Select = document.getElementById('selectVersion1');
        const v2Select = document.getElementById('selectVersion2');
        const compareBtn = document.getElementById('btnCompare');

        if (codeSelect) {
            codeSelect.addEventListener('change', async (e) => {
                const code = e.target.value;
                this.templateCode = code;

                if (!code) {
                    v1Select.innerHTML = '<option value="">请先选择模板编号</option>';
                    v2Select.innerHTML = '<option value="">请先选择模板编号</option>';
                    v1Select.disabled = true;
                    v2Select.disabled = true;
                    compareBtn.disabled = true;
                    this.compareResult = null;
                    document.getElementById('compareResult').innerHTML = '';
                    return;
                }

                try {
                    const response = await ProcessService.getTemplateVersions(code);
                    if (response.code === 200) {
                        this.versions = response.data || [];
                        const options = this.versions.map(v => 
                            `<option value="${v.id}">v${v.version} - ${v.template_name} (${v.status})</option>`
                        ).join('');

                        v1Select.innerHTML = '<option value="">请选择版本</option>' + options;
                        v2Select.innerHTML = '<option value="">请选择版本</option>' + options;
                        v1Select.disabled = false;
                        v2Select.disabled = false;
                    }
                } catch (e) {
                    console.error('加载版本列表失败', e);
                }
            });
        }

        const checkCompareBtn = () => {
            compareBtn.disabled = !(v1Select.value && v2Select.value && v1Select.value !== v2Select.value);
        };

        if (v1Select) v1Select.addEventListener('change', checkCompareBtn);
        if (v2Select) v2Select.addEventListener('change', checkCompareBtn);

        if (compareBtn) {
            compareBtn.addEventListener('click', async () => {
                const id1 = parseInt(v1Select.value);
                const id2 = parseInt(v2Select.value);

                if (!id1 || !id2) {
                    Toast.error('请选择两个版本');
                    return;
                }
                if (id1 === id2) {
                    Toast.error('请选择不同的版本进行对比');
                    return;
                }

                compareBtn.disabled = true;
                compareBtn.textContent = '对比中...';

                try {
                    const response = await ProcessService.compareVersions(id1, id2);
                    if (response.code === 200) {
                        this.compareResult = response.data;
                        this.renderCompareResult();
                        Toast.success('对比完成');
                    } else {
                        Toast.error(response.message || '对比失败');
                    }
                } catch (error) {
                    Toast.error('对比失败');
                } finally {
                    compareBtn.disabled = false;
                    compareBtn.textContent = '开始对比';
                }
            });
        }
    },

    renderCompareResult() {
        const container = document.getElementById('compareResult');
        if (!container || !this.compareResult) return;

        const { template_1, template_2, basic_diff, param_diff } = this.compareResult;

        const basicRows = Object.entries(basic_diff).map(([key, diff]) => {
            const labels = {
                template_name: '模板名称',
                product_name: '关联产品',
                process_step: '关联工序',
                remark: '备注'
            };
            const label = labels[key] || key;
            const oldVal = diff.old || '-';
            const newVal = diff.new || '-';
            const rowClass = diff.changed ? 'diff-modified' : '';
            const oldClass = diff.changed ? 'diff-old' : '';
            const newClass = diff.changed ? 'diff-new' : '';

            return `
                <tr class="${rowClass}">
                    <td style="font-weight: 500; width: 120px;">${label}</td>
                    <td class="${oldClass}" style="width: 35%;">${Validator.sanitize(oldVal)}</td>
                    <td class="${newClass}" style="width: 35%;">${Validator.sanitize(newVal)}</td>
                </tr>
            `;
        }).join('');

        const paramRows = param_diff.map(p => {
            const diffClass = p.diff_type === 'added' ? 'diff-added' :
                             p.diff_type === 'removed' ? 'diff-removed' :
                             p.diff_type === 'modified' ? 'diff-modified' : '';

            const oldVal = p.old_value ? `${p.old_value.param_value ?? '-'} ${p.old_value.unit || ''}`.trim() : '-';
            const newVal = p.new_value ? `${p.new_value.param_value ?? '-'} ${p.new_value.unit || ''}`.trim() : '-';

            const oldRange = p.old_value && (p.old_value.min_value !== null || p.old_value.max_value !== null)
                ? `[${p.old_value.min_value ?? '-'} ~ ${p.old_value.max_value ?? '-'}]` : '';
            const newRange = p.new_value && (p.new_value.min_value !== null || p.new_value.max_value !== null)
                ? `[${p.new_value.min_value ?? '-'} ~ ${p.new_value.max_value ?? '-'}]` : '';

            const oldCellClass = p.diff_type === 'removed' ? 'diff-old' : (p.diff_type === 'modified' ? 'diff-old' : '');
            const newCellClass = p.diff_type === 'added' ? 'diff-new' : (p.diff_type === 'modified' ? 'diff-new' : '');

            return `
                <tr class="${diffClass}">
                    <td style="font-weight: 500; width: 120px;">${Validator.sanitize(p.param_name)}</td>
                    <td class="${oldCellClass}" style="width: 35%;">
                        ${oldVal}
                        ${oldRange ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">量程 ${oldRange}</div>` : ''}
                    </td>
                    <td class="${newCellClass}" style="width: 35%;">
                        ${newVal}
                        ${newRange ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">量程 ${newRange}</div>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        const addedCount = param_diff.filter(p => p.diff_type === 'added').length;
        const removedCount = param_diff.filter(p => p.diff_type === 'removed').length;
        const modifiedCount = param_diff.filter(p => p.diff_type === 'modified').length;

        container.innerHTML = `
            <style>
                .diff-added { background: rgba(40, 167, 69, 0.1); }
                .diff-removed { background: rgba(220, 53, 69, 0.1); }
                .diff-modified { background: rgba(255, 193, 7, 0.1); }
                .diff-new { color: #28a745; }
                .diff-old { color: #dc3545; text-decoration: line-through; text-decoration-color: rgba(220, 53, 69, 0.5); }
            </style>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h4 style="margin: 0;">对比结果</h4>
                <div style="display: flex; gap: 12px; font-size: 13px;">
                    <span style="color: #28a745;">+ 新增 ${addedCount}</span>
                    <span style="color: #dc3545;">- 删除 ${removedCount}</span>
                    <span style="color: #ffc107;">~ 修改 ${modifiedCount}</span>
                </div>
            </div>

            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width: 120px;">属性</th>
                            <th style="width: 44%;">
                                版本 ${template_1.version}
                                <span style="font-weight: normal; font-size: 12px; color: var(--text-secondary);">
                                    (${template_1.status})
                                </span>
                            </th>
                            <th style="width: 44%;">
                                版本 ${template_2.version}
                                <span style="font-weight: normal; font-size: 12px; color: var(--text-secondary);">
                                    (${template_2.status})
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="3" style="background: var(--bg-light); font-weight: 500;">基本信息</td>
                        </tr>
                        ${basicRows}
                        <tr>
                            <td colspan="3" style="background: var(--bg-light); font-weight: 500;">参数列表</td>
                        </tr>
                        ${paramRows || '<tr><td colspan="3" class="empty-text">暂无参数</td></tr>'}
                    </tbody>
                </table>
            </div>

            <div style="display: flex; gap: 16px; margin-top: 16px; padding: 12px; background: var(--bg-light); border-radius: 8px; font-size: 13px;">
                <span><span style="display: inline-block; width: 12px; height: 12px; background: rgba(40, 167, 69, 0.3); margin-right: 6px; vertical-align: middle;"></span>新增</span>
                <span><span style="display: inline-block; width: 12px; height: 12px; background: rgba(220, 53, 69, 0.3); margin-right: 6px; vertical-align: middle;"></span>删除</span>
                <span><span style="display: inline-block; width: 12px; height: 12px; background: rgba(255, 193, 7, 0.3); margin-right: 6px; vertical-align: middle;"></span>修改</span>
            </div>
        `;
    }
};

window.ProcessComparePage = ProcessComparePage;
