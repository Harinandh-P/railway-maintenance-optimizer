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
def execute_full_pipeline(current_user: TokenData = Depends(require_admin)):
    try:
        print("==================================================")
        print("[PIPELINE] STARTING FULL 3-PHASE OPTIMIZATION PIPELINE")
        print("==================================================")

        print("[PIPELINE] Executing Phase 1 Priority/Risk Scoring...")
        p1 = run_phase1()

        print("[PIPELINE] Executing Phase 2 Train Movement & Gap Analysis...")
        p2 = run_phase2()

        print("[PIPELINE] Executing Phase 3 CP-SAT Optimization Solver...")
        p3 = run_phase3()

        print("==================================================")
        print(f"[PIPELINE] COMPLETED SUCCESSFULLY! Allocated: {p3.get('allocated_groups', 0)} groups | Unallocated: {p3.get('unallocated_groups', 0)} groups")
        print("==================================================")

        AuditService.log_action(
            current_user.username,
            current_user.role,
            "RUN_FULL_PIPELINE",
            details=f"P1: {len(p1)} reqs -> P2: {len(p2.get('requests', []))} candidate blocks -> P3: {p3.get('allocated_groups', 0)} final blocks"
        )
        return {
            "status": "SUCCESS",
            "message": "Full 3-Phase Optimization Pipeline Executed Successfully",
            "phase1_requests": len(p1),
            "phase2_candidate_requests": len(p2.get("requests", [])),
            "phase3_allocated_groups": p3.get("allocated_groups", 0),
            "phase3_summary": p3
        }
    except Exception as e:
        print("[FULL PIPELINE FAILURE TRACEBACK]:\n", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Full pipeline execution failed at step: {str(e)}"
        )
