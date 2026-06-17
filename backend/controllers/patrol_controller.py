"""
巡检管理控制器
"""
from flask import Blueprint, request

from services.patrol_service import (
    PatrolRouteService, PatrolPlanService, PatrolTaskService
)
from middleware.auth_middleware import login_required

patrol_bp = Blueprint('patrol', __name__)


# ==================== 巡检路线接口 ====================

@patrol_bp.route('/routes', methods=['GET'])
@login_required
def get_routes():
    """获取巡检路线列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    status = request.args.get('status')

    return PatrolRouteService.get_routes(page, size, keyword, status)


@patrol_bp.route('/routes/all', methods=['GET'])
@login_required
def get_all_routes():
    """获取所有启用的路线（用于下拉选择）"""
    return PatrolRouteService.get_all_routes()


@patrol_bp.route('/routes/<int:route_id>', methods=['GET'])
@login_required
def get_route(route_id):
    """获取路线详情"""
    return PatrolRouteService.get_route_by_id(route_id)


@patrol_bp.route('/routes', methods=['POST'])
@login_required
def create_route():
    """创建巡检路线"""
    data = request.get_json()
    return PatrolRouteService.create_route(data)


@patrol_bp.route('/routes/<int:route_id>', methods=['PUT'])
@login_required
def update_route(route_id):
    """更新巡检路线"""
    data = request.get_json()
    return PatrolRouteService.update_route(route_id, data)


@patrol_bp.route('/routes/<int:route_id>/toggle', methods=['POST'])
@login_required
def toggle_route_status(route_id):
    """切换路线状态"""
    return PatrolRouteService.toggle_route_status(route_id)


@patrol_bp.route('/routes/<int:route_id>', methods=['DELETE'])
@login_required
def delete_route(route_id):
    """删除巡检路线"""
    return PatrolRouteService.delete_route(route_id)


# ==================== 巡检计划接口 ====================

@patrol_bp.route('/plans', methods=['GET'])
@login_required
def get_plans():
    """获取巡检计划列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    status = request.args.get('status')
    frequency = request.args.get('frequency')

    return PatrolPlanService.get_plans(page, size, keyword, status, frequency)


@patrol_bp.route('/plans/<int:plan_id>', methods=['GET'])
@login_required
def get_plan(plan_id):
    """获取计划详情"""
    return PatrolPlanService.get_plan_by_id(plan_id)


@patrol_bp.route('/plans', methods=['POST'])
@login_required
def create_plan():
    """创建巡检计划"""
    data = request.get_json()
    return PatrolPlanService.create_plan(data)


@patrol_bp.route('/plans/<int:plan_id>', methods=['PUT'])
@login_required
def update_plan(plan_id):
    """更新巡检计划"""
    data = request.get_json()
    return PatrolPlanService.update_plan(plan_id, data)


@patrol_bp.route('/plans/<int:plan_id>/toggle', methods=['POST'])
@login_required
def toggle_plan_status(plan_id):
    """切换计划状态"""
    return PatrolPlanService.toggle_plan_status(plan_id)


@patrol_bp.route('/plans/<int:plan_id>', methods=['DELETE'])
@login_required
def delete_plan(plan_id):
    """删除巡检计划"""
    return PatrolPlanService.delete_plan(plan_id)


# ==================== 巡检任务接口 ====================

@patrol_bp.route('/tasks', methods=['GET'])
@login_required
def get_tasks():
    """获取巡检任务列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    status = request.args.get('status')
    plan_id = request.args.get('plan_id', type=int)
    route_id = request.args.get('route_id', type=int)
    executor = request.args.get('executor')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    return PatrolTaskService.get_tasks(
        page, size, status, plan_id, route_id,
        executor, start_date, end_date
    )


@patrol_bp.route('/tasks/<int:task_id>', methods=['GET'])
@login_required
def get_task(task_id):
    """获取任务详情（含结果）"""
    return PatrolTaskService.get_task_by_id(task_id)


@patrol_bp.route('/tasks/generate-today', methods=['POST'])
@login_required
def generate_today_tasks():
    """根据计划生成今日巡检任务"""
    return PatrolTaskService.generate_today_tasks()


@patrol_bp.route('/tasks/check-overdue', methods=['POST'])
@login_required
def check_overdue_tasks():
    """检查并标记逾期任务"""
    return PatrolTaskService.check_overdue_tasks()


@patrol_bp.route('/tasks/<int:task_id>/start', methods=['POST'])
@login_required
def start_task(task_id):
    """开始执行任务"""
    data = request.get_json() or {}
    executor = data.get('executor')
    return PatrolTaskService.start_task(task_id, executor)


@patrol_bp.route('/tasks/<int:task_id>/submit', methods=['POST'])
@login_required
def submit_task_result(task_id):
    """提交巡检结果"""
    data = request.get_json()
    return PatrolTaskService.submit_task_result(task_id, data)


@patrol_bp.route('/tasks/statistics', methods=['GET'])
@login_required
def get_task_statistics():
    """获取巡检统计数据"""
    return PatrolTaskService.get_statistics()


@patrol_bp.route('/tasks/report', methods=['GET'])
@login_required
def get_task_report():
    """获取巡检报表数据"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    return PatrolTaskService.get_report(start_date, end_date)
