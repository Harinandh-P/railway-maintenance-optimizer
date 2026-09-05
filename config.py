from pathlib import Path
import os

# Helper to load .env if present
def load_env_file():
    env_path = Path(__file__).resolve().parent / ".env"
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

load_env_file()

class AppConfig:
    # Root resolved relative to this file — works on any machine
    PROJECT_ROOT     = Path(__file__).resolve().parent

    # Data
    DATA_DIR         = PROJECT_ROOT / "data"
    TRAIN_MASTER_CSV = DATA_DIR / "train_master.csv"
    TRAINS_CSV       = DATA_DIR / "trains.csv"
    TRAIN_ROUTES_CSV = DATA_DIR / "train_routes.csv"
    STATION_KM_CSV   = DATA_DIR / "station_km_mapping.csv"
    CORRIDOR_CSV     = DATA_DIR / "corridor_data.csv"
    REQUESTS_CSV     = DATA_DIR / "maintenance_requests.csv"
    HISTORY_CSV      = DATA_DIR / "maintenance_history.csv"
    ASSETS_CSV       = DATA_DIR / "assets.csv"

    # Phase 1
    PHASE1_SRC_DIR   = PROJECT_ROOT / "phase1" / "src"

    # Workers
    WORKER_DATA_DIR  = PROJECT_ROOT / "workersAvailability" / "data"
    WORKER_OUTPUT_DIR = PROJECT_ROOT / "workersAvailability" / "output"
    WORKER_DB_CSV    = WORKER_DATA_DIR / "worker_database.csv"
    WORKER_SKILL_CSV = WORKER_DATA_DIR / "worker_skill_availability.csv"
    WORKER_JSON      = WORKER_OUTPUT_DIR / "WorkerAvailability.json"

    # Equipment
    EQUIPMENT_DATA_DIR = PROJECT_ROOT / "Equipment_data" / "data"
    EQUIPMENT_DB_CSV = EQUIPMENT_DATA_DIR / "equipment_database.csv"
    EQUIPMENT_AVAIL_CSV = EQUIPMENT_DATA_DIR / "equipment_daily_availability.csv"
    EQUIPMENT_REQ_CSV = EQUIPMENT_DATA_DIR / "equipment_requirements.csv"

    # Outputs (canonical — all phases write here)
    OUTPUT_DIR       = PROJECT_ROOT / "output"
    PHASE1_OUTPUT    = OUTPUT_DIR / "phase1_output.json"
    PHASE2_OUTPUT    = OUTPUT_DIR / "phase2_output.json"
    PHASE3_OUTPUT    = OUTPUT_DIR / "phase3_output.json"
    FINAL_BLOCK_PLAN = OUTPUT_DIR / "final_block_plan.json"
    EXECUTION_LOG    = OUTPUT_DIR / "execution_log.json"

    # Database
    DATABASE_URL     = os.environ.get("DATABASE_URL")
    DB_PATH          = PROJECT_ROOT / "data" / "railway_optimizer.db"

    ENVIRONMENT      = os.environ.get("ENVIRONMENT", "development").lower()

    # Auth & Security Configuration
    SECRET_KEY       = os.environ.get("SECRET_KEY", "" if ENVIRONMENT == "production" else "dev-secret-key-local-only")
    ADMIN_PASSKEY    = os.environ.get("ADMIN_PASSKEY", "" if ENVIRONMENT == "production" else "dev-admin-passkey-local-only")
    ALGORITHM        = "HS256"
    TOKEN_EXPIRE_MIN = 1440

    @classmethod
    def validate_security_config(cls):
        if cls.ENVIRONMENT == "production":
            if not os.environ.get("SECRET_KEY"):
                raise RuntimeError("CRITICAL SECURITY ERROR: SECRET_KEY environment variable is required in production!")
            if not os.environ.get("ADMIN_PASSKEY"):
                raise RuntimeError("CRITICAL SECURITY ERROR: ADMIN_PASSKEY environment variable is required in production!")

AppConfig.validate_security_config()
