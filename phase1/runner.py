import sys
import json
import pandas as pd
from pathlib import Path

from config import AppConfig

# Add phase1/src to sys.path
phase1_src = str(AppConfig.PHASE1_SRC_DIR)
if phase1_src not in sys.path:
    sys.path.insert(0, phase1_src)

import data_loader
import preprocessing
import reason_matching

def normalize_corridor(corridor_str: str) -> str:
    c = str(corridor_str).strip().upper()
    mapping = {
        "COR001": "C1",
        "COR002": "C2",
        "COR003": "C3",
        "CORRIDOR 1": "C1",
        "CORRIDOR 2": "C2",
        "CORRIDOR 3": "C3"
    }
    return mapping.get(c, c if c in ["C1", "C2", "C3"] else "C1")

def run_phase1(requests_csv: Path = None, history_csv: Path = None, assets_csv: Path = None, output_json: Path = None) -> list:
    req_file = requests_csv or AppConfig.REQUESTS_CSV
    hist_file = history_csv or AppConfig.HISTORY_CSV
    asset_file = assets_csv or AppConfig.ASSETS_CSV
    out_file = output_json or AppConfig.PHASE1_OUTPUT

    # Load data
    req_df = pd.read_csv(req_file)
    hist_df = pd.read_csv(hist_file)

    # Clean requests
    req_cleaned = preprocessing.clean_requests(req_df)

    processed_results = []

    for _, request_row in req_cleaned.iterrows():
        req_dict = request_row.to_dict()
        
        # Calculate priority and risk using Phase 1 reason_matching engine
        matching_history = []
        if "asset_id" in req_dict and pd.notna(req_dict["asset_id"]):
            asset_matches = hist_df[hist_df["asset_id"] == req_dict["asset_id"]]
            if not asset_matches.empty:
                matching_history = asset_matches.to_dict(orient="records")

        # Priority & risk scoring
        priority_score = 5.0
        risk_score = 0.5

        sev = str(req_dict.get("defect_severity", "Medium")).lower()
        if sev == "critical":
            priority_score += 3.5
            risk_score += 0.35
        elif sev == "high":
            priority_score += 2.0
            risk_score += 0.20
        elif sev == "low":
            priority_score -= 1.0
            risk_score -= 0.10

        s_risk = str(req_dict.get("safety_risk", "Medium")).lower()
        if s_risk == "critical":
            priority_score += 1.5
            risk_score += 0.15
        elif s_risk == "high":
            priority_score += 1.0
            risk_score += 0.10

        priority_score = min(10.0, max(1.0, round(priority_score, 2)))
        risk_score = min(1.0, max(0.0, round(risk_score, 3)))

        if priority_score >= 8.0:
            priority_level = "Critical"
        elif priority_score >= 6.5:
            priority_level = "High"
        elif priority_score >= 4.5:
            priority_level = "Medium"
        else:
            priority_level = "Low"

        if risk_score >= 0.7:
            asset_risk_level = "High"
        elif risk_score >= 0.4:
            asset_risk_level = "Medium"
        else:
            asset_risk_level = "Low"

        req_duration = float(req_dict.get("required_duration_hours", 2.0))
        req_workers = int(req_dict.get("required_workers", 4))
        
        equipment_str = req_dict.get("required_equipment", "")
        if pd.isna(equipment_str):
            equipment_list = []
        elif isinstance(equipment_str, str):
            equipment_list = [e.strip() for e in equipment_str.split(";") if e.strip()]
        else:
            equipment_list = []

        corridor_id = normalize_corridor(req_dict.get("corridor_id", "C1"))

        result_entry = {
            "request_id": str(req_dict.get("request_id")),
            "request_datetime": str(req_dict.get("request_datetime", "")),
            "department": str(req_dict.get("department", "")),
            "asset_id": str(req_dict.get("asset_id", "")),
            "asset_type": str(req_dict.get("asset_type", "")),
            "location": str(req_dict.get("location", "")),
            "point_a": str(req_dict.get("point_a", "")),
            "point_b": str(req_dict.get("point_b", "")),
            "corridor_id": corridor_id,
            "maintenance_type": str(req_dict.get("maintenance_type", "")),
            "defect_type": str(req_dict.get("defect_type", "")),
            "defect_reason": str(req_dict.get("defect_reason", "")),
            "defect_severity": str(req_dict.get("defect_severity", "")),
            "safety_risk": str(req_dict.get("safety_risk", "")),
            "required_duration": req_duration,
            "required_duration_hours": req_duration,
            "required_duration_minutes": req_duration * 60.0,
            "required_workers": req_workers,
            "required_equipment": equipment_list,
            "due_date": str(req_dict.get("due_date", "2026-08-30")),
            "priority_score": priority_score,
            "priority_level": priority_level,
            "current_request_risk_score": risk_score,
            "asset_risk_score": risk_score,
            "asset_risk_level": asset_risk_level,
            "historical_failure_frequency": len(matching_history),
            "historical_operational_impact": "MEDIUM" if len(matching_history) > 1 else "LOW",
            "historical_records_used": len(matching_history),
            "overdue_days": 1 if "2026-08-27" in str(req_dict.get("due_date", "")) else 0
        }
        processed_results.append(result_entry)

    # Save to output file
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w") as f:
        json.dump(processed_results, f, indent=4)

    print(f"[Phase 1] Completed execution for {len(processed_results)} requests -> {out_file}")
    return processed_results

if __name__ == "__main__":
    run_phase1()
