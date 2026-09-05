import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Set
from config import AppConfig
from backend.services.csv_service import CSVService

def parse_block_datetimes(date_str: str, start_time_str: str, end_time_str: str) -> tuple[Optional[datetime], Optional[datetime]]:
    try:
        clean_date = str(date_str).strip()
        clean_start = str(start_time_str).strip()
        clean_end = str(end_time_str).strip()

        # Handle YYYY-MM-DD or YYYY/MM/DD
        clean_date = clean_date.replace('/', '-')

        # Pad time if HH:MM
        if len(clean_start) == 4 and clean_start[1] == ':':
            clean_start = '0' + clean_start
        if len(clean_end) == 4 and clean_end[1] == ':':
            clean_end = '0' + clean_end

        start_dt = datetime.strptime(f"{clean_date} {clean_start}", "%Y-%m-%d %H:%M")
        end_dt = datetime.strptime(f"{clean_date} {clean_end}", "%Y-%m-%d %H:%M")

        # Handle overnight block (e.g. 23:00 -> 02:00)
        if end_dt <= start_dt:
            end_dt += timedelta(days=1)

        return start_dt, end_dt
    except Exception as e:
        return None, None

def sync_schedule_statuses(current_time_override: Optional[datetime] = None) -> Dict[str, Any]:
    """
    Centralized Backend Synchronization Service.
    Determines single source of truth for request lifecycle status:
    - current_datetime >= scheduled_end_datetime -> COMPLETED
    - current_datetime < scheduled_end_datetime -> SCHEDULED (if allocated in Phase 3)
    - Unallocated requests remain PENDING / UNALLOCATED.
    - Preserves all historical records (zero deletions).
    - Preserves existing Phase 3 solver output structure.
    """
    now = current_time_override if current_time_override else datetime.now()

    if not AppConfig.FINAL_BLOCK_PLAN.exists():
        return {"status": "SUCCESS", "message": "No final block plan found.", "active_scheduled": 0, "completed": 0}

    try:
        with open(AppConfig.FINAL_BLOCK_PLAN, "r") as f:
            plan_data = json.load(f)
    except Exception as e:
        print(f"[SYNC SERVICE WARNING] Failed to read final_block_plan.json: {e}")
        return {"status": "ERROR", "detail": str(e)}

    blocks = plan_data.get("final_block_plan", [])
    if not isinstance(blocks, list):
        blocks = []

    active_scheduled_req_ids: Set[str] = set()
    expired_completed_req_ids: Set[str] = set()

    for block in blocks:
        date_str = block.get("date", "")
        start_str = block.get("block_start", "")
        end_str = block.get("block_end", "")

        start_dt, end_dt = parse_block_datetimes(date_str, start_str, end_str)

        # Collect associated request IDs for block
        block_req_ids: Set[str] = set()
        for t in (block.get("allocated_tasks") or block.get("requests_in_group") or []):
            if t:
                block_req_ids.add(str(t).strip())
        for r in block.get("request_details_in_group", []):
            if isinstance(r, dict) and r.get("request_id"):
                block_req_ids.add(str(r["request_id"]).strip())

        if end_dt and now >= end_dt:
            # Block expired
            expired_completed_req_ids.update(block_req_ids)
            block["lifecycle_status"] = "COMPLETED"
        else:
            # Block active/future
            active_scheduled_req_ids.update(block_req_ids)
            block["lifecycle_status"] = "SCHEDULED"

    # Read authoritative maintenance requests
    existing_requests = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    updated_requests = []
    status_changed_count = 0

    for r in existing_requests:
        rid = str(r.get("request_id", "")).strip()
        curr_status = str(r.get("status", "PENDING")).upper().strip()

        # Preserve terminal statuses (REJECTED, CANCELLED)
        if curr_status in ("REJECTED", "CANCELLED"):
            updated_requests.append(r)
            continue

        target_status = curr_status

        if rid in expired_completed_req_ids:
            target_status = "COMPLETED"
        elif rid in active_scheduled_req_ids:
            target_status = "SCHEDULED"

        if target_status != curr_status:
            r["status"] = target_status
            status_changed_count += 1

        updated_requests.append(r)

    if status_changed_count > 0:
        CSVService.write_csv(AppConfig.REQUESTS_CSV, updated_requests, dataset_type="requests")

    return {
        "status": "SUCCESS",
        "synchronized_at": now.strftime("%Y-%m-%d %H:%M:%S"),
        "status_changed_count": status_changed_count,
        "active_scheduled_count": len(active_scheduled_req_ids),
        "completed_count": len(expired_completed_req_ids)
    }
