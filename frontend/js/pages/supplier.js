/**
 * 供应商管理页面
 */
const SupplierPage = {
    currentView: 'list',
    currentSupplierId: null,
    currentTab: 'info',
    suppliers: [],
    supplierDetail: null,
    gradingData: null,
    expandedGrades: {},
    pagination: { page: 1, size: 10, total: 0 },
    filters: {
        keyword: '',
        status: '',
        grade: ''
    },
    ratingChart: null,

    init() {
        this.loadView();
    },

    destroy() {
        if (this.ratingChart) {
            this.ratingChart.destroy();
            this.ratingChart = null;
        }
    },

    navigate(view, supplierId = null) {
        this.currentView = view;
        this.currentSupplierId = supplierId;
        this.loadView();
    },

    async loadView() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = this.renderLoading();

        try {
            if (this.currentView === 'list') {
                await this.loadSupplierList();
                await this.loadGradingDashboard();
                this.renderListPage();
            } else if (this.currentView === 'detail' && this.currentSupplierId) {
                await this.loadSupplierDetail();
                this.renderDetailPage();
            }
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

    async loadSupplierList() {
        const params = {
            page: this.pagination.page,
            size: this.pagination.size,
            keyword: this.filters.keyword || undefined,
            status: this.filters.status || undefined,
            grade: this.filters.grade || undefined
        };
        const res = await SupplierService.getSuppliers(params);
        if (res.code === 200) {
            this.suppliers = res.data.items || [];
            this.pagination.total = res.data.total || 0;
        }
    },

    async loadGradingDashboard() {
        const res = await SupplierService.getGradingDashboard();
        if (res.code === 200) {
            this.gradingData = res.data;
        }
    },

    async loadSupplierDetail() {
        const res = await SupplierService.getSupplierById(this.currentSupplierId);
        if (res.code === 200) {
            this.supplierDetail = res.data;
        }
    },

    renderListPage() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <h3 class="card-title" style="margin: 0;">供应商管理</h3>
                    ${this.renderTabButtons()}
                </div>
                <div class="card-body">
                    ${this.currentTab === 'info' ? this.renderSupplierListTab() : this.renderGradingTab()}
                </div>
            </div>
        `;
        this.initEventListeners();
    },

    renderTabButtons() {
        const tabs = [
            { key: 'info', label: '供应商列表', icon: '🏢' },
            { key: 'grading', label: '分级看板', icon: '📊' }
        ];
        return `
            <div class="tab-buttons" style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${tabs.map(tab => `
                    <button class="btn ${this.currentTab === tab.key ? 'btn-primary' : 'btn-outline'}" 
                            onclick="SupplierPage.switchTab('${tab.key}')"
                            style="padding: 6px 16px;">
                        <span>${tab.icon}</span> ${tab.label}
                    </button>
                `).join('')}
            </div>
        `;
    },

    switchTab(tab) {
        this.currentTab = tab;
        this.renderListPage();
    },

    renderSupplierListTab() {
        return `
            ${this.renderFilters()}
            ${this.renderSupplierTable()}
            ${this.renderPagination()}
        `;
    },

    renderGradingTab() {
        if (!this.gradingData) {
            return '<div class="empty-text">暂无数据</div>';
        }

        const gradeColors = {
            A: { bg: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', label: 'A级 (≥9分)' },
            B: { bg: 'linear-gradient(135deg, #56ccf2 0%, #2f80ed 100%)', label: 'B级 (7.5-8.9分)' },
            C: { bg: 'linear-gradient(135deg, #f2994a 0%, #f2c94c 100%)', label: 'C级 (6-7.4分)' },
            D: { bg: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)', label: 'D级 (<6分)' }
        };

        return `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 24px;">
                ${['A', 'B', 'C', 'D'].map(grade => `
                    <div class="grade-card" style="
                        background: ${gradeColors[grade].bg};
                        color: white;
                        border-radius: 12px;
                        padding: 24px;
                        cursor: pointer;
                        transition: all 0.3s;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                    " onclick="SupplierPage.toggleGrade('${grade}')">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 48px; font-weight: bold; line-height: 1;">${grade}</div>
                                <div style="font-size: 14px; opacity: 0.9; margin-top: 8px;">${gradeColors[grade].label}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-size: 36px; font-weight: bold;">${this.gradingData.grade_counts[grade] || 0}</div>
                                <div style="font-size: 12px; opacity: 0.8;">家供应商</div>
                            </div>
                        </div>
                        <div style="margin-top: 12px; font-size: 12px; opacity: 0.8;">
                            ${this.expandedGrades[grade] ? '▲ 点击收起' : '▼ 点击展开查看供应商'}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-bottom: 16px;">
                <span style="font-size: 14px; color: var(--text-secondary);">未评级供应商: ${this.gradingData.grade_suppliers?.unrated?.length || 0} 家</span>
            </div>

            ${['A', 'B', 'C', 'D'].map(grade => this.renderGradeSuppliers(grade)).join('')}
        `;
    },

    toggleGrade(grade) {
        this.expandedGrades[grade] = !this.expandedGrades[grade];
        this.renderListPage();
    },

    renderGradeSuppliers(grade) {
        if (!this.expandedGrades[grade]) return '';

        const suppliers = this.gradingData.grade_suppliers?.[grade] || [];

        if (suppliers.length === 0) {
            return `
                <div class="card" style="margin-bottom: 16px;">
                    <div class="card-body" style="text-align: center; padding: 40px; color: var(--text-secondary);">
                        暂无${grade}级供应商
                    </div>
                </div>
            `;
        }

        return `
            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header">
                    <h3 class="card-title">${grade}级供应商列表</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>供应商编号</th>
                                <th>供应商名称</th>
                                <th>联系人</th>
                                <th>联系电话</th>
                                <th>平均评分</th>
                                <th>合同数</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${suppliers.map(s => this.renderSupplierRow(s)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderFilters() {
        return `
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">状态：</label>
                    <select class="form-control" style="width: 120px;" onchange="SupplierPage.filterByStatus(this.value)">
                        <option value="">全部</option>
                        <option value="active" ${this.filters.status === 'active' ? 'selected' : ''}>合作中</option>
                        <option value="suspended" ${this.filters.status === 'suspended' ? 'selected' : ''}>暂停</option>
                        <option value="blacklisted" ${this.filters.status === 'blacklisted' ? 'selected' : ''}>拉黑</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                    <label style="margin: 0; white-space: nowrap;">分级：</label>
                    <select class="form-control" style="width: 100px;" onchange="SupplierPage.filterByGrade(this.value)">
                        <option value="">全部</option>
                        <option value="A" ${this.filters.grade === 'A' ? 'selected' : ''}>A级</option>
                        <option value="B" ${this.filters.grade === 'B' ? 'selected' : ''}>B级</option>
                        <option value="C" ${this.filters.grade === 'C' ? 'selected' : ''}>C级</option>
                        <option value="D" ${this.filters.grade === 'D' ? 'selected' : ''}>D级</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex: 1; min-width: 200px;">
                    <input type="text" class="form-control" placeholder="搜索编号/名称/联系人..." 
                           value="${this.filters.keyword || ''}"
                           onkeyup="if(event.key==='Enter') SupplierPage.searchSuppliers(this.value)"
                           style="flex: 1;">
                    <button class="btn btn-primary" onclick="SupplierPage.searchSuppliers(this.previousElementSibling.value)">搜索</button>
                </div>
                <button class="btn btn-primary" onclick="SupplierPage.showAddSupplierModal()">
                    + 新增供应商
                </button>
            </div>
        `;
    },

    renderSupplierTable() {
        if (!this.suppliers.length) {
            return `
                <div style="text-align: center; padding: 60px; color: var(--text-secondary);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🏢</div>
                    <div>暂无供应商数据</div>
                    <button class="btn btn-primary" style="margin-top: 16px;" onclick="SupplierPage.showAddSupplierModal()">
                        新增供应商
                    </button>
                </div>
            `;
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>供应商编号</th>
                        <th>供应商名称</th>
                        <th>联系人</th>
                        <th>联系电话</th>
                        <th>合作状态</th>
                        <th>分级</th>
                        <th>平均评分</th>
                        <th>合同数</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${this.suppliers.map(s => this.renderSupplierRow(s)).join('')}
                </tbody>
            </table>
        `;
    },

    renderSupplierRow(s) {
        const gradeColors = {
            A: 'background: #11998e; color: white;',
            B: 'background: #2f80ed; color: white;',
            C: 'background: #f2994a; color: white;',
            D: 'background: #eb3349; color: white;'
        };

        const statusColors = {
            active: 'running',
            suspended: 'maintenance',
            blacklisted: 'error'
        };

        const statusText = {
            active: '合作中',
            suspended: '暂停',
            blacklisted: '拉黑'
        };

        return `
            <tr>
                <td>${Validator.sanitize(s.supplier_code)}</td>
                <td>${Validator.sanitize(s.supplier_name)}</td>
                <td>${Validator.sanitize(s.contact_person || '-')}</td>
                <td>${Validator.sanitize(s.contact_phone || '-')}</td>
                <td>
                    <span class="status-badge ${statusColors[s.cooperation_status]}">
                        ${statusText[s.cooperation_status]}
                    </span>
                </td>
                <td>
                    ${s.grade ? `
                        <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; ${gradeColors[s.grade]}">
                            ${s.grade}级
                        </span>
                    ` : '<span style="color: var(--text-secondary);">未评级</span>'}
                </td>
                <td>${s.avg_score !== null && s.avg_score !== undefined ? s.avg_score : '-'}</td>
                <td>${s.contract_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="SupplierPage.navigate('detail', ${s.id})">查看</button>
                    <button class="btn btn-sm btn-outline" onclick="SupplierPage.showEditSupplierModal(${s.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="SupplierPage.deleteSupplier(${s.id})">删除</button>
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
                            onclick="SupplierPage.changePage(${this.pagination.page - 1})"
                            ${this.pagination.page <= 1 ? 'disabled' : ''}>
                        上一页
                    </button>
                    <button class="btn btn-sm btn-outline" 
                            onclick="SupplierPage.changePage(${this.pagination.page + 1})"
                            ${this.pagination.page >= totalPages ? 'disabled' : ''}>
                        下一页
                    </button>
                </div>
            </div>
        `;
    },

    renderDetailPage() {
        const container = document.getElementById('pageContainer');
        const s = this.supplierDetail;

        if (!s) {
            container.innerHTML = '<div class="empty-text">供应商不存在</div>';
            return;
        }

        const gradeColors = {
            A: 'background: #11998e; color: white;',
            B: 'background: #2f80ed; color: white;',
            C: 'background: #f2994a; color: white;',
            D: 'background: #eb3349; color: white;'
        };

        const statusColors = {
            active: 'running',
            suspended: 'maintenance',
            blacklisted: 'error'
        };

        const statusText = {
            active: '合作中',
            suspended: '暂停',
            blacklisted: '拉黑'
        };

        container.innerHTML = `
            <div style="margin-bottom: 16px;">
                <button class="btn btn-outline" onclick="SupplierPage.navigate('list')">
                    ← 返回列表
                </button>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div>
                        <h3 class="card-title" style="margin: 0;">${Validator.sanitize(s.supplier_name)}</h3>
                        <div style="font-size: 14px; color: var(--text-secondary); margin-top: 4px;">
                            编号: ${Validator.sanitize(s.supplier_code)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <span class="status-badge ${statusColors[s.cooperation_status]}">
                            ${statusText[s.cooperation_status]}
                        </span>
                        ${s.grade ? `
                            <span style="display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: bold; ${gradeColors[s.grade]}">
                                ${s.grade}级
                            </span>
                        ` : ''}
                        <button class="btn btn-outline" onclick="SupplierPage.showEditSupplierModal(${s.id})">编辑</button>
                        <button class="btn btn-primary" onclick="SupplierPage.showAddContractModal(${s.id})">+ 合同</button>
                        <button class="btn btn-success" onclick="SupplierPage.showAddRatingModal(${s.id})">+ 评分</button>
                    </div>
                </div>
                <div class="card-body">
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">联系人</div>
                            <div style="font-weight: 500;">${Validator.sanitize(s.contact_person || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">联系电话</div>
                            <div style="font-weight: 500;">${Validator.sanitize(s.contact_phone || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">联系邮箱</div>
                            <div style="font-weight: 500;">${Validator.sanitize(s.contact_email || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">地址</div>
                            <div style="font-weight: 500;">${Validator.sanitize(s.address || '-')}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">合作开始日期</div>
                            <div style="font-weight: 500;">${s.cooperation_start_date || '-'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">平均评分</div>
                            <div style="font-weight: 500;">${s.avg_score !== null && s.avg_score !== undefined ? s.avg_score : '未评级'}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-bottom: 16px;">
                <div class="card-header">
                    <h3 class="card-title">📈 评分趋势</h3>
                </div>
                <div class="card-body">
                    <canvas id="ratingChart" height="300"></canvas>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">📄 合同列表</h3>
                </div>
                <div class="card-body" style="padding: 0;">
                    ${this.renderContractList(s.contracts || [])}
                </div>
            </div>
        `;

        this.initRatingChart();
        this.initEventListeners();
    },

    renderContractList(contracts) {
        if (!contracts.length) {
            return `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    <div style="font-size: 32px; margin-bottom: 8px;">📄</div>
                    <div>暂无合同</div>
                    <button class="btn btn-primary" style="margin-top: 12px;" onclick="SupplierPage.showAddContractModal(${this.currentSupplierId})">
                        + 新增合同
                    </button>
                </div>
            `;
        }

        const contractStatusColors = {
            active: 'running',
            expired: 'stopped',
            terminated: 'error'
        };

        const contractStatusText = {
            active: '生效中',
            expired: '已到期',
            terminated: '已终止'
        };

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>合同编号</th>
                        <th>开始日期</th>
                        <th>结束日期</th>
                        <th>合同金额</th>
                        <th>状态</th>
                        <th>附件</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
                    ${contracts.map(c => `
                        <tr>
                            <td>${Validator.sanitize(c.contract_code)}</td>
                            <td>${c.start_date || '-'}</td>
                            <td>${c.end_date || '-'}</td>
                            <td>¥${Formatter.formatNumber(c.contract_amount || 0)}</td>
                            <td>
                                <span class="status-badge ${contractStatusColors[c.contract_status]}">
                                    ${contractStatusText[c.contract_status]}
                                </span>
                            </td>
                            <td>
                                ${c.attachment ? `
                                    <button class="btn btn-sm btn-outline" onclick="SupplierPage.downloadAttachment('${Validator.sanitize(c.contract_code)}', '${c.attachment}')">下载</button>
                                ` : '-'}
                            </td>
                            <td>
                                <button class="btn btn-sm btn-outline" onclick="SupplierPage.showEditContractModal(${c.id})">编辑</button>
                                <button class="btn btn-sm btn-danger" onclick="SupplierPage.deleteContract(${c.id})">删除</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    initRatingChart() {
        const canvas = document.getElementById('ratingChart');
        if (!canvas) return;

        if (this.ratingChart) {
            this.ratingChart.destroy();
        }

        const history = this.supplierDetail?.rating_history || [];
        const labels = history.map(r => r.rating_date?.slice(0, 7) || '');
        const qualityData = history.map(r => r.quality_score || 0);
        const deliveryData = history.map(r => r.delivery_score || 0);
        const priceData = history.map(r => r.price_score || 0);
        const serviceData = history.map(r => r.service_score || 0);
        const totalData = history.map(r => r.total_score || 0);

        const ctx = canvas.getContext('2d');
        this.ratingChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '综合分',
                        data: totalData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: '质量',
                        data: qualityData,
                        borderColor: '#28a745',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [5, 5]
                    },
                    {
                        label: '交付',
                        data: deliveryData,
                        borderColor: '#17a2b8',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [5, 5]
                    },
                    {
                        label: '价格',
                        data: priceData,
                        borderColor: '#ffc107',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [5, 5]
                    },
                    {
                        label: '服务',
                        data: serviceData,
                        borderColor: '#dc3545',
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        borderDash: [5, 5]
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 2
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    },

    initEventListeners() {
        // 文件上传处理
        setTimeout(() => {
            const fileInputs = document.querySelectorAll('input[type="file"]');
            fileInputs.forEach(input => {
                if (!input.dataset.listenerAdded) {
                    input.dataset.listenerAdded = 'true';
                    input.addEventListener('change', (e) => this.handleFileUpload(e));
                }
            });
        }, 100);
    },

    handleFileUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            Toast.error('文件大小不能超过 10MB');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64Input = document.getElementById('attachmentBase64');
            if (base64Input) {
                base64Input.value = event.target.result;
            }
            const fileNameDisplay = document.getElementById('fileNameDisplay');
            if (fileNameDisplay) {
                fileNameDisplay.textContent = `已选择: ${file.name}`;
            }
        };
        reader.readAsDataURL(file);
    },

    downloadAttachment(contractCode, base64) {
        const link = document.createElement('a');
        link.href = base64;
        link.download = `${contractCode}_attachment`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },

    changePage(page) {
        this.pagination.page = page;
        this.loadView();
    },

    filterByStatus(status) {
        this.filters.status = status;
        this.pagination.page = 1;
        this.loadView();
    },

    filterByGrade(grade) {
        this.filters.grade = grade;
        this.pagination.page = 1;
        this.loadView();
    },

    searchSuppliers(keyword) {
        this.filters.keyword = keyword.trim();
        this.pagination.page = 1;
        this.loadView();
    },

    showAddSupplierModal() {
        const content = `
            <form id="supplierForm">
                <div class="form-group">
                    <label>供应商编号 *</label>
                    <input type="text" class="form-control" name="supplier_code" required>
                </div>
                <div class="form-group">
                    <label>供应商名称 *</label>
                    <input type="text" class="form-control" name="supplier_name" required>
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
                    <label>联系邮箱</label>
                    <input type="email" class="form-control" name="contact_email">
                </div>
                <div class="form-group">
                    <label>地址</label>
                    <input type="text" class="form-control" name="address">
                </div>
                <div class="form-group">
                    <label>合作开始日期</label>
                    <input type="date" class="form-control" name="cooperation_start_date">
                </div>
                <div class="form-group">
                    <label>合作状态</label>
                    <select class="form-control" name="cooperation_status">
                        <option value="active">合作中</option>
                        <option value="suspended">暂停</option>
                        <option value="blacklisted">拉黑</option>
                    </select>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增供应商',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('supplierForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await SupplierService.createSupplier(data);
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

    showEditSupplierModal(id) {
        const supplier = this.suppliers.find(s => s.id === id) || 
                        (this.supplierDetail?.id === id ? this.supplierDetail : null);
        if (!supplier) return;

        const content = `
            <form id="supplierForm">
                <div class="form-group">
                    <label>供应商编号 *</label>
                    <input type="text" class="form-control" name="supplier_code" value="${Validator.sanitize(supplier.supplier_code)}" required>
                </div>
                <div class="form-group">
                    <label>供应商名称 *</label>
                    <input type="text" class="form-control" name="supplier_name" value="${Validator.sanitize(supplier.supplier_name)}" required>
                </div>
                <div class="form-group">
                    <label>联系人</label>
                    <input type="text" class="form-control" name="contact_person" value="${Validator.sanitize(supplier.contact_person || '')}">
                </div>
                <div class="form-group">
                    <label>联系电话</label>
                    <input type="text" class="form-control" name="contact_phone" value="${Validator.sanitize(supplier.contact_phone || '')}">
                </div>
                <div class="form-group">
                    <label>联系邮箱</label>
                    <input type="email" class="form-control" name="contact_email" value="${Validator.sanitize(supplier.contact_email || '')}">
                </div>
                <div class="form-group">
                    <label>地址</label>
                    <input type="text" class="form-control" name="address" value="${Validator.sanitize(supplier.address || '')}">
                </div>
                <div class="form-group">
                    <label>合作开始日期</label>
                    <input type="date" class="form-control" name="cooperation_start_date" value="${supplier.cooperation_start_date || ''}">
                </div>
                <div class="form-group">
                    <label>合作状态</label>
                    <select class="form-control" name="cooperation_status">
                        <option value="active" ${supplier.cooperation_status === 'active' ? 'selected' : ''}>合作中</option>
                        <option value="suspended" ${supplier.cooperation_status === 'suspended' ? 'selected' : ''}>暂停</option>
                        <option value="blacklisted" ${supplier.cooperation_status === 'blacklisted' ? 'selected' : ''}>拉黑</option>
                    </select>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑供应商',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('supplierForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await SupplierService.updateSupplier(id, data);
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

    async deleteSupplier(id) {
        const confirmed = await Modal.confirm('确定要删除该供应商吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await SupplierService.deleteSupplier(id);
            if (res.code === 200) {
                Toast.success('删除成功');
                if (this.currentView === 'detail') {
                    this.navigate('list');
                } else {
                    this.loadView();
                }
            } else {
                Toast.error(res.message || '删除失败');
            }
        } catch (e) {
            Toast.error('删除失败');
            console.error(e);
        }
    },

    showAddContractModal(supplierId) {
        const content = `
            <form id="contractForm">
                <div class="form-group">
                    <label>合同编号 *</label>
                    <input type="text" class="form-control" name="contract_code" required>
                </div>
                <div class="form-group">
                    <label>开始日期 *</label>
                    <input type="date" class="form-control" name="start_date" required>
                </div>
                <div class="form-group">
                    <label>结束日期 *</label>
                    <input type="date" class="form-control" name="end_date" required>
                </div>
                <div class="form-group">
                    <label>合同金额</label>
                    <input type="number" class="form-control" name="contract_amount" value="0" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>合同附件</label>
                    <input type="file" class="form-control" id="attachmentFile" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                    <input type="hidden" id="attachmentBase64" name="attachment">
                    <div id="fileNameDisplay" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;"></div>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '新增合同',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('contractForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.supplier_id = supplierId;

                modal.setLoading(true);
                try {
                    const res = await SupplierService.createContract(data);
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

        this.initEventListeners();
    },

    showEditContractModal(contractId) {
        const contracts = this.supplierDetail?.contracts || [];
        const contract = contracts.find(c => c.id === contractId);
        if (!contract) return;

        const content = `
            <form id="contractForm">
                <div class="form-group">
                    <label>合同编号 *</label>
                    <input type="text" class="form-control" name="contract_code" value="${Validator.sanitize(contract.contract_code)}" required>
                </div>
                <div class="form-group">
                    <label>开始日期 *</label>
                    <input type="date" class="form-control" name="start_date" value="${contract.start_date || ''}" required>
                </div>
                <div class="form-group">
                    <label>结束日期 *</label>
                    <input type="date" class="form-control" name="end_date" value="${contract.end_date || ''}" required>
                </div>
                <div class="form-group">
                    <label>合同金额</label>
                    <input type="number" class="form-control" name="contract_amount" value="${contract.contract_amount || 0}" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label>合同状态</label>
                    <select class="form-control" name="contract_status">
                        <option value="active" ${contract.contract_status === 'active' ? 'selected' : ''}>生效中</option>
                        <option value="expired" ${contract.contract_status === 'expired' ? 'selected' : ''}>已到期</option>
                        <option value="terminated" ${contract.contract_status === 'terminated' ? 'selected' : ''}>已终止</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>合同附件（重新上传将覆盖原附件）</label>
                    <input type="file" class="form-control" id="attachmentFile" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png">
                    <input type="hidden" id="attachmentBase64" name="attachment" value="${contract.attachment || ''}">
                    <div id="fileNameDisplay" style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                        ${contract.attachment ? '已有附件，重新上传将覆盖' : ''}
                    </div>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '编辑合同',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('contractForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                modal.setLoading(true);
                try {
                    const res = await SupplierService.updateContract(contractId, data);
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

        this.initEventListeners();
    },

    async deleteContract(contractId) {
        const confirmed = await Modal.confirm('确定要删除该合同吗？此操作不可恢复。');
        if (!confirmed) return;

        try {
            const res = await SupplierService.deleteContract(contractId);
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
    },

    showAddRatingModal(supplierId) {
        const today = new Date();
        const defaultDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

        const content = `
            <form id="ratingForm">
                <div class="form-group">
                    <label>评分月份 *</label>
                    <input type="date" class="form-control" name="rating_date" value="${defaultDate}" required>
                </div>
                <div class="form-group">
                    <label>质量评分 (1-10) *</label>
                    <input type="range" class="form-control" name="quality_score" min="1" max="10" value="8" 
                           oninput="document.getElementById('qualityValue').textContent = this.value">
                    <div style="text-align: right; font-weight: bold; color: var(--primary-color);" id="qualityValue">8</div>
                </div>
                <div class="form-group">
                    <label>交付评分 (1-10) *</label>
                    <input type="range" class="form-control" name="delivery_score" min="1" max="10" value="8"
                           oninput="document.getElementById('deliveryValue').textContent = this.value">
                    <div style="text-align: right; font-weight: bold; color: var(--info-color);" id="deliveryValue">8</div>
                </div>
                <div class="form-group">
                    <label>价格评分 (1-10) *</label>
                    <input type="range" class="form-control" name="price_score" min="1" max="10" value="8"
                           oninput="document.getElementById('priceValue').textContent = this.value">
                    <div style="text-align: right; font-weight: bold; color: var(--warning-color);" id="priceValue">8</div>
                </div>
                <div class="form-group">
                    <label>服务评分 (1-10) *</label>
                    <input type="range" class="form-control" name="service_score" min="1" max="10" value="8"
                           oninput="document.getElementById('serviceValue').textContent = this.value">
                    <div style="text-align: right; font-weight: bold; color: var(--danger-color);" id="serviceValue">8</div>
                </div>
                <div class="form-group">
                    <label>综合分</label>
                    <div style="font-size: 24px; font-weight: bold; color: var(--primary-color);" id="totalScorePreview">8.00</div>
                </div>
                <div class="form-group">
                    <label>备注</label>
                    <textarea class="form-control" name="remark" rows="3"></textarea>
                </div>
            </form>
        `;

        const modal = new Modal({
            title: '月度评分',
            content: content,
            width: '500px',
            confirmText: '保存',
            onConfirm: async () => {
                const form = document.getElementById('ratingForm');
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                data.supplier_id = supplierId;

                modal.setLoading(true);
                try {
                    const res = await SupplierService.createRating(data);
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

        setTimeout(() => {
            const updateTotal = () => {
                const q = parseInt(document.querySelector('[name="quality_score"]').value) || 0;
                const d = parseInt(document.querySelector('[name="delivery_score"]').value) || 0;
                const p = parseInt(document.querySelector('[name="price_score"]').value) || 0;
                const s = parseInt(document.querySelector('[name="service_score"]').value) || 0;
                const total = ((q + d + p + s) / 4).toFixed(2);
                document.getElementById('totalScorePreview').textContent = total;
            };

            document.querySelectorAll('#ratingForm input[type="range"]').forEach(input => {
                input.addEventListener('input', updateTotal);
            });
        }, 100);
    }
};

window.SupplierPage = SupplierPage;
