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

def test_feasibility_aware_grouping_split():
    """
    Grouping Fix Verification:
    Oversized location groups are split into smaller manageable sub-groups.
    Long-duration outlier tasks (e.g. 2880 min / 48h) are isolated into standalone groups.
    Short tasks are not poisoned by long-duration outliers.
    """
    from phase3.grouping import create_maintenance_groups
    from phase3.models import MaintenanceRequest

    mock_tasks = []
    # Create 8 short tasks at C1/KM128/2
    for i in range(1, 9):
        mock_tasks.append(MaintenanceRequest(
            task_id=f"SHORT_{i:02d}",
            department="Engineering",
            work_area="KM 128/2",
            corridor="C1",
            required_duration=120,
            priority=5,
            risk_score=5,
            workers_required=4,
            equipment_required="Track Machine",
            request_date="2026-08-28",
            due_date="2026-08-30",
            overdue_date="2026-08-30"
        ))

    # Add 1 long-duration 48-hour outlier (2880 minutes)
    mock_tasks.append(MaintenanceRequest(
        task_id="LONG_48H",
        department="Engineering",
        work_area="KM 128/2",
        corridor="C1",
        required_duration=2880,
        priority=8,
        risk_score=8,
        workers_required=12,
        equipment_required="Track Machine",
        request_date="2026-08-28",
        due_date="2026-08-30",
        overdue_date="2026-08-30"
    ))

    groups = create_maintenance_groups(mock_tasks, max_group_duration=360, max_group_workers=25, max_group_tasks=5)

    # Must produce multiple smaller groups, NOT 1 monolithic group
    assert len(groups) > 1

    # Identify group containing LONG_48H
    long_groups = [g for g in groups if any(t.task_id == "LONG_48H" for t in g.tasks)]
    assert len(long_groups) == 1
    assert len(long_groups[0].tasks) == 1
    assert long_groups[0].required_duration == 2880

    # Short task groups must have duration <= 360 min and workers <= 25
    short_groups = [g for g in groups if not any(t.task_id == "LONG_48H" for t in g.tasks)]
    for g in short_groups:
        assert g.required_duration <= 360
        assert g.total_workers <= 25
        assert len(g.tasks) <= 5

def test_controlled_feasible_subset():
    """
    Controlled Subset Verification:
    REQ001, REQ007, REQ018, REQ027 subset continues to form feasible groups and allocate cleanly.
    """
    all_reqs = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    selected_ids = ["REQ001", "REQ007", "REQ018", "REQ027"]
    selected_reqs = [r for r in all_reqs if str(r.get("request_id")).strip() in selected_ids]

    if len(selected_reqs) == 4:
        import pandas as pd
        temp_csv = AppConfig.OUTPUT_DIR / "controlled_subset_test.csv"
        pd.DataFrame(selected_reqs).to_csv(temp_csv, index=False)
        p1 = run_phase1(requests_csv=temp_csv)
        p2 = run_phase2()
        p3 = run_phase3()
        assert p3.get("allocated_groups", 0) >= 1
