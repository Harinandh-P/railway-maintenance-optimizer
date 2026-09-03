import pandas as pd
from pathlib import Path
from typing import Tuple, List, Dict, Any
from backend.services.validation_service import ValidationService
from backend.database import execute_query, execute_statement

class CSVService:

    @staticmethod
    def read_csv(file_path: Path) -> List[Dict[str, Any]]:
        # Database adapter query matching file_path
        filename = file_path.name
        if filename == "maintenance_requests.csv":
            res = execute_query("SELECT * FROM maintenance_requests ORDER BY created_at DESC")
            if res:
                return res
        elif filename == "worker_database.csv":
            res = execute_query("SELECT * FROM workers")
            if res:
                return res
        elif filename == "equipment_database.csv":
            res = execute_query("SELECT * FROM equipment")
            if res:
                return res
        elif filename == "train_master.csv":
            res = execute_query("SELECT * FROM train_master")
            if res:
                return res
        elif filename == "train_routes.csv":
            res = execute_query("SELECT * FROM train_routes ORDER BY sequence ASC")
            if res:
                return res
        elif filename == "station_km_mapping.csv":
            res = execute_query("SELECT * FROM station_km_mapping")
            if res:
                return res
        elif filename == "corridor_data.csv":
            res = execute_query("SELECT * FROM corridor_data")
            if res:
                return res
        elif filename == "maintenance_history.csv":
            res = execute_query("SELECT * FROM maintenance_history")
            if res:
                return res

        # Local file fallback
        if not file_path.exists():
            return []
        df = pd.read_csv(file_path)
        return df.fillna("").to_dict(orient="records")

    @staticmethod
    def write_csv(file_path: Path, data: List[Dict[str, Any]], dataset_type: str = "generic") -> Tuple[bool, List[str]]:
        df = pd.DataFrame(data)

        # Pre-save validation
        is_valid = True
        errors = []

        if dataset_type == "requests":
            is_valid, errors = ValidationService.validate_maintenance_requests(df)
        elif dataset_type == "train_master":
            is_valid, errors = ValidationService.validate_train_master(df)
        elif dataset_type == "train_routes":
            is_valid, errors = ValidationService.validate_train_routes(df)
        elif dataset_type == "workers":
            is_valid, errors = ValidationService.validate_workers(df)
        elif dataset_type == "equipment":
            is_valid, errors = ValidationService.validate_equipment(df)

        if not is_valid:
            return False, errors

        # Sync to Database
        filename = file_path.name
        if filename == "maintenance_requests.csv":
            for row in data:
                req_id = str(row.get('request_id', '')).strip()
                if not req_id:
                    continue
                stmt = """
                INSERT INTO maintenance_requests (
                    request_id, request_datetime, department, asset_id, asset_type, location,
                    point_a, point_b, corridor_id, section_id, maintenance_type, defect_type,
                    defect_reason, defect_severity, safety_risk, safety_risk_description,
                    fault_description, required_duration_hours, required_workers,
                    required_equipment, required_materials, due_date, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(request_id) DO UPDATE SET
                    request_datetime = EXCLUDED.request_datetime,
                    department = EXCLUDED.department,
                    asset_id = EXCLUDED.asset_id,
                    asset_type = EXCLUDED.asset_type,
                    location = EXCLUDED.location,
                    point_a = EXCLUDED.point_a,
                    point_b = EXCLUDED.point_b,
                    corridor_id = EXCLUDED.corridor_id,
                    section_id = EXCLUDED.section_id,
                    maintenance_type = EXCLUDED.maintenance_type,
                    defect_type = EXCLUDED.defect_type,
                    defect_reason = EXCLUDED.defect_reason,
                    defect_severity = EXCLUDED.defect_severity,
                    safety_risk = EXCLUDED.safety_risk,
                    safety_risk_description = EXCLUDED.safety_risk_description,
                    fault_description = EXCLUDED.fault_description,
                    required_duration_hours = EXCLUDED.required_duration_hours,
                    required_workers = EXCLUDED.required_workers,
                    required_equipment = EXCLUDED.required_equipment,
                    required_materials = EXCLUDED.required_materials,
                    due_date = EXCLUDED.due_date,
                    status = EXCLUDED.status,
                    created_by = EXCLUDED.created_by
                """
                params = (
                    req_id,
                    str(row.get('request_datetime', '2026-08-28 10:00')),
                    str(row.get('department', 'Engineering')),
                    str(row.get('asset_id', 'TRK001')),
                    str(row.get('asset_type', 'Track')),
                    str(row.get('location', 'KM 125/4')),
                    str(row.get('point_a', 'Station A')),
                    str(row.get('point_b', 'Station B')),
                    str(row.get('corridor_id', 'C1')),
                    str(row.get('section_id', 'C1-S1')),
                    str(row.get('maintenance_type', 'Corrective')),
                    str(row.get('defect_type', 'Track Defect')),
                    str(row.get('defect_reason', 'Thermal Stress')),
                    str(row.get('defect_severity', 'High')),
                    str(row.get('safety_risk', 'High')),
                    str(row.get('safety_risk_description', 'Risk of derailing')),
                    str(row.get('fault_description', 'Track joint defect')),
                    float(row.get('required_duration_hours', 2.0)),
                    int(row.get('required_workers', 4)),
                    str(row.get('required_equipment', 'Track Machine')),
                    str(row.get('required_materials', 'Fasteners')),
                    str(row.get('due_date', '2026-08-30')),
                    str(row.get('status', 'PENDING')),
                    str(row.get('created_by', 'Employee'))
                )
                execute_statement(stmt, params)

        elif filename == "train_master.csv":
            for row in data:
                t_id = str(row.get('train_id', '')).strip()
                if not t_id:
                    continue
                stmt = """
                INSERT INTO train_master (
                    train_id, train_number, train_name, train_type, traffic_type,
                    origin, destination, direction, running_days, frequency_per_hour,
                    priority_class, operational_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(train_id) DO UPDATE SET
                    train_number = EXCLUDED.train_number,
                    train_name = EXCLUDED.train_name,
                    train_type = EXCLUDED.train_type,
                    traffic_type = EXCLUDED.traffic_type,
                    origin = EXCLUDED.origin,
                    destination = EXCLUDED.destination,
                    direction = EXCLUDED.direction,
                    running_days = EXCLUDED.running_days,
                    frequency_per_hour = EXCLUDED.frequency_per_hour,
                    priority_class = EXCLUDED.priority_class,
                    operational_status = EXCLUDED.operational_status
                """
                params = (
                    t_id,
                    str(row.get('train_number', '')),
                    str(row.get('train_name', '')),
                    str(row.get('train_type', '')),
                    str(row.get('traffic_type', '')),
                    str(row.get('origin', '')),
                    str(row.get('destination', '')),
                    str(row.get('direction', '')),
                    str(row.get('running_days', '')),
                    int(row.get('frequency_per_hour', 1)),
                    str(row.get('priority_class', '')),
                    str(row.get('operational_status', 'Active'))
                )
                execute_statement(stmt, params)

        elif filename == "train_routes.csv":
            execute_statement("DELETE FROM train_routes")
            for row in data:
                stmt = """
                INSERT INTO train_routes (
                    train_id, train_number, sequence, station_code, station_name,
                    arrival_time, departure_time, distance_from_origin, distance_from_previous_station,
                    corridor_id, section_id, direction, km_location, from_km, to_km,
                    previous_station, next_station, track_id, railway_division
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """
                params = (
                    str(row.get('train_id', '')),
                    str(row.get('train_number', '')),
                    int(row.get('sequence', 1)),
                    str(row.get('station_code', '')),
                    str(row.get('station_name', '')),
                    str(row.get('arrival_time', '')),
                    str(row.get('departure_time', '')),
                    float(row.get('distance_from_origin', 0.0)),
                    float(row.get('distance_from_previous_station', 0.0)),
                    str(row.get('corridor_id', '')),
                    str(row.get('section_id', '')),
                    str(row.get('direction', '')),
                    float(row.get('km_location', 0.0)),
                    float(row.get('from_km', 0.0)),
                    float(row.get('to_km', 0.0)),
                    str(row.get('previous_station', '')),
                    str(row.get('next_station', '')),
                    str(row.get('track_id', '')),
                    str(row.get('railway_division', ''))
                )
                execute_statement(stmt, params)

        elif filename == "station_km_mapping.csv":
            for row in data:
                m_id = str(row.get('mapping_id', '')).strip()
                if not m_id:
                    continue
                stmt = """
                INSERT INTO station_km_mapping (
                    mapping_id, corridor_id, section_id, section_name, start_station_code,
                    start_station_name, start_km, end_station_code, end_station_name, end_km,
                    direction, line_name, track_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(mapping_id) DO UPDATE SET
                    corridor_id = EXCLUDED.corridor_id,
                    section_id = EXCLUDED.section_id,
                    section_name = EXCLUDED.section_name,
                    start_station_code = EXCLUDED.start_station_code,
                    start_station_name = EXCLUDED.start_station_name,
                    start_km = EXCLUDED.start_km,
                    end_station_code = EXCLUDED.end_station_code,
                    end_station_name = EXCLUDED.end_station_name,
                    end_km = EXCLUDED.end_km,
                    direction = EXCLUDED.direction,
                    line_name = EXCLUDED.line_name,
                    track_id = EXCLUDED.track_id
                """
                params = (
                    m_id,
                    str(row.get('corridor_id', '')),
                    str(row.get('section_id', '')),
                    str(row.get('section_name', '')),
                    str(row.get('start_station_code', '')),
                    str(row.get('start_station_name', '')),
                    float(row.get('start_km', 0.0)),
                    str(row.get('end_station_code', '')),
                    str(row.get('end_station_name', '')),
                    float(row.get('end_km', 0.0)),
                    str(row.get('direction', '')),
                    str(row.get('line_name', '')),
                    str(row.get('track_id', ''))
                )
                execute_statement(stmt, params)

        elif filename == "corridor_data.csv":
            for row in data:
                c_id = str(row.get('corridor_id', '')).strip()
                if not c_id:
                    continue
                stmt = """
                INSERT INTO corridor_data (
                    corridor_id, track_id, track_capacity, current_occupancy, direction,
                    compatible_train_types, alternative_routing_possible, block_availability,
                    existing_restrictions, maintenance_restrictions
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(corridor_id, track_id) DO UPDATE SET
                    track_id = EXCLUDED.track_id,
                    track_capacity = EXCLUDED.track_capacity,
                    current_occupancy = EXCLUDED.current_occupancy,
                    direction = EXCLUDED.direction,
                    compatible_train_types = EXCLUDED.compatible_train_types,
                    alternative_routing_possible = EXCLUDED.alternative_routing_possible,
                    block_availability = EXCLUDED.block_availability,
                    existing_restrictions = EXCLUDED.existing_restrictions,
                    maintenance_restrictions = EXCLUDED.maintenance_restrictions
                """
                params = (
                    c_id,
                    str(row.get('track_id', '')),
                    int(row.get('track_capacity', 0)),
                    int(row.get('current_occupancy', 0)),
                    str(row.get('direction', '')),
                    str(row.get('compatible_train_types', '')),
                    str(row.get('alternative_routing_possible', '')),
                    str(row.get('block_availability', '')),
                    str(row.get('existing_restrictions', '')),
                    str(row.get('maintenance_restrictions', ''))
                )
                execute_statement(stmt, params)

        elif filename == "worker_database.csv":
            for row in data:
                w_id = str(row.get('worker_id', '')).strip()
                if not w_id:
                    continue
                stmt = """
                INSERT INTO workers (worker_id, worker_name, worker_type, skill, skill_level, qualification_level, experience_years, corridor, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(worker_id) DO UPDATE SET
                    worker_name = EXCLUDED.worker_name,
                    worker_type = EXCLUDED.worker_type,
                    skill = EXCLUDED.skill,
                    skill_level = EXCLUDED.skill_level,
                    qualification_level = EXCLUDED.qualification_level,
                    experience_years = EXCLUDED.experience_years,
                    corridor = EXCLUDED.corridor,
                    status = EXCLUDED.status
                """
                params = (
                    w_id,
                    str(row.get('worker_name', f'Worker {w_id}')),
                    str(row.get('worker_type', 'TRACK')),
                    str(row.get('skill', 'Technician')),
                    str(row.get('skill_level', '3')),
                    str(row.get('qualification_level', 'Senior Technician')),
                    str(row.get('experience_years', '5')),
                    str(row.get('corridor', 'C1')),
                    str(row.get('status', 'Available'))
                )
                execute_statement(stmt, params)

        elif filename == "equipment_database.csv":
            for row in data:
                eq_id = str(row.get('equipment_id', '')).strip()
                if not eq_id:
                    continue
                stmt = """
                INSERT INTO equipment (equipment_id, equipment_name, equipment_type, equipment_category, condition, corridor, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(equipment_id) DO UPDATE SET
                    equipment_name = EXCLUDED.equipment_name,
                    equipment_type = EXCLUDED.equipment_type,
                    equipment_category = EXCLUDED.equipment_category,
                    condition = EXCLUDED.condition,
                    corridor = EXCLUDED.corridor,
                    status = EXCLUDED.status
                """
                params = (
                    eq_id,
                    str(row.get('equipment_name', f'Equipment {eq_id}')),
                    str(row.get('equipment_type', 'Specialized Equipment')),
                    str(row.get('equipment_category', 'Maintenance')),
                    str(row.get('condition', 'Good')),
                    str(row.get('corridor', 'C1')),
                    str(row.get('status', 'Available'))
                )
                execute_statement(stmt, params)

        elif filename == "maintenance_history.csv":
            for row in data:
                t_id = str(row.get('task_id', '')).strip()
                if not t_id:
                    continue
                stmt = """
                INSERT INTO maintenance_history (
                    task_id, asset_id, location, department, maintenance_type, defect_type,
                    defect_reason, severity, planned_duration_hours, actual_duration_hours,
                    previous_failure, failure_date, maintenance_date, next_scheduled_maintenance,
                    overdue_days, previous_priority, train_operational_impact, workers_used,
                    equipment_used, materials_used
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(task_id) DO UPDATE SET
                    asset_id = EXCLUDED.asset_id,
                    location = EXCLUDED.location,
                    department = EXCLUDED.department,
                    maintenance_type = EXCLUDED.maintenance_type,
                    defect_type = EXCLUDED.defect_type,
                    defect_reason = EXCLUDED.defect_reason,
                    severity = EXCLUDED.severity,
                    planned_duration_hours = EXCLUDED.planned_duration_hours,
                    actual_duration_hours = EXCLUDED.actual_duration_hours,
                    previous_failure = EXCLUDED.previous_failure,
                    failure_date = EXCLUDED.failure_date,
                    maintenance_date = EXCLUDED.maintenance_date,
                    next_scheduled_maintenance = EXCLUDED.next_scheduled_maintenance,
                    overdue_days = EXCLUDED.overdue_days,
                    previous_priority = EXCLUDED.previous_priority,
                    train_operational_impact = EXCLUDED.train_operational_impact,
                    workers_used = EXCLUDED.workers_used,
                    equipment_used = EXCLUDED.equipment_used,
                    materials_used = EXCLUDED.materials_used
                """
                params = (
                    t_id,
                    str(row.get('asset_id', '')),
                    str(row.get('location', '')),
                    str(row.get('department', '')),
                    str(row.get('maintenance_type', '')),
                    str(row.get('defect_type', '')),
                    str(row.get('defect_reason', '')),
                    str(row.get('severity', '')),
                    float(row.get('planned_duration_hours', 0.0)),
                    float(row.get('actual_duration_hours', 0.0)),
                    str(row.get('previous_failure', '')),
                    str(row.get('failure_date', '')),
                    str(row.get('maintenance_date', '')),
                    str(row.get('next_scheduled_maintenance', '')),
                    int(row.get('overdue_days', 0)),
                    float(row.get('previous_priority', 0.0)),
                    str(row.get('train_operational_impact', '')),
                    str(row.get('workers_used', '')),
                    str(row.get('equipment_used', '')),
                    str(row.get('materials_used', ''))
                )
                execute_statement(stmt, params)

        # Write to local file backup
        file_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(file_path, index=False)
        return True, ["Successfully saved to Database and CSV"]

    @staticmethod
    def delete_record(file_path: Path, table_name: str, pk_col: str, pk_val: str) -> bool:
        # Delete from Database
        execute_statement(f"DELETE FROM {table_name} WHERE {pk_col} = ?", (pk_val,))

        # Delete from local CSV backup
        if file_path.exists():
            try:
                df = pd.read_csv(file_path)
                if pk_col in df.columns:
                    df = df[df[pk_col].astype(str) != str(pk_val)]
                    df.to_csv(file_path, index=False)
            except Exception as e:
                print(f"[CSVService] CSV backup delete notice: {e}")
        return True
