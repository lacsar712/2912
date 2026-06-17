/**
 * 能源管理服务
 */
const EnergyService = {
    async getEnergyTypes(params = {}) {
        return await Request.get('/energy/types', params);
    },

    async getAllEnergyTypes() {
        return await Request.get('/energy/types/all');
    },

    async getEnergyTypeById(id) {
        return await Request.get(`/energy/types/${id}`);
    },

    async createEnergyType(data) {
        return await Request.post('/energy/types', data);
    },

    async updateEnergyType(id, data) {
        return await Request.put(`/energy/types/${id}`, data);
    },

    async deleteEnergyType(id) {
        return await Request.delete(`/energy/types/${id}`);
    },

    async getMeteringPoints(params = {}) {
        return await Request.get('/energy/metering-points', params);
    },

    async getMeteringPointById(id) {
        return await Request.get(`/energy/metering-points/${id}`);
    },

    async createMeteringPoint(data) {
        return await Request.post('/energy/metering-points', data);
    },

    async updateMeteringPoint(id, data) {
        return await Request.put(`/energy/metering-points/${id}`, data);
    },

    async deleteMeteringPoint(id) {
        return await Request.delete(`/energy/metering-points/${id}`);
    },

    async getWorkshops() {
        return await Request.get('/energy/workshops');
    },

    async getReadings(params = {}) {
        return await Request.get('/energy/readings', params);
    },

    async createReading(data) {
        return await Request.post('/energy/readings', data);
    },

    async batchImportReadings(readings) {
        return await Request.post('/energy/readings/batch', { readings });
    },

    async deleteReading(id) {
        return await Request.delete(`/energy/readings/${id}`);
    },

    async getPrices(params = {}) {
        return await Request.get('/energy/prices', params);
    },

    async createPrice(data) {
        return await Request.post('/energy/prices', data);
    },

    async updatePrice(id, data) {
        return await Request.put(`/energy/prices/${id}`, data);
    },

    async deletePrice(id) {
        return await Request.delete(`/energy/prices/${id}`);
    },

    async calculateMonthlyCost(data) {
        return await Request.post('/energy/cost/calculate', data);
    },

    async getMonthlyCost(params = {}) {
        return await Request.get('/energy/cost/monthly', params);
    },

    async getCostComparison(params = {}) {
        return await Request.get('/energy/cost/comparison', params);
    },

    async getDashboard() {
        return await Request.get('/energy/dashboard');
    },

    async getConsumptionTrend(params = {}) {
        return await Request.get('/energy/dashboard/trend', params);
    },

    async getWorkshopComparison(params = {}) {
        return await Request.get('/energy/dashboard/workshop-comparison', params);
    },

    async getTodayCost() {
        return await Request.get('/energy/dashboard/today-cost');
    },

    async getAggregatedStats(params = {}) {
        return await Request.get('/energy/stats/aggregated', params);
    }
};

window.EnergyService = EnergyService;
