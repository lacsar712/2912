/**
 * 质检管理服务
 */
const QualityService = {
    // 质检模板
    async getTemplates(params = {}) {
        return await Request.get('/quality/templates', params);
    },

    async getTemplateById(id) {
        return await Request.get(`/quality/templates/${id}`);
    },

    async createTemplate(data) {
        return await Request.post('/quality/templates', data);
    },

    async updateTemplate(id, data) {
        return await Request.put(`/quality/templates/${id}`, data);
    },

    async deleteTemplate(id) {
        return await Request.delete(`/quality/templates/${id}`);
    },

    async toggleTemplateStatus(id) {
        return await Request.post(`/quality/templates/${id}/toggle`);
    },

    // 质检单
    async getOrders(params = {}) {
        return await Request.get('/quality/orders', params);
    },

    async getOrderById(id) {
        return await Request.get(`/quality/orders/${id}`);
    },

    async getOrderByTask(taskId) {
        return await Request.get(`/quality/orders/task/${taskId}`);
    },

    async createOrder(data) {
        return await Request.post('/quality/orders', data);
    },

    async updateOrder(id, data) {
        return await Request.put(`/quality/orders/${id}`, data);
    },

    async deleteOrder(id) {
        return await Request.delete(`/quality/orders/${id}`);
    },

    // 不合格记录
    async getDefects(params = {}) {
        return await Request.get('/quality/defects', params);
    },

    async getDefectById(id) {
        return await Request.get(`/quality/defects/${id}`);
    },

    async createDefect(data) {
        return await Request.post('/quality/defects', data);
    },

    async updateDefect(id, data) {
        return await Request.put(`/quality/defects/${id}`, data);
    },

    async deleteDefect(id) {
        return await Request.delete(`/quality/defects/${id}`);
    },

    // 统计分析
    async getPareto(days = 30) {
        return await Request.get('/quality/statistics/pareto', { days });
    },

    async getOverview() {
        return await Request.get('/quality/statistics/overview');
    },

    // 任务同步
    async syncTask(taskId) {
        return await Request.post(`/quality/sync/task/${taskId}`);
    }
};

window.QualityService = QualityService;
