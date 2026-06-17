"""
巡检管理服务
"""
import json
from datetime import datetime, date, timedelta
from database.db import db
from models.patrol import (
    PatrolRoute, PatrolCheckpoint, PatrolItem,
    PatrolPlan, PatrolTask, PatrolResult
)
from models.production import AlertRecord, Equipment
from utils.response import Response
from utils.validator import Validator
from utils.logger import logger


class PatrolRouteService:
    """巡检路线服务"""

    @staticmethod
    def get_routes(page=1, size=10, keyword=None, status=None):
        """获取巡检路线列表"""
        query = PatrolRoute.query

        if keyword:
            query = query.filter(
                (PatrolRoute.route_code.like(f'%{keyword}%')) |
                (PatrolRoute.route_name.like(f'%{keyword}%'))
            )
        if status:
            query = query.filter(PatrolRoute.status == status)

        pagination = query.order_by(PatrolRoute.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [r.to_dict() for r in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_route_by_id(route_id):
        """获取路线详情"""
        route = PatrolRoute.get_by_id(route_id)
        if not route:
            return Response.not_found('巡检路线不存在')
        return Response.success(route.to_dict())

    @staticmethod
    def get_all_routes():
        """获取所有启用的路线（用于下拉选择）"""
        routes = PatrolRoute.query.filter_by(status='active').all()
        return Response.success([{'id': r.id, 'route_code': r.route_code, 'route_name': r.route_name} for r in routes])

    @staticmethod
    def create_route(data):
        """创建巡检路线"""
        validation = Validator.validate_form(data, {
            'route_code': ['required'],
            'route_name': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if PatrolRoute.query.filter_by(route_code=data['route_code']).first():
            return Response.error('路线编号已存在', 409)

        route = PatrolRoute(
            route_code=data['route_code'],
            route_name=data['route_name'],
            description=data.get('description', ''),
            estimated_duration=data.get('estimated_duration', 0),
            status=data.get('status', 'active')
        )
        db.session.add(route)
        db.session.flush()

        checkpoints = data.get('checkpoints', [])
        for idx, cp_data in enumerate(checkpoints):
            checkpoint = PatrolCheckpoint(
                route_id=route.id,
                checkpoint_name=cp_data['checkpoint_name'],
                equipment_id=cp_data.get('equipment_id'),
                location=cp_data.get('location', ''),
                sort_order=idx,
                remark=cp_data.get('remark', '')
            )
            db.session.add(checkpoint)
            db.session.flush()

            items = cp_data.get('items', [])
            for item_idx, item_data in enumerate(items):
                item = PatrolItem(
                    checkpoint_id=checkpoint.id,
                    item_name=item_data['item_name'],
                    expected_value=item_data.get('expected_value', ''),
                    unit=item_data.get('unit', ''),
                    is_required=item_data.get('is_required', 1),
                    item_type=item_data.get('item_type', 'input'),
                    options=json.dumps(item_data.get('options', []), ensure_ascii=False) if item_data.get('options') else None,
                    sort_order=item_idx
                )
                db.session.add(item)

        db.session.commit()
        return Response.success(route.to_dict(), '创建成功')

    @staticmethod
    def update_route(route_id, data):
        """更新巡检路线"""
        route = PatrolRoute.get_by_id(route_id)
        if not route:
            return Response.not_found('巡检路线不存在')

        if 'route_code' in data and data['route_code'] != route.route_code:
            if PatrolRoute.query.filter_by(route_code=data['route_code']).first():
                return Response.error('路线编号已存在', 409)

        route.update(
            route_code=data.get('route_code', route.route_code),
            route_name=data.get('route_name', route.route_name),
            description=data.get('description', route.description),
            estimated_duration=data.get('estimated_duration', route.estimated_duration),
            status=data.get('status', route.status)
        )

        if 'checkpoints' in data:
            PatrolCheckpoint.query.filter_by(route_id=route.id).delete()

            checkpoints = data['checkpoints']
            for idx, cp_data in enumerate(checkpoints):
                checkpoint = PatrolCheckpoint(
                    route_id=route.id,
                    checkpoint_name=cp_data['checkpoint_name'],
                    equipment_id=cp_data.get('equipment_id'),
                    location=cp_data.get('location', ''),
                    sort_order=idx,
                    remark=cp_data.get('remark', '')
                )
                db.session.add(checkpoint)
                db.session.flush()

                items = cp_data.get('items', [])
                for item_idx, item_data in enumerate(items):
                    item = PatrolItem(
                        checkpoint_id=checkpoint.id,
                        item_name=item_data['item_name'],
                        expected_value=item_data.get('expected_value', ''),
                        unit=item_data.get('unit', ''),
                        is_required=item_data.get('is_required', 1),
                        item_type=item_data.get('item_type', 'input'),
                        options=json.dumps(item_data.get('options', []), ensure_ascii=False) if item_data.get('options') else None,
                        sort_order=item_idx
                    )
                    db.session.add(item)

            db.session.commit()

        return Response.success(route.to_dict(), '更新成功')

    @staticmethod
    def delete_route(route_id):
        """删除巡检路线"""
        route = PatrolRoute.get_by_id(route_id)
        if not route:
            return Response.not_found('巡检路线不存在')

        plan_count = PatrolPlan.query.filter_by(route_id=route_id).count()
        if plan_count > 0:
            return Response.error('该路线已关联巡检计划，无法删除', 400)

        route.delete()
        return Response.success(None, '删除成功')

    @staticmethod
    def toggle_route_status(route_id):
        """切换路线状态"""
        route = PatrolRoute.get_by_id(route_id)
        if not route:
            return Response.not_found('巡检路线不存在')

        new_status = 'inactive' if route.status == 'active' else 'active'
        route.update(status=new_status)
        return Response.success(route.to_dict(), f'已{"停用" if new_status == "inactive" else "启用"}')


class PatrolPlanService:
    """巡检计划服务"""

    @staticmethod
    def get_plans(page=1, size=10, keyword=None, status=None, frequency=None):
        """获取巡检计划列表"""
        query = PatrolPlan.query

        if keyword:
            query = query.filter(
                (PatrolPlan.plan_code.like(f'%{keyword}%')) |
                (PatrolPlan.plan_name.like(f'%{keyword}%'))
            )
        if status:
            query = query.filter(PatrolPlan.status == status)
        if frequency:
            query = query.filter(PatrolPlan.frequency == frequency)

        pagination = query.order_by(PatrolPlan.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [p.to_dict() for p in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_plan_by_id(plan_id):
        """获取计划详情"""
        plan = PatrolPlan.get_by_id(plan_id)
        if not plan:
            return Response.not_found('巡检计划不存在')
        return Response.success(plan.to_dict())

    @staticmethod
    def create_plan(data):
        """创建巡检计划"""
        validation = Validator.validate_form(data, {
            'plan_code': ['required'],
            'plan_name': ['required'],
            'route_id': ['required'],
            'frequency': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if PatrolPlan.query.filter_by(plan_code=data['plan_code']).first():
            return Response.error('计划编号已存在', 409)

        route = PatrolRoute.get_by_id(data['route_id'])
        if not route:
            return Response.not_found('巡检路线不存在')

        start_date = data.get('start_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        end_date = data.get('end_date')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        plan = PatrolPlan(
            plan_code=data['plan_code'],
            plan_name=data['plan_name'],
            route_id=data['route_id'],
            person_in_charge=data.get('person_in_charge', ''),
            team=data.get('team', ''),
            frequency=data['frequency'],
            week_days=data.get('week_days', ''),
            month_days=data.get('month_days', ''),
            execute_time=data.get('execute_time', '08:00'),
            start_date=start_date,
            end_date=end_date,
            status=data.get('status', 'active'),
            remark=data.get('remark', '')
        )
        db.session.add(plan)
        db.session.commit()
        return Response.success(plan.to_dict(), '创建成功')

    @staticmethod
    def update_plan(plan_id, data):
        """更新巡检计划"""
        plan = PatrolPlan.get_by_id(plan_id)
        if not plan:
            return Response.not_found('巡检计划不存在')

        if 'plan_code' in data and data['plan_code'] != plan.plan_code:
            if PatrolPlan.query.filter_by(plan_code=data['plan_code']).first():
                return Response.error('计划编号已存在', 409)

        if 'route_id' in data:
            route = PatrolRoute.get_by_id(data['route_id'])
            if not route:
                return Response.not_found('巡检路线不存在')

        start_date = data.get('start_date')
        if start_date:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()

        end_date = data.get('end_date')
        if end_date:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()

        plan.update(
            plan_code=data.get('plan_code', plan.plan_code),
            plan_name=data.get('plan_name', plan.plan_name),
            route_id=data.get('route_id', plan.route_id),
            person_in_charge=data.get('person_in_charge', plan.person_in_charge),
            team=data.get('team', plan.team),
            frequency=data.get('frequency', plan.frequency),
            week_days=data.get('week_days', plan.week_days),
            month_days=data.get('month_days', plan.month_days),
            execute_time=data.get('execute_time', plan.execute_time),
            start_date=start_date if start_date else plan.start_date,
            end_date=end_date if end_date else plan.end_date,
            status=data.get('status', plan.status),
            remark=data.get('remark', plan.remark)
        )
        return Response.success(plan.to_dict(), '更新成功')

    @staticmethod
    def delete_plan(plan_id):
        """删除巡检计划"""
        plan = PatrolPlan.get_by_id(plan_id)
        if not plan:
            return Response.not_found('巡检计划不存在')

        task_count = PatrolTask.query.filter_by(plan_id=plan_id).count()
        if task_count > 0:
            return Response.error('该计划已生成巡检任务，无法删除', 400)

        plan.delete()
        return Response.success(None, '删除成功')

    @staticmethod
    def toggle_plan_status(plan_id):
        """切换计划状态"""
        plan = PatrolPlan.get_by_id(plan_id)
        if not plan:
            return Response.not_found('巡检计划不存在')

        new_status = 'inactive' if plan.status == 'active' else 'active'
        plan.update(status=new_status)
        return Response.success(plan.to_dict(), f'已{"停用" if new_status == "inactive" else "启用"}')


class PatrolTaskService:
    """巡检任务服务"""

    @staticmethod
    def get_tasks(page=1, size=10, status=None, plan_id=None, route_id=None,
                  executor=None, start_date=None, end_date=None):
        """获取巡检任务列表"""
        query = PatrolTask.query

        if status:
            query = query.filter(PatrolTask.status == status)
        if plan_id:
            query = query.filter(PatrolTask.plan_id == plan_id)
        if route_id:
            query = query.filter(PatrolTask.route_id == route_id)
        if executor:
            query = query.filter(PatrolTask.executor.like(f'%{executor}%'))
        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(PatrolTask.plan_date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(PatrolTask.plan_date <= end)

        pagination = query.order_by(PatrolTask.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [t.to_dict() for t in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_task_by_id(task_id):
        """获取任务详情（含结果）"""
        task = PatrolTask.get_by_id(task_id)
        if not task:
            return Response.not_found('巡检任务不存在')

        task_dict = task.to_dict()
        results = []
        for r in task.results:
            results.append(r.to_dict())
        task_dict['results'] = results

        if task.route_id:
            route = PatrolRoute.get_by_id(task.route_id)
            if route:
                task_dict['checkpoints'] = [cp.to_dict() for cp in route.checkpoints.order_by(PatrolCheckpoint.sort_order).all()]
                for cp in task_dict['checkpoints']:
                    cp['items'] = [item.to_dict() for item in PatrolItem.query.filter_by(checkpoint_id=cp['id']).order_by(PatrolItem.sort_order).all()]

        return Response.success(task_dict)

    @staticmethod
    def generate_today_tasks():
        """根据计划生成今日巡检任务"""
        today = date.today()
        now = datetime.now()
        generated_count = 0

        plans = PatrolPlan.query.filter_by(status='active').all()

        for plan in plans:
            try:
                if plan.start_date and today < plan.start_date:
                    continue
                if plan.end_date and today > plan.end_date:
                    if plan.status != 'expired':
                        plan.update(status='expired')
                    continue

                should_generate = False
                if plan.frequency == 'daily':
                    should_generate = True
                elif plan.frequency == 'weekly':
                    weekday = str(today.isoweekday())
                    if plan.week_days and weekday in plan.week_days.split(','):
                        should_generate = True
                elif plan.frequency == 'monthly':
                    day = str(today.day)
                    if plan.month_days and day in plan.month_days.split(','):
                        should_generate = True

                if not should_generate:
                    continue

                existing = PatrolTask.query.filter_by(
                    plan_id=plan.id,
                    plan_date=today
                ).first()
                if existing:
                    continue

                execute_hour = 8
                execute_minute = 0
                if plan.execute_time:
                    parts = plan.execute_time.split(':')
                    if len(parts) == 2:
                        execute_hour = int(parts[0])
                        execute_minute = int(parts[1])

                due_time = datetime.combine(today, datetime.min.time()).replace(
                    hour=execute_hour, minute=execute_minute
                ) + timedelta(hours=2)

                task_code = f"PT{today.strftime('%Y%m%d')}-{plan.plan_code}-{PatrolTask.query.count() + 1:04d}"

                task = PatrolTask(
                    task_code=task_code,
                    plan_id=plan.id,
                    route_id=plan.route_id,
                    executor=plan.person_in_charge,
                    status='pending',
                    plan_date=today,
                    due_time=due_time
                )
                db.session.add(task)
                generated_count += 1

            except Exception as e:
                logger.error(f"生成任务失败 - 计划{plan.plan_code}: {str(e)}")
                continue

        db.session.commit()
        logger.info(f"今日巡检任务生成完成，共生成 {generated_count} 条任务")
        return Response.success({'generated_count': generated_count}, f'成功生成{generated_count}条任务')

    @staticmethod
    def check_overdue_tasks():
        """检查并标记逾期任务"""
        now = datetime.now()
        overdue_count = 0

        tasks = PatrolTask.query.filter(
            PatrolTask.status.in_(['pending', 'in_progress']),
            PatrolTask.due_time < now
        ).all()

        for task in tasks:
            task.update(status='overdue')
            overdue_count += 1

        logger.info(f"逾期任务检查完成，共标记 {overdue_count} 条任务为逾期")
        return Response.success({'overdue_count': overdue_count})

    @staticmethod
    def start_task(task_id, executor=None):
        """开始执行任务"""
        task = PatrolTask.get_by_id(task_id)
        if not task:
            return Response.not_found('巡检任务不存在')

        if task.status not in ['pending', 'overdue']:
            return Response.error('任务状态不允许开始执行', 400)

        task.update(
            status='in_progress',
            start_time=datetime.now(),
            executor=executor or task.executor
        )
        return Response.success(task.to_dict(), '任务已开始')

    @staticmethod
    def submit_task_result(task_id, data):
        """提交巡检结果"""
        task = PatrolTask.get_by_id(task_id)
        if not task:
            return Response.not_found('巡检任务不存在')

        if task.status == 'completed':
            return Response.error('任务已完成，不可重复提交', 400)

        results = data.get('results', [])
        abnormal_count = 0
        alerts_created = []

        for result_data in results:
            result = PatrolResult(
                task_id=task_id,
                checkpoint_id=result_data.get('checkpoint_id'),
                item_id=result_data.get('item_id'),
                actual_value=result_data.get('actual_value', ''),
                is_abnormal=result_data.get('is_abnormal', 0),
                remark=result_data.get('remark', ''),
                images=json.dumps(result_data.get('images', []), ensure_ascii=False) if result_data.get('images') else None
            )
            db.session.add(result)

            if result.is_abnormal == 1:
                abnormal_count += 1
                alert = PatrolTaskService._create_abnormal_alert(task, result)
                if alert:
                    alerts_created.append(alert)

        task.update(
            status='completed',
            end_time=datetime.now()
        )
        db.session.commit()

        task_dict = task.to_dict()
        task_dict['abnormal_count'] = abnormal_count
        task_dict['alerts_created'] = len(alerts_created)

        return Response.success(task_dict, f'提交成功，发现{abnormal_count}项异常，已生成{len(alerts_created)}条告警')

    @staticmethod
    def _create_abnormal_alert(task, result):
        """创建异常告警"""
        try:
            checkpoint = PatrolCheckpoint.get_by_id(result.checkpoint_id)
            item = PatrolItem.get_by_id(result.item_id)

            now = datetime.now()
            alert_code = f"ALERT-PATROL-{now.strftime('%Y%m%d%H%M%S')}-{AlertRecord.query.count() + 1}"

            message = f"巡检异常：任务[{task.task_code}]"
            if checkpoint:
                message += f" 检查点[{checkpoint.checkpoint_name}]"
            if item:
                message += f" 巡检项[{item.item_name}]"
            message += f" 实际值[{result.actual_value}]"
            if item and item.expected_value:
                message += f" 标准值[{item.expected_value}]"

            alert = AlertRecord(
                alert_code=alert_code,
                alert_type='patrol_abnormal',
                equipment_id=checkpoint.equipment_id if checkpoint else None,
                severity='warning',
                message=message,
                status='active'
            )
            db.session.add(alert)
            return alert
        except Exception as e:
            logger.error(f"创建巡检异常告警失败: {str(e)}")
            return None

    @staticmethod
    def get_statistics():
        """获取巡检统计数据"""
        total = PatrolTask.query.count()
        pending = PatrolTask.query.filter_by(status='pending').count()
        in_progress = PatrolTask.query.filter_by(status='in_progress').count()
        completed = PatrolTask.query.filter_by(status='completed').count()
        overdue = PatrolTask.query.filter_by(status='overdue').count()

        abnormal_results = PatrolResult.query.filter_by(is_abnormal=1).count()
        normal_results = PatrolResult.query.filter_by(is_abnormal=0).count()
        total_results = abnormal_results + normal_results
        pass_rate = round(normal_results / total_results * 100, 2) if total_results > 0 else 100

        return Response.success({
            'total': total,
            'by_status': {
                'pending': pending,
                'in_progress': in_progress,
                'completed': completed,
                'overdue': overdue
            },
            'pass_rate': pass_rate,
            'abnormal_count': abnormal_results,
            'normal_count': normal_results
        })

    @staticmethod
    def get_report(start_date=None, end_date=None):
        """获取巡检报表数据"""
        query = PatrolTask.query.filter_by(status='completed')

        if start_date:
            start = datetime.strptime(start_date, '%Y-%m-%d').date()
            query = query.filter(PatrolTask.plan_date >= start)
        if end_date:
            end = datetime.strptime(end_date, '%Y-%m-%d').date()
            query = query.filter(PatrolTask.plan_date <= end)

        tasks = query.all()
        total_tasks = len(tasks)

        result_query = PatrolResult.query
        if start_date or end_date:
            task_ids = [t.id for t in tasks]
            if task_ids:
                result_query = result_query.filter(PatrolResult.task_id.in_(task_ids))

        results = result_query.all()
        total_results = len(results)
        abnormal_results = [r for r in results if r.is_abnormal == 1]
        normal_results = [r for r in results if r.is_abnormal == 0]
        pass_rate = round(len(normal_results) / total_results * 100, 2) if total_results > 0 else 100

        abnormal_item_count = {}
        for r in abnormal_results:
            item = PatrolItem.get_by_id(r.item_id)
            if item:
                key = item.item_name
                abnormal_item_count[key] = abnormal_item_count.get(key, 0) + 1

        top_abnormal = sorted(
            abnormal_item_count.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]

        route_stats = {}
        for t in tasks:
            route = PatrolRoute.get_by_id(t.route_id)
            if route:
                key = route.route_name
                if key not in route_stats:
                    route_stats[key] = {'total': 0, 'completed': 0}
                route_stats[key]['total'] += 1
                if t.status == 'completed':
                    route_stats[key]['completed'] += 1

        return Response.success({
            'total_tasks': total_tasks,
            'total_results': total_results,
            'abnormal_count': len(abnormal_results),
            'normal_count': len(normal_results),
            'pass_rate': pass_rate,
            'top_abnormal': [{'item_name': k, 'count': v} for k, v in top_abnormal],
            'route_stats': [{'route_name': k, **v} for k, v in route_stats.items()]
        })
