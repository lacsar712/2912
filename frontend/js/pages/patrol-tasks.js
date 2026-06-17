/**
 * 巡检任务列表页面
 */
const PatrolTasksPage = {
    tasks: [],
    currentPage: 1,
    pageSize: 10,
    total: 0,
    filters: {
        status: '',
        start_date: '',
        end_date: ''
    },

    init() {
        this.loadTasks();
    },

    async loadTasks() {
        try {
            const params = {
                page: this.currentPage,
                size: this.pageSize,
                ...this.filters
            };
            const response = await PatrolService.getTasks(params);
            if (response.code === 200) {
                this.tasks = response.data.items || [];
                this.total = response.data.total || 0;
                this.render();
            }
        } catch (error) {
            Toast.error('加载任务列表失败');
        }
    },

    renderSubNav() {
        return `
            <div class="tab-nav">
                <div class="tab-item" data-page="patrol-routes" onclick="App.navigate('patrol-routes')">路线管理</div>
                <div class="tab-item" data-page="patrol-plans" onclick="App.navigate('patrol-plans')">计划管理</div>
                <div class="tab-item active" data-page="patrol-tasks" onclick="App.navigate('patrol-tasks')">任务列表</div>
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
                    <h3 class="card-title">巡检任务列表</h3>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-outline" onclick="PatrolTasksPage.checkOverdue()">
                            检查逾期任务
                        </button>
                        <button class="btn btn-primary" onclick="PatrolTasksPage.generateTodayTasks()">
                            生成今日任务
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.renderFilters()}
                    <div id="taskTable"></div>
                    <div id="pagination" class="pagination-container"></div>
                </div>
            </div>
        `;

        this.renderTable();
        this.renderPagination();
        this.bindFilterEvents();
    },

    renderFilters() {
        return `
            <div class="filter-bar" style="margin-bottom: 16px;">
                <select class="filter-select" id="filterStatus">
                    <option value="">全部状态</option>
                    <option value="pending" ${this.filters.status === 'pending' ? 'selected' : ''}>待执行</option>
                    <option value="in_progress" ${this.filters.status === 'in_progress' ? 'selected' : ''}>进行中</option>
                    <option value="completed" ${this.filters.status === 'completed' ? 'selected' : ''}>已完成</option>
                    <option value="overdue" ${this.filters.status === 'overdue' ? 'selected' : ''}>已逾期</option>
                </select>
                <input type="date" class="filter-select" id="filterStartDate" value="${this.filters.start_date}" placeholder="开始日期">
                <input type="date" class="filter-select" id="filterEndDate" value="${this.filters.end_date}" placeholder="结束日期">
                <button class="btn btn-sm btn-primary" onclick="PatrolTasksPage.applyFilters()">查询</button>
                <button class="btn btn-sm btn-outline" onclick="PatrolTasksPage.resetFilters()">重置</button>
            </div>
        `;
    },

    renderTable() {
        const tableContainer = document.getElementById('taskTable');
        if (!this.tasks || this.tasks.length === 0) {
            tableContainer.innerHTML = '<p class="empty-text">暂无任务数据</p>';
            return;
        }

        const statusMap = {
            pending: { text: '待执行', class: 'badge-secondary' },
            in_progress: { text: '进行中', class: 'badge-primary' },
            completed: { text: '已完成', class: 'badge-success' },
            overdue: { text: '已逾期', class: 'badge-danger' }
        };

        tableContainer.innerHTML = `
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>任务编号</th>
                            <th>任务名称</th>
                            <th>巡检路线</th>
                            <th>执行人</th>
                            <th>计划日期</th>
                            <th>应完成时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.tasks.map(t => this.renderRow(t, statusMap)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderRow(task, statusMap) {
        const status = statusMap[task.status] || statusMap.pending;
        const canExecute = ['pending', 'overdue'].includes(task.status);
        const canView = task.status === 'completed';

        return `
            <tr>
                <td>${Validator.sanitize(task.task_code)}</td>
                <td>${Validator.sanitize(task.plan_name || task.task_code)}</td>
                <td>${Validator.sanitize(task.route_name || '-')}</td>
                <td>${Validator.sanitize(task.executor || '-')}</td>
                <td>${task.plan_date || '-'}</td>
                <td>${Formatter.formatDateTime(task.due_time)}</td>
                <td><span class="badge ${status.class}">${status.text}</span></td>
                <td>
                    <button class="btn btn-sm btn-info" onclick="PatrolTasksPage.showDetail(${task.id})">详情</button>
                    ${canExecute ? `<button class="btn btn-sm btn-primary" onclick="PatrolTasksPage.executeTask(${task.id})">执行</button>` : ''}
                    ${canView ? `<button class="btn btn-sm btn-success" onclick="PatrolTasksPage.viewResult(${task.id})">查看结果</button>` : ''}
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
                this.loadTasks();
            }
        });
    },

    bindFilterEvents() {
        const statusSelect = document.getElementById('filterStatus');
        statusSelect?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
        });

        const startDate = document.getElementById('filterStartDate');
        startDate?.addEventListener('change', (e) => {
            this.filters.start_date = e.target.value;
        });

        const endDate = document.getElementById('filterEndDate');
        endDate?.addEventListener('change', (e) => {
            this.filters.end_date = e.target.value;
        });
    },

    applyFilters() {
        this.currentPage = 1;
        this.loadTasks();
    },

    resetFilters() {
        this.filters = { status: '', start_date: '', end_date: '' };
        this.currentPage = 1;
        this.loadTasks();
    },

    async showDetail(taskId) {
        try {
            const response = await PatrolService.getTask(taskId);
            if (response.code === 200) {
                const task = response.data;
                const statusMap = {
                    pending: '待执行',
                    in_progress: '进行中',
                    completed: '已完成',
                    overdue: '已逾期'
                };

                new Modal({
                    title: '任务详情 - ' + task.task_code,
                    content: `
                        <div>
                            <p><strong>任务编号:</strong> ${Validator.sanitize(task.task_code)}</p>
                            <p><strong>计划名称:</strong> ${Validator.sanitize(task.plan_name || '-')}</p>
                            <p><strong>巡检路线:</strong> ${Validator.sanitize(task.route_name || '-')}</p>
                            <p><strong>执行人:</strong> ${Validator.sanitize(task.executor || '-')}</p>
                            <p><strong>计划日期:</strong> ${task.plan_date || '-'}</p>
                            <p><strong>应完成时间:</strong> ${Formatter.formatDateTime(task.due_time)}</p>
                            <p><strong>开始时间:</strong> ${Formatter.formatDateTime(task.start_time)}</p>
                            <p><strong>完成时间:</strong> ${Formatter.formatDateTime(task.end_time)}</p>
                            <p><strong>状态:</strong> ${statusMap[task.status] || task.status}</p>
                            <p><strong>备注:</strong> ${Validator.sanitize(task.remark || '-')}</p>
                            ${task.result_count > 0 ? `
                                <h4 style="margin-top: 16px;">巡检结果</h4>
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>检查点</th>
                                            <th>巡检项</th>
                                            <th>标准值</th>
                                            <th>实际值</th>
                                            <th>是否异常</th>
                                            <th>备注</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(task.results || []).map(r => `
                                            <tr>
                                                <td>${Validator.sanitize(r.checkpoint_name || '-')}</td>
                                                <td>${Validator.sanitize(r.item_name || '-')}</td>
                                                <td>${Validator.sanitize(r.expected_value || '-')}</td>
                                                <td>${Validator.sanitize(r.actual_value || '-')}</td>
                                                <td>${r.is_abnormal === 1 ? '<span class="text-danger">是</span>' : '<span class="text-success">否</span>'}</td>
                                                <td>${Validator.sanitize(r.remark || '-')}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            ` : ''}
                        </div>
                    `,
                    width: '700px',
                    showFooter: false
                }).show();
            }
        } catch (error) {
            Toast.error('加载任务详情失败');
        }
    },

    async executeTask(taskId) {
        const confirmed = await Modal.confirm('确定要开始执行该任务吗？');
        if (!confirmed) return;

        try {
            const user = AuthService.getCurrentUser();
            const response = await PatrolService.startTask(taskId, user?.username);
            if (response.code === 200) {
                Toast.success('任务已开始');
                App.navigate(`patrol-execute?id=${taskId}`);
            }
        } catch (error) {
            Toast.error('开始任务失败');
        }
    },

    viewResult(taskId) {
        App.navigate(`patrol-execute?id=${taskId}&view=1`);
    },

    async checkOverdue() {
        const confirmed = await Modal.confirm('确定要检查并标记逾期任务吗？');
        if (!confirmed) return;

        try {
            const response = await PatrolService.checkOverdueTasks();
            if (response.code === 200) {
                const count = response.data.overdue_count || 0;
                Toast.success(`检查完成，共标记 ${count} 条逾期任务`);
                this.loadTasks();
            }
        } catch (error) {
            Toast.error('检查逾期任务失败');
        }
    },

    async generateTodayTasks() {
        const confirmed = await Modal.confirm('确定要生成今日的巡检任务吗？');
        if (!confirmed) return;

        try {
            const response = await PatrolService.generateTodayTasks();
            if (response.code === 200) {
                Toast.success(response.message || '生成成功');
                this.loadTasks();
            }
        } catch (error) {
            Toast.error('生成任务失败');
        }
    }
};

window.PatrolTasksPage = PatrolTasksPage;
