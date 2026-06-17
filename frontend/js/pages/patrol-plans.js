/**
 * 巡检计划管理页面
 */
const PatrolPlansPage = {
    plans: [],
    routes: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    editingPlan: null,

    init() {
        this.loadRoutes();
        this.loadPlans();
    },

    async loadRoutes() {
        try {
            const response = await PatrolService.getAllRoutes();
            if (response.code === 200) {
                this.routes = response.data || [];
            }
        } catch (error) {
            console.error('加载路线列表失败:', error);
        }
    },

    async loadPlans() {
        try {
            const response = await PatrolService.getPlans({
                page: this.currentPage,
                size: this.pageSize
            });
            if (response.code === 200) {
                this.plans = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载计划列表失败');
        }
    },

    renderSubNav() {
        return `
            <div class="tab-nav">
                <div class="tab-item" data-page="patrol-routes" onclick="App.navigate('patrol-routes')">路线管理</div>
                <div class="tab-item active" data-page="patrol-plans" onclick="App.navigate('patrol-plans')">计划管理</div>
                <div class="tab-item" data-page="patrol-tasks" onclick="App.navigate('patrol-tasks')">任务列表</div>
                <div class="tab-item" data-page="patrol-reports" onclick="App.navigate('patrol-reports')">巡检报表</div>
            </div>
        `;
    },

    render() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            ${this.renderSubNav()}
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">巡检计划管理</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline" onclick="PatrolPlansPage.generateTodayTasks()">
                            生成今日任务
                        </button>
                        <button class="btn btn-primary" onclick="PatrolPlansPage.showAddModal()">
                            <span class="btn-icon">+</span> 新建计划
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div id="planTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
    },

    renderTable() {
        const tableContainer = document.getElementById('planTable');
        if (!this.plans || this.plans.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无计划数据</p>';
            return;
        }

        const frequencyMap = {
            daily: '每日',
            weekly: '每周',
            monthly: '每月'
        };

        const statusMap = {
            active: { text: '启用', class: 'badge-success' },
            inactive: { text: '停用', class: 'badge-secondary' },
            expired: { text: '已过期', class: 'badge-danger' }
        };

        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>计划编号</th>
                            <th>计划名称</th>
                            <th>巡检路线</th>
                            <th>负责人/班组</th>
                            <th>频率</th>
                            <th>执行时间</th>
                            <th>生效时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.plans.map(p => this.renderRow(p, frequencyMap, statusMap)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(plan, frequencyMap, statusMap) {
        const status = statusMap[plan.status] || statusMap.active;
        let frequencyText = frequencyMap[plan.frequency] || plan.frequency;
        if (plan.frequency === 'weekly' && plan.week_days) {
            const days = plan.week_days.split(',').map(d => '周' + ['日', '一', '二', '三', '四', '五', '六'][parseInt(d) - 1] || d).join('、');
            frequencyText += ` (${days})`;
        }
        if (plan.frequency === 'monthly' && plan.month_days) {
            frequencyText += ` (${plan.month_days}号)`;
        }

        const dateRange = plan.start_date && plan.end_date 
            ? `${plan.start_date} ~ ${plan.end_date}`
            : plan.start_date 
                ? `${plan.start_date} ~ 长期` 
                : '长期有效';

        return `
            <tr>
                <td>${Validator.sanitize(plan.plan_code)}</td>
                <td>${Validator.sanitize(plan.plan_name)}</td>
                <td>${Validator.sanitize(plan.route_name || '-')}</td>
                <td>${Validator.sanitize(plan.person_in_charge || '-')} / ${Validator.sanitize(plan.team || '-')}</td>
                <td>${frequencyText}</td>
                <td>${plan.execute_time || '-'}</td>
                <td>${dateRange}</td>
                <td><span class="badge ${status.class}">${status.text}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="PatrolPlansPage.showDetail(${plan.id})">查看</button>
                    <button class="btn btn-sm btn-warning" onclick="PatrolPlansPage.showEditModal(${plan.id})">编辑</button>
                    <button class="btn btn-sm btn-${plan.status === 'active' ? 'secondary' : 'success'}" 
                            onclick="PatrolPlansPage.toggleStatus(${plan.id})">
                        ${plan.status === 'active' ? '停用' : '启用'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="PatrolPlansPage.deletePlan(${plan.id})">删除</button>
                </td>
            </tr>
        `;
    },

    renderPagination() {
        Pagination.render('pagination', {
            current: this.currentPage,
            size: this.pageSize,
            total: this.total,
            onChange: (page) => {
                this.currentPage = page;
                this.loadPlans();
            }
        });
    },

    showAddModal() {
        this.editingPlan = null;
        this.showPlanModal();
    },

    async showEditModal(planId) {
        try {
            const response = await PatrolService.getPlan(planId);
            if (response.code === 200) {
                this.editingPlan = response.data;
                this.showPlanModal();
            }
        } catch (error) {
            Toast.error('加载计划详情失败');
        }
    },

    async showDetail(planId) {
        try {
            const response = await PatrolService.getPlan(planId);
            if (response.code === 200) {
                const plan = response.data;
                const frequencyMap = { daily: '每日', weekly: '每周', monthly: '每月' };
                
                new Modal({
                    title: '计划详情 - ' + plan.plan_name,
                    content: `
                        <div>
                            <p><strong>计划编号:</strong> ${Validator.sanitize(plan.plan_code)}</p>
                            <p><strong>巡检路线:</strong> ${Validator.sanitize(plan.route_name || '-')}</p>
                            <p><strong>负责人:</strong> ${Validator.sanitize(plan.person_in_charge || '-')}</p>
                            <p><strong>负责班组:</strong> ${Validator.sanitize(plan.team || '-')}</p>
                            <p><strong>频率:</strong> ${frequencyMap[plan.frequency] || plan.frequency}</p>
                            <p><strong>执行时间:</strong> ${plan.execute_time || '-'}</p>
                            <p><strong>生效时间:</strong> ${plan.start_date || '-'} ~ ${plan.end_date || '长期'}</p>
                            <p><strong>备注:</strong> ${Validator.sanitize(plan.remark || '-')}</p>
                        </div>
                    `,
                    width: '500px',
                    showFooter: false
                }).show();
            }
        } catch (error) {
            Toast.error('加载计划详情失败');
        }
    },

    showPlanModal() {
        const isEdit = !!this.editingPlan;
        const plan = this.editingPlan || {};

        new Modal({
            title: isEdit ? '编辑计划' : '新建计划',
            content: this.renderPlanForm(plan),
            width: '600px',
            onConfirm: () => this.savePlan()
        }).show();

        setTimeout(() => {
            this.bindFrequencyEvents();
        }, 100);
    },

    renderPlanForm(plan) {
        const routeOptions = this.routes.map(r => 
            `<option value="${r.id}" ${plan.route_id == r.id ? 'selected' : ''}>${Validator.sanitize(r.route_name)}</option>`
        ).join('');

        const weekDays = [1, 2, 3, 4, 5, 6, 7].map(d => {
            const label = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][d - 1];
            const checked = plan.week_days && plan.week_days.split(',').includes(String(d)) ? 'checked' : '';
            return `<label style="display: inline-flex; align-items: center; gap: 4px; margin-right: 12px;">
                <input type="checkbox" class="week-day-checkbox" value="${d}" ${checked}> ${label}
            </label>`;
        }).join('');

        return `
            <div class="form-group">
                <label class="form-label">计划编号 <span class="text-danger">*</span></label>
                <input type="text" id="plan_code" class="form-input" value="${Validator.sanitize(plan.plan_code || '')}" placeholder="请输入计划编号">
            </div>
            <div class="form-group">
                <label class="form-label">计划名称 <span class="text-danger">*</span></label>
                <input type="text" id="plan_name" class="form-input" value="${Validator.sanitize(plan.plan_name || '')}" placeholder="请输入计划名称">
            </div>
            <div class="form-group">
                <label class="form-label">巡检路线 <span class="text-danger">*</span></label>
                <select id="route_id" class="form-input">
                    <option value="">请选择巡检路线</option>
                    ${routeOptions}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">负责人</label>
                    <input type="text" id="person_in_charge" class="form-input" value="${Validator.sanitize(plan.person_in_charge || '')}" placeholder="负责人姓名">
                </div>
                <div class="form-group">
                    <label class="form-label">负责班组</label>
                    <input type="text" id="team" class="form-input" value="${Validator.sanitize(plan.team || '')}" placeholder="负责班组">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">巡检频率 <span class="text-danger">*</span></label>
                <select id="frequency" class="form-input">
                    <option value="daily" ${plan.frequency === 'daily' ? 'selected' : ''}>每日</option>
                    <option value="weekly" ${plan.frequency === 'weekly' ? 'selected' : ''}>每周</option>
                    <option value="monthly" ${plan.frequency === 'monthly' ? 'selected' : ''}>每月</option>
                </select>
            </div>
            <div class="form-group" id="weekDaysContainer" style="display: ${plan.frequency === 'weekly' ? 'block' : 'none'};">
                <label class="form-label">选择星期</label>
                <div>${weekDays}</div>
            </div>
            <div class="form-group" id="monthDaysContainer" style="display: ${plan.frequency === 'monthly' ? 'block' : 'none'};">
                <label class="form-label">选择日期（1-31，逗号分隔）</label>
                <input type="text" id="month_days" class="form-input" value="${Validator.sanitize(plan.month_days || '')}" placeholder="例如: 1,15,30">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">执行时间</label>
                    <input type="time" id="execute_time" class="form-input" value="${plan.execute_time || '08:00'}">
                </div>
                <div class="form-group">
                    <label class="form-label">状态</label>
                    <select id="status" class="form-input">
                        <option value="active" ${plan.status === 'inactive' ? '' : 'selected'}>启用</option>
                        <option value="inactive" ${plan.status === 'inactive' ? 'selected' : ''}>停用</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label class="form-label">开始日期</label>
                    <input type="date" id="start_date" class="form-input" value="${plan.start_date || ''}">
                </div>
                <div class="form-group">
                    <label class="form-label">结束日期</label>
                    <input type="date" id="end_date" class="form-input" value="${plan.end_date || ''}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">备注</label>
                <textarea id="remark" class="form-input" rows="2" placeholder="备注信息">${Validator.sanitize(plan.remark || '')}</textarea>
            </div>
        `;
    },

    bindFrequencyEvents() {
        const frequencySelect = document.getElementById('frequency');
        const weekDaysContainer = document.getElementById('weekDaysContainer');
        const monthDaysContainer = document.getElementById('monthDaysContainer');

        frequencySelect?.addEventListener('change', (e) => {
            weekDaysContainer.style.display = e.target.value === 'weekly' ? 'block' : 'none';
            monthDaysContainer.style.display = e.target.value === 'monthly' ? 'block' : 'none';
        });
    },

    collectFormData() {
        const planCode = document.getElementById('plan_code').value.trim();
        const planName = document.getElementById('plan_name').value.trim();
        const routeId = document.getElementById('route_id').value;

        if (!planCode || !planName || !routeId) {
            Toast.warning('请填写计划编号、名称和选择巡检路线');
            return null;
        }

        const frequency = document.getElementById('frequency').value;
        let weekDays = '';
        let monthDays = '';

        if (frequency === 'weekly') {
            const checkedDays = Array.from(document.querySelectorAll('.week-day-checkbox:checked')).map(cb => cb.value);
            weekDays = checkedDays.join(',');
            if (!weekDays) {
                Toast.warning('请选择至少一个星期');
                return null;
            }
        }

        if (frequency === 'monthly') {
            monthDays = document.getElementById('month_days').value.trim();
            if (!monthDays) {
                Toast.warning('请填写执行日期');
                return null;
            }
        }

        return {
            plan_code: planCode,
            plan_name: planName,
            route_id: parseInt(routeId),
            person_in_charge: document.getElementById('person_in_charge').value.trim(),
            team: document.getElementById('team').value.trim(),
            frequency: frequency,
            week_days: weekDays,
            month_days: monthDays,
            execute_time: document.getElementById('execute_time').value,
            start_date: document.getElementById('start_date').value || null,
            end_date: document.getElementById('end_date').value || null,
            status: document.getElementById('status').value,
            remark: document.getElementById('remark').value.trim()
        };
    },

    async savePlan() {
        const data = this.collectFormData();
        if (!data) return false;

        try {
            let response;
            if (this.editingPlan) {
                response = await PatrolService.updatePlan(this.editingPlan.id, data);
            } else {
                response = await PatrolService.createPlan(data);
            }

            if (response.code === 200) {
                Toast.success(this.editingPlan ? '更新成功' : '创建成功');
                this.loadPlans();
                return true;
            } else {
                Toast.error(response.message || '保存失败');
                return false;
            }
        } catch (error) {
            Toast.error('保存失败');
            return false;
        }
    },

    async toggleStatus(planId) {
        const confirmed = await Modal.confirm('确定要切换该计划的状态吗？');
        if (!confirmed) return;

        try {
            const response = await PatrolService.togglePlanStatus(planId);
            if (response.code === 200) {
                Toast.success('状态已更新');
                this.loadPlans();
            }
        } catch (error) {
            Toast.error('操作失败');
        }
    },

    async deletePlan(planId) {
        const confirmed = await Modal.confirm('确定要删除该计划吗？删除后不可恢复。');
        if (!confirmed) return;

        try {
            const response = await PatrolService.deletePlan(planId);
            if (response.code === 200) {
                Toast.success('删除成功');
                this.loadPlans();
            } else {
                Toast.error(response.message || '删除失败');
            }
        } catch (error) {
            Toast.error('删除失败');
        }
    },

    async generateTodayTasks() {
        const confirmed = await Modal.confirm('确定要生成今日的巡检任务吗？');
        if (!confirmed) return;

        try {
            const response = await PatrolService.generateTodayTasks();
            if (response.code === 200) {
                Toast.success(response.message || '生成成功');
                this.loadPlans();
            }
        } catch (error) {
            Toast.error('生成任务失败');
        }
    }
};

window.PatrolPlansPage = PatrolPlansPage;
