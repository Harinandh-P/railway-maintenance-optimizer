import os
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Optional
from config import AppConfig

# Use SQLAlchemy engine for PostgreSQL if DATABASE_URL is set
_sqlalchemy_engine = None

def is_postgres() -> bool:
    return bool(AppConfig.DATABASE_URL and AppConfig.DATABASE_URL.startswith("postgresql"))

def get_postgres_engine():
    global _sqlalchemy_engine
    if _sqlalchemy_engine is None and is_postgres():
        from sqlalchemy import create_engine
        db_url = AppConfig.DATABASE_URL
        if db_url.startswith("postgres://"):
            db_url = db_url.replace("postgres://", "postgresql://", 1)
        _sqlalchemy_engine = create_engine(db_url, pool_pre_ping=True)
    return _sqlalchemy_engine

def get_db_connection():
    if is_postgres():
        engine = get_postgres_engine()
        return engine.connect()
    else:
        AppConfig.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(AppConfig.DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn

def execute_query(query: str, params: tuple = ()) -> List[Dict[str, Any]]:
    if is_postgres():
        engine = get_postgres_engine()
        with engine.connect() as conn:
            pg_query = query.replace("?", "%s")
            res = conn.exec_driver_sql(pg_query, params)
            if res.returns_rows:
                columns = res.keys()
                return [dict(zip(columns, row)) for row in res.fetchall()]
            return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(query, params)
        if cursor.description:
            columns = [c[0] for c in cursor.description]
            results = [dict(zip(columns, row)) for row in cursor.fetchall()]
        else:
            results = []
        conn.close()
        return results

def execute_statement(statement: str, params: tuple = ()) -> int:
    if is_postgres():
        engine = get_postgres_engine()
        with engine.begin() as conn:
            pg_stmt = statement.replace("?", "%s")
            res = conn.exec_driver_sql(pg_stmt, params)
            return res.rowcount
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(statement, params)
        conn.commit()
        rowcount = cursor.rowcount
        conn.close()
        return rowcount

def init_db():
    from backend.auth import hash_password, generate_salt

    if is_postgres():
        engine = get_postgres_engine()
        with engine.begin() as conn:
            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                salt VARCHAR(100),
                full_name VARCHAR(150) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'OPERATOR')),
                department VARCHAR(50) DEFAULT 'ALL',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

            conn.exec_driver_sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS salt VARCHAR(100);")

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS audit_log (
                log_id SERIAL PRIMARY KEY,
                username VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL,
                action VARCHAR(100) NOT NULL,
                dataset VARCHAR(100),
                details TEXT,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS maintenance_requests (
                request_id VARCHAR(50) PRIMARY KEY,
                request_datetime VARCHAR(50),
                department VARCHAR(50),
                asset_id VARCHAR(50),
                asset_type VARCHAR(50),
                location VARCHAR(100),
                point_a VARCHAR(100),
                point_b VARCHAR(100),
                corridor_id VARCHAR(50),
                section_id VARCHAR(50),
                maintenance_type VARCHAR(50),
                defect_type VARCHAR(100),
                defect_reason VARCHAR(100),
                defect_severity VARCHAR(20),
                safety_risk VARCHAR(20),
                safety_risk_description TEXT,
                fault_description TEXT,
                required_duration_hours NUMERIC(5,2),
                required_workers INT,
                required_equipment TEXT,
                required_materials TEXT,
                due_date VARCHAR(50),
                status VARCHAR(30) DEFAULT 'PENDING',
                created_by VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS workers (
                worker_id VARCHAR(50) PRIMARY KEY,
                worker_name VARCHAR(150),
                worker_type VARCHAR(50),
                skill VARCHAR(100),
                skill_level VARCHAR(20),
                qualification_level VARCHAR(100),
                experience_years VARCHAR(20),
                corridor VARCHAR(50),
                location VARCHAR(100),
                date VARCHAR(50),
                maximum_daily_hours NUMERIC(4,2),
                shift_start VARCHAR(20),
                shift_end VARCHAR(20),
                available BOOLEAN DEFAULT TRUE,
                status VARCHAR(50) DEFAULT 'Available',
                current_assignment VARCHAR(100),
                emergency_available BOOLEAN DEFAULT TRUE
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS equipment (
                equipment_id VARCHAR(50) PRIMARY KEY,
                equipment_name VARCHAR(150),
                equipment_type VARCHAR(100),
                equipment_category VARCHAR(100),
                equipment_model VARCHAR(100),
                quantity INT DEFAULT 1,
                condition VARCHAR(50),
                operational BOOLEAN DEFAULT TRUE,
                corridor VARCHAR(50),
                location VARCHAR(100),
                date VARCHAR(50),
                available BOOLEAN DEFAULT TRUE,
                status VARCHAR(50) DEFAULT 'Available',
                availability_start VARCHAR(20),
                availability_end VARCHAR(20),
                current_assignment VARCHAR(100),
                maintenance_due_date VARCHAR(50),
                calibration_due_date VARCHAR(50),
                operator_required BOOLEAN DEFAULT FALSE,
                required_operator_skill VARCHAR(100),
                mobilization_time_minutes INT DEFAULT 0
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS train_master (
                train_id VARCHAR(50) PRIMARY KEY,
                train_number VARCHAR(50),
                train_name VARCHAR(150),
                train_type VARCHAR(50),
                traffic_type VARCHAR(50),
                origin VARCHAR(100),
                destination VARCHAR(100),
                direction VARCHAR(20),
                running_days VARCHAR(100),
                frequency_per_hour INT,
                priority_class VARCHAR(20),
                operational_status VARCHAR(50)
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS train_routes (
                route_id SERIAL PRIMARY KEY,
                train_id VARCHAR(50),
                train_number VARCHAR(50),
                sequence INT,
                station_code VARCHAR(20),
                station_name VARCHAR(100),
                arrival_time VARCHAR(20),
                departure_time VARCHAR(20),
                distance_from_origin NUMERIC(8,2),
                distance_from_previous_station NUMERIC(8,2),
                corridor_id VARCHAR(50),
                section_id VARCHAR(50),
                direction VARCHAR(20),
                km_location NUMERIC(8,2),
                from_km NUMERIC(8,2),
                to_km NUMERIC(8,2),
                previous_station VARCHAR(100),
                next_station VARCHAR(100),
                track_id VARCHAR(50),
                railway_division VARCHAR(50)
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS station_km_mapping (
                mapping_id VARCHAR(50) PRIMARY KEY,
                corridor_id VARCHAR(50),
                section_id VARCHAR(50),
                section_name VARCHAR(100),
                start_station_code VARCHAR(20),
                start_station_name VARCHAR(100),
                start_km NUMERIC(8,2),
                end_station_code VARCHAR(20),
                end_station_name VARCHAR(100),
                end_km NUMERIC(8,2),
                direction VARCHAR(20),
                line_name VARCHAR(100),
                track_id VARCHAR(50)
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS corridor_data (
                corridor_id VARCHAR(50),
                track_id VARCHAR(50),
                track_capacity INT,
                current_occupancy INT,
                direction VARCHAR(20),
                compatible_train_types TEXT,
                alternative_routing_possible VARCHAR(10),
                block_availability VARCHAR(50),
                existing_restrictions TEXT,
                maintenance_restrictions TEXT,
                PRIMARY KEY (corridor_id, track_id)
            );
            """)

            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS maintenance_history (
                task_id VARCHAR(50) PRIMARY KEY,
                asset_id VARCHAR(50),
                location VARCHAR(100),
                department VARCHAR(50),
                maintenance_type VARCHAR(50),
                defect_type VARCHAR(100),
                defect_reason VARCHAR(100),
                severity VARCHAR(20),
                planned_duration_hours NUMERIC(5,2),
                actual_duration_hours NUMERIC(5,2),
                previous_failure VARCHAR(10),
                failure_date VARCHAR(50),
                maintenance_date VARCHAR(50),
                next_scheduled_maintenance VARCHAR(50),
                overdue_days INT,
                previous_priority NUMERIC(5,2),
                train_operational_impact TEXT,
                workers_used TEXT,
                equipment_used TEXT,
                materials_used TEXT
            );
            """)

            conn.exec_driver_sql("ALTER TABLE maintenance_requests ADD COLUMN IF NOT EXISTS created_by VARCHAR(100);")

            conn.exec_driver_sql("DELETE FROM users WHERE username IN ('admin', 'operator');")

            users_seed = [
                ('Aroha', 'Aroha2026', 'Aroha Control Officer', 'ADMIN', 'ALL'),
                ('Employee', 'Emp2026', 'Railway Operator Employee', 'OPERATOR', 'ALL'),
                ('eng_signal', 'engineer123', 'Signal Maintenance Engineer', 'OPERATOR', 'SIGNAL'),
                ('eng_electrical', 'engineer123', 'Electrical Maintenance Engineer', 'OPERATOR', 'ELECTRICAL'),
                ('eng_track', 'engineer123', 'Track Maintenance Engineer', 'OPERATOR', 'TRACK')
            ]

            for u_name, u_pwd, u_fname, u_role, u_dept in users_seed:
                s_salt = generate_salt()
                s_hash = hash_password(u_pwd, s_salt)
                conn.exec_driver_sql("""
                INSERT INTO users (username, password_hash, salt, full_name, role, department)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT(username) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    salt = EXCLUDED.salt,
                    role = EXCLUDED.role,
                    department = EXCLUDED.department;
                """, (u_name, s_hash, s_salt, u_fname, u_role, u_dept))

        print("[DATABASE] PostgreSQL schema initialized successfully.")

    else:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
        row = cursor.fetchone()
        if row and "ENGINEER" in str(row["sql"]):
            cursor.execute("DROP TABLE users")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            salt TEXT,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('ADMIN', 'OPERATOR')),
            department TEXT DEFAULT 'ALL',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cursor.execute("PRAGMA table_info(users)")
        user_cols = [c[1] for c in cursor.fetchall()]
        if "salt" not in user_cols:
            cursor.execute("ALTER TABLE users ADD COLUMN salt TEXT")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            role TEXT NOT NULL,
            action TEXT NOT NULL,
            dataset TEXT,
            details TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_requests (
            request_id TEXT PRIMARY KEY,
            request_datetime TEXT,
            department TEXT,
            asset_id TEXT,
            asset_type TEXT,
            location TEXT,
            point_a TEXT,
            point_b TEXT,
            corridor_id TEXT,
            section_id TEXT,
            maintenance_type TEXT,
            defect_type TEXT,
            defect_reason TEXT,
            defect_severity TEXT,
            safety_risk TEXT,
            safety_risk_description TEXT,
            fault_description TEXT,
            required_duration_hours REAL,
            required_workers INTEGER,
            required_equipment TEXT,
            required_materials TEXT,
            due_date TEXT,
            status TEXT DEFAULT 'PENDING',
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cursor.execute("PRAGMA table_info(maintenance_requests)")
        cols = [c[1] for c in cursor.fetchall()]
        if "created_by" not in cols:
            cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN created_by TEXT")

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS workers (
            worker_id TEXT PRIMARY KEY,
            worker_name TEXT,
            worker_type TEXT,
            skill TEXT,
            skill_level TEXT,
            qualification_level TEXT,
            experience_years TEXT,
            corridor TEXT,
            location TEXT,
            date TEXT,
            maximum_daily_hours REAL,
            shift_start TEXT,
            shift_end TEXT,
            available BOOLEAN DEFAULT TRUE,
            status TEXT DEFAULT 'Available',
            current_assignment TEXT,
            emergency_available BOOLEAN DEFAULT TRUE
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS equipment (
            equipment_id TEXT PRIMARY KEY,
            equipment_name TEXT,
            equipment_type TEXT,
            equipment_category TEXT,
            equipment_model TEXT,
            quantity INTEGER,
            condition TEXT,
            operational BOOLEAN DEFAULT TRUE,
            corridor TEXT,
            location TEXT,
            date TEXT,
            available BOOLEAN DEFAULT TRUE,
            status TEXT DEFAULT 'Available',
            availability_start TEXT,
            availability_end TEXT,
            current_assignment TEXT,
            maintenance_due_date TEXT,
            calibration_due_date TEXT,
            operator_required BOOLEAN DEFAULT FALSE,
            required_operator_skill TEXT,
            mobilization_time_minutes INTEGER
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS train_master (
            train_id TEXT PRIMARY KEY,
            train_number TEXT,
            train_name TEXT,
            train_type TEXT,
            traffic_type TEXT,
            origin TEXT,
            destination TEXT,
            direction TEXT,
            running_days TEXT,
            frequency_per_hour INTEGER,
            priority_class TEXT,
            operational_status TEXT
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS train_routes (
            route_id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_id TEXT,
            train_number TEXT,
            sequence INTEGER,
            station_code TEXT,
            station_name TEXT,
            arrival_time TEXT,
            departure_time TEXT,
            distance_from_origin REAL,
            distance_from_previous_station REAL,
            corridor_id TEXT,
            section_id TEXT,
            direction TEXT,
            km_location REAL,
            from_km REAL,
            to_km REAL,
            previous_station TEXT,
            next_station TEXT,
            track_id TEXT,
            railway_division TEXT
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS station_km_mapping (
            mapping_id TEXT PRIMARY KEY,
            corridor_id TEXT,
            section_id TEXT,
            section_name TEXT,
            start_station_code TEXT,
            start_station_name TEXT,
            start_km REAL,
            end_station_code TEXT,
            end_station_name TEXT,
            end_km REAL,
            direction TEXT,
            line_name TEXT,
            track_id TEXT
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS corridor_data (
            corridor_id TEXT,
            track_id TEXT,
            track_capacity INTEGER,
            current_occupancy INTEGER,
            direction TEXT,
            compatible_train_types TEXT,
            alternative_routing_possible TEXT,
            block_availability TEXT,
            existing_restrictions TEXT,
            maintenance_restrictions TEXT,
            PRIMARY KEY (corridor_id, track_id)
        )
        """)

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance_history (
            task_id TEXT PRIMARY KEY,
            asset_id TEXT,
            location TEXT,
            department TEXT,
            maintenance_type TEXT,
            defect_type TEXT,
            defect_reason TEXT,
            severity TEXT,
            planned_duration_hours REAL,
            actual_duration_hours REAL,
            previous_failure TEXT,
            failure_date TEXT,
            maintenance_date TEXT,
            next_scheduled_maintenance TEXT,
            overdue_days INTEGER,
            previous_priority REAL,
            train_operational_impact TEXT,
            workers_used TEXT,
            equipment_used TEXT,
            materials_used TEXT
        )
        """)

        cursor.execute("DELETE FROM users WHERE username IN ('admin', 'operator');")

        users_seed = [
            ('Aroha', 'Aroha2026', 'Aroha Control Officer', 'ADMIN', 'ALL'),
            ('Employee', 'Emp2026', 'Railway Operator Employee', 'OPERATOR', 'ALL'),
            ('eng_signal', 'engineer123', 'Signal Maintenance Engineer', 'OPERATOR', 'SIGNAL'),
            ('eng_electrical', 'engineer123', 'Electrical Maintenance Engineer', 'OPERATOR', 'ELECTRICAL'),
            ('eng_track', 'engineer123', 'Track Maintenance Engineer', 'OPERATOR', 'TRACK')
        ]

        for u_name, u_pwd, u_fname, u_role, u_dept in users_seed:
            s_salt = generate_salt()
            s_hash = hash_password(u_pwd, s_salt)
            cursor.execute("""
            INSERT INTO users (username, password_hash, salt, full_name, role, department)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
                password_hash = excluded.password_hash,
                salt = excluded.salt,
                role = excluded.role,
                department = excluded.department
            """, (u_name, s_hash, s_salt, u_fname, u_role, u_dept))

        conn.commit()
        conn.close()
        print("[DATABASE] SQLite schema initialized successfully.")

if __name__ == "__main__":
    init_db()
