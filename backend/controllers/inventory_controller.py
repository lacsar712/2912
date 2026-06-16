"""
库存管理控制器
"""
from flask import Blueprint, request, g

from services.inventory_service import (
    MaterialService, StockInService, StockOutService,
    StockFlowService, InventoryStatsService
)
from middleware.auth_middleware import login_required

inventory_bp = Blueprint('inventory', __name__)


# ==================== 物料档案接口 ====================

@inventory_bp.route('/materials', methods=['GET'])
@login_required
def get_materials():
    """获取物料列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    category = request.args.get('category')
    keyword = request.args.get('keyword')
    status = request.args.get('status')

    return MaterialService.get_materials(page, size, category, keyword, status)


@inventory_bp.route('/materials/categories', methods=['GET'])
@login_required
def get_material_categories():
    """获取物料类目列表"""
    return MaterialService.get_categories()


@inventory_bp.route('/materials/<int:material_id>', methods=['GET'])
@login_required
def get_material(material_id):
    """获取物料详情"""
    return MaterialService.get_material_by_id(material_id)


@inventory_bp.route('/materials', methods=['POST'])
@login_required
def create_material():
    """创建物料"""
    data = request.get_json()
    return MaterialService.create_material(data)


@inventory_bp.route('/materials/<int:material_id>', methods=['PUT'])
@login_required
def update_material(material_id):
    """更新物料"""
    data = request.get_json()
    return MaterialService.update_material(material_id, data)


@inventory_bp.route('/materials/<int:material_id>/toggle', methods=['POST'])
@login_required
def toggle_material_status(material_id):
    """切换物料状态"""
    return MaterialService.toggle_material_status(material_id)


@inventory_bp.route('/materials/<int:material_id>', methods=['DELETE'])
@login_required
def delete_material(material_id):
    """删除物料"""
    return MaterialService.delete_material(material_id)


@inventory_bp.route('/materials/low-stock', methods=['GET'])
@login_required
def get_low_stock_materials():
    """获取低库存物料列表"""
    limit = request.args.get('limit', 10, type=int)
    return MaterialService.get_low_stock_materials(limit)


@inventory_bp.route('/materials/view', methods=['GET'])
@login_required
def get_inventory_view():
    """按物料聚合的库存视图"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    category = request.args.get('category')
    keyword = request.args.get('keyword')

    return MaterialService.get_inventory_view(page, size, category, keyword)


# ==================== 入库单接口 ====================

@inventory_bp.route('/stock-in', methods=['GET'])
@login_required
def get_stock_ins():
    """获取入库单列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    material_id = request.args.get('materialId', type=int)
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    return StockInService.get_stock_ins(page, size, material_id, start_date, end_date)


@inventory_bp.route('/stock-in', methods=['POST'])
@login_required
def create_stock_in():
    """创建入库单"""
    data = request.get_json()
    return StockInService.create_stock_in(data)


@inventory_bp.route('/stock-in/<int:stock_in_id>', methods=['DELETE'])
@login_required
def delete_stock_in(stock_in_id):
    """删除入库单"""
    return StockInService.delete_stock_in(stock_in_id)


# ==================== 出库单接口 ====================

@inventory_bp.route('/stock-out', methods=['GET'])
@login_required
def get_stock_outs():
    """获取出库单列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    material_id = request.args.get('materialId', type=int)
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    return StockOutService.get_stock_outs(page, size, material_id, start_date, end_date)


@inventory_bp.route('/stock-out', methods=['POST'])
@login_required
def create_stock_out():
    """创建出库单"""
    data = request.get_json()
    return StockOutService.create_stock_out(data)


@inventory_bp.route('/stock-out/<int:stock_out_id>', methods=['DELETE'])
@login_required
def delete_stock_out(stock_out_id):
    """删除出库单"""
    return StockOutService.delete_stock_out(stock_out_id)


# ==================== 库存流水接口 ====================

@inventory_bp.route('/stock-flow', methods=['GET'])
@login_required
def get_stock_flows():
    """获取库存流水列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    material_id = request.args.get('materialId', type=int)
    flow_type = request.args.get('flowType')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    return StockFlowService.get_stock_flows(page, size, material_id, flow_type, start_date, end_date)


# ==================== 库存统计接口 ====================

@inventory_bp.route('/stats', methods=['GET'])
@login_required
def get_inventory_stats():
    """获取库存统计"""
    return InventoryStatsService.get_inventory_stats()


@inventory_bp.route('/trend', methods=['GET'])
@login_required
def get_stock_trend():
    """获取库存趋势"""
    days = request.args.get('days', 7, type=int)
    return InventoryStatsService.get_stock_trend(days)


@inventory_bp.route('/dashboard', methods=['GET'])
@login_required
def get_inventory_dashboard():
    """获取库存看板数据"""
    return InventoryStatsService.get_dashboard_data()
