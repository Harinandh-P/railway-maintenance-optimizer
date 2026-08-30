import pytest
import json
from config import AppConfig
from phase1.runner import run_phase1
from phase2.runner import run_phase2
from phase3.runner import run_phase3
from workersAvailability.sync import sync_workers_to_json

def test_full_pipeline_execution():
    # Step 1: Run Phase 1
    p1_out = run_phase1()
    assert len(p1_out) > 0
    assert AppConfig.PHASE1_OUTPUT.exists()

    # Step 2: Run Phase 2
    p2_out = run_phase2()
    assert "requests" in p2_out
    assert AppConfig.PHASE2_OUTPUT.exists()

    # Step 3: Run Worker Sync
    sync_out = sync_workers_to_json()
    assert "sectors" in sync_out
    assert AppConfig.WORKER_JSON.exists()

    # Step 4: Run Phase 3 Optimization
    p3_out = run_phase3()
    assert AppConfig.PHASE3_OUTPUT.exists()
    assert AppConfig.FINAL_BLOCK_PLAN.exists()

    # Step 5: Verify Final Block Plan contents
    with open(AppConfig.FINAL_BLOCK_PLAN, "r") as f:
        final_plan = json.load(f)
    
    assert "final_block_plan" in final_plan
    blocks = final_plan["final_block_plan"]
    assert len(blocks) > 0
    
    first_block = blocks[0]
    assert "block_id" in first_block
    assert "status" in first_block
    assert first_block["status"] == "FINAL SELECTED BLOCK"
