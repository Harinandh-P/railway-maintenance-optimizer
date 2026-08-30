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
                    required_equipment, required_materials, due_date, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(request_id) DO UPDATE SET
                    department = EXCLUDED.department,
                    asset_id = EXCLUDED.asset_id,
                    location = EXCLUDED.location,
                    defect_type = EXCLUDED.defect_type,
                    defect_severity = EXCLUDED.defect_severity,
                    safety_risk = EXCLUDED.safety_risk,
                    required_duration_hours = EXCLUDED.required_duration_hours,
                    required_workers = EXCLUDED.required_workers,
                    required_equipment = EXCLUDED.required_equipment,
                    due_date = EXCLUDED.due_date,
                    status = EXCLUDED.status
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
                    str(row.get('status', 'PENDING'))
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

        # Write to local file backup
        file_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(file_path, index=False)
        return True, ["Successfully saved to Database and CSV"]
