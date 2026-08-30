import sys
import os
import json
import pandas as pd
from pathlib import Path

# Add project root to sys.path
project_root = Path(__file__).resolve().parent.parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

from config import AppConfig
from backend.database import init_db, execute_statement, execute_query, is_postgres

def migrate_datasets():
    print("==================================================")
    print(f"[MIGRATION] STARTING DATASET MIGRATION (Mode: {'PostgreSQL Supabase' if is_postgres() else 'Local SQLite'})")
    print("==================================================")

    init_db()
    migration_summary = {}

    # 1. Maintenance Requests Migration
    if AppConfig.REQUESTS_CSV.exists():
        df = pd.read_csv(AppConfig.REQUESTS_CSV)
        count = 0
        for _, row in df.iterrows():
            req_id = str(row.get('request_id', ''))
            if not req_id or req_id == 'nan':
                continue
            
            stmt = """
            INSERT INTO maintenance_requests (
                request_id, request_datetime, department, asset_id, asset_type, location,
                point_a, point_b, corridor_id, section_id, maintenance_type, defect_type,
                defect_reason, defect_severity, safety_risk, safety_risk_description,
                fault_description, required_duration_hours, required_workers,
                required_equipment, required_materials, due_date, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(request_id) DO NOTHING
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
            count += 1
        migration_summary['maintenance_requests'] = count

    # 2. Workers Migration
    if AppConfig.WORKER_DB_CSV.exists():
        df_w = pd.read_csv(AppConfig.WORKER_DB_CSV)
        w_cnt = 0
        for _, row in df_w.iterrows():
            w_id = str(row.get('worker_id', ''))
            if not w_id or w_id == 'nan':
                continue
            
            stmt = """
            INSERT INTO workers (worker_id, worker_name, worker_type, skill, skill_level, qualification_level, experience_years, corridor, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(worker_id) DO NOTHING
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
            w_cnt += 1
        migration_summary['workers'] = w_cnt

    # 3. Equipment Migration
    if AppConfig.EQUIPMENT_DB_CSV.exists():
        df_e = pd.read_csv(AppConfig.EQUIPMENT_DB_CSV)
        e_cnt = 0
        for _, row in df_e.iterrows():
            eq_id = str(row.get('equipment_id', ''))
            if not eq_id or eq_id == 'nan':
                continue
            
            stmt = """
            INSERT INTO equipment (equipment_id, equipment_name, equipment_type, equipment_category, condition, corridor, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(equipment_id) DO NOTHING
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
            e_cnt += 1
        migration_summary['equipment'] = e_cnt

    # 4. Users Count
    u_res = execute_query("SELECT COUNT(*) as count FROM users")
    migration_summary['users'] = u_res[0]['count'] if u_res else 0

    print("==================================================")
    print("[MIGRATION COMPLETED SUCCESSFULLY]")
    for table, cnt in migration_summary.items():
        print(f"  • {table}: {cnt} records migrated/verified")
    print("==================================================")

    return migration_summary

if __name__ == "__main__":
    migrate_datasets()
