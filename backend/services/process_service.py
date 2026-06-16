"""
工艺参数模板服务
"""
from flask import g
from datetime import datetime
from database.db import db
from models.process import ProcessTemplate, ProcessTemplateParam, ProcessAuditRecord, ProcessDeployRecord
from models.production import Equipment
from models.log import Log
from utils.response import Response
from utils.validator import Validator


class ProcessTemplateService:
    """工艺模板服务类"""

    @staticmethod
    def get_templates(page=1, size=10, product_name=None, status=None, keyword=None):
        """获取模板列表"""
        query = ProcessTemplate.query.filter(ProcessTemplate.status != 'archived')

        if product_name:
            query = query.filter(ProcessTemplate.product_name == product_name)
        if status:
            query = query.filter(ProcessTemplate.status == status)
        if keyword:
            query = query.filter(
                db.or_(
                    ProcessTemplate.template_code.like(f'%{keyword}%'),
                    ProcessTemplate.template_name.like(f'%{keyword}%')
                )
            )

        pagination = query.order_by(ProcessTemplate.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [t.to_dict_simple() for t in pagination.items]
        return Response.paginate(items, pagination.total, page, size)

    @staticmethod
    def get_template_by_id(template_id):
        """获取模板详情"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        result = template.to_dict()
        result['audit_records'] = [
            r.to_dict() for r in template.audit_records.order_by(
                ProcessAuditRecord.create_time.desc()
            ).limit(10).all()
        ]
        return Response.success(result)

    @staticmethod
    def get_template_versions(template_code):
        """获取同一模板编号的所有版本"""
        templates = ProcessTemplate.query.filter(
            ProcessTemplate.template_code == template_code
        ).order_by(ProcessTemplate.version.desc()).all()

        items = [t.to_dict_simple() for t in templates]
        return Response.success(items)

    @staticmethod
    def create_template(data):
        """创建模板"""
        validation = Validator.validate_form(data, {
            'template_code': ['required'],
            'template_name': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if ProcessTemplate.query.filter_by(template_code=data['template_code']).first():
            return Response.error('模板编号已存在', 409)

        params = data.get('params', [])
        for p in params:
            if not p.get('param_name'):
                return Response.bad_request('参数名称不能为空')
            if p.get('min_value') is not None and p.get('max_value') is not None:
                if float(p['min_value']) > float(p['max_value']):
                    return Response.bad_request(f'参数 {p["param_name"]} 的最小值不能大于最大值')

        template = ProcessTemplate(
            template_code=data['template_code'],
            template_name=data['template_name'],
            product_name=data.get('product_name'),
            process_step=data.get('process_step'),
            version=data.get('version', '1.0'),
            status='draft',
            creator=g.username if hasattr(g, 'username') else 'system',
            remark=data.get('remark')
        )

        try:
            db.session.add(template)
            db.session.flush()

            for idx, p in enumerate(params):
                param = ProcessTemplateParam(
                    template_id=template.id,
                    param_name=p['param_name'],
                    param_value=p.get('param_value'),
                    unit=p.get('unit'),
                    min_value=p.get('min_value'),
                    max_value=p.get('max_value'),
                    sort_order=idx
                )
                db.session.add(param)

            db.session.commit()
            Log.add_log(g.user_id, g.username, 'create', 'process_template',
                       f'创建工艺模板: {template.template_name}')
            return Response.created({'id': template.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_template(template_id, data):
        """更新模板（草稿状态可编辑，其他状态需新建版本）"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'draft':
            return Response.error('非草稿状态的模板不能直接编辑，请新建版本', 400)

        if data.get('template_name'):
            template.template_name = data['template_name']
        if data.get('product_name') is not None:
            template.product_name = data.get('product_name')
        if data.get('process_step') is not None:
            template.process_step = data.get('process_step')
        if data.get('remark') is not None:
            template.remark = data.get('remark')

        params = data.get('params')
        if params is not None:
            for p in params:
                if not p.get('param_name'):
                    return Response.bad_request('参数名称不能为空')
                if p.get('min_value') is not None and p.get('max_value') is not None:
                    if float(p['min_value']) > float(p['max_value']):
                        return Response.bad_request(f'参数 {p["param_name"]} 的最小值不能大于最大值')

            try:
                ProcessTemplateParam.query.filter_by(template_id=template.id).delete()

                for idx, p in enumerate(params):
                    param = ProcessTemplateParam(
                        template_id=template.id,
                        param_name=p['param_name'],
                        param_value=p.get('param_value'),
                        unit=p.get('unit'),
                        min_value=p.get('min_value'),
                        max_value=p.get('max_value'),
                        sort_order=idx
                    )
                    db.session.add(param)
            except Exception as e:
                db.session.rollback()
                return Response.error(f'更新失败: {str(e)}')

        try:
            db.session.commit()
            Log.add_log(g.user_id, g.username, 'update', 'process_template',
                       f'更新工艺模板: {template.template_name}')
            return Response.success({'id': template.id}, '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def create_new_version(template_id, data):
        """新建版本"""
        old_template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not old_template:
            return Response.not_found('模板不存在')

        new_version = data.get('version')
        if not new_version:
            return Response.bad_request('请输入新版本号')

        if ProcessTemplate.query.filter_by(
            template_code=old_template.template_code,
            version=new_version
        ).first():
            return Response.error('该版本号已存在', 409)

        try:
            new_template = ProcessTemplate(
                template_code=old_template.template_code,
                template_name=data.get('template_name', old_template.template_name),
                product_name=data.get('product_name', old_template.product_name),
                process_step=data.get('process_step', old_template.process_step),
                version=new_version,
                status='draft',
                creator=g.username if hasattr(g, 'username') else 'system',
                remark=data.get('remark', old_template.remark)
            )
            db.session.add(new_template)
            db.session.flush()

            old_params = old_template.params.all()
            for idx, p in enumerate(old_params):
                new_param = ProcessTemplateParam(
                    template_id=new_template.id,
                    param_name=p.param_name,
                    param_value=p.param_value,
                    unit=p.unit,
                    min_value=p.min_value,
                    max_value=p.max_value,
                    sort_order=idx
                )
                db.session.add(new_param)

            db.session.commit()
            Log.add_log(g.user_id, g.username, 'create', 'process_template',
                       f'新建工艺模板版本: {new_template.template_name} v{new_version}')
            return Response.created({'id': new_template.id}, '新版本创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def delete_template(template_id):
        """删除模板（只有草稿状态可删除）"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'draft':
            return Response.error('只有草稿状态的模板可以删除', 400)

        try:
            ProcessTemplateParam.query.filter_by(template_id=template.id).delete()
            ProcessAuditRecord.query.filter_by(template_id=template.id).delete()
            ProcessDeployRecord.query.filter_by(template_id=template.id).delete()
            db.session.delete(template)
            db.session.commit()
            Log.add_log(g.user_id, g.username, 'delete', 'process_template',
                       f'删除工艺模板: {template.template_name}')
            return Response.success(None, '删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')

    @staticmethod
    def archive_template(template_id):
        """归档模板"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'active':
            return Response.error('只有启用状态的模板可以归档', 400)

        try:
            template.status = 'archived'
            db.session.commit()
            Log.add_log(g.user_id, g.username, 'archive', 'process_template',
                       f'归档工艺模板: {template.template_name}')
            return Response.success(None, '归档成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'归档失败: {str(e)}')

    @staticmethod
    def get_products():
        """获取所有产品名称（用于筛选）"""
        templates = ProcessTemplate.query.filter(
            ProcessTemplate.product_name.isnot(None),
            ProcessTemplate.product_name != ''
        ).distinct(ProcessTemplate.product_name).all()

        products = list(set([t.product_name for t in templates if t.product_name]))
        return Response.success(products)

    @staticmethod
    def compare_versions(template_id_1, template_id_2):
        """版本对比"""
        t1 = ProcessTemplate.query.filter(ProcessTemplate.id == template_id_1).first()
        t2 = ProcessTemplate.query.filter(ProcessTemplate.id == template_id_2).first()

        if not t1 or not t2:
            return Response.not_found('模板不存在')

        if t1.template_code != t2.template_code:
            return Response.bad_request('只能对比同一模板编号的不同版本')

        params1 = {p.param_name: p for p in t1.params.all()}
        params2 = {p.param_name: p for p in t2.params.all()}

        all_param_names = sorted(list(set(list(params1.keys()) + list(params2.keys()))))

        param_diff = []
        for name in all_param_names:
            p1 = params1.get(name)
            p2 = params2.get(name)

            diff_type = 'same'
            if p1 is None:
                diff_type = 'added'
            elif p2 is None:
                diff_type = 'removed'
            elif (p1.param_value != p2.param_value or
                  p1.unit != p2.unit or
                  p1.min_value != p2.min_value or
                  p1.max_value != p2.max_value):
                diff_type = 'modified'

            param_diff.append({
                'param_name': name,
                'old_value': {
                    'param_value': float(p1.param_value) if p1 and p1.param_value else None,
                    'unit': p1.unit if p1 else None,
                    'min_value': float(p1.min_value) if p1 and p1.min_value else None,
                    'max_value': float(p1.max_value) if p1 and p1.max_value else None
                } if p1 else None,
                'new_value': {
                    'param_value': float(p2.param_value) if p2 and p2.param_value else None,
                    'unit': p2.unit if p2 else None,
                    'min_value': float(p2.min_value) if p2 and p2.min_value else None,
                    'max_value': float(p2.max_value) if p2 and p2.max_value else None
                } if p2 else None,
                'diff_type': diff_type
            })

        basic_diff = {
            'template_name': {
                'old': t1.template_name,
                'new': t2.template_name,
                'changed': t1.template_name != t2.template_name
            },
            'product_name': {
                'old': t1.product_name,
                'new': t2.product_name,
                'changed': t1.product_name != t2.product_name
            },
            'process_step': {
                'old': t1.process_step,
                'new': t2.process_step,
                'changed': t1.process_step != t2.process_step
            },
            'remark': {
                'old': t1.remark,
                'new': t2.remark,
                'changed': t1.remark != t2.remark
            }
        }

        result = {
            'template_1': {
                'id': t1.id,
                'version': t1.version,
                'status': t1.status,
                'create_time': t1.create_time.strftime('%Y-%m-%d %H:%M:%S') if t1.create_time else None
            },
            'template_2': {
                'id': t2.id,
                'version': t2.version,
                'status': t2.status,
                'create_time': t2.create_time.strftime('%Y-%m-%d %H:%M:%S') if t2.create_time else None
            },
            'basic_diff': basic_diff,
            'param_diff': param_diff
        }

        return Response.success(result)


class ProcessAuditService:
    """工艺模板审核服务类"""

    @staticmethod
    def submit_audit(template_id, comment=None):
        """提交审核"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'draft':
            return Response.error('只有草稿状态的模板可以提交审核', 400)

        if template.params.count() == 0:
            return Response.error('模板至少需要一个参数才能提交审核', 400)

        try:
            template.status = 'pending'
            db.session.add(template)

            audit_record = ProcessAuditRecord(
                template_id=template.id,
                action='submit',
                operator=g.username if hasattr(g, 'username') else 'system',
                operate_time=datetime.now(),
                comment=comment
            )
            db.session.add(audit_record)

            db.session.commit()
            Log.add_log(g.user_id, g.username, 'submit', 'process_template',
                       f'提交审核工艺模板: {template.template_name}')
            return Response.success(None, '提交审核成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'提交审核失败: {str(e)}')

    @staticmethod
    def audit_pass(template_id, comment=None):
        """审核通过"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'pending':
            return Response.error('只有待审状态的模板可以审核', 400)

        if template.creator == g.username:
            return Response.error('不能审核自己创建的模板', 403)

        try:
            template.status = 'active'
            template.auditor = g.username if hasattr(g, 'username') else 'system'
            template.audit_time = datetime.now()
            db.session.add(template)

            audit_record = ProcessAuditRecord(
                template_id=template.id,
                action='pass',
                operator=g.username if hasattr(g, 'username') else 'system',
                operate_time=datetime.now(),
                comment=comment
            )
            db.session.add(audit_record)

            db.session.commit()
            Log.add_log(g.user_id, g.username, 'audit_pass', 'process_template',
                       f'审核通过工艺模板: {template.template_name}')
            return Response.success(None, '审核通过')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'审核失败: {str(e)}')

    @staticmethod
    def audit_reject(template_id, comment=None):
        """审核驳回"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'pending':
            return Response.error('只有待审状态的模板可以审核', 400)

        if template.creator == g.username:
            return Response.error('不能审核自己创建的模板', 403)

        try:
            template.status = 'draft'
            db.session.add(template)

            audit_record = ProcessAuditRecord(
                template_id=template.id,
                action='reject',
                operator=g.username if hasattr(g, 'username') else 'system',
                operate_time=datetime.now(),
                comment=comment
            )
            db.session.add(audit_record)

            db.session.commit()
            Log.add_log(g.user_id, g.username, 'audit_reject', 'process_template',
                       f'审核驳回工艺模板: {template.template_name}')
            return Response.success(None, '审核已驳回')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'审核失败: {str(e)}')

    @staticmethod
    def get_pending_audits(page=1, size=10):
        """获取待我审核的列表"""
        query = ProcessTemplate.query.filter(
            ProcessTemplate.status == 'pending'
        )

        if hasattr(g, 'username'):
            query = query.filter(ProcessTemplate.creator != g.username)

        pagination = query.order_by(ProcessTemplate.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [t.to_dict_simple() for t in pagination.items]
        return Response.paginate(items, pagination.total, page, size)

    @staticmethod
    def get_audit_records(template_id):
        """获取模板的审核记录"""
        records = ProcessAuditRecord.query.filter_by(template_id=template_id).order_by(
            ProcessAuditRecord.create_time.desc()
        ).all()

        items = [r.to_dict() for r in records]
        return Response.success(items)


class ProcessDeployService:
    """工艺模板下发服务类"""

    @staticmethod
    def deploy_template(template_id, equipment_ids):
        """下发模板到设备"""
        template = ProcessTemplate.query.filter(
            ProcessTemplate.id == template_id
        ).first()

        if not template:
            return Response.not_found('模板不存在')

        if template.status != 'active':
            return Response.error('只有启用状态的模板可以下发', 400)

        if not equipment_ids or len(equipment_ids) == 0:
            return Response.bad_request('请选择至少一台设备')

        params = template.params.all()
        param_map = {p.param_name.lower(): p for p in params}

        results = []
        deploy_time = datetime.now()
        deployer = g.username if hasattr(g, 'username') else 'system'

        try:
            for eq_id in equipment_ids:
                equipment = Equipment.query.filter(
                    Equipment.id == eq_id
                ).first()

                if not equipment:
                    results.append({
                        'equipment_id': eq_id,
                        'equipment_code': None,
                        'equipment_name': None,
                        'result': 'failed',
                        'error_msg': '设备不存在'
                    })
                    continue

                applied_count = 0
                total_count = 0
                error_msg = ''

                for param_key in ['temperature', 'pressure', 'speed']:
                    param = param_map.get(param_key)
                    if param:
                        total_count += 1
                        try:
                            value = float(param.param_value)
                            if hasattr(equipment, param_key):
                                setattr(equipment, param_key, value)
                                applied_count += 1
                        except Exception as e:
                            error_msg += f'{param_key}设置失败: {str(e)}; '

                if total_count == 0:
                    result = 'failed'
                    error_msg = '模板中没有可下发的参数（temperature/pressure/speed）'
                elif applied_count == total_count:
                    result = 'success'
                elif applied_count > 0:
                    result = 'partial'
                else:
                    result = 'failed'

                deploy_record = ProcessDeployRecord(
                    template_id=template.id,
                    template_name=template.template_name,
                    template_version=template.version,
                    equipment_id=equipment.id,
                    equipment_code=equipment.equipment_code,
                    equipment_name=equipment.equipment_name,
                    deployer=deployer,
                    deploy_time=deploy_time,
                    result=result,
                    error_msg=error_msg or None
                )
                db.session.add(deploy_record)

                results.append({
                    'equipment_id': equipment.id,
                    'equipment_code': equipment.equipment_code,
                    'equipment_name': equipment.equipment_name,
                    'result': result,
                    'error_msg': error_msg or None,
                    'applied_count': applied_count,
                    'total_count': total_count
                })

            db.session.commit()

            success_count = sum(1 for r in results if r['result'] == 'success')
            Log.add_log(g.user_id, g.username, 'deploy', 'process_template',
                       f'下发工艺模板: {template.template_name} 到 {len(equipment_ids)} 台设备，成功{success_count}台')

            return Response.success({
                'total': len(results),
                'success': success_count,
                'failed': sum(1 for r in results if r['result'] == 'failed'),
                'partial': sum(1 for r in results if r['result'] == 'partial'),
                'results': results
            }, '下发完成')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'下发失败: {str(e)}')

    @staticmethod
    def get_deploy_records(page=1, size=10, template_id=None, equipment_id=None):
        """获取下发记录"""
        query = ProcessDeployRecord.query

        if template_id:
            query = query.filter(ProcessDeployRecord.template_id == template_id)
        if equipment_id:
            query = query.filter(ProcessDeployRecord.equipment_id == equipment_id)

        pagination = query.order_by(ProcessDeployRecord.deploy_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = [r.to_dict() for r in pagination.items]
        return Response.paginate(items, pagination.total, page, size)
