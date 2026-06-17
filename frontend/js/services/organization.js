/**
 * 组织架构管理服务
 */
const OrganizationService = {
    // 部门管理
    async getDepartments() {
        return await Request.get('/organization/departments');
    },

    async getDepartmentTree() {
        return await Request.get('/organization/departments/tree');
    },

    async getDepartment(id) {
        return await Request.get(`/organization/departments/${id}`);
    },

    async createDepartment(data) {
        return await Request.post('/organization/departments', data);
    },

    async updateDepartment(id, data) {
        return await Request.put(`/organization/departments/${id}`, data);
    },

    async moveDepartment(id, newParentId) {
        return await Request.put(`/organization/departments/${id}/move`, { new_parent_id: newParentId });
    },

    async deleteDepartment(id) {
        return await Request.delete(`/organization/departments/${id}`);
    },

    // 岗位管理
    async getPositions(params = {}) {
        return await Request.get('/organization/positions', params);
    },

    async getAllPositions() {
        return await Request.get('/organization/positions/all');
    },

    async getPositionCategories() {
        return await Request.get('/organization/positions/categories');
    },

    async getPosition(id) {
        return await Request.get(`/organization/positions/${id}`);
    },

    async createPosition(data) {
        return await Request.post('/organization/positions', data);
    },

    async updatePosition(id, data) {
        return await Request.put(`/organization/positions/${id}`, data);
    },

    async deletePosition(id) {
        return await Request.delete(`/organization/positions/${id}`);
    },

    // 员工管理
    async getEmployees(params = {}) {
        return await Request.get('/organization/employees', params);
    },

    async getEmployeesSimple() {
        return await Request.get('/organization/employees/simple');
    },

    async getEmployee(id) {
        return await Request.get(`/organization/employees/${id}`);
    },

    async createEmployee(data) {
        return await Request.post('/organization/employees', data);
    },

    async updateEmployee(id, data) {
        return await Request.put(`/organization/employees/${id}`, data);
    },

    async deleteEmployee(id) {
        return await Request.delete(`/organization/employees/${id}`);
    },

    async bindUser(employeeId, userId) {
        return await Request.post(`/organization/employees/${employeeId}/bind-user`, { user_id: userId });
    },

    async unbindUser(employeeId) {
        return await Request.post(`/organization/employees/${employeeId}/unbind-user`);
    },

    async getUnboundUsers() {
        return await Request.get('/organization/employees/unbound-users');
    },

    async getEmployeeUserBindings() {
        return await Request.get('/organization/employees/bindings');
    },

    // 权限点管理
    async getPermissions() {
        return await Request.get('/organization/permissions');
    },

    async getPermissionTree() {
        return await Request.get('/organization/permissions/tree');
    },

    async getPermission(id) {
        return await Request.get(`/organization/permissions/${id}`);
    },

    async createPermission(data) {
        return await Request.post('/organization/permissions', data);
    },

    async updatePermission(id, data) {
        return await Request.put(`/organization/permissions/${id}`, data);
    },

    async deletePermission(id) {
        return await Request.delete(`/organization/permissions/${id}`);
    },

    async initDefaultPermissions() {
        return await Request.post('/organization/permissions/init-default');
    },

    // 权限分组管理
    async getPermissionGroups(params = {}) {
        return await Request.get('/organization/permission-groups', params);
    },

    async getAllPermissionGroups() {
        return await Request.get('/organization/permission-groups/all');
    },

    async getPermissionGroup(id) {
        return await Request.get(`/organization/permission-groups/${id}`);
    },

    async createPermissionGroup(data) {
        return await Request.post('/organization/permission-groups', data);
    },

    async updatePermissionGroup(id, data) {
        return await Request.put(`/organization/permission-groups/${id}`, data);
    },

    async deletePermissionGroup(id) {
        return await Request.delete(`/organization/permission-groups/${id}`);
    },

    async addGroupMembers(groupId, employeeIds) {
        return await Request.post(`/organization/permission-groups/${groupId}/members`, { employee_ids: employeeIds });
    },

    async removeGroupMembers(groupId, employeeIds) {
        return await Request.delete(`/organization/permission-groups/${groupId}/members`, { employee_ids: employeeIds });
    },

    // 统计
    async getEmployeeCountByDepartment() {
        return await Request.get('/organization/statistics/employee-count-by-department');
    },

    async getEmployeeOverview() {
        return await Request.get('/organization/statistics/employee-overview');
    }
};

window.OrganizationService = OrganizationService;
