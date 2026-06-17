"""
巡检管理模型
"""
from database.db import db
from models.base import BaseModel


class PatrolRoute(BaseModel):
    """巡检路线模型"""
    __tablename__ = 'patrol_route'

    route_code = db.Column(db.String(50), unique=True, nullable=False, comment='路线编号')
    route_name = db.Column(db.String(100), nullable=False, comment='路线名称')
    description = db.Column(db.Text, comment='路线描述')
    estimated_duration = db.Column(db.Integer, default=0, comment='预计时长(分钟)')
    status = db.Column(db.Enum('active', 'inactive'), default='active', comment='状态: active启用/inactive停用')

    checkpoints = db.relationship('PatrolCheckpoint', backref='route', lazy='dynamic',
                                  foreign_keys='PatrolCheckpoint.route_id',
                                  cascade='all, delete-orphan',
                                  order_by='PatrolCheckpoint.sort_order')

    def to_dict(self):
        result = super().to_dict()
        checkpoints = []
        for cp in self.checkpoints.order_by(PatrolCheckpoint.sort_order).all():
            cp_dict = cp.to_dict()
            cp_dict['items'] = [item.to_dict() for item in cp.items]
            checkpoints.append(cp_dict)
        result['checkpoints'] = checkpoints
        result['checkpoint_count'] = len(checkpoints)
        return result

    def __repr__(self):
        return f'<PatrolRoute {self.route_name}>'


class PatrolCheckpoint(BaseModel):
    """巡检检查点模型"""
    __tablename__ = 'patrol_checkpoint'

    route_id = db.Column(db.BigInteger, db.ForeignKey('patrol_route.id'), comment='所属路线ID')
    checkpoint_name = db.Column(db.String(100), nullable=False, comment='检查点名称')
    equipment_id = db.Column(db.BigInteger, comment='关联设备ID')
    location = db.Column(db.String(200), comment='位置描述')
    sort_order = db.Column(db.Integer, default=0, comment='排序序号')
    remark = db.Column(db.Text, comment='备注')

    items = db.relationship('PatrolItem', backref='checkpoint', lazy='dynamic',
                            foreign_keys='PatrolItem.checkpoint_id',
                            cascade='all, delete-orphan')

    def to_dict(self):
        result = super().to_dict()
        if self.equipment_id:
            from models.production import Equipment
            equipment = Equipment.get_by_id(self.equipment_id)
            if equipment:
                result['equipment_name'] = equipment.equipment_name
                result['equipment_code'] = equipment.equipment_code
        return result

    def __repr__(self):
        return f'<PatrolCheckpoint {self.checkpoint_name}>'


class PatrolItem(BaseModel):
    """巡检项模型"""
    __tablename__ = 'patrol_item'

    checkpoint_id = db.Column(db.BigInteger, db.ForeignKey('patrol_checkpoint.id'), comment='所属检查点ID')
    item_name = db.Column(db.String(100), nullable=False, comment='项目名')
    expected_value = db.Column(db.String(200), comment='期望值/标准')
    unit = db.Column(db.String(20), comment='单位')
    is_required = db.Column(db.SmallInteger, default=1, comment='是否必填: 0否/1是')
    item_type = db.Column(db.Enum('input', 'select', 'checkbox'), default='input', comment='录入类型')
    options = db.Column(db.Text, comment='选项值(JSON格式)')
    sort_order = db.Column(db.Integer, default=0, comment='排序序号')

    def to_dict(self):
        result = super().to_dict()
        return result

    def __repr__(self):
        return f'<PatrolItem {self.item_name}>'


class PatrolPlan(BaseModel):
    """巡检计划模型"""
    __tablename__ = 'patrol_plan'

    plan_code = db.Column(db.String(50), unique=True, nullable=False, comment='计划编号')
    plan_name = db.Column(db.String(100), nullable=False, comment='计划名称')
    route_id = db.Column(db.BigInteger, db.ForeignKey('patrol_route.id'), comment='巡检路线ID')
    person_in_charge = db.Column(db.String(50), comment='负责人')
    team = db.Column(db.String(100), comment='负责班组')
    frequency = db.Column(db.Enum('daily', 'weekly', 'monthly'), default='daily', comment='频率: daily每日/weekly每周/monthly每月')
    week_days = db.Column(db.String(20), comment='周几执行(1-7,逗号分隔)')
    month_days = db.Column(db.String(50), comment='每月几号执行(1-31,逗号分隔)')
    execute_time = db.Column(db.String(10), default='08:00', comment='执行时间(HH:MM)')
    start_date = db.Column(db.Date, comment='生效开始日期')
    end_date = db.Column(db.Date, comment='生效结束日期')
    status = db.Column(db.Enum('active', 'inactive', 'expired'), default='active', comment='状态: active启用/inactive停用/expired已过期')
    remark = db.Column(db.Text, comment='备注')

    def to_dict(self):
        result = super().to_dict()
        if self.route_id:
            route = PatrolRoute.get_by_id(self.route_id)
            if route:
                result['route_name'] = route.route_name
                result['route_code'] = route.route_code
        return result

    def __repr__(self):
        return f'<PatrolPlan {self.plan_name}>'


class PatrolTask(BaseModel):
    """巡检任务实例模型"""
    __tablename__ = 'patrol_task'

    task_code = db.Column(db.String(50), unique=True, nullable=False, comment='任务编号')
    plan_id = db.Column(db.BigInteger, db.ForeignKey('patrol_plan.id'), comment='所属计划ID')
    route_id = db.Column(db.BigInteger, db.ForeignKey('patrol_route.id'), comment='巡检路线ID')
    executor = db.Column(db.String(50), comment='执行人')
    status = db.Column(db.Enum('pending', 'in_progress', 'completed', 'overdue'), default='pending',
                       comment='状态: pending待执行/in_progress进行中/completed已完成/overdue已逾期')
    plan_date = db.Column(db.Date, comment='计划日期')
    due_time = db.Column(db.DateTime, comment='应完成时间')
    start_time = db.Column(db.DateTime, comment='实际开始时间')
    end_time = db.Column(db.DateTime, comment='实际完成时间')
    remark = db.Column(db.Text, comment='备注')

    results = db.relationship('PatrolResult', backref='task', lazy='dynamic',
                              foreign_keys='PatrolResult.task_id',
                              cascade='all, delete-orphan')

    def to_dict(self):
        result = super().to_dict()
        if self.route_id:
            route = PatrolRoute.get_by_id(self.route_id)
            if route:
                result['route_name'] = route.route_name
        if self.plan_id:
            plan = PatrolPlan.get_by_id(self.plan_id)
            if plan:
                result['plan_name'] = plan.plan_name
                result['frequency'] = plan.frequency
        result['result_count'] = self.results.count()
        return result

    def __repr__(self):
        return f'<PatrolTask {self.task_code}>'


class PatrolResult(BaseModel):
    """巡检结果模型"""
    __tablename__ = 'patrol_result'

    task_id = db.Column(db.BigInteger, db.ForeignKey('patrol_task.id'), comment='所属任务ID')
    checkpoint_id = db.Column(db.BigInteger, db.ForeignKey('patrol_checkpoint.id'), comment='检查点ID')
    item_id = db.Column(db.BigInteger, db.ForeignKey('patrol_item.id'), comment='巡检项ID')
    actual_value = db.Column(db.Text, comment='实际填写值')
    is_abnormal = db.Column(db.SmallInteger, default=0, comment='是否异常: 0否/1是')
    remark = db.Column(db.Text, comment='备注')
    images = db.Column(db.Text, comment='现场图片(base64列表,JSON格式)')

    def to_dict(self):
        result = super().to_dict()
        if self.checkpoint_id:
            cp = PatrolCheckpoint.get_by_id(self.checkpoint_id)
            if cp:
                result['checkpoint_name'] = cp.checkpoint_name
                result['equipment_id'] = cp.equipment_id
        if self.item_id:
            item = PatrolItem.get_by_id(self.item_id)
            if item:
                result['item_name'] = item.item_name
                result['expected_value'] = item.expected_value
                result['unit'] = item.unit
        return result

    def __repr__(self):
        return f'<PatrolResult task:{self.task_id} item:{self.item_id}>'
