/**
 * 维修工单服务
 */
const RepairService = {
    STATUS_LABELS: {
        pending: '待派工',
        dispatched: '已派工',
        repairing: '维修中',
        repaired: '已修复',
        accepted: '已验收',
        closed: '已关闭'
    },
    STATUS_SEVERITY: {
        pending: 'warning',
        dispatched: 'info',
        repairing: 'primary',
        repaired: 'success',
        accepted: 'success',
        closed: 'secondary'
    },
    SEVERITY_LABELS: {
        low: '低',
        medium: '中',
        high: '高',
        critical: '紧急'
    },
    SEVERITY_COLORS: {
        low: '#28a745',
        medium: '#ffc107',
        high: '#fd7e14',
        critical: '#dc3545'
    },

    async getOrders(params = {}) {
        return await Request.get('/repair/list', params);
    },

    async getOrder(orderId) {
        return await Request.get(`/repair/${orderId}`);
    },

    async createOrder(data) {
        return await Request.post('/repair/', data);
    },

    async dispatchOrder(orderId, data) {
        return await Request.post(`/repair/${orderId}/dispatch`, data);
    },

    async startRepair(orderId) {
        return await Request.post(`/repair/${orderId}/start-repair`, {});
    },

    async addProcess(orderId, data) {
        return await Request.post(`/repair/${orderId}/process`, data);
    },

    async deleteProcess(processId) {
        return await Request.delete(`/repair/process/${processId}`);
    },

    async completeRepair(orderId) {
        return await Request.post(`/repair/${orderId}/complete-repair`, {});
    },

    async acceptOrder(orderId, data) {
        return await Request.post(`/repair/${orderId}/accept`, data);
    },

    async closeOrder(orderId) {
        return await Request.post(`/repair/${orderId}/close`, {});
    },

    async changeStatus(orderId, status, data = {}) {
        return await Request.put(`/repair/${orderId}/status`, { status, ...data });
    },

    async getStatistics() {
        return await Request.get('/repair/statistics');
    },

    async getEquipmentHistory(equipmentId, params = {}) {
        return await Request.get(`/repair/equipment/${equipmentId}/history`, params);
    }
};

window.RepairService = RepairService;

/**
 * 报修弹窗工具 - 全局可调用，内部保证设备列表先加载再弹窗
 */
const RepairCreateModal = {
    _equipments: null,
    _loading: false,
    _waiters: [],

    async _getEquipments() {
        if (this._equipments && this._equipments.length > 0) {
            return this._equipments;
        }
        if (this._loading) {
            return new Promise(resolve => this._waiters.push(resolve));
        }
        this._loading = true;
        try {
            const resp = await ProductionService.getEquipments({ size: 200 });
            if (resp.code === 200) {
                this._equipments = resp.data.items || [];
            } else {
                this._equipments = [];
            }
        } catch (e) {
            this._equipments = [];
        }
        this._loading = false;
        const w = this._waiters;
        this._waiters = [];
        w.forEach(fn => fn(this._equipments));
        return this._equipments;
    },

    setEquipmentsCache(list) {
        if (list && list.length) this._equipments = list;
    },

    /**
     * 打开新建报修弹窗
     * @param {Object} prefill - 预填数据 { alert_id, equipment_id, reporter, fault_description, severity }
     * @param {Object} options - { onSuccess } 回调
     */
    async open(prefill = {}, options = {}) {
        const equipments = await this._getEquipments();
        const equipmentOptions = equipments.map(e => {
            const selected = prefill.equipment_id == e.id ? 'selected' : '';
            return `<option value="${e.id}" ${selected}>${e.equipment_code} - ${e.equipment_name}</option>`;
        }).join('');

        const currentUser = AuthService.getCurrentUser();
        const reporter = prefill.reporter || (currentUser ? currentUser.username : '') || '';

        const html = `
            <div class="form-group">
                <label>设备 <span style="color: red;">*</span></label>
                <select class="form-control" name="equipment_id" required>
                    <option value="">请选择设备</option>
                    ${equipmentOptions}
                </select>
            </div>
            <div class="form-group">
                <label>报修人 <span style="color: red;">*</span></label>
                <input type="text" class="form-control" name="reporter" required
                       value="${reporter}"
                       placeholder="请输入报修人">
            </div>
            <div class="form-group">
                <label>故障描述 <span style="color: red;">*</span></label>
                <textarea class="form-control" name="fault_description" required rows="3"
                          placeholder="请详细描述故障现象">${prefill.fault_description || ''}</textarea>
            </div>
            <div class="form-group">
                <label>严重程度</label>
                <select class="form-control" name="severity">
                    <option value="low" ${prefill.severity==='low'?'selected':''}>低</option>
                    <option value="medium" ${prefill.severity==='medium'||!prefill.severity?'selected':''}>中</option>
                    <option value="high" ${prefill.severity==='high'?'selected':''}>高</option>
                    <option value="critical" ${prefill.severity==='critical'?'selected':''}>紧急</option>
                </select>
            </div>
            <div class="form-group">
                <label>附件图片</label>
                <div id="imagePreviewArea" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;"></div>
                <input type="file" class="form-control" id="imageUploader" accept="image/*" multiple>
            </div>
            <div class="form-group">
                <label>备注</label>
                <textarea class="form-control" name="remark" rows="2" placeholder="可选"></textarea>
            </div>
            ${prefill.alert_id ? `<input type="hidden" name="alert_id" value="${prefill.alert_id}">` : ''}
        `;

        const modal = new Modal({
            title: '新建报修单',
            content: html,
            width: '600px',
            confirmText: '提交报修',
            onConfirm: () => {
                const body = modal.modal.querySelector('.modal-body');
                const equipment_id = body.querySelector('[name=equipment_id]').value;
                const reporter_val = body.querySelector('[name=reporter]').value;
                const fault_description = body.querySelector('[name=fault_description]').value;
                const severity = body.querySelector('[name=severity]').value;
                const remark = body.querySelector('[name=remark]')?.value;
                const alert_id = body.querySelector('[name=alert_id]')?.value;

                if (!equipment_id) {
                    Toast.show('请选择设备', 'warning');
                    return false;
                }
                if (!reporter_val) {
                    Toast.show('请填写报修人', 'warning');
                    return false;
                }
                if (!fault_description) {
                    Toast.show('请填写故障描述', 'warning');
                    return false;
                }

                const images = [];
                body.querySelectorAll('#imagePreviewArea img').forEach(img => {
                    images.push(img.src);
                });

                modal.setLoading(true);
                RepairService.createOrder({
                    equipment_id: parseInt(equipment_id),
                    reporter: reporter_val,
                    fault_description,
                    severity,
                    attachment_images: images,
                    remark,
                    alert_id: alert_id ? parseInt(alert_id) : undefined
                }).then(resp => {
                    modal.setLoading(false);
                    if (resp.code === 200 || resp.code === 201) {
                        Toast.success('报修单创建成功');
                        modal.close();
                        if (typeof options.onSuccess === 'function') {
                            try { options.onSuccess(resp.data); } catch(e) {}
                        } else {
                            if (window.RepairOrdersPage && App.currentPage === 'repair-orders') {
                                try {
                                    RepairOrdersPage.loadStatistics();
                                    RepairOrdersPage.loadOrders();
                                } catch(e) {}
                            } else {
                                App.navigate('repair-orders');
                            }
                        }
                    } else {
                        Toast.error(resp.message || '创建失败');
                    }
                }).catch(() => {
                    modal.setLoading(false);
                    Toast.error('创建失败');
                });
                return false;
            }
        }).show();

        const uploader = modal.modal.querySelector('#imageUploader');
        uploader?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files || []);
            const previewArea = modal.modal.querySelector('#imagePreviewArea');
            files.forEach(file => {
                if (!file.type.startsWith('image/')) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const wrapper = document.createElement('div');
                    wrapper.style.cssText = 'position:relative;width:80px;height:80px;border-radius:4px;overflow:hidden;';
                    wrapper.innerHTML = `
                        <img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;">
                        <button type="button" style="position:absolute;top:0;right:0;background:rgba(0,0,0,0.6);color:white;
                            border:none;width:20px;height:20px;cursor:pointer;font-size:12px;">×</button>
                    `;
                    wrapper.querySelector('button').addEventListener('click', () => wrapper.remove());
                    previewArea.appendChild(wrapper);
                };
                reader.readAsDataURL(file);
            });
            uploader.value = '';
        });

        return modal;
    }
};

window.RepairCreateModal = RepairCreateModal;
