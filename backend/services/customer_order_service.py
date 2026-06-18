"""
客户订单管理服务
"""
from datetime import datetime
from flask import g
from database.db import db
from models.customer_order import Customer, CustomerOrder, OrderProductionTask, Delivery
from models.production import ProductionTask, ProductionLine
from models.log import Log
from utils.response import Response
from utils.validator import Validator


class CustomerService:
    """客户服务类"""

    @staticmethod
    def get_customers(page=1, size=10, keyword=None, credit_level=None):
        """获取客户列表"""
        query = Customer.query

        if keyword:
            query = query.filter(
                (Customer.customer_code.like(f'%{keyword}%')) |
                (Customer.customer_name.like(f'%{keyword}%')) |
                (Customer.contact_person.like(f'%{keyword}%'))
            )
        if credit_level:
            query = query.filter(Customer.credit_level == credit_level)

        pagination = query.order_by(Customer.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [c.to_dict() for c in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_customer_by_id(customer_id):
        """获取客户详情"""
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return Response.not_found('客户不存在')

        result = customer.to_dict()

        orders = CustomerOrder.query.filter(
            CustomerOrder.customer_id == customer_id,
            CustomerOrder.status == 1
        ).order_by(CustomerOrder.create_time.desc()).all()
        result['orders'] = [o.to_dict() for o in orders]

        return Response.success(result)

    @staticmethod
    def create_customer(data):
        """创建客户"""
        validation = Validator.validate_form(data, {
            'customer_code': ['required'],
            'customer_name': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Customer.query.filter_by(customer_code=data['customer_code']).first():
            return Response.error('客户编号已存在', 409)

        customer = Customer(
            customer_code=data['customer_code'],
            customer_name=data['customer_name'],
            contact_person=data.get('contact_person', ''),
            contact_phone=data.get('contact_phone', ''),
            address=data.get('address', ''),
            credit_level=data.get('credit_level', 'B'),
            remark=data.get('remark', '')
        )

        try:
            customer.save()
            Log.add_log(g.user_id, g.username, 'create', 'customer',
                       f'创建客户: {customer.customer_name}')
            return Response.created({'id': customer.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_customer(customer_id, data):
        """更新客户"""
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return Response.not_found('客户不存在')

        if 'customer_code' in data:
            existing = Customer.query.filter_by(customer_code=data['customer_code']).first()
            if existing and existing.id != customer_id:
                return Response.error('客户编号已存在', 409)

        allowed = ['customer_code', 'customer_name', 'contact_person',
                  'contact_phone', 'address', 'credit_level', 'remark']
        update_data = {k: v for k, v in data.items() if k in allowed}

        try:
            customer.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'customer',
                       f'更新客户: {customer.customer_name}')
            return Response.success(customer.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_customer(customer_id):
        """删除客户"""
        customer = Customer.get_by_id(customer_id)
        if not customer:
            return Response.not_found('客户不存在')

        try:
            customer.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'customer',
                       f'删除客户: {customer.customer_name}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class OrderService:
    """订单服务类"""

    @staticmethod
    def get_orders(page=1, size=10, keyword=None, customer_id=None, status=None, delay_risk=None):
        """获取订单列表"""
        query = CustomerOrder.query

        if keyword:
            query = query.filter(
                (CustomerOrder.order_no.like(f'%{keyword}%')) |
                (CustomerOrder.product_name.like(f'%{keyword}%'))
            )
        if customer_id:
            query = query.filter(CustomerOrder.customer_id == customer_id)
        if status:
            query = query.filter(CustomerOrder.order_status == status)

        pagination = query.order_by(CustomerOrder.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = []
        for o in pagination.items:
            o_dict = o.to_dict()
            if delay_risk is not None and delay_risk != '':
                dr = o_dict.get('delay_risk', False)
                if str(delay_risk) == '1' and not dr:
                    continue
                if str(delay_risk) == '0' and dr:
                    continue
            items.append(o_dict)

        total = len(items) if delay_risk else pagination.total

        return Response.paginate(items, total, page, size)

    @staticmethod
    def get_order_by_id(order_id):
        """获取订单详情"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        result = order.to_dict()

        task_links = OrderProductionTask.query.filter(
            OrderProductionTask.order_id == order_id,
            OrderProductionTask.status == 1
        ).order_by(OrderProductionTask.create_time.desc()).all()
        result['task_links'] = [tl.to_dict() for tl in task_links]
        result['production_tasks'] = result['task_links']

        deliveries = Delivery.query.filter(
            Delivery.order_id == order_id,
            Delivery.status == 1
        ).order_by(Delivery.create_time.desc()).all()
        result['deliveries'] = [d.to_dict() for d in deliveries]

        return Response.success(result)

    @staticmethod
    def create_order(data):
        """创建订单"""
        validation = Validator.validate_form(data, {
            'order_no': ['required'],
            'customer_id': ['required'],
            'product_name': ['required'],
            'quantity': ['required', 'integer', 'positive']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if CustomerOrder.query.filter_by(order_no=data['order_no']).first():
            return Response.error('订单号已存在', 409)

        customer = Customer.get_by_id(data['customer_id'])
        if not customer:
            return Response.not_found('客户不存在')

        delivery_date = None
        if data.get('delivery_date'):
            try:
                delivery_date = datetime.strptime(
                    data['delivery_date'], '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response.bad_request('交期格式错误，请使用 YYYY-MM-DD')

        quantity = int(data['quantity'])
        unit_price = float(data.get('unit_price', 0))
        total_amount = quantity * unit_price

        order = CustomerOrder(
            order_no=data['order_no'],
            customer_id=data['customer_id'],
            product_name=data['product_name'],
            specification=data.get('specification', ''),
            quantity=quantity,
            unit_price=unit_price,
            total_amount=total_amount,
            delivery_date=delivery_date,
            order_status=data.get('order_status', 'pending'),
            remark=data.get('remark', '')
        )

        try:
            order.save()
            Log.add_log(g.user_id, g.username, 'create', 'customer_order',
                       f'创建订单: {order.order_no} - {order.product_name}')
            return Response.created({'id': order.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_order(order_id, data):
        """更新订单"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        if 'order_no' in data:
            existing = CustomerOrder.query.filter_by(order_no=data['order_no']).first()
            if existing and existing.id != order_id:
                return Response.error('订单号已存在', 409)

        allowed = ['order_no', 'customer_id', 'product_name', 'specification',
                  'quantity', 'unit_price', 'total_amount', 'order_status', 'remark']
        update_data = {}

        for k, v in data.items():
            if k in allowed:
                update_data[k] = v

        if 'delivery_date' in data:
            try:
                update_data['delivery_date'] = datetime.strptime(
                    data['delivery_date'], '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response.bad_request('交期格式错误，请使用 YYYY-MM-DD')

        if 'quantity' in update_data or 'unit_price' in update_data:
            qty = int(update_data.get('quantity', order.quantity))
            price = float(update_data.get('unit_price', order.unit_price))
            update_data['total_amount'] = qty * price

        try:
            order.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'customer_order',
                       f'更新订单: {order.order_no}')
            return Response.success(order.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_order(order_id):
        """删除订单"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        try:
            order.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'customer_order',
                       f'删除订单: {order.order_no}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')

    @staticmethod
    def approve_order(order_id):
        """审核订单"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        if order.order_status != 'pending':
            return Response.error('只有待审核状态的订单才能审核')

        try:
            order.update(order_status='approved')
            Log.add_log(g.user_id, g.username, 'update', 'customer_order',
                       f'审核订单: {order.order_no}')
            return Response.success(order.to_dict(), '审核成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'审核失败: {str(e)}')

    @staticmethod
    def cancel_order(order_id):
        """取消订单"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        if order.order_status == 'completed':
            return Response.error('已完成的订单不能取消')

        try:
            order.update(order_status='cancelled')
            Log.add_log(g.user_id, g.username, 'update', 'customer_order',
                       f'取消订单: {order.order_no}')
            return Response.success(order.to_dict(), '取消成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'取消失败: {str(e)}')

    @staticmethod
    def split_order(order_id, data):
        """拆单为生产任务"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        validation = Validator.validate_form(data, {
            'product_name': ['required'],
            'quantity': ['required', 'integer', 'positive']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        quantity = int(data['quantity'])
        existing_qty = sum(
            link.split_quantity or 0
            for link in order.task_links.filter(OrderProductionTask.status == 1).all()
        )
        if existing_qty + quantity > (order.quantity or 0):
            return Response.bad_request('拆分数量超过订单总数量')

        line_id = data.get('line_id')
        if line_id:
            line = ProductionLine.get_by_id(line_id)
            if not line:
                return Response.not_found('生产线不存在')

        now = datetime.now()
        task_code = f"TASK-{now.strftime('%Y%m%d%H%M%S')}-{ProductionTask.query.count() + 1}"

        start_time = None
        if data.get('start_time'):
            try:
                start_time = datetime.strptime(data['start_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    start_time = datetime.strptime(data['start_time'], '%Y-%m-%d')
                except ValueError:
                    return Response.bad_request('开始时间格式错误')

        end_time = None
        if data.get('end_time'):
            try:
                end_time = datetime.strptime(data['end_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    end_time = datetime.strptime(data['end_time'], '%Y-%m-%d')
                except ValueError:
                    return Response.bad_request('结束时间格式错误')

        task = ProductionTask(
            task_code=task_code,
            task_name=data['product_name'],
            line_id=line_id,
            product_name=data['product_name'],
            product_spec=data.get('specification', ''),
            quantity=quantity,
            completed_quantity=0,
            status='pending',
            priority=int(data.get('priority', 5)),
            start_time=start_time,
            end_time=end_time
        )

        try:
            task.save()

            link = OrderProductionTask(
                order_id=order_id,
                task_id=task.id,
                split_quantity=quantity,
                remark=data.get('remark', '')
            )
            link.save()

            if order.order_status in ('pending', 'approved'):
                order.update(order_status='in_production')

            Log.add_log(g.user_id, g.username, 'create', 'production_task',
                       f'拆单: {order.order_no} -> {task.task_code}, 数量: {quantity}')
            return Response.created({'id': task.id, 'task_code': task.task_code}, '拆单成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'拆单失败: {str(e)}')

    @staticmethod
    def get_order_completion(order_id):
        """获取订单完成率与延期风险详情"""
        order = CustomerOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('订单不存在')

        result = {
            'order_id': order.id,
            'order_no': order.order_no,
            'product_name': order.product_name,
            'quantity': order.quantity,
            'delivery_date': order.delivery_date.strftime('%Y-%m-%d') if order.delivery_date else None,
            'completion_rate': order.get_completion_rate(),
            'shipped_quantity': order.get_shipped_quantity(),
            'estimated_completion': order.estimate_completion_date().strftime('%Y-%m-%d %H:%M:%S') if order.estimate_completion_date() else None,
            'delay_risk': order.has_delay_risk()
        }

        task_links = OrderProductionTask.query.filter(
            OrderProductionTask.order_id == order_id,
            OrderProductionTask.status == 1
        ).all()
        result['tasks'] = [tl.to_dict() for tl in task_links]

        deliveries = Delivery.query.filter(
            Delivery.order_id == order_id,
            Delivery.status == 1
        ).all()
        result['deliveries'] = [d.to_dict() for d in deliveries]

        return Response.success(result)


class DeliveryService:
    """发货单服务类"""

    @staticmethod
    def get_deliveries(page=1, size=10, order_id=None, sign_status=None):
        """获取发货单列表"""
        query = Delivery.query

        if order_id:
            query = query.filter(Delivery.order_id == order_id)
        if sign_status:
            query = query.filter(Delivery.sign_status == sign_status)

        pagination = query.order_by(Delivery.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [d.to_dict() for d in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def create_delivery(data):
        """创建发货单"""
        validation = Validator.validate_form(data, {
            'delivery_no': ['required'],
            'order_id': ['required'],
            'shipped_quantity': ['required', 'integer', 'positive']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Delivery.query.filter_by(delivery_no=data['delivery_no']).first():
            return Response.error('发货单号已存在', 409)

        order = CustomerOrder.get_by_id(data['order_id'])
        if not order:
            return Response.not_found('订单不存在')

        shipped_quantity = int(data['shipped_quantity'])
        existing_shipped = order.get_shipped_quantity()
        if existing_shipped + shipped_quantity > (order.quantity or 0):
            return Response.bad_request('发货数量超过订单总数量')

        shipped_time = None
        if data.get('shipped_time'):
            try:
                shipped_time = datetime.strptime(data['shipped_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    shipped_time = datetime.strptime(data['shipped_time'], '%Y-%m-%d')
                except ValueError:
                    return Response.bad_request('发货时间格式错误')

        delivery = Delivery(
            delivery_no=data['delivery_no'],
            order_id=data['order_id'],
            shipped_quantity=shipped_quantity,
            logistics_no=data.get('logistics_no', ''),
            shipped_time=shipped_time,
            sign_status=data.get('sign_status', 'shipped'),
            remark=data.get('remark', '')
        )

        try:
            delivery.save()

            total_shipped = existing_shipped + shipped_quantity
            if total_shipped >= (order.quantity or 0):
                if order.order_status in ('pending', 'approved', 'in_production', 'partial_shipped'):
                    order.update(order_status='completed')
            elif total_shipped > 0:
                if order.order_status in ('pending', 'approved', 'in_production'):
                    order.update(order_status='partial_shipped')

            Log.add_log(g.user_id, g.username, 'create', 'delivery',
                       f'创建发货单: {delivery.delivery_no} - 订单: {order.order_no}')
            return Response.created({'id': delivery.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_delivery(delivery_id, data):
        """更新发货单"""
        delivery = Delivery.get_by_id(delivery_id)
        if not delivery:
            return Response.not_found('发货单不存在')

        if 'delivery_no' in data:
            existing = Delivery.query.filter_by(delivery_no=data['delivery_no']).first()
            if existing and existing.id != delivery_id:
                return Response.error('发货单号已存在', 409)

        allowed = ['delivery_no', 'shipped_quantity', 'logistics_no', 'sign_status', 'remark']
        update_data = {k: v for k, v in data.items() if k in allowed}

        if 'shipped_time' in data:
            try:
                update_data['shipped_time'] = datetime.strptime(
                    data['shipped_time'], '%Y-%m-%d %H:%M:%S'
                )
            except ValueError:
                try:
                    update_data['shipped_time'] = datetime.strptime(
                        data['shipped_time'], '%Y-%m-%d'
                    )
                except ValueError:
                    return Response.bad_request('发货时间格式错误')

        try:
            delivery.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'delivery',
                       f'更新发货单: {delivery.delivery_no}')
            return Response.success(delivery.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_delivery(delivery_id):
        """删除发货单"""
        delivery = Delivery.get_by_id(delivery_id)
        if not delivery:
            return Response.not_found('发货单不存在')

        try:
            delivery.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'delivery',
                       f'删除发货单: {delivery.delivery_no}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class OrderDashboardService:
    """订单看板服务类"""

    @staticmethod
    def get_delay_risks(limit=10):
        """获取延期风险订单列表"""
        orders = CustomerOrder.query.filter(
            CustomerOrder.status == 1,
            CustomerOrder.order_status.in_(['pending', 'approved', 'in_production', 'partial_shipped'])
        ).order_by(CustomerOrder.create_time.desc()).all()

        risk_orders = []
        for o in orders:
            if o.has_delay_risk():
                risk_orders.append(o.to_dict())
                if len(risk_orders) >= limit:
                    break

        return Response.success(risk_orders)

    @staticmethod
    def get_stats():
        """获取订单统计数据"""
        today = datetime.now().date()
        first_day_of_month = today.replace(day=1)

        all_orders = CustomerOrder.query.filter(CustomerOrder.status == 1).all()

        status_counts = {
            'pending': 0,
            'approved': 0,
            'in_production': 0,
            'partial_shipped': 0,
            'completed': 0,
            'cancelled': 0
        }
        total_amount = 0
        delay_risk_count = 0

        for o in all_orders:
            if o.order_status in status_counts:
                status_counts[o.order_status] += 1
            total_amount += float(o.total_amount or 0)
            if o.has_delay_risk() and o.order_status in ('pending', 'approved', 'in_production', 'partial_shipped'):
                delay_risk_count += 1

        new_orders_this_month = CustomerOrder.query.filter(
            CustomerOrder.create_time >= first_day_of_month,
            CustomerOrder.status == 1
        ).count()

        completed_this_month = CustomerOrder.query.filter(
            CustomerOrder.create_time >= first_day_of_month,
            CustomerOrder.order_status == 'completed',
            CustomerOrder.status == 1
        ).count()

        return Response.success({
            'total_orders': len(all_orders),
            'status_counts': status_counts,
            'total_amount': round(total_amount, 2),
            'delay_risk_count': delay_risk_count,
            'new_orders_this_month': new_orders_this_month,
            'completed_this_month': completed_this_month
        })
