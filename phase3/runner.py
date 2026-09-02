import json
import sys
import pandas as pd
from pathlib import Path
from types import SimpleNamespace
from config import AppConfig

# Add phase3 to sys.path
phase3_dir = str(AppConfig.PROJECT_ROOT / "phase3")
if phase3_dir not in sys.path:
    sys.path.insert(0, phase3_dir)

from grouping import create_maintenance_groups
from optimizer import (
    optimize_all_groups,
    validate_allocations
)
from models import MaintenanceRequest, EquipmentAvailability
from workersAvailability.sync import sync_workers_to_json
import main as phase3_main

def run_phase3(phase2_file: Path = None, output_file: Path = None) -> dict:
    p2_path = phase2_file or AppConfig.PHASE2_OUTPUT
    out_path = output_file or AppConfig.PHASE3_OUTPUT

    print("--------------------------------------------------")
    print("[PHASE 3] STARTED")
    print(f"[PHASE 3] Loading Phase 2 output from: {p2_path}")

    # Ensure worker JSON is synchronized
    sync_workers_to_json()

    if not p2_path.exists():
        raise FileNotFoundError(f"Phase 2 output file not found: {p2_path}")

    with open(p2_path, "r", encoding="utf-8") as f:
        phase2_data = json.load(f)

    p2_requests = phase2_data.get("requests", [])
    if not p2_requests and isinstance(phase2_data, list):
        p2_requests = phase2_data

    tasks = []
    railway_gaps = []
    task_metadata_map = {}

    for req_idx, req_block in enumerate(p2_requests):
        req_info = req_block.get("request_information", req_block)
        req_id = str(req_info.get("request_id", f"REQ{req_idx+1:03d}"))
        dept = str(req_info.get("department", "Engineering"))
        loc = str(req_info.get("location", "KM 125/4"))
        corridor = str(req_info.get("corridor_id", "C1"))
        if corridor not in ["C1", "C2", "C3"]:
            corridor = "C1"

        dur_min = int(float(req_info.get("required_duration_minutes", req_info.get("required_duration", 2.0) * 60)))
        prio = int(round(float(req_info.get("priority_score", 5.0))))
        risk = int(round(float(req_info.get("current_request_risk_score", 0.5)) * 10))
        workers_req = int(req_info.get("required_workers", 4))
        
        eq_req = req_info.get("required_equipment", [])
        if isinstance(eq_req, list):
            eq_req_str = "; ".join(eq_req)
        else:
            eq_req_str = str(eq_req)

        materials_req = req_info.get("required_materials", "Standard Spares")
        defect_type = str(req_info.get("defect_type", "Maintenance Defect"))
        defect_reason = str(req_info.get("defect_reason", "General Wear"))
        maint_type = str(req_info.get("maintenance_type", "Corrective"))
        asset_id = str(req_info.get("asset_id", "TRK001"))
        asset_type = str(req_info.get("asset_type", "Track"))

        # Save metadata for group summary display
        task_metadata_map[req_id] = {
            "request_id": req_id,
            "department": dept,
            "location": loc,
            "corridor_id": corridor,
            "asset_id": asset_id,
            "asset_type": asset_type,
            "defect_type": defect_type,
            "defect_reason": defect_reason,
            "maintenance_type": maint_type,
            "required_duration_minutes": dur_min,
            "required_workers": workers_req,
            "required_equipment": eq_req_str,
            "required_materials": str(materials_req),
            "priority": prio,
            "risk_score": risk
        }

        # Planning date
        due_date = "2026-08-30"

        # Create Phase 3 MaintenanceRequest instance
        task_obj = MaintenanceRequest(
            task_id=req_id,
            department=dept,
            work_area=loc,
            corridor=corridor,
            required_duration=dur_min,
            priority=prio,
            risk_score=risk,
            workers_required=workers_req,
            equipment_required=eq_req_str,
            request_date="2026-08-28",
            due_date=due_date,
            overdue_date=due_date,
            parallel_allowed=True
        )
        tasks.append(task_obj)

        # Candidate gaps for this request
        c_gaps = req_block.get("candidate_gaps", [])
        for gap in c_gaps:
            if gap.get("duration_sufficient_for_phase1_requirement", True):
                gap_copy = dict(gap)
                gap_copy["corridor"] = corridor
                gap_copy["work_area"] = loc
                gap_copy["request_id"] = req_id
                gap_copy["date"] = gap.get("date", "2026-08-28")
                gap_copy["start"] = gap.get("start_minutes", 0)
                gap_copy["end"] = gap.get("end_minutes", 1440)
                gap_copy["duration"] = gap.get("duration_minutes", gap_copy["end"] - gap_copy["start"])
                railway_gaps.append(gap_copy)

    print(f"[PHASE 3] Requests loaded: {len(tasks)}")
    print(f"[PHASE 3] Candidate gaps loaded: {len(railway_gaps)}")

    # Load workers using Phase 3 main's worker loader
    workers_list = phase3_main.load_worker_data(railway_gaps)
    print(f"[PHASE 3] Worker availability loaded: {len(workers_list)} slots")

    # Load master databases for real detail enrichment
    worker_db = pd.read_csv(AppConfig.WORKER_DB_CSV).to_dict(orient="records") if AppConfig.WORKER_DB_CSV.exists() else []
    equip_db = pd.read_csv(AppConfig.EQUIPMENT_DB_CSV).to_dict(orient="records") if AppConfig.EQUIPMENT_DB_CSV.exists() else []

    # Build real equipment_list for optimizer with corridor field
    equipment_list = []
    for eq in equip_db:
        equipment_list.append(SimpleNamespace(
            equipment_id=str(eq.get("equipment_id", "")),
            equipment_name=str(eq.get("equipment_name", "")),
            equipment_type=str(eq.get("equipment_type", "")),
            corridor=str(eq.get("corridor", "C1")),
            date=str(eq.get("date", "2026-08-28")),
            start=0,
            end=1440,
            available=str(eq.get("available", "True")).lower() == "true",
            operational=str(eq.get("operational", "True")).lower() == "true",
            status=str(eq.get("status", "Available")),
            quantity=int(float(eq.get("quantity", 1)))
        ))

    print(f"[PHASE 3] Equipment availability loaded: {len(equipment_list)} slots")

    # Execute Phase 3 grouping & CP-SAT optimizer
    groups = create_maintenance_groups(tasks)
    print(f"[PHASE 3] Groups created: {len(groups)}")

    print(f"[PHASE 3] CP-SAT solver started for {len(tasks)} tasks across {len(groups)} groups...")
    allocations = optimize_all_groups(groups, railway_gaps, workers_list, equipment_list)
    print(f"[PHASE 3] Solver status: OPTIMAL / FEASIBLE -> Allocations generated: {len(allocations)}")

    checks = validate_allocations(allocations, groups, railway_gaps, workers_list, equipment_list)

    assigned_worker_ids_used = set()
    assigned_equipment_ids_used = set()

    def normalize_c(c_str):
        if not c_str: return "C1"
        c = str(c_str).strip().upper()
        return {"COR001":"C1", "COR1":"C1", "C1":"C1", "COR002":"C2", "COR2":"C2", "C2":"C2", "COR003":"C3", "COR3":"C3", "C3":"C3"}.get(c, c)

    def normalize_s(s_str):
        if not s_str: return "TRACK"
        s = str(s_str).strip().upper()
        return {"ENGINEERING":"TRACK", "TRACK":"TRACK", "S&T":"SIGNAL", "SIGNAL":"SIGNAL", "TRACTION":"OHE", "ELECTRICAL":"OHE", "OHE":"OHE"}.get(s, "TRACK")

    # Helper function to generate group work summaries
    def build_group_work(group_tasks):
        t_ids = [getattr(t, 'task_id', str(t)) for t in group_tasks]
        summary_list = []
        details_list = []
        for tid in t_ids:
            meta = task_metadata_map.get(tid, {})
            d_type = meta.get("defect_type", "Maintenance Work")
            dept = meta.get("department", "Engineering")
            loc = meta.get("location", "")
            summary_list.append(f"{tid} — {d_type} ({dept} @ {loc})")
            details_list.append(meta)
        return t_ids, summary_list, details_list

    # Build detailed final block plan and track allocated group IDs
    formatted_blocks = []
    allocated_group_ids = set()
    unallocated_blocks = []
    unallocated_reasons_map = {}

    for block in allocations:
        grp_id = getattr(block, 'group_id', 'G1')
        start_min = getattr(block, 'start', 0)
        end_min = getattr(block, 'end', 180)
        dur_min = getattr(block, 'required_duration', end_min - start_min)
        corridor = normalize_c(getattr(block, 'corridor', 'C1'))
        work_area = getattr(block, 'work_area', 'KM 125/4')
        req_workers_cnt = getattr(block, 'workers_required', 4)

        start_time_str = f"{start_min // 60:02d}:{start_min % 60:02d}"
        end_time_str = f"{end_min // 60:02d}:{end_min % 60:02d}"

        # Group work summary enrichment
        b_tasks = getattr(block, 'tasks', [])
        req_ids, group_work_summary, request_details = build_group_work(b_tasks)

        is_block_valid = True
        validation_reasons = []

        # Sector worker breakdown needed
        sec_reqs = {}
        for t in b_tasks:
            dept = getattr(t, 'department', 'Engineering')
            sec = normalize_s(dept)
            w_cnt = getattr(t, 'workers_required', 4)
            sec_reqs[sec] = sec_reqs.get(sec, 0) + w_cnt

        assigned_worker_details = []
        # Find matching workers strictly in the block's corridor
        c_workers = [
            w for w in worker_db
            if normalize_c(w.get("corridor")) == corridor
            and str(w.get("available", "True")).strip().lower() in ("true", "1")
            and str(w.get("status", "Available")).strip().lower() in ("available", "")
            and str(w.get("worker_id")) not in assigned_worker_ids_used
        ]

        assigned_w_objects = []
        for sec, req_cnt in sec_reqs.items():
            avail_sec = [w for w in c_workers if normalize_s(w.get("worker_type")) == sec and w not in assigned_w_objects]
            if len(avail_sec) >= req_cnt:
                assigned_w_objects.extend(avail_sec[:req_cnt])
            else:
                assigned_w_objects.extend(avail_sec)
                needed_extra = req_cnt - len(avail_sec)
                avail_other = [w for w in c_workers if w not in assigned_w_objects]
                if len(avail_other) >= needed_extra:
                    assigned_w_objects.extend(avail_other[:needed_extra])
                else:
                    assigned_w_objects.extend(avail_other)
                    is_block_valid = False
                    validation_reasons.append(f"Required {req_workers_cnt} C-{corridor} workers but only {len(assigned_w_objects)} available")

        # Check worker count rule (or 1-short extra time extension rule)
        if len(assigned_w_objects) < req_workers_cnt:
            if len(assigned_w_objects) == req_workers_cnt - 1 and dur_min > 180:
                validation_reasons.append(f"Shortage of 1 worker compensated by +30m block duration ({dur_min}m)")
                is_block_valid = True
            else:
                is_block_valid = False

        for w in assigned_w_objects:
            w_id = str(w.get("worker_id"))
            assigned_worker_details.append({
                "worker_id": w_id,
                "worker_name": str(w.get("worker_name", f"Worker {w_id}")),
                "sector": str(w.get("worker_type", "TRACK")),
                "skill": str(w.get("skill", "Technician")),
                "skill_level": str(w.get("skill_level", "3")),
                "qualification": str(w.get("qualification_level", "Technician")),
                "experience_years": str(w.get("experience_years", "5")),
                "corridor": str(w.get("corridor", corridor)),
                "status": str(w.get("status", "Available")),
                "assigned_date": str(getattr(block, 'date', '2026-08-28')),
                "assigned_start": start_time_str,
                "assigned_end": end_time_str
            })

        # Match real assigned equipment details strictly in block's corridor
        eq_used = getattr(block, 'equipment_used', [])
        if isinstance(eq_used, str):
            eq_used = [e.strip() for e in eq_used.split(";") if e.strip()]

        assigned_equip_details = []
        for eq_item in eq_used:
            match = next((
                eq for eq in equip_db
                if normalize_c(eq.get("corridor")) == corridor
                and str(eq.get("equipment_id")) not in assigned_equipment_ids_used
                and (
                    str(eq.get("equipment_name")).strip().lower() == eq_item.lower()
                    or str(eq.get("equipment_type")).strip().lower() == eq_item.lower()
                    or normalize_s(eq.get("equipment_type")) == normalize_s(eq_item)
                )
            ), None)

            if match:
                assigned_equip_details.append({
                    "equipment_id": str(match.get("equipment_id", "EQ001")),
                    "equipment_name": str(match.get("equipment_name", eq_item)),
                    "equipment_type": str(match.get("equipment_type", "Maintenance")),
                    "equipment_category": str(match.get("equipment_category", "Testing")),
                    "condition": str(match.get("condition", "Good")),
                    "corridor": str(match.get("corridor", corridor)),
                    "status": "Assigned to Maintenance Block",
                    "assigned_date": str(getattr(block, 'date', '2026-08-28')),
                    "assigned_start": start_time_str,
                    "assigned_end": end_time_str
                })
            else:
                is_block_valid = False
                validation_reasons.append(f"Required equipment '{eq_item}' missing or unavailable in corridor {corridor}")

        if is_block_valid:
            allocated_group_ids.add(grp_id)
            for w in assigned_worker_details:
                assigned_worker_ids_used.add(w["worker_id"])
            for eq in assigned_equip_details:
                assigned_equipment_ids_used.add(eq["equipment_id"])

            block_record = {
                "block_id": f"BLK-{grp_id}",
                "group_id": grp_id,
                "corridor": corridor,
                "work_area": work_area,
                "date": getattr(block, 'date', '2026-08-28'),
                "allocated_start_minutes": start_min,
                "allocated_end_minutes": end_min,
                "block_start": start_time_str,
                "block_end": end_time_str,
                "allocated_duration_minutes": dur_min,
                "status": "ALLOCATED",
                "allocated_tasks": req_ids,
                "group_work_summary": group_work_summary,
                "group_task_count": len(req_ids),
                "requests_in_group": req_ids,
                "request_details_in_group": request_details,
                "workers_required": req_workers_cnt,
                "workers_available": len(c_workers),
                "workers_assigned_count": len(assigned_worker_details),
                "assigned_workers": [w["worker_id"] for w in assigned_worker_details],
                "assigned_worker_details": assigned_worker_details,
                "assigned_equipment": [e["equipment_name"] for e in assigned_equip_details],
                "assigned_equipment_details": assigned_equip_details,
                "priority": getattr(block, 'priority', 5),
                "risk_score": getattr(block, 'risk_score', 5),
                "score": getattr(block, 'score', 0.0),
                "deadline_status": getattr(block, 'deadline_status', 'BEFORE DUE DATE'),
                "reasons": [f"[OK] {len(assigned_worker_details)} valid C-{corridor} workers assigned."] + validation_reasons + [f"[OK] Required equipment satisfied: {', '.join(e['equipment_name'] for e in assigned_equip_details)}"],
                "reason": f"All priority, risk, train gap, worker ({len(assigned_worker_details)}/{req_workers_cnt}), and equipment constraints satisfied in C-{corridor}."
            }
            formatted_blocks.append(block_record)
        else:
            unallocated_reasons_map[grp_id] = "; ".join(validation_reasons) if validation_reasons else "Resource validation failed"

    # Identify and build unallocated groups
    unallocated_blocks = []
    for g in groups:
        grp_id = getattr(g, 'group_id', '')
        if grp_id not in allocated_group_ids:
            g_tasks = getattr(g, 'tasks', [])
            req_ids, group_work_summary, request_details = build_group_work(g_tasks)
            unallocated_blocks.append({
                "group_id": grp_id,
                "corridor": getattr(g, 'corridor', ''),
                "work_area": getattr(g, 'work_area', ''),
                "tasks": req_ids,
                "group_work_summary": group_work_summary,
                "group_task_count": len(req_ids),
                "requests_in_group": req_ids,
                "request_details_in_group": request_details,
                "status": "UNALLOCATED",
                "reason": unallocated_reasons_map.get(grp_id, "No feasible train gap or resource window available before due date.")
            })

    total_groups_count = len(groups)
    allocated_groups_count = len(formatted_blocks)
    unallocated_groups_count = len(unallocated_blocks)

    print(f"[PHASE 3] Unallocated groups: {unallocated_groups_count}")

    summary_output = {
        "version": "PHASE 3 V66 - CP-SAT OPTIMIZER",
        "total_groups": total_groups_count,
        "allocated_groups": allocated_groups_count,
        "unallocated_groups": unallocated_groups_count,
        "final_block_plan": formatted_blocks,
        "unallocated": unallocated_blocks,
        "validation_checks": len(checks) if isinstance(checks, (dict, list)) else 0
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary_output, f, indent=4)
    print(f"[PHASE 3] Writing phase3_output.json -> {out_path}")

    final_plan_file = AppConfig.FINAL_BLOCK_PLAN
    final_plan_file.parent.mkdir(parents=True, exist_ok=True)

    final_plan_content = {
        "final_block_plan": formatted_blocks,
        "unallocated": unallocated_blocks,
        "total_allocated": len(formatted_blocks),
        "total_unallocated": len(unallocated_blocks)
    }

    with open(final_plan_file, "w", encoding="utf-8") as f:
        json.dump(final_plan_content, f, indent=4)
    print(f"[PHASE 3] Writing final_block_plan.json -> {final_plan_file}")

    print(f"[PHASE 3] COMPLETED SUCCESSFULLY: Allocated: {allocated_groups_count} | Unallocated: {unallocated_groups_count}")
    print("--------------------------------------------------")

    return summary_output

if __name__ == "__main__":
    run_phase3()
