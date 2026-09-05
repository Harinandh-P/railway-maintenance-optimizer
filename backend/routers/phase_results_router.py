import json
from fastapi import APIRouter, Depends, HTTPException
from config import AppConfig
from backend.auth import get_current_user, TokenData
from backend.services.schedule_sync_service import sync_schedule_statuses

router = APIRouter(prefix="/api/results", tags=["Phase Results"])

@router.get("/phase1")
def get_phase1_results(current_user: TokenData = Depends(get_current_user)):
    if not AppConfig.PHASE1_OUTPUT.exists():
        raise HTTPException(status_code=404, detail="Phase 1 output not found. Please run Phase 1 first.")
    with open(AppConfig.PHASE1_OUTPUT, "r") as f:
        return json.load(f)

@router.get("/phase2")
def get_phase2_results(current_user: TokenData = Depends(get_current_user)):
    if not AppConfig.PHASE2_OUTPUT.exists():
        raise HTTPException(status_code=404, detail="Phase 2 output not found. Please run Phase 2 first.")
    with open(AppConfig.PHASE2_OUTPUT, "r") as f:
        return json.load(f)

@router.get("/phase3")
def get_phase3_results(current_user: TokenData = Depends(get_current_user)):
    if not AppConfig.PHASE3_OUTPUT.exists():
        raise HTTPException(status_code=404, detail="Phase 3 output not found. Please run Phase 3 first.")
    with open(AppConfig.PHASE3_OUTPUT, "r") as f:
        return json.load(f)

@router.get("/final-plan")
def get_final_block_plan(current_user: TokenData = Depends(get_current_user)):
    if not AppConfig.FINAL_BLOCK_PLAN.exists():
        raise HTTPException(status_code=404, detail="Final block plan not found. Please run full pipeline first.")
    sync_schedule_statuses()
    with open(AppConfig.FINAL_BLOCK_PLAN, "r") as f:
        return json.load(f)
