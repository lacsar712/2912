/**
 * 员工列表页面
 */
const EmployeeListPage = {
    currentTab: 'employee',
    departmentTree: [],
    selectedDepartmentId: null,
    employees: [],
    pagination: { page: 1, size: 10, total: 0 },
    filters: {
        keyword: '',
        employee_status: ''
    },
    departments: [],
    positions: [],

    init() {
        this.loadView();
    },

    destroy() {
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.loadView();
    },

    async loadView() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            await Promise.all([
                this.loadDepartmentTree(),
                this.loadDepartments(),
                this.loadPositions()
            ]);

            if (this.currentTab === 'employee') {
                await this.loadEmployees();
            }

            this.render();
        } catch (error) {
            Toast.error('加载数据失败');
            console.error(error);
        }
    },

    renderLoading() {
        return `
            <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                <div style="font-size: 32px; margin-bottom: 16px;">⏳</div>
                <div>加载中...</div>
            </div>
        `;
    },

    async loadDepartmentTree() {
        const res = await OrganizationService.getDepartmentTree();
        if (res.code === 200) {
            this.departmentTree = res.data || [];
        }
    },

    async loadDepartments() {
        const res = await OrganizationService.getDepartments();
        if (res.code === 200) {
            this.departments = res.data || [];
        }
    },

    async loadPositions() {
        const res = await OrganizationService.getAllPositions();
        if (res.code === 200) {
            this.positions = res.data || [];
        }
    },

    async loadEmployees() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            keyword: this.filters.keyword || undefined,
            employee_status: this.filters.employee_status || undefined,
            department_id: this.selectedDepartmentId || undefined
        };
        const res = await OrganizationService.getEmployees(params);
        if (res.code === 200) {
            this.employees = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">组织与员工</h3>
                    ${this.renderTabButtons()}
                </div>
                <div class="card-body" style="padding: 0;">
                    ${this.currentTab === 'employee' ? this.renderEmployeeTab() : this.renderBindingTab()}
                </div>
            </div>
        `;
        this.initEventListeners();
    },

    renderTabButtons() {
        const tabs = [
            { key: 'employee', label: '员工列表', icon: '👥' },
            { key: 'binding', label: '账号绑定', icon: '🔗' }
        ];
        return `
            <div class="tab-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${tabs.map(tab => `
                    <button class="btn ${this.currentTab === tab.key ? 'btn-primary' : 'btn-outline'}" 
                            onclick="EmployeeListPage.switchTab('${tab.key}')"
                            style="padding: 6px 16px;">
                        <span>${tab.icon}</span> ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    renderEmployeeTab() {
        return `
            <div style="display: flex; height: 600px;">
                <div style="width: 280px; border-right: 1px solid var(--border-color); overflow-y: auto;">
                    <div style="padding: 12px; border-bottom: 1px solid var(--border-color);">
                        <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="EmployeeListPage.selectDepartment(null)">
                            📁 全部员工
                        </button>
                    </div>
                    <div style="padding: 8px;">
                        ${this.renderTree(this.departmentTree, 0)}
                    </div>
                </div>
                <div style="flex: 1; padding: 16px; overflow-y: auto;">
                    ${this.renderFilters()}
                    ${this.renderEmployeeTable()}
                    ${this.renderPagination()}
                </div>
            </div>
        `;
    },

    renderTree(nodes, level) {
        if (!nodes || nodes.length === 0) return '';

        return nodes.map(node => `
            <div class="tree-item" style="padding-left: ${level * 16}px;">
                <div class="tree-node ${this.selectedDepartmentId === node.id ? 'active' : ''}" 
                     style="display: flex; justify-content: space-between; align-items: center; padding: 6px 8px; cursor: pointer; border-radius: 4px;"
                     onclick="EmployeeListPage.selectDepartment(${node.id})">
                    <span>
                        ${node.children && node.children.length > 0 ? '📂' : '📁'} 
                        ${Validator.sanitize(node.dept_name)}
                        <span style="color: var(--text-secondary); font-size: 12px; margin-left: 4px;">(${node.member_count || 0})</span>
                    </span>
                </div>
                ${node.children && node.children.length > 0 ? this.renderTree(node.children, level + 1) : ''}
            </div>
        `).join('');
    },

    selectDepartment(deptId) {
        this.selectedDepartmentId = deptId;
        this.pagination.page = 1;
        this.loadEmployees().then(() => this.render());
    },

    renderFilters() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">状态：</label>
                    <select class="form-control" style="width: 120px;" onchange="EmployeeListPage.filterByStatus(this.value)">
                        <option value="">全部</option>
                        <option value="active" ${this.filters.employee_status === 'active' ? 'selected' : ''}>在职</option>
                        <option value="inactive" ${this.filters.employee_status === 'inactive' ? 'selected' : ''}>离职</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" placeholder="搜索工号/姓名/电话/邮箱..." 
                           value="${this.filters.keyword || ''}"
                           onkeyup="if(event.key==='Enter') EmployeeListPage.searchEmployees(this.value)"
                           style="flex: 1;">
                    <button class="btn btn-primary" onclick="EmployeeListPage.searchEmployees(this.previousElementSibling.value)">搜索</button>
                </div>
                <button class="btn btn-primary" onclick="EmployeeListPage.showAddModal()">
                    + 新增员工
                </button>
            </div>
        `;
    },

    renderEmployeeTable() {
        if (!this.employees.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                    <div>暂无员工数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="EmployeeListPage.showAddModal()">
                        新增员工
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>工号</th>
                        <th>姓名</th>
                        <th>性别</th>
                        <th>电话</th>
                        <th>邮箱</th>
                        <th>部门</th>
                        <th>岗位</th>
                        <th>入职日期</th>
                        <th>状态</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.employees.map(e => this.renderEmployeeRow(e)).join('')}
                </tbody>
            </table>
        `;
    },

    renderEmployeeRow(e) {
        const genderText = { male: '男', female: '女', other: '其他' };
        const statusText = { active: '在职', inactive: '离职' };
        const statusClass = { active: 'running', inactive: 'stopped' };

        return `
            <tr>
                <td>${Validator.sanitize(e.employee_code)}</td>
                <td>${Validator.sanitize(e.name)}</td>
                <td>${genderText[e.gender] || '-'}</td>
                <td>${Validator.sanitize(e.phone || '-')}</td>
                <td>${Validator.sanitize(e.email || '-')}</td>
                <td>${Validator.sanitize(e.department_name || '-')}</td>
                <td>${Validator.sanitize(e.position_name || '-')}</td>
                <td>${e.hire_date || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass[e.employee_status]}">
                        ${statusText[e.employee_status]}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="EmployeeListPage.showEditModal(${e.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="EmployeeListPage.deleteEmployee(${e.id})">删除</button>
                </td>
            </tr>
        `;
    },

    renderPagination() {
        const totalPages = Math.ceil(this.pagination.total / this.pagination.size) || 1;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 0 8px;">
                <div style="color: var(--text-secondary); font-size: 14px;">
                    共 ${this.pagination.total} 条记录，第 ${this.pagination.page} / ${totalPages} 页
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="EmployeeListPage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="EmployeeListPage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    renderBindingTab() {
        return `
            <div style="padding: 16px;">
                <div id="bindingContent">${this.renderLoading()}</div>
            </div>
        `;
    },

    async loadBindings() {
        const content = document.getElementById('bindingContent');
        if (!content) return;

        const res = await OrganizationService.getEmployeeUserBindings();
        if (res.code !== 200) {
            content.innerHTML = '<div class="empty-text">加载失败</div>';
            return;
        }

        const bindings = res.data || [];
        
        content.innerHTML = `
            <div style="margin-bottom: 16px;">
                <button class="btn btn-primary" onclick="EmployeeListPage.refreshBindings()">
                    🔄 刷新
                </button>
            </div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>工号</th>
                        <th>姓名</th>
                        <th>部门</th>
                        <th>岗位</th>
                        <th>状态</th>
                        <th>绑定账号</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${bindings.length === 0 ? `
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                                暂无数据
                            </td>
                        </tr>
                    ` : bindings.map(b => this.renderBindingRow(b)).join('')}
                </tbody>
            </table>
        `;
    },

    renderBindingRow(b) {
        const statusText = { active: '在职', inactive: '离职' };
        const statusClass = { active: 'running', inactive: 'stopped' };

        return `
            <tr>
                <td>${Validator.sanitize(b.employee_code)}</td>
                <td>${Validator.sanitize(b.name)}</td>
                <td>${Validator.sanitize(b.department_name || '-')}</td>
                <td>${Validator.sanitize(b.position_name || '-')}</td>
                <td>
                    <span class="status-badge ${statusClass[b.employee_status]}">
                        ${statusText[b.employee_status]}
                    </span>
                </td>
                <td>
                    ${b.user_info ? `
                        <span style="color: var(--primary-color); font-weight: 500;">
                            ${Validator.sanitize(b.user_info.username)}
                        </span>
                    ` : '<span style="color: var(--text-secondary);">未绑定</span>'}
                </td>
                <td>
                    ${b.user_info ? `
                        <button class="btn btn-sm btn-outline" onclick="EmployeeListPage.showUnbindModal(${b.id}, '${Validator.sanitize(b.name)}')">
                            解绑
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-primary" onclick="EmployeeListPage.showBindModal(${b.id}, '${Validator.sanitize(b.name)}')">
                            绑定账号
                        </button>
                    `}
                </td>
            </tr>
        `;
    },

    initEventListeners() {
        if (this.currentTab === 'binding') {
            this.loadBindings();
        }
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadEmployees().then(() => this.render());
    },

    filterByStatus(status) {
        this.filters.employee_status = status;
        this.pagination.page = 1;
        this.loadEmployees().then(() => this.render());
    },

    searchEmployees(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadEmployees().then(() => this.render());
    },

    refreshBindings() {
        this.loadBindings();
    },

    showAddModal() {
        const deptOptions = this.departments.map(d => 
            `<option value="${d.id}">${Validator.sanitize(d.dept_name)}</option>`
        ).join('');
        const posOptions = this.positions.map(p => 
            `<option value="${p.id}">${Validator.sanitize(p.position_name)}</option>`
        ).join('');

        const content = `
            <form id="employeeForm">
                <div class="form-group">
                    <label>工号 *</label>
                    <input type="text" class="form-control" name="employee_code" required>
                </div>
                <div class="form-group">
                    <label>姓名 *</label>
                    <input type="text" class="form-control" name="name" required>
                </div>
                <div class="form-group">
                    <label>性别</label>
                    <select class="form-control" name="gender">
                        <option value="male">男</option>
                        <option value="female">女</option>
                        <option value="other">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>电话</label>
                    <input type="text" class="form-control" name="phone">
                </div>
                <div class="form-group">
                    <label>邮箱</label>
                    <input type="email" class="form-control" name="email">
                </div>
                <div class="form-group">
                    <label>所属部门</label>
                    <select class="form-control" name="department_id">
                        <option value="">请选择</option>
                        ${deptOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>岗位</label>
                    <select class="form-control" name="position_id">
                        <option value="">请选择</option>
                        ${posOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>入职日期</label>
                    <input type="date" class="form-control" name="hire_date">
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select class="form-control" name="employee_status">
                        <option value="active">在职</option>
                        <option value="inactive">离职</option>
                    </select>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增员工',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('employeeForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                if (data.department_id === '') delete data.department_id;
                if (data.position_id === '') delete data.position_id;

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.createEmployee(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        this.loadEmployees().then(() => this.render());
                    } else {
                        Toast.error(res.message || '创建失败');
                    }
                } catch (e) {
                    Toast.error('创建失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    showEditModal(id) {
        const employee = this.employees.find(e => e.id === id);
        if (!employee) return;

        const deptOptions = this.departments.map(d => 
            `<option value="${d.id}" ${employee.department_id === d.id ? 'selected' : ''}>${Validator.sanitize(d.dept_name)}</option>`
        ).join('');
        const posOptions = this.positions.map(p => 
            `<option value="${p.id}" ${employee.position_id === p.id ? 'selected' : ''}>${Validator.sanitize(p.position_name)}</option>`
        ).join('');

        const content = `
            <form id="employeeForm">
                <div class="form-group">
                    <label>工号 *</label>
                    <input type="text" class="form-control" name="employee_code" value="${Validator.sanitize(employee.employee_code)}" required>
                </div>
                <div class="form-group">
                    <label>姓名 *</label>
                    <input type="text" class="form-control" name="name" value="${Validator.sanitize(employee.name)}" required>
                </div>
                <div class="form-group">
                    <label>性别</label>
                    <select class="form-control" name="gender">
                        <option value="male" ${employee.gender === 'male' ? 'selected' : ''}>男</option>
                        <option value="female" ${employee.gender === 'female' ? 'selected' : ''}>女</option>
                        <option value="other" ${employee.gender === 'other' ? 'selected' : ''}>其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>电话</label>
                    <input type="text" class="form-control" name="phone" value="${Validator.sanitize(employee.phone || '')}">
                </div>
                <div class="form-group">
                    <label>邮箱</label>
                    <input type="email" class="form-control" name="email" value="${Validator.sanitize(employee.email || '')}">
                </div>
                <div class="form-group">
                    <label>所属部门</label>
                    <select class="form-control" name="department_id">
                        <option value="">请选择</option>
                        ${deptOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>岗位</label>
                    <select class="form-control" name="position_id">
                        <option value="">请选择</option>
                        ${posOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>入职日期</label>
                    <input type="date" class="form-control" name="hire_date" value="${employee.hire_date || ''}">
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select class="form-control" name="employee_status">
                        <option value="active" ${employee.employee_status === 'active' ? 'selected' : ''}>在职</option>
                        <option value="inactive" ${employee.employee_status === 'inactive' ? 'selected' : ''}>离职</option>
                    </select>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑员工',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('employeeForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                if (data.department_id === '') delete data.department_id;
                if (data.position_id === '') delete data.position_id;

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.updateEmployee(id, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        this.loadEmployees().then(() => this.render());
                    } else {
                        Toast.error(res.message || '更新失败');
                    }
                } catch (e) {
                    Toast.error('更新失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    async deleteEmployee(id) {
        const confirmed = await Modal.confirm('确定要删除该员工吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await OrganizationService.deleteEmployee(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                this.loadEmployees().then(() => this.render());
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    },

    async showBindModal(employeeId, employeeName) {
        const res = await OrganizationService.getUnboundUsers();
        if (res.code !== 200) {
            Toast.error('获取未绑定用户失败');
            return;
        }

        const users = res.data || [];
        if (users.length === 0) {
            Toast.warning('暂无未绑定的用户账号');
            return;
        }

        const userOptions = users.map(u => 
            `<option value="${u.id}">${Validator.sanitize(u.username)} (${Validator.sanitize(u.email || '-')})</option>`
        ).join('');

        const content = `
            <div style="margin-bottom: 16px;">
                为员工 <strong>${Validator.sanitize(employeeName)}</strong> 绑定登录账号：
            </div>
            <form id="bindForm">
                <div class="form-group">
                    <label>选择账号 *</label>
                    <select class="form-control" name="user_id" required>
                        <option value="">请选择</option>
                        ${userOptions}
                    </select>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '绑定账号',
            content: content,
            width: '400px',
            confirmText: '绑定',
            onConfirm: async () => {
                const form = document.getElementById('bindForm');
                const formData = new FormData(form);
                const userId = formData.get('user_id');

                if (!userId) {
                    Toast.warning('请选择账号');
                    return false;
                }

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.bindUser(employeeId, parseInt(userId));
                    if (res.code === 200) {
                        Toast.success('绑定成功');
                        modal.close();
                        this.loadBindings();
                    } else {
                        Toast.error(res.message || '绑定失败');
                    }
                } catch (e) {
                    Toast.error('绑定失败');
                    console.error(e);
                } finally {
                    modal.setLoading(false);
                }
                return false;
            }
        }).show();
    },

    async showUnbindModal(employeeId, employeeName) {
        const confirmed = await Modal.confirm(`确定要解除员工 "${employeeName}" 的账号绑定吗？`);
        if (!confirmed) return;

        try {
            const res = await OrganizationService.unbindUser(employeeId);
            if (res.code === 200) {
                Toast.success('解绑成功');
                this.loadBindings();
            } else {
                Toast.error(res.message || '解绑失败');
            }
        } catch (e) {
            Toast.error('解绑失败');
            console.error(e);
        }
    }
};

window.EmployeeListPage = EmployeeListPage;
