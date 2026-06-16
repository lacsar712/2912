"""
质检管理服务
"""
from flask import g
from datetime import datetime
from database.db import db
from models.quality import (
    InspectionTemplate, InspectionTemplateItem,
    InspectionOrder, InspectionResult, DefectRecord
)
from models.production import ProductionTask
from models.log import Log
from utils.response import Response
from utils.validator import Validator


class TemplateService:
    """质检模板服务类"""

    @staticmethod
    def get_templates(page=1, size=10, keyword=None, is_active=None):
        """获取模板列表"""
        query = InspectionTemplate.query

        if keyword:
            query = query.filter(
                db.or_(
                    InspectionTemplate.template_name.like(f'%{keyword}%'),
                    InspectionTemplate.template_code.like(f'%{keyword}%'),
                    InspectionTemplate.product_name.like(f'%{keyword}%')
                )
            )
        if is_active is not None:
            query = query.filter(InspectionTemplate.is_active == is_active)

        pagination = query.order_by(InspectionTemplate.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [t.to_dict() for t in pagination.items]
        return Response.paginate(items, pagination.total, page, size)

    @staticmethod
    def get_template_by_id(template_id):
        """获取模板详情"""
        template = InspectionTemplate.get_by_id(template_id)
        if not template:
            return Response.not_found('模板不存在')
        return Response.success(template.to_dict())

    @staticmethod
    def create_template(data):
        """创建模板"""
        validation = Validator.validate_form(data, {
            'template_code': ['required'],
            'template_name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if InspectionTemplate.query.filter_by(template_code=data['template_code']).first():
            return Response.error('模板编号已存在', 409)

        template = InspectionTemplate(
            template_code=data['template_code'],
            template_name=data['template_name'],
            product_name=data.get('product_name'),
            product_spec=data.get('product_spec'),
            version=data.get('version', '1.0'),
            is_active=data.get('is_active', 1),
            remark=data.get('remark')
        )

        items_data = data.get('items', [])
        for idx, item_data in enumerate(items_data):
            item = InspectionTemplateItem(
                item_name=item_data.get('item_name', ''),
                standard=item_data.get('standard'),
                lower_limit=item_data.get('lower_limit'),
                upper_limit=item_data.get('upper_limit'),
                unit=item_data.get('unit'),
                required=item_data.get('required', 1),
                sort_order=idx
            )
            template.items.append(item)

        try:
            template.save()
            Log.add_log(g.user_id, g.username, 'create', 'inspection_template',
                       f'创建质检模板: {template.template_name}')
            return Response.created({'id': template.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_template(template_id, data):
        """更新模板"""
        template = InspectionTemplate.get_by_id(template_id)
        if not template:
            return Response.not_found('模板不存在')

        allowed = ['template_name', 'product_name', 'product_spec',
                   'version', 'is_active', 'remark']
        update_data = {k: v for k, v in data.items() if k in allowed}
        template.update(**update_data)

        if 'items' in data:
            InspectionTemplateItem.query.filter_by(template_id=template_id).delete()
            items_data = data.get('items', [])
            for idx, item_data in enumerate(items_data):
                item = InspectionTemplateItem(
                    template_id=template_id,
                    item_name=item_data.get('item_name', ''),
                    standard=item_data.get('standard'),
                    lower_limit=item_data.get('lower_limit'),
                    upper_limit=item_data.get('upper_limit'),
                    unit=item_data.get('unit'),
                    required=item_data.get('required', 1),
                    sort_order=idx
                )
                item.save()

        Log.add_log(g.user_id, g.username, 'update', 'inspection_template',
                   f'更新质检模板: {template.template_name}')
        return Response.success(template.to_dict(), '更新成功')

    @staticmethod
    def delete_template(template_id):
        """删除模板"""
        template = InspectionTemplate.get_by_id(template_id)
        if not template:
            return Response.not_found('模板不存在')

        if template.orders.count() > 0:
            return Response.error('该模板已被使用，无法删除')

        template.delete()
        Log.add_log(g.user_id, g.username, 'delete', 'inspection_template',
                   f'删除质检模板: {template.template_name}')
        return Response.success(message='删除成功')

    @staticmethod
    def toggle_template_status(template_id):
        """切换模板启用/停用状态"""
        template = InspectionTemplate.get_by_id(template_id)
        if not template:
            return Response.not_found('模板不存在')

        template.is_active = 0 if template.is_active == 1 else 1
        db.session.commit()

        status_text = '启用' if template.is_active == 1 else '停用'
        Log.add_log(g.user_id, g.username, 'update', 'inspection_template',
                   f'{status_text}质检模板: {template.template_name}')
        return Response.success({'is_active': template.is_active}, f'{status_text}成功')


class InspectionOrderService:
    """质检单服务类"""

    @staticmethod
    def get_orders(page=1, size=10, task_id=None, product_name=None,
                   overall_result=None, keyword=None):
        """获取质检单列表"""
        query = InspectionOrder.query

        if task_id:
            query = query.filter(InspectionOrder.task_id == task_id)
        if product_name:
            query = query.filter(InspectionOrder.product_name.like(f'%{product_name}%'))
        if overall_result:
            query = query.filter(InspectionOrder.overall_result == overall_result)
        if keyword:
            query = query.filter(
                db.or_(
                    InspectionOrder.order_code.like(f'%{keyword}%'),
                    InspectionOrder.product_name.like(f'%{keyword}%')
                )
            )

        pagination = query.order_by(InspectionOrder.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [o.to_dict() for o in pagination.items]
        return Response.paginate(items, pagination.total, page, size)

    @staticmethod
    def get_order_by_id(order_id):
        """获取质检单详情"""
        order = InspectionOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('质检单不存在')
        return Response.success(order.to_dict_detail())

    @staticmethod
    def get_order_by_task(task_id):
        """根据任务ID获取质检单"""
        order = InspectionOrder.query.filter_by(
            task_id=task_id, status=1
        ).order_by(InspectionOrder.create_time.desc()).first()
        if not order:
            return Response.not_found('该任务暂无质检单')
        return Response.success(order.to_dict_detail())

    @staticmethod
    def create_order(data):
        """创建质检单"""
        validation = Validator.validate_form(data, {
            'order_code': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if InspectionOrder.query.filter_by(order_code=data['order_code']).first():
            return Response.error('质检单号已存在', 409)

        order = InspectionOrder(
            order_code=data['order_code'],
            task_id=data.get('task_id'),
            template_id=data.get('template_id'),
            product_name=data.get('product_name'),
            product_spec=data.get('product_spec'),
            sample_quantity=data.get('sample_quantity', 0),
            qualified_quantity=data.get('qualified_quantity', 0),
            unqualified_quantity=data.get('unqualified_quantity', 0),
            inspector=data.get('inspector'),
            inspection_time=data.get('inspection_time'),
            overall_result=data.get('overall_result', 'pending'),
            remark=data.get('remark')
        )

        results_data = data.get('results', [])
        for idx, res_data in enumerate(results_data):
            result = InspectionResult(
                item_id=res_data.get('item_id'),
                item_name=res_data.get('item_name', ''),
                standard=res_data.get('standard'),
                lower_limit=res_data.get('lower_limit'),
                upper_limit=res_data.get('upper_limit'),
                unit=res_data.get('unit'),
                actual_value=res_data.get('actual_value'),
                is_qualified=res_data.get('is_qualified', 1),
                sort_order=idx
            )
            order.results.append(result)

        defects_data = data.get('defects', [])
        for def_data in defects_data:
            defect = DefectRecord(
                defect_type=def_data.get('defect_type'),
                severity=def_data.get('severity', 'minor'),
                disposition=def_data.get('disposition'),
                quantity=def_data.get('quantity', 1),
                description=def_data.get('description'),
                remark=def_data.get('remark')
            )
            order.defects.append(defect)

        try:
            order.save()
            Log.add_log(g.user_id, g.username, 'create', 'inspection_order',
                       f'创建质检单: {order.order_code}')

            if order.task_id and order.overall_result != 'pending':
                TaskSyncService.sync_task_quality(order.task_id)

            return Response.created({'id': order.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_order(order_id, data):
        """更新质检单"""
        order = InspectionOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('质检单不存在')

        allowed = ['task_id', 'template_id', 'product_name', 'product_spec',
                   'sample_quantity', 'qualified_quantity', 'unqualified_quantity',
                   'inspector', 'inspection_time', 'overall_result', 'remark']
        update_data = {k: v for k, v in data.items() if k in allowed}
        order.update(**update_data)

        if 'results' in data:
            InspectionResult.query.filter_by(order_id=order_id).delete()
            results_data = data.get('results', [])
            for idx, res_data in enumerate(results_data):
                result = InspectionResult(
                    order_id=order_id,
                    item_id=res_data.get('item_id'),
                    item_name=res_data.get('item_name', ''),
                    standard=res_data.get('standard'),
                    lower_limit=res_data.get('lower_limit'),
                    upper_limit=res_data.get('upper_limit'),
                    unit=res_data.get('unit'),
                    actual_value=res_data.get('actual_value'),
                    is_qualified=res_data.get('is_qualified', 1),
                    sort_order=idx
                )
                result.save()

        if 'defects' in data:
            DefectRecord.query.filter_by(order_id=order_id).delete()
            defects_data = data.get('defects', [])
            for def_data in defects_data:
                defect = DefectRecord(
                    order_id=order_id,
                    defect_type=def_data.get('defect_type'),
                    severity=def_data.get('severity', 'minor'),
                    disposition=def_data.get('disposition'),
                    quantity=def_data.get('quantity', 1),
                    description=def_data.get('description'),
                    remark=def_data.get('remark')
                )
                defect.save()

        Log.add_log(g.user_id, g.username, 'update', 'inspection_order',
                   f'更新质检单: {order.order_code}')

        if order.task_id and order.overall_result != 'pending':
            TaskSyncService.sync_task_quality(order.task_id)

        return Response.success(order.to_dict_detail(), '更新成功')

    @staticmethod
    def delete_order(order_id):
        """删除质检单"""
        order = InspectionOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('质检单不存在')

        task_id = order.task_id
        order.delete()
        Log.add_log(g.user_id, g.username, 'delete', 'inspection_order',
                   f'删除质检单: {order.order_code}')

        if task_id:
            TaskSyncService.sync_task_quality(task_id)

        return Response.success(message='删除成功')


class DefectService:
    """不合格记录服务类"""

    @staticmethod
    def get_defects(page=1, size=10, order_id=None, defect_type=None, severity=None):
        """获取不合格记录列表"""
        query = DefectRecord.query

        if order_id:
            query = query.filter(DefectRecord.order_id == order_id)
        if defect_type:
            query = query.filter(DefectRecord.defect_type == defect_type)
        if severity:
            query = query.filter(DefectRecord.severity == severity)

        pagination = query.order_by(DefectRecord.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [d.to_dict() for d in pagination.items]
        return Response.paginate(items, pagination.total, page, size)

    @staticmethod
    def get_defect_by_id(defect_id):
        """获取不合格记录详情"""
        defect = DefectRecord.get_by_id(defect_id)
        if not defect:
            return Response.not_found('记录不存在')
        return Response.success(defect.to_dict())

    @staticmethod
    def create_defect(data):
        """创建不合格记录"""
        validation = Validator.validate_form(data, {
            'order_id': ['required'],
            'defect_type': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        defect = DefectRecord(
            order_id=data['order_id'],
            defect_type=data['defect_type'],
            severity=data.get('severity', 'minor'),
            disposition=data.get('disposition'),
            quantity=data.get('quantity', 1),
            description=data.get('description'),
            remark=data.get('remark')
        )

        try:
            defect.save()
            Log.add_log(g.user_id, g.username, 'create', 'defect_record',
                       f'创建不合格记录: {defect.defect_type}')
            return Response.created({'id': defect.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_defect(defect_id, data):
        """更新不合格记录"""
        defect = DefectRecord.get_by_id(defect_id)
        if not defect:
            return Response.not_found('记录不存在')

        allowed = ['defect_type', 'severity', 'disposition',
                   'quantity', 'description', 'remark']
        update_data = {k: v for k, v in data.items() if k in allowed}
        defect.update(**update_data)

        Log.add_log(g.user_id, g.username, 'update', 'defect_record',
                   f'更新不合格记录: {defect.defect_type}')
        return Response.success(defect.to_dict(), '更新成功')

    @staticmethod
    def delete_defect(defect_id):
        """删除不合格记录"""
        defect = DefectRecord.get_by_id(defect_id)
        if not defect:
            return Response.not_found('记录不存在')

        defect.delete()
        Log.add_log(g.user_id, g.username, 'delete', 'defect_record',
                   f'删除不合格记录: {defect.defect_type}')
        return Response.success(message='删除成功')


class QualityStatisticsService:
    """质检统计服务类"""

    @staticmethod
    def get_pareto_data(days=30):
        """获取帕累托图数据（按缺陷类型聚合）"""
        from datetime import timedelta
        start_date = datetime.now() - timedelta(days=days)

        defect_stats = db.session.query(
            DefectRecord.defect_type,
            db.func.sum(DefectRecord.quantity).label('total_quantity'),
            db.func.count(DefectRecord.id).label('defect_count')
        ).filter(
            DefectRecord.status == 1,
            DefectRecord.create_time >= start_date
        ).group_by(
            DefectRecord.defect_type
        ).order_by(
            db.desc('total_quantity')
        ).all()

        total_quantity = sum(q for _, q, _ in defect_stats) or 1

        labels = []
        values = []
        cumulative_percents = []
        cumulative = 0

        for defect_type, quantity, count in defect_stats:
            labels.append(defect_type or '其他')
            values.append(int(quantity))
            cumulative += int(quantity)
            cumulative_percents.append(round(cumulative / total_quantity * 100, 2))

        top5 = []
        for i in range(min(5, len(defect_stats))):
            defect_type, quantity, count = defect_stats[i]
            top5.append({
                'defect_type': defect_type or '其他',
                'quantity': int(quantity),
                'count': int(count),
                'percent': round(int(quantity) / total_quantity * 100, 2)
            })

        return Response.success({
            'labels': labels,
            'values': values,
            'cumulative_percents': cumulative_percents,
            'total_quantity': total_quantity,
            'top5': top5,
            'days': days
        })

    @staticmethod
    def get_overview():
        """获取质检概览数据"""
        total_orders = InspectionOrder.query.filter(InspectionOrder.status == 1).count()
        qualified_orders = InspectionOrder.query.filter_by(
            status=1, overall_result='qualified'
        ).count()
        unqualified_orders = InspectionOrder.query.filter_by(
            status=1, overall_result='unqualified'
        ).count()

        total_defects = DefectRecord.query.filter(DefectRecord.status == 1).count()
        total_defect_qty = db.session.query(
            db.func.sum(DefectRecord.quantity)
        ).filter(DefectRecord.status == 1).scalar() or 0

        pass_rate = round(qualified_orders / total_orders * 100, 2) if total_orders > 0 else 0

        return Response.success({
            'total_orders': total_orders,
            'qualified_orders': qualified_orders,
            'unqualified_orders': unqualified_orders,
            'pass_rate': pass_rate,
            'total_defects': total_defects,
            'total_defect_quantity': int(total_defect_qty)
        })


class TaskSyncService:
    """任务质检数据同步服务类"""

    @staticmethod
    def sync_task_quality(task_id):
        """
        同步任务的质检数据
        当任务完成时，若存在该任务的质检单，则把任务的合格数/缺陷数自动覆盖为质检单数据
        """
        task = ProductionTask.get_by_id(task_id)
        if not task:
            return False

        orders = InspectionOrder.query.filter_by(
            task_id=task_id, status=1
        ).all()

        if not orders:
            return False

        total_qualified = sum(o.qualified_quantity or 0 for o in orders)
        total_unqualified = sum(o.unqualified_quantity or 0 for o in orders)

        defect_qty = db.session.query(
            db.func.sum(DefectRecord.quantity)
        ).join(
            InspectionOrder, DefectRecord.order_id == InspectionOrder.id
        ).filter(
            InspectionOrder.task_id == task_id,
            InspectionOrder.status == 1,
            DefectRecord.status == 1
        ).scalar() or 0

        task.completed_quantity = total_qualified + total_unqualified
        db.session.commit()

        Log.add_log(g.user_id if hasattr(g, 'user_id') else 0,
                   g.username if hasattr(g, 'username') else 'system',
                   'sync', 'production_task',
                   f'同步任务质检数据: {task.task_code}')

        return True

    @staticmethod
    def on_task_complete(task_id):
        """任务完成时触发同步"""
        task = ProductionTask.get_by_id(task_id)
        if not task:
            return Response.not_found('任务不存在')

        has_orders = InspectionOrder.query.filter_by(
            task_id=task_id, status=1
        ).count() > 0

        if has_orders:
            TaskSyncService.sync_task_quality(task_id)
            return Response.success(message='质检数据已同步到任务')
        else:
            return Response.success(message='该任务暂无质检单，跳过同步')
