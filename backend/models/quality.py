"""
质检管理模型
"""
from database.db import db
from models.base import BaseModel


class InspectionTemplate(BaseModel):
    """质检规则模板模型"""
    __tablename__ = 'inspection_template'

    template_code = db.Column(db.String(50), unique=True, nullable=False, comment='模板编号')
    template_name = db.Column(db.String(100), nullable=False, comment='模板名称')
    product_name = db.Column(db.String(100), comment='产品名称')
    product_spec = db.Column(db.String(200), comment='产品规格')
    version = db.Column(db.String(20), default='1.0', comment='版本号')
    is_active = db.Column(db.SmallInteger, default=1, comment='状态: 0停用/1启用')
    remark = db.Column(db.Text, comment='备注')

    items = db.relationship('InspectionTemplateItem', backref='template',
                           lazy='dynamic', cascade='all, delete-orphan',
                           foreign_keys='InspectionTemplateItem.template_id')

    def to_dict(self):
        result = super().to_dict()
        result['items'] = [item.to_dict() for item in self.items.all()]
        return result

    def __repr__(self):
        return f'<InspectionTemplate {self.template_name}>'


class InspectionTemplateItem(BaseModel):
    """质检模板检测项模型"""
    __tablename__ = 'inspection_template_item'

    template_id = db.Column(db.BigInteger, db.ForeignKey('inspection_template.id'),
                           nullable=False, comment='模板ID')
    item_name = db.Column(db.String(100), nullable=False, comment='检测项名称')
    standard = db.Column(db.String(200), comment='标准值')
    lower_limit = db.Column(db.Numeric(12, 4), comment='下限值')
    upper_limit = db.Column(db.Numeric(12, 4), comment='上限值')
    unit = db.Column(db.String(20), comment='单位')
    required = db.Column(db.SmallInteger, default=1, comment='是否必检: 0否/1是')
    sort_order = db.Column(db.Integer, default=0, comment='排序')

    def to_dict(self):
        result = super().to_dict()
        return result

    def __repr__(self):
        return f'<InspectionTemplateItem {self.item_name}>'


class InspectionOrder(BaseModel):
    """质检单模型"""
    __tablename__ = 'inspection_order'

    order_code = db.Column(db.String(50), unique=True, nullable=False, comment='质检单号')
    task_id = db.Column(db.BigInteger, db.ForeignKey('production_task.id'),
                       comment='关联生产任务ID')
    template_id = db.Column(db.BigInteger, db.ForeignKey('inspection_template.id'),
                           comment='质检模板ID')
    product_name = db.Column(db.String(100), comment='产品名称')
    product_spec = db.Column(db.String(200), comment='产品规格')
    sample_quantity = db.Column(db.Integer, default=0, comment='抽检数量')
    qualified_quantity = db.Column(db.Integer, default=0, comment='合格数量')
    unqualified_quantity = db.Column(db.Integer, default=0, comment='不合格数量')
    inspector = db.Column(db.String(50), comment='检测人')
    inspection_time = db.Column(db.DateTime, comment='检测时间')
    overall_result = db.Column(db.Enum('qualified', 'unqualified', 'pending'),
                              default='pending', comment='整体结论')
    remark = db.Column(db.Text, comment='备注')

    results = db.relationship('InspectionResult', backref='order',
                             lazy='dynamic', cascade='all, delete-orphan',
                             foreign_keys='InspectionResult.order_id')
    defects = db.relationship('DefectRecord', backref='order',
                             lazy='dynamic', cascade='all, delete-orphan',
                             foreign_keys='DefectRecord.order_id')
    task = db.relationship('ProductionTask', backref='inspection_orders',
                          foreign_keys=[task_id])
    template = db.relationship('InspectionTemplate', backref='orders',
                              foreign_keys=[template_id])

    def to_dict(self):
        result = super().to_dict()
        if self.task:
            result['task_code'] = self.task.task_code
            result['task_name'] = self.task.task_name
        if self.template:
            result['template_name'] = self.template.template_name
        return result

    def to_dict_detail(self):
        result = self.to_dict()
        result['results'] = [r.to_dict() for r in self.results.all()]
        result['defects'] = [d.to_dict() for d in self.defects.all()]
        return result

    def __repr__(self):
        return f'<InspectionOrder {self.order_code}>'


class InspectionResult(BaseModel):
    """质检结果项模型"""
    __tablename__ = 'inspection_result'

    order_id = db.Column(db.BigInteger, db.ForeignKey('inspection_order.id'),
                        nullable=False, comment='质检单ID')
    item_id = db.Column(db.BigInteger, db.ForeignKey('inspection_template_item.id'),
                       comment='检测项ID')
    item_name = db.Column(db.String(100), nullable=False, comment='检测项名称')
    standard = db.Column(db.String(200), comment='标准值')
    lower_limit = db.Column(db.Numeric(12, 4), comment='下限值')
    upper_limit = db.Column(db.Numeric(12, 4), comment='上限值')
    unit = db.Column(db.String(20), comment='单位')
    actual_value = db.Column(db.String(100), comment='实际检测值')
    is_qualified = db.Column(db.SmallInteger, default=1, comment='是否合格: 0否/1是')
    sort_order = db.Column(db.Integer, default=0, comment='排序')

    def to_dict(self):
        result = super().to_dict()
        return result

    def __repr__(self):
        return f'<InspectionResult {self.item_name}>'


class DefectRecord(BaseModel):
    """不合格记录模型"""
    __tablename__ = 'defect_record'

    order_id = db.Column(db.BigInteger, db.ForeignKey('inspection_order.id'),
                        nullable=False, comment='质检单ID')
    defect_type = db.Column(db.String(50), comment='缺陷类型')
    severity = db.Column(db.Enum('minor', 'major', 'critical'), default='minor',
                        comment='严重程度: minor轻微/major严重/critical致命')
    disposition = db.Column(db.Enum('rework', 'scrap', 'concession'),
                           comment='处置建议: rework返工/scrap报废/concession让步接收')
    quantity = db.Column(db.Integer, default=1, comment='缺陷数量')
    description = db.Column(db.Text, comment='缺陷描述')
    remark = db.Column(db.Text, comment='备注')

    order_ref = db.relationship('InspectionOrder', backref='defect_records',
                               foreign_keys=[order_id])

    def to_dict(self):
        result = super().to_dict()
        if self.order_ref:
            result['order_code'] = self.order_ref.order_code
            result['product_name'] = self.order_ref.product_name
        return result

    def __repr__(self):
        return f'<DefectRecord {self.defect_type}>'
