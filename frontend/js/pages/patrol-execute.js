/**
 * 巡检任务执行界面
 */
const PatrolExecutePage = {
    taskId: null,
    task: null,
    isView: false,
    results: {},
    images: {},

    init() {
        const hash = window.location.hash.slice(1);
        const params = new URLSearchParams(hash.split('?')[1] || '');
        this.taskId = parseInt(params.get('id'));
        this.isView = params.get('view') === '1';

        if (!this.taskId) {
            Toast.warning('无效的任务ID');
            App.navigate('patrol-tasks');
            return;
        }

        this.loadTask();
    },

    async loadTask() {
        try {
            const response = await PatrolService.getTask(this.taskId);
            if (response.code === 200) {
                this.task = response.data;
                
                if (this.isView && this.task.status !== 'completed') {
                    Toast.warning('该任务尚未完成');
                }

                if (!this.isView && this.task.status === 'completed') {
                    Toast.warning('该任务已完成');
                    this.isView = true;
                }

                this.initResults();
                this.render();
            }
        } catch (error) {
            Toast.error('加载任务详情失败');
        }
    },

    getDraftKey() {
        return `patrol_draft_${this.taskId}`;
    },

    saveDraft() {
        if (this.isView || this.task?.status === 'completed') return;
        try {
            const draft = {
                results: this.results,
                images: this.images,
                timestamp: Date.now()
            };
            localStorage.setItem(this.getDraftKey(), JSON.stringify(draft));
        } catch (e) {
            console.warn('保存草稿失败:', e);
        }
    },

    loadDraft() {
        if (this.isView || this.task?.status === 'completed') return false;
        try {
            const draftStr = localStorage.getItem(this.getDraftKey());
            if (!draftStr) return false;
            const draft = JSON.parse(draftStr);
            if (draft.results) {
                this.results = { ...this.results, ...draft.results };
            }
            if (draft.images) {
                this.images = { ...this.images, ...draft.images };
            }
            return true;
        } catch (e) {
            console.warn('加载草稿失败:', e);
            return false;
        }
    },

    clearDraft() {
        try {
            localStorage.removeItem(this.getDraftKey());
        } catch (e) {
            console.warn('清除草稿失败:', e);
        }
    },

    initResults() {
        this.results = {};
        this.images = {};
        
        if (this.task.results && this.task.results.length > 0) {
            for (const r of this.task.results) {
                const key = `${r.checkpoint_id}_${r.item_id}`;
                this.results[key] = {
                    actual_value: r.actual_value || '',
                    is_abnormal: r.is_abnormal,
                    remark: r.remark || ''
                };
                if (r.images) {
                    try {
                        this.images[key] = JSON.parse(r.images);
                    } catch (e) {
                        this.images[key] = [];
                    }
                }
            }
        }
        
        if (this.task.checkpoints) {
            for (const cp of this.task.checkpoints) {
                if (cp.items) {
                    for (const item of cp.items) {
                        const key = `${cp.id}_${item.id}`;
                        if (!this.results[key]) {
                            this.results[key] = {
                                actual_value: '',
                                is_abnormal: 0,
                                remark: ''
                            };
                        }
                        if (!this.images[key]) {
                            this.images[key] = [];
                        }
                    }
                }
            }
        }

        this.loadDraft();
    },

    render() {
        const container = document.getElementById('pageContainer');
        const statusMap = {
            pending: '待执行',
            in_progress: '进行中',
            completed: '已完成',
            overdue: '已逾期'
        };

        container.innerHTML = `
            <div class="patrol-execute-container">
                <div class="card">
                    <div class="card-header">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <button class="btn btn-outline" onclick="App.navigate('patrol-tasks')">← 返回列表</button>
                            <h3 class="card-title m-0">${this.isView ? '查看巡检结果' : '执行巡检任务'}</h3>
                        </div>
                        <div>
                            <span class="badge badge-secondary">${statusMap[this.task.status] || this.task.status}</span>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="task-info-bar">
                            <div class="info-item">
                                <span class="info-label">任务编号:</span>
                                <span class="info-value">${Validator.sanitize(this.task.task_code)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">巡检路线:</span>
                                <span class="info-value">${Validator.sanitize(this.task.route_name || '-')}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">执行人:</span>
                                <span class="info-value">${Validator.sanitize(this.task.executor || '-')}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">应完成时间:</span>
                                <span class="info-value">${Formatter.formatDateTime(this.task.due_time)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="checkpointsContainer" class="checkpoints-execute-container">
                    ${(this.task.checkpoints || []).map((cp, idx) => this.renderCheckpointCard(cp, idx)).join('')}
                </div>

                ${!this.isView ? `
                    <div class="submit-bar">
                        <div style="color: var(--text-secondary);">
                            <span id="progressText">已完成: 0 / ${this.getTotalItems()} 项</span>
                            <span id="abnormalText" style="margin-left: 16px; display: none;">异常: <span class="text-danger">0</span> 项</span>
                        </div>
                        <button class="btn btn-primary btn-lg" onclick="PatrolExecutePage.submitResults()">
                            提交巡检结果
                        </button>
                    </div>
                ` : `
                    <div class="submit-bar">
                        <div style="color: var(--text-secondary);">
                            实际开始时间: ${Formatter.formatDateTime(this.task.start_time)} | 
                            实际完成时间: ${Formatter.formatDateTime(this.task.end_time)}
                        </div>
                        <button class="btn btn-outline" onclick="App.navigate('patrol-tasks')">
                            返回列表
                        </button>
                    </div>
                `}
            </div>
        `;

        if (!this.isView) {
            this.updateProgress();
        }
    },

    getTotalItems() {
        let count = 0;
        if (this.task.checkpoints) {
            for (const cp of this.task.checkpoints) {
                count += (cp.items || []).length;
            }
        }
        return count;
    },

    renderCheckpointCard(checkpoint, index) {
        return `
            <div class="checkpoint-execute-card" id="checkpoint-${checkpoint.id}">
                <div class="checkpoint-execute-header">
                    <div class="checkpoint-number">${index + 1}</div>
                    <div style="flex: 1;">
                        <h4 class="checkpoint-execute-title">${Validator.sanitize(checkpoint.checkpoint_name)}</h4>
                        <div class="checkpoint-execute-meta">
                            ${checkpoint.equipment_name ? `<span>设备: ${Validator.sanitize(checkpoint.equipment_name)}</span>` : ''}
                            ${checkpoint.location ? `<span>位置: ${Validator.sanitize(checkpoint.location)}</span>` : ''}
                        </div>
                    </div>
                    <div class="checkpoint-status" id="cp-status-${checkpoint.id}">
                        <span class="badge badge-secondary">未完成</span>
                    </div>
                </div>
                <div class="checkpoint-execute-body">
                    ${(checkpoint.items || []).map(item => this.renderItemRow(checkpoint, item)).join('')}
                </div>
            </div>
        `;
    },

    renderItemRow(checkpoint, item) {
        const key = `${checkpoint.id}_${item.id}`;
        const result = this.results[key] || {};
        const isAbnormal = result.is_abnormal === 1;

        let inputHtml = '';
        if (this.isView) {
            inputHtml = `<div class="readonly-value">${Validator.sanitize(result.actual_value || '-')}</div>`;
        } else if (item.item_type === 'select') {
            let options = [];
            try {
                options = item.options ? JSON.parse(item.options) : [];
            } catch (e) {
                options = [];
            }
            const optionsHtml = options.map(opt => 
                `<option value="${opt}" ${result.actual_value == opt ? 'selected' : ''}>${opt}</option>`
            ).join('');
            inputHtml = `
                <select class="form-input item-input" data-key="${key}" onchange="PatrolExecutePage.updateResult('${key}')">
                    <option value="">请选择</option>
                    ${optionsHtml}
                </select>
            `;
        } else {
            inputHtml = `
                <input type="text" class="form-input item-input" data-key="${key}" 
                       value="${Validator.sanitize(result.actual_value || '')}" 
                       placeholder="请输入实际值"
                       onchange="PatrolExecutePage.updateResult('${key}')"
                       oninput="PatrolExecutePage.updateResult('${key}')">
            `;
        }

        return `
            <div class="item-execute-row ${isAbnormal ? 'item-abnormal' : ''}" id="item-row-${key}">
                <div class="item-execute-info">
                    <div class="item-execute-name">
                        ${Validator.sanitize(item.item_name)}
                        ${item.is_required === 1 ? '<span class="text-danger">*</span>' : ''}
                    </div>
                    <div class="item-execute-standard">
                        标准: ${Validator.sanitize(item.expected_value || '-')}
                        ${item.unit ? ` (${Validator.sanitize(item.unit)})` : ''}
                    </div>
                </div>
                <div class="item-execute-input">
                    ${inputHtml}
                </div>
                ${!this.isView ? `
                    <div class="item-execute-actions">
                        <label class="abnormal-toggle">
                            <input type="checkbox" class="abnormal-checkbox" data-key="${key}" 
                                   ${isAbnormal ? 'checked' : ''}
                                   onchange="PatrolExecutePage.toggleAbnormal('${key}')">
                            <span>异常</span>
                        </label>
                        <button type="button" class="btn btn-sm btn-outline" onclick="PatrolExecutePage.triggerImageUpload('${key}')">
                            📷 拍照
                        </button>
                        <input type="file" class="image-upload" id="upload-${key}" accept="image/*" capture="environment" 
                               style="display: none;" onchange="PatrolExecutePage.handleImageUpload('${key}', event)">
                    </div>
                ` : ''}
                ${!this.isView ? `
                    <div class="item-execute-remark">
                        <input type="text" class="form-input remark-input" data-key="${key}" 
                               value="${Validator.sanitize(result.remark || '')}" 
                               placeholder="备注信息"
                               onchange="PatrolExecutePage.updateResult('${key}')">
                    </div>
                ` : `
                    ${result.remark ? `
                        <div class="item-execute-remark">
                            <span class="text-muted">备注: </span>${Validator.sanitize(result.remark)}
                        </div>
                    ` : ''}
                `}
                <div class="item-execute-images" id="images-${key}">
                    ${(this.images[key] || []).map((img, imgIdx) => `
                        <div class="image-preview">
                            <img src="${img}" alt="现场图片" onclick="PatrolExecutePage.viewImage('${img}')">
                            ${!this.isView ? `
                                <button type="button" class="image-remove" onclick="PatrolExecutePage.removeImage('${key}', ${imgIdx})">×</button>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    updateResult(key) {
        const input = document.querySelector(`.item-input[data-key="${key}"]`);
        const remarkInput = document.querySelector(`.remark-input[data-key="${key}"]`);
        const checkbox = document.querySelector(`.abnormal-checkbox[data-key="${key}"]`);

        if (!this.results[key]) {
            this.results[key] = {};
        }
        if (input) {
            this.results[key].actual_value = input.value;
        }
        if (remarkInput) {
            this.results[key].remark = remarkInput.value;
        }
        if (checkbox) {
            this.results[key].is_abnormal = checkbox.checked ? 1 : 0;
        }

        this.updateItemRow(key);
        this.updateProgress();
        this.saveDraft();
    },

    toggleAbnormal(key) {
        const checkbox = document.querySelector(`.abnormal-checkbox[data-key="${key}"]`);
        if (!this.results[key]) {
            this.results[key] = {};
        }
        this.results[key].is_abnormal = checkbox.checked ? 1 : 0;
        this.updateItemRow(key);
        this.updateProgress();
        this.saveDraft();
    },

    updateItemRow(key) {
        const row = document.getElementById(`item-row-${key}`);
        if (row) {
            const result = this.results[key] || {};
            row.classList.toggle('item-abnormal', result.is_abnormal === 1);
        }

        const cpId = key.split('_')[0];
        this.updateCheckpointStatus(cpId);
    },

    updateCheckpointStatus(cpId) {
        const cp = this.task.checkpoints?.find(c => c.id == cpId);
        if (!cp) return;

        let completed = 0;
        let abnormal = 0;
        const total = (cp.items || []).length;

        for (const item of cp.items) {
            const key = `${cpId}_${item.id}`;
            const result = this.results[key] || {};
            if (result.actual_value && result.actual_value.trim()) {
                completed++;
            }
            if (result.is_abnormal === 1) {
                abnormal++;
            }
        }

        const statusEl = document.getElementById(`cp-status-${cpId}`);
        if (statusEl) {
            if (completed === total) {
                statusEl.innerHTML = abnormal > 0 
                    ? `<span class="badge badge-danger">有异常</span>`
                    : `<span class="badge badge-success">已完成</span>`;
            } else if (completed > 0) {
                statusEl.innerHTML = `<span class="badge badge-primary">进行中 ${completed}/${total}</span>`;
            } else {
                statusEl.innerHTML = `<span class="badge badge-secondary">未完成</span>`;
            }
        }
    },

    updateProgress() {
        let completed = 0;
        let abnormal = 0;
        let total = 0;

        if (this.task.checkpoints) {
            for (const cp of this.task.checkpoints) {
                if (cp.items) {
                    for (const item of cp.items) {
                        total++;
                        const key = `${cp.id}_${item.id}`;
                        const result = this.results[key] || {};
                        if (result.actual_value && result.actual_value.trim()) {
                            completed++;
                        }
                        if (result.is_abnormal === 1) {
                            abnormal++;
                        }
                    }
                }
            }
        }

        const progressText = document.getElementById('progressText');
        const abnormalText = document.getElementById('abnormalText');

        if (progressText) {
            progressText.textContent = `已完成: ${completed} / ${total} 项`;
        }
        if (abnormalText) {
            if (abnormal > 0) {
                abnormalText.style.display = 'inline';
                abnormalText.innerHTML = `异常: <span class="text-danger">${abnormal}</span> 项`;
            } else {
                abnormalText.style.display = 'none';
            }
        }
    },

    triggerImageUpload(key) {
        document.getElementById(`upload-${key}`)?.click();
    },

    handleImageUpload(key, event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (!this.images[key]) {
                this.images[key] = [];
            }
            this.images[key].push(e.target.result);
            this.updateImagesDisplay(key);
            this.saveDraft();
        };
        reader.readAsDataURL(file);
    },

    removeImage(key, index) {
        if (this.images[key]) {
            this.images[key].splice(index, 1);
            this.updateImagesDisplay(key);
            this.saveDraft();
        }
    },

    updateImagesDisplay(key) {
        const container = document.getElementById(`images-${key}`);
        if (!container) return;

        container.innerHTML = (this.images[key] || []).map((img, imgIdx) => `
            <div class="image-preview">
                <img src="${img}" alt="现场图片" onclick="PatrolExecutePage.viewImage('${img}')">
                <button type="button" class="image-remove" onclick="PatrolExecutePage.removeImage('${key}', ${imgIdx})">×</button>
            </div>
        `).join('');
    },

    viewImage(src) {
        new Modal({
            title: '图片预览',
            content: `<img src="${src}" style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto;">`,
            width: '80vw',
            showFooter: false
        }).show();
    },

    async submitResults() {
        const results = [];
        let hasMissingRequired = false;

        if (this.task.checkpoints) {
            for (const cp of this.task.checkpoints) {
                if (cp.items) {
                    for (const item of cp.items) {
                        const key = `${cp.id}_${item.id}`;
                        const result = this.results[key] || {};

                        if (item.is_required === 1 && !result.actual_value?.trim()) {
                            hasMissingRequired = true;
                            Toast.warning(`请填写必填项: ${item.item_name}`);
                            const row = document.getElementById(`item-row-${key}`);
                            if (row) {
                                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }
                            return;
                        }

                        if (result.actual_value?.trim()) {
                            results.push({
                                checkpoint_id: cp.id,
                                item_id: item.id,
                                actual_value: result.actual_value,
                                is_abnormal: result.is_abnormal || 0,
                                remark: result.remark || '',
                                images: this.images[key] || []
                            });
                        }
                    }
                }
            }
        }

        if (results.length === 0) {
            Toast.warning('请至少填写一项巡检结果');
            return;
        }

        const confirmed = await Modal.confirm(`确定提交巡检结果吗？共 ${results.length} 项，异常 ${results.filter(r => r.is_abnormal).length} 项。`);
        if (!confirmed) return;

        try {
            const response = await PatrolService.submitTaskResult(this.taskId, { results });
            if (response.code === 200) {
                Toast.success(response.message || '提交成功');
                this.clearDraft();
                App.navigate('patrol-tasks');
            } else {
                Toast.error(response.message || '提交失败');
            }
        } catch (error) {
            Toast.error('提交失败');
        }
    },

    destroy() {
        this.taskId = null;
        this.task = null;
        this.results = {};
        this.images = {};
    }
};

window.PatrolExecutePage = PatrolExecutePage;
