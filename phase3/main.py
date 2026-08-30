# ============================================================
# PHASE 3 MAIN V67
# RESOURCE-AWARE AUTOMATIC BLOCK PLANNER
# ============================================================
#
# FEATURES
#
# 1. Loads maintenance requests
# 2. Loads railway gaps
# 3. Loads equipment data
# 4. Loads WorkerAvailability.json
# 5. Supports the ACTUAL worker JSON structure:
#
#    database_information
#    sectors
#       SIGNAL
#          workers
#       TRACK
#          workers
#       OHE
#          workers
#
# 6. Flattens worker records
# 7. Creates date-based worker availability from railway gaps
# 8. Runs grouping.py
# 9. Runs optimizer.py
# 10. Validates final allocation
#
# ============================================================

import json
import importlib
from pathlib import Path
from types import SimpleNamespace


# ============================================================
# IMPORT PHASE 3 MODULES
# ============================================================

from grouping import create_maintenance_groups

from optimizer import (
    VERSION,
    optimize_all_groups,
    validate_allocations,
    optimization_summary,
    performance_summary
)


# ============================================================
# PROJECT DIRECTORY
# ============================================================

BASE_DIR = Path(__file__).resolve().parent


# ============================================================
# WORKER JSON
# ============================================================

WORKER_JSON_FILE = (
    BASE_DIR.parent
    / "workersAvailability"
    / "output"
    / "WorkerAvailability.json"
)


# ============================================================
# EQUIPMENT DIRECTORY
# ============================================================

EQUIPMENT_DIR = (
    BASE_DIR.parent
    / "Equipment_data"
)


# ============================================================
# DISPLAY
# ============================================================

def line():
    print("=" * 70)


def small_line():
    print("-" * 70)


def section(title):

    print()
    line()
    print(str(title).center(70))
    line()


# ============================================================
# SAFE VALUE
# ============================================================

def safe_value(obj, attribute, default="N/A"):

    try:

        if isinstance(obj, dict):

            return obj.get(
                attribute,
                default
            )

        return getattr(
            obj,
            attribute,
            default
        )

    except Exception:

        return default


# ============================================================
# NUMBER
# ============================================================

def to_number(value, default=0):

    try:
        return float(value)

    except Exception:
        return default


# ============================================================
# TIME TO MINUTES
# ============================================================

def time_to_minutes(value):

    if isinstance(value, (int, float)):
        return int(value)

    if value is None:
        return 0

    text = str(value).strip()

    if ":" in text:

        try:

            parts = text.split(":")

            hours = int(parts[0])
            minutes = int(parts[1])

            return (
                hours * 60
                + minutes
            )

        except Exception:
            pass

    try:

        return int(
            float(text)
        )

    except Exception:

        return 0


# ============================================================
# FORMAT TIME
# ============================================================

def format_time(minutes):

    try:

        minutes = int(minutes)

        hours = minutes // 60
        mins = minutes % 60

        return f"{hours:02d}:{mins:02d}"

    except Exception:

        return str(minutes)


# ============================================================
# NORMALIZE WORKER
# ============================================================

def normalize_worker_record(record):

    if not isinstance(record, dict):
        return record

    normalized = dict(record)

    # --------------------------------------------------------
    # DATE
    # --------------------------------------------------------

    date = (
        record.get("date")
        or record.get("day")
        or record.get("availability_date")
    )

    # --------------------------------------------------------
    # START
    # --------------------------------------------------------

    start_value = (
        record.get("start")
        or record.get("start_time")
        or record.get("availability_start")
    )

    # --------------------------------------------------------
    # END
    # --------------------------------------------------------

    end_value = (
        record.get("end")
        or record.get("end_time")
        or record.get("availability_end")
    )

    # --------------------------------------------------------
    # WORKER COUNT
    # --------------------------------------------------------

    workers = (
        record.get("available_workers")
    )

    if workers is None:
        workers = record.get(
            "workers_available"
        )

    if workers is None:
        workers = record.get(
            "worker_count"
        )

    if workers is None:
        workers = record.get(
            "workers"
        )

    if isinstance(workers, list):
        workers = len(workers)

    if workers is None:
        workers = 0

    normalized["date"] = (
        str(date)
        if date is not None
        else ""
    )

    normalized["start"] = time_to_minutes(
        start_value
    )

    normalized["end"] = time_to_minutes(
        end_value
    )

    normalized["available_workers"] = int(
        to_number(workers)
    )

    if normalized["end"] <= normalized["start"]:
        normalized["end"] = 1440

    return SimpleNamespace(
        **normalized
    )


# ============================================================
# GET RAILWAY GAP DATES
# ============================================================

def get_gap_dates(railway_gaps):

    dates = []

    for gap in railway_gaps:

        date = safe_value(
            gap,
            "date",
            None
        )

        if date is None:
            continue

        date = str(date).strip()

        if date and date not in dates:
            dates.append(date)

    return sorted(dates)


# ============================================================
# ACTUAL WORKER JSON PARSER
# ============================================================
#
# ACTUAL FILE:
#
# {
#   "database_information": {...},
#   "sectors": {
#       "SIGNAL": {
#           "workers": [...]
#       },
#       ...
#   }
# }
#
# ============================================================

def extract_workers_from_json(raw):

    worker_records = []

    # --------------------------------------------------------
    # CASE 1
    # Direct list
    # --------------------------------------------------------

    if isinstance(raw, list):

        for item in raw:

            if isinstance(item, dict):
                worker_records.append(item)

        return worker_records

    # --------------------------------------------------------
    # CASE 2
    # Dictionary
    # --------------------------------------------------------

    if not isinstance(raw, dict):
        return worker_records

    # --------------------------------------------------------
    # Top-level workers
    # --------------------------------------------------------

    if isinstance(
        raw.get("workers"),
        list
    ):

        worker_records.extend(
            raw["workers"]
        )

    # --------------------------------------------------------
    # Other possible top-level structures
    # --------------------------------------------------------

    for key in [
        "worker_data",
        "worker_availability",
        "availability",
        "data",
        "records"
    ]:

        value = raw.get(key)

        if isinstance(value, list):

            worker_records.extend(
                value
            )

    # --------------------------------------------------------
    # ACTUAL FORMAT:
    #
    # sectors -> sector -> workers
    # --------------------------------------------------------

    sectors = raw.get(
        "sectors"
    )

    if isinstance(
        sectors,
        dict
    ):

        for sector_name, sector_data in sectors.items():

            if not isinstance(
                sector_data,
                dict
            ):
                continue

            sector_workers = sector_data.get(
                "workers",
                []
            )

            if not isinstance(
                sector_workers,
                list
            ):
                continue

            for worker in sector_workers:

                if not isinstance(
                    worker,
                    dict
                ):
                    continue

                worker_copy = dict(
                    worker
                )

                # ------------------------------------------------
                # Ensure sector is retained
                # ------------------------------------------------

                if not worker_copy.get(
                    "sector"
                ):

                    worker_copy[
                        "sector"
                    ] = sector_data.get(
                        "sector",
                        sector_name
                    )

                # ------------------------------------------------
                # Ensure skill is retained
                # ------------------------------------------------

                if not worker_copy.get(
                    "skill"
                ):

                    worker_copy[
                        "skill"
                    ] = sector_data.get(
                        "skill",
                        ""
                    )

                worker_records.append(
                    worker_copy
                )

    return worker_records


# ============================================================
# LOAD WORKER DATA
# ============================================================

def load_worker_data(railway_gaps):

    section(
        "LOADING WORKER AVAILABILITY"
    )

    print(
        "Worker JSON:"
    )

    print(
        WORKER_JSON_FILE
    )

    print()

    # --------------------------------------------------------
    # CHECK FILE
    # --------------------------------------------------------

    if not WORKER_JSON_FILE.exists():

        print(
            "[ERROR] Worker availability JSON not found."
        )

        print()

        print(
            "Expected:"
        )

        print(
            WORKER_JSON_FILE
        )

        raise FileNotFoundError(
            f"Worker JSON not found: "
            f"{WORKER_JSON_FILE}"
        )

    # --------------------------------------------------------
    # LOAD JSON
    # --------------------------------------------------------

    try:

        with open(
            WORKER_JSON_FILE,
            "r",
            encoding="utf-8"
        ) as file:

            raw = json.load(file)

    except Exception as error:

        print(
            "[ERROR] Could not read WorkerAvailability.json"
        )

        print(error)

        raise

    # --------------------------------------------------------
    # EXTRACT INDIVIDUAL WORKERS
    # --------------------------------------------------------

    workers = extract_workers_from_json(
        raw
    )

    # --------------------------------------------------------
    # REMOVE DUPLICATES
    # --------------------------------------------------------

    unique_workers = {}

    for worker in workers:

        worker_id = worker.get(
            "worker_id"
        )

        if worker_id:

            unique_workers[
                str(worker_id)
            ] = worker

    workers = list(
        unique_workers.values()
    )

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    if not workers:

        print(
            "[ERROR] No worker records found."
        )

        print()

        print(
            "Detected JSON keys:"
        )

        if isinstance(raw, dict):

            for key in raw.keys():
                print(
                    f"  - {key}"
                )

        raise ValueError(
            "No worker records found "
            "inside WorkerAvailability.json"
        )

    # --------------------------------------------------------
    # FILTER AVAILABLE WORKERS
    # --------------------------------------------------------

    available_workers = []

    for worker in workers:

        available = str(
            worker.get(
                "available",
                "True"
            )
        ).strip().lower()

        status = str(
            worker.get(
                "status",
                "Available"
            )
        ).strip().lower()

        if (
            available == "true"
            and
            status == "available"
        ):

            available_workers.append(
                worker
            )

    # --------------------------------------------------------
    # FALLBACK
    # --------------------------------------------------------

    if not available_workers:

        print(
            "[WARNING] No workers passed "
            "availability filter."
        )

        print(
            "Using all worker records."
        )

        available_workers = workers

    # --------------------------------------------------------
    # BASIC INFORMATION
    # --------------------------------------------------------

    print(
        f"[OK] Worker records found: "
        f"{len(workers)}"
    )

    print(
        f"[OK] Available workers: "
        f"{len(available_workers)}"
    )

    # --------------------------------------------------------
    # SECTOR SUMMARY
    # --------------------------------------------------------

    print()

    print(
        "WORKER SECTOR SUMMARY"
    )

    small_line()

    sector_counts = {}

    for worker in available_workers:

        sector = str(
            worker.get(
                "sector",
                "UNKNOWN"
            )
        ).upper()

        sector_counts[
            sector
        ] = (
            sector_counts.get(
                sector,
                0
            )
            + 1
        )

    for sector in sorted(
        sector_counts
    ):

        print(
            f"{sector:<15} | "
            f"{sector_counts[sector]} workers"
        )

    # --------------------------------------------------------
    # CORRIDOR SUMMARY
    # --------------------------------------------------------

    print()

    print(
        "WORKER CORRIDOR SUMMARY"
    )

    small_line()

    corridor_counts = {}

    for worker in available_workers:

        corridor = str(
            worker.get(
                "corridor",
                "UNKNOWN"
            )
        ).upper()

        corridor_counts[
            corridor
        ] = (
            corridor_counts.get(
                corridor,
                0
            )
            + 1
        )

    for corridor in sorted(
        corridor_counts
    ):

        print(
            f"{corridor:<15} | "
            f"{corridor_counts[corridor]} workers"
        )

    # ========================================================
    # IMPORTANT
    #
    # WorkerAvailability.json does not contain dates.
    #
    # Phase 3 needs date-based resources.
    #
    # Therefore create one worker availability record
    # for every date present in railway gaps.
    #
    # This uses the worker database as a static availability
    # pool across the planning horizon.
    # ========================================================

    gap_dates = get_gap_dates(
        railway_gaps
    )

    if not gap_dates:

        print()

        print(
            "[WARNING] No railway-gap dates found."
        )

        return [
            normalize_worker_record(
                {
                    "date": "",
                    "start": 0,
                    "end": 1440,
                    "available_workers":
                        len(available_workers),
                    "worker_records":
                        available_workers
                }
            )
        ]

    # --------------------------------------------------------
    # CREATE DATE-BASED WORKER RECORDS
    # --------------------------------------------------------

    worker_data = []

    # --------------------------------------------------------
    # Overall worker pool per date
    # --------------------------------------------------------

    for date in gap_dates:

        worker_data.append(
            normalize_worker_record(
                {
                    "date": date,
                    "start": 0,
                    "end": 1440,
                    "available_workers":
                        len(available_workers),
                    "worker_records":
                        available_workers
                }
            )
        )

    # --------------------------------------------------------
    # Also create sector/corridor records.
    #
    # This gives optimizer.py more detailed resource
    # information if it uses sector/corridor matching.
    # --------------------------------------------------------

    sector_groups = {}

    for worker in available_workers:

        sector = str(
            worker.get(
                "sector",
                "UNKNOWN"
            )
        ).upper()

        corridor = str(
            worker.get(
                "corridor",
                "UNKNOWN"
            )
        ).upper()

        key = (
            sector,
            corridor
        )

        if key not in sector_groups:

            sector_groups[key] = []

        sector_groups[key].append(
            worker
        )

    for date in gap_dates:

        for (
            sector,
            corridor
        ), worker_list in sector_groups.items():

            worker_data.append(
                normalize_worker_record(
                    {
                        "date": date,
                        "start": 0,
                        "end": 1440,
                        "available_workers":
                            len(worker_list),
                        "sector":
                            sector,
                        "corridor":
                            corridor,
                        "skill":
                            (
                                worker_list[0].get(
                                    "skill",
                                    ""
                                )
                                if worker_list
                                else ""
                            ),
                        "worker_records":
                            worker_list
                    }
                )
            )

    # --------------------------------------------------------
    # SUCCESS
    # --------------------------------------------------------

    print()

    print(
        f"[OK] Worker availability generated "
        f"for {len(gap_dates)} planning dates."
    )

    print(
        f"[OK] Total normalized worker records: "
        f"{len(worker_data)}"
    )

    print()

    print(
        "Planning dates:"
    )

    for date in gap_dates:

        print(
            f"  {date} | "
            f"{len(available_workers)} "
            f"available workers"
        )

    return worker_data


# ============================================================
# LOAD PHASE 3 OTHER DATA
# ============================================================

def get_other_data():

    try:

        sample_data = importlib.import_module(
            "sample_data"
        )

    except Exception as error:

        print()

        print(
            "[ERROR] Unable to import sample_data.py"
        )

        print(error)

        raise

    required = [
        "maintenance_requests",
        "railway_gaps",
        "equipment_data"
    ]

    missing = [
        name
        for name in required
        if not hasattr(
            sample_data,
            name
        )
    ]

    if missing:

        raise ImportError(
            "sample_data.py missing: "
            +
            ", ".join(
                missing
            )
        )

    return (
        sample_data.maintenance_requests,
        sample_data.railway_gaps,
        sample_data.equipment_data
    )


# ============================================================
# REQUEST DISPLAY
# ============================================================

def show_requests(tasks):

    section(
        "ALL MAINTENANCE REQUESTS"
    )

    if not tasks:

        print(
            "No maintenance requests found."
        )

        return

    for task in tasks:

        print(
            f"{safe_value(task, 'task_id')} | "
            f"{safe_value(task, 'department')} | "
            f"{safe_value(task, 'work_area')} | "
            f"{safe_value(task, 'required_duration')} min | "
            f"Priority: "
            f"{safe_value(task, 'priority')} | "
            f"Risk: "
            f"{safe_value(task, 'risk_score')} | "
            f"Due: "
            f"{safe_value(task, 'due_date')}"
        )


# ============================================================
# AVAILABLE DAYS
# ============================================================

def show_days(gaps):

    section(
        "AVAILABLE DAYS"
    )

    dates = {}

    for gap in gaps:

        date = safe_value(
            gap,
            "date",
            ""
        )

        dates[date] = (
            dates.get(
                date,
                0
            )
            + 1
        )

    for date in sorted(
        dates,
        key=str
    ):

        print(
            f"{date} | "
            f"Available railway gaps: "
            f"{dates[date]}"
        )


# ============================================================
# RESOURCE DISPLAY
# ============================================================

def show_resources(
    workers,
    equipment
):

    section(
        "RESOURCE AVAILABILITY"
    )

    # --------------------------------------------------------
    # WORKERS
    # --------------------------------------------------------

    print(
        "WORKERS"
    )

    small_line()

    worker_dates = {}

    for item in workers:

        date = str(
            safe_value(
                item,
                "date",
                ""
            )
        )

        available = int(
            to_number(
                safe_value(
                    item,
                    "available_workers",
                    0
                )
            )
        )

        # Only overall records
        # have no sector field.

        sector = safe_value(
            item,
            "sector",
            None
        )

        if sector is not None:
            continue

        worker_dates[date] = max(
            worker_dates.get(
                date,
                0
            ),
            available
        )

    for date in sorted(
        worker_dates
    ):

        print(
            f"{date} | "
            f"Workers available: "
            f"{worker_dates[date]}"
        )

    # --------------------------------------------------------
    # EQUIPMENT
    # --------------------------------------------------------

    print()

    print(
        "EQUIPMENT"
    )

    small_line()

    if not equipment:

        print(
            "No equipment data available."
        )

        return

    for item in equipment:

        date = safe_value(
            item,
            "date",
            ""
        )

        name = safe_value(
            item,
            "equipment_name",
            safe_value(
                item,
                "name",
                "Unknown"
            )
        )

        quantity = safe_value(
            item,
            "quantity",
            0
        )

        print(
            f"{date} | "
            f"{name} | "
            f"Quantity: {quantity}"
        )


# ============================================================
# GROUP DISPLAY
# ============================================================

def show_groups(groups):

    section(
        "MAINTENANCE GROUPS"
    )

    if not groups:

        print(
            "No maintenance groups created."
        )

        return

    for group in groups:

        print(
            f"{safe_value(group, 'group_id')} | "
            f"Area: "
            f"{safe_value(group, 'work_area')} | "
            f"Tasks: "
            f"{len(safe_value(group, 'tasks', []))} | "
            f"Required: "
            f"{safe_value(group, 'required_duration')} min | "
            f"Priority: "
            f"{safe_value(group, 'highest_priority')} | "
            f"Risk: "
            f"{safe_value(group, 'highest_risk')} | "
            f"Workers: "
            f"{safe_value(group, 'total_workers')}"
        )


# ============================================================
# TRAIN DISPLAY
# ============================================================

def train_display(train):

    if train is None:
        return "None"

    if isinstance(
        train,
        dict
    ):

        return str(
            train.get(
                "train_name",
                train.get(
                    "name",
                    train.get(
                        "train_id",
                        "Unknown"
                    )
                )
            )
        )

    return str(
        getattr(
            train,
            "train_name",
            getattr(
                train,
                "name",
                getattr(
                    train,
                    "train_id",
                    "Unknown"
                )
            )
        )
    )


# ============================================================
# GLOBAL ALLOCATION
# ============================================================

def show_global_allocation(
    allocations
):

    section(
        "GLOBAL BLOCK ALLOCATION"
    )

    if not allocations:

        print(
            "No feasible maintenance block found."
        )

        return

    for block in allocations:

        print(
            f"{block.group_id} -> "
            f"{block.gap_id} | "
            f"{block.date} | "
            f"{block.work_area} | "
            f"{block.required_duration} min | "
            f"Score: "
            f"{block.score:.2f}"
        )


# ============================================================
# DETAILED BLOCK
# ============================================================

def show_block(
    block,
    group
):

    section(
        f"{block.group_id} OPTIMIZED BLOCK"
    )

    print(
        "MAINTENANCE"
    )

    small_line()

    print(
        f"Corridor: {block.corridor}"
    )

    print(
        f"Work Area: {block.work_area}"
    )

    print(
        f"Task Count: {len(block.tasks)}"
    )

    print(
        f"Priority: {group.highest_priority}"
    )

    print(
        f"Risk: {group.highest_risk}"
    )

    print()

    print(
        "TASKS IN GROUP"
    )

    small_line()

    for task in block.tasks:

        print(
            f"{safe_value(task, 'task_id')} | "
            f"{safe_value(task, 'department')} | "
            f"{safe_value(task, 'required_duration')} min | "
            f"Workers: "
            f"{safe_value(task, 'workers_required')} | "
            f"Priority: "
            f"{safe_value(task, 'priority')} | "
            f"Risk: "
            f"{safe_value(task, 'risk_score')}"
        )

    print()

    print(
        "SELECTED BLOCK"
    )

    small_line()

    print(
        f"Date: {block.date}"
    )

    print(
        f"Gap ID: {block.gap_id}"
    )

    print(
        f"Start: {format_time(block.start)}"
    )

    print(
        f"End: {format_time(block.end)}"
    )

    print(
        f"Duration: "
        f"{block.required_duration} minutes"
    )

    print()

    print(
        "SURROUNDING TRAINS"
    )

    small_line()

    print(
        f"Previous Train: "
        f"{train_display(block.previous_train)}"
    )

    print(
        f"Next Train: "
        f"{train_display(block.next_train)}"
    )

    print()

    print(
        "TRAFFIC"
    )

    small_line()

    print(
        f"Train Frequency: "
        f"{block.train_frequency} trains/hour"
    )

    print(
        f"Passenger Trains: "
        f"{block.passenger_trains}"
    )

    print(
        f"Goods Trains: "
        f"{block.goods_trains}"
    )

    print(
        f"Traffic Density: "
        f"{block.traffic_density}"
    )

    print(
        f"Traffic Impact: "
        f"{block.traffic_impact}"
    )

    print()

    print(
        "RESOURCE ALLOCATION"
    )

    small_line()

    print(
        f"Workers Required: "
        f"{block.workers_required}"
    )

    print(
        f"Workers Available: "
        f"{block.workers_available}"
    )

    equipment_text = (
        ", ".join(
            block.equipment_used
        )
        if block.equipment_used
        else "None"
    )

    print(
        f"Equipment Used: "
        f"{equipment_text}"
    )

    print()

    print(
        "CORRIDOR"
    )

    small_line()

    print(
        f"Corridor: "
        f"{block.corridor}"
    )

    print(
        f"Alternative Capacity: "
        f"{block.alternative_capacity}%"
    )

    print()

    print(
        "TRAIN SAFETY"
    )

    small_line()

    print(
        f"Buffer Before Previous Train: "
        f"{block.train_buffer_before} minutes"
    )

    print(
        f"Buffer After Maintenance: "
        f"{block.train_buffer_after} minutes"
    )

    print()

    print(
        "OPTIMIZATION"
    )

    small_line()

    print(
        f"Optimization Score: "
        f"{block.score:.2f} / 100"
    )

    print()

    print(
        "DEADLINE STATUS"
    )

    small_line()

    print(
        block.deadline_status
    )

    print()

    print(
        "DECISION EXPLANATION"
    )

    small_line()

    for reason in block.reasons:

        print(
            reason
        )


# ============================================================
# VALIDATION
# ============================================================

def show_validation(checks):

    section(
        f"{VERSION} FINAL VALIDATION"
    )

    passed = 0
    failed = 0

    for name, result in checks.items():

        if result:

            print(
                f"[PASS] {name}"
            )

            passed += 1

        else:

            print(
                f"[FAIL] {name}"
            )

            failed += 1

    print()

    print(
        f"Validation Passed: {passed}"
    )

    print(
        f"Validation Failed: {failed}"
    )

    print()

    if failed == 0:

        print(
            "Overall Validation: PASS"
        )

    else:

        print(
            "Overall Validation: FAIL"
        )

    return failed == 0


# ============================================================
# PERFORMANCE
# ============================================================

def show_performance():

    data = performance_summary()

    section(
        f"{VERSION} PERFORMANCE & SCALABILITY"
    )

    print(
        f"Optimizer Version: "
        f"{data['version']}"
    )

    print(
        f"Maintenance Groups Tested: "
        f"{data['groups']}"
    )

    print(
        f"Railway Gaps Tested: "
        f"{data['railway_gaps']}"
    )

    print(
        f"Feasible Candidates Generated: "
        f"{data['candidates']}"
    )

    print(
        f"Allocated Groups: "
        f"{data['allocated']}"
    )

    print(
        f"Optimization Method: "
        f"{data['method']}"
    )

    print(
        f"Candidate Generation Time: "
        f"{data['candidate_generation_seconds']:.6f} sec"
    )

    print(
        f"Optimization Search Time: "
        f"{data['optimization_seconds']:.6f} sec"
    )

    print(
        f"Total Optimization Time: "
        f"{data['total_seconds']:.6f} sec"
    )


# ============================================================
# SUMMARY
# ============================================================

def show_summary(
    allocations,
    groups
):

    summary = optimization_summary(
        allocations,
        groups
    )

    section(
        "FINAL SUMMARY"
    )

    print(
        f"Maintenance Groups: "
        f"{summary['total_groups']}"
    )

    print(
        f"Allocated Groups: "
        f"{summary['allocated_groups']}"
    )

    print(
        f"Unallocated Groups: "
        f"{summary['unallocated_groups']}"
    )

    print(
        f"Allocation Success: "
        f"{summary['success']:.2f}%"
    )

    print()

    print(
        f"Average Optimization Score: "
        f"{summary['average_score']:.2f}"
    )

    print(
        f"Best Optimization Score: "
        f"{summary['best_score']:.2f}"
    )

    print(
        f"Worst Optimization Score: "
        f"{summary['worst_score']:.2f}"
    )

    print()

    print(
        "DEADLINE PERFORMANCE"
    )

    small_line()

    print(
        f"Before Due Date: "
        f"{summary['before_due']}"
    )

    print(
        f"On Due Date: "
        f"{summary['on_due']}"
    )

    print(
        f"Overdue: "
        f"{summary['overdue']}"
    )

    print()

    print(
        "ALLOCATED BLOCKS"
    )

    small_line()

    for block in allocations:

        print(
            f"{block.group_id}: "
            f"{block.date} | "
            f"{block.gap_id} | "
            f"{format_time(block.start)}-"
            f"{format_time(block.end)} | "
            f"Score: "
            f"{block.score:.2f}"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    print()

    line()

    print(
        f"PHASE 3 V67 STARTED".center(70)
    )

    line()

    print()

    print(
        "Project Directory:"
    )

    print(
        BASE_DIR
    )

    print()

    print(
        "Worker Availability JSON:"
    )

    print(
        WORKER_JSON_FILE
    )

    # ========================================================
    # LOAD PHASE 3 DATA
    # ========================================================

    section(
        "LOADING PHASE 3 DATA"
    )

    (
        maintenance_requests,
        railway_gaps,
        equipment_data
    ) = get_other_data()

    # ========================================================
    # LOAD WORKERS
    # ========================================================
    #
    # IMPORTANT:
    # railway_gaps is passed here because the worker JSON
    # does not contain dates.
    #
    # ========================================================

    worker_data = load_worker_data(
        railway_gaps
    )

    # ========================================================
    # DISPLAY
    # ========================================================

    show_requests(
        maintenance_requests
    )

    show_days(
        railway_gaps
    )

    show_resources(
        worker_data,
        equipment_data
    )

    # ========================================================
    # GROUPING
    # ========================================================

    groups = create_maintenance_groups(
        maintenance_requests
    )

    show_groups(
        groups
    )

    # ========================================================
    # OPTIMIZATION
    # ========================================================

    section(
        f"{VERSION} GLOBAL MULTI-OBJECTIVE BLOCK ALLOCATION"
    )

    print(
        "Priority + Risk + Deadline + "
        "Railway Gap + Traffic + "
        "Worker + Equipment + Safety + Slack"
    )

    print()

    print(
        "Starting global optimization..."
    )

    print()

    print(
        "[INFO] Worker data source:"
    )

    print(
        WORKER_JSON_FILE
    )

    print()

    allocations = optimize_all_groups(
        groups,
        railway_gaps,
        worker_data,
        equipment_data
    )

    # ========================================================
    # GLOBAL RESULT
    # ========================================================

    show_global_allocation(
        allocations
    )

    # ========================================================
    # DETAILED BLOCKS
    # ========================================================

    group_map = {
        group.group_id: group
        for group in groups
    }

    for block in allocations:

        group = group_map.get(
            block.group_id
        )

        if group is not None:

            show_block(
                block,
                group
            )

    # ========================================================
    # VALIDATION
    # ========================================================

    checks = validate_allocations(
        allocations,
        groups,
        railway_gaps,
        worker_data,
        equipment_data
    )

    validation_ok = show_validation(
        checks
    )

    # ========================================================
    # PERFORMANCE
    # ========================================================

    show_performance()

    # ========================================================
    # SUMMARY
    # ========================================================

    show_summary(
        allocations,
        groups
    )

    # ========================================================
    # FINAL STATUS
    # ========================================================

    print()

    line()

    if validation_ok:

        print(
            f"PHASE 3 {VERSION} "
            f"COMPLETED - VERIFIED.".center(70)
        )

    else:

        print(
            f"PHASE 3 {VERSION} "
            f"COMPLETED - CHECK REQUIRED".center(70)
        )

    line()

    print()


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except Exception as error:

        print()

        line()

        print(
            "PHASE 3 ERROR".center(70)
        )

        line()

        print()

        print(
            f"{type(error).__name__}: {error}"
        )

        print()

        raise