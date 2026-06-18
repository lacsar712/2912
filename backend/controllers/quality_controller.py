"""
质检管理控制器
"""
from flask import Blueprint, request, g

from services.quality_service import (
    TemplateService, InspectionOrderService,
    DefectService, QualityStatisticsService, TaskSyncService
)
from middleware.auth_middleware import login_required

quality_bp = Blueprint('quality', __name__)


# ==================== 质检模板接口 ====================

@quality_bp.route('/templates', methods=['GET'])
@login_required
def get_templates():
    """获取模板列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    is_active = request.args.get('is_active', type=int)

    return TemplateService.get_templates(page, size, keyword, is_active)


@quality_bp.route('/templates/<int:template_id>', methods=['GET'])
@login_required
def get_template(template_id):
    """获取模板详情"""
    return TemplateService.get_template_by_id(template_id)


@quality_bp.route('/templates', methods=['POST'])
@login_required
def create_template():
    """创建模板"""
    data = request.get_json()
    return TemplateService.create_template(data)


@quality_bp.route('/templates/<int:template_id>', methods=['PUT'])
@login_required
def update_template(template_id):
    """更新模板"""
    data = request.get_json()
    return TemplateService.update_template(template_id, data)


@quality_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@login_required
def delete_template(template_id):
    """删除模板"""
    return TemplateService.delete_template(template_id)


@quality_bp.route('/templates/<int:template_id>/toggle', methods=['POST'])
@login_required
def toggle_template(template_id):
    """切换模板启用/停用状态"""
    return TemplateService.toggle_template_status(template_id)


# ==================== 质检单接口 ====================

@quality_bp.route('/orders', methods=['GET'])
@login_required
def get_orders():
    """获取质检单列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    task_id = request.args.get('taskId', type=int)
    task_keyword = request.args.get('taskKeyword')
    product_name = request.args.get('productName')
    overall_result = request.args.get('overallResult')
    keyword = request.args.get('keyword')

    return InspectionOrderService.get_orders(
        page, size, task_id, task_keyword, product_name, overall_result, keyword
    )


@quality_bp.route('/orders/<int:order_id>', methods=['GET'])
@login_required
def get_order(order_id):
    """获取质检单详情"""
    return InspectionOrderService.get_order_by_id(order_id)


@quality_bp.route('/orders/task/<int:task_id>', methods=['GET'])
@login_required
def get_order_by_task(task_id):
    """根据任务ID获取质检单"""
    return InspectionOrderService.get_order_by_task(task_id)


@quality_bp.route('/orders', methods=['POST'])
@login_required
def create_order():
    """创建质检单"""
    data = request.get_json()
    return InspectionOrderService.create_order(data)


@quality_bp.route('/orders/<int:order_id>', methods=['PUT'])
@login_required
def update_order(order_id):
    """更新质检单"""
    data = request.get_json()
    return InspectionOrderService.update_order(order_id, data)


@quality_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@login_required
def delete_order(order_id):
    """删除质检单"""
    return InspectionOrderService.delete_order(order_id)


# ==================== 不合格记录接口 ====================

@quality_bp.route('/defects', methods=['GET'])
@login_required
def get_defects():
    """获取不合格记录列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    order_id = request.args.get('orderId', type=int)
    defect_type = request.args.get('defectType')
    severity = request.args.get('severity')

    return DefectService.get_defects(page, size, order_id, defect_type, severity)


@quality_bp.route('/defects/<int:defect_id>', methods=['GET'])
@login_required
def get_defect(defect_id):
    """获取不合格记录详情"""
    return DefectService.get_defect_by_id(defect_id)


@quality_bp.route('/defects', methods=['POST'])
@login_required
def create_defect():
    """创建不合格记录"""
    data = request.get_json()
    return DefectService.create_defect(data)


@quality_bp.route('/defects/<int:defect_id>', methods=['PUT'])
@login_required
def update_defect(defect_id):
    """更新不合格记录"""
    data = request.get_json()
    return DefectService.update_defect(defect_id, data)


@quality_bp.route('/defects/<int:defect_id>', methods=['DELETE'])
@login_required
def delete_defect(defect_id):
    """删除不合格记录"""
    return DefectService.delete_defect(defect_id)


# ==================== 统计分析接口 ====================

@quality_bp.route('/statistics/pareto', methods=['GET'])
@login_required
def get_pareto():
    """获取帕累托图数据"""
    days = request.args.get('days', 30, type=int)
    return QualityStatisticsService.get_pareto_data(days)


@quality_bp.route('/statistics/overview', methods=['GET'])
@login_required
def get_overview():
    """获取质检概览数据"""
    return QualityStatisticsService.get_overview()


# ==================== 任务同步接口 ====================

@quality_bp.route('/sync/task/<int:task_id>', methods=['POST'])
@login_required
def sync_task(task_id):
    """同步任务质检数据"""
    return TaskSyncService.on_task_complete(task_id)
