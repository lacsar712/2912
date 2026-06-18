const EnergyReadingsPage = {
    currentPage: 1,
    pageSize: 10,
    filters: {},
    activeTab: 'manual',

    init() {
        this.filters = {};
        this.currentPage = 1;
        this.activeTab = 'manual';
        this.renderPage();
        this.loadDropdowns();
        this.loadData();
    },

    async loadDropdowns() {
        try {
            const [pointsRes, typesRes] = await Promise.all([
                EnergyService.getMeteringPoints({ size: 100 }),
                EnergyService.getAllEnergyTypes()
            ]);
            this.meteringPoints = (pointsRes.data && pointsRes.data.items) ? pointsRes.data.items : (pointsRes.data || []);
            this.energyTypes = (typesRes.data) ? typesRes.data : (Array.isArray(typesRes) ? typesRes : []);
            this.populateDropdowns();
        } catch (e) {
            Toast.error('加载下拉数据失败');
        }
    },

    populateDropdowns() {
        const filterPoint = document.getElementById('filterMeteringPoint');
        const filterType = document.getElementById('filterEnergyType');
        const formPoint = document.getElementById('formMeteringPoint');

        if (filterPoint) {
            filterPoint.innerHTML = '<option value="">全部计量点</option>';
            this.meteringPoints.forEach(p => {
                filterPoint.innerHTML += `<option value="${p.id}">${p.point_name || p.point_code}</option>`;
            });
        }

        if (filterType) {
            filterType.innerHTML = '<option value="">全部能源类型</option>';
            this.energyTypes.forEach(t => {
                filterType.innerHTML += `<option value="${t.id}">${t.type_name}</option>`;
            });
        }

        if (formPoint) {
            formPoint.innerHTML = '<option value="">请选择计量点</option>';
            this.meteringPoints.forEach(p => {
                formPoint.innerHTML += `<option value="${p.id}">${p.point_name || p.point_code}</option>`;
            });
        }
    },

    async loadData() {
        const params = {
            page: this.currentPage,
            size: this.pageSize,
            ...this.filters
        };
        try {
            const res = await EnergyService.getReadings(params);
            this.tableData = res.data || {};
            this.renderTable(this.tableData);
        } catch (e) {
            Toast.error('加载读数数据失败');
        }
    },

    renderPage() {
        const container = document.getElementById('pageContainer');
        container.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">能源抄表录入</h3>
                </div>
                <div class="card-body">
                    <div class="tab-nav">
                        <div class="tab-item ${this.activeTab === 'manual' ? 'active' : ''}" onclick="EnergyReadingsPage.switchTab('manual')">手工录入</div>
                        <div class="tab-item ${this.activeTab === 'batch' ? 'active' : ''}" onclick="EnergyReadingsPage.switchTab('batch')">批量导入</div>
                    </div>

                    <div id="tabManual" style="display:${this.activeTab === 'manual' ? 'block' : 'none'}; margin-top:16px;">
                        <div class="form-group">
                            <label class="form-label">计量点 <span style="color:red">*</span></label>
                            <select id="formMeteringPoint" class="form-control">
                                <option value="">请选择计量点</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">读数时间 <span style="color:red">*</span></label>
                            <input type="datetime-local" id="formReadingTime" class="form-control" required />
                        </div>
                        <div class="form-group">
                            <label class="form-label">累计读数值 <span style="color:red">*</span></label>
                            <input type="number" id="formCumulativeValue" class="form-control" step="0.01" required />
                        </div>
                        <button class="btn btn-primary" onclick="EnergyReadingsPage.submitReading()">提交</button>
                    </div>

                    <div id="tabBatch" style="display:${this.activeTab === 'batch' ? 'block' : 'none'}; margin-top:16px;">
                        <div class="form-group">
                            <label class="form-label">CSV数据</label>
                            <textarea id="csvInput" class="form-control" rows="10" placeholder="计量点编号,读数时间,累计读数值&#10;MP001,2025-01-15 08:00:00,12345.67"></textarea>
                        </div>
                        <div style="margin-bottom:12px; color:#666; font-size:13px;">
                            <p><strong>CSV格式说明：</strong></p>
                            <p>每行格式：计量点编号,读数时间,累计读数值</p>
                            <p>读数时间格式：YYYY-MM-DD HH:MM:SS</p>
                            <p>首行若为表头（第一列含非数字字符）将自动跳过</p>
                        </div>
                        <button class="btn btn-primary" onclick="EnergyReadingsPage.importCSV()">导入</button>
                    </div>
                </div>
            </div>

            <div class="card" style="margin-top:16px;">
                <div class="card-header">
                    <h3 class="card-title">近期抄表记录</h3>
                </div>
                <div class="card-body">
                    <div class="filter-bar">
                        <select id="filterMeteringPoint" class="form-control" style="width:auto;display:inline-block;">
                            <option value="">全部计量点</option>
                        </select>
                        <select id="filterEnergyType" class="form-control" style="width:auto;display:inline-block;">
                            <option value="">全部能源类型</option>
                        </select>
                        <input type="date" id="filterStartDate" class="form-control" style="width:auto;display:inline-block;" />
                        <input type="date" id="filterEndDate" class="form-control" style="width:auto;display:inline-block;" />
                        <button class="btn btn-primary btn-sm" onclick="EnergyReadingsPage.applyFilters()">查询</button>
                        <button class="btn btn-outline btn-sm" onclick="EnergyReadingsPage.resetFilters()">重置</button>
                    </div>
                    <div id="readingsTableContainer"></div>
                </div>
            </div>
        `;
        if (this.meteringPoints) {
            this.populateDropdowns();
        }
    },

    switchTab(tab) {
        this.activeTab = tab;
        document.querySelectorAll('.tab-item').forEach(el => el.classList.remove('active'));
        const tabs = document.querySelectorAll('.tab-item');
        if (tab === 'manual') {
            tabs[0].classList.add('active');
            document.getElementById('tabManual').style.display = 'block';
            document.getElementById('tabBatch').style.display = 'none';
        } else {
            tabs[1].classList.add('active');
            document.getElementById('tabManual').style.display = 'none';
            document.getElementById('tabBatch').style.display = 'block';
        }
    },

    async submitReading() {
        const meteringPointId = document.getElementById('formMeteringPoint').value;
        const readingTime = document.getElementById('formReadingTime').value;
        const cumulativeValue = document.getElementById('formCumulativeValue').value;

        if (!meteringPointId) {
            Toast.error('请选择计量点');
            return;
        }
        if (!readingTime) {
            Toast.error('请选择读数时间');
            return;
        }
        if (!cumulativeValue || isNaN(parseFloat(cumulativeValue))) {
            Toast.error('请输入有效的累计读数值');
            return;
        }

        try {
            await EnergyService.createReading({
                metering_point_id: meteringPointId,
                reading_time: readingTime.replace('T', ' ') + ':00',
                cumulative_value: parseFloat(cumulativeValue)
            });
            Toast.success('抄表录入成功');
            document.getElementById('formMeteringPoint').value = '';
            document.getElementById('formReadingTime').value = '';
            document.getElementById('formCumulativeValue').value = '';
            this.loadData();
        } catch (e) {
            Toast.error('抄表录入失败');
        }
    },

    parseCSV(text) {
        if (!text || !text.trim()) return [];
        const lines = text.trim().split(/\r?\n/);
        if (lines.length === 0) return [];

        let startIdx = 0;
        const firstCols = lines[0].split(',');
        if (firstCols.length > 0 && isNaN(firstCols[0].trim())) {
            startIdx = 1;
        }

        const readings = [];
        for (let i = startIdx; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const parts = line.split(',');
            if (parts.length < 3) continue;
            const point_code = parts[0].trim();
            const reading_time = parts[1].trim();
            const cumulative_value = parseFloat(parts[2].trim());
            if (!point_code || !reading_time || isNaN(cumulative_value)) continue;
            readings.push({ point_code, reading_time, cumulative_value });
        }
        return readings;
    },

    async importCSV() {
        const text = document.getElementById('csvInput').value;
        const readings = this.parseCSV(text);
        if (readings.length === 0) {
            Toast.error('未解析到有效数据，请检查CSV格式');
            return;
        }
        try {
            await EnergyService.batchImportReadings(readings);
            Toast.success(`成功导入 ${readings.length} 条记录`);
            document.getElementById('csvInput').value = '';
            this.loadData();
        } catch (e) {
            Toast.error('批量导入失败');
        }
    },

    async deleteReading(id) {
        const confirmed = await Modal.confirm('确认删除该抄表记录？');
        if (!confirmed) return;
        try {
            await EnergyService.deleteReading(id);
            Toast.success('删除成功');
            this.loadData();
        } catch (e) {
            Toast.error('删除失败');
        }
    },

    renderTable(data) {
        const container = document.getElementById('readingsTableContainer');
        if (!container) return;

        const items = data.items || [];
        const total = data.total || items.length;
        const totalPages = Math.ceil(total / this.pageSize) || 1;

        let html = '<table class="data-table"><thead><tr>';
        html += '<th>计量点</th><th>读数时间</th><th>累计读数值</th><th>本次差值</th><th>录入人</th><th>操作</th>';
        html += '</tr></thead><tbody>';

        if (items.length === 0) {
            html += '<tr><td colspan="6" style="text-align:center;">暂无数据</td></tr>';
        } else {
            items.forEach(item => {
                html += '<tr>';
                html += `<td>${item.point_name || item.point_code || '-'}</td>`;
                html += `<td>${item.reading_time || '-'}</td>`;
                html += `<td>${item.cumulative_value != null ? item.cumulative_value : '-'}</td>`;
                html += `<td>${item.delta_value != null ? item.delta_value : '-'}</td>`;
                html += `<td>${item.recorder || '-'}</td>`;
                html += `<td><button class="btn btn-danger btn-sm" onclick="EnergyReadingsPage.deleteReading(${item.id})">删除</button></td>`;
                html += '</tr>';
            });
        }

        html += '</tbody></table>';

        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">';
        html += `<span>共 ${total} 条</span>`;
        html += '<div>';
        html += `<button class="btn btn-sm btn-outline" ${this.currentPage <= 1 ? 'disabled' : ''} onclick="EnergyReadingsPage.goPage(${this.currentPage - 1})">上一页</button>`;
        html += `<span style="margin:0 8px;">${this.currentPage} / ${totalPages}</span>`;
        html += `<button class="btn btn-sm btn-outline" ${this.currentPage >= totalPages ? 'disabled' : ''} onclick="EnergyReadingsPage.goPage(${this.currentPage + 1})">下一页</button>`;
        html += '</div></div>';

        container.innerHTML = html;
    },

    goPage(page) {
        if (page < 1) return;
        this.currentPage = page;
        this.loadData();
    },

    applyFilters() {
        this.filters = {};
        const pointId = document.getElementById('filterMeteringPoint').value;
        const typeId = document.getElementById('filterEnergyType').value;
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;

        if (pointId) this.filters.meteringPointId = pointId;
        if (typeId) this.filters.energyTypeId = typeId;
        if (startDate) this.filters.startDate = startDate;
        if (endDate) this.filters.endDate = endDate;

        this.currentPage = 1;
        this.loadData();
    },

    resetFilters() {
        this.filters = {};
        this.currentPage = 1;
        const filterPoint = document.getElementById('filterMeteringPoint');
        const filterType = document.getElementById('filterEnergyType');
        const filterStart = document.getElementById('filterStartDate');
        const filterEnd = document.getElementById('filterEndDate');
        if (filterPoint) filterPoint.value = '';
        if (filterType) filterType.value = '';
        if (filterStart) filterStart.value = '';
        if (filterEnd) filterEnd.value = '';
        this.loadData();
    }
};

window.EnergyReadingsPage = EnergyReadingsPage;
