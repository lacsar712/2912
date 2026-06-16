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
