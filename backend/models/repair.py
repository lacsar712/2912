"""
维修工单模型
"""
import json
from database.db import db
from models.base import BaseModel


class RepairOrder(BaseModel):
    """报修单模型"""
    __tablename__ = 'repair_order'

    order_code = db.Column(db.String(50), unique=True, nullable=False, comment='工单编号')
    equipment_id = db.Column(db.BigInteger, db.ForeignKey('equipment.id'), nullable=False, comment='设备ID')
    reporter = db.Column(db.String(50), nullable=False, comment='报修人')
    fault_description = db.Column(db.Text, nullable=False, comment='故障描述')
    severity = db.Column(db.Enum('low', 'medium', 'high', 'critical'), default='medium', comment='严重程度')
    attachment_images = db.Column(db.Text, comment='附件图片base64数组(JSON)')
    status = db.Column(
        db.Enum('pending', 'dispatched', 'repairing', 'repaired', 'accepted', 'closed'),
        default='pending',
        comment='状态: pending待派工/dispatched已派工/repairing维修中/repaired已修复/accepted已验收/closed已关闭'
    )
    alert_id = db.Column(db.BigInteger, comment='关联告警ID')
    remark = db.Column(db.Text, comment='备注')

    dispatches = db.relationship('RepairDispatch', backref='repair_order', lazy='dynamic',
                                 foreign_keys='RepairDispatch.order_id', cascade='all, delete-orphan')
    processes = db.relationship('RepairProcess', backref='repair_order', lazy='dynamic',
                                foreign_keys='RepairProcess.order_id', cascade='all, delete-orphan')
    acceptances = db.relationship('RepairAcceptance', backref='repair_order', lazy='dynamic',
                                  foreign_keys='RepairAcceptance.order_id', cascade='all, delete-orphan')

    def to_dict(self):
        result = super().to_dict()
        if self.attachment_images:
            try:
                result['attachment_images'] = json.loads(self.attachment_images)
            except Exception:
                result['attachment_images'] = []
        else:
            result['attachment_images'] = []

        try:
            from models.production import Equipment
            equipment = Equipment.get_by_id(self.equipment_id)
            if equipment:
                result['equipment_name'] = equipment.equipment_name
                result['equipment_code'] = equipment.equipment_code
        except Exception:
            pass

        try:
            dispatch_list = self.dispatches.all()
            if dispatch_list:
                result['latest_dispatch'] = dispatch_list[-1].to_dict()
        except Exception:
            pass

        try:
            process_list = self.processes.all()
            result['process_count'] = len(process_list)
            result['total_minutes'] = sum(int(p.minutes_spent or 0) for p in process_list)
        except Exception:
            result['process_count'] = 0
            result['total_minutes'] = 0

        try:
            acceptance_list = self.acceptances.all()
            if acceptance_list:
                result['latest_acceptance'] = acceptance_list[-1].to_dict()
        except Exception:
            pass

        return result


class RepairDispatch(BaseModel):
    """派工记录模型"""
    __tablename__ = 'repair_dispatch'

    order_id = db.Column(db.BigInteger, db.ForeignKey('repair_order.id'), nullable=False, comment='工单ID')
    repairer = db.Column(db.String(50), nullable=False, comment='维修人')
    planned_start_time = db.Column(db.DateTime, comment='计划开始时间')
    planned_end_time = db.Column(db.DateTime, comment='计划完成时间')
    dispatcher = db.Column(db.String(50), comment='派工人')
    remark = db.Column(db.Text, comment='派工备注')

    def to_dict(self):
        return super().to_dict()


class RepairProcess(BaseModel):
    """维修过程记录模型"""
    __tablename__ = 'repair_process'

    order_id = db.Column(db.BigInteger, db.ForeignKey('repair_order.id'), nullable=False, comment='工单ID')
    step_description = db.Column(db.Text, nullable=False, comment='步骤描述')
    materials_used = db.Column(db.Text, comment='使用耗材(JSON)')
    minutes_spent = db.Column(db.Integer, default=0, comment='耗时分钟')
    recorder = db.Column(db.String(50), comment='记录人')
    remark = db.Column(db.Text, comment='备注')

    def to_dict(self):
        result = super().to_dict()
        if self.materials_used:
            try:
                result['materials_used'] = json.loads(self.materials_used)
            except Exception:
                result['materials_used'] = []
        else:
            result['materials_used'] = []
        return result


class RepairAcceptance(BaseModel):
    """验收记录模型"""
    __tablename__ = 'repair_acceptance'

    order_id = db.Column(db.BigInteger, db.ForeignKey('repair_order.id'), nullable=False, comment='工单ID')
    acceptor = db.Column(db.String(50), nullable=False, comment='验收人')
    is_passed = db.Column(db.Boolean, default=False, comment='是否合格')
    remark = db.Column(db.Text, comment='验收备注')
