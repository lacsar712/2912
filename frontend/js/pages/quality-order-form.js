/**
 * 质检单录入页面
 */
const QualityOrderFormPage = {
    isEdit: false,
    orderId: null,
    taskId: null,
    templates: [],
    selectedTemplate: null,
    formData: {
        order_code: '',
        task_id: null,
        template_id: null,
        product_name: '',
        product_spec: '',
        sample_quantity: 0,
        inspector: '',
        inspection_time: '',
        overall_result: 'pending',
        remark: '',
        results: [],
        defects: []
    },

    init() {
        const params = this.getUrlParams();
        this.orderId = params.id ? parseInt(params.id) : null;
        this.taskId = params.taskId ? parseInt(params.taskId) : null;
        this.isEdit = !!this.orderId;

        this.loadTemplates().then(() => {
            if (this.isEdit) {
                this.loadOrderDetail();
            } else if (this.taskId) {
                this.loadTaskInfo();
            } else {
                this.render();
            }
        });
    },

    getUrlParams() {
        const hash = window.location.hash;
        const params = {};
        const queryIndex = hash.indexOf('?');
        if (queryIndex > -1) {
            const queryString = hash.substring(queryIndex + 1);
            queryString.split('&').forEach(pair => {
                const [key, value] = pair.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            });
        }
        return params;
    },

    async loadTemplates() {
        try {
            const response = await QualityService.getTemplates({ size: 100, is_active: 1 });
            if (response.code === 200) {
                this.templates = response.data.items || [];
            }
        } catch (error) {
            Toast.error('加载模板失败');
        }
    },

    async loadOrderDetail() {
        try {
            const response = await QualityService.getOrderById(this.orderId);
            if (response.code === 200) {
                const order = response.data;
                this.formData = {
                    order_code: order.order_code,
                    task_id: order.task_id,
                    template_id: order.template_id,
                    product_name: order.product_name || '',
                    product_spec: order.product_spec || '',
                    sample_quantity: order.sample_quantity || 0,
                    inspector: order.inspector || '',
                    inspection_time: order.inspection_time || '',
                    overall_result: order.overall_result || 'pending',
                    remark: order.remark || '',
                    results: order.results || [],
                    defects: order.defects || []
                };
                if (order.template_id) {
                    this.selectedTemplate = this.templates.find(t => t.id === order.template_id) || null;
                }
                this.render();
            }
        } catch (error) {
            Toast.error('加载质检单失败');
        }
    },

    async loadTaskInfo() {
        try {
            const response = await ProductionService.getTasks({ size: 100 });
            if (response.code === 200) {
                const tasks = response.data.items || [];
                const task = tasks.find(t => t.id === this.taskId);
                if (task) {
                    this.formData.product_name = task.product_name || '';
                    this.formData.product_spec = task.product_spec || '';
                    this.formData.task_id = this.taskId;

                    const matchedTemplate = this.templates.find(t =>
                        t.product_name === task.product_name
                    );
                    if (matchedTemplate) {
                        this.selectTemplate(matchedTemplate.id);
                    }
                }
            }
        } catch (e) {
        }
        this.render();
    },

    selectTemplate(templateId) {
        const template = this.templates.find(t => t.id === templateId);
        if (!template) return;

        this.selectedTemplate = template;
        this.formData.template_id = templateId;
        this.formData.product_name = template.product_name || this.formData.product_name;
        this.formData.product_spec = template.product_spec || this.formData.product_spec;

        this.formData.results = (template.items || []).map(item => ({
            item_id: item.id,
            item_name: item.item_name,
            standard: item.standard,
            lower_limit: item.lower_limit,
            upper_limit: item.upper_limit,
            unit: item.unit,
            actual_value: '',
            is_qualified: 1,
            sort_order: item.sort_order
        }));

        this.render();
    },

    render() {
        const container = document.getElementById('pageContainer');
        const title = this.isEdit ? '编辑质检单' : '新建质检单';

        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${title}</h3>
                    <div>
                        <button class="btn btn-outline" onclick="QualityOrderFormPage.goBack()">返回列表</button>
                        <button class="btn btn-primary" onclick="QualityOrderFormPage.save()" style="margin-left: 8px;">保存</button>
                    </div>
                </div>
                <div class="card-body">
                    <form id="orderForm">
                        ${this.renderBasicInfo()}
                        ${this.renderResults()}
                        ${this.renderDefects()}
                        ${this.renderSummary()}
                    </form>
                </div>
            </div>
        `;

        this.bindEvents();
    },

    renderBasicInfo() {
        const templateOptions = this.templates.map(t =>
            `<option value="${t.id}" ${this.formData.template_id === t.id ? 'selected' : ''}>
                ${t.template_name} (${t.product_name || '通用'})
            </option>`
        ).join('');

        return `
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h4 class="card-title">基本信息</h4>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                        <div class="form-group">
                            <label class="form-label">质检单号 <span style="color:red;">*</span></label>
                            <input type="text" class="form-control" name="order_code" 
                                   value="${this.formData.order_code}" ${this.isEdit ? 'readonly' : ''}>
                        </div>
                        <div class="form-group">
                            <label class="form-label">质检模板</label>
                            <select class="form-control" name="template_id" id="templateSelect">
                                <option value="">请选择模板</option>
                                ${templateOptions}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">检测人</label>
                            <input type="text" class="form-control" name="inspector" 
                                   value="${this.formData.inspector}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">产品名称</label>
                            <input type="text" class="form-control" name="product_name" 
                                   value="${this.formData.product_name}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">产品规格</label>
                            <input type="text" class="form-control" name="product_spec" 
                                   value="${this.formData.product_spec}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">检测时间</label>
                            <input type="datetime-local" class="form-control" name="inspection_time" 
                                   value="${this.formData.inspection_time ? this.formData.inspection_time.replace(' ', 'T').slice(0, 16) : ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">抽检数量</label>
                            <input type="number" class="form-control" name="sample_quantity" 
                                   value="${this.formData.sample_quantity}" min="0" id="sampleQuantity">
                        </div>
                        <div class="form-group">
                            <label class="form-label">关联任务ID</label>
                            <input type="number" class="form-control" name="task_id" 
                                   value="${this.formData.task_id || ''}" ${this.taskId ? 'readonly' : ''}>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">备注</label>
                        <textarea class="form-control" name="remark" rows="2">${this.formData.remark}</textarea>
                    </div>
                </div>
            </div>
        `;
    },

    renderResults() {
        const results = this.formData.results || [];

        if (results.length === 0) {
            return `
                <div class="card" style="margin-bottom: 20px;">
                    <div class="card-header">
                        <h4 class="card-title">检测项结果</h4>
                    </div>
                    <div class="card-body">
                        <p class="empty-text">请先选择质检模板</p>
                    </div>
                </div>
            `;
        }

        const rowsHtml = results.map((r, idx) => {
            const isQualified = r.is_qualified === 1;
            const rowStyle = isQualified ? '' : 'background: rgba(220,53,69,0.08);';

            return `
                <tr style="${rowStyle}" data-index="${idx}">
                    <td>${idx + 1}</td>
                    <td>
                        <strong>${Validator.sanitize(r.item_name)}</strong>
                        ${r.required ? '<span class="badge badge-danger" style="margin-left:4px;">必检</span>' : ''}
                    </td>
                    <td>${Validator.sanitize(r.standard || '-')}</td>
                    <td>${r.lower_limit !== null && r.lower_limit !== undefined ? r.lower_limit : '-'}</td>
                    <td>${r.upper_limit !== null && r.upper_limit !== undefined ? r.upper_limit : '-'}</td>
                    <td>${Validator.sanitize(r.unit || '')}</td>
                    <td style="min-width: 120px;">
                        <input type="text" class="form-control form-control-sm result-value" 
                               data-index="${idx}" value="${r.actual_value || ''}" 
                               placeholder="输入实测值">
                    </td>
                    <td style="text-align: center;">
                        <span class="badge ${isQualified ? 'badge-success' : 'badge-danger'} result-badge">
                            ${isQualified ? '合格' : '不合格'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h4 class="card-title">检测项结果</h4>
                </div>
                <div class="card-body">
                    <div class="table-wrapper" style="max-height: 400px; overflow-y: auto;">
                        <table class="data-table" id="resultsTable">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">序号</th>
                                    <th>检测项</th>
                                    <th>标准值</th>
                                    <th>下限</th>
                                    <th>上限</th>
                                    <th>单位</th>
                                    <th>实测值</th>
                                    <th style="width: 80px;">结果</th>
                                </tr>
                            </thead>
                            <tbody id="resultsBody">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderDefects() {
        const defects = this.formData.defects || [];

        const rowsHtml = defects.map((d, idx) => `
            <tr data-index="${idx}">
                <td>${idx + 1}</td>
                <td><input type="text" class="form-control form-control-sm defect-type" data-index="${idx}" value="${d.defect_type || ''}" placeholder="缺陷类型"></td>
                <td>
                    <select class="form-control form-control-sm defect-severity" data-index="${idx}">
                        <option value="minor" ${d.severity === 'minor' ? 'selected' : ''}>轻微</option>
                        <option value="major" ${d.severity === 'major' ? 'selected' : ''}>严重</option>
                        <option value="critical" ${d.severity === 'critical' ? 'selected' : ''}>致命</option>
                    </select>
                </td>
                <td>
                    <select class="form-control form-control-sm defect-disposition" data-index="${idx}">
                        <option value="">请选择</option>
                        <option value="rework" ${d.disposition === 'rework' ? 'selected' : ''}>返工</option>
                        <option value="scrap" ${d.disposition === 'scrap' ? 'selected' : ''}>报废</option>
                        <option value="concession" ${d.disposition === 'concession' ? 'selected' : ''}>让步接收</option>
                    </select>
                </td>
                <td style="width: 80px;">
                    <input type="number" class="form-control form-control-sm defect-quantity" 
                           data-index="${idx}" value="${d.quantity || 1}" min="1">
                </td>
                <td><input type="text" class="form-control form-control-sm defect-desc" data-index="${idx}" value="${d.description || ''}" placeholder="缺陷描述"></td>
                <td style="width: 60px; text-align: center;">
                    <button type="button" class="btn btn-sm btn-danger" onclick="QualityOrderFormPage.removeDefect(${idx})">删除</button>
                </td>
            </tr>
        `).join('');

        return `
            <div class="card" style="margin-bottom: 20px;">
                <div class="card-header">
                    <h4 class="card-title">不合格记录</h4>
                    <button type="button" class="btn btn-sm btn-primary" onclick="QualityOrderFormPage.addDefect()">
                        + 添加缺陷
                    </button>
                </div>
                <div class="card-body">
                    <div class="table-wrapper" style="max-height: 300px; overflow-y: auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">序号</th>
                                    <th>缺陷类型</th>
                                    <th style="width: 100px;">严重程度</th>
                                    <th style="width: 120px;">处置建议</th>
                                    <th style="width: 80px;">数量</th>
                                    <th>描述</th>
                                    <th style="width: 60px;">操作</th>
                                </tr>
                            </thead>
                            <tbody id="defectsBody">
                                ${rowsHtml || '<tr><td colspan="7" class="empty-text">暂无不合格记录</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    renderSummary() {
        const results = this.formData.results || [];
        const defects = this.formData.defects || [];
        const qualifiedCount = results.filter(r => r.is_qualified === 1).length;
        const unqualifiedCount = results.filter(r => r.is_qualified === 0).length;
        const totalDefectQty = defects.reduce((sum, d) => sum + (d.quantity || 0), 0);

        const overallResult = this.formData.overall_result;
        const resultMap = {
            pending: { text: '待检', class: 'badge-warning' },
            qualified: { text: '合格', class: 'badge-success' },
            unqualified: { text: '不合格', class: 'badge-danger' }
        };

        return `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">统计汇总</h4>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
                        <div style="text-align: center; padding: 16px; background: var(--bg-light); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold; color: var(--primary-color);">${results.length}</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">检测项数</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: rgba(40,167,69,0.1); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold; color: #28a745;">${qualifiedCount}</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">合格项数</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: rgba(220,53,69,0.1); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold; color: #dc3545;">${unqualifiedCount}</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">不合格项数</div>
                        </div>
                        <div style="text-align: center; padding: 16px; background: rgba(255,193,7,0.1); border-radius: 8px;">
                            <div style="font-size: 28px; font-weight: bold; color: #ffc107;">${totalDefectQty}</div>
                            <div style="font-size: 13px; color: var(--text-secondary);">缺陷总数</div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <label style="font-weight: 500;">整体结论：</label>
                            <span class="badge ${resultMap[overallResult]?.class || 'badge-secondary'}" style="font-size: 14px; padding: 6px 16px;">
                                ${resultMap[overallResult]?.text || '待检'}
                            </span>
                        </div>
                        <button type="button" class="btn btn-sm btn-success" onclick="QualityOrderFormPage.setOverallResult('qualified')">
                            判定合格
                        </button>
                        <button type="button" class="btn btn-sm btn-danger" onclick="QualityOrderFormPage.setOverallResult('unqualified')">
                            判定不合格
                        </button>
                        <button type="button" class="btn btn-sm btn-secondary" onclick="QualityOrderFormPage.setOverallResult('pending')">
                            重置为待检
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    bindEvents() {
        const templateSelect = document.getElementById('templateSelect');
        if (templateSelect) {
            templateSelect.addEventListener('change', (e) => {
                const templateId = parseInt(e.target.value);
                if (templateId) {
                    this.selectTemplate(templateId);
                } else {
                    this.selectedTemplate = null;
                    this.formData.template_id = null;
                    this.formData.results = [];
                    this.render();
                }
            });
        }

        document.querySelectorAll('.result-value').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const value = e.target.value;
                this.updateResultValue(idx, value);
            });
        });

        document.querySelectorAll('.defect-type, .defect-severity, .defect-disposition, .defect-quantity, .defect-desc').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.index);
                const field = e.target.className.includes('defect-type') ? 'defect_type' :
                              e.target.className.includes('defect-severity') ? 'severity' :
                              e.target.className.includes('defect-disposition') ? 'disposition' :
                              e.target.className.includes('defect-quantity') ? 'quantity' : 'description';
                const value = e.target.value;
                this.updateDefectField(idx, field, value);
            });
        });
    },

    updateResultValue(idx, value) {
        if (!this.formData.results[idx]) return;

        this.formData.results[idx].actual_value = value;

        const result = this.formData.results[idx];
        let isQualified = 1;

        if (value !== '' && value !== null && value !== undefined) {
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                if (result.lower_limit !== null && result.lower_limit !== undefined &&
                    numValue < parseFloat(result.lower_limit)) {
                    isQualified = 0;
                }
                if (result.upper_limit !== null && result.upper_limit !== undefined &&
                    numValue > parseFloat(result.upper_limit)) {
                    isQualified = 0;
                }
            }
        }

        this.formData.results[idx].is_qualified = isQualified;

        const row = document.querySelector(`#resultsBody tr[data-index="${idx}"]`);
        if (row) {
            row.style.background = isQualified === 0 ? 'rgba(220,53,69,0.08)' : '';
            const badge = row.querySelector('.result-badge');
            if (badge) {
                badge.textContent = isQualified === 1 ? '合格' : '不合格';
                badge.className = `badge ${isQualified === 1 ? 'badge-success' : 'badge-danger'} result-badge`;
            }
        }

        this.updateSummaryDisplay();
    },

    updateSummaryDisplay() {
        const results = this.formData.results || [];
        const defects = this.formData.defects || [];
        const qualifiedCount = results.filter(r => r.is_qualified === 1).length;
        const unqualifiedCount = results.filter(r => r.is_qualified === 0).length;
        const totalDefectQty = defects.reduce((sum, d) => sum + (parseInt(d.quantity) || 0), 0);

        const cards = document.querySelectorAll('.card:last-child .card-body > div:first-child > div');
        if (cards.length === 4) {
            cards[0].querySelector('div:first-child').textContent = results.length;
            cards[1].querySelector('div:first-child').textContent = qualifiedCount;
            cards[2].querySelector('div:first-child').textContent = unqualifiedCount;
            cards[3].querySelector('div:first-child').textContent = totalDefectQty;
        }
    },

    addDefect() {
        this.formData.defects.push({
            defect_type: '',
            severity: 'minor',
            disposition: '',
            quantity: 1,
            description: ''
        });
        this.render();
    },

    removeDefect(idx) {
        this.formData.defects.splice(idx, 1);
        this.render();
    },

    updateDefectField(idx, field, value) {
        if (!this.formData.defects[idx]) return;
        if (field === 'quantity') {
            this.formData.defects[idx][field] = parseInt(value) || 1;
        } else {
            this.formData.defects[idx][field] = value;
        }
        this.updateSummaryDisplay();
    },

    setOverallResult(result) {
        this.formData.overall_result = result;
        this.render();
    },

    collectFormData() {
        const form = document.getElementById('orderForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });

        this.formData.order_code = data.order_code;
        this.formData.task_id = data.task_id ? parseInt(data.task_id) : null;
        this.formData.template_id = data.template_id ? parseInt(data.template_id) : null;
        this.formData.product_name = data.product_name;
        this.formData.product_spec = data.product_spec;
        this.formData.sample_quantity = parseInt(data.sample_quantity) || 0;
        this.formData.inspector = data.inspector;
        this.formData.inspection_time = data.inspection_time ? data.inspection_time.replace('T', ' ') + ':00' : '';
        this.formData.remark = data.remark;
    },

    async save() {
        this.collectFormData();

        if (!this.formData.order_code) {
            Toast.error('请填写质检单号');
            return;
        }

        const data = {
            ...this.formData,
            qualified_quantity: this.formData.results.filter(r => r.is_qualified === 1).length,
            unqualified_quantity: this.formData.results.filter(r => r.is_qualified === 0).length
        };

        try {
            let response;
            if (this.isEdit) {
                response = await QualityService.updateOrder(this.orderId, data);
            } else {
                response = await QualityService.createOrder(data);
            }

            if (response.code === 200 || response.code === 201) {
                Toast.success(this.isEdit ? '更新成功' : '创建成功');
                this.goBack();
            } else {
                Toast.error(response.message || '保存失败');
            }
        } catch (error) {
            Toast.error('保存失败');
        }
    },

    goBack() {
        window.location.hash = 'quality-orders';
    }
};

window.QualityOrderFormPage = QualityOrderFormPage;
