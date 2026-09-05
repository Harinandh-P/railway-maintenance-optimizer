from typing import Optional, List
from pydantic import BaseModel
import json
import traceback
from fastapi import APIRouter, Depends, HTTPException, status
from backend.auth import require_admin, TokenData
from backend.services.audit_service import AuditService
from phase1.runner import run_phase1
from phase2.runner import run_phase2
from phase3.runner import run_phase3
from config import AppConfig

router = APIRouter(prefix="/api/run", tags=["Pipeline Execution"])

class PipelineRunModel(BaseModel):
    request_ids: Optional[List[str]] = None

@router.post("/phase1")
def execute_phase1(current_user: TokenData = Depends(require_admin)):
    try:
        results = run_phase1()
        AuditService.log_action(current_user.username, current_user.role, "RUN_PHASE1", details=f"Processed {len(results)} requests")
        return {"status": "SUCCESS", "phase": 1, "processed_count": len(results), "output_file": str(AppConfig.PHASE1_OUTPUT)}
    except Exception as e:
        print("[PHASE 1 ERROR]", traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Phase 1 execution failed: {str(e)}")

@router.post("/phase2")
def execute_phase2(current_user: TokenData = Depends(require_admin)):
    try:
        results = run_phase2()
        req_count = len(results.get("requests", []))
        AuditService.log_action(current_user.username, current_user.role, "RUN_PHASE2", details=f"Generated gaps for {req_count} requests")
        return {"status": "SUCCESS", "phase": 2, "processed_count": req_count, "output_file": str(AppConfig.PHASE2_OUTPUT)}
    except Exception as e:
        print("[PHASE 2 ERROR]", traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Phase 2 execution failed: {str(e)}")

@router.post("/phase3")
def execute_phase3(current_user: TokenData = Depends(require_admin)):
    try:
        print("[PHASE 3] API Pipeline execution started...")
        results = run_phase3()
        allocated_count = results.get("allocated_groups", 0)
        AuditService.log_action(current_user.username, current_user.role, "RUN_PHASE3", details=f"Allocated {allocated_count} block groups")
        return {"status": "SUCCESS", "phase": 3, "allocated_groups": allocated_count, "output_file": str(AppConfig.PHASE3_OUTPUT)}
    except Exception as e:
        print("[PHASE 3 ERROR Traceback]:", traceback.format_exc())
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Phase 3 execution failed: {str(e)}")

@router.post("/full-pipeline")
def execute_full_pipeline(payload: Optional[PipelineRunModel] = None, current_user: TokenData = Depends(require_admin)):
    try:
        print("==================================================")
        print("[PIPELINE] STARTING 3-PHASE OPTIMIZATION PIPELINE")
        print("==================================================")

        temp_file = None
        if payload and payload.request_ids and len(payload.request_ids) > 0:
            import pandas as pd
            from backend.services.csv_service import CSVService
            reqs = CSVService.read_csv(AppConfig.REQUESTS_CSV)
            selected_reqs = [r for r in reqs if str(r.get("request_id")).strip() in payload.request_ids]
            if not selected_reqs:
                raise HTTPException(status_code=400, detail="No matching requests found for selection")
            
            temp_file = AppConfig.OUTPUT_DIR / "selected_requests.csv"
            temp_file.parent.mkdir(parents=True, exist_ok=True)
            pd.DataFrame(selected_reqs).to_csv(temp_file, index=False)
            print(f"[PIPELINE] Executing Phase 1 Priority/Risk Scoring for {len(selected_reqs)} selected requests...")
            p1 = run_phase1(requests_csv=temp_file)
        else:
            print("[PIPELINE] Executing Phase 1 Priority/Risk Scoring for ALL requests...")
            p1 = run_phase1()

        print("[PIPELINE] Executing Phase 2 Train Movement & Gap Analysis...")
        p2 = run_phase2()

        print("[PIPELINE] Executing Phase 3 CP-SAT Optimization Solver...")
        p3 = run_phase3()

        print("==================================================")
        print(f"[PIPELINE] COMPLETED SUCCESSFULLY! Allocated: {p3.get('allocated_groups', 0)} groups | Unallocated: {p3.get('unallocated_groups', 0)} groups")
        print("==================================================")

        # Synchronize allocated request statuses to 'SCHEDULED' in database/CSV
        allocated_req_ids = set()
        for block in p3.get("final_block_plan", []):
            for t in (block.get("allocated_tasks") or block.get("requests_in_group") or []):
                if t:
                    allocated_req_ids.add(str(t).strip())
            for r in block.get("request_details_in_group", []):
                if isinstance(r, dict) and r.get("request_id"):
                    allocated_req_ids.add(str(r["request_id"]).strip())

        if allocated_req_ids:
            from backend.services.csv_service import CSVService
            existing_records = CSVService.read_csv(AppConfig.REQUESTS_CSV)
            updated_records = []
            status_changed_count = 0
            for r in existing_records:
                rid = str(r.get("request_id", "")).strip()
                if rid in allocated_req_ids and str(r.get("status", "")).upper() not in ("SCHEDULED", "ALLOCATED", "COMPLETED", "REJECTED"):
                    r["status"] = "SCHEDULED"
                    status_changed_count += 1
                updated_records.append(r)
            if status_changed_count > 0:
                CSVService.write_csv(AppConfig.REQUESTS_CSV, updated_records, dataset_type="requests")
                print(f"[PIPELINE] Synchronized database status to 'SCHEDULED' for {status_changed_count} allocated requests.")

        AuditService.log_action(
            current_user.username,
            current_user.role,
            "RUN_FULL_PIPELINE",
            details=f"P1: {len(p1)} reqs -> P2: {len(p2.get('requests', []))} candidate blocks -> P3: {p3.get('allocated_groups', 0)} final blocks"
        )
        return {
            "status": "SUCCESS",
            "message": "3-Phase Optimization Pipeline Executed Successfully",
            "phase1_requests": len(p1),
            "phase2_candidate_requests": len(p2.get("requests", [])),
            "phase3_allocated_groups": p3.get("allocated_groups", 0),
            "phase3_summary": p3
        }
    except HTTPException:
        raise
    except Exception as e:
        print("[FULL PIPELINE FAILURE TRACEBACK]:\n", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Full pipeline execution failed at step: {str(e)}"
        )
