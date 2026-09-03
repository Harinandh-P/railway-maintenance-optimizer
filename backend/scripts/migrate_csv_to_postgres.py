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
                required_equipment, required_materials, due_date, status, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                str(row.get('status', 'PENDING')),
                str(row.get('created_by', 'Employee'))
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

    # 4. Train Master Migration
    if AppConfig.TRAIN_MASTER_CSV.exists():
        df_tm = pd.read_csv(AppConfig.TRAIN_MASTER_CSV)
        tm_cnt = 0
        for _, row in df_tm.iterrows():
            t_id = str(row.get('train_id', ''))
            if not t_id or t_id == 'nan':
                continue
            stmt = """
            INSERT INTO train_master (train_id, train_number, train_name, train_type, traffic_type, origin, destination, direction, running_days, frequency_per_hour, priority_class, operational_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(train_id) DO NOTHING
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
            tm_cnt += 1
        migration_summary['train_master'] = tm_cnt

    # 5. Train Routes Migration
    if AppConfig.TRAIN_ROUTES_CSV.exists():
        df_tr = pd.read_csv(AppConfig.TRAIN_ROUTES_CSV)
        tr_cnt = 0
        for _, row in df_tr.iterrows():
            stmt = """
            INSERT INTO train_routes (train_id, train_number, sequence, station_code, station_name, arrival_time, departure_time, distance_from_origin, distance_from_previous_station, corridor_id, section_id, direction, km_location, from_km, to_km, previous_station, next_station, track_id, railway_division)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            tr_cnt += 1
        migration_summary['train_routes'] = tr_cnt

    # 6. Station KM Mapping Migration
    if AppConfig.STATION_KM_CSV.exists():
        df_skm = pd.read_csv(AppConfig.STATION_KM_CSV)
        skm_cnt = 0
        for _, row in df_skm.iterrows():
            m_id = str(row.get('mapping_id', ''))
            if not m_id or m_id == 'nan':
                continue
            stmt = """
            INSERT INTO station_km_mapping (mapping_id, corridor_id, section_id, section_name, start_station_code, start_station_name, start_km, end_station_code, end_station_name, end_km, direction, line_name, track_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(mapping_id) DO NOTHING
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
            skm_cnt += 1
        migration_summary['station_km_mapping'] = skm_cnt

    # 7. Corridor Data Migration
    if AppConfig.CORRIDOR_CSV.exists():
        df_c = pd.read_csv(AppConfig.CORRIDOR_CSV)
        c_cnt = 0
        for _, row in df_c.iterrows():
            c_id = str(row.get('corridor_id', ''))
            if not c_id or c_id == 'nan':
                continue
            stmt = """
            INSERT INTO corridor_data (corridor_id, track_id, track_capacity, current_occupancy, direction, compatible_train_types, alternative_routing_possible, block_availability, existing_restrictions, maintenance_restrictions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(corridor_id) DO NOTHING
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
            c_cnt += 1
        migration_summary['corridor_data'] = c_cnt

    # 8. Maintenance History Migration
    if AppConfig.HISTORY_CSV.exists():
        df_h = pd.read_csv(AppConfig.HISTORY_CSV)
        h_cnt = 0
        for _, row in df_h.iterrows():
            t_id = str(row.get('task_id', ''))
            if not t_id or t_id == 'nan':
                continue
            stmt = """
            INSERT INTO maintenance_history (task_id, asset_id, location, department, maintenance_type, defect_type, defect_reason, severity, planned_duration_hours, actual_duration_hours, previous_failure, failure_date, maintenance_date, next_scheduled_maintenance, overdue_days, previous_priority, train_operational_impact, workers_used, equipment_used, materials_used)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(task_id) DO NOTHING
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
            h_cnt += 1
        migration_summary['maintenance_history'] = h_cnt

    # 9. Users Count
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
