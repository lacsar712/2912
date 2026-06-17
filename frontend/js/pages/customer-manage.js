/**
 * 客户档案管理页面
 */
const CustomerManagePage = {
    customers: [],
    pagination: { page: 1, size: 10, total: 0 },
    filters: {
        keyword: '',
        credit_level: ''
    },

    init() {
        this.loadView();
    },

    destroy() {
    },

    async loadView() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            await this.loadCustomerList();
            this.renderListPage();
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

    async loadCustomerList() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            keyword: this.filters.keyword || undefined,
            credit_level: this.filters.credit_level || undefined
        };
        const res = await CustomerOrderService.getCustomers(params);
        if (res.code === 200) {
            this.customers = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    renderListPage() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">客户档案管理</h3>
                </div>
                <div class="card-body">
                    ${this.renderFilters()}
                    ${this.renderCustomerTable()}
                    ${this.renderPagination()}
                </div>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">信用等级：</label>
                    <select class="form-control" style="width: 100px;" onchange="CustomerManagePage.filterByCreditLevel(this.value)">
                        <option value="">全部</option>
                        <option value="A" ${this.filters.credit_level === 'A' ? 'selected' : ''}>A级</option>
                        <option value="B" ${this.filters.credit_level === 'B' ? 'selected' : ''}>B级</option>
                        <option value="C" ${this.filters.credit_level === 'C' ? 'selected' : ''}>C级</option>
                        <option value="D" ${this.filters.credit_level === 'D' ? 'selected' : ''}>D级</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" placeholder="搜索编号/名称/联系人..." 
                           value="${this.filters.keyword || ''}"
                           onkeyup="if(event.key==='Enter') CustomerManagePage.searchCustomers(this.value)"
                           style="flex: 1;">
                    <button class="btn btn-primary" onclick="CustomerManagePage.searchCustomers(this.previousElementSibling.value)">搜索</button>
                </div>
                <button class="btn btn-primary" onclick="CustomerManagePage.showAddCustomerModal()">
                    + 新增客户
                </button>
            </div>
        `;
    },

    renderCustomerTable() {
        if (!this.customers.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
                    <div>暂无客户数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="CustomerManagePage.showAddCustomerModal()">
                        新增客户
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>编号</th>
                        <th>名称</th>
                        <th>联系人</th>
                        <th>电话</th>
                        <th>地址</th>
                        <th>信用等级</th>
                        <th>订单数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.customers.map(c => this.renderCustomerRow(c)).join('')}
                </tbody>
            </table>
        `;
    },

    renderCustomerRow(c) {
        const gradeColors = {
            A: 'background: #11998e; color: white;',
            B: 'background: #2f80ed; color: white;',
            C: 'background: #f2994a; color: white;',
            D: 'background: #eb3349; color: white;'
        };

        return `
            <tr>
                <td>${Validator.sanitize(c.customer_code)}</td>
                <td>${Validator.sanitize(c.customer_name)}</td>
                <td>${Validator.sanitize(c.contact_person || '-')}</td>
                <td>${Validator.sanitize(c.contact_phone || '-')}</td>
                <td>${Validator.sanitize(c.address || '-')}</td>
                <td>
                    ${c.credit_level ? `
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; ${gradeColors[c.credit_level]}">
                            ${c.credit_level}级
                        </span>
                    ` : '<span style="color: var(--text-secondary);">未评级</span>'}
                </td>
                <td>${c.order_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-outline" onclick="CustomerManagePage.showEditCustomerModal(${c.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="CustomerManagePage.deleteCustomer(${c.id})">删除</button>
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
                            onclick="CustomerManagePage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="CustomerManagePage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadView();
    },

    filterByCreditLevel(creditLevel) {
        this.filters.credit_level = creditLevel;
        this.pagination.page = 1;
        this.loadView();
    },

    searchCustomers(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadView();
    },

    showAddCustomerModal() {
        const content = `
            <form id="customerForm">
                <div class="form-group">
                    <label>客户编号 *</label>
                    <input type="text" class="form-control" name="customer_code" required>
                </div>
                <div class="form-group">
                    <label>客户名称 *</label>
                    <input type="text" class="form-control" name="customer_name" required>
                </div>
                <div class="form-group">
                    <label>联系人</label>
                    <input type="text" class="form-control" name="contact_person">
                </div>
                <div class="form-group">
                    <label>联系电话</label>
                    <input type="text" class="form-control" name="contact_phone">
                </div>
                <div class="form-group">
                    <label>地址</label>
                    <input type="text" class="form-control" name="address">
                </div>
                <div class="form-group">
                    <label>信用等级</label>
                    <select class="form-control" name="credit_level">
                        <option value="A">A级</option>
                        <option value="B" selected>B级</option>
                        <option value="C">C级</option>
                        <option value="D">D级</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增客户',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('customerForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.createCustomer(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        this.loadView();
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

    showEditCustomerModal(id) {
        const customer = this.customers.find(c => c.id === id);
        if (!customer) return;

        const content = `
            <form id="customerForm">
                <div class="form-group">
                    <label>客户编号 *</label>
                    <input type="text" class="form-control" name="customer_code" value="${Validator.sanitize(customer.customer_code)}" required>
                </div>
                <div class="form-group">
                    <label>客户名称 *</label>
                    <input type="text" class="form-control" name="customer_name" value="${Validator.sanitize(customer.customer_name)}" required>
                </div>
                <div class="form-group">
                    <label>联系人</label>
                    <input type="text" class="form-control" name="contact_person" value="${Validator.sanitize(customer.contact_person || '')}">
                </div>
                <div class="form-group">
                    <label>联系电话</label>
                    <input type="text" class="form-control" name="contact_phone" value="${Validator.sanitize(customer.contact_phone || '')}">
                </div>
                <div class="form-group">
                    <label>地址</label>
                    <input type="text" class="form-control" name="address" value="${Validator.sanitize(customer.address || '')}">
                </div>
                <div class="form-group">
                    <label>信用等级</label>
                    <select class="form-control" name="credit_level">
                        <option value="A" ${customer.credit_level === 'A' ? 'selected' : ''}>A级</option>
                        <option value="B" ${customer.credit_level === 'B' ? 'selected' : ''}>B级</option>
                        <option value="C" ${customer.credit_level === 'C' ? 'selected' : ''}>C级</option>
                        <option value="D" ${customer.credit_level === 'D' ? 'selected' : ''}>D级</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="3">${Validator.sanitize(customer.remark || '')}</textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑客户',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('customerForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await CustomerOrderService.updateCustomer(id, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        this.loadView();
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

    async deleteCustomer(id) {
        const confirmed = await Modal.confirm('确定要删除该客户吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await CustomerOrderService.deleteCustomer(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                this.loadView();
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    }
};

window.CustomerManagePage = CustomerManagePage;
