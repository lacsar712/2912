/**
 * 工艺模板管理服务
 */
const ProcessService = {
    async getTemplates(params = {}) {
        return await Request.get('/process/templates', params);
    },

    async getTemplateById(id) {
        return await Request.get(`/process/templates/${id}`);
    },

    async createTemplate(data) {
        return await Request.post('/process/templates', data);
    },

    async updateTemplate(id, data) {
        return await Request.put(`/process/templates/${id}`, data);
    },

    async deleteTemplate(id) {
        return await Request.delete(`/process/templates/${id}`);
    },

    async createNewVersion(id, data) {
        return await Request.post(`/process/templates/${id}/version`, data);
    },

    async archiveTemplate(id) {
        return await Request.post(`/process/templates/${id}/archive`);
    },

    async getTemplateVersions(templateCode) {
        return await Request.get(`/process/templates/versions/${templateCode}`);
    },

    async getProducts() {
        return await Request.get('/process/templates/products');
    },

    async compareVersions(id1, id2) {
        return await Request.get('/process/templates/compare', { id1, id2 });
    },

    async submitAudit(id, comment) {
        return await Request.post(`/process/templates/${id}/submit`, { comment });
    },

    async auditPass(id, comment) {
        return await Request.post(`/process/templates/${id}/pass`, { comment });
    },

    async auditReject(id, comment) {
        return await Request.post(`/process/templates/${id}/reject`, { comment });
    },

    async getPendingAudits(params = {}) {
        return await Request.get('/process/audits/pending', params);
    },

    async getAuditRecords(templateId) {
        return await Request.get(`/process/templates/${templateId}/audit-records`);
    },

    async deployTemplate(id, equipmentIds) {
        return await Request.post(`/process/templates/${id}/deploy`, { equipment_ids: equipmentIds });
    },

    async getDeployRecords(params = {}) {
        return await Request.get('/process/deploy-records', params);
    }
};

window.ProcessService = ProcessService;
