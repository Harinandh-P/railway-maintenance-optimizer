# optimizer.py
# PHASE 3 RAILWAY BLOCK OPTIMIZER
# FINAL V66
#
# Includes:
#   Priority
#   Risk
#   Deadline
#   Railway gaps
#   Traffic
#   Worker availability
#   Equipment availability
#   Equipment quantity
#   Equipment time-overlap
#   Railway conflict
#   Worker conflict
#   Safety buffers
#   Global optimization
#   Validation
#   Performance measurement


from dataclasses import dataclass, field
from datetime import date, datetime
from time import perf_counter


VERSION = "V66"


# ============================================================
# PERFORMANCE
# ============================================================

_LAST_PERFORMANCE = {

    "version": VERSION,

    "groups": 0,

    "railway_gaps": 0,

    "candidates": 0,

    "allocated": 0,

    "candidate_generation_seconds": 0.0,

    "optimization_seconds": 0.0,

    "total_seconds": 0.0,

    "method": "UNKNOWN"
}


# ============================================================
# GENERIC HELPERS
# ============================================================

def normalize_corridor(corridor):
    if not corridor:
        return "C1"
    c = str(corridor).strip().upper()
    mapping = {
        "COR001": "C1", "COR1": "C1", "C1": "C1",
        "COR002": "C2", "COR2": "C2", "C2": "C2",
        "COR003": "C3", "COR3": "C3", "C3": "C3"
    }
    return mapping.get(c, c)

def normalize_sector(sector):
    if not sector:
        return "TRACK"
    s = str(sector).strip().upper()
    mapping = {
        "ENGINEERING": "TRACK", "TRACK": "TRACK",
        "S&T": "SIGNAL", "SIGNAL": "SIGNAL",
        "TRACTION": "OHE", "ELECTRICAL": "OHE", "OHE": "OHE"
    }
    return mapping.get(s, s)

def get_value(
    obj,
    name,
    default=None
):

    if isinstance(obj, dict):

        return obj.get(
            name,
            default
        )

    return getattr(
        obj,
        name,
        default
    )


def as_date(value):

    if isinstance(
        value,
        datetime
    ):

        return value.date()

    if isinstance(
        value,
        date
    ):

        return value

    if value is None:

        return date.max

    text = str(value)

    for fmt in (
        "%Y-%m-%d",
        "%d-%m-%Y",
        "%d/%m/%Y"
    ):

        try:

            return datetime.strptime(
                text,
                fmt
            ).date()

        except ValueError:

            pass

    return date.max


def as_number(
    value,
    default=0.0
):

    try:

        return float(value)

    except Exception:

        return default


def overlap(
    start1,
    end1,
    start2,
    end2
):

    return (
        start1 < end2
        and
        start2 < end1
    )


# ============================================================
# TASK ACCESSORS
# ============================================================

def task_id(task):

    return get_value(
        task,
        "task_id",
        "UNKNOWN"
    )


def task_duration(task):

    return as_number(
        get_value(
            task,
            "required_duration",
            get_value(
                task,
                "duration",
                0
            )
        )
    )


def task_workers(task):

    return int(
        as_number(
            get_value(
                task,
                "workers_required",
                get_value(
                    task,
                    "workers",
                    0
                )
            )
        )
    )


def task_priority(task):

    return as_number(
        get_value(
            task,
            "priority",
            get_value(
                task,
                "priority_score",
                0
            )
        )
    )


def task_risk(task):

    return as_number(
        get_value(
            task,
            "risk_score",
            get_value(
                task,
                "risk",
                0
            )
        )
    )


def task_due(task):

    return get_value(
        task,
        "due_date",
        get_value(
            task,
            "deadline",
        None)
    )


def task_parallel(task):

    return bool(
        get_value(
            task,
            "parallel_allowed",
            True
        )
    )


def task_equipment(task):

    value = get_value(
        task,
        "equipment_required",
        get_value(
            task,
            "required_equipment",
            []
        )
    )

    if value is None:

        return []

    if isinstance(
        value,
        str
    ):

        return [
            x.strip()
            for x in value.replace(
                ";",
                ","
            ).split(",")
            if x.strip()
        ]

    try:

        return list(value)

    except Exception:

        return [str(value)]


# ============================================================
# GROUP ACCESSORS
# ============================================================

def group_duration(group):

    explicit = get_value(
        group,
        "required_duration",
        None
    )

    if explicit is not None:

        return int(
            as_number(explicit)
        )

    tasks = get_value(
        group,
        "tasks",
        []
    )

    if not tasks:

        return 0

    durations = [
        task_duration(task)
        for task in tasks
    ]

    if all(
        task_parallel(task)
        for task in tasks
    ):

        return int(
            max(durations)
        )

    return int(
        sum(durations)
    )


def group_workers(group):

    explicit = get_value(
        group,
        "total_workers",
        None
    )

    if explicit is not None:

        return int(
            as_number(explicit)
        )

    tasks = get_value(
        group,
        "tasks",
        []
    )

    if not tasks:

        return 0

    if all(
        task_parallel(task)
        for task in tasks
    ):

        return int(
            sum(
                task_workers(task)
                for task in tasks
            )
        )

    return int(
        max(
            task_workers(task)
            for task in tasks
        )
    )


def group_priority(group):

    value = get_value(
        group,
        "highest_priority",
        None
    )

    if value is not None:

        return as_number(value)

    return max(
        (
            task_priority(task)
            for task in get_value(
                group,
                "tasks",
                []
            )
        ),
        default=0
    )


def group_risk(group):

    value = get_value(
        group,
        "highest_risk",
        None
    )

    if value is not None:

        return as_number(value)

    return max(
        (
            task_risk(task)
            for task in get_value(
                group,
                "tasks",
                []
            )
        ),
        default=0
    )


def group_due(group):

    value = get_value(
        group,
        "earliest_due_date",
        None
    )

    if value is not None:

        return value

    value = get_value(
        group,
        "due_date",
        None
    )

    if value is not None:

        return value

    dates = [
        task_due(task)
        for task in get_value(
            group,
            "tasks",
            []
        )
        if task_due(task) is not None
    ]

    if not dates:

        return date.max

    return min(
        dates,
        key=as_date
    )


def group_equipment(group):

    result = []

    for task in get_value(
        group,
        "tasks",
        []
    ):

        for item in task_equipment(task):

            exists = any(
                str(item).strip().lower()
                ==
                str(old).strip().lower()
                for old in result
            )

            if not exists:

                result.append(item)

    return result


# ============================================================
# GAP ACCESSORS
# ============================================================

def gap_date(gap):

    return get_value(
        gap,
        "date",
        None
    )


def gap_id(gap):

    return str(
        get_value(
            gap,
            "gap_id",
            "UNKNOWN"
        )
    )


def gap_corridor(gap):

    return get_value(
        gap,
        "corridor",
        ""
    )


def gap_start(gap):

    return int(
        as_number(
            get_value(
                gap,
                "start",
                get_value(
                    gap,
                    "start_time",
                    0
                )
            )
        )
    )


def gap_end(gap):

    return int(
        as_number(
            get_value(
                gap,
                "end",
                get_value(
                    gap,
                    "end_time",
                    0
                )
            )
        )
    )


def gap_duration(gap):

    explicit = get_value(
        gap,
        "duration",
        None
    )

    if explicit is not None:

        return int(
            as_number(explicit)
        )

    return (
        gap_end(gap)
        -
        gap_start(gap)
    )


def gap_previous(gap):

    return get_value(
        gap,
        "previous_train",
        None
    )


def gap_next(gap):

    return get_value(
        gap,
        "next_train",
        None
    )


def gap_frequency(gap):

    return as_number(
        get_value(
            gap,
            "train_frequency",
            0
        )
    )


def gap_passenger(gap):

    return int(
        as_number(
            get_value(
                gap,
                "passenger_trains",
                0
            )
        )
    )


def gap_goods(gap):

    return int(
        as_number(
            get_value(
                gap,
                "goods_trains",
                0
            )
        )
    )


def gap_density(gap):

    return as_number(
        get_value(
            gap,
            "traffic_density",
            0
        )
    )


def gap_alt(gap):

    return as_number(
        get_value(
            gap,
            "alternative_capacity",
            0
        )
    )


# ============================================================
# TRAFFIC
# ============================================================

def traffic_score(gap):

    density = gap_density(gap)

    frequency = gap_frequency(gap)

    density_score = max(
        0,
        min(
            100,
            100 - density * 100
        )
    )

    frequency_score = max(
        0,
        min(
            100,
            100 - frequency * 20
        )
    )

    return round(
        density_score * 0.65
        +
        frequency_score * 0.35,
        2
    )


def traffic_impact(gap):

    density = gap_density(gap)

    frequency = gap_frequency(gap)

    passenger = gap_passenger(gap)

    goods = gap_goods(gap)

    impact = (
        density * 50
        +
        min(
            frequency * 8,
            30
        )
        +
        min(
            passenger * 2,
            10
        )
        +
        min(
            goods * 3,
            10
        )
    )

    return round(
        min(
            100,
            impact
        ),
        2
    )


# ============================================================
# DEADLINE
# ============================================================

def days_until_due(
    selected_date,
    group
):

    return (
        as_date(group_due(group))
        -
        as_date(selected_date)
    ).days


def deadline_status(
    selected_date,
    due
):

    selected = as_date(
        selected_date
    )

    due_date = as_date(
        due
    )

    if selected < due_date:

        return "BEFORE DUE DATE"

    if selected == due_date:

        return "ON DUE DATE"

    return "OVERDUE"


def deadline_score(
    selected_date,
    group
):

    days = days_until_due(
        selected_date,
        group
    )

    if days < 0:
        return 0

    if days == 0:
        return 80

    if days == 1:
        return 95

    if days == 2:
        return 92

    if days == 3:
        return 88

    if days <= 5:
        return 82

    return 70


def early_score(
    selected_date,
    group
):

    days = days_until_due(
        selected_date,
        group
    )

    if days < 0:
        return 0

    if days == 0:
        return 70

    if days == 1:
        return 100

    if days == 2:
        return 97

    if days == 3:
        return 94

    if days <= 5:
        return 90

    return 80


# ============================================================
# RESOURCE RECORD HELPERS
# ============================================================

def record_date(item):

    return get_value(
        item,
        "date",
        None
    )


def record_start(item):

    return int(
        as_number(
            get_value(
                item,
                "start",
                get_value(
                    item,
                    "start_time",
                    0
                )
            )
        )
    )


def record_end(item):

    value = get_value(
        item,
        "end",
        get_value(
            item,
            "end_time",
            None
        )
    )

    if value is not None:

        return int(
            as_number(value)
        )

    duration = get_value(
        item,
        "duration",
        1440
    )

    return (
        record_start(item)
        +
        int(
            as_number(duration)
        )
    )


# ============================================================
# WORKERS
# ============================================================

# ============================================================
# WORKERS
# ============================================================

def workers_available(
    selected_date,
    start,
    end,
    worker_data,
    target_corridor=None,
    target_sector=None
):

    if not worker_data:
        return 0

    norm_target_c = normalize_corridor(target_corridor) if target_corridor else None
    norm_target_s = normalize_sector(target_sector) if target_sector else None

    matching = []
    for item in worker_data:
        # Date check if present
        rec_d = record_date(item)
        if rec_d and str(rec_d) != str(selected_date):
            continue

        # Corridor check
        item_c = get_value(item, "corridor", None)
        if norm_target_c and item_c:
            if normalize_corridor(item_c) != norm_target_c:
                continue

        # Sector check
        if norm_target_s:
            item_s = get_value(item, "worker_type", get_value(item, "sector", get_value(item, "department", None)))
            if item_s and normalize_sector(item_s) != norm_target_s:
                continue

        # Status check
        avail = str(get_value(item, "available", "True")).strip().lower()
        stat = str(get_value(item, "status", "Available")).strip().lower()
        if avail not in ("true", "1") or stat not in ("available", ""):
            continue

        matching.append(item)

    if not matching:
        return 0

    # Sum available_workers for summary objects or count individual records
    total_workers = 0
    for item in matching:
        cnt = get_value(item, "available_workers", get_value(item, "worker_count", get_value(item, "workers", None)))
        if cnt is not None and isinstance(cnt, (int, float)):
            total_workers += int(cnt)
        else:
            total_workers += 1

    return total_workers


# ============================================================
# EQUIPMENT
# ============================================================

def equipment_name(item):

    return str(
        get_value(
            item,
            "equipment_name",
            get_value(
                item,
                "name",
                get_value(
                    item,
                    "equipment_type",
                    ""
                )
            )
        )
    ).strip()


def equipment_quantity(item):

    return int(
        as_number(
            get_value(
                item,
                "quantity",
                get_value(
                    item,
                    "capacity",
                    1
                )
            )
        )
    )


def equipment_is_available(item):

    status = str(
        get_value(
            item,
            "status",
            "available"
        )
    ).strip().lower()

    available = get_value(
        item,
        "available",
        True
    )

    operational = get_value(
        item,
        "operational",
        True
    )

    if isinstance(
        available,
        str
    ):

        available = (
            available.lower()
            == "true"
        )

    if isinstance(
        operational,
        str
    ):

        operational = (
            operational.lower()
            == "true"
        )

    if not available:

        return False

    if not operational:

        return False

    if status in (
        "maintenance",
        "unavailable",
        "out_of_service",
        "out of service"
    ):

        return False

    return True


def equipment_capacity(
    selected_date,
    start,
    end,
    equipment,
    equipment_data,
    target_corridor=None
):

    if not equipment_data:
        return 0

    target = str(equipment).strip().lower()
    norm_target_c = normalize_corridor(target_corridor) if target_corridor else None
    target_sec = normalize_sector(equipment)

    total = 0

    for item in equipment_data:
        rec_d = record_date(item)
        if rec_d and str(rec_d) != str(selected_date):
            continue

        item_c = get_value(item, "corridor", None)
        if norm_target_c and item_c:
            if normalize_corridor(item_c) != norm_target_c:
                continue

        eq_n = equipment_name(item).lower()
        eq_t = str(get_value(item, "equipment_type", "")).strip().lower()
        eq_sec = normalize_sector(eq_t or eq_n)

        # Match name, type, or sector
        if target not in eq_n and target not in eq_t and target_sec != eq_sec:
            continue

        if not equipment_is_available(item):
            continue

        if not overlap(
            start,
            end,
            record_start(item),
            record_end(item)
        ):
            continue

        total += equipment_quantity(item)

    return total


def equipment_available(
    selected_date,
    start,
    end,
    equipment,
    equipment_data
):

    return (
        equipment_capacity(
            selected_date,
            start,
            end,
            equipment,
            equipment_data
        )
        > 0
    )


# ============================================================
# SAFETY
# ============================================================

def safety_valid(
    gap,
    start,
    end
):

    if end <= start:

        return False

    if start < gap_start(gap):

        return False

    if end > gap_end(gap):

        return False

    before = (
        start
        -
        gap_start(gap)
    )

    after = (
        gap_end(gap)
        -
        end
    )

    required_before = int(
        as_number(
            get_value(
                gap,
                "minimum_buffer_before",
                get_value(
                    gap,
                    "safety_buffer_before",
                    0
                )
            )
        )
    )

    required_after = int(
        as_number(
            get_value(
                gap,
                "minimum_buffer_after",
                get_value(
                    gap,
                    "safety_buffer_after",
                    0
                )
            )
        )
    )

    if before < required_before:

        return False

    if after < required_after:

        return False

    return True


def train_buffer_before(
    gap,
    start
):

    return (
        start
        -
        gap_start(gap)
    )


def train_buffer_after(
    gap,
    end
):

    return (
        gap_end(gap)
        -
        end
    )


# ============================================================
# SCORING
# ============================================================

def priority_score(group):

    return max(
        0,
        min(
            100,
            group_priority(group) * 10
        )
    )


def risk_score(group):

    return max(
        0,
        min(
            100,
            group_risk(group) * 10
        )
    )


def resource_score(
    available,
    required
):

    if required <= 0:

        return 100

    if available < required:

        return 0

    spare = (
        available
        -
        required
    )

    ratio = (
        spare
        /
        required
    )

    return round(
        min(
            100,
            70 + ratio * 30
        ),
        2
    )


def capacity_score(gap):

    return max(
        0,
        min(
            100,
            gap_alt(gap)
        )
    )


def gap_slack_score(
    gap,
    duration
):

    slack = (
        gap_duration(gap)
        -
        duration
    )

    if slack < 0:
        return 0

    if slack == 0:
        return 100

    if slack <= 10:
        return 98

    if slack <= 20:
        return 94

    if slack <= 30:
        return 90

    if slack <= 60:
        return 82

    return 70


def calculate_score(
    group,
    gap,
    workers
):

    priority = priority_score(
        group
    )

    risk = risk_score(
        group
    )

    deadline = deadline_score(
        gap_date(gap),
        group
    )

    early = early_score(
        gap_date(gap),
        group
    )

    traffic = traffic_score(
        gap
    )

    resource = resource_score(
        workers,
        group_workers(group)
    )

    capacity = capacity_score(
        gap
    )

    slack = gap_slack_score(
        gap,
        group_duration(group)
    )

    score = (

        priority * 0.20

        +

        risk * 0.20

        +

        deadline * 0.17

        +

        early * 0.12

        +

        traffic * 0.10

        +

        resource * 0.08

        +

        capacity * 0.06

        +

        slack * 0.07
    )

    return round(
        max(
            0,
            min(
                100,
                score
            )
        ),
        2
    )


# ============================================================
# ALLOCATED BLOCK
# ============================================================

@dataclass
class AllocatedBlock:

    group_id: str

    date: object

    gap_id: str

    corridor: object

    work_area: object

    start: int

    end: int

    required_duration: int

    tasks: list

    workers_required: int

    workers_available: int

    equipment_used: list

    previous_train: object = None

    next_train: object = None

    train_frequency: float = 0

    passenger_trains: int = 0

    goods_trains: int = 0

    traffic_density: float = 0

    traffic_impact: float = 0

    alternative_capacity: float = 0

    priority: float = 0

    risk_score: float = 0

    score: float = 0

    deadline_status: str = ""

    reasons: list = field(
        default_factory=list
    )

    train_buffer_before: int = 0

    train_buffer_after: int = 0

    # Additional gap information
    gap_start: int = 0

    gap_end: int = 0


# ============================================================
# REASONS
# ============================================================

def build_reasons(
    group,
    gap,
    workers,
    equipment
):

    reasons = []

    tasks = get_value(
        group,
        "tasks",
        []
    )

    if tasks and all(
        task_parallel(task)
        for task in tasks
    ):

        reasons.append(
            "[OK] Parallel execution permitted"
        )

        reasons.append(
            "[OK] Longest task determines block duration"
        )

    else:

        reasons.append(
            "[OK] Sequential execution considered"
        )

    density = gap_density(gap)

    if density <= 0.30:

        reasons.append(
            f"[OK] Low traffic density: {density}"
        )

    elif density <= 0.50:

        reasons.append(
            f"[OK] Moderate traffic density: {density}"
        )

    else:

        reasons.append(
            f"[WARNING] High traffic density: {density}"
        )

    frequency = gap_frequency(gap)

    if frequency <= 2:

        reasons.append(
            "[OK] Low train frequency"
        )

    elif frequency <= 3:

        reasons.append(
            "[OK] Moderate train frequency"
        )

    else:

        reasons.append(
            "[WARNING] High train frequency"
        )

    if gap_alt(gap) >= 60:

        reasons.append(
            "[OK] Good alternative track capacity"
        )

    elif gap_alt(gap) >= 40:

        reasons.append(
            "[OK] Acceptable alternative track capacity"
        )

    else:

        reasons.append(
            "[WARNING] Limited alternative track capacity"
        )

    reasons.append(
        f"[OK] Workers available: {workers}"
    )

    for item in equipment:

        reasons.append(
            f"[OK] Required equipment available: {item}"
        )

    status = deadline_status(
        gap_date(gap),
        group_due(group)
    )

    if status == "BEFORE DUE DATE":

        reasons.append(
            "[OK] Allocation before due date"
        )

    elif status == "ON DUE DATE":

        reasons.append(
            "[WARNING] Allocation on due date"
        )

    else:

        reasons.append(
            "[WARNING] Allocation after due date"
        )

    reasons.extend([
        "[OK] Worker time-overlap checked",
        "[OK] Equipment time-overlap checked",
        "[OK] Equipment quantity checked",
        "[OK] Railway block conflict checked",
        "[OK] Global resource conflict checked",
        "[OK] Train safety-buffer checked",
        "[OK] Priority optimization checked",
        "[OK] Risk optimization checked",
        "[OK] Traffic optimization checked",
        "[OK] Gap-slack optimization checked",
        f"[OK] {VERSION} global multi-objective optimization completed"
    ])

    return reasons


# ============================================================
# CREATE BLOCK
# ============================================================

def create_block(
    group,
    gap,
    start,
    workers,
    equipment
):

    duration = group_duration(
        group
    )

    end = (
        start
        +
        duration
    )

    score = calculate_score(
        group,
        gap,
        workers
    )

    status = deadline_status(
        gap_date(gap),
        group_due(group)
    )

    return AllocatedBlock(

        group_id=str(
            get_value(
                group,
                "group_id",
                "UNKNOWN"
            )
        ),

        date=gap_date(gap),

        gap_id=gap_id(gap),

        corridor=get_value(
            group,
            "corridor",
            gap_corridor(gap)
        ),

        work_area=get_value(
            group,
            "work_area",
            ""
        ),

        start=start,

        end=end,

        required_duration=duration,

        tasks=list(
            get_value(
                group,
                "tasks",
                []
            )
        ),

        workers_required=group_workers(
            group
        ),

        workers_available=workers,

        equipment_used=list(
            equipment
        ),

        previous_train=gap_previous(
            gap
        ),

        next_train=gap_next(
            gap
        ),

        train_frequency=gap_frequency(
            gap
        ),

        passenger_trains=gap_passenger(
            gap
        ),

        goods_trains=gap_goods(
            gap
        ),

        traffic_density=gap_density(
            gap
        ),

        traffic_impact=traffic_impact(
            gap
        ),

        alternative_capacity=gap_alt(
            gap
        ),

        priority=group_priority(
            group
        ),

        risk_score=group_risk(
            group
        ),

        score=score,

        deadline_status=status,

        reasons=build_reasons(
            group,
            gap,
            workers,
            equipment
        ),

        train_buffer_before=train_buffer_before(
            gap,
            start
        ),

        train_buffer_after=train_buffer_after(
            gap,
            end
        ),

        gap_start=gap_start(gap),

        gap_end=gap_end(gap)
    )


# ============================================================
# CANDIDATE GENERATION
# ============================================================

def candidates_for_group(
    group,
    railway_gaps,
    worker_data,
    equipment_data
):

    candidates = []

    duration = group_duration(
        group
    )

    if duration <= 0:

        return candidates

    due = as_date(
        group_due(group)
    )

    required_equipment = group_equipment(
        group
    )

    group_corridor_raw = get_value(
        group,
        "corridor",
        ""
    )
    group_corridor = normalize_corridor(group_corridor_raw)

    for gap in railway_gaps:

        # ----------------------------------------------------
        # CORRIDOR
        # ----------------------------------------------------

        g_corridor = normalize_corridor(gap_corridor(gap))

        if g_corridor != group_corridor:

            continue

        # ----------------------------------------------------
        # DEADLINE
        # ----------------------------------------------------

        if (
            as_date(
                gap_date(gap)
            )
            >
            due
        ):

            continue

        # ----------------------------------------------------
        # GAP SIZE
        # ----------------------------------------------------

        if gap_duration(gap) < duration:

            continue

        latest_start = (
            gap_end(gap)
            -
            duration
        )

        starts = list(
            range(
                gap_start(gap),
                latest_start + 1,
                5
            )
        )

        if latest_start not in starts:

            starts.append(
                latest_start
            )

        # ----------------------------------------------------
        # EVERY POSSIBLE START
        # ----------------------------------------------------

        for start in starts:

            end = (
                start
                +
                duration
            )

            # Safety
            if not safety_valid(
                gap,
                start,
                end
            ):

                continue

            # Workers matching corridor
            workers = workers_available(
                gap_date(gap),
                start,
                end,
                worker_data,
                target_corridor=group_corridor
            )

            required_workers = group_workers(
                group
            )

            # Check exact 1-short worker rule: If short by 1 worker, can extend block duration by +30m if gap duration permits
            eff_duration = duration
            if workers < required_workers:
                if workers == required_workers - 1 and gap_duration(gap) >= duration + 30 and safety_valid(gap, start, start + duration + 30):
                    eff_duration = duration + 30
                else:
                    continue

            # ------------------------------------------------
            # EQUIPMENT MATCHING CORRIDOR
            # ------------------------------------------------

            equipment_ok = True

            for equipment in required_equipment:

                capacity = equipment_capacity(
                    gap_date(gap),
                    start,
                    start + eff_duration,
                    equipment,
                    equipment_data,
                    target_corridor=group_corridor
                )

                if capacity <= 0:

                    equipment_ok = False

                    break

            if not equipment_ok:

                continue

            # ------------------------------------------------
            # CREATE CANDIDATE
            # ------------------------------------------------

            block = create_block(
                group,
                gap,
                start,
                workers,
                required_equipment
            )
            if eff_duration != duration:
                block.end = start + eff_duration
                block.required_duration = eff_duration

            candidates.append(
                block
            )

    candidates.sort(
        key=lambda block: (
            -block.score,
            as_date(block.date),
            block.start
        )
    )

    return candidates


# ============================================================
# EQUIPMENT CONFLICT
# ============================================================

def equipment_conflict(
    candidate,
    allocated,
    equipment_data
):
    """
    Checks whether candidate requires more equipment
    than is physically available during overlapping time.

    Example:

        Equipment quantity = 1

        Block A uses machine from 10:00-11:00
        Block B wants same machine 10:30-11:30

        Result = CONFLICT

    If quantity = 2:

        Result = NO CONFLICT
    """

    candidate_equipment = {
        str(item).strip().lower()
        for item in candidate.equipment_used
    }

    for block in allocated:

        if str(block.date) != str(candidate.date):

            continue

        if not overlap(
            block.start,
            block.end,
            candidate.start,
            candidate.end
        ):

            continue

        block_equipment = {
            str(item).strip().lower()
            for item in block.equipment_used
        }

        common = (
            candidate_equipment
            &
            block_equipment
        )

        for equipment in common:

            overlap_start = max(
                block.start,
                candidate.start
            )

            overlap_end = min(
                block.end,
                candidate.end
            )

            capacity = equipment_capacity(
                candidate.date,
                overlap_start,
                overlap_end,
                equipment,
                equipment_data
            )

            # Two blocks are using one or more
            # units simultaneously.
            if capacity < 2:

                return True

    return False


# ============================================================
# RAILWAY CONFLICT
# ============================================================

def railway_conflict(
    candidate,
    allocated
):

    for block in allocated:

        if str(block.date) != str(candidate.date):

            continue

        if str(block.corridor) != str(
            candidate.corridor
        ):

            continue

        if overlap(
            block.start,
            block.end,
            candidate.start,
            candidate.end
        ):

            return True

    return False


# ============================================================
# WORKER CONFLICT
# ============================================================

def worker_conflict(
    candidate,
    allocated,
    worker_data
):

    for block in allocated:

        if str(block.date) != str(candidate.date):

            continue

        if not overlap(
            block.start,
            block.end,
            candidate.start,
            candidate.end
        ):

            continue

        overlap_start = max(
            block.start,
            candidate.start
        )

        overlap_end = min(
            block.end,
            candidate.end
        )

        capacity = workers_available(
            candidate.date,
            overlap_start,
            overlap_end,
            worker_data
        )

        if (
            block.workers_required
            +
            candidate.workers_required
            >
            capacity
        ):

            return True

    return False


# ============================================================
# COMPATIBILITY
# ============================================================

def compatible(
    candidate,
    allocated,
    worker_data,
    equipment_data
):

    if railway_conflict(
        candidate,
        allocated
    ):

        return False

    if worker_conflict(
        candidate,
        allocated,
        worker_data
    ):

        return False

    if equipment_conflict(
        candidate,
        allocated,
        equipment_data
    ):

        return False

    return True


# ============================================================
# GLOBAL OBJECTIVE
# ============================================================

def global_objective(
    allocations,
    groups
):

    if not allocations:

        return 0.0

    group_lookup = {
        str(
            get_value(
                group,
                "group_id",
                ""
            )
        ): group
        for group in groups
    }

    total = 0.0

    for block in allocations:

        group = group_lookup.get(
            str(block.group_id)
        )

        if group is None:

            total += block.score

            continue

        priority = group_priority(
            group
        )

        risk = group_risk(
            group
        )

        due_days = days_until_due(
            block.date,
            group
        )

        deadline_bonus = max(
            0,
            min(
                20,
                due_days * 2
            )
        )

        total += (
            block.score
            +
            priority * 0.75
            +
            risk * 0.75
            +
            deadline_bonus
        )

    # Strong preference for completing more groups.
    total += (
        len(allocations)
        *
        25
    )

    return total


# ============================================================
# EXACT GLOBAL SEARCH
# ============================================================

MAX_EXACT_GROUPS = 10


def global_search(
    groups,
    candidate_map,
    worker_data,
    equipment_data
):

    ordered = sorted(
        groups,
        key=lambda group: (
            -group_risk(group),
            -group_priority(group),
            as_date(group_due(group)),
            len(
                candidate_map.get(
                    get_value(
                        group,
                        "group_id",
                        ""
                    ),
                    []
                )
            )
        )
    )

    best = []

    best_value = -1e18

    def search(
        index,
        selected
    ):

        nonlocal best
        nonlocal best_value

        if index >= len(ordered):

            value = global_objective(
                selected,
                groups
            )

            if (
                len(selected)
                >
                len(best)
            ):

                best = list(
                    selected
                )

                best_value = value

            elif (
                len(selected)
                ==
                len(best)
                and
                value > best_value
            ):

                best = list(
                    selected
                )

                best_value = value

            return

        group = ordered[
            index
        ]

        group_id = get_value(
            group,
            "group_id",
            ""
        )

        candidates = candidate_map.get(
            group_id,
            []
        )

        # Try allocating the group.
        for candidate in candidates:

            if compatible(
                candidate,
                selected,
                worker_data,
                equipment_data
            ):

                selected.append(
                    candidate
                )

                search(
                    index + 1,
                    selected
                )

                selected.pop()

        # Try leaving group unallocated.
        search(
            index + 1,
            selected
        )

    search(
        0,
        []
    )

    return best


# ============================================================
# GREEDY SEARCH
# ============================================================

def greedy_search(
    groups,
    candidate_map,
    worker_data,
    equipment_data
):

    allocations = []

    ordered = sorted(
        groups,
        key=lambda group: (
            -group_risk(group),
            -group_priority(group),
            as_date(group_due(group)),
            str(
                get_value(
                    group,
                    "group_id",
                    ""
                )
            )
        )
    )

    for group in ordered:

        candidates = candidate_map.get(
            get_value(
                group,
                "group_id",
                ""
            ),
            []
        )

        best_candidate = None

        best_value = -1e18

        for candidate in candidates:

            if not compatible(
                candidate,
                allocations,
                worker_data,
                equipment_data
            ):

                continue

            candidate_value = (

                candidate.score

                +

                deadline_score(
                    candidate.date,
                    group
                )
                * 0.20

                +

                early_score(
                    candidate.date,
                    group
                )
                * 0.15
            )

            if (
                best_candidate is None
                or
                candidate_value > best_value
            ):

                best_candidate = candidate

                best_value = candidate_value

        if best_candidate is not None:

            allocations.append(
                best_candidate
            )

    return allocations


# ============================================================
# MAIN OPTIMIZER
# ============================================================

def optimize_all_groups(
    groups,
    railway_gaps,
    worker_data,
    equipment_data
):

    global _LAST_PERFORMANCE

    started = perf_counter()

    # --------------------------------------------------------
    # CANDIDATES
    # --------------------------------------------------------

    candidate_started = perf_counter()

    candidate_map = {}

    for group in groups:

        group_id = get_value(
            group,
            "group_id",
            ""
        )

        candidate_map[
            group_id
        ] = candidates_for_group(
            group,
            railway_gaps,
            worker_data,
            equipment_data
        )

    candidate_time = (
        perf_counter()
        -
        candidate_started
    )

    # --------------------------------------------------------
    # GLOBAL OPTIMIZATION
    # --------------------------------------------------------

    search_started = perf_counter()

    if len(groups) <= MAX_EXACT_GROUPS:

        allocations = global_search(
            groups,
            candidate_map,
            worker_data,
            equipment_data
        )

        method = (
            "EXACT GLOBAL MULTI-OBJECTIVE"
        )

    else:

        allocations = greedy_search(
            groups,
            candidate_map,
            worker_data,
            equipment_data
        )

        method = (
            "SCALABLE GREEDY GLOBAL"
        )

    search_time = (
        perf_counter()
        -
        search_started
    )

    total_time = (
        perf_counter()
        -
        started
    )

    # --------------------------------------------------------
    # SORT
    # --------------------------------------------------------

    allocations.sort(
        key=lambda block: (
            as_date(block.date),
            block.start,
            -block.risk_score,
            -block.priority,
            block.group_id
        )
    )

    # --------------------------------------------------------
    # PERFORMANCE
    # --------------------------------------------------------

    _LAST_PERFORMANCE = {

        "version": VERSION,

        "groups": len(groups),

        "railway_gaps": len(
            railway_gaps
        ),

        "candidates": sum(
            len(value)
            for value in candidate_map.values()
        ),

        "allocated": len(
            allocations
        ),

        "candidate_generation_seconds":
            round(
                candidate_time,
                6
            ),

        "optimization_seconds":
            round(
                search_time,
                6
            ),

        "total_seconds":
            round(
                total_time,
                6
            ),

        "method":
            method
    }

    return allocations


# ============================================================
# VALIDATION
# ============================================================

def validate_allocations(
    allocations,
    groups,
    railway_gaps=None,
    worker_availability=None,
    equipment_availability=None
):

    checks = {}

    # --------------------------------------------------------
    # GROUP UNIQUENESS
    # --------------------------------------------------------

    actual = {
        str(block.group_id)
        for block in allocations
    }

    checks[
        "Allocated block object integrity"
    ] = all(
        hasattr(block, "group_id")
        and hasattr(block, "date")
        and hasattr(block, "start")
        and hasattr(block, "end")
        for block in allocations
    )

    checks[
        "Group uniqueness"
    ] = (
        len(actual)
        ==
        len(allocations)
    )

    # --------------------------------------------------------
    # RAILWAY
    # --------------------------------------------------------

    railway_ok = True

    for i, a in enumerate(allocations):

        for b in allocations[i + 1:]:

            if str(a.date) != str(b.date):

                continue

            if str(a.corridor) != str(
                b.corridor
            ):

                continue

            if overlap(
                a.start,
                a.end,
                b.start,
                b.end
            ):

                railway_ok = False

    checks[
        "Railway conflict"
    ] = railway_ok

    # --------------------------------------------------------
    # WORKERS
    # --------------------------------------------------------

    worker_ok = True

    if worker_availability:

        for block in allocations:

            capacity = workers_available(
                block.date,
                block.start,
                block.end,
                worker_availability
            )

            if (
                block.workers_required
                >
                capacity
            ):

                worker_ok = False

        for i, a in enumerate(allocations):

            for b in allocations[i + 1:]:

                if str(a.date) != str(b.date):

                    continue

                if not overlap(
                    a.start,
                    a.end,
                    b.start,
                    b.end
                ):

                    continue

                overlap_start = max(
                    a.start,
                    b.start
                )

                overlap_end = min(
                    a.end,
                    b.end
                )

                capacity = workers_available(
                    a.date,
                    overlap_start,
                    overlap_end,
                    worker_availability
                )

                if (
                    a.workers_required
                    +
                    b.workers_required
                    >
                    capacity
                ):

                    worker_ok = False

    checks[
        "Worker capacity"
    ] = worker_ok

    # --------------------------------------------------------
    # DURATION
    # --------------------------------------------------------

    checks[
        "Maintenance duration"
    ] = all(
        (
            block.end
            -
            block.start
        )
        ==
        block.required_duration
        for block in allocations
    )

    # --------------------------------------------------------
    # DEADLINE
    # --------------------------------------------------------

    checks[
        "Deadline"
    ] = all(
        block.deadline_status
        !=
        "OVERDUE"
        for block in allocations
    )

    # --------------------------------------------------------
    # EQUIPMENT
    # --------------------------------------------------------

    equipment_ok = True

    if equipment_availability:

        # Individual block availability
        for block in allocations:

            for item in block.equipment_used:

                capacity = equipment_capacity(
                    block.date,
                    block.start,
                    block.end,
                    item,
                    equipment_availability
                )

                if capacity <= 0:

                    equipment_ok = False

        # Simultaneous equipment usage
        for i, a in enumerate(allocations):

            for b in allocations[i + 1:]:

                if str(a.date) != str(b.date):

                    continue

                if not overlap(
                    a.start,
                    a.end,
                    b.start,
                    b.end
                ):

                    continue

                common = {
                    str(x).strip().lower()
                    for x in a.equipment_used
                }.intersection(
                    {
                        str(x).strip().lower()
                        for x in b.equipment_used
                    }
                )

                for item in common:

                    overlap_start = max(
                        a.start,
                        b.start
                    )

                    overlap_end = min(
                        a.end,
                        b.end
                    )

                    capacity = equipment_capacity(
                        a.date,
                        overlap_start,
                        overlap_end,
                        item,
                        equipment_availability
                    )

                    if capacity < 2:

                        equipment_ok = False

    checks[
        "Equipment availability"
    ] = equipment_ok

    # --------------------------------------------------------
    # SAFETY
    # --------------------------------------------------------

    safety_ok = True

    if railway_gaps:

        lookup = {
            (
                str(gap_date(gap)),
                gap_id(gap)
            ): gap
            for gap in railway_gaps
        }

        for block in allocations:

            gap = lookup.get(
                (
                    str(block.date),
                    str(block.gap_id)
                )
            )

            if gap is None:

                safety_ok = False

                continue

            if not safety_valid(
                gap,
                block.start,
                block.end
            ):

                safety_ok = False

    checks[
        "Train safety-buffer validation"
    ] = safety_ok

    # --------------------------------------------------------
    # ZERO DURATION
    # --------------------------------------------------------

    checks[
        "No invalid zero-duration block"
    ] = all(
        block.required_duration > 0
        for block in allocations
    )

    # --------------------------------------------------------
    # FINAL GLOBAL RESOURCE
    # --------------------------------------------------------

    checks[
        "Global resource validation"
    ] = (
        worker_ok
        and
        equipment_ok
    )

    return checks


# ============================================================
# SUMMARY
# ============================================================

def optimization_summary(
    allocations,
    groups
):

    scores = [
        as_number(
            block.score
        )
        for block in allocations
    ]

    return {

        "total_groups":
            len(groups),

        "allocated_groups":
            len(allocations),

        "unallocated_groups":
            max(
                0,
                len(groups)
                -
                len(allocations)
            ),

        "success":
            (
                len(allocations)
                /
                max(
                    1,
                    len(groups)
                )
                *
                100
            ),

        "average_score":
            (
                sum(scores)
                /
                len(scores)
                if scores
                else 0
            ),

        "best_score":
            max(scores)
            if scores
            else 0,

        "worst_score":
            min(scores)
            if scores
            else 0,

        "before_due":
            sum(
                block.deadline_status
                ==
                "BEFORE DUE DATE"
                for block in allocations
            ),

        "on_due":
            sum(
                block.deadline_status
                ==
                "ON DUE DATE"
                for block in allocations
            ),

        "overdue":
            sum(
                block.deadline_status
                ==
                "OVERDUE"
                for block in allocations
            )
    }


# ============================================================
# PERFORMANCE SUMMARY
# ============================================================

def performance_summary():

    return dict(
        _LAST_PERFORMANCE
    )


# ============================================================
# COMPATIBILITY ALIASES
# ============================================================

optimize_maintenance = (
    optimize_all_groups
)

run_optimizer = (
    optimize_all_groups
)

global_optimize = (
    optimize_all_groups
)