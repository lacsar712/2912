/**
 * 库存管理服务
 */
const InventoryService = {
    // 物料档案
    async getMaterials(params = {}) {
        return await Request.get('/inventory/materials', params);
    },

    async getMaterialById(id) {
        return await Request.get(`/inventory/materials/${id}`);
    },

    async getMaterialCategories() {
        return await Request.get('/inventory/materials/categories');
    },

    async createMaterial(data) {
        return await Request.post('/inventory/materials', data);
    },

    async updateMaterial(id, data) {
        return await Request.put(`/inventory/materials/${id}`, data);
    },

    async toggleMaterialStatus(id) {
        return await Request.post(`/inventory/materials/${id}/toggle`);
    },

    async deleteMaterial(id) {
        return await Request.delete(`/inventory/materials/${id}`);
    },

    async getLowStockMaterials(limit = 10) {
        return await Request.get('/inventory/materials/low-stock', { limit });
    },

    async getInventoryView(params = {}) {
        return await Request.get('/inventory/materials/view', params);
    },

    // 入库单
    async getStockIns(params = {}) {
        return await Request.get('/inventory/stock-in', params);
    },

    async createStockIn(data) {
        return await Request.post('/inventory/stock-in', data);
    },

    // 出库单
    async getStockOuts(params = {}) {
        return await Request.get('/inventory/stock-out', params);
    },

    async createStockOut(data) {
        return await Request.post('/inventory/stock-out', data);
    },

    // 库存流水
    async getStockFlows(params = {}) {
        return await Request.get('/inventory/stock-flow', params);
    },

    // 统计
    async getInventoryStats() {
        return await Request.get('/inventory/stats');
    },

    async getStockTrend(days = 7) {
        return await Request.get('/inventory/trend', { days });
    },

    async getInventoryDashboard() {
        return await Request.get('/inventory/dashboard');
    }
};

window.InventoryService = InventoryService;
