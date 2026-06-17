"""
组织架构模型
"""
from database.db import db
from models.base import BaseModel


group_employee = db.Table(
    't_group_employee',
    db.Column('group_id', db.BigInteger, db.ForeignKey('t_permission_group.id'), primary_key=True, comment='权限分组ID'),
    db.Column('employee_id', db.BigInteger, db.ForeignKey('t_employee.id'), primary_key=True, comment='员工ID'),
    comment='权限分组-员工关联表'
)


group_permission = db.Table(
    't_group_permission',
    db.Column('group_id', db.BigInteger, db.ForeignKey('t_permission_group.id'), primary_key=True, comment='权限分组ID'),
    db.Column('permission_id', db.BigInteger, db.ForeignKey('t_permission.id'), primary_key=True, comment='权限ID'),
    comment='权限分组-权限点关联表'
)


class Department(BaseModel):
    """部门模型"""
    __tablename__ = 't_department'

    dept_code = db.Column(db.String(50), unique=True, nullable=False, comment='部门编码')
    dept_name = db.Column(db.String(100), nullable=False, comment='部门名称')
    parent_id = db.Column(db.BigInteger, default=0, comment='父部门ID')
    leader_id = db.Column(db.BigInteger, db.ForeignKey('t_employee.id'), comment='部门负责人ID')
    sort_order = db.Column(db.Integer, default=0, comment='排序')
    description = db.Column(db.String(500), comment='部门描述')

    leader = db.relationship('Employee', foreign_keys=[leader_id], lazy='joined')

    @staticmethod
    def get_tree():
        """获取部门树"""
        departments = Department.query.filter(
            Department.status == 1
        ).order_by(Department.sort_order).all()

        dept_dict = {d.id: d.to_dict() for d in departments}
        tree = []

        for dept in departments:
            dept_dict[dept.id]['member_count'] = Employee.query.filter(
                Employee.department_id == dept.id,
                Employee.employee_status == 'active',
                Employee.status == 1
            ).count()

            if dept.parent_id == 0:
                dept_dict[dept.id]['children'] = []
                tree.append(dept_dict[dept.id])
            else:
                parent = dept_dict.get(dept.parent_id)
                if parent:
                    if 'children' not in parent:
                        parent['children'] = []
                    parent['children'].append(dept_dict[dept.id])

        return tree

    def to_dict(self):
        result = super().to_dict()
        if self.leader:
            result['leader_name'] = self.leader.name
            result['leader_code'] = self.leader.employee_code
        return result

    def __repr__(self):
        return f'<Department {self.dept_name}>'


class Position(BaseModel):
    """岗位模型"""
    __tablename__ = 't_position'

    position_code = db.Column(db.String(50), unique=True, nullable=False, comment='岗位编码')
    position_name = db.Column(db.String(100), nullable=False, comment='岗位名称')
    category = db.Column(db.String(50), comment='所属类别')
    description = db.Column(db.String(500), comment='岗位描述')

    def __repr__(self):
        return f'<Position {self.position_name}>'


class Permission(BaseModel):
    """功能权限点模型"""
    __tablename__ = 't_permission'

    permission_code = db.Column(db.String(100), unique=True, nullable=False, comment='权限编码')
    permission_name = db.Column(db.String(100), nullable=False, comment='权限名称')
    permission_type = db.Column(db.String(20), default='menu', comment='权限类型: menu/button/api')
    parent_id = db.Column(db.BigInteger, default=0, comment='父权限ID')
    sort_order = db.Column(db.Integer, default=0, comment='排序')
    description = db.Column(db.String(500), comment='权限描述')

    @staticmethod
    def get_tree():
        """获取权限树"""
        permissions = Permission.query.filter(
            Permission.status == 1
        ).order_by(Permission.sort_order).all()

        perm_dict = {p.id: p.to_dict() for p in permissions}
        tree = []

        for perm in permissions:
            if perm.parent_id == 0:
                perm_dict[perm.id]['children'] = []
                tree.append(perm_dict[perm.id])
            else:
                parent = perm_dict.get(perm.parent_id)
                if parent:
                    if 'children' not in parent:
                        parent['children'] = []
                    parent['children'].append(perm_dict[perm.id])

        return tree

    def __repr__(self):
        return f'<Permission {self.permission_name}>'


class PermissionGroup(BaseModel):
    """权限分组模型"""
    __tablename__ = 't_permission_group'

    group_name = db.Column(db.String(100), nullable=False, comment='分组名称')
    description = db.Column(db.String(500), comment='分组描述')

    members = db.relationship(
        'Employee',
        secondary=group_employee,
        lazy='dynamic',
        backref=db.backref('permission_groups', lazy='dynamic')
    )

    permissions = db.relationship(
        'Permission',
        secondary=group_permission,
        lazy='dynamic',
        backref=db.backref('permission_groups', lazy='dynamic')
    )

    def to_dict(self):
        result = super().to_dict()
        result['member_ids'] = [m.id for m in self.members.filter(Employee.status == 1).all()]
        result['permission_ids'] = [p.id for p in self.permissions.filter(Permission.status == 1).all()]
        return result

    def __repr__(self):
        return f'<PermissionGroup {self.group_name}>'


class Employee(BaseModel):
    """员工档案模型"""
    __tablename__ = 't_employee'

    employee_code = db.Column(db.String(50), unique=True, nullable=False, comment='工号')
    name = db.Column(db.String(50), nullable=False, comment='姓名')
    gender = db.Column(db.Enum('male', 'female', 'other'), default='male', comment='性别: male男/female女/other其他')
    phone = db.Column(db.String(20), comment='联系电话')
    email = db.Column(db.String(100), comment='邮箱')
    department_id = db.Column(db.BigInteger, db.ForeignKey('t_department.id'), comment='所属部门ID')
    position_id = db.Column(db.BigInteger, db.ForeignKey('t_position.id'), comment='岗位ID')
    hire_date = db.Column(db.Date, comment='入职日期')
    employee_status = db.Column(
        db.Enum('active', 'inactive'),
        default='active',
        comment='员工状态: active在职/inactive离职'
    )
    user_id = db.Column(db.BigInteger, db.ForeignKey('t_user.id'), comment='绑定的登录账号ID')

    department = db.relationship('Department', foreign_keys=[department_id], lazy='joined')
    position = db.relationship('Position', foreign_keys=[position_id], lazy='joined')
    user = db.relationship('User', foreign_keys=[user_id], lazy='joined')

    def to_dict(self):
        result = super().to_dict()
        if self.department:
            result['department_name'] = self.department.dept_name
            result['department_code'] = self.department.dept_code
        if self.position:
            result['position_name'] = self.position.position_name
            result['position_code'] = self.position.position_code
        if self.user:
            result['username'] = self.user.username
        return result

    def to_simple_dict(self):
        """简化字典（用于下拉选择等）"""
        return {
            'id': self.id,
            'employee_code': self.employee_code,
            'name': self.name,
            'department_id': self.department_id,
            'department_name': self.department.dept_name if self.department else None,
            'employee_status': self.employee_status
        }

    def __repr__(self):
        return f'<Employee {self.name}>'
