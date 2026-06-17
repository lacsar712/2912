"""
能源管理控制器
"""
from flask import Blueprint, request
from services.energy_service import (
    EnergyTypeService, MeteringPointService, MeterReadingService,
    EnergyPriceService, EnergyCostService, EnergyDashboardService
)
from middleware.auth_middleware import login_required

energy_bp = Blueprint('energy', __name__)


@energy_bp.route('/types', methods=['GET'])
@login_required
def get_energy_types():
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    keyword = request.args.get('keyword')
    return EnergyTypeService.get_energy_types(page, size, keyword)


@energy_bp.route('/types/all', methods=['GET'])
@login_required
def get_all_energy_types():
    return EnergyTypeService.get_all_energy_types()


@energy_bp.route('/types/<int:type_id>', methods=['GET'])
@login_required
def get_energy_type(type_id):
    return EnergyTypeService.get_energy_type_by_id(type_id)


@energy_bp.route('/types', methods=['POST'])
@login_required
def create_energy_type():
    data = request.get_json()
    return EnergyTypeService.create_energy_type(data)


@energy_bp.route('/types/<int:type_id>', methods=['PUT'])
@login_required
def update_energy_type(type_id):
    data = request.get_json()
    return EnergyTypeService.update_energy_type(type_id, data)


@energy_bp.route('/types/<int:type_id>', methods=['DELETE'])
@login_required
def delete_energy_type(type_id):
    return EnergyTypeService.delete_energy_type(type_id)


@energy_bp.route('/metering-points', methods=['GET'])
@login_required
def get_metering_points():
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    energy_type_id = request.args.get('energyTypeId', type=int)
    production_line_id = request.args.get('productionLineId', type=int)
    workshop = request.args.get('workshop')
    keyword = request.args.get('keyword')
    return MeteringPointService.get_metering_points(
        page, size, energy_type_id, production_line_id, workshop, keyword
    )


@energy_bp.route('/metering-points/<int:point_id>', methods=['GET'])
@login_required
def get_metering_point(point_id):
    return MeteringPointService.get_metering_point_by_id(point_id)


@energy_bp.route('/metering-points', methods=['POST'])
@login_required
def create_metering_point():
    data = request.get_json()
    return MeteringPointService.create_metering_point(data)


@energy_bp.route('/metering-points/<int:point_id>', methods=['PUT'])
@login_required
def update_metering_point(point_id):
    data = request.get_json()
    return MeteringPointService.update_metering_point(point_id, data)


@energy_bp.route('/metering-points/<int:point_id>', methods=['DELETE'])
@login_required
def delete_metering_point(point_id):
    return MeteringPointService.delete_metering_point(point_id)


@energy_bp.route('/workshops', methods=['GET'])
@login_required
def get_workshops():
    return MeteringPointService.get_workshops()


@energy_bp.route('/readings', methods=['GET'])
@login_required
def get_readings():
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    metering_point_id = request.args.get('meteringPointId', type=int)
    energy_type_id = request.args.get('energyTypeId', type=int)
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    return MeterReadingService.get_readings(
        page, size, metering_point_id, energy_type_id, start_date, end_date
    )


@energy_bp.route('/readings', methods=['POST'])
@login_required
def create_reading():
    data = request.get_json()
    return MeterReadingService.create_reading(data)


@energy_bp.route('/readings/batch', methods=['POST'])
@login_required
def batch_import_readings():
    data = request.get_json()
    readings = data.get('readings', [])
    if not readings:
        return {'code': 400, 'message': '导入数据不能为空', 'data': None}, 400
    return MeterReadingService.batch_import(readings)


@energy_bp.route('/readings/<int:reading_id>', methods=['DELETE'])
@login_required
def delete_reading(reading_id):
    return MeterReadingService.delete_reading(reading_id)


@energy_bp.route('/prices', methods=['GET'])
@login_required
def get_prices():
    page = request.args.get('page', 1, type=int)
    size = request.args.get('size', 10, type=int)
    energy_type_id = request.args.get('energyTypeId', type=int)
    period = request.args.get('period')
    return EnergyPriceService.get_prices(page, size, energy_type_id, period)


@energy_bp.route('/prices', methods=['POST'])
@login_required
def create_price():
    data = request.get_json()
    return EnergyPriceService.create_price(data)


@energy_bp.route('/prices/<int:price_id>', methods=['PUT'])
@login_required
def update_price(price_id):
    data = request.get_json()
    return EnergyPriceService.update_price(price_id, data)


@energy_bp.route('/prices/<int:price_id>', methods=['DELETE'])
@login_required
def delete_price(price_id):
    return EnergyPriceService.delete_price(price_id)


@energy_bp.route('/cost/calculate', methods=['POST'])
@login_required
def calculate_monthly_cost():
    data = request.get_json()
    year_month = data.get('year_month')
    metering_point_id = data.get('metering_point_id')
    if not year_month:
        return {'code': 400, 'message': '年月参数必填', 'data': None}, 400
    return EnergyCostService.calculate_monthly_cost(year_month, metering_point_id)


@energy_bp.route('/cost/monthly', methods=['GET'])
@login_required
def get_monthly_cost():
    year_month = request.args.get('yearMonth')
    if not year_month:
        return {'code': 400, 'message': '年月参数必填', 'data': None}, 400
    energy_type_id = request.args.get('energyTypeId', type=int)
    workshop = request.args.get('workshop')
    production_line_id = request.args.get('productionLineId', type=int)
    metering_point_id = request.args.get('meteringPointId', type=int)
    return EnergyCostService.get_monthly_cost(
        year_month, energy_type_id, workshop, production_line_id, metering_point_id
    )


@energy_bp.route('/cost/comparison', methods=['GET'])
@login_required
def get_cost_comparison():
    year_month = request.args.get('yearMonth')
    if not year_month:
        return {'code': 400, 'message': '年月参数必填', 'data': None}, 400
    compare_type = request.args.get('compareType', 'mom')
    return EnergyCostService.get_cost_comparison(year_month, compare_type)


@energy_bp.route('/dashboard', methods=['GET'])
@login_required
def get_dashboard():
    return EnergyDashboardService.get_dashboard()


@energy_bp.route('/dashboard/trend', methods=['GET'])
@login_required
def get_consumption_trend():
    days = request.args.get('days', 7, type=int)
    energy_type_id = request.args.get('energyTypeId', type=int)
    return EnergyDashboardService.get_consumption_trend(days, energy_type_id)


@energy_bp.route('/dashboard/workshop-comparison', methods=['GET'])
@login_required
def get_workshop_comparison():
    year_month = request.args.get('yearMonth')
    if not year_month:
        from datetime import datetime
        year_month = datetime.now().strftime('%Y-%m')
    return EnergyDashboardService.get_workshop_comparison(year_month)


@energy_bp.route('/dashboard/today-cost', methods=['GET'])
@login_required
def get_today_cost():
    return EnergyDashboardService.get_today_cost()


@energy_bp.route('/stats/aggregated', methods=['GET'])
@login_required
def get_aggregated_stats():
    energy_type_id = request.args.get('energyTypeId', type=int)
    workshop = request.args.get('workshop')
    production_line_id = request.args.get('productionLineId', type=int)
    return EnergyDashboardService.get_aggregated_stats(energy_type_id, workshop, production_line_id)
