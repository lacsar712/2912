"""
供应商管理控制器
"""
from flask import Blueprint, request
from services.supplier_service import (
    SupplierService, ContractService,
    MonthlyRatingService, SupplierDashboardService
)
from middleware.auth_middleware import login_required

supplier_bp = Blueprint('supplier', __name__)


# ==================== 供应商档案接口 ====================

@supplier_bp.route('/suppliers', methods=['GET'])
@login_required
def get_suppliers():
    """获取供应商列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    status = request.args.get('status')
    grade = request.args.get('grade')

    return SupplierService.get_suppliers(page, size, keyword, status, grade)


@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['GET'])
@login_required
def get_supplier(supplier_id):
    """获取供应商详情"""
    return SupplierService.get_supplier_by_id(supplier_id)


@supplier_bp.route('/suppliers', methods=['POST'])
@login_required
def create_supplier():
    """创建供应商"""
    data = request.get_json()
    return SupplierService.create_supplier(data)


@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['PUT'])
@login_required
def update_supplier(supplier_id):
    """更新供应商"""
    data = request.get_json()
    return SupplierService.update_supplier(supplier_id, data)


@supplier_bp.route('/suppliers/<int:supplier_id>', methods=['DELETE'])
@login_required
def delete_supplier(supplier_id):
    """删除供应商"""
    return SupplierService.delete_supplier(supplier_id)


# ==================== 合同管理接口 ====================

@supplier_bp.route('/contracts', methods=['GET'])
@login_required
def get_contracts():
    """获取合同列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    supplier_id = request.args.get('supplierId', type=int)
    status = request.args.get('status')

    return ContractService.get_contracts(page, size, supplier_id, status)


@supplier_bp.route('/contracts/expiring', methods=['GET'])
@login_required
def get_expiring_contracts():
    """获取即将到期的合同"""
    days = request.args.get('days', 15, type=int)
    limit = request.args.get('limit', 5, type=int)
    return ContractService.get_expiring_contracts(days, limit)


@supplier_bp.route('/contracts/<int:contract_id>', methods=['GET'])
@login_required
def get_contract(contract_id):
    """获取合同详情"""
    return ContractService.get_contract_by_id(contract_id)


@supplier_bp.route('/contracts', methods=['POST'])
@login_required
def create_contract():
    """创建合同"""
    data = request.get_json()
    return ContractService.create_contract(data)


@supplier_bp.route('/contracts/<int:contract_id>', methods=['PUT'])
@login_required
def update_contract(contract_id):
    """更新合同"""
    data = request.get_json()
    return ContractService.update_contract(contract_id, data)


@supplier_bp.route('/contracts/<int:contract_id>', methods=['DELETE'])
@login_required
def delete_contract(contract_id):
    """删除合同"""
    return ContractService.delete_contract(contract_id)


# ==================== 月度评分接口 ====================

@supplier_bp.route('/ratings', methods=['GET'])
@login_required
def get_ratings():
    """获取评分列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    supplier_id = request.args.get('supplierId', type=int)
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)

    return MonthlyRatingService.get_ratings(page, size, supplier_id, year, month)


@supplier_bp.route('/ratings/<int:rating_id>', methods=['GET'])
@login_required
def get_rating(rating_id):
    """获取评分详情"""
    return MonthlyRatingService.get_rating_by_id(rating_id)


@supplier_bp.route('/ratings', methods=['POST'])
@login_required
def create_rating():
    """创建月度评分"""
    data = request.get_json()
    return MonthlyRatingService.create_rating(data)


@supplier_bp.route('/ratings/<int:rating_id>', methods=['PUT'])
@login_required
def update_rating(rating_id):
    """更新月度评分"""
    data = request.get_json()
    return MonthlyRatingService.update_rating(rating_id, data)


@supplier_bp.route('/ratings/<int:rating_id>', methods=['DELETE'])
@login_required
def delete_rating(rating_id):
    """删除月度评分"""
    return MonthlyRatingService.delete_rating(rating_id)


# ==================== 看板接口 ====================

@supplier_bp.route('/dashboard/grading', methods=['GET'])
@login_required
def get_grading_dashboard():
    """获取分级看板数据"""
    return SupplierDashboardService.get_grading_dashboard()


@supplier_bp.route('/dashboard/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """获取监控中心供应商统计"""
    return SupplierDashboardService.get_dashboard_stats()


@supplier_bp.route('/contracts/check-expiry', methods=['POST'])
@login_required
def check_contract_expiry():
    """手动触发合同到期检查"""
    count = ContractService.check_contract_expiry()
    from utils.response import Response
    return Response.success({'alert_count': count}, f'已生成 {count} 条到期告警')
