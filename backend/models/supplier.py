"""
供应商管理模型
"""
from datetime import datetime, timedelta
from database.db import db
from models.base import BaseModel


class Supplier(BaseModel):
    """供应商档案模型"""
    __tablename__ = 'supplier'

    supplier_code = db.Column(db.String(50), unique=True, nullable=False, comment='供应商编号')
    supplier_name = db.Column(db.String(200), nullable=False, comment='供应商名称')
    contact_person = db.Column(db.String(50), comment='联系人')
    contact_phone = db.Column(db.String(20), comment='联系电话')
    contact_email = db.Column(db.String(100), comment='联系邮箱')
    address = db.Column(db.String(500), comment='地址')
    cooperation_start_date = db.Column(db.Date, comment='合作开始日期')
    cooperation_status = db.Column(
        db.Enum('active', 'suspended', 'blacklisted'),
        default='active',
        comment='合作状态: active合作中/suspended暂停/blacklisted拉黑'
    )

    contracts = db.relationship('Contract', backref='supplier_ref', lazy='dynamic', foreign_keys='Contract.supplier_id')
    ratings = db.relationship('MonthlyRating', backref='supplier_ref', lazy='dynamic', foreign_keys='MonthlyRating.supplier_id')

    def get_grade(self):
        """获取供应商分级 (A/B/C/D) 基于最近3个月平均综合分"""
        three_months_ago = datetime.now() - timedelta(days=90)
        ratings = self.ratings.filter(
            MonthlyRating.rating_date >= three_months_ago,
            MonthlyRating.status == 1
        ).all()

        if not ratings:
            return None

        avg_total = sum(r.total_score for r in ratings) / len(ratings)

        if avg_total >= 9:
            return 'A'
        elif avg_total >= 7.5:
            return 'B'
        elif avg_total >= 6:
            return 'C'
        else:
            return 'D'

    def get_avg_score(self):
        """获取最近3个月平均综合分"""
        three_months_ago = datetime.now() - timedelta(days=90)
        ratings = self.ratings.filter(
            MonthlyRating.rating_date >= three_months_ago,
            MonthlyRating.status == 1
        ).all()

        if not ratings:
            return None

        return round(sum(r.total_score for r in ratings) / len(ratings), 2)

    def to_dict(self):
        result = super().to_dict()
        try:
            result['grade'] = self.get_grade()
            result['avg_score'] = self.get_avg_score()
            result['contract_count'] = self.contracts.filter(Contract.status == 1).count()
        except Exception:
            result['grade'] = None
            result['avg_score'] = None
            result['contract_count'] = 0
        return result

    def __repr__(self):
        return f'<Supplier {self.supplier_name}>'


class Contract(BaseModel):
    """合同模型"""
    __tablename__ = 'contract'

    contract_code = db.Column(db.String(50), unique=True, nullable=False, comment='合同编号')
    supplier_id = db.Column(db.BigInteger, db.ForeignKey('supplier.id'), comment='关联供应商ID')
    start_date = db.Column(db.Date, nullable=False, comment='合同开始日期')
    end_date = db.Column(db.Date, nullable=False, comment='合同结束日期')
    contract_amount = db.Column(db.Numeric(15, 2), comment='合同金额')
    attachment = db.Column(db.Text, comment='合同附件 base64')
    contract_status = db.Column(
        db.Enum('active', 'expired', 'terminated'),
        default='active',
        comment='合同状态: active生效中/expired已到期/terminated已终止'
    )

    def to_dict(self):
        result = super().to_dict()
        if self.supplier_ref:
            result['supplier_code'] = self.supplier_ref.supplier_code
            result['supplier_name'] = self.supplier_ref.supplier_name
        return result

    def __repr__(self):
        return f'<Contract {self.contract_code}>'


class MonthlyRating(BaseModel):
    """月度评分模型"""
    __tablename__ = 'monthly_rating'

    supplier_id = db.Column(db.BigInteger, db.ForeignKey('supplier.id'), comment='供应商ID')
    rating_date = db.Column(db.Date, nullable=False, comment='评分月份')
    quality_score = db.Column(db.Integer, nullable=False, comment='质量评分 1-10')
    delivery_score = db.Column(db.Integer, nullable=False, comment='交付评分 1-10')
    price_score = db.Column(db.Integer, nullable=False, comment='价格评分 1-10')
    service_score = db.Column(db.Integer, nullable=False, comment='服务评分 1-10')
    total_score = db.Column(db.Numeric(5, 2), comment='综合分 (自动计算)')
    remark = db.Column(db.Text, comment='备注')

    def calculate_total(self):
        """自动计算综合分（四个维度平均分）"""
        self.total_score = round(
            (self.quality_score + self.delivery_score + self.price_score + self.service_score) / 4,
            2
        )
        return self.total_score

    def to_dict(self):
        result = super().to_dict()
        if self.supplier_ref:
            result['supplier_code'] = self.supplier_ref.supplier_code
            result['supplier_name'] = self.supplier_ref.supplier_name
        return result

    def __repr__(self):
        return f'<MonthlyRating {self.supplier_id}-{self.rating_date}>'
