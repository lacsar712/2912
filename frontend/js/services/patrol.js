/**
 * 巡检管理服务
 */
const PatrolService = {
    // ==================== 巡检路线接口 ====================

    async getRoutes(params = {}) {
        return await Request.get('/patrol/routes', params);
    },

    async getAllRoutes() {
        return await Request.get('/patrol/routes/all');
    },

    async getRoute(routeId) {
        return await Request.get(`/patrol/routes/${routeId}`);
    },

    async createRoute(data) {
        return await Request.post('/patrol/routes', data);
    },

    async updateRoute(routeId, data) {
        return await Request.put(`/patrol/routes/${routeId}`, data);
    },

    async toggleRouteStatus(routeId) {
        return await Request.post(`/patrol/routes/${routeId}/toggle`);
    },

    async deleteRoute(routeId) {
        return await Request.delete(`/patrol/routes/${routeId}`);
    },

    // ==================== 巡检计划接口 ====================

    async getPlans(params = {}) {
        return await Request.get('/patrol/plans', params);
    },

    async getPlan(planId) {
        return await Request.get(`/patrol/plans/${planId}`);
    },

    async createPlan(data) {
        return await Request.post('/patrol/plans', data);
    },

    async updatePlan(planId, data) {
        return await Request.put(`/patrol/plans/${planId}`, data);
    },

    async togglePlanStatus(planId) {
        return await Request.post(`/patrol/plans/${planId}/toggle`);
    },

    async deletePlan(planId) {
        return await Request.delete(`/patrol/plans/${planId}`);
    },

    // ==================== 巡检任务接口 ====================

    async getTasks(params = {}) {
        return await Request.get('/patrol/tasks', params);
    },

    async getTask(taskId) {
        return await Request.get(`/patrol/tasks/${taskId}`);
    },

    async generateTodayTasks() {
        return await Request.post('/patrol/tasks/generate-today');
    },

    async checkOverdueTasks() {
        return await Request.post('/patrol/tasks/check-overdue');
    },

    async startTask(taskId, executor = null) {
        return await Request.post(`/patrol/tasks/${taskId}/start`, { executor });
    },

    async submitTaskResult(taskId, data) {
        return await Request.post(`/patrol/tasks/${taskId}/submit`, data);
    },

    async getStatistics() {
        return await Request.get('/patrol/tasks/statistics');
    },

    async getReport(params = {}) {
        return await Request.get('/patrol/tasks/report', params);
    }
};

window.PatrolService = PatrolService;
