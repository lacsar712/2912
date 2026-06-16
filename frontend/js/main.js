/**
 * 主入口模块 - 生产线监控系统
 */
const App = {
    currentPage: null,
    pages: {
        dashboard: MonitorPage,
        production: ProductionLinePage,
        equipment: EquipmentPage,
        tasks: TasksPage,
        alerts: AlertsPage,
        simulation: SimulationPage,
        inventory: InventoryPage,
        supplier: SupplierPage,
        'quality-templates': QualityTemplatesPage,
        'quality-orders': QualityOrdersPage,
        'quality-order-form': QualityOrderFormPage,
        'quality-analysis': QualityAnalysisPage,
        'repair-orders': RepairOrdersPage,
        'process-templates': ProcessTemplatesPage,
        'process-compare': ProcessComparePage,
        'process-audit': ProcessAuditPage,
        'process-deploy': ProcessDeployPage
    },

    init() {
        // 检查登录状态
        if (!AuthService.isLoggedIn()) {
            window.location.href = '/login.html';
            return;
        }

        // 初始化UI
        this.initSidebar();
        this.initHeader();

        // 加载默认页面
        const hash = window.location.hash.slice(1) || 'dashboard';
        this.navigate(hash);

        // 监听hash变化
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            this.navigate(hash);
        });
    },

    initSidebar() {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.getElementById('menuToggle');
        const sidebarToggle = document.getElementById('sidebarToggle');

        menuToggle?.addEventListener('click', () => {
            sidebar.classList.toggle('show');
        });

        sidebarToggle?.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.dataset.page;
                this.navigate(page);
                sidebar.classList.remove('show');
            });
        });
    },

    initHeader() {
        const user = AuthService.getCurrentUser();
        const usernameEl = document.getElementById('username');
        if (usernameEl && user) {
            usernameEl.textContent = user.username;
        }

        document.getElementById('logoutBtn')?.addEventListener('click', async () => {
            const confirmed = await Modal.confirm('确定要退出登录吗？');
            if (confirmed) {
                await AuthService.logout();
                window.location.href = '/login.html';
            }
        });
    },

    navigate(page) {
        const basePage = page.split('?')[0];
        window.location.hash = page;

        document.querySelectorAll('.nav-item').forEach(item => {
            const itemPage = item.dataset.page;
            const isQuality = itemPage === 'quality-orders';
            const isQualitySubpage = isQuality && basePage.startsWith('quality-');
            const isProcess = itemPage === 'process-templates';
            const isProcessSubpage = isProcess && basePage.startsWith('process-');
            item.classList.toggle('active', itemPage === basePage || isQualitySubpage || isProcessSubpage);
        });

        const titles = {
            dashboard: '监控中心',
            production: '生产线管理',
            equipment: '设备管理',
            tasks: '生产任务',
            alerts: '告警中心',
            simulation: '数据模拟',
            inventory: '物料库存',
            supplier: '供应商管理',
            'quality-templates': '质检模板',
            'quality-orders': '质检单管理',
            'quality-order-form': '质检单录入',
            'quality-analysis': '不合格分析',
            'repair-orders': '维修工单',
            'process-templates': '工艺模板',
            'process-compare': '版本对比',
            'process-audit': '审核工作台',
            'process-deploy': '下发记录'
        };
        const pageTitle = titles[basePage] || page;
        document.getElementById('pageTitle').textContent = pageTitle;
        document.title = pageTitle + ' - 生产线监控系统';

        if (this.currentPage && this.pages[this.currentPage]?.destroy) {
            this.pages[this.currentPage].destroy();
        }

        this.currentPage = basePage;
        if (this.pages[basePage]?.init) {
            this.pages[basePage].init();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

window.App = App;
