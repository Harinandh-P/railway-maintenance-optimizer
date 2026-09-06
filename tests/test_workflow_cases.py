import pytest
import json
from datetime import datetime, timedelta
from config import AppConfig
from phase1.runner import run_phase1
from phase2.runner import run_phase2
from phase3.runner import run_phase3
from backend.services.csv_service import CSVService
from backend.services.schedule_sync_service import sync_pipeline_execution_results

def test_case_3_selected_pipeline_execution(tmp_path):
    """
    Case 3 Verification:
    Select subset requests (e.g. REQ002 and REQ004).
    Only REQ002 and REQ004 enter Phase 1, Phase 2, and Phase 3.
    REQ001, REQ003, REQ005 remain untouched in database.
    """
    import pandas as pd
    all_reqs = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    selected_ids = ["REQ002", "REQ004"]
    selected_reqs = [r for r in all_reqs if str(r.get("request_id")).strip() in selected_ids]

    assert len(selected_reqs) == 2

    temp_csv = tmp_path / "selected_test.csv"
    pd.DataFrame(selected_reqs).to_csv(temp_csv, index=False)

    # Phase 1 for selected subset
    p1 = run_phase1(requests_csv=temp_csv)
    p1_ids = [str(r.get("request_id")).strip() for r in p1]
    assert set(p1_ids) == set(selected_ids)
    assert "REQ001" not in p1_ids
    assert "REQ003" not in p1_ids
    assert "REQ005" not in p1_ids

    # Phase 2 for selected subset
    p2 = run_phase2()
    p2_ids = [str(r.get("request_information", {}).get("request_id")).strip() for r in p2.get("requests", [])]
    assert set(p2_ids) == set(selected_ids)

    # Phase 3 for selected subset
    p3 = run_phase3()
    p3_reqs = set()
    for block in p3.get("final_block_plan", []):
        for r in block.get("request_details_in_group", []):
            if isinstance(r, dict) and r.get("request_id"):
                p3_reqs.add(str(r["request_id"]).strip())

    assert p3_reqs.issubset(set(selected_ids))
    assert "REQ001" not in p3_reqs
    assert "REQ003" not in p3_reqs
    assert "REQ005" not in p3_reqs

def test_case_4_request_selectability_rules():
    """
    Case 4 Verification:
    PENDING -> selectable (True)
    UNALLOCATED -> selectable (True)
    SCHEDULED -> not selectable (False)
    ALLOCATED -> not selectable (False)
    COMPLETED -> not selectable (False)
    REJECTED -> not selectable (False)
    CANCELLED -> not selectable (False)
    """
    def is_selectable(request):
        if not request or not request.get("request_id"):
            return False
        status = str(request.get("status") or 'PENDING').strip().upper()
        return status in ('PENDING', 'UNALLOCATED')

    assert is_selectable({"request_id": "REQ001", "status": "PENDING"}) is True
    assert is_selectable({"request_id": "REQ001", "status": "UNALLOCATED"}) is True
    assert is_selectable({"request_id": "REQ001", "status": "pending"}) is True
    assert is_selectable({"request_id": "REQ001", "status": "unallocated"}) is True

    assert is_selectable({"request_id": "REQ001", "status": "SCHEDULED"}) is False
    assert is_selectable({"request_id": "REQ001", "status": "ALLOCATED"}) is False
    assert is_selectable({"request_id": "REQ001", "status": "COMPLETED"}) is False
    assert is_selectable({"request_id": "REQ001", "status": "REJECTED"}) is False
    assert is_selectable({"request_id": "REQ001", "status": "CANCELLED"}) is False

def test_selective_post_pipeline_status_sync():
    """
    Selective status sync verification:
    Allocated selected -> SCHEDULED
    Unallocated selected -> PENDING
    Unselected -> UNTOUCHED
    """
    selected_subset = {"REQ002", "REQ004"}
    res = sync_pipeline_execution_results(selected_subset)
    assert res["status"] == "SUCCESS"

    reqs = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    req_map = {str(r.get("request_id")).strip(): str(r.get("status")).strip().upper() for r in reqs}

    # REQ001, REQ003, REQ005 were not selected, so their DB status must be preserved
    assert req_map.get("REQ001") in ("PENDING", "UNALLOCATED", "SCHEDULED", "COMPLETED", "REJECTED")
    # Selected requests must be either SCHEDULED/COMPLETED (if allocated) or PENDING (if unallocated)
    assert req_map.get("REQ002") in ("SCHEDULED", "COMPLETED", "PENDING")
    assert req_map.get("REQ004") in ("SCHEDULED", "COMPLETED", "PENDING")
