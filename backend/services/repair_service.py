"""
维修工单服务模块
"""
import json
from datetime import datetime
from database.db import db
from models.repair import RepairOrder, RepairDispatch, RepairProcess, RepairAcceptance
from models.production import Equipment, AlertRecord
from utils.response import Response


class RepairService:
    """维修工单服务类"""

    STATUS_TRANSITIONS = {
        'pending': ['dispatched', 'closed'],
        'dispatched': ['repairing', 'closed'],
        'repairing': ['repaired', 'closed'],
        'repaired': ['accepted', 'repairing', 'closed'],
        'accepted': ['closed'],
        'closed': []
    }

    STATUS_LABELS = {
        'pending': '待派工',
        'dispatched': '已派工',
        'repairing': '维修中',
        'repaired': '已修复',
        'accepted': '已验收',
        'closed': '已关闭'
    }

    @staticmethod
    def _generate_order_code():
        now = datetime.now()
        count = RepairOrder.query.count() + 1
        return f"WO-{now.strftime('%Y%m%d%H%M%S')}-{count}"

    @staticmethod
    def _can_transition(current_status, target_status):
        allowed = RepairService.STATUS_TRANSITIONS.get(current_status, [])
        return target_status in allowed

    @staticmethod
    def get_orders(page=1, size=20, status=None, equipment_id=None, severity=None, keyword=None):
        """获取工单列表"""
        query = RepairOrder.query

        if status:
            query = query.filter(RepairOrder.status == status)
        if equipment_id:
            query = query.filter(RepairOrder.equipment_id == equipment_id)
        if severity:
            query = query.filter(RepairOrder.severity == severity)
        if keyword:
            like_pattern = f'%{keyword}%'
            query = query.filter(
                db.or_(
                    RepairOrder.order_code.like(like_pattern),
                    RepairOrder.fault_description.like(like_pattern),
                    RepairOrder.reporter.like(like_pattern)
                )
            )

        pagination = query.order_by(RepairOrder.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [item.to_dict() for item in pagination.items]
        return Response.paginate(items, pagination.total, page, size)

    @staticmethod
    def get_order_by_id(order_id):
        """获取工单详情"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        data = order.to_dict()
        try:
            data['dispatches'] = [d.to_dict() for d in order.dispatches.all()]
        except Exception:
            data['dispatches'] = []
        try:
            data['processes'] = [p.to_dict() for p in order.processes.order_by(RepairProcess.create_time.asc()).all()]
        except Exception:
            data['processes'] = []
        try:
            data['acceptances'] = [a.to_dict() for a in order.acceptances.all()]
        except Exception:
            data['acceptances'] = []

        try:
            if order.alert_id:
                alert = AlertRecord.get_by_id(order.alert_id)
                if alert:
                    data['alert'] = alert.to_dict()
        except Exception:
            pass

        return Response.success(data)

    @staticmethod
    def create_order(data, current_user=None):
        """创建报修单"""
        from utils.validator import Validator

        validation = Validator.validate_form(data, {
            'equipment_id': ['required'],
            'fault_description': ['required'],
            'reporter': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        equipment = Equipment.get_by_id(data.get('equipment_id'))
        if not equipment:
            return Response.not_found('设备不存在')

        order_code = RepairService._generate_order_code()
        attachment_images = data.get('attachment_images', [])
        if isinstance(attachment_images, list):
            attachment_images_json = json.dumps(attachment_images, ensure_ascii=False)
        else:
            attachment_images_json = None

        order = RepairOrder(
            order_code=order_code,
            equipment_id=data.get('equipment_id'),
            reporter=data.get('reporter'),
            fault_description=data.get('fault_description'),
            severity=data.get('severity', 'medium'),
            attachment_images=attachment_images_json,
            status='pending',
            alert_id=data.get('alert_id'),
            remark=data.get('remark')
        )
        db.session.add(order)

        if data.get('alert_id'):
            try:
                alert = AlertRecord.get_by_id(data['alert_id'])
                if alert and alert.alert_type == 'equipment_error':
                    if alert.status == 'active':
                        alert.status = 'acknowledged'
                        alert.update_time = datetime.now()
            except Exception:
                pass

        db.session.commit()
        return Response.created(order.to_dict(), '报修单创建成功')

    @staticmethod
    def dispatch_order(order_id, data, current_user=None):
        """派工"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if not RepairService._can_transition(order.status, 'dispatched'):
            return Response.error(f'当前状态「{RepairService.STATUS_LABELS.get(order.status)}」不允许派工')

        from utils.validator import Validator
        validation = Validator.validate_form(data, {
            'repairer': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        planned_start = data.get('planned_start_time')
        planned_end = data.get('planned_end_time')
        if planned_start:
            try:
                planned_start = datetime.strptime(planned_start, '%Y-%m-%d %H:%M:%S')
            except Exception:
                try:
                    planned_start = datetime.fromisoformat(planned_start.replace('Z', '+00:00'))
                except Exception:
                    planned_start = None
        if planned_end:
            try:
                planned_end = datetime.strptime(planned_end, '%Y-%m-%d %H:%M:%S')
            except Exception:
                try:
                    planned_end = datetime.fromisoformat(planned_end.replace('Z', '+00:00'))
                except Exception:
                    planned_end = None

        dispatch = RepairDispatch(
            order_id=order_id,
            repairer=data.get('repairer'),
            planned_start_time=planned_start,
            planned_end_time=planned_end,
            dispatcher=current_user or data.get('dispatcher'),
            remark=data.get('remark')
        )
        db.session.add(dispatch)

        order.status = 'dispatched'
        order.update_time = datetime.now()
        db.session.commit()

        return Response.success(order.to_dict(), '派工成功')

    @staticmethod
    def start_repair(order_id, data=None, current_user=None):
        """开始维修"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if not RepairService._can_transition(order.status, 'repairing'):
            return Response.error(f'当前状态「{RepairService.STATUS_LABELS.get(order.status)}」不允许开始维修')

        order.status = 'repairing'
        order.update_time = datetime.now()
        db.session.commit()

        return Response.success(order.to_dict(), '已开始维修')

    @staticmethod
    def add_process(order_id, data, current_user=None):
        """添加维修过程记录"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if order.status == 'closed':
            return Response.error('工单已关闭，无法添加维修记录')

        from utils.validator import Validator
        validation = Validator.validate_form(data, {
            'step_description': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        materials = data.get('materials_used', [])
        if isinstance(materials, list):
            materials_json = json.dumps(materials, ensure_ascii=False)
        else:
            materials_json = None

        process = RepairProcess(
            order_id=order_id,
            step_description=data.get('step_description'),
            materials_used=materials_json,
            minutes_spent=int(data.get('minutes_spent', 0) or 0),
            recorder=current_user or data.get('recorder'),
            remark=data.get('remark')
        )
        db.session.add(process)
        db.session.commit()

        return Response.success(process.to_dict(), '维修记录添加成功')

    @staticmethod
    def delete_process(process_id, current_user=None):
        """删除维修过程记录"""
        process = RepairProcess.get_by_id(process_id)
        if not process:
            return Response.not_found('维修记录不存在')

        order = RepairOrder.get_by_id(process.order_id)
        if order and order.status == 'closed':
            return Response.error('工单已关闭，无法删除维修记录')

        process.delete()
        return Response.success(None, '删除成功')

    @staticmethod
    def complete_repair(order_id, data=None, current_user=None):
        """完成维修（标记为已修复）"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if not RepairService._can_transition(order.status, 'repaired'):
            return Response.error(f'当前状态「{RepairService.STATUS_LABELS.get(order.status)}」不允许标记为已修复')

        order.status = 'repaired'
        order.update_time = datetime.now()
        db.session.commit()

        return Response.success(order.to_dict(), '维修完成，等待验收')

    @staticmethod
    def accept_order(order_id, data, current_user=None):
        """验收"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if order.status not in ['repaired', 'accepted']:
            return Response.error(f'当前状态「{RepairService.STATUS_LABELS.get(order.status)}」不允许验收')

        from utils.validator import Validator
        validation = Validator.validate_form(data, {
            'acceptor': ['required'],
            'is_passed': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        is_passed = data.get('is_passed')
        if isinstance(is_passed, str):
            is_passed = is_passed.lower() in ['true', '1', 'yes']

        acceptance = RepairAcceptance(
            order_id=order_id,
            acceptor=data.get('acceptor'),
            is_passed=bool(is_passed),
            remark=data.get('remark')
        )
        db.session.add(acceptance)

        if is_passed:
            if RepairService._can_transition(order.status, 'accepted'):
                order.status = 'accepted'
            message = '验收通过'
        else:
            if RepairService._can_transition(order.status, 'repairing'):
                order.status = 'repairing'
            message = '验收未通过，需重新维修'

        order.update_time = datetime.now()
        db.session.commit()

        return Response.success(order.to_dict(), message)

    @staticmethod
    def close_order(order_id, data=None, current_user=None):
        """关闭工单"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if not RepairService._can_transition(order.status, 'closed'):
            return Response.error(f'当前状态「{RepairService.STATUS_LABELS.get(order.status)}」不允许关闭')

        order.status = 'closed'
        order.update_time = datetime.now()

        try:
            equipment = Equipment.get_by_id(order.equipment_id)
            if equipment and equipment.status == 'error':
                equipment.status = 'idle'
                equipment.update_time = datetime.now()
        except Exception:
            pass

        try:
            if order.alert_id:
                alert = AlertRecord.get_by_id(order.alert_id)
                if alert and alert.status != 'resolved':
                    alert.status = 'resolved'
                    alert.resolved_time = datetime.now()
                    alert.update_time = datetime.now()
        except Exception:
            pass

        db.session.commit()

        return Response.success(order.to_dict(), '工单已关闭')

    @staticmethod
    def change_status(order_id, target_status, data=None, current_user=None):
        """通用状态流转接口"""
        order = RepairOrder.get_by_id(order_id)
        if not order:
            return Response.not_found('工单不存在')

        if not RepairService._can_transition(order.status, target_status):
            return Response.error(
                f'不允许从「{RepairService.STATUS_LABELS.get(order.status)}」流转到「{RepairService.STATUS_LABELS.get(target_status)}」'
            )

        if target_status == 'dispatched':
            return RepairService.dispatch_order(order_id, data or {}, current_user)
        elif target_status == 'repairing':
            return RepairService.start_repair(order_id, data, current_user)
        elif target_status == 'repaired':
            return RepairService.complete_repair(order_id, data, current_user)
        elif target_status == 'accepted':
            return RepairService.accept_order(order_id, data or {}, current_user)
        elif target_status == 'closed':
            return RepairService.close_order(order_id, data, current_user)
        else:
            return Response.error('未知状态')

    @staticmethod
    def get_statistics():
        """获取统计数据"""
        total = RepairOrder.query.count()
        by_status = {}
        for status in RepairService.STATUS_TRANSITIONS.keys():
            by_status[status] = RepairOrder.query.filter(RepairOrder.status == status).count()

        by_severity = {
            'low': RepairOrder.query.filter(RepairOrder.severity == 'low').count(),
            'medium': RepairOrder.query.filter(RepairOrder.severity == 'medium').count(),
            'high': RepairOrder.query.filter(RepairOrder.severity == 'high').count(),
            'critical': RepairOrder.query.filter(RepairOrder.severity == 'critical').count()
        }

        return Response.success({
            'total': total,
            'by_status': by_status,
            'by_severity': by_severity,
            'status_labels': RepairService.STATUS_LABELS
        })

    @staticmethod
    def get_equipment_history(equipment_id, page=1, size=20):
        """获取设备维修历史"""
        equipment = Equipment.get_by_id(equipment_id)
        if not equipment:
            return Response.not_found('设备不存在')

        return RepairService.get_orders(page=page, size=size, equipment_id=equipment_id)
