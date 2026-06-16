/**
 * 供应商管理服务
 */
const SupplierService = {
    // 供应商档案
    async getSuppliers(params = {}) {
        return await Request.get('/supplier/suppliers', params);
    },

    async getSupplierById(id) {
        return await Request.get(`/supplier/suppliers/${id}`);
    },

    async createSupplier(data) {
        return await Request.post('/supplier/suppliers', data);
    },

    async updateSupplier(id, data) {
        return await Request.put(`/supplier/suppliers/${id}`, data);
    },

    async deleteSupplier(id) {
        return await Request.delete(`/supplier/suppliers/${id}`);
    },

    // 合同管理
    async getContracts(params = {}) {
        return await Request.get('/supplier/contracts', params);
    },

    async getExpiringContracts(params = {}) {
        return await Request.get('/supplier/contracts/expiring', params);
    },

    async getContractById(id) {
        return await Request.get(`/supplier/contracts/${id}`);
    },

    async createContract(data) {
        return await Request.post('/supplier/contracts', data);
    },

    async updateContract(id, data) {
        return await Request.put(`/supplier/contracts/${id}`, data);
    },

    async deleteContract(id) {
        return await Request.delete(`/supplier/contracts/${id}`);
    },

    async checkContractExpiry() {
        return await Request.post('/supplier/contracts/check-expiry');
    },

    // 月度评分
    async getRatings(params = {}) {
        return await Request.get('/supplier/ratings', params);
    },

    async getRatingById(id) {
        return await Request.get(`/supplier/ratings/${id}`);
    },

    async createRating(data) {
        return await Request.post('/supplier/ratings', data);
    },

    async updateRating(id, data) {
        return await Request.put(`/supplier/ratings/${id}`, data);
    },

    async deleteRating(id) {
        return await Request.delete(`/supplier/ratings/${id}`);
    },

    // 看板
    async getGradingDashboard() {
        return await Request.get('/supplier/dashboard/grading');
    },

    async getDashboardStats() {
        return await Request.get('/supplier/dashboard/stats');
    }
};

window.SupplierService = SupplierService;
