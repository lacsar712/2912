"""
供应商管理服务
"""
from datetime import datetime, timedelta
from flask import g
from database.db import db
from models.supplier import Supplier, Contract, MonthlyRating
from models.production import AlertRecord
from models.log import Log
from utils.response import Response
from utils.validator import Validator


class SupplierService:
    """供应商服务类"""

    @staticmethod
    def get_suppliers(page=1, size=10, keyword=None, status=None, grade=None):
        """获取供应商列表"""
        query = Supplier.query

        if keyword:
            query = query.filter(
                (Supplier.supplier_code.like(f'%{keyword}%')) |
                (Supplier.supplier_name.like(f'%{keyword}%')) |
                (Supplier.contact_person.like(f'%{keyword}%'))
            )
        if status:
            query = query.filter(Supplier.cooperation_status == status)

        pagination = query.order_by(Supplier.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        items = []
        for s in pagination.items:
            s_dict = s.to_dict()
            if grade and s_dict.get('grade') != grade:
                continue
            items.append(s_dict)

        total = len(items) if grade else pagination.total

        return Response.paginate(items, total, page, size)

    @staticmethod
    def get_supplier_by_id(supplier_id):
        """获取供应商详情"""
        supplier = Supplier.query.filter(Supplier.id == supplier_id).first()
        if not supplier:
            return Response.not_found('供应商不存在')

        result = supplier.to_dict()

        contracts = Contract.query.filter(
            Contract.supplier_id == supplier_id,
            Contract.status == 1
        ).order_by(Contract.create_time.desc()).all()
        result['contracts'] = [c.to_dict() for c in contracts]

        three_months_ago = datetime.now() - timedelta(days=90)
        ratings = MonthlyRating.query.filter(
            MonthlyRating.supplier_id == supplier_id,
            MonthlyRating.rating_date >= three_months_ago,
            MonthlyRating.status == 1
        ).order_by(MonthlyRating.rating_date.desc()).all()
        result['ratings'] = [r.to_dict() for r in ratings]

        all_ratings = MonthlyRating.query.filter(
            MonthlyRating.supplier_id == supplier_id,
            MonthlyRating.status == 1
        ).order_by(MonthlyRating.rating_date.asc()).all()
        result['rating_history'] = [r.to_dict() for r in all_ratings]

        return Response.success(result)

    @staticmethod
    def create_supplier(data):
        """创建供应商"""
        validation = Validator.validate_form(data, {
            'supplier_code': ['required'],
            'supplier_name': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Supplier.query.filter_by(supplier_code=data['supplier_code']).first():
            return Response.error('供应商编号已存在', 409)

        cooperation_start_date = None
        if data.get('cooperation_start_date'):
            try:
                cooperation_start_date = datetime.strptime(
                    data['cooperation_start_date'], '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response.bad_request('合作开始日期格式错误，请使用 YYYY-MM-DD')

        supplier = Supplier(
            supplier_code=data['supplier_code'],
            supplier_name=data['supplier_name'],
            contact_person=data.get('contact_person', ''),
            contact_phone=data.get('contact_phone', ''),
            contact_email=data.get('contact_email', ''),
            address=data.get('address', ''),
            cooperation_start_date=cooperation_start_date,
            cooperation_status=data.get('cooperation_status', 'active')
        )

        try:
            supplier.save()
            Log.add_log(g.user_id, g.username, 'create', 'supplier',
                       f'创建供应商: {supplier.supplier_name}')
            return Response.created({'id': supplier.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_supplier(supplier_id, data):
        """更新供应商"""
        supplier = Supplier.query.filter(Supplier.id == supplier_id).first()
        if not supplier:
            return Response.not_found('供应商不存在')

        if 'supplier_code' in data:
            existing = Supplier.query.filter_by(supplier_code=data['supplier_code']).first()
            if existing and existing.id != supplier_id:
                return Response.error('供应商编号已存在', 409)

        allowed = ['supplier_code', 'supplier_name', 'contact_person',
                  'contact_phone', 'contact_email', 'address',
                  'cooperation_status']
        update_data = {k: v for k, v in data.items() if k in allowed}

        if 'cooperation_start_date' in data:
            try:
                update_data['cooperation_start_date'] = datetime.strptime(
                    data['cooperation_start_date'], '%Y-%m-%d'
                ).date()
            except ValueError:
                return Response.bad_request('合作开始日期格式错误，请使用 YYYY-MM-DD')

        try:
            supplier.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'supplier',
                       f'更新供应商: {supplier.supplier_name}')
            return Response.success(supplier.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_supplier(supplier_id):
        """删除供应商"""
        supplier = Supplier.query.filter(Supplier.id == supplier_id).first()
        if not supplier:
            return Response.not_found('供应商不存在')

        try:
            supplier.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'supplier',
                       f'删除供应商: {supplier.supplier_name}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class ContractService:
    """合同服务类"""

    @staticmethod
    def get_contracts(page=1, size=10, supplier_id=None, status=None):
        """获取合同列表"""
        query = Contract.query

        if supplier_id:
            query = query.filter(Contract.supplier_id == supplier_id)
        if status:
            query = query.filter(Contract.contract_status == status)

        pagination = query.order_by(Contract.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [c.to_dict() for c in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_contract_by_id(contract_id):
        """获取合同详情"""
        contract = Contract.query.filter(Contract.id == contract_id).first()
        if not contract:
            return Response.not_found('合同不存在')
        return Response.success(contract.to_dict())

    @staticmethod
    def create_contract(data):
        """创建合同"""
        validation = Validator.validate_form(data, {
            'contract_code': ['required'],
            'supplier_id': ['required'],
            'start_date': ['required'],
            'end_date': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Contract.query.filter_by(contract_code=data['contract_code']).first():
            return Response.error('合同编号已存在', 409)

        supplier = Supplier.query.filter(Supplier.id == data['supplier_id']).first()
        if not supplier:
            return Response.not_found('供应商不存在')

        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            return Response.bad_request('日期格式错误，请使用 YYYY-MM-DD')

        if start_date >= end_date:
            return Response.bad_request('合同开始日期必须早于结束日期')

        contract = Contract(
            contract_code=data['contract_code'],
            supplier_id=data['supplier_id'],
            start_date=start_date,
            end_date=end_date,
            contract_amount=data.get('contract_amount', 0),
            attachment=data.get('attachment', ''),
            contract_status='active'
        )

        try:
            contract.save()
            Log.add_log(g.user_id, g.username, 'create', 'contract',
                       f'创建合同: {contract.contract_code} - {supplier.supplier_name}')
            return Response.created({'id': contract.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_contract(contract_id, data):
        """更新合同"""
        contract = Contract.query.filter(Contract.id == contract_id).first()
        if not contract:
            return Response.not_found('合同不存在')

        if 'contract_code' in data:
            existing = Contract.query.filter_by(contract_code=data['contract_code']).first()
            if existing and existing.id != contract_id:
                return Response.error('合同编号已存在', 409)

        allowed = ['contract_code', 'contract_amount', 'attachment', 'contract_status']
        update_data = {k: v for k, v in data.items() if k in allowed}

        if 'start_date' in data:
            try:
                update_data['start_date'] = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
            except ValueError:
                return Response.bad_request('开始日期格式错误，请使用 YYYY-MM-DD')

        if 'end_date' in data:
            try:
                update_data['end_date'] = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
            except ValueError:
                return Response.bad_request('结束日期格式错误，请使用 YYYY-MM-DD')

        if 'start_date' in update_data and 'end_date' in update_data:
            if update_data['start_date'] >= update_data['end_date']:
                return Response.bad_request('合同开始日期必须早于结束日期')

        try:
            contract.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'contract',
                       f'更新合同: {contract.contract_code}')
            return Response.success(contract.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_contract(contract_id):
        """删除合同"""
        contract = Contract.query.filter(Contract.id == contract_id).first()
        if not contract:
            return Response.not_found('合同不存在')

        try:
            contract.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'contract',
                       f'删除合同: {contract.contract_code}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')

    @staticmethod
    def _get_expiring_contracts_raw(days=15, limit=5):
        """获取即将到期的合同（返回原始数据列表，用于服务内部调用）"""
        today = datetime.now().date()
        expiry_date = today + timedelta(days=days)

        contracts = Contract.query.filter(
            Contract.contract_status == 'active',
            Contract.end_date >= today,
            Contract.end_date <= expiry_date,
            Contract.status == 1
        ).order_by(Contract.end_date.asc()).limit(limit).all()

        return [c.to_dict() for c in contracts]

    @staticmethod
    def get_expiring_contracts(days=15, limit=5):
        """获取即将到期的合同（返回Response，用于API控制器）"""
        return Response.success(ContractService._get_expiring_contracts_raw(days, limit))

    @staticmethod
    def check_contract_expiry():
        """检查合同到期并生成告警"""
        today = datetime.now().date()
        alert_start_date = today + timedelta(days=15)

        contracts = Contract.query.filter(
            Contract.contract_status == 'active',
            Contract.end_date <= alert_start_date,
            Contract.end_date >= today,
            Contract.status == 1
        ).all()

        alert_count = 0
        for contract in contracts:
            supplier = Supplier.get_by_id(contract.supplier_id)
            if not supplier:
                continue

            days_left = (contract.end_date - today).days

            existing_alert = AlertRecord.query.filter(
                AlertRecord.alert_type == 'contract_expiring',
                AlertRecord.status == 'active',
                AlertRecord.message.like(f'%{contract.contract_code}%')
            ).first()

            if existing_alert:
                continue

            now = datetime.now()
            alert_code = f"ALERT-{now.strftime('%Y%m%d%H%M%S')}-{AlertRecord.query.count() + 1}"
            alert = AlertRecord(
                alert_code=alert_code,
                alert_type='contract_expiring',
                severity='warning' if days_left > 7 else 'error',
                message=f'合同即将到期：{contract.contract_code} - {supplier.supplier_name}，剩余 {days_left} 天，到期日期：{contract.end_date}',
                value=days_left,
                threshold=15,
                status='active'
            )
            db.session.add(alert)
            alert_count += 1

        db.session.commit()
        return alert_count


class MonthlyRatingService:
    """月度评分服务类"""

    @staticmethod
    def get_ratings(page=1, size=10, supplier_id=None, year=None, month=None):
        """获取评分列表"""
        query = MonthlyRating.query

        if supplier_id:
            query = query.filter(MonthlyRating.supplier_id == supplier_id)
        if year:
            query = query.filter(db.func.strftime('%Y', MonthlyRating.rating_date) == str(year))
        if month:
            query = query.filter(db.func.strftime('%m', MonthlyRating.rating_date) == f'{int(month):02d}')

        pagination = query.order_by(MonthlyRating.rating_date.desc()).paginate(
            page=page, per_page=size, error_out=False
        )

        return Response.paginate(
            [r.to_dict() for r in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_rating_by_id(rating_id):
        """获取评分详情"""
        rating = MonthlyRating.query.filter(MonthlyRating.id == rating_id).first()
        if not rating:
            return Response.not_found('评分不存在')
        return Response.success(rating.to_dict())

    @staticmethod
    def create_rating(data):
        """创建月度评分"""
        validation = Validator.validate_form(data, {
            'supplier_id': ['required'],
            'rating_date': ['required'],
            'quality_score': ['required'],
            'delivery_score': ['required'],
            'price_score': ['required'],
            'service_score': ['required']
        })

        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        supplier = Supplier.query.filter(Supplier.id == data['supplier_id']).first()
        if not supplier:
            return Response.not_found('供应商不存在')

        try:
            rating_date = datetime.strptime(data['rating_date'], '%Y-%m-%d').date()
        except ValueError:
            return Response.bad_request('评分日期格式错误，请使用 YYYY-MM-DD')

        for field in ['quality_score', 'delivery_score', 'price_score', 'service_score']:
            score = int(data[field])
            if score < 1 or score > 10:
                return Response.bad_request(f'{field} 必须在 1-10 之间')

        existing = MonthlyRating.query.filter(
            MonthlyRating.supplier_id == data['supplier_id'],
            db.func.strftime('%Y-%m', MonthlyRating.rating_date) == rating_date.strftime('%Y-%m'),
            MonthlyRating.status == 1
        ).first()

        if existing:
            return Response.error('该供应商本月已有评分记录', 409)

        rating = MonthlyRating(
            supplier_id=data['supplier_id'],
            rating_date=rating_date,
            quality_score=int(data['quality_score']),
            delivery_score=int(data['delivery_score']),
            price_score=int(data['price_score']),
            service_score=int(data['service_score']),
            remark=data.get('remark', '')
        )
        rating.calculate_total()

        try:
            rating.save()
            Log.add_log(g.user_id, g.username, 'create', 'monthly_rating',
                       f'创建评分: {supplier.supplier_name} - {rating_date.strftime("%Y-%m")}，综合分: {rating.total_score}')
            return Response.created({'id': rating.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_rating(rating_id, data):
        """更新月度评分"""
        rating = MonthlyRating.query.filter(MonthlyRating.id == rating_id).first()
        if not rating:
            return Response.not_found('评分不存在')

        allowed = ['quality_score', 'delivery_score', 'price_score', 'service_score', 'remark']
        update_data = {}

        for field in ['quality_score', 'delivery_score', 'price_score', 'service_score']:
            if field in data:
                score = int(data[field])
                if score < 1 or score > 10:
                    return Response.bad_request(f'{field} 必须在 1-10 之间')
                update_data[field] = score

        if 'remark' in data:
            update_data['remark'] = data['remark']

        try:
            rating.update(**update_data)
            rating.calculate_total()
            db.session.commit()

            supplier = Supplier.get_by_id(rating.supplier_id)
            supplier_name = supplier.supplier_name if supplier else '未知'

            Log.add_log(g.user_id, g.username, 'update', 'monthly_rating',
                       f'更新评分: {supplier_name} - {rating.rating_date.strftime("%Y-%m")}，综合分: {rating.total_score}')
            return Response.success(rating.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_rating(rating_id):
        """删除月度评分"""
        rating = MonthlyRating.query.filter(MonthlyRating.id == rating_id).first()
        if not rating:
            return Response.not_found('评分不存在')

        try:
            rating.delete()
            supplier = Supplier.get_by_id(rating.supplier_id)
            supplier_name = supplier.supplier_name if supplier else '未知'
            Log.add_log(g.user_id, g.username, 'delete', 'monthly_rating',
                       f'删除评分: {supplier_name} - {rating.rating_date.strftime("%Y-%m")}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class SupplierDashboardService:
    """供应商看板服务类"""

    @staticmethod
    def get_grading_dashboard():
        """获取分级看板数据"""
        suppliers = Supplier.query.filter(
            Supplier.status == 1,
            Supplier.cooperation_status == 'active'
        ).all()

        grade_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0}
        grade_suppliers = {'A': [], 'B': [], 'C': [], 'D': [], 'unrated': []}

        for s in suppliers:
            s_dict = s.to_dict()
            grade = s_dict.get('grade')
            if grade in grade_counts:
                grade_counts[grade] += 1
                grade_suppliers[grade].append(s_dict)
            else:
                grade_suppliers['unrated'].append(s_dict)

        return Response.success({
            'grade_counts': grade_counts,
            'grade_suppliers': grade_suppliers,
            'total_suppliers': len(suppliers)
        })

    @staticmethod
    def get_dashboard_stats():
        """获取监控中心供应商统计数据"""
        today = datetime.now().date()
        first_day_of_month = today.replace(day=1)

        new_suppliers_this_month = Supplier.query.filter(
            Supplier.create_time >= first_day_of_month,
            Supplier.status == 1
        ).count()

        expiring_data = ContractService._get_expiring_contracts_raw(days=15, limit=5)

        return Response.success({
            'new_suppliers_this_month': new_suppliers_this_month,
            'expiring_contracts': expiring_data
        })
