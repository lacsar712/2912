"""
组织架构管理服务
"""
from datetime import datetime
from database.db import db
from models.organization import Department, Position, Employee, PermissionGroup, Permission
from models.user import User
from utils.response import Response
from utils.validator import Validator


class DepartmentService:
    """部门服务类"""

    @staticmethod
    def get_all():
        """获取所有部门"""
        departments = Department.get_all()
        return Response.success([d.to_dict() for d in departments])

    @staticmethod
    def get_tree():
        """获取部门树"""
        tree = Department.get_tree()
        return Response.success(tree)

    @staticmethod
    def get_by_id(dept_id):
        """根据ID获取部门"""
        dept = Department.get_by_id(dept_id)
        if not dept:
            return Response.not_found('部门不存在')
        return Response.success(dept.to_dict())

    @staticmethod
    def create(data):
        """创建部门"""
        validation = Validator.validate_form(data, {
            'dept_code': ['required'],
            'dept_name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Department.query.filter_by(dept_code=data['dept_code']).first():
            return Response.error('部门编码已存在', 409)

        dept = Department(
            dept_code=data['dept_code'],
            dept_name=data['dept_name'],
            parent_id=data.get('parent_id', 0),
            leader_id=data.get('leader_id'),
            sort_order=data.get('sort_order', 0),
            description=data.get('description')
        )
        dept.save()

        return Response.created(dept.to_dict())

    @staticmethod
    def update(dept_id, data):
        """更新部门"""
        dept = Department.get_by_id(dept_id)
        if not dept:
            return Response.not_found('部门不存在')

        if data.get('dept_code') and data['dept_code'] != dept.dept_code:
            if Department.query.filter_by(dept_code=data['dept_code']).first():
                return Response.error('部门编码已存在', 409)
            dept.dept_code = data['dept_code']

        if data.get('dept_name'):
            dept.dept_name = data['dept_name']
        if 'parent_id' in data:
            dept.parent_id = data['parent_id']
        if 'leader_id' in data:
            dept.leader_id = data['leader_id']
        if 'sort_order' in data:
            dept.sort_order = data['sort_order']
        if 'description' in data:
            dept.description = data['description']

        dept.save()
        return Response.success(dept.to_dict())

    @staticmethod
    def move(dept_id, new_parent_id):
        """移动部门（调整父子层级）"""
        dept = Department.get_by_id(dept_id)
        if not dept:
            return Response.not_found('部门不存在')

        if new_parent_id != 0:
            new_parent = Department.get_by_id(new_parent_id)
            if not new_parent:
                return Response.not_found('目标父部门不存在')
            
            def get_descendants(parent_id):
                descendants = set()
                children = Department.query.filter_by(parent_id=parent_id, status=1).all()
                for child in children:
                    descendants.add(child.id)
                    descendants.update(get_descendants(child.id))
                return descendants
            
            if new_parent_id in get_descendants(dept_id):
                return Response.error('不能将部门移动到其子部门下', 400)

        dept.parent_id = new_parent_id
        dept.save()
        return Response.success(dept.to_dict())

    @staticmethod
    def delete(dept_id):
        """删除部门"""
        dept = Department.get_by_id(dept_id)
        if not dept:
            return Response.not_found('部门不存在')

        child_count = Department.query.filter_by(parent_id=dept_id, status=1).count()
        if child_count > 0:
            return Response.error('该部门下有子部门，无法删除', 400)

        employee_count = Employee.query.filter_by(
            department_id=dept_id,
            employee_status='active',
            status=1
        ).count()
        if employee_count > 0:
            return Response.error('该部门下有在职员工，无法删除', 400)

        dept.delete()
        return Response.success({'message': '删除成功'})


class PositionService:
    """岗位服务类"""

    @staticmethod
    def get_page(page=1, size=10, keyword=None, category=None):
        """分页获取岗位列表"""
        query = Position.query

        if keyword:
            query = query.filter(
                (Position.position_code.like(f'%{keyword}%')) |
                (Position.position_name.like(f'%{keyword}%'))
            )
        if category:
            query = query.filter(Position.category == category)

        pagination = query.order_by(Position.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [p.to_dict() for p in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_all():
        """获取所有岗位（用于下拉选择）"""
        positions = Position.get_all()
        return Response.success([p.to_dict() for p in positions])

    @staticmethod
    def get_categories():
        """获取所有岗位类别"""
        categories = db.session.query(
            Position.category
        ).filter(
            Position.status == 1,
            Position.category.isnot(None)
        ).distinct().all()
        return Response.success([c[0] for c in categories if c[0]])

    @staticmethod
    def get_by_id(position_id):
        """根据ID获取岗位"""
        position = Position.get_by_id(position_id)
        if not position:
            return Response.not_found('岗位不存在')
        return Response.success(position.to_dict())

    @staticmethod
    def create(data):
        """创建岗位"""
        validation = Validator.validate_form(data, {
            'position_code': ['required'],
            'position_name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Position.query.filter_by(position_code=data['position_code']).first():
            return Response.error('岗位编码已存在', 409)

        position = Position(
            position_code=data['position_code'],
            position_name=data['position_name'],
            category=data.get('category'),
            description=data.get('description')
        )
        position.save()

        return Response.created(position.to_dict())

    @staticmethod
    def update(position_id, data):
        """更新岗位"""
        position = Position.get_by_id(position_id)
        if not position:
            return Response.not_found('岗位不存在')

        if data.get('position_code') and data['position_code'] != position.position_code:
            if Position.query.filter_by(position_code=data['position_code']).first():
                return Response.error('岗位编码已存在', 409)
            position.position_code = data['position_code']

        if data.get('position_name'):
            position.position_name = data['position_name']
        if 'category' in data:
            position.category = data['category']
        if 'description' in data:
            position.description = data['description']

        position.save()
        return Response.success(position.to_dict())

    @staticmethod
    def delete(position_id):
        """删除岗位"""
        position = Position.get_by_id(position_id)
        if not position:
            return Response.not_found('岗位不存在')

        employee_count = Employee.query.filter_by(
            position_id=position_id,
            status=1
        ).count()
        if employee_count > 0:
            return Response.error('该岗位下有员工，无法删除', 400)

        position.delete()
        return Response.success({'message': '删除成功'})


class EmployeeService:
    """员工服务类"""

    @staticmethod
    def get_page(page=1, size=10, keyword=None, department_id=None, position_id=None, employee_status=None):
        """分页获取员工列表"""
        query = Employee.query.filter(Employee.status == 1)

        if keyword:
            query = query.filter(
                (Employee.employee_code.like(f'%{keyword}%')) |
                (Employee.name.like(f'%{keyword}%')) |
                (Employee.phone.like(f'%{keyword}%')) |
                (Employee.email.like(f'%{keyword}%'))
            )
        if department_id:
            query = query.filter(Employee.department_id == department_id)
        if position_id:
            query = query.filter(Employee.position_id == position_id)
        if employee_status:
            query = query.filter(Employee.employee_status == employee_status)

        pagination = query.order_by(Employee.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [e.to_dict() for e in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_all_simple():
        """获取所有员工简化信息（用于下拉选择）"""
        employees = Employee.query.filter(
            Employee.status == 1,
            Employee.employee_status == 'active'
        ).order_by(Employee.name).all()
        return Response.success([e.to_simple_dict() for e in employees])

    @staticmethod
    def get_by_id(employee_id):
        """根据ID获取员工详情"""
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return Response.not_found('员工不存在')
        return Response.success(employee.to_dict())

    @staticmethod
    def create(data):
        """创建员工"""
        validation = Validator.validate_form(data, {
            'employee_code': ['required'],
            'name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Employee.query.filter_by(employee_code=data['employee_code']).first():
            return Response.error('工号已存在', 409)

        hire_date = None
        if data.get('hire_date'):
            try:
                hire_date = datetime.strptime(data['hire_date'], '%Y-%m-%d').date()
            except ValueError:
                return Response.bad_request('入职日期格式错误，请使用 YYYY-MM-DD')

        employee = Employee(
            employee_code=data['employee_code'],
            name=data['name'],
            gender=data.get('gender', 'male'),
            phone=data.get('phone'),
            email=data.get('email'),
            department_id=data.get('department_id'),
            position_id=data.get('position_id'),
            hire_date=hire_date,
            employee_status=data.get('employee_status', 'active')
        )
        employee.save()

        return Response.created(employee.to_dict())

    @staticmethod
    def update(employee_id, data):
        """更新员工"""
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return Response.not_found('员工不存在')

        if data.get('employee_code') and data['employee_code'] != employee.employee_code:
            if Employee.query.filter_by(employee_code=data['employee_code']).first():
                return Response.error('工号已存在', 409)
            employee.employee_code = data['employee_code']

        if data.get('name'):
            employee.name = data['name']
        if data.get('gender'):
            employee.gender = data['gender']
        if 'phone' in data:
            employee.phone = data['phone']
        if 'email' in data:
            employee.email = data['email']
        if 'department_id' in data:
            employee.department_id = data['department_id']
        if 'position_id' in data:
            employee.position_id = data['position_id']
        if data.get('hire_date'):
            try:
                employee.hire_date = datetime.strptime(data['hire_date'], '%Y-%m-%d').date()
            except ValueError:
                return Response.bad_request('入职日期格式错误，请使用 YYYY-MM-DD')
        if data.get('employee_status'):
            employee.employee_status = data['employee_status']

        employee.save()
        return Response.success(employee.to_dict())

    @staticmethod
    def delete(employee_id):
        """删除员工"""
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return Response.not_found('员工不存在')

        employee.delete()
        return Response.success({'message': '删除成功'})

    @staticmethod
    def bind_user(employee_id, user_id):
        """绑定员工与登录账号"""
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return Response.not_found('员工不存在')

        user = User.get_by_id(user_id)
        if not user:
            return Response.not_found('用户不存在')

        existing = Employee.query.filter_by(user_id=user_id, status=1).first()
        if existing and existing.id != employee_id:
            return Response.error('该账号已绑定其他员工', 409)

        employee.user_id = user_id
        employee.save()
        return Response.success(employee.to_dict())

    @staticmethod
    def unbind_user(employee_id):
        """解绑员工与登录账号"""
        employee = Employee.get_by_id(employee_id)
        if not employee:
            return Response.not_found('员工不存在')

        employee.user_id = None
        employee.save()
        return Response.success(employee.to_dict())

    @staticmethod
    def get_unbound_users():
        """获取未绑定的用户列表"""
        bound_user_ids = db.session.query(Employee.user_id).filter(
            Employee.user_id.isnot(None),
            Employee.status == 1
        ).all()
        bound_ids = [uid[0] for uid in bound_user_ids if uid[0]]

        users = User.query.filter(
            User.status == 1,
            ~User.id.in_(bound_ids) if bound_ids else True
        ).all()
        return Response.success([u.to_simple_dict() for u in users])

    @staticmethod
    def get_employee_user_binding():
        """获取员工-用户绑定关系列表"""
        employees = Employee.query.filter(
            Employee.status == 1
        ).order_by(Employee.employee_code).all()
        
        result = []
        for emp in employees:
            item = emp.to_dict()
            if emp.user:
                item['user_info'] = emp.user.to_simple_dict()
            result.append(item)
        
        return Response.success(result)


class PermissionService:
    """权限点服务类"""

    @staticmethod
    def get_tree():
        """获取权限树"""
        tree = Permission.get_tree()
        return Response.success(tree)

    @staticmethod
    def get_all():
        """获取所有权限点"""
        permissions = Permission.get_all()
        return Response.success([p.to_dict() for p in permissions])

    @staticmethod
    def get_by_id(permission_id):
        """根据ID获取权限点"""
        permission = Permission.get_by_id(permission_id)
        if not permission:
            return Response.not_found('权限点不存在')
        return Response.success(permission.to_dict())

    @staticmethod
    def create(data):
        """创建权限点"""
        validation = Validator.validate_form(data, {
            'permission_code': ['required'],
            'permission_name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if Permission.query.filter_by(permission_code=data['permission_code']).first():
            return Response.error('权限编码已存在', 409)

        permission = Permission(
            permission_code=data['permission_code'],
            permission_name=data['permission_name'],
            permission_type=data.get('permission_type', 'menu'),
            parent_id=data.get('parent_id', 0),
            sort_order=data.get('sort_order', 0),
            description=data.get('description')
        )
        permission.save()

        return Response.created(permission.to_dict())

    @staticmethod
    def update(permission_id, data):
        """更新权限点"""
        permission = Permission.get_by_id(permission_id)
        if not permission:
            return Response.not_found('权限点不存在')

        if data.get('permission_code') and data['permission_code'] != permission.permission_code:
            if Permission.query.filter_by(permission_code=data['permission_code']).first():
                return Response.error('权限编码已存在', 409)
            permission.permission_code = data['permission_code']

        if data.get('permission_name'):
            permission.permission_name = data['permission_name']
        if data.get('permission_type'):
            permission.permission_type = data['permission_type']
        if 'parent_id' in data:
            permission.parent_id = data['parent_id']
        if 'sort_order' in data:
            permission.sort_order = data['sort_order']
        if 'description' in data:
            permission.description = data['description']

        permission.save()
        return Response.success(permission.to_dict())

    @staticmethod
    def delete(permission_id):
        """删除权限点"""
        permission = Permission.get_by_id(permission_id)
        if not permission:
            return Response.not_found('权限点不存在')

        child_count = Permission.query.filter_by(parent_id=permission_id, status=1).count()
        if child_count > 0:
            return Response.error('该权限下有子权限，无法删除', 400)

        permission.delete()
        return Response.success({'message': '删除成功'})

    @staticmethod
    def init_default_permissions():
        """初始化默认权限点"""
        default_perms = [
            {'code': 'org:view', 'name': '组织架构查看', 'type': 'menu'},
            {'code': 'org:employee:view', 'name': '员工查看', 'type': 'menu'},
            {'code': 'org:employee:add', 'name': '员工新增', 'type': 'button'},
            {'code': 'org:employee:edit', 'name': '员工编辑', 'type': 'button'},
            {'code': 'org:employee:delete', 'name': '员工删除', 'type': 'button'},
            {'code': 'org:department:view', 'name': '部门查看', 'type': 'menu'},
            {'code': 'org:department:add', 'name': '部门新增', 'type': 'button'},
            {'code': 'org:department:edit', 'name': '部门编辑', 'type': 'button'},
            {'code': 'org:department:delete', 'name': '部门删除', 'type': 'button'},
            {'code': 'org:position:view', 'name': '岗位查看', 'type': 'menu'},
            {'code': 'org:position:add', 'name': '岗位新增', 'type': 'button'},
            {'code': 'org:position:edit', 'name': '岗位编辑', 'type': 'button'},
            {'code': 'org:position:delete', 'name': '岗位删除', 'type': 'button'},
            {'code': 'org:group:view', 'name': '权限分组查看', 'type': 'menu'},
            {'code': 'org:group:add', 'name': '权限分组新增', 'type': 'button'},
            {'code': 'org:group:edit', 'name': '权限分组编辑', 'type': 'button'},
            {'code': 'org:group:delete', 'name': '权限分组删除', 'type': 'button'},
        ]

        created = 0
        for perm in default_perms:
            if not Permission.query.filter_by(permission_code=perm['code']).first():
                p = Permission(
                    permission_code=perm['code'],
                    permission_name=perm['name'],
                    permission_type=perm['type']
                )
                p.save()
                created += 1

        return Response.success({'created': created, 'message': f'已创建 {created} 个默认权限点'})


class PermissionGroupService:
    """权限分组服务类"""

    @staticmethod
    def get_page(page=1, size=10, keyword=None):
        """分页获取权限分组列表"""
        query = PermissionGroup.query

        if keyword:
            query = query.filter(PermissionGroup.group_name.like(f'%{keyword}%'))

        pagination = query.order_by(PermissionGroup.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [g.to_dict() for g in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_all():
        """获取所有权限分组"""
        groups = PermissionGroup.get_all()
        return Response.success([g.to_dict() for g in groups])

    @staticmethod
    def get_by_id(group_id):
        """根据ID获取权限分组详情"""
        group = PermissionGroup.get_by_id(group_id)
        if not group:
            return Response.not_found('权限分组不存在')

        result = group.to_dict()
        result['members'] = [e.to_simple_dict() for e in group.members.filter(Employee.status == 1).all()]
        result['permissions'] = [p.to_dict() for p in group.permissions.filter(Permission.status == 1).all()]

        return Response.success(result)

    @staticmethod
    def create(data):
        """创建权限分组"""
        validation = Validator.validate_form(data, {
            'group_name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if PermissionGroup.query.filter_by(group_name=data['group_name']).first():
            return Response.error('分组名称已存在', 409)

        group = PermissionGroup(
            group_name=data['group_name'],
            description=data.get('description')
        )

        if data.get('member_ids'):
            members = Employee.query.filter(
                Employee.id.in_(data['member_ids']),
                Employee.status == 1
            ).all()
            group.members.extend(members)

        if data.get('permission_ids'):
            permissions = Permission.query.filter(
                Permission.id.in_(data['permission_ids']),
                Permission.status == 1
            ).all()
            group.permissions.extend(permissions)

        group.save()
        return Response.created(group.to_dict())

    @staticmethod
    def update(group_id, data):
        """更新权限分组"""
        group = PermissionGroup.get_by_id(group_id)
        if not group:
            return Response.not_found('权限分组不存在')

        if data.get('group_name') and data['group_name'] != group.group_name:
            if PermissionGroup.query.filter_by(group_name=data['group_name']).first():
                return Response.error('分组名称已存在', 409)
            group.group_name = data['group_name']

        if 'description' in data:
            group.description = data['description']

        if 'member_ids' in data:
            group.members.clear()
            if data['member_ids']:
                members = Employee.query.filter(
                    Employee.id.in_(data['member_ids']),
                    Employee.status == 1
                ).all()
                group.members.extend(members)

        if 'permission_ids' in data:
            group.permissions.clear()
            if data['permission_ids']:
                permissions = Permission.query.filter(
                    Permission.id.in_(data['permission_ids']),
                    Permission.status == 1
                ).all()
                group.permissions.extend(permissions)

        group.save()
        return Response.success(group.to_dict())

    @staticmethod
    def delete(group_id):
        """删除权限分组"""
        group = PermissionGroup.get_by_id(group_id)
        if not group:
            return Response.not_found('权限分组不存在')

        group.delete()
        return Response.success({'message': '删除成功'})

    @staticmethod
    def add_members(group_id, employee_ids):
        """批量添加成员"""
        group = PermissionGroup.get_by_id(group_id)
        if not group:
            return Response.not_found('权限分组不存在')

        employees = Employee.query.filter(
            Employee.id.in_(employee_ids),
            Employee.status == 1
        ).all()
        for emp in employees:
            if emp not in group.members:
                group.members.append(emp)

        group.save()
        return Response.success({'message': f'已添加 {len(employees)} 个成员'})

    @staticmethod
    def remove_members(group_id, employee_ids):
        """批量移除成员"""
        group = PermissionGroup.get_by_id(group_id)
        if not group:
            return Response.not_found('权限分组不存在')

        employees = Employee.query.filter(
            Employee.id.in_(employee_ids),
            Employee.status == 1
        ).all()
        for emp in employees:
            if emp in group.members:
                group.members.remove(emp)

        group.save()
        return Response.success({'message': f'已移除 {len(employees)} 个成员'})


class StatisticsService:
    """统计服务类"""

    @staticmethod
    def get_employee_count_by_department():
        """按部门统计在职人数"""
        departments = Department.query.filter(
            Department.status == 1
        ).order_by(Department.sort_order).all()

        result = []
        for dept in departments:
            count = Employee.query.filter(
                Employee.department_id == dept.id,
                Employee.employee_status == 'active',
                Employee.status == 1
            ).count()

            result.append({
                'department_id': dept.id,
                'department_code': dept.dept_code,
                'department_name': dept.dept_name,
                'parent_id': dept.parent_id,
                'employee_count': count
            })

        def build_tree(items, parent_id=0):
            tree = []
            for item in items:
                if item['parent_id'] == parent_id:
                    children = build_tree(items, item['department_id'])
                    if children:
                        item['children'] = children
                    tree.append(item)
            return tree

        tree = build_tree(result)
        return Response.success(tree)

    @staticmethod
    def get_employee_statistics():
        """获取员工统计概览"""
        total = Employee.query.filter(Employee.status == 1).count()
        active = Employee.query.filter(
            Employee.status == 1,
            Employee.employee_status == 'active'
        ).count()
        inactive = Employee.query.filter(
            Employee.status == 1,
            Employee.employee_status == 'inactive'
        ).count()

        dept_count = Department.query.filter(Department.status == 1).count()
        position_count = Position.query.filter(Position.status == 1).count()

        return Response.success({
            'total_employees': total,
            'active_employees': active,
            'inactive_employees': inactive,
            'department_count': dept_count,
            'position_count': position_count
        })
