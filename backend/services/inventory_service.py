"""
库存管理服务
"""
from flask import g
from datetime import datetime, timedelta
from database.db import db
from models.inventory import Material, StockIn, StockOut, StockFlow
from models.production import AlertRecord
from models.log import Log
from utils.response import Response
from utils.validator import Validator


class MaterialService:
    """物料档案服务类"""

    @staticmethod
    def get_materials(page=1, size=10, category=None, keyword=None, status=None):
        """获取物料列表"""
        query = Material.query

        if category:
            query = query.filter(Material.category == category)
        if keyword:
            query = query.filter(
                (Material.material_code.like(f'%{keyword}%')) |
                (Material.material_name.like(f'%{keyword}%')) |
                (Material.specification.like(f'%{keyword}%'))
            )
        if status:
            query = query.filter(Material.status == status)

        pagination = query.order_by(Material.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [m.to_dict() for m in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_material_by_id(material_id):
        """获取物料详情"""
        material = Material.query.filter(Material.id == material_id).first()
        if not material:
            return Response.not_found('物料不存在')
        return Response.success(material.to_dict())

    @staticmethod
    def get_categories():
        """获取所有类目"""
        categories = db.session.query(Material.category).filter(
            Material.category.isnot(None),
            Material.category != ''
        ).distinct().all()
        return Response.success([c[0] for c in categories])

    @staticmethod
    def create_material(data):
        """创建物料"""
        validation = Validator.validate_form(data, {
            'material_code': ['required'],
            'material_name': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Material.query.filter_by(material_code=data['material_code']).first():
            return Response.error('物料编号已存在', 409)

        material = Material(
            material_code=data['material_code'],
            material_name=data['material_name'],
            specification=data.get('specification', ''),
            unit=data.get('unit', ''),
            category=data.get('category', ''),
            safety_stock=data.get('safety_stock', 0),
            current_stock=data.get('current_stock', 0),
            status=data.get('status', 'active')
        )

        try:
            material.save()
            Log.add_log(g.user_id, g.username, 'create', 'material',
                       f'创建物料: {material.material_name}')
            
            MaterialService._check_safety_stock(material)
            
            return Response.created({'id': material.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_material(material_id, data):
        """更新物料"""
        material = Material.query.filter(Material.id == material_id).first()
        if not material:
            return Response.not_found('物料不存在')

        if 'material_code' in data:
            existing = Material.query.filter_by(material_code=data['material_code']).first()
            if existing and existing.id != material_id:
                return Response.error('物料编号已存在', 409)

        allowed = ['material_code', 'material_name', 'specification', 'unit',
                  'category', 'safety_stock', 'current_stock', 'status']
        update_data = {k: v for k, v in data.items() if k in allowed}

        try:
            material.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'material',
                       f'更新物料: {material.material_name}')
            
            MaterialService._check_safety_stock(material)
            
            return Response.success(material.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def toggle_material_status(material_id):
        """切换物料状态"""
        material = Material.query.filter(Material.id == material_id).first()
        if not material:
            return Response.not_found('物料不存在')

        new_status = 'inactive' if material.status == 'active' else 'active'
        material.update(status=new_status)
        Log.add_log(g.user_id, g.username, 'update', 'material',
                   f'物料状态切换: {material.material_name} -> {new_status}')
        return Response.success({'status': new_status}, '状态更新成功')

    @staticmethod
    def delete_material(material_id):
        """删除物料"""
        material = Material.query.filter(Material.id == material_id).first()
        if not material:
            return Response.not_found('物料不存在')

        try:
            material.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'material',
                       f'删除物料: {material.material_name}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')

    @staticmethod
    def _check_safety_stock(material):
        """检查安全库存并生成告警"""
        if float(material.current_stock) < float(material.safety_stock):
            existing_alert = AlertRecord.query.filter(
                AlertRecord.alert_type == 'material_low_stock',
                AlertRecord.status == 'active',
                AlertRecord.message.like(f'%{material.material_code}%')
            ).first()

            if not existing_alert:
                now = datetime.now()
                alert_code = f"ALERT-{now.strftime('%Y%m%d%H%M%S')}-{AlertRecord.query.count() + 1}"
                alert = AlertRecord(
                    alert_code=alert_code,
                    alert_type='material_low_stock',
                    severity='warning',
                    message=f'物料库存不足：{material.material_name}({material.material_code})，当前库存{material.current_stock}，安全库存{material.safety_stock}',
                    value=float(material.current_stock),
                    threshold=float(material.safety_stock),
                    status='active'
                )
                db.session.add(alert)
                db.session.commit()
                return True
        return False

    @staticmethod
    def get_low_stock_materials(limit=10):
        """获取低库存物料列表"""
        materials = Material.query.filter(
            Material.current_stock < Material.safety_stock,
            Material.status == 'active'
        ).order_by(Material.current_stock.asc()).limit(limit).all()
        return Response.success([m.to_dict() for m in materials])

    @staticmethod
    def get_inventory_view(page=1, size=10, category=None, keyword=None):
        """按物料聚合的库存视图"""
        query = Material.query

        if category:
            query = query.filter(Material.category == category)
        if keyword:
            query = query.filter(
                (Material.material_code.like(f'%{keyword}%')) |
                (Material.material_name.like(f'%{keyword}%'))
            )

        pagination = query.order_by(Material.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = []
        for m in pagination.items:
            m_dict = m.to_dict()
            m_dict['stock_value'] = float(m.current_stock)
            m_dict['safety_value'] = float(m.safety_stock)
            m_dict['is_low_stock'] = float(m.current_stock) < float(m.safety_stock)
            items.append(m_dict)

        return Response.paginate(items, pagination.total, page, size)


class StockInService:
    """入库单服务类"""

    @staticmethod
    def get_stock_ins(page=1, size=10, material_id=None, start_date=None, end_date=None):
        """获取入库单列表"""
        query = StockIn.query

        if material_id:
            query = query.filter(StockIn.material_id == material_id)
        if start_date:
            query = query.filter(StockIn.in_time >= start_date)
        if end_date:
            query = query.filter(StockIn.in_time <= end_date)

        pagination = query.order_by(StockIn.in_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [s.to_dict() for s in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def create_stock_in(data):
        """创建入库单"""
        validation = Validator.validate_form(data, {
            'material_id': ['required'],
            'quantity': ['required', 'positive']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        material = Material.query.filter(Material.id == data['material_id']).first()
        if not material:
            return Response.not_found('物料不存在')

        now = datetime.now()
        order_code = f"IN-{now.strftime('%Y%m%d%H%M%S')}-{StockIn.query.count() + 1}"

        stock_before = float(material.current_stock)
        stock_after = stock_before + float(data['quantity'])

        try:
            stock_in = StockIn(
                order_code=order_code,
                source=data.get('source', ''),
                material_id=data['material_id'],
                batch_no=data.get('batch_no', ''),
                quantity=data['quantity'],
                operator=g.username,
                in_time=now,
                remark=data.get('remark', '')
            )
            db.session.add(stock_in)

            material.current_stock = stock_after
            db.session.flush()

            flow_code = f"FLOW-{now.strftime('%Y%m%d%H%M%S')}-{StockFlow.query.count() + 1}"
            stock_flow = StockFlow(
                flow_code=flow_code,
                flow_type='in',
                material_id=data['material_id'],
                batch_no=data.get('batch_no', ''),
                quantity=data['quantity'],
                stock_before=stock_before,
                stock_after=stock_after,
                operator=g.username,
                operate_time=now,
                related_order=order_code,
                remark=data.get('remark', '')
            )
            db.session.add(stock_flow)

            db.session.commit()

            Log.add_log(g.user_id, g.username, 'create', 'stock_in',
                       f'物料入库: {material.material_name}, 数量: {data["quantity"]}')

            MaterialService._check_safety_stock(material)

            return Response.created(stock_in.to_dict(), '入库成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'入库失败: {str(e)}')

    @staticmethod
    def delete_stock_in(stock_in_id):
        """删除入库单"""
        stock_in = StockIn.get_by_id(stock_in_id)
        if not stock_in:
            return Response.not_found('入库单不存在')
        return Response.error('入库单不支持删除', 400)


class StockOutService:
    """出库单服务类"""

    @staticmethod
    def get_stock_outs(page=1, size=10, material_id=None, start_date=None, end_date=None):
        """获取出库单列表"""
        query = StockOut.query

        if material_id:
            query = query.filter(StockOut.material_id == material_id)
        if start_date:
            query = query.filter(StockOut.out_time >= start_date)
        if end_date:
            query = query.filter(StockOut.out_time <= end_date)

        pagination = query.order_by(StockOut.out_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [s.to_dict() for s in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def create_stock_out(data):
        """创建出库单"""
        validation = Validator.validate_form(data, {
            'material_id': ['required'],
            'quantity': ['required', 'positive']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        material = Material.query.filter(Material.id == data['material_id']).first()
        if not material:
            return Response.not_found('物料不存在')

        if float(material.current_stock) < float(data['quantity']):
            return Response.error(f'库存不足，当前库存: {material.current_stock}', 400)

        now = datetime.now()
        order_code = f"OUT-{now.strftime('%Y%m%d%H%M%S')}-{StockOut.query.count() + 1}"

        stock_before = float(material.current_stock)
        stock_after = stock_before - float(data['quantity'])

        try:
            stock_out = StockOut(
                order_code=order_code,
                department=data.get('department', ''),
                material_id=data['material_id'],
                batch_no=data.get('batch_no', ''),
                quantity=data['quantity'],
                operator=g.username,
                out_time=now,
                purpose=data.get('purpose', '')
            )
            db.session.add(stock_out)

            material.current_stock = stock_after
            db.session.flush()

            flow_code = f"FLOW-{now.strftime('%Y%m%d%H%M%S')}-{StockFlow.query.count() + 1}"
            stock_flow = StockFlow(
                flow_code=flow_code,
                flow_type='out',
                material_id=data['material_id'],
                batch_no=data.get('batch_no', ''),
                quantity=data['quantity'],
                stock_before=stock_before,
                stock_after=stock_after,
                operator=g.username,
                operate_time=now,
                related_order=order_code,
                remark=data.get('purpose', '')
            )
            db.session.add(stock_flow)

            db.session.commit()

            Log.add_log(g.user_id, g.username, 'create', 'stock_out',
                       f'物料出库: {material.material_name}, 数量: {data["quantity"]}')

            MaterialService._check_safety_stock(material)

            return Response.created(stock_out.to_dict(), '出库成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'出库失败: {str(e)}')

    @staticmethod
    def delete_stock_out(stock_out_id):
        """删除出库单"""
        stock_out = StockOut.get_by_id(stock_out_id)
        if not stock_out:
            return Response.not_found('出库单不存在')
        return Response.error('出库单不支持删除', 400)


class StockFlowService:
    """库存流水服务类"""

    @staticmethod
    def get_stock_flows(page=1, size=10, material_id=None, flow_type=None,
                       start_date=None, end_date=None):
        """获取库存流水列表"""
        query = StockFlow.query

        if material_id:
            query = query.filter(StockFlow.material_id == material_id)
        if flow_type:
            query = query.filter(StockFlow.flow_type == flow_type)
        if start_date:
            query = query.filter(StockFlow.operate_time >= start_date)
        if end_date:
            query = query.filter(StockFlow.operate_time <= end_date)

        pagination = query.order_by(StockFlow.operate_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [f.to_dict() for f in pagination.items],
            pagination.total, page, size
        )


class InventoryStatsService:
    """库存统计服务类"""

    @staticmethod
    def get_inventory_stats():
        """获取库存统计数据"""
        total_materials = Material.query.filter(Material.status == 'active').count()
        low_stock_count = Material.query.filter(
            Material.current_stock < Material.safety_stock,
            Material.status == 'active'
        ).count()
        total_stock_value = db.session.query(
            db.func.sum(Material.current_stock)
        ).filter(Material.status == 'active').scalar() or 0

        return Response.success({
            'total_materials': total_materials,
            'low_stock_count': low_stock_count,
            'total_stock': float(total_stock_value)
        })

    @staticmethod
    def get_stock_trend(days=7):
        """获取近N天出入库趋势"""
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days - 1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        date_list = []
        for i in range(days):
            d = start_date + timedelta(days=i)
            date_list.append(d.strftime('%Y-%m-%d'))

        in_totals = {}
        out_totals = {}

        stock_ins = StockIn.query.filter(
            StockIn.in_time >= start_date,
            StockIn.in_time <= end_date
        ).all()

        for si in stock_ins:
            date_key = si.in_time.strftime('%Y-%m-%d')
            in_totals[date_key] = in_totals.get(date_key, 0) + float(si.quantity)

        stock_outs = StockOut.query.filter(
            StockOut.out_time >= start_date,
            StockOut.out_time <= end_date
        ).all()

        for so in stock_outs:
            date_key = so.out_time.strftime('%Y-%m-%d')
            out_totals[date_key] = out_totals.get(date_key, 0) + float(so.quantity)

        result = []
        for date in date_list:
            result.append({
                'date': date,
                'stock_in': in_totals.get(date, 0),
                'stock_out': out_totals.get(date, 0)
            })

        return Response.success(result)

    @staticmethod
    def get_dashboard_data():
        """获取库存看板数据"""
        total_materials = Material.query.filter(Material.status == 'active').count()
        low_stock_count = Material.query.filter(
            Material.current_stock < Material.safety_stock,
            Material.status == 'active'
        ).count()
        total_stock_value = db.session.query(
            db.func.sum(Material.current_stock)
        ).filter(Material.status == 'active').scalar() or 0

        stats = {
            'total_materials': total_materials,
            'low_stock_count': low_stock_count,
            'total_stock': float(total_stock_value)
        }

        low_stock_materials = Material.query.filter(
            Material.current_stock < Material.safety_stock,
            Material.status == 'active'
        ).order_by(Material.current_stock.asc()).limit(10).all()
        low_stock_list = [m.to_dict() for m in low_stock_materials]

        end_date = datetime.now()
        start_date = end_date - timedelta(days=6)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        date_list = []
        for i in range(7):
            d = start_date + timedelta(days=i)
            date_list.append(d.strftime('%Y-%m-%d'))

        in_totals = {}
        out_totals = {}

        stock_ins = StockIn.query.filter(
            StockIn.in_time >= start_date,
            StockIn.in_time <= end_date
        ).all()
        for si in stock_ins:
            date_key = si.in_time.strftime('%Y-%m-%d')
            in_totals[date_key] = in_totals.get(date_key, 0) + float(si.quantity)

        stock_outs = StockOut.query.filter(
            StockOut.out_time >= start_date,
            StockOut.out_time <= end_date
        ).all()
        for so in stock_outs:
            date_key = so.out_time.strftime('%Y-%m-%d')
            out_totals[date_key] = out_totals.get(date_key, 0) + float(so.quantity)

        stock_trend = []
        for date in date_list:
            stock_trend.append({
                'date': date,
                'stock_in': in_totals.get(date, 0),
                'stock_out': out_totals.get(date, 0)
            })

        return Response.success({
            'stats': stats,
            'low_stock_materials': low_stock_list,
            'stock_trend': stock_trend
        })
