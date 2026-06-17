"""
客户订单与拆单派工模型
"""
from datetime import datetime, timedelta
from database.db import db
from models.base import BaseModel


class Customer(BaseModel):
    """客户档案模型"""
    __tablename__ = 'customer'

    customer_code = db.Column(db.String(50), unique=True, nullable=False, comment='客户编号')
    customer_name = db.Column(db.String(200), nullable=False, comment='客户名称')
    contact_person = db.Column(db.String(50), comment='联系人')
    contact_phone = db.Column(db.String(20), comment='联系电话')
    address = db.Column(db.String(500), comment='地址')
    credit_level = db.Column(db.Enum('A', 'B', 'C', 'D'), default='B', comment='信用等级 A/B/C/D')
    remark = db.Column(db.Text, comment='备注')

    orders = db.relationship('CustomerOrder', backref='customer_ref', lazy='dynamic', foreign_keys='CustomerOrder.customer_id')

    def to_dict(self):
        result = super().to_dict()
        try:
            result['order_count'] = self.orders.filter(CustomerOrder.status == 1).count()
        except Exception:
            result['order_count'] = 0
        return result

    def __repr__(self):
        return f'<Customer {self.customer_name}>'


class CustomerOrder(BaseModel):
    """客户订单模型"""
    __tablename__ = 'customer_order'

    order_no = db.Column(db.String(50), unique=True, nullable=False, comment='订单号')
    customer_id = db.Column(db.BigInteger, db.ForeignKey('customer.id'), comment='客户ID')
    product_name = db.Column(db.String(200), nullable=False, comment='产品名')
    specification = db.Column(db.String(200), comment='规格')
    quantity = db.Column(db.Integer, nullable=False, default=0, comment='订购数量')
    unit_price = db.Column(db.Numeric(12, 2), default=0, comment='单价')
    total_amount = db.Column(db.Numeric(15, 2), default=0, comment='总金额')
    delivery_date = db.Column(db.Date, comment='交期')
    order_status = db.Column(
        db.Enum('pending', 'approved', 'in_production', 'partial_shipped', 'completed', 'cancelled'),
        default='pending',
        comment='状态: pending待审/approved已审/in_production生产中/partial_shipped部分发货/completed已完成/cancelled已取消'
    )
    remark = db.Column(db.Text, comment='备注')

    task_links = db.relationship('OrderProductionTask', backref='order_ref', lazy='dynamic', foreign_keys='OrderProductionTask.order_id')
    deliveries = db.relationship('Delivery', backref='order_ref', lazy='dynamic', foreign_keys='Delivery.order_id')

    def get_completion_rate(self):
        """计算订单完成率（基于关联生产任务进度）"""
        links = self.task_links.filter(OrderProductionTask.status == 1).all()
        if not links:
            return 0
        total_qty = 0
        completed_qty = 0
        for link in links:
            if link.task_ref:
                task = link.task_ref
                total_qty += task.quantity or 0
                completed_qty += task.completed_quantity or 0
        if total_qty == 0:
            return 0
        return round(completed_qty / total_qty * 100, 2)

    def get_shipped_quantity(self):
        """获取已发货数量"""
        total = 0
        for d in self.deliveries.filter(Delivery.status == 1).all():
            total += d.shipped_quantity or 0
        return total

    def estimate_completion_date(self):
        """估算预计完成日期，基于关联任务进度"""
        links = self.task_links.filter(OrderProductionTask.status == 1).all()
        if not links:
            return None

        now = datetime.now()
        max_end_time = None
        for link in links:
            task = link.task_ref
            if not task:
                continue

            if task.status == 'completed':
                if task.actual_end_time:
                    t = task.actual_end_time
                    if max_end_time is None or t > max_end_time:
                        max_end_time = t
                continue

            if task.status == 'cancelled':
                continue

            progress = task.get_progress()
            if task.actual_start_time and progress > 0:
                elapsed = (now - task.actual_start_time).total_seconds()
                remaining_ratio = (100 - progress) / progress if progress > 0 else 1
                estimated_remaining = timedelta(seconds=elapsed * remaining_ratio)
                est_end = now + estimated_remaining
            elif task.end_time:
                est_end = task.end_time
            elif task.start_time:
                est_end = task.start_time + timedelta(days=7)
            else:
                est_end = now + timedelta(days=7)

            if max_end_time is None or est_end > max_end_time:
                max_end_time = est_end

        return max_end_time

    def has_delay_risk(self):
        """判断是否有延期风险（预计完成时间 > 交期）"""
        if not self.delivery_date:
            return False
        est = self.estimate_completion_date()
        if not est:
            return False
        delivery_dt = datetime.combine(self.delivery_date, datetime.max.time())
        return est > delivery_dt

    def to_dict(self):
        result = super().to_dict()
        if self.customer_ref:
            result['customer_code'] = self.customer_ref.customer_code
            result['customer_name'] = self.customer_ref.customer_name
            result['contact_phone'] = self.customer_ref.contact_phone
        result['completion_rate'] = self.get_completion_rate()
        result['shipped_quantity'] = self.get_shipped_quantity()
        result['estimated_completion'] = self.estimate_completion_date().strftime('%Y-%m-%d %H:%M:%S') if self.estimate_completion_date() else None
        result['delay_risk'] = self.has_delay_risk()
        result['task_count'] = self.task_links.filter(OrderProductionTask.status == 1).count()
        result['delivery_count'] = self.deliveries.filter(Delivery.status == 1).count()
        return result

    def __repr__(self):
        return f'<CustomerOrder {self.order_no}>'


class OrderProductionTask(BaseModel):
    """订单与生产任务关联表模型"""
    __tablename__ = 'order_production_task'

    order_id = db.Column(db.BigInteger, db.ForeignKey('customer_order.id'), comment='订单ID')
    task_id = db.Column(db.BigInteger, db.ForeignKey('production_task.id'), comment='生产任务ID')
    split_quantity = db.Column(db.Integer, default=0, comment='拆分数量')
    remark = db.Column(db.Text, comment='备注')

    task_ref = db.relationship('ProductionTask', foreign_keys=[task_id])

    def to_dict(self):
        result = super().to_dict()
        if self.order_ref:
            result['order_no'] = self.order_ref.order_no
            result['product_name'] = self.order_ref.product_name
        if self.task_ref:
            result['task_code'] = self.task_ref.task_code
            result['task_name'] = self.task_ref.task_name
            result['task_status'] = self.task_ref.status
            result['task_progress'] = self.task_ref.get_progress()
            result['task_quantity'] = self.task_ref.quantity
            result['task_completed_quantity'] = self.task_ref.completed_quantity
            result['task_end_time'] = self.task_ref.end_time.strftime('%Y-%m-%d %H:%M:%S') if self.task_ref.end_time else None
            result['task_actual_end_time'] = self.task_ref.actual_end_time.strftime('%Y-%m-%d %H:%M:%S') if self.task_ref.actual_end_time else None
        return result

    def __repr__(self):
        return f'<OrderProductionTask order={self.order_id} task={self.task_id}>'


class Delivery(BaseModel):
    """发货单模型"""
    __tablename__ = 'delivery'

    delivery_no = db.Column(db.String(50), unique=True, nullable=False, comment='发货单号')
    order_id = db.Column(db.BigInteger, db.ForeignKey('customer_order.id'), comment='订单ID')
    shipped_quantity = db.Column(db.Integer, default=0, comment='发货数量')
    logistics_no = db.Column(db.String(100), comment='物流单号')
    shipped_time = db.Column(db.DateTime, comment='发货时间')
    sign_status = db.Column(
        db.Enum('pending', 'shipped', 'signed', 'returned'),
        default='shipped',
        comment='签收状态: pending待发货/shipped已运输/signed已签收/returned已退回'
    )
    remark = db.Column(db.Text, comment='备注')

    def to_dict(self):
        result = super().to_dict()
        if self.order_ref:
            result['order_no'] = self.order_ref.order_no
            result['product_name'] = self.order_ref.product_name
            result['specification'] = self.order_ref.specification
            result['customer_name'] = self.order_ref.customer_ref.customer_name if self.order_ref.customer_ref else ''
        return result

    def __repr__(self):
        return f'<Delivery {self.delivery_no}>'
