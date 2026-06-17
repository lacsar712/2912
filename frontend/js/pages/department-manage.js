/**
 * 部门管理页面
 */
const DepartmentManagePage = {
    departmentTree: [],
    departments: [],
    employees: [],
    expandedNodes: {},
    draggedNodeId: null,

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
                this.loadDepartmentTree(),
                this.loadEmployees()
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

    async loadDepartmentTree() {
        const res = await OrganizationService.getDepartmentTree();
        if (res.code === 200) {
            this.departmentTree = res.data || [];
        }
        const res2 = await OrganizationService.getDepartments();
        if (res2.code === 200) {
            this.departments = res2.data || [];
        }
    },

    async loadEmployees() {
        const res = await OrganizationService.getEmployeesSimple();
        if (res.code === 200) {
            this.employees = res.data || [];
        }
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">部门管理</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline" onclick="DepartmentManagePage.expandAll()">
                            展开全部
                        </button>
                        <button class="btn btn-outline" onclick="DepartmentManagePage.collapseAll()">
                            收起全部
                        </button>
                        <button class="btn btn-primary" onclick="DepartmentManagePage.showAddRootModal()">
                            + 新增根部门
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="background: var(--bg-light); border-radius: var(--radius-md); padding: 16px; min-height: 500px;">
                        <div style="color: var(--text-secondary); font-size: 12px; margin-bottom: 12px;">
                            💡 提示：拖拽部门节点可以调整父子层级，点击节点可进行编辑、新增子部门、删除操作
                        </div>
                        ${this.renderTree(this.departmentTree, 0)}
                    </div>
                </div>
            </div>
        `;
        this.initDragAndDrop();
    },

    renderTree(nodes, level) {
        if (!nodes || nodes.length === 0) {
            if (level === 0) {
                return `
                    <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                        <div style="font-size: 48px; margin-bottom: 16px;">🏢</div>
                        <div>暂无部门数据</div>
                        <button class="btn btn-primary" style="margin-top: 16px;" onclick="DepartmentManagePage.showAddRootModal()">
                            新增根部门
                        </button>
                    </div>
                `;
            }
            return '';
        }

        return nodes.map(node => {
            const hasChildren = node.children && node.children.length > 0;
            const isExpanded = this.expandedNodes[node.id] !== false;

            return `
                <div class="tree-node-wrapper" 
                     style="margin-left: ${level * 24}px;"
                     data-node-id="${node.id}">
                    <div class="tree-node-item ${this.draggedNodeId === node.id ? 'dragging' : ''}"
                         style="display: flex; align-items: center; padding: 10px 12px; margin: 4px 0; 
                                background: var(--bg-white); border: 1px solid var(--border-color); 
                                border-radius: var(--radius-sm); cursor: grab;
                                transition: all 0.2s;"
                         draggable="true"
                         data-node-id="${node.id}"
                         onclick="event.stopPropagation(); DepartmentManagePage.showNodeActions(${node.id})">
                        <span style="cursor: pointer; margin-right: 8px; min-width: 20px; text-align: center;"
                              onclick="event.stopPropagation(); DepartmentManagePage.toggleExpand(${node.id})">
                            ${hasChildren ? (isExpanded ? '📂' : '📁') : '📄'}
                        </span>
                        <span style="font-weight: 500;">${Validator.sanitize(node.dept_name)}</span>
                        <span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px;">
                            (${Validator.sanitize(node.dept_code)})
                        </span>
                        ${node.leader_name ? `
                            <span style="color: var(--text-secondary); font-size: 12px; margin-left: auto;">
                                负责人: ${Validator.sanitize(node.leader_name)}
                            </span>
                        ` : ''}
                        <span style="color: var(--info-color); font-size: 12px; margin-left: 8px;">
                            ${node.member_count || 0}人
                        </span>
                    </div>
                    ${hasChildren && isExpanded ? this.renderTree(node.children, level + 1) : ''}
                </div>
            `;
        }).join('');
    },

    toggleExpand(nodeId) {
        this.expandedNodes[nodeId] = !this.expandedNodes[nodeId];
        this.render();
    },

    expandAll() {
        const setAllExpanded = (nodes) => {
            nodes.forEach(node => {
                this.expandedNodes[node.id] = true;
                if (node.children) {
                    setAllExpanded(node.children);
                }
            });
        };
        setAllExpanded(this.departmentTree);
        this.render();
    },

    collapseAll() {
        const setAllCollapsed = (nodes) => {
            nodes.forEach(node => {
                this.expandedNodes[node.id] = false;
                if (node.children) {
                    setAllCollapsed(node.children);
                }
            });
        };
        setAllCollapsed(this.departmentTree);
        this.render();
    },

    initDragAndDrop() {
        const treeItems = document.querySelectorAll('.tree-node-item');
        
        treeItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                const nodeId = parseInt(item.dataset.nodeId);
                this.draggedNodeId = nodeId;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragend', (e) => {
                e.stopPropagation();
                item.classList.remove('dragging');
                this.draggedNodeId = null;
                document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const nodeId = parseInt(item.dataset.nodeId);
                if (nodeId !== this.draggedNodeId) {
                    item.classList.add('drop-target');
                }
            });

            item.addEventListener('dragleave', (e) => {
                e.stopPropagation();
                item.classList.remove('drop-target');
            });

            item.addEventListener('drop', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drop-target');

                const targetId = parseInt(item.dataset.nodeId);
                const sourceId = this.draggedNodeId;

                if (sourceId && targetId && sourceId !== targetId) {
                    const confirmed = await Modal.confirm('确定要将该部门移动到目标部门下吗？');
                    if (confirmed) {
                        try {
                            const res = await OrganizationService.moveDepartment(sourceId, targetId);
                            if (res.code === 200) {
                                Toast.success('移动成功');
                                this.loadDepartmentTree();
                                this.render();
                            } else {
                                Toast.error(res.message || '移动失败');
                            }
                        } catch (err) {
                            Toast.error('移动失败');
                            console.error(err);
                        }
                    }
                }
            });
        });
    },

    showNodeActions(deptId) {
        const dept = this.findDeptById(deptId, this.departmentTree);
        if (!dept) return;

        const content = `
            <div style="text-align: center; margin-bottom: 20px;">
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 8px;">
                    ${Validator.sanitize(dept.dept_name)}
                </div>
                <div style="color: var(--text-secondary); font-size: 14px;">
                    编码: ${Validator.sanitize(dept.dept_code)}
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                <button class="btn btn-primary" onclick="DepartmentManagePage.closeModalAndShowEdit(${deptId})">
                    ✏️ 编辑
                </button>
                <button class="btn btn-success" onclick="DepartmentManagePage.closeModalAndShowAddChild(${deptId})">
                    ➕ 新增子部门
                </button>
                <button class="btn btn-danger" onclick="DepartmentManagePage.closeModalAndDelete(${deptId})">
                    🗑️ 删除
                </button>
            </div>
        `;

        const modal = new Modal({
            title: '部门操作',
            content: content,
            width: '400px',
            showFooter: false
        });
        this.currentActionModal = modal;
        modal.show();
    },

    closeModalAndShowEdit(deptId) {
        if (this.currentActionModal) {
            this.currentActionModal.close();
            this.currentActionModal = null;
        }
        setTimeout(() => this.showEditModal(deptId), 100);
    },

    closeModalAndShowAddChild(parentId) {
        if (this.currentActionModal) {
            this.currentActionModal.close();
            this.currentActionModal = null;
        }
        setTimeout(() => this.showAddChildModal(parentId), 100);
    },

    closeModalAndDelete(deptId) {
        if (this.currentActionModal) {
            this.currentActionModal.close();
            this.currentActionModal = null;
        }
        setTimeout(() => this.deleteDepartment(deptId), 100);
    },

    findDeptById(id, nodes) {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = this.findDeptById(id, node.children);
                if (found) return found;
            }
        }
        return null;
    },

    showAddRootModal() {
        this.showAddModal(0);
    },

    showAddChildModal(parentId) {
        const parent = this.findDeptById(parentId, this.departmentTree);
        this.showAddModal(parentId, parent);
    },

    showAddModal(parentId = 0, parent = null) {
        const leaderOptions = this.employees.map(e => 
            `<option value="${e.id}">${Validator.sanitize(e.name)} (${Validator.sanitize(e.employee_code)})</option>`
        ).join('');

        const content = `
            <form id="deptForm">
                ${parent ? `
                    <div class="form-group">
                        <label>上级部门</label>
                        <div style="padding: 8px 12px; background: var(--bg-light); border-radius: var(--radius-sm); color: var(--text-secondary);">
                            ${Validator.sanitize(parent.dept_name)}
                        </div>
                    </div>
                ` : ''}
                <div class="form-group">
                    <label>部门编码 *</label>
                    <input type="text" class="form-control" name="dept_code" required>
                </div>
                <div class="form-group">
                    <label>部门名称 *</label>
                    <input type="text" class="form-control" name="dept_name" required>
                </div>
                <div class="form-group">
                    <label>部门负责人</label>
                    <select class="form-control" name="leader_id">
                        <option value="">请选择</option>
                        ${leaderOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>排序</label>
                    <input type="number" class="form-control" name="sort_order" value="0">
                </div>
                <div class="form-group">
                    <label>部门描述</label>
                    <textarea class="form-control" name="description" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: parent ? `新增子部门 - ${parent.dept_name}` : '新增根部门',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('deptForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.parent_id = parentId;
                if (data.leader_id === '') delete data.leader_id;
                data.sort_order = parseInt(data.sort_order) || 0;

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.createDepartment(data);
                    if (res.code === 201) {
                        Toast.success('创建成功');
                        modal.close();
                        this.expandedNodes[parentId] = true;
                        await this.loadDepartmentTree();
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

    showEditModal(deptId) {
        const dept = this.findDeptById(deptId, this.departmentTree);
        if (!dept) return;

        const leaderOptions = this.employees.map(e => 
            `<option value="${e.id}" ${dept.leader_id === e.id ? 'selected' : ''}>${Validator.sanitize(e.name)} (${Validator.sanitize(e.employee_code)})</option>`
        ).join('');

        const content = `
            <form id="deptForm">
                <div class="form-group">
                    <label>部门编码 *</label>
                    <input type="text" class="form-control" name="dept_code" value="${Validator.sanitize(dept.dept_code)}" required>
                </div>
                <div class="form-group">
                    <label>部门名称 *</label>
                    <input type="text" class="form-control" name="dept_name" value="${Validator.sanitize(dept.dept_name)}" required>
                </div>
                <div class="form-group">
                    <label>部门负责人</label>
                    <select class="form-control" name="leader_id">
                        <option value="">请选择</option>
                        ${leaderOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label>排序</label>
                    <input type="number" class="form-control" name="sort_order" value="${dept.sort_order || 0}">
                </div>
                <div class="form-group">
                    <label>部门描述</label>
                    <textarea class="form-control" name="description" rows="3">${Validator.sanitize(dept.description || '')}</textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑部门',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('deptForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                if (data.leader_id === '') delete data.leader_id;
                data.sort_order = parseInt(data.sort_order) || 0;

                modal.setLoading(true);
                try {
                    const res = await OrganizationService.updateDepartment(deptId, data);
                    if (res.code === 200) {
                        Toast.success('更新成功');
                        modal.close();
                        await this.loadDepartmentTree();
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

    async deleteDepartment(deptId) {
        const dept = this.findDeptById(deptId, this.departmentTree);
        if (!dept) return;

        const confirmed = await Modal.confirm(`确定要删除部门 "${dept.dept_name}" 吗？\n\n注意：只有没有子部门且没有在职员工的部门才能删除。`);
        if (!confirmed) return;

        try {
            const res = await OrganizationService.deleteDepartment(deptId);
            if (res.code === 200) {
                Toast.success('删除成功');
                await this.loadDepartmentTree();
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

window.DepartmentManagePage = DepartmentManagePage;
