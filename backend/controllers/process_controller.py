"""
工艺参数模板控制器
"""
from flask import Blueprint, request, g

from services.process_service import (
    ProcessTemplateService, ProcessAuditService, ProcessDeployService
)
from middleware.auth_middleware import login_required

process_bp = Blueprint('process', __name__)


# ==================== 工艺模板 CRUD 接口 ====================

@process_bp.route('/templates', methods=['GET'])
@login_required
def get_templates():
    """获取模板列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    product_name = request.args.get('productName')
    status = request.args.get('status')
    keyword = request.args.get('keyword')

    return ProcessTemplateService.get_templates(page, size, product_name, status, keyword)


@process_bp.route('/templates/<int:template_id>', methods=['GET'])
@login_required
def get_template(template_id):
    """获取模板详情"""
    return ProcessTemplateService.get_template_by_id(template_id)


@process_bp.route('/templates', methods=['POST'])
@login_required
def create_template():
    """创建模板"""
    data = request.get_json()
    return ProcessTemplateService.create_template(data)


@process_bp.route('/templates/<int:template_id>', methods=['PUT'])
@login_required
def update_template(template_id):
    """更新模板"""
    data = request.get_json()
    return ProcessTemplateService.update_template(template_id, data)


@process_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@login_required
def delete_template(template_id):
    """删除模板"""
    return ProcessTemplateService.delete_template(template_id)


@process_bp.route('/templates/<int:template_id>/version', methods=['POST'])
@login_required
def create_new_version(template_id):
    """新建版本"""
    data = request.get_json()
    return ProcessTemplateService.create_new_version(template_id, data)


@process_bp.route('/templates/<int:template_id>/archive', methods=['POST'])
@login_required
def archive_template(template_id):
    """归档模板"""
    return ProcessTemplateService.archive_template(template_id)


@process_bp.route('/templates/versions/<template_code>', methods=['GET'])
@login_required
def get_template_versions(template_code):
    """获取模板的所有版本"""
    return ProcessTemplateService.get_template_versions(template_code)


@process_bp.route('/templates/products', methods=['GET'])
@login_required
def get_products():
    """获取所有产品名称（用于筛选）"""
    return ProcessTemplateService.get_products()


# ==================== 版本对比接口 ====================

@process_bp.route('/templates/compare', methods=['GET'])
@login_required
def compare_versions():
    """版本对比"""
    template_id_1 = request.args.get('id1', type=int)
    template_id_2 = request.args.get('id2', type=int)

    if not template_id_1 or not template_id_2:
        from utils.response import Response
        return Response.bad_request('请提供两个模板ID')

    return ProcessTemplateService.compare_versions(template_id_1, template_id_2)


# ==================== 审核流转接口 ====================

@process_bp.route('/templates/<int:template_id>/submit', methods=['POST'])
@login_required
def submit_audit(template_id):
    """提交审核"""
    data = request.get_json() or {}
    comment = data.get('comment')
    return ProcessAuditService.submit_audit(template_id, comment)


@process_bp.route('/templates/<int:template_id>/pass', methods=['POST'])
@login_required
def audit_pass(template_id):
    """审核通过"""
    data = request.get_json() or {}
    comment = data.get('comment')
    return ProcessAuditService.audit_pass(template_id, comment)


@process_bp.route('/templates/<int:template_id>/reject', methods=['POST'])
@login_required
def audit_reject(template_id):
    """审核驳回"""
    data = request.get_json() or {}
    comment = data.get('comment')
    return ProcessAuditService.audit_reject(template_id, comment)


@process_bp.route('/audits/pending', methods=['GET'])
@login_required
def get_pending_audits():
    """获取待审核列表"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    return ProcessAuditService.get_pending_audits(page, size)


@process_bp.route('/templates/<int:template_id>/audit-records', methods=['GET'])
@login_required
def get_audit_records(template_id):
    """获取模板审核记录"""
    return ProcessAuditService.get_audit_records(template_id)


# ==================== 下发接口 ====================

@process_bp.route('/templates/<int:template_id>/deploy', methods=['POST'])
@login_required
def deploy_template(template_id):
    """下发模板到设备"""
    data = request.get_json()
    equipment_ids = data.get('equipment_ids', [])
    return ProcessDeployService.deploy_template(template_id, equipment_ids)


@process_bp.route('/deploy-records', methods=['GET'])
@login_required
def get_deploy_records():
    """获取下发记录"""
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    template_id = request.args.get('templateId', type=int)
    equipment_id = request.args.get('equipmentId', type=int)

    return ProcessDeployService.get_deploy_records(page, size, template_id, equipment_id)
