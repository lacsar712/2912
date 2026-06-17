"""
能源管理服务
"""
import csv
import io
from flask import g
from datetime import datetime, timedelta
from database.db import db
from models.energy import EnergyType, MeteringPoint, MeterReading, EnergyPrice, MonthlyCostSummary
from models.production import AlertRecord, ProductionLine
from models.log import Log
from utils.response import Response
from utils.validator import Validator


class EnergyTypeService:
    @staticmethod
    def get_energy_types(page=1, size=10, keyword=None):
        query = EnergyType.query
        if keyword:
            query = query.filter(
                (EnergyType.type_code.like(f'%{keyword}%')) |
                (EnergyType.type_name.like(f'%{keyword}%'))
            )
        pagination = query.order_by(EnergyType.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [t.to_dict() for t in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_all_energy_types():
        types = EnergyType.query.filter_by(status=1).all()
        return Response.success([t.to_dict() for t in types])

    @staticmethod
    def get_energy_type_by_id(type_id):
        energy_type = EnergyType.query.filter(EnergyType.id == type_id).first()
        if not energy_type:
            return Response.not_found('能源类型不存在')
        return Response.success(energy_type.to_dict())

    @staticmethod
    def create_energy_type(data):
        validation = Validator.validate_form(data, {
            'type_code': ['required'],
            'type_name': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if EnergyType.query.filter_by(type_code=data['type_code']).first():
            return Response.error('能源类型编码已存在', 409)

        energy_type = EnergyType(
            type_code=data['type_code'],
            type_name=data['type_name'],
            unit=data.get('unit', ''),
            description=data.get('description', ''),
            status=data.get('status', 1)
        )
        try:
            energy_type.save()
            Log.add_log(g.user_id, g.username, 'create', 'energy_type',
                       f'创建能源类型: {energy_type.type_name}')
            return Response.created({'id': energy_type.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_energy_type(type_id, data):
        energy_type = EnergyType.query.filter(EnergyType.id == type_id).first()
        if not energy_type:
            return Response.not_found('能源类型不存在')

        if 'type_code' in data:
            existing = EnergyType.query.filter_by(type_code=data['type_code']).first()
            if existing and existing.id != type_id:
                return Response.error('能源类型编码已存在', 409)

        allowed = ['type_code', 'type_name', 'unit', 'description', 'status']
        update_data = {k: v for k, v in data.items() if k in allowed}
        try:
            energy_type.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'energy_type',
                       f'更新能源类型: {energy_type.type_name}')
            return Response.success(energy_type.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_energy_type(type_id):
        energy_type = EnergyType.query.filter(EnergyType.id == type_id).first()
        if not energy_type:
            return Response.not_found('能源类型不存在')
        try:
            energy_type.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'energy_type',
                       f'删除能源类型: {energy_type.type_name}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class MeteringPointService:
    @staticmethod
    def get_metering_points(page=1, size=10, energy_type_id=None,
                           production_line_id=None, workshop=None, keyword=None):
        query = MeteringPoint.query
        if energy_type_id:
            query = query.filter(MeteringPoint.energy_type_id == energy_type_id)
        if production_line_id:
            query = query.filter(MeteringPoint.production_line_id == production_line_id)
        if workshop:
            query = query.filter(MeteringPoint.workshop.like(f'%{workshop}%'))
        if keyword:
            query = query.filter(
                (MeteringPoint.point_code.like(f'%{keyword}%')) |
                (MeteringPoint.point_name.like(f'%{keyword}%'))
            )
        pagination = query.order_by(MeteringPoint.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [p.to_dict() for p in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def get_metering_point_by_id(point_id):
        point = MeteringPoint.query.filter(MeteringPoint.id == point_id).first()
        if not point:
            return Response.not_found('计量点不存在')
        return Response.success(point.to_dict())

    @staticmethod
    def create_metering_point(data):
        validation = Validator.validate_form(data, {
            'point_code': ['required'],
            'point_name': ['required'],
            'energy_type_id': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        if MeteringPoint.query.filter_by(point_code=data['point_code']).first():
            return Response.error('计量点编号已存在', 409)

        point = MeteringPoint(
            point_code=data['point_code'],
            point_name=data['point_name'],
            energy_type_id=data['energy_type_id'],
            production_line_id=data.get('production_line_id'),
            workshop=data.get('workshop', ''),
            location=data.get('location', ''),
            status=data.get('status', 1)
        )
        try:
            point.save()
            Log.add_log(g.user_id, g.username, 'create', 'metering_point',
                       f'创建计量点: {point.point_name}')
            return Response.created({'id': point.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_metering_point(point_id, data):
        point = MeteringPoint.query.filter(MeteringPoint.id == point_id).first()
        if not point:
            return Response.not_found('计量点不存在')

        if 'point_code' in data:
            existing = MeteringPoint.query.filter_by(point_code=data['point_code']).first()
            if existing and existing.id != point_id:
                return Response.error('计量点编号已存在', 409)

        allowed = ['point_code', 'point_name', 'energy_type_id', 'production_line_id',
                  'workshop', 'location', 'status']
        update_data = {k: v for k, v in data.items() if k in allowed}
        try:
            point.update(**update_data)
            Log.add_log(g.user_id, g.username, 'update', 'metering_point',
                       f'更新计量点: {point.point_name}')
            return Response.success(point.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_metering_point(point_id):
        point = MeteringPoint.query.filter(MeteringPoint.id == point_id).first()
        if not point:
            return Response.not_found('计量点不存在')
        try:
            point.delete()
            Log.add_log(g.user_id, g.username, 'delete', 'metering_point',
                       f'删除计量点: {point.point_name}')
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')

    @staticmethod
    def get_workshops():
        workshops = db.session.query(MeteringPoint.workshop).filter(
            MeteringPoint.workshop.isnot(None),
            MeteringPoint.workshop != '',
            MeteringPoint.status == 1
        ).distinct().all()
        return Response.success([w[0] for w in workshops])


class MeterReadingService:
    @staticmethod
    def get_readings(page=1, size=10, metering_point_id=None,
                    energy_type_id=None, start_date=None, end_date=None):
        query = MeterReading.query
        if metering_point_id:
            query = query.filter(MeterReading.metering_point_id == metering_point_id)
        if energy_type_id:
            point_ids = [p.id for p in MeteringPoint.query.filter_by(energy_type_id=energy_type_id).all()]
            if point_ids:
                query = query.filter(MeterReading.metering_point_id.in_(point_ids))
            else:
                return Response.paginate([], 0, page, size)
        if start_date:
            query = query.filter(MeterReading.reading_time >= start_date)
        if end_date:
            query = query.filter(MeterReading.reading_time <= end_date)

        pagination = query.order_by(MeterReading.reading_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [r.to_dict() for r in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def create_reading(data):
        validation = Validator.validate_form(data, {
            'metering_point_id': ['required'],
            'reading_time': ['required'],
            'cumulative_value': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        point = MeteringPoint.query.filter(MeteringPoint.id == data['metering_point_id']).first()
        if not point:
            return Response.not_found('计量点不存在')

        reading_time = data['reading_time']
        if isinstance(reading_time, str):
            try:
                reading_time = datetime.strptime(reading_time, '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    reading_time = datetime.strptime(reading_time, '%Y-%m-%dT%H:%M:%S')
                except ValueError:
                    try:
                        reading_time = datetime.strptime(reading_time, '%Y-%m-%d %H:%M')
                    except ValueError:
                        reading_time = datetime.strptime(reading_time, '%Y-%m-%d')

        last_reading = MeterReading.query.filter(
            MeterReading.metering_point_id == data['metering_point_id']
        ).order_by(MeterReading.reading_time.desc()).first()

        cumulative_value = float(data['cumulative_value'])
        delta_value = 0
        if last_reading:
            delta_value = cumulative_value - float(last_reading.cumulative_value)
            if delta_value < 0:
                delta_value = cumulative_value

        reading = MeterReading(
            metering_point_id=data['metering_point_id'],
            reading_time=reading_time,
            cumulative_value=cumulative_value,
            delta_value=delta_value,
            recorder=g.username
        )
        try:
            db.session.add(reading)
            db.session.commit()

            Log.add_log(g.user_id, g.username, 'create', 'meter_reading',
                       f'录入读数: {point.point_name}, 差值: {delta_value}')

            if delta_value > 0:
                EnergyAnomalyService.check_anomaly(data['metering_point_id'], delta_value, reading_time)

            return Response.created(reading.to_dict(), '录入成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'录入失败: {str(e)}')

    @staticmethod
    def batch_import(data_list):
        success_count = 0
        error_list = []
        for idx, data in enumerate(data_list):
            point = MeteringPoint.query.filter_by(point_code=data.get('point_code')).first()
            if not point:
                error_list.append({'row': idx + 1, 'error': f'计量点编号 {data.get("point_code")} 不存在'})
                continue

            try:
                reading_time = datetime.strptime(data['reading_time'], '%Y-%m-%d %H:%M:%S')
            except ValueError:
                try:
                    reading_time = datetime.strptime(data['reading_time'], '%Y-%m-%d')
                except ValueError:
                    error_list.append({'row': idx + 1, 'error': '日期格式错误'})
                    continue

            last_reading = MeterReading.query.filter(
                MeterReading.metering_point_id == point.id
            ).order_by(MeterReading.reading_time.desc()).first()

            cumulative_value = float(data['cumulative_value'])
            delta_value = 0
            if last_reading:
                delta_value = cumulative_value - float(last_reading.cumulative_value)
                if delta_value < 0:
                    delta_value = cumulative_value

            reading = MeterReading(
                metering_point_id=point.id,
                reading_time=reading_time,
                cumulative_value=cumulative_value,
                delta_value=delta_value,
                recorder=g.username
            )
            db.session.add(reading)
            success_count += 1

        try:
            db.session.commit()
            return Response.success({
                'success_count': success_count,
                'error_count': len(error_list),
                'errors': error_list
            }, f'批量导入完成: 成功{success_count}条, 失败{len(error_list)}条')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'批量导入失败: {str(e)}')

    @staticmethod
    def delete_reading(reading_id):
        reading = MeterReading.query.filter(MeterReading.id == reading_id).first()
        if not reading:
            return Response.not_found('读数记录不存在')
        try:
            db.session.delete(reading)
            db.session.commit()
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class EnergyPriceService:
    @staticmethod
    def get_prices(page=1, size=10, energy_type_id=None, period=None):
        query = EnergyPrice.query
        if energy_type_id:
            query = query.filter(EnergyPrice.energy_type_id == energy_type_id)
        if period:
            query = query.filter(EnergyPrice.period == period)
        pagination = query.order_by(EnergyPrice.create_time.desc()).paginate(
            page=page, per_page=size, error_out=False
        )
        return Response.paginate(
            [p.to_dict() for p in pagination.items],
            pagination.total, page, size
        )

    @staticmethod
    def create_price(data):
        validation = Validator.validate_form(data, {
            'energy_type_id': ['required'],
            'period': ['required'],
            'price': ['required']
        })
        if not validation['valid']:
            return Response.bad_request(list(validation['errors'].values())[0])

        existing = EnergyPrice.query.filter_by(
            energy_type_id=data['energy_type_id'],
            period=data['period'],
            status=1
        ).first()
        if existing:
            existing.price = data['price']
            existing.start_time = data.get('start_time', existing.start_time)
            existing.end_time = data.get('end_time', existing.end_time)
            db.session.commit()
            return Response.success(existing.to_dict(), '单价已更新')

        price = EnergyPrice(
            energy_type_id=data['energy_type_id'],
            period=data['period'],
            start_time=data.get('start_time', ''),
            end_time=data.get('end_time', ''),
            price=data['price']
        )
        try:
            price.save()
            Log.add_log(g.user_id, g.username, 'create', 'energy_price',
                       f'配置能源单价: {data["period"]} = {data["price"]}')
            return Response.created({'id': price.id}, '创建成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'创建失败: {str(e)}')

    @staticmethod
    def update_price(price_id, data):
        price = EnergyPrice.query.filter(EnergyPrice.id == price_id).first()
        if not price:
            return Response.not_found('单价记录不存在')
        allowed = ['energy_type_id', 'period', 'start_time', 'end_time', 'price', 'status']
        update_data = {k: v for k, v in data.items() if k in allowed}
        try:
            price.update(**update_data)
            return Response.success(price.to_dict(), '更新成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'更新失败: {str(e)}')

    @staticmethod
    def delete_price(price_id):
        price = EnergyPrice.query.filter(EnergyPrice.id == price_id).first()
        if not price:
            return Response.not_found('单价记录不存在')
        try:
            price.delete()
            return Response.success(message='删除成功')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'删除失败: {str(e)}')


class EnergyCostService:
    @staticmethod
    def calculate_monthly_cost(year_month, metering_point_id=None):
        year, month = year_month.split('-')
        start_date = datetime(int(year), int(month), 1)
        if int(month) == 12:
            end_date = datetime(int(year) + 1, 1, 1) - timedelta(seconds=1)
        else:
            end_date = datetime(int(year), int(month) + 1, 1) - timedelta(seconds=1)

        query = MeterReading.query.filter(
            MeterReading.reading_time >= start_date,
            MeterReading.reading_time <= end_date
        )
        if metering_point_id:
            query = query.filter(MeterReading.metering_point_id == metering_point_id)

        readings = query.order_by(MeterReading.reading_time.asc()).all()

        point_readings = {}
        for r in readings:
            pid = r.metering_point_id
            if pid not in point_readings:
                point_readings[pid] = []
            point_readings[pid].append(r)

        results = []
        for pid, point_reading_list in point_readings.items():
            point = MeteringPoint.query.filter(MeteringPoint.id == pid).first()
            if not point:
                continue

            peak_total = 0
            flat_total = 0
            valley_total = 0

            prices = {}
            price_records = EnergyPrice.query.filter_by(
                energy_type_id=point.energy_type_id, status=1
            ).all()
            for pr in price_records:
                prices[pr.period] = float(pr.price)

            for r in point_reading_list:
                delta = float(r.delta_value)
                if delta <= 0:
                    continue
                hour = r.reading_time.hour
                if 8 <= hour < 11 or 18 <= hour < 21:
                    peak_total += delta
                elif 7 <= hour < 8 or 11 <= hour < 18 or 21 <= hour < 23:
                    flat_total += delta
                else:
                    valley_total += delta

            peak_price = prices.get('peak', 0)
            flat_price = prices.get('flat', 0)
            valley_price = prices.get('valley', 0)

            peak_cost = peak_total * peak_price
            flat_cost = flat_total * flat_price
            valley_cost = valley_total * valley_price
            total_consumption = peak_total + flat_total + valley_total
            total_cost = peak_cost + flat_cost + valley_cost

            summary = MonthlyCostSummary.query.filter_by(
                metering_point_id=pid,
                year_month=year_month
            ).first()

            if not summary:
                summary = MonthlyCostSummary(
                    metering_point_id=pid,
                    year_month=year_month,
                    energy_type_id=point.energy_type_id
                )
                db.session.add(summary)

            summary.total_consumption = total_consumption
            summary.peak_consumption = peak_total
            summary.flat_consumption = flat_total
            summary.valley_consumption = valley_total
            summary.peak_cost = peak_cost
            summary.flat_cost = flat_cost
            summary.valley_cost = valley_cost
            summary.total_cost = total_cost

            results.append(summary.to_dict())

        try:
            db.session.commit()
            return Response.success(results, '月度成本计算完成')
        except Exception as e:
            db.session.rollback()
            return Response.error(f'计算失败: {str(e)}')

    @staticmethod
    def get_monthly_cost(year_month, energy_type_id=None, workshop=None,
                        production_line_id=None, metering_point_id=None):
        query = MonthlyCostSummary.query.filter_by(year_month=year_month)
        if energy_type_id:
            query = query.filter(MonthlyCostSummary.energy_type_id == energy_type_id)
        if metering_point_id:
            query = query.filter(MonthlyCostSummary.metering_point_id == metering_point_id)

        summaries = query.all()
        results = []
        for s in summaries:
            s_dict = s.to_dict()
            if workshop or production_line_id:
                point = MeteringPoint.query.filter(MeteringPoint.id == s.metering_point_id).first()
                if point:
                    if workshop and workshop not in (point.workshop or ''):
                        continue
                    if production_line_id and point.production_line_id != production_line_id:
                        continue
            results.append(s_dict)
        return Response.success(results)

    @staticmethod
    def get_cost_comparison(year_month, compare_type='mom'):
        current_summaries = MonthlyCostSummary.query.filter_by(year_month=year_month).all()

        year, month = year_month.split('-')
        year = int(year)
        month = int(month)

        if compare_type == 'mom':
            if month == 1:
                prev_ym = f'{year - 1}-12'
            else:
                prev_ym = f'{year}-{month - 1:02d}'
        else:
            prev_ym = f'{year - 1}-{month:02d}'

        prev_summaries = MonthlyCostSummary.query.filter_by(year_month=prev_ym).all()

        current_by_type = {}
        for s in current_summaries:
            eid = s.energy_type_id
            if eid not in current_by_type:
                current_by_type[eid] = 0
            current_by_type[eid] += float(s.total_cost)

        prev_by_type = {}
        for s in prev_summaries:
            eid = s.energy_type_id
            if eid not in prev_by_type:
                prev_by_type[eid] = 0
            prev_by_type[eid] += float(s.total_cost)

        all_type_ids = set(list(current_by_type.keys()) + list(prev_by_type.keys()))
        comparison = []
        for eid in all_type_ids:
            et = EnergyType.query.filter(EnergyType.id == eid).first()
            current_val = current_by_type.get(eid, 0)
            prev_val = prev_by_type.get(eid, 0)
            change_rate = 0
            if prev_val > 0:
                change_rate = round((current_val - prev_val) / prev_val * 100, 2)
            comparison.append({
                'energy_type_id': eid,
                'energy_type_name': et.type_name if et else '未知',
                'current_cost': current_val,
                'previous_cost': prev_val,
                'change_rate': change_rate,
                'compare_type': '环比' if compare_type == 'mom' else '同比'
            })

        current_total = sum(current_by_type.values())
        prev_total = sum(prev_by_type.values())
        total_change_rate = 0
        if prev_total > 0:
            total_change_rate = round((current_total - prev_total) / prev_total * 100, 2)

        return Response.success({
            'year_month': year_month,
            'previous_year_month': prev_ym,
            'current_total': current_total,
            'previous_total': prev_total,
            'total_change_rate': total_change_rate,
            'by_energy_type': comparison
        })


class EnergyAnomalyService:
    @staticmethod
    def check_anomaly(metering_point_id, delta_value, reading_time):
        point = MeteringPoint.query.filter(MeteringPoint.id == metering_point_id).first()
        if not point:
            return

        seven_days_ago = reading_time - timedelta(days=7)
        readings = MeterReading.query.filter(
            MeterReading.metering_point_id == metering_point_id,
            MeterReading.reading_time >= seven_days_ago,
            MeterReading.reading_time < reading_time
        ).all()

        if len(readings) < 2:
            return

        daily_deltas = {}
        for r in readings:
            day_key = r.reading_time.strftime('%Y-%m-%d')
            if day_key not in daily_deltas:
                daily_deltas[day_key] = 0
            daily_deltas[day_key] += float(r.delta_value)

        if not daily_deltas:
            return

        avg_daily = sum(daily_deltas.values()) / len(daily_deltas)
        if avg_daily <= 0:
            return

        if delta_value > avg_daily * 2:
            now = datetime.now()
            alert_code = f"ALERT-{now.strftime('%Y%m%d%H%M%S')}-{AlertRecord.query.count() + 1}"
            alert = AlertRecord(
                alert_code=alert_code,
                alert_type='energy_anomaly',
                severity='warning',
                message=f'能源异常波动：计量点{point.point_name}({point.point_code})本次消耗{delta_value:.2f}，过去7天日均{avg_daily:.2f}，超过200%阈值',
                value=delta_value,
                threshold=avg_daily * 2,
                status='active'
            )
            db.session.add(alert)
            db.session.commit()


class EnergyDashboardService:
    @staticmethod
    def get_dashboard():
        energy_types = EnergyType.query.filter_by(status=1).all()
        cards = []
        for et in energy_types:
            point_ids = [p.id for p in et.metering_points.filter_by(status=1).all()]
            total_consumption = 0
            today_consumption = 0
            today_cost = 0
            total_cost = 0

            if point_ids:
                now = datetime.now()
                today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

                today_readings = MeterReading.query.filter(
                    MeterReading.metering_point_id.in_(point_ids),
                    MeterReading.reading_time >= today_start
                ).all()
                for r in today_readings:
                    today_consumption += float(r.delta_value)

                all_readings = MeterReading.query.filter(
                    MeterReading.metering_point_id.in_(point_ids)
                ).all()
                for r in all_readings:
                    total_consumption += float(r.delta_value)

                current_month = now.strftime('%Y-%m')
                summaries = MonthlyCostSummary.query.filter(
                    MonthlyCostSummary.energy_type_id == et.id,
                    MonthlyCostSummary.year_month == current_month
                ).all()
                for s in summaries:
                    total_cost += float(s.total_cost)

                prices = {}
                price_records = EnergyPrice.query.filter_by(
                    energy_type_id=et.id, status=1
                ).all()
                for pr in price_records:
                    prices[pr.period] = float(pr.price)

                for r in today_readings:
                    delta = float(r.delta_value)
                    if delta <= 0:
                        continue
                    hour = r.reading_time.hour
                    if 8 <= hour < 11 or 18 <= hour < 21:
                        today_cost += delta * prices.get('peak', 0)
                    elif 7 <= hour < 8 or 11 <= hour < 18 or 21 <= hour < 23:
                        today_cost += delta * prices.get('flat', 0)
                    else:
                        today_cost += delta * prices.get('valley', 0)

            cards.append({
                'energy_type_id': et.id,
                'energy_type_name': et.type_name,
                'energy_type_code': et.type_code,
                'unit': et.unit,
                'total_consumption': round(total_consumption, 2),
                'today_consumption': round(today_consumption, 2),
                'today_cost': round(today_cost, 2),
                'month_cost': round(total_cost, 2),
                'point_count': len(point_ids)
            })

        return Response.success({
            'energy_cards': cards,
            'total_today_cost': round(sum(c['today_cost'] for c in cards), 2),
            'total_month_cost': round(sum(c['month_cost'] for c in cards), 2)
        })

    @staticmethod
    def get_consumption_trend(days=7, energy_type_id=None):
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days - 1)
        start_date = start_date.replace(hour=0, minute=0, second=0, microsecond=0)

        date_list = []
        for i in range(days):
            d = start_date + timedelta(days=i)
            date_list.append(d.strftime('%Y-%m-%d'))

        query = MeterReading.query.filter(
            MeterReading.reading_time >= start_date,
            MeterReading.reading_time <= end_date
        )

        if energy_type_id:
            point_ids = [p.id for p in MeteringPoint.query.filter_by(
                energy_type_id=energy_type_id, status=1
            ).all()]
            if point_ids:
                query = query.filter(MeterReading.metering_point_id.in_(point_ids))
            else:
                return Response.success([])

        readings = query.all()

        trend_by_type = {}
        for r in readings:
            point = MeteringPoint.query.filter(MeteringPoint.id == r.metering_point_id).first()
            if not point:
                continue
            et_id = point.energy_type_id
            if et_id not in trend_by_type:
                et = EnergyType.query.filter(EnergyType.id == et_id).first()
                trend_by_type[et_id] = {
                    'energy_type_id': et_id,
                    'energy_type_name': et.type_name if et else '未知',
                    'unit': et.unit if et else '',
                    'daily': {d: 0 for d in date_list}
                }
            day_key = r.reading_time.strftime('%Y-%m-%d')
            if day_key in trend_by_type[et_id]['daily']:
                trend_by_type[et_id]['daily'][day_key] += float(r.delta_value)

        result = []
        for et_id, data in trend_by_type.items():
            data['trend'] = [{'date': d, 'value': round(data['daily'][d], 2)} for d in date_list]
            del data['daily']
            result.append(data)

        return Response.success(result)

    @staticmethod
    def get_workshop_comparison(year_month):
        summaries = MonthlyCostSummary.query.filter_by(year_month=year_month).all()

        workshop_data = {}
        for s in summaries:
            point = MeteringPoint.query.filter(MeteringPoint.id == s.metering_point_id).first()
            if not point:
                continue
            ws = point.workshop or '未分配'
            et = EnergyType.query.filter(EnergyType.id == s.energy_type_id).first()
            et_name = et.type_name if et else '未知'

            if ws not in workshop_data:
                workshop_data[ws] = {}
            if et_name not in workshop_data[ws]:
                workshop_data[ws][et_name] = 0
            workshop_data[ws][et_name] += float(s.total_cost)

        energy_types = list(set(
            et_name for ws_data in workshop_data.values() for et_name in ws_data.keys()
        ))

        result = []
        for ws, et_data in workshop_data.items():
            total = sum(et_data.values())
            result.append({
                'workshop': ws,
                'total_cost': round(total, 2),
                'by_energy_type': {et_name: round(et_data.get(et_name, 0), 2) for et_name in energy_types}
            })

        result.sort(key=lambda x: x['total_cost'], reverse=True)

        return Response.success({
            'year_month': year_month,
            'energy_types': energy_types,
            'workshops': result
        })

    @staticmethod
    def get_today_cost():
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        readings = MeterReading.query.filter(
            MeterReading.reading_time >= today_start
        ).all()

        total_cost = 0
        total_consumption = 0
        for r in readings:
            delta = float(r.delta_value)
            if delta <= 0:
                continue
            total_consumption += delta
            point = MeteringPoint.query.filter(MeteringPoint.id == r.metering_point_id).first()
            if not point:
                continue
            prices = {}
            price_records = EnergyPrice.query.filter_by(
                energy_type_id=point.energy_type_id, status=1
            ).all()
            for pr in price_records:
                prices[pr.period] = float(pr.price)

            hour = r.reading_time.hour
            if 8 <= hour < 11 or 18 <= hour < 21:
                total_cost += delta * prices.get('peak', 0)
            elif 7 <= hour < 8 or 11 <= hour < 18 or 21 <= hour < 23:
                total_cost += delta * prices.get('flat', 0)
            else:
                total_cost += delta * prices.get('valley', 0)

        return Response.success({
            'today_cost': round(total_cost, 2),
            'today_consumption': round(total_consumption, 2)
        })

    @staticmethod
    def get_aggregated_stats(energy_type_id=None, workshop=None, production_line_id=None):
        query = MeteringPoint.query.filter_by(status=1)
        if energy_type_id:
            query = query.filter(MeteringPoint.energy_type_id == energy_type_id)
        if production_line_id:
            query = query.filter(MeteringPoint.production_line_id == production_line_id)
        if workshop:
            query = query.filter(MeteringPoint.workshop.like(f'%{workshop}%'))

        points = query.all()
        result = []
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        for p in points:
            today_readings = MeterReading.query.filter(
                MeterReading.metering_point_id == p.id,
                MeterReading.reading_time >= today_start
            ).all()
            today_delta = sum(float(r.delta_value) for r in today_readings)

            last_reading = MeterReading.query.filter(
                MeterReading.metering_point_id == p.id
            ).order_by(MeterReading.reading_time.desc()).first()

            result.append({
                'point_id': p.id,
                'point_code': p.point_code,
                'point_name': p.point_name,
                'workshop': p.workshop,
                'today_consumption': round(today_delta, 2),
                'last_reading_time': last_reading.reading_time.strftime('%Y-%m-%d %H:%M:%S') if last_reading else None,
                'last_cumulative_value': float(last_reading.cumulative_value) if last_reading else None
            })

        return Response.success(result)
