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
    assert first_block["status"] in ["ALLOCATED", "FINAL SELECTED BLOCK"]


def test_phase3_strict_resource_validation():
    # Load latest final block plan
    with open(AppConfig.FINAL_BLOCK_PLAN, "r", encoding="utf-8") as f:
        final_plan = json.load(f)

    allocated_blocks = final_plan.get("final_block_plan", [])
    unallocated_blocks = final_plan.get("unallocated", [])

    # Total groups across allocated and unallocated must equal 11
    assert len(allocated_blocks) + len(unallocated_blocks) == 11

    allocated_group_ids = [b["group_id"] for b in allocated_blocks]
    unallocated_group_ids = [b["group_id"] for b in unallocated_blocks]

    # 1. Verify GRP002 (req 12 workers) is NOT allocated with insufficient workers
    if "GRP002" in allocated_group_ids:
        b2 = next(b for b in allocated_blocks if b["group_id"] == "GRP002")
        assert b2["workers_assigned_count"] >= b2["workers_required"]

    # 2. Verify GRP007 (req 6 workers) is NOT allocated with zero workers
    if "GRP007" in allocated_group_ids:
        b7 = next(b for b in allocated_blocks if b["group_id"] == "GRP007")
        assert b7["workers_assigned_count"] >= b7["workers_required"]

    # 3. For EVERY allocated block: workers_assigned_count >= workers_required (unless 1-short extra time rule holds)
    for block in allocated_blocks:
        req_cnt = block["workers_required"]
        assigned_cnt = block["workers_assigned_count"]
        corridor = block["corridor"]

        assert assigned_cnt >= req_cnt or (assigned_cnt == req_cnt - 1 and block["allocated_duration_minutes"] > 180)

        # 4. Verify worker corridor match
        for w in block.get("assigned_worker_details", []):
            assert w["corridor"].upper() == corridor.upper(), f"Worker {w['worker_id']} corridor {w['corridor']} does not match block corridor {corridor}"

        # 5. Verify equipment corridor match
        for eq in block.get("assigned_equipment_details", []):
            assert eq["corridor"].upper() == corridor.upper(), f"Equipment {eq['equipment_id']} corridor {eq['corridor']} does not match block corridor {corridor}"

    # 6. Verify unallocated blocks have explicit reasons
    for ub in unallocated_blocks:
        assert "reason" in ub
        assert len(ub["reason"]) > 0
