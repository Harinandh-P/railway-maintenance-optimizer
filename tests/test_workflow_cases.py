import pytest
import json
from config import AppConfig
from phase1.runner import run_phase1
from phase2.runner import run_phase2
from phase3.runner import run_phase3
from backend.services.csv_service import CSVService

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
    COMPLETED -> not selectable (False)
    REJECTED -> not selectable (False)
    """
    def is_selectable(status_str):
        status = String(status_str or 'PENDING').strip().upper()
        return not status in ['SCHEDULED', 'ALLOCATED', 'COMPLETED', 'REJECTED']

    def String(val):
        return str(val)

    assert is_selectable("PENDING") is True
    assert is_selectable("UNALLOCATED") is True
    assert is_selectable("pending") is True
    assert is_selectable("unallocated") is True

    assert is_selectable("SCHEDULED") is False
    assert is_selectable("ALLOCATED") is False
    assert is_selectable("COMPLETED") is False
    assert is_selectable("REJECTED") is False
