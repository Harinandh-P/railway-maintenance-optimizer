import json
import pandas as pd
from pathlib import Path
from config import AppConfig

def sync_workers_to_json(csv_path: Path = None, json_path: Path = None) -> dict:
    c_path = csv_path or AppConfig.WORKER_DB_CSV
    j_path = json_path or AppConfig.WORKER_JSON

    if not c_path.exists():
        raise FileNotFoundError(f"Worker CSV not found: {c_path}")

    df = pd.read_csv(c_path)

    sector_map = {
        "signal": "SIGNAL",
        "track": "TRACK",
        "electrical": "OHE",
        "ohe": "OHE"
    }

    sectors = {
        "SIGNAL": {"sector": "SIGNAL", "skill": "Signal Technician", "workers": []},
        "TRACK": {"sector": "TRACK", "skill": "Track Technician", "workers": []},
        "OHE": {"sector": "OHE", "skill": "OHE Technician", "workers": []}
    }

    for idx, row in df.iterrows():
        w_type = str(row.get("worker_type", "")).strip().lower()
        sec_key = sector_map.get(w_type, "SIGNAL")
        
        w_entry = {
            "worker_number": idx + 1,
            "worker_id": str(row.get("worker_id", f"W{idx+1:03d}")),
            "worker_name": str(row.get("worker_name", "Worker")),
            "sector": sec_key,
            "skill": str(row.get("skill", "Technician")),
            "skill_level": str(row.get("skill_level", "3")),
            "qualification": str(row.get("qualification_level", "Technician")),
            "corridor": str(row.get("corridor", "C1")),
            "available": str(row.get("available", True)),
            "status": str(row.get("status", "Available")),
            "assessment": "Qualified worker for maintenance assignments."
        }
        sectors[sec_key]["workers"].append(w_entry)

    total_records = len(df)

    for sec_key, sec_data in sectors.items():
        w_list = sec_data["workers"]
        total_w = len(w_list)
        avail_w = sum(1 for w in w_list if str(w.get("available")).lower() in ["true", "1"])
        sec_data["total_workers"] = total_w
        sec_data["available_workers"] = avail_w
        sec_data["minimum_required"] = 5
        sec_data["status"] = "PASS" if avail_w >= 5 else "FAIL"

    output_payload = {
        "database_information": {
            "total_csv_records": total_records,
            "total_unique_workers": total_records,
            "minimum_workers_per_sector": 5
        },
        "sectors": sectors
    }

    j_path.parent.mkdir(parents=True, exist_ok=True)
    with open(j_path, "w") as f:
        json.dump(output_payload, f, indent=4)

    print(f"[Worker Sync] Synchronized {total_records} workers to {j_path}")
    return output_payload

if __name__ == "__main__":
    sync_workers_to_json()
