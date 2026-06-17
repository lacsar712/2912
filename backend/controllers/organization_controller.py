"""
组织架构管理控制器
"""
from flask import Blueprint, request
from services.organization_service import (
    DepartmentService,
    PositionService,
    EmployeeService,
    PermissionService,
    PermissionGroupService,
    StatisticsService
)
from middleware.auth_middleware import login_required

organization_bp = Blueprint('organization', __name__)


# ==================== 部门管理接口 ====================

@organization_bp.route('/departments', methods=['GET'])
@login_required
def get_departments():
    """获取所有部门列表"""
    return DepartmentService.get_all()


@organization_bp.route('/departments/tree', methods=['GET'])
@login_required
def get_department_tree():
    """获取部门树"""
    return DepartmentService.get_tree()


@organization_bp.route('/departments/<int:dept_id>', methods=['GET'])
@login_required
def get_department(dept_id):
    """获取部门详情"""
    return DepartmentService.get_by_id(dept_id)


@organization_bp.route('/departments', methods=['POST'])
@login_required
def create_department():
    """创建部门"""
    data = request.get_json()
    return DepartmentService.create(data)


@organization_bp.route('/departments/<int:dept_id>', methods=['PUT'])
@login_required
def update_department(dept_id):
    """更新部门"""
    data = request.get_json()
    return DepartmentService.update(dept_id, data)


@organization_bp.route('/departments/<int:dept_id>/move', methods=['PUT'])
@login_required
def move_department(dept_id):
    """移动部门（调整父子层级）"""
    data = request.get_json()
    new_parent_id = data.get('new_parent_id', 0)
    return DepartmentService.move(dept_id, new_parent_id)


@organization_bp.route('/departments/<int:dept_id>', methods=['DELETE'])
@login_required
def delete_department(dept_id):
    """删除部门"""
    return DepartmentService.delete(dept_id)


# ==================== 岗位管理接口 ====================

@organization_bp.route('/positions', methods=['GET'])
@login_required
def get_positions():
    """分页获取岗位列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    category = request.args.get('category')
    return PositionService.get_page(page, size, keyword, category)


@organization_bp.route('/positions/all', methods=['GET'])
@login_required
def get_all_positions():
    """获取所有岗位（用于下拉选择）"""
    return PositionService.get_all()


@organization_bp.route('/positions/categories', methods=['GET'])
@login_required
def get_position_categories():
    """获取所有岗位类别"""
    return PositionService.get_categories()


@organization_bp.route('/positions/<int:position_id>', methods=['GET'])
@login_required
def get_position(position_id):
    """获取岗位详情"""
    return PositionService.get_by_id(position_id)


@organization_bp.route('/positions', methods=['POST'])
@login_required
def create_position():
    """创建岗位"""
    data = request.get_json()
    return PositionService.create(data)


@organization_bp.route('/positions/<int:position_id>', methods=['PUT'])
@login_required
def update_position(position_id):
    """更新岗位"""
    data = request.get_json()
    return PositionService.update(position_id, data)


@organization_bp.route('/positions/<int:position_id>', methods=['DELETE'])
@login_required
def delete_position(position_id):
    """删除岗位"""
    return PositionService.delete(position_id)


# ==================== 员工管理接口 ====================

@organization_bp.route('/employees', methods=['GET'])
@login_required
def get_employees():
    """分页获取员工列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    department_id = request.args.get('department_id', type=int)
    position_id = request.args.get('position_id', type=int)
    employee_status = request.args.get('employee_status')
    return EmployeeService.get_page(page, size, keyword, department_id, position_id, employee_status)


@organization_bp.route('/employees/simple', methods=['GET'])
@login_required
def get_employees_simple():
    """获取所有员工简化信息（用于下拉选择）"""
    return EmployeeService.get_all_simple()


@organization_bp.route('/employees/<int:employee_id>', methods=['GET'])
@login_required
def get_employee(employee_id):
    """获取员工详情"""
    return EmployeeService.get_by_id(employee_id)


@organization_bp.route('/employees', methods=['POST'])
@login_required
def create_employee():
    """创建员工"""
    data = request.get_json()
    return EmployeeService.create(data)


@organization_bp.route('/employees/<int:employee_id>', methods=['PUT'])
@login_required
def update_employee(employee_id):
    """更新员工"""
    data = request.get_json()
    return EmployeeService.update(employee_id, data)


@organization_bp.route('/employees/<int:employee_id>', methods=['DELETE'])
@login_required
def delete_employee(employee_id):
    """删除员工"""
    return EmployeeService.delete(employee_id)


@organization_bp.route('/employees/<int:employee_id>/bind-user', methods=['POST'])
@login_required
def bind_user(employee_id):
    """绑定员工与登录账号"""
    data = request.get_json()
    user_id = data.get('user_id')
    return EmployeeService.bind_user(employee_id, user_id)


@organization_bp.route('/employees/<int:employee_id>/unbind-user', methods=['POST'])
@login_required
def unbind_user(employee_id):
    """解绑员工与登录账号"""
    return EmployeeService.unbind_user(employee_id)


@organization_bp.route('/employees/unbound-users', methods=['GET'])
@login_required
def get_unbound_users():
    """获取未绑定的用户列表"""
    return EmployeeService.get_unbound_users()


@organization_bp.route('/employees/bindings', methods=['GET'])
@login_required
def get_employee_user_bindings():
    """获取员工-用户绑定关系列表"""
    return EmployeeService.get_employee_user_binding()


# ==================== 权限点管理接口 ====================

@organization_bp.route('/permissions', methods=['GET'])
@login_required
def get_permissions():
    """获取所有权限点"""
    return PermissionService.get_all()


@organization_bp.route('/permissions/tree', methods=['GET'])
@login_required
def get_permission_tree():
    """获取权限树"""
    return PermissionService.get_tree()


@organization_bp.route('/permissions/<int:permission_id>', methods=['GET'])
@login_required
def get_permission(permission_id):
    """获取权限点详情"""
    return PermissionService.get_by_id(permission_id)


@organization_bp.route('/permissions', methods=['POST'])
@login_required
def create_permission():
    """创建权限点"""
    data = request.get_json()
    return PermissionService.create(data)


@organization_bp.route('/permissions/<int:permission_id>', methods=['PUT'])
@login_required
def update_permission(permission_id):
    """更新权限点"""
    data = request.get_json()
    return PermissionService.update(permission_id, data)


@organization_bp.route('/permissions/<int:permission_id>', methods=['DELETE'])
@login_required
def delete_permission(permission_id):
    """删除权限点"""
    return PermissionService.delete(permission_id)


@organization_bp.route('/permissions/init-default', methods=['POST'])
@login_required
def init_default_permissions():
    """初始化默认权限点"""
    return PermissionService.init_default_permissions()


# ==================== 权限分组管理接口 ====================

@organization_bp.route('/permission-groups', methods=['GET'])
@login_required
def get_permission_groups():
    """分页获取权限分组列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    return PermissionGroupService.get_page(page, size, keyword)


@organization_bp.route('/permission-groups/all', methods=['GET'])
@login_required
def get_all_permission_groups():
    """获取所有权限分组"""
    return PermissionGroupService.get_all()


@organization_bp.route('/permission-groups/<int:group_id>', methods=['GET'])
@login_required
def get_permission_group(group_id):
    """获取权限分组详情"""
    return PermissionGroupService.get_by_id(group_id)


@organization_bp.route('/permission-groups', methods=['POST'])
@login_required
def create_permission_group():
    """创建权限分组"""
    data = request.get_json()
    return PermissionGroupService.create(data)


@organization_bp.route('/permission-groups/<int:group_id>', methods=['PUT'])
@login_required
def update_permission_group(group_id):
    """更新权限分组"""
    data = request.get_json()
    return PermissionGroupService.update(group_id, data)


@organization_bp.route('/permission-groups/<int:group_id>', methods=['DELETE'])
@login_required
def delete_permission_group(group_id):
    """删除权限分组"""
    return PermissionGroupService.delete(group_id)


@organization_bp.route('/permission-groups/<int:group_id>/members', methods=['POST'])
@login_required
def add_group_members(group_id):
    """批量添加成员"""
    data = request.get_json()
    employee_ids = data.get('employee_ids', [])
    return PermissionGroupService.add_members(group_id, employee_ids)


@organization_bp.route('/permission-groups/<int:group_id>/members', methods=['DELETE'])
@login_required
def remove_group_members(group_id):
    """批量移除成员"""
    data = request.get_json()
    employee_ids = data.get('employee_ids', [])
    return PermissionGroupService.remove_members(group_id, employee_ids)


# ==================== 统计接口 ====================

@organization_bp.route('/statistics/employee-count-by-department', methods=['GET'])
@login_required
def get_employee_count_by_department():
    """按部门统计在职人数"""
    return StatisticsService.get_employee_count_by_department()


@organization_bp.route('/statistics/employee-overview', methods=['GET'])
@login_required
def get_employee_overview():
    """获取员工统计概览"""
    return StatisticsService.get_employee_statistics()
