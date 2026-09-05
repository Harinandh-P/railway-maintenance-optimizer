import json
from fastapi import APIRouter, Depends
from config import AppConfig
from backend.auth import get_current_user, TokenData
from backend.services.csv_service import CSVService
from backend.services.schedule_sync_service import sync_schedule_statuses

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard Metrics"])

@router.get("/metrics")
def get_dashboard_metrics(current_user: TokenData = Depends(get_current_user)):
    sync_schedule_statuses()
    requests = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    train_master = CSVService.read_csv(AppConfig.TRAIN_MASTER_CSV)
    workers = CSVService.read_csv(AppConfig.WORKER_DB_CSV)
    equipment = CSVService.read_csv(AppConfig.EQUIPMENT_DB_CSV)

    high_risk_count = sum(1 for r in requests if str(r.get("safety_risk", "")).lower() in ["high", "critical"] or str(r.get("defect_severity", "")).lower() in ["high", "critical"])
    overdue_count = sum(1 for r in requests if "2026-08-27" in str(r.get("due_date", "")))

    candidate_gaps_count = 0
    if AppConfig.PHASE2_OUTPUT.exists():
        try:
            with open(AppConfig.PHASE2_OUTPUT, "r") as f:
                p2 = json.load(f)
                for req in p2.get("requests", []):
                    candidate_gaps_count += len(req.get("candidate_gaps", []))
        except Exception:
            pass

    selected_blocks_count = 0
    if AppConfig.FINAL_BLOCK_PLAN.exists():
        try:
            with open(AppConfig.FINAL_BLOCK_PLAN, "r") as f:
                plan = json.load(f)
                selected_blocks_count = len(plan.get("final_block_plan", []))
        except Exception:
            pass

    return {
        "total_maintenance_requests": len(requests),
        "high_risk_requests": high_risk_count,
        "overdue_requests": overdue_count,
        "total_train_master": len(train_master),
        "total_workers": len(workers),
        "available_workers": sum(1 for w in workers if str(w.get("available", True)).lower() in ["true", "1"]),
        "total_equipment": len(equipment),
        "available_equipment": sum(1 for e in equipment if str(e.get("available", True)).lower() in ["true", "1"]),
        "candidate_gaps_generated": candidate_gaps_count,
        "final_selected_blocks": selected_blocks_count,
        "pipeline_status": "READY" if AppConfig.FINAL_BLOCK_PLAN.exists() else "INITIAL"
    }
