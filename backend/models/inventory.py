"""
库存管理模型
"""
from database.db import db
from models.base import BaseModel


class Material(BaseModel):
    """物料档案模型"""
    __tablename__ = 'material'

    material_code = db.Column(db.String(50), unique=True, nullable=False, comment='物料编号')
    material_name = db.Column(db.String(100), nullable=False, comment='物料名称')
    specification = db.Column(db.String(200), comment='规格')
    unit = db.Column(db.String(20), comment='单位')
    category = db.Column(db.String(50), comment='所属类目')
    safety_stock = db.Column(db.Numeric(12, 2), default=0, comment='安全库存')
    current_stock = db.Column(db.Numeric(12, 2), default=0, comment='当前库存')
    status = db.Column(db.Enum('active', 'inactive'), default='active', comment='状态: active正常/inactive停用')

    stock_ins = db.relationship('StockIn', backref='material_ref', lazy='dynamic', foreign_keys='StockIn.material_id')
    stock_outs = db.relationship('StockOut', backref='material_ref', lazy='dynamic', foreign_keys='StockOut.material_id')
    stock_flows = db.relationship('StockFlow', backref='material_ref', lazy='dynamic', foreign_keys='StockFlow.material_id')

    def to_dict(self):
        result = super().to_dict()
        result['is_low_stock'] = float(self.current_stock) < float(self.safety_stock)
        return result

    def __repr__(self):
        return f'<Material {self.material_name}>'


class StockIn(BaseModel):
    """入库单模型"""
    __tablename__ = 'stock_in'

    order_code = db.Column(db.String(50), unique=True, nullable=False, comment='入库单号')
    source = db.Column(db.String(100), comment='来源')
    material_id = db.Column(db.BigInteger, db.ForeignKey('material.id'), comment='物料ID')
    batch_no = db.Column(db.String(50), comment='批次号')
    quantity = db.Column(db.Numeric(12, 2), nullable=False, comment='入库数量')
    operator = db.Column(db.String(50), comment='操作人')
    in_time = db.Column(db.DateTime, comment='入库时间')
    remark = db.Column(db.Text, comment='备注')

    def to_dict(self):
        result = super().to_dict()
        if self.material_ref:
            result['material_code'] = self.material_ref.material_code
            result['material_name'] = self.material_ref.material_name
            result['specification'] = self.material_ref.specification
            result['unit'] = self.material_ref.unit
        return result

    def __repr__(self):
        return f'<StockIn {self.order_code}>'


class StockOut(BaseModel):
    """出库单模型"""
    __tablename__ = 'stock_out'

    order_code = db.Column(db.String(50), unique=True, nullable=False, comment='出库单号')
    department = db.Column(db.String(100), comment='领用部门/任务')
    material_id = db.Column(db.BigInteger, db.ForeignKey('material.id'), comment='物料ID')
    batch_no = db.Column(db.String(50), comment='批次号')
    quantity = db.Column(db.Numeric(12, 2), nullable=False, comment='出库数量')
    operator = db.Column(db.String(50), comment='操作人')
    out_time = db.Column(db.DateTime, comment='出库时间')
    purpose = db.Column(db.Text, comment='用途')

    def to_dict(self):
        result = super().to_dict()
        if self.material_ref:
            result['material_code'] = self.material_ref.material_code
            result['material_name'] = self.material_ref.material_name
            result['specification'] = self.material_ref.specification
            result['unit'] = self.material_ref.unit
        return result

    def __repr__(self):
        return f'<StockOut {self.order_code}>'


class StockFlow(BaseModel):
    """库存流水表模型"""
    __tablename__ = 'stock_flow'

    flow_code = db.Column(db.String(50), unique=True, nullable=False, comment='流水号')
    flow_type = db.Column(db.Enum('in', 'out'), comment='流水类型: in入库/out出库')
    material_id = db.Column(db.BigInteger, db.ForeignKey('material.id'), comment='物料ID')
    batch_no = db.Column(db.String(50), comment='批次号')
    quantity = db.Column(db.Numeric(12, 2), nullable=False, comment='变动数量')
    stock_before = db.Column(db.Numeric(12, 2), comment='变动前库存')
    stock_after = db.Column(db.Numeric(12, 2), comment='变动后库存')
    operator = db.Column(db.String(50), comment='操作人')
    operate_time = db.Column(db.DateTime, comment='操作时间')
    related_order = db.Column(db.String(50), comment='关联单据号')
    remark = db.Column(db.Text, comment='备注')

    def to_dict(self):
        result = super().to_dict()
        if self.material_ref:
            result['material_code'] = self.material_ref.material_code
            result['material_name'] = self.material_ref.material_name
            result['specification'] = self.material_ref.specification
            result['unit'] = self.material_ref.unit
        return result

    def __repr__(self):
        return f'<StockFlow {self.flow_code}>'
