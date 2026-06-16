"""
工艺参数模板模型
"""
from database.db import db
from models.base import BaseModel


class ProcessTemplate(BaseModel):
    """工艺参数模板模型"""
    __tablename__ = 'process_template'

    template_code = db.Column(db.String(50), unique=True, nullable=False, comment='模板编号')
    template_name = db.Column(db.String(100), nullable=False, comment='模板名称')
    product_name = db.Column(db.String(100), comment='关联产品')
    process_step = db.Column(db.String(100), comment='关联工序')
    version = db.Column(db.String(20), default='1.0', comment='版本号')
    status = db.Column(db.Enum('draft', 'pending', 'active', 'archived'), default='draft',
                       comment='状态: draft草稿/pending待审/active启用/archived归档')
    creator = db.Column(db.String(50), comment='创建人')
    auditor = db.Column(db.String(50), comment='审核人')
    audit_time = db.Column(db.DateTime, comment='审核时间')
    remark = db.Column(db.Text, comment='备注')

    params = db.relationship('ProcessTemplateParam', backref='template',
                            lazy='dynamic', cascade='all, delete-orphan',
                            foreign_keys='ProcessTemplateParam.template_id')
    audit_records = db.relationship('ProcessAuditRecord', backref='template',
                                   lazy='dynamic', cascade='all, delete-orphan',
                                   foreign_keys='ProcessAuditRecord.template_id')
    deploy_records = db.relationship('ProcessDeployRecord', backref='template',
                                    lazy='dynamic', cascade='all, delete-orphan',
                                    foreign_keys='ProcessDeployRecord.template_id')

    def to_dict(self):
        result = super().to_dict()
        result['params'] = [p.to_dict() for p in self.params.all()]
        return result

    def to_dict_simple(self):
        result = super().to_dict()
        result['param_count'] = self.params.count()
        return result

    def __repr__(self):
        return f'<ProcessTemplate {self.template_name}>'


class ProcessTemplateParam(BaseModel):
    """工艺模板参数项模型"""
    __tablename__ = 'process_template_param'

    template_id = db.Column(db.BigInteger, db.ForeignKey('process_template.id'),
                           nullable=False, comment='模板ID')
    param_name = db.Column(db.String(50), nullable=False, comment='参数名称')
    param_value = db.Column(db.Numeric(12, 4), comment='参数值')
    unit = db.Column(db.String(20), comment='单位')
    min_value = db.Column(db.Numeric(12, 4), comment='最小值')
    max_value = db.Column(db.Numeric(12, 4), comment='最大值')
    sort_order = db.Column(db.Integer, default=0, comment='排序')

    def to_dict(self):
        result = super().to_dict()
        return result

    def __repr__(self):
        return f'<ProcessTemplateParam {self.param_name}>'


class ProcessAuditRecord(BaseModel):
    """工艺模板审核记录模型"""
    __tablename__ = 'process_audit_record'

    template_id = db.Column(db.BigInteger, db.ForeignKey('process_template.id'),
                           nullable=False, comment='模板ID')
    action = db.Column(db.Enum('submit', 'pass', 'reject'), comment='操作: submit提交/pass通过/reject驳回')
    operator = db.Column(db.String(50), comment='操作人')
    operate_time = db.Column(db.DateTime, comment='操作时间')
    comment = db.Column(db.Text, comment='审核意见')

    def to_dict(self):
        result = super().to_dict()
        return result

    def __repr__(self):
        return f'<ProcessAuditRecord {self.action}>'


class ProcessDeployRecord(BaseModel):
    """工艺模板下发记录模型"""
    __tablename__ = 'process_deploy_record'

    template_id = db.Column(db.BigInteger, db.ForeignKey('process_template.id'),
                           nullable=False, comment='模板ID')
    template_name = db.Column(db.String(100), comment='模板名称')
    template_version = db.Column(db.String(20), comment='模板版本')
    equipment_id = db.Column(db.BigInteger, comment='目标设备ID')
    equipment_code = db.Column(db.String(50), comment='目标设备编号')
    equipment_name = db.Column(db.String(100), comment='目标设备名称')
    deployer = db.Column(db.String(50), comment='下发人')
    deploy_time = db.Column(db.DateTime, comment='下发时间')
    result = db.Column(db.Enum('success', 'failed', 'partial'), comment='下发结果: success成功/failed失败/partial部分成功')
    error_msg = db.Column(db.Text, comment='错误信息')

    def to_dict(self):
        result = super().to_dict()
        return result

    def __repr__(self):
        return f'<ProcessDeployRecord {self.id}>'
