/**
 * 权限分组管理页面
 */
const PermissionGroupPage = {
    groups: [],
    selectedGroupId: null,
    selectedGroup: null,
    allEmployees: [],
    allPermissions: [],
    pagination: { page: 1, size: 10, total: 0 },
    filters: { keyword: '' },
    currentTransferTab: 'members',

    init() {
        this.loadView();
    },

    destroy() {
    },

    async loadView() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            await Promise.all([
                this.loadGroups(),
                this.loadEmployees(),
                this.loadPermissions()
            ]);
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

    async loadGroups() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            keyword: this.filters.keyword || undefined
        };
        const res = await OrganizationService.getPermissionGroups(params);
        if (res.code === 200) {
            this.groups = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    async loadEmployees() {
        const res = await OrganizationService.getEmployeesSimple();
        if (res.code === 200) {
            this.allEmployees = res.data || [];
        }
    },

    async loadPermissions() {
        const res = await OrganizationService.getPermissions();
        if (res.code === 200) {
            this.allPermissions = res.data || [];
        }
    },

    async loadGroupDetail(groupId) {
        const res = await OrganizationService.getPermissionGroup(groupId);
        if (res.code === 200) {
            this.selectedGroup = res.data;
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">权限分组管理</h3>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" class="form-control" placeholder="搜索分组名称..." 
                               value="${this.filters.keyword || ''}"
                               onkeyup="if(event.key==='Enter') PermissionGroupPage.searchGroups(this.value)"
                               style="width: 200px;">
                        <button class="btn btn-primary" onclick="PermissionGroupPage.showAddModal()">
                            + 新增分组
                        </button>
                    </div>
                </div>
                <div class="card-body" style="padding: 0; display: flex; height: 600px;">
                    ${this.renderGroupList()}
                    ${this.renderDetailPanel()}
                </div>
            </div>
        `;
    },

    renderGroupList() {
        return `
            <div style="width: 280px; border-right: 1px solid var(--border-color); display: flex; flex-direction: column;">
                <div style="padding: 12px; border-bottom: 1px solid var(--border-color); font-weight: 500;">
                    分组列表
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 8px;">
                    ${!this.groups.length ? `
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
                            <div>暂无分组</div>
                        </div>
                    ` : this.groups.map(g => `
                        <div class="group-item ${this.selectedGroupId === g.id ? 'active' : ''}"
                             style="padding: 10px 12px; margin-bottom: 4px; border-radius: var(--radius-sm); 
                                    cursor: pointer; transition: all 0.2s;
                                    ${this.selectedGroupId === g.id ? 'background: var(--primary-bg); color: var(--primary-color);' : 'background: var(--bg-light);'}"
                             onclick="PermissionGroupPage.selectGroup(${g.id})">
                            <div style="font-weight: 500;">${Validator.sanitize(g.group_name)}</div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                                ${g.member_ids?.length || 0} 成员 · ${g.permission_ids?.length || 0} 权限
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: 12px; border-top: 1px solid var(--border-color);">
                    ${this.renderPagination()}
                </div>
            </div>
        `;
    },

    renderDetailPanel() {
        if (!this.selectedGroupId) {
            return `
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: var(--text-secondary);">
                    <div style="text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">👈</div>
                        <div>请从左侧选择一个权限分组</div>
                    </div>
                </div>
            `;
        }

        return `
            <div style="flex: 1; display: flex; flex-direction: column;">
                ${this.renderDetailHeader()}
                ${this.renderTransferTabs()}
                ${this.currentTransferTab === 'members' ? this.renderMemberTransfer() : this.renderPermissionTransfer()}
                ${this.renderDetailFooter()}
            </div>
        `;
    },

    renderDetailHeader() {
        const g = this.selectedGroup || {};
        return `
            <div style="padding: 16px; border-bottom: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h4 style="margin: 0 0 4px 0;">${Validator.sanitize(g.group_name || '')}</h4>
                        <div style="color: var(--text-secondary); font-size: 13px;">
                            ${Validator.sanitize(g.description || '暂无描述')}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline btn-sm" onclick="PermissionGroupPage.showEditModal(${g.id})">
                            ✏️ 编辑
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="PermissionGroupPage.deleteGroup(${g.id})">
                            🗑️ 删除
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    renderTransferTabs() {
        return `
            <div style="display: flex; border-bottom: 1px solid var(--border-color); padding: 0 16px;">
                <button class="tab-btn ${this.currentTransferTab === 'members' ? 'active' : ''}"
                        style="padding: 12px 16px; border: none; background: transparent; 
                               border-bottom: 2px solid ${this.currentTransferTab === 'members' ? 'var(--primary-color)' : 'transparent'};
                               color: ${this.currentTransferTab === 'members' ? 'var(--primary-color)' : 'var(--text-secondary)'};
                               cursor: pointer; font-weight: 500;"
                        onclick="PermissionGroupPage.switchTransferTab('members')">
                    👥 成员管理
                </button>
                <button class="tab-btn ${this.currentTransferTab === 'permissions' ? 'active' : ''}"
                        style="padding: 12px 16px; border: none; background: transparent;
                               border-bottom: 2px solid ${this.currentTransferTab === 'permissions' ? 'var(--primary-color)' : 'transparent'};
                               color: ${this.currentTransferTab === 'permissions' ? 'var(--primary-color)' : 'var(--text-secondary)'};
                               cursor: pointer; font-weight: 500;"
                        onclick="PermissionGroupPage.switchTransferTab('permissions')">
                    🔐 权限管理
                </button>
            </div>
        `;
    },

    switchTransferTab(tab) {
        this.currentTransferTab = tab;
        this.render();
    },

    renderMemberTransfer() {
        const g = this.selectedGroup || {};
        const selectedIds = g.member_ids || [];
        
        const available = this.allEmployees.filter(e => !selectedIds.includes(e.id));
        const selected = this.allEmployees.filter(e => selectedIds.includes(e.id));

        return `
            <div style="flex: 1; padding: 16px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; height: 100%;">
                    ${this.renderTransferList('可分配成员', available, 'available-members')}
                    ${this.renderTransferButtons('members')}
                    ${this.renderTransferList('已分配成员', selected, 'selected-members')}
                </div>
            </div>
        `;
    },

    renderPermissionTransfer() {
        const g = this.selectedGroup || {};
        const selectedIds = g.permission_ids || [];
        
        const available = this.allPermissions.filter(p => !selectedIds.includes(p.id));
        const selected = this.allPermissions.filter(p => selectedIds.includes(p.id));

        return `
            <div style="flex: 1; padding: 16px; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; height: 100%;">
                    ${this.renderTransferList('可分配权限', available, 'available-permissions', true)}
                    ${this.renderTransferButtons('permissions')}
                    ${this.renderTransferList('已分配权限', selected, 'selected-permissions', true)}
                </div>
            </div>
        `;
    },

    renderTransferList(title, items, listId, isPermission = false) {
        return `
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); display: flex; flex-direction: column;">
                <div style="padding: 10px 12px; border-bottom: 1px solid var(--border-color); 
                           background: var(--bg-light); font-weight: 500; display: flex; justify-content: space-between;">
                    <span>${title}</span>
                    <span style="color: var(--text-secondary); font-size: 12px;">${items.length} 项</span>
                </div>
                <div style="flex: 1; overflow-y: auto; padding: 8px;">
                    <input type="text" class="form-control form-control-sm" 
                           placeholder="搜索..." 
                           style="margin-bottom: 8px;"
                           oninput="PermissionGroupPage.filterTransferList('${listId}', this.value)">
                    <div id="${listId}" style="max-height: 300px; overflow-y: auto;">
                        ${!items.length ? `
                            <div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13px;">
                                暂无数据
                            </div>
                        ` : items.map(item => `
                            <label class="transfer-item" 
                                   style="display: flex; align-items: center; padding: 6px 8px; 
                                          border-radius: var(--radius-sm); cursor: pointer;
                                          margin-bottom: 2px;"
                                   data-name="${(item.name || item.permission_name || '').toLowerCase()}">
                                <input type="checkbox" value="${item.id}" class="${listId}-checkbox"
                                       style="margin-right: 8px;">
                                <span>
                                    ${isPermission ? 
                                        `<span style="font-weight: 500;">${Validator.sanitize(item.permission_name)}</span>
                                         <span style="color: var(--text-secondary); font-size: 11px; margin-left: 4px;">(${Validator.sanitize(item.permission_code)})</span>` :
                                        `<span>${Validator.sanitize(item.name)}</span>
                                         <span style="color: var(--text-secondary); font-size: 11px; margin-left: 4px;">(${Validator.sanitize(item.employee_code)})</span>
                                    }
                                </span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    renderTransferButtons(type) {
        return `
            <div style="display: flex; flex-direction: column; justify-content: center; gap: 8px;">
                <button class="btn btn-outline btn-sm" 
                        onclick="PermissionGroupPage.transferItem('${type}', 'right')"
                        title="添加选中">
                    →
                </button>
                <button class="btn btn-outline btn-sm" 
                        onclick="PermissionGroupPage.transferItem('${type}', 'left')"
                        title="移除选中">
                    ←
                </button>
                <button class="btn btn-outline btn-sm" 
                        onclick="PermissionGroupPage.transferAll('${type}', 'right')"
                        title="全部添加">
                    ⇒
                </button>
                <button class="btn btn-outline btn-sm" 
                        onclick="PermissionGroupPage.transferAll('${type}', 'left')"
                        title="全部移除">
                    ⇐
                </button>
            </div>
        `;
    },

    renderDetailFooter() {
        return `
            <div style="padding: 16px; border-top: 1px solid var(--border-color); text-align: right;">
                <button class="btn btn-primary" onclick="PermissionGroupPage.saveChanges()">
                    💾 保存更改
                </button>
            </div>
        `;
    },

    filterTransferList(listId, keyword) {
        const container = document.getElementById(listId);
        if (!container) return;
        
        const items = container.querySelectorAll('.transfer-item');
        keyword = keyword.toLowerCase();
        
        items.forEach(item => {
            const name = item.dataset.name || '';
            item.style.display = name.includes(keyword) ? 'flex' : 'none';
        });
    },

    transferItem(type, direction) {
        const sourceClass = direction === 'right' 
            ? `available-${type}-checkbox` 
            : `selected-${type}-checkbox`;
        const targetClass = direction === 'right' 
            ? `selected-${type}-checkbox` 
            : `available-${type}-checkbox`;
        
        const checked = document.querySelectorAll(`.${sourceClass}:checked`);
        checked.forEach(cb => {
            const label = cb.closest('.transfer-item');
            const targetListId = direction === 'right' ? 'selected-members' : 'available-members';
            const targetList = type === 'members' ? 
                (direction === 'right' ? document.getElementById('selected-members') : document.getElementById('available-members')) :
                (direction === 'right' ? document.getElementById('selected-permissions') : document.getElementById('available-permissions'));
            
            if (label && targetList) {
                cb.className = targetClass;
                cb.checked = false;
                targetList.appendChild(label);
            }
        });
    },

    transferAll(type, direction) {
        const sourceListId = direction === 'right' 
            ? `available-${type === 'members' ? 'members' : 'permissions'}` 
            : `selected-${type === 'members' ? 'members' : 'permissions'}`;
        const targetListId = direction === 'right' 
            ? `selected-${type === 'members' ? 'members' : 'permissions'}` 
            : `available-${type === 'members' ? 'members' : 'permissions'}`;
        
        const sourceList = document.getElementById(sourceListId);
        const targetList = document.getElementById(targetListId);
        const targetClass = direction === 'right' 
            ? `selected-${type}-checkbox` 
            : `available-${type}-checkbox`;
        
        if (sourceList && targetList) {
            const items = sourceList.querySelectorAll('.transfer-item');
            items.forEach(item => {
                const cb = item.querySelector('input[type="checkbox"]');
                if (cb) {
                    cb.className = targetClass;
                    cb.checked = false;
                }
                targetList.appendChild(item);
            });
        }
    },

    async selectGroup(groupId) {
        this.selectedGroupId = groupId;
        await this.loadGroupDetail(groupId);
        this.render();
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadGroups().then(() => this.render());
    },

    searchGroups(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadGroups().then(() => this.render());
    },

    async saveChanges() {
        if (!this.selectedGroupId) return;

        const selectedMemberIds = Array.from(document.querySelectorAll('.selected-members-checkbox:checked')).map(cb => parseInt(cb.value));
        const selectedPermissionIds = Array.from(document.querySelectorAll('.selected-permissions-checkbox:checked')).map(cb => parseInt(cb.value));

        const allSelectedMembers = Array.from(document.querySelectorAll('.selected-members-checkbox')).map(cb => parseInt(cb.value));
        const allSelectedPermissions = Array.from(document.querySelectorAll('.selected-permissions-checkbox')).map(cb => parseInt(cb.value));

        const data = {
            member_ids: allSelectedMembers,
            permission_ids: allSelectedPermissions
        };

        try {
            const res = await OrganizationService.updatePermissionGroup(this.selectedGroupId, data);
            if (res.code === 200) {
                Toast.success('保存成功');
                await Promise.all([
                    this.loadGroups(),
                    this.loadGroupDetail(this.selectedGroupId)
                ]);
                this.render();
            } else {
                Toast.error(res.message || '保存失败');
            }
        } catch (e) {
            Toast.error('保存失败');
            console.error(e);
        }
    },

    renderPagination() {
        const totalPages = Math.ceil(this.pagination.total / this.pagination.size) || 1;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <span style="color: var(--text-secondary);">
                    共 ${this.pagination.total} 条
                </span>
                <div style="display: flex; gap: 4px;">
                    <button class="btn btn-sm btn-outline" 
                            onclick="PermissionGroupPage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}
                            style="padding: 2px 8px;">
                        ‹
                    </button>
                    <span style="line-height: 28px; color: var(--text-secondary);">
                        ${this.pagination.page}/${totalPages}
                    </span>
                    <button class="btn btn-sm btn-outline" 
                            onclick="PermissionGroupPage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}
                            style="padding: 2px 8px;">
                        ›
                    </button>
                </div>
            </div>
        `;
    },

    showAddModal() {
        const content = `
            <form id="groupForm">
                <div class="form-group">
                    <label>分组名称 *</label>
                    <input type="text" class="form-control" name="group_name" required>
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea class="form-control" name="description" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增权限分组',
            content: content,
            width: '450px',
            confirmText: '创建',
            onConfirm: async () => {
                const form = document.getElementById('groupForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.createPermissionGroup(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        this.pagination.page = 1;
                        await this.loadGroups();
                        this.render();
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

    showEditModal(groupId) {
        const group = this.groups.find(g => g.id === groupId) || this.selectedGroup;
        if (!group) return;

        const content = `
            <form id="groupForm">
                <div class="form-group">
                    <label>分组名称 *</label>
                    <input type="text" class="form-control" name="group_name" value="${Validator.sanitize(group.group_name)}" required>
                </div>
                <div class="form-group">
                    <label>描述</label>
                    <textarea class="form-control" name="description" rows="3">${Validator.sanitize(group.description || '')}</textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑权限分组',
            content: content,
            width: '450px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('groupForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.updatePermissionGroup(groupId, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        await Promise.all([
                            this.loadGroups(),
                            this.loadGroupDetail(groupId)
                        ]);
                        this.render();
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

    async deleteGroup(groupId) {
        const group = this.groups.find(g => g.id === groupId) || this.selectedGroup;
        if (!group) return;

        const confirmed = await Modal.confirm(`确定要删除权限分组 "${group.group_name}" 吗？`);
        if (!confirmed) return;

        try {
            const res = await OrganizationService.deletePermissionGroup(groupId);
            if (res.code === 200) {
                Toast.success('删除成功');
                this.selectedGroupId = null;
                this.selectedGroup = null;
                await this.loadGroups();
                this.render();
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    }
};

window.PermissionGroupPage = PermissionGroupPage;
