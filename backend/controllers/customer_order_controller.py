"""
客户订单管理控制器
"""
from flask import Blueprint, request
from services.customer_order_service import (
    CustomerService, OrderService,
    DeliveryService, OrderDashboardService
)
from middleware.auth_middleware import login_required

customer_order_bp = Blueprint('customer_order', __name__)


# ==================== 客户档案接口 ====================

@customer_order_bp.route('/customers', methods=['GET'])
@login_required
def get_customers():
    """获取客户列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    credit_level = request.args.get('credit_level')

    return CustomerService.get_customers(page, size, keyword, credit_level)


@customer_order_bp.route('/customers/<int:customer_id>', methods=['GET'])
@login_required
def get_customer(customer_id):
    """获取客户详情"""
    return CustomerService.get_customer_by_id(customer_id)


@customer_order_bp.route('/customers', methods=['POST'])
@login_required
def create_customer():
    """创建客户"""
    data = request.get_json()
    return CustomerService.create_customer(data)


@customer_order_bp.route('/customers/<int:customer_id>', methods=['PUT'])
@login_required
def update_customer(customer_id):
    """更新客户"""
    data = request.get_json()
    return CustomerService.update_customer(customer_id, data)


@customer_order_bp.route('/customers/<int:customer_id>', methods=['DELETE'])
@login_required
def delete_customer(customer_id):
    """删除客户"""
    return CustomerService.delete_customer(customer_id)


# ==================== 订单接口 ====================

@customer_order_bp.route('/orders', methods=['GET'])
@login_required
def get_orders():
    """获取订单列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    customer_id = request.args.get('customerId', type=int)
    status = request.args.get('status')
    delay_risk = request.args.get('delayRisk')

    return OrderService.get_orders(page, size, keyword, customer_id, status, delay_risk)


@customer_order_bp.route('/orders/<int:order_id>', methods=['GET'])
@login_required
def get_order(order_id):
    """获取订单详情"""
    return OrderService.get_order_by_id(order_id)


@customer_order_bp.route('/orders', methods=['POST'])
@login_required
def create_order():
    """创建订单"""
    data = request.get_json()
    return OrderService.create_order(data)


@customer_order_bp.route('/orders/<int:order_id>', methods=['PUT'])
@login_required
def update_order(order_id):
    """更新订单"""
    data = request.get_json()
    return OrderService.update_order(order_id, data)


@customer_order_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@login_required
def delete_order(order_id):
    """删除订单"""
    return OrderService.delete_order(order_id)


@customer_order_bp.route('/orders/<int:order_id>/approve', methods=['PUT'])
@login_required
def approve_order(order_id):
    """审核订单"""
    return OrderService.approve_order(order_id)


@customer_order_bp.route('/orders/<int:order_id>/cancel', methods=['PUT'])
@login_required
def cancel_order(order_id):
    """取消订单"""
    return OrderService.cancel_order(order_id)


@customer_order_bp.route('/orders/<int:order_id>/split', methods=['POST'])
@login_required
def split_order(order_id):
    """拆单为生产任务"""
    data = request.get_json()
    return OrderService.split_order(order_id, data)


# ==================== 发货单接口 ====================

@customer_order_bp.route('/deliveries', methods=['GET'])
@login_required
def get_deliveries():
    """获取发货单列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    order_id = request.args.get('orderId', type=int)
    sign_status = request.args.get('signStatus')

    return DeliveryService.get_deliveries(page, size, order_id, sign_status)


@customer_order_bp.route('/deliveries', methods=['POST'])
@login_required
def create_delivery():
    """创建发货单"""
    data = request.get_json()
    return DeliveryService.create_delivery(data)


@customer_order_bp.route('/deliveries/<int:delivery_id>', methods=['PUT'])
@login_required
def update_delivery(delivery_id):
    """更新发货单"""
    data = request.get_json()
    return DeliveryService.update_delivery(delivery_id, data)


@customer_order_bp.route('/deliveries/<int:delivery_id>', methods=['DELETE'])
@login_required
def delete_delivery(delivery_id):
    """删除发货单"""
    return DeliveryService.delete_delivery(delivery_id)


# ==================== 看板/统计接口 ====================

@customer_order_bp.route('/dashboard/delay-risks', methods=['GET'])
@login_required
def get_delay_risks():
    """获取延期风险订单列表"""
    limit = request.args.get('limit', 10, type=int)
    return OrderDashboardService.get_delay_risks(limit)


@customer_order_bp.route('/dashboard/stats', methods=['GET'])
@login_required
def get_dashboard_stats():
    """获取订单统计数据"""
    return OrderDashboardService.get_stats()


@customer_order_bp.route('/orders/<int:order_id>/completion', methods=['GET'])
@login_required
def get_order_completion(order_id):
    """获取订单完成率与延期风险详情"""
    return OrderService.get_order_completion(order_id)
