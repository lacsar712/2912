"""
能源管理模型
"""
from database.db import db
from models.base import BaseModel


class EnergyType(BaseModel):
    """能源类型字典模型"""
    __tablename__ = 'energy_type'

    type_code = db.Column(db.String(50), unique=True, nullable=False, comment='能源类型编码')
    type_name = db.Column(db.String(100), nullable=False, comment='能源类型名称')
    unit = db.Column(db.String(20), comment='计量单位')
    description = db.Column(db.Text, comment='描述')
    status = db.Column(db.SmallInteger, default=1, comment='状态: 0停用/1正常')

    metering_points = db.relationship('MeteringPoint', backref='energy_type_ref', lazy='dynamic')

    def to_dict(self):
        result = super().to_dict()
        result['metering_point_count'] = self.metering_points.filter_by(status=1).count()
        return result

    def __repr__(self):
        return f'<EnergyType {self.type_name}>'


class MeteringPoint(BaseModel):
    """计量点模型"""
    __tablename__ = 'metering_point'

    point_code = db.Column(db.String(50), unique=True, nullable=False, comment='计量点编号')
    point_name = db.Column(db.String(100), nullable=False, comment='计量点名称')
    energy_type_id = db.Column(db.BigInteger, db.ForeignKey('energy_type.id'), comment='能源类型ID')
    production_line_id = db.Column(db.BigInteger, db.ForeignKey('production_line.id'), comment='关联生产线ID')
    workshop = db.Column(db.String(100), comment='车间')
    location = db.Column(db.String(200), comment='安装位置')
    status = db.Column(db.SmallInteger, default=1, comment='状态: 0停用/1正常')

    readings = db.relationship('MeterReading', backref='metering_point_ref', lazy='dynamic')

    def to_dict(self):
        result = super().to_dict()
        if self.energy_type_ref:
            result['energy_type_name'] = self.energy_type_ref.type_name
            result['energy_type_code'] = self.energy_type_ref.type_code
            result['energy_unit'] = self.energy_type_ref.unit
        if self.production_line:
            result['production_line_name'] = self.production_line.line_name
        return result

    def __repr__(self):
        return f'<MeteringPoint {self.point_name}>'


class MeterReading(BaseModel):
    """计量读数模型"""
    __tablename__ = 'meter_reading'

    metering_point_id = db.Column(db.BigInteger, db.ForeignKey('metering_point.id'), nullable=False, comment='计量点ID')
    reading_time = db.Column(db.DateTime, nullable=False, comment='读数时间')
    cumulative_value = db.Column(db.Numeric(14, 4), nullable=False, comment='累计读数值')
    delta_value = db.Column(db.Numeric(14, 4), default=0, comment='本次差值')
    recorder = db.Column(db.String(50), comment='录入人')

    def to_dict(self):
        result = super().to_dict()
        if self.metering_point_ref:
            result['point_code'] = self.metering_point_ref.point_code
            result['point_name'] = self.metering_point_ref.point_name
            if self.metering_point_ref.energy_type_ref:
                result['energy_type_name'] = self.metering_point_ref.energy_type_ref.type_name
                result['energy_unit'] = self.metering_point_ref.energy_type_ref.unit
            if self.metering_point_ref.production_line:
                result['production_line_name'] = self.metering_point_ref.production_line.line_name
            result['workshop'] = self.metering_point_ref.workshop
        return result

    def __repr__(self):
        return f'<MeterReading {self.id}>'


class EnergyPrice(BaseModel):
    """能源单价表模型"""
    __tablename__ = 'energy_price'

    energy_type_id = db.Column(db.BigInteger, db.ForeignKey('energy_type.id'), nullable=False, comment='能源类型ID')
    period = db.Column(db.Enum('peak', 'flat', 'valley'), nullable=False, comment='时段: peak峰/flat平/valley谷')
    start_time = db.Column(db.String(5), comment='时段开始时间 HH:MM')
    end_time = db.Column(db.String(5), comment='时段结束时间 HH:MM')
    price = db.Column(db.Numeric(10, 4), nullable=False, comment='单价(元/单位)')
    status = db.Column(db.SmallInteger, default=1, comment='状态: 0停用/1正常')

    def to_dict(self):
        result = super().to_dict()
        if self.energy_type_ref:
            result['energy_type_name'] = self.energy_type_ref.type_name
            result['energy_type_code'] = self.energy_type_ref.type_code
            result['energy_unit'] = self.energy_type_ref.unit
        period_map = {'peak': '峰', 'flat': '平', 'valley': '谷'}
        result['period_label'] = period_map.get(self.period, self.period)
        return result

    def __repr__(self):
        return f'<EnergyPrice {self.id}>'


class MonthlyCostSummary(BaseModel):
    """按月成本汇总模型"""
    __tablename__ = 'monthly_cost_summary'

    metering_point_id = db.Column(db.BigInteger, db.ForeignKey('metering_point.id'), nullable=False, comment='计量点ID')
    year_month = db.Column(db.String(7), nullable=False, comment='年月 YYYY-MM')
    energy_type_id = db.Column(db.BigInteger, db.ForeignKey('energy_type.id'), nullable=False, comment='能源类型ID')
    total_consumption = db.Column(db.Numeric(14, 4), default=0, comment='总消耗量')
    peak_consumption = db.Column(db.Numeric(14, 4), default=0, comment='峰时段消耗')
    flat_consumption = db.Column(db.Numeric(14, 4), default=0, comment='平时段消耗')
    valley_consumption = db.Column(db.Numeric(14, 4), default=0, comment='谷时段消耗')
    peak_cost = db.Column(db.Numeric(12, 2), default=0, comment='峰时段费用')
    flat_cost = db.Column(db.Numeric(12, 2), default=0, comment='平时段费用')
    valley_cost = db.Column(db.Numeric(12, 2), default=0, comment='谷时段费用')
    total_cost = db.Column(db.Numeric(12, 2), default=0, comment='总费用')

    def to_dict(self):
        result = super().to_dict()
        if self.metering_point_ref:
            result['point_code'] = self.metering_point_ref.point_code
            result['point_name'] = self.metering_point_ref.point_name
            result['workshop'] = self.metering_point_ref.workshop
            if self.metering_point_ref.production_line:
                result['production_line_name'] = self.metering_point_ref.production_line.line_name
        if self.energy_type_ref:
            result['energy_type_name'] = self.energy_type_ref.type_name
            result['energy_unit'] = self.energy_type_ref.unit
        return result

    def __repr__(self):
        return f'<MonthlyCostSummary {self.year_month}>'
