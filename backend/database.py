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
    if is_postgres():
        engine = get_postgres_engine()
        with engine.begin() as conn:
            conn.exec_driver_sql("""
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(150) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK(role IN ('ADMIN', 'OPERATOR')),
                department VARCHAR(50) DEFAULT 'ALL',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
            """)

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

            from backend.auth import hash_password
            aroha_pass = hash_password("Aroha2026")
            employee_pass = hash_password("Emp2026")
            engineer_pass = hash_password("engineer123")

            conn.exec_driver_sql("DELETE FROM users WHERE username IN ('admin', 'operator');")

            conn.exec_driver_sql("""
            INSERT INTO users (username, password_hash, full_name, role, department)
            VALUES ('Aroha', %s, 'Aroha Control Officer', 'ADMIN', 'ALL')
            ON CONFLICT(username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department = EXCLUDED.department;
            """, (aroha_pass,))

            conn.exec_driver_sql("""
            INSERT INTO users (username, password_hash, full_name, role, department)
            VALUES ('Employee', %s, 'Railway Operator Employee', 'OPERATOR', 'ALL')
            ON CONFLICT(username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department = EXCLUDED.department;
            """, (employee_pass,))

            conn.exec_driver_sql("""
            INSERT INTO users (username, password_hash, full_name, role, department)
            VALUES ('eng_signal', %s, 'Signal Maintenance Engineer', 'OPERATOR', 'SIGNAL')
            ON CONFLICT(username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department = EXCLUDED.department;
            """, (engineer_pass,))

            conn.exec_driver_sql("""
            INSERT INTO users (username, password_hash, full_name, role, department)
            VALUES ('eng_electrical', %s, 'Electrical Maintenance Engineer', 'OPERATOR', 'ELECTRICAL')
            ON CONFLICT(username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department = EXCLUDED.department;
            """, (engineer_pass,))

            conn.exec_driver_sql("""
            INSERT INTO users (username, password_hash, full_name, role, department)
            VALUES ('eng_track', %s, 'Track Maintenance Engineer', 'OPERATOR', 'TRACK')
            ON CONFLICT(username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, department = EXCLUDED.department;
            """, (engineer_pass,))

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
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('ADMIN', 'OPERATOR')),
            department TEXT DEFAULT 'ALL',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

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
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

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

        from backend.auth import hash_password
        aroha_pass = hash_password("Aroha2026")
        employee_pass = hash_password("Emp2026")
        engineer_pass = hash_password("engineer123")

        cursor.execute("DELETE FROM users WHERE username IN ('admin', 'operator');")

        cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, department)
        VALUES ('Aroha', ?, 'Aroha Control Officer', 'ADMIN', 'ALL')
        ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, department = excluded.department
        """, (aroha_pass,))

        cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, department)
        VALUES ('Employee', ?, 'Railway Operator Employee', 'OPERATOR', 'ALL')
        ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, department = excluded.department
        """, (employee_pass,))

        cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, department)
        VALUES ('eng_signal', ?, 'Signal Maintenance Engineer', 'OPERATOR', 'SIGNAL')
        ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, department = excluded.department
        """, (engineer_pass,))

        cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, department)
        VALUES ('eng_electrical', ?, 'Electrical Maintenance Engineer', 'OPERATOR', 'ELECTRICAL')
        ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, department = excluded.department
        """, (engineer_pass,))

        cursor.execute("""
        INSERT INTO users (username, password_hash, full_name, role, department)
        VALUES ('eng_track', ?, 'Track Maintenance Engineer', 'OPERATOR', 'TRACK')
        ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, role = excluded.role, department = excluded.department
        """, (engineer_pass,))

        conn.commit()
        conn.close()
        print("[DATABASE] SQLite schema initialized successfully.")

if __name__ == "__main__":
    init_db()
