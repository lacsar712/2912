"""
维修工单控制器
"""
from flask import Blueprint, request, g
from services.repair_service import RepairService
from middleware.auth_middleware import login_required

repair_bp = Blueprint('repair', __name__)


def _get_current_user():
    try:
        user = getattr(g, 'user', None)
        if user:
            return getattr(user, 'username', None) or user.get('username') if isinstance(user, dict) else str(user)
    except Exception:
        pass
    return None


@repair_bp.route('/list', methods=['GET'])
@login_required
def get_orders():
    """获取工单列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 20, type=int)
    status = request.args.get('status')
    equipment_id = request.args.get('equipmentId', type=int)
    severity = request.args.get('severity')
    keyword = request.args.get('keyword')

    return RepairService.get_orders(page, size, status, equipment_id, severity, keyword)


@repair_bp.route('/<int:order_id>', methods=['GET'])
@login_required
def get_order(order_id):
    """获取工单详情"""
    return RepairService.get_order_by_id(order_id)


@repair_bp.route('/', methods=['POST'])
@login_required
def create_order():
    """创建报修单"""
    data = request.get_json()
    return RepairService.create_order(data, _get_current_user())


@repair_bp.route('/<int:order_id>/dispatch', methods=['POST'])
@login_required
def dispatch_order(order_id):
    """派工"""
    data = request.get_json() or {}
    return RepairService.dispatch_order(order_id, data, _get_current_user())


@repair_bp.route('/<int:order_id>/start-repair', methods=['POST'])
@login_required
def start_repair(order_id):
    """开始维修"""
    data = request.get_json() or {}
    return RepairService.start_repair(order_id, data, _get_current_user())


@repair_bp.route('/<int:order_id>/process', methods=['POST'])
@login_required
def add_process(order_id):
    """添加维修过程记录"""
    data = request.get_json()
    return RepairService.add_process(order_id, data, _get_current_user())


@repair_bp.route('/process/<int:process_id>', methods=['DELETE'])
@login_required
def delete_process(process_id):
    """删除维修过程记录"""
    return RepairService.delete_process(process_id, _get_current_user())


@repair_bp.route('/<int:order_id>/complete-repair', methods=['POST'])
@login_required
def complete_repair(order_id):
    """完成维修"""
    data = request.get_json() or {}
    return RepairService.complete_repair(order_id, data, _get_current_user())


@repair_bp.route('/<int:order_id>/accept', methods=['POST'])
@login_required
def accept_order(order_id):
    """验收"""
    data = request.get_json()
    return RepairService.accept_order(order_id, data, _get_current_user())


@repair_bp.route('/<int:order_id>/close', methods=['POST'])
@login_required
def close_order(order_id):
    """关闭工单"""
    data = request.get_json() or {}
    return RepairService.close_order(order_id, data, _get_current_user())


@repair_bp.route('/<int:order_id>/status', methods=['PUT'])
@login_required
def change_status(order_id):
    """通用状态流转"""
    data = request.get_json() or {}
    target_status = data.get('status')
    if not target_status:
        from utils.response import Response
        return Response.bad_request('缺少 status 参数')
    return RepairService.change_status(order_id, target_status, data, _get_current_user())


@repair_bp.route('/statistics', methods=['GET'])
@login_required
def get_statistics():
    """获取统计数据"""
    return RepairService.get_statistics()


@repair_bp.route('/equipment/<int:equipment_id>/history', methods=['GET'])
@login_required
def get_equipment_history(equipment_id):
    """获取设备维修历史"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 20, type=int)
    return RepairService.get_equipment_history(equipment_id, page, size)
