# ============================================================
# PHASE 2 - TRAFFIC & CORRIDOR ANALYSIS ENGINE
# ============================================================
#
# PURPOSE:
#
#   PHASE 1
#       Maintenance priority + requirements
#
#          ↓
#
#   PHASE 2
#       Traffic + corridor analysis
#       Generate ALL possible candidate gaps
#
#          ↓
#
#   PHASE 3
#       Final block optimization
#
# IMPORTANT:
#
#   PHASE 2 DOES NOT SELECT THE FINAL BLOCK.
#
# ============================================================


import json
from pathlib import Path
from datetime import datetime
from typing import Any, Dict, List

import pandas as pd


# ============================================================
# VERSION
# ============================================================

VERSION = "PHASE 2 V3 - MULTI REQUEST"


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

# Phase 2 data folder
DATA_DIR = BASE_DIR / "data"

# ------------------------------------------------------------
# PHASE 1 JSON
# ------------------------------------------------------------
#
# IMPORTANT:
# Your Phase 1 JSON is NOT inside Phase2/data.
#
# Actual Phase 1 folder:
#
# E:\modifier\Railway management\phase1
#
# ------------------------------------------------------------

PHASE1_DIR = BASE_DIR.parent / "output"

PHASE1_FILE = (
    PHASE1_DIR /
    "phase1_output.json"
)


# ============================================================
# PHASE 2 INPUT DATA
# ============================================================

DATA_DIR = BASE_DIR.parent / "data"

TRAIN_FILE = (
    DATA_DIR /
    "trains.csv"
)

CORRIDOR_FILE = (
    DATA_DIR /
    "corridor_data.csv"
)


# ============================================================
# PHASE 2 OUTPUT
# ============================================================

OUTPUT_FILE = (
    BASE_DIR.parent /
    "output" /
    "phase2_output.json"
)


# ============================================================
# DEFAULT VALUES
# ============================================================

DEFAULT_CORRIDOR = "C1"

DEFAULT_TRACK = "T1"

MIN_TRAIN_BUFFER = 10


# ============================================================
# PRINT HELPERS
# ============================================================

def line():
    print("=" * 72)


def section(title: str):

    print()
    line()
    print(title.center(72))
    line()


# ============================================================
# GENERAL HELPERS
# ============================================================

def clean_columns(
    df: pd.DataFrame
) -> pd.DataFrame:

    df = df.copy()

    df.columns = (
        df.columns
        .astype(str)
        .str.strip()
        .str.lower()
        .str.replace(" ", "_", regex=False)
        .str.replace("-", "_", regex=False)
    )

    return df


def safe_str(
    value: Any,
    default: str = ""
) -> str:

    if value is None:
        return default

    try:
        if pd.isna(value):
            return default
    except Exception:
        pass

    text = str(value).strip()

    if not text:
        return default

    return text


def safe_float(
    value: Any,
    default: float = 0.0
) -> float:

    try:

        if value is None:
            return default

        try:
            if pd.isna(value):
                return default
        except Exception:
            pass

        return float(value)

    except Exception:

        return default


def safe_int(
    value: Any,
    default: int = 0
) -> int:

    try:

        if value is None:
            return default

        try:
            if pd.isna(value):
                return default
        except Exception:
            pass

        return int(float(value))

    except Exception:

        return default


def json_safe(value: Any):

    if isinstance(value, dict):

        return {
            str(key): json_safe(val)
            for key, val in value.items()
        }

    if isinstance(value, list):

        return [
            json_safe(item)
            for item in value
        ]

    if isinstance(value, tuple):

        return [
            json_safe(item)
            for item in value
        ]

    if isinstance(value, pd.Timestamp):

        return value.isoformat()

    if hasattr(value, "item"):

        try:
            return value.item()
        except Exception:
            pass

    return value


# ============================================================
# TIME HELPERS
# ============================================================

def time_to_minutes(value: Any) -> int:

    if value is None:
        return 0

    if isinstance(value, (int, float)):

        return int(value)

    text = str(value).strip()

    if not text:
        return 0

    # HH:MM
    if ":" in text:

        try:

            parts = text.split(":")

            hour = int(parts[0])
            minute = int(parts[1])

            return (
                hour * 60
                +
                minute
            )

        except Exception:
            pass

    # Numeric string
    try:

        return int(float(text))

    except Exception:

        return 0


def minutes_to_time(
    minutes: Any
) -> str:

    minutes = int(minutes)

    minutes = max(
        0,
        min(
            minutes,
            1439
        )
    )

    hour = minutes // 60
    minute = minutes % 60

    return (
        f"{hour:02d}:"
        f"{minute:02d}"
    )


# ============================================================
# LOAD JSON
# ============================================================

def load_json_file(
    path: Path
):

    if not path.exists():

        raise FileNotFoundError(
            "\nPhase 1 JSON not found:\n"
            f"{path}\n"
        )

    with open(
        path,
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# ============================================================
# PHASE 1 EQUIPMENT NORMALIZATION
# ============================================================

def normalize_equipment(
    value: Any
) -> List[str]:

    if value is None:
        return []

    if isinstance(value, list):

        result = []

        for item in value:

            text = safe_str(item)

            if text:
                result.append(text)

        return result

    text = safe_str(value)

    if not text:
        return []

    text = text.replace(
        ",",
        ";"
    )

    parts = text.split(";")

    return [
        part.strip()
        for part in parts
        if part.strip()
    ]


# ============================================================
# DURATION CONVERSION
# ============================================================

def convert_duration_to_minutes(
    request: Dict[str, Any]
) -> float:

    # --------------------------------------------------------
    # Case 1:
    # Phase 1 already gives minutes.
    # --------------------------------------------------------

    if (
        request.get(
            "required_duration_minutes"
        )
        is not None
    ):

        minutes = safe_float(
            request.get(
                "required_duration_minutes"
            )
        )

        if minutes > 0:

            return round(
                minutes,
                2
            )

    # --------------------------------------------------------
    # Case 2:
    # Current Phase 1 gives hours.
    #
    # Example:
    #
    # 3.0 hours = 180 minutes
    # --------------------------------------------------------

    hours = safe_float(
        request.get(
            "required_duration"
        )
    )

    return round(
        hours * 60.0,
        2
    )


# ============================================================
# NORMALIZE ONE PHASE 1 REQUEST
# ============================================================

def normalize_phase1_request(
    request: Dict[str, Any],
    index: int
) -> Dict[str, Any]:

    request_id = safe_str(
        request.get(
            "request_id"
        ),
        f"REQ{index:03d}"
    )

    asset_id = safe_str(
        request.get(
            "asset_id"
        )
    )

    priority_score = safe_float(
        request.get(
            "priority_score"
        )
    )

    priority_level = safe_str(
        request.get(
            "priority_level"
        ),
        "Unknown"
    )

    duration_minutes = (
        convert_duration_to_minutes(
            request
        )
    )

    workers_required = safe_int(
        request.get(
            "required_workers"
        )
    )

    equipment_required = (
        normalize_equipment(
            request.get(
                "required_equipment"
            )
        )
    )

    overdue_days = safe_int(
        request.get(
            "overdue_days"
        )
    )

    current_risk_score = safe_float(
        request.get(
            "current_request_risk_score"
        )
    )

    asset_risk_score = safe_float(
        request.get(
            "asset_risk_score"
        )
    )

    asset_risk_level = safe_str(
        request.get(
            "asset_risk_level"
        ),
        "Unknown"
    )

    historical_failure_frequency = (
        safe_float(
            request.get(
                "historical_failure_frequency"
            )
        )
    )

    historical_operational_impact = (
        safe_str(
            request.get(
                "historical_operational_impact"
            )
        )
    )

    historical_records_used = (
        safe_int(
            request.get(
                "historical_records_used"
            )
        )
    )

    corridor_id = safe_str(
        request.get(
            "corridor_id"
        ),
        DEFAULT_CORRIDOR
    )

    track_id = safe_str(
        request.get(
            "track_id"
        ),
        DEFAULT_TRACK
    )

    location = safe_str(
        request.get(
            "location"
        ),
        asset_id
    )

    deadline = safe_str(
        request.get(
            "deadline"
        ),
        ""
    )

    department = safe_str(
        request.get(
            "department"
        ),
        ""
    )

    maintenance_type = safe_str(
        request.get(
            "maintenance_type"
        ),
        safe_str(
            request.get(
                "defect"
            ),
            "Maintenance"
        )
    )

    return {

        "task_id":
            request_id,

        "request_id":
            request_id,

        "asset_id":
            asset_id,

        "defect":
            safe_str(
                request.get(
                    "defect"
                )
            ),

        "reason":
            safe_str(
                request.get(
                    "reason"
                )
            ),

        "priority_score":
            priority_score,

        "priority_level":
            priority_level,

        "required_duration_hours":
            safe_float(
                request.get(
                    "required_duration"
                )
            ),

        "required_duration_minutes":
            duration_minutes,

        "workers_required":
            workers_required,

        "equipment_required":
            equipment_required,

        "current_request_risk_score":
            current_risk_score,

        "asset_risk_score":
            asset_risk_score,

        "asset_risk_level":
            asset_risk_level,

        "historical_failure_frequency":
            historical_failure_frequency,

        "historical_operational_impact":
            historical_operational_impact,

        "historical_records_used":
            historical_records_used,

        "overdue_days":
            overdue_days,

        "location":
            location,

        "corridor_id":
            corridor_id,

        "track_id":
            track_id,

        "deadline":
            deadline,

        "department":
            department,

        "maintenance_type":
            maintenance_type,
    }


# ============================================================
# LOAD ALL PHASE 1 REQUESTS
# ============================================================

def load_phase1_requests() -> List[Dict[str, Any]]:

    raw = load_json_file(
        PHASE1_FILE
    )

    # --------------------------------------------------------
    # Your Phase 1 output is:
    #
    # [
    #   {...},
    #   {...},
    #   ...
    # ]
    # --------------------------------------------------------

    if isinstance(
        raw,
        list
    ):

        requests = raw

    elif isinstance(
        raw,
        dict
    ):

        if isinstance(
            raw.get("requests"),
            list
        ):

            requests = raw[
                "requests"
            ]

        elif isinstance(
            raw.get("maintenance_requests"),
            list
        ):

            requests = raw[
                "maintenance_requests"
            ]

        else:

            requests = [
                raw
            ]

    else:

        raise ValueError(
            "Invalid Phase 1 JSON format."
        )

    normalized = []

    for index, request in enumerate(
        requests,
        start=1
    ):

        if not isinstance(
            request,
            dict
        ):

            continue

        normalized.append(
            normalize_phase1_request(
                request,
                index
            )
        )

    if not normalized:

        raise ValueError(
            "No valid maintenance requests "
            "found in Phase 1 JSON."
        )

    return normalized


# ============================================================
# TRAIN CATEGORY
# ============================================================

def normalize_category(
    value: Any
) -> str:

    text = safe_str(
        value
    ).lower()

    if (
        "goods" in text
        or
        "freight" in text
    ):

        return "Goods"

    if (
        "passenger" in text
        or
        "express" in text
        or
        "superfast" in text
        or
        "mail" in text
        or
        "intercity" in text
    ):

        return "Passenger"

    return "Unknown"


# ============================================================
# LOAD TRAIN DATA
# ============================================================

def load_train_data(
    file_path: Path
) -> pd.DataFrame:

    if not file_path.exists():

        raise FileNotFoundError(
            "\nTrain timetable not found:\n"
            f"{file_path}\n"
        )

    trains = pd.read_csv(
        file_path
    )

    trains = clean_columns(
        trains
    )

    # --------------------------------------------------------
    # Required columns
    # --------------------------------------------------------

    required_columns = [
        "train_id",
        "arrival_time",
        "departure_time"
    ]

    missing = [
        column
        for column in required_columns
        if column not in trains.columns
    ]

    if missing:

        raise ValueError(
            "Missing required train columns: "
            +
            ", ".join(missing)
        )

    # --------------------------------------------------------
    # Optional columns
    # --------------------------------------------------------

    if "date" not in trains.columns:

        trains["date"] = ""

    if "corridor_id" not in trains.columns:

        if "corridor" in trains.columns:

            trains["corridor_id"] = (
                trains["corridor"]
            )

        else:

            trains["corridor_id"] = (
                DEFAULT_CORRIDOR
            )

    if "track_id" not in trains.columns:

        if "track" in trains.columns:

            trains["track_id"] = (
                trains["track"]
            )

        else:

            trains["track_id"] = (
                DEFAULT_TRACK
            )

    if "location" not in trains.columns:

        trains["location"] = ""

    if "train_type" not in trains.columns:

        trains["train_type"] = "Unknown"

    if "category" not in trains.columns:

        trains["category"] = (
            trains[
                "train_type"
            ].apply(
                normalize_category
            )
        )

    else:

        trains["category"] = (
            trains[
                "category"
            ].apply(
                normalize_category
            )
        )

    if "train_priority" not in trains.columns:

        trains["train_priority"] = 1

    if "expected_delay_minutes" not in trains.columns:

        trains[
            "expected_delay_minutes"
        ] = 0

    # --------------------------------------------------------
    # Convert time columns
    # --------------------------------------------------------

    trains[
        "arrival_minutes"
    ] = trains[
        "arrival_time"
    ].apply(
        time_to_minutes
    )

    trains[
        "departure_minutes"
    ] = trains[
        "departure_time"
    ].apply(
        time_to_minutes
    )

    trains[
        "train_priority"
    ] = pd.to_numeric(
        trains[
            "train_priority"
        ],
        errors="coerce"
    ).fillna(1)

    trains[
        "expected_delay_minutes"
    ] = pd.to_numeric(
        trains[
            "expected_delay_minutes"
        ],
        errors="coerce"
    ).fillna(0)

    # --------------------------------------------------------
    # Clean strings
    # --------------------------------------------------------

    for column in [
        "train_id",
        "date",
        "corridor_id",
        "track_id",
        "location",
        "train_type"
    ]:

        trains[column] = (
            trains[column]
            .fillna("")
            .astype(str)
            .str.strip()
        )

    return trains


# ============================================================
# LOAD CORRIDOR DATA
# ============================================================

def load_corridor_data(
    file_path: Path
) -> pd.DataFrame:

    if not file_path.exists():

        raise FileNotFoundError(
            "\nCorridor database not found:\n"
            f"{file_path}\n"
        )

    corridor = pd.read_csv(
        file_path
    )

    corridor = clean_columns(
        corridor
    )

    return corridor


# ============================================================
# FILTER TRAINS FOR REQUEST
# ============================================================

def filter_trains_for_request(
    trains: pd.DataFrame,
    request: Dict[str, Any]
) -> pd.DataFrame:

    result = trains.copy()

    corridor = safe_str(
        request.get(
            "corridor_id"
        ),
        DEFAULT_CORRIDOR
    )

    track = safe_str(
        request.get(
            "track_id"
        ),
        DEFAULT_TRACK
    )

    location = safe_str(
        request.get(
            "location"
        )
    )

    # --------------------------------------------------------
    # Corridor filtering
    # --------------------------------------------------------

    if (
        "corridor_id" in result.columns
        and
        corridor
    ):

        corridor_mask = (
            result[
                "corridor_id"
            ]
            .astype(str)
            .str.strip()
            .str.upper()
            ==
            corridor.upper()
        )

        if corridor_mask.any():

            result = result[
                corridor_mask
            ].copy()

    # --------------------------------------------------------
    # Track filtering
    #
    # If track information exists and matches, use it.
    # Otherwise retain corridor-level records.
    # --------------------------------------------------------

    if (
        "track_id" in result.columns
        and
        track
    ):

        track_mask = (
            result[
                "track_id"
            ]
            .astype(str)
            .str.strip()
            .str.upper()
            ==
            track.upper()
        )

        if track_mask.any():

            result = result[
                track_mask
            ].copy()

    # --------------------------------------------------------
    # Location filtering
    #
    # Only apply when an exact location exists.
    # --------------------------------------------------------

    if (
        location
        and
        "location" in result.columns
    ):

        location_mask = (
            result[
                "location"
            ]
            .astype(str)
            .str.strip()
            .str.lower()
            ==
            location.lower()
        )

        if location_mask.any():

            result = result[
                location_mask
            ].copy()

    # --------------------------------------------------------
    # Sort
    # --------------------------------------------------------

    result = result.sort_values(
        by=[
            "date",
            "arrival_minutes",
            "departure_minutes"
        ]
    )

    return result.reset_index(
        drop=True
    )


# ============================================================
# DETECT ALL TRAIN GAPS
# ============================================================

def detect_all_gaps(
    trains: pd.DataFrame,
    required_duration: float
) -> List[Dict[str, Any]]:

    gaps = []

    if trains.empty:

        return gaps

    grouped = trains.groupby(
        "date",
        dropna=False
    )

    gap_counter = 1

    for date, day_trains in grouped:

        day_trains = day_trains.sort_values(
            by="arrival_minutes"
        ).reset_index(
            drop=True
        )

        # ----------------------------------------------------
        # Gap before first train
        # ----------------------------------------------------

        if len(day_trains) > 0:

            first = day_trains.iloc[0]

            first_arrival = int(
                first[
                    "arrival_minutes"
                ]
            )

            if first_arrival > 0:

                gap_start = 0
                gap_end = first_arrival

                duration = (
                    gap_end -
                    gap_start
                )

                gaps.append(
                    {
                        "gap_id":
                            f"G{gap_counter:03d}",

                        "date":
                            safe_str(
                                date
                            ),

                        "start":
                            minutes_to_time(
                                gap_start
                            ),

                        "end":
                            minutes_to_time(
                                gap_end
                            ),

                        "start_minutes":
                            gap_start,

                        "end_minutes":
                            gap_end,

                        "duration_minutes":
                            duration,

                        "required_duration_minutes":
                            required_duration,

                        "duration_sufficient_for_phase1_requirement":
                            duration >= required_duration,

                        "previous_train":
                            None,

                        "next_train":
                            {
                                "train_id":
                                    safe_str(
                                        first[
                                            "train_id"
                                        ]
                                    ),

                                "train_type":
                                    safe_str(
                                        first[
                                            "train_type"
                                        ]
                                    ),

                                "category":
                                    safe_str(
                                        first[
                                            "category"
                                        ]
                                    ),

                                "arrival_time":
                                    safe_str(
                                        first[
                                            "arrival_time"
                                        ]
                                    ),

                                "departure_time":
                                    safe_str(
                                        first[
                                            "departure_time"
                                        ]
                                    ),

                                "train_priority":
                                    safe_int(
                                        first[
                                            "train_priority"
                                        ]
                                    ),
                            },
                    }
                )

                gap_counter += 1

        # ----------------------------------------------------
        # Gaps between trains
        # ----------------------------------------------------

        for i in range(
            len(day_trains) - 1
        ):

            previous = (
                day_trains.iloc[i]
            )

            next_train = (
                day_trains.iloc[i + 1]
            )

            previous_departure = int(
                previous[
                    "departure_minutes"
                ]
            )

            next_arrival = int(
                next_train[
                    "arrival_minutes"
                ]
            )

            if next_arrival <= previous_departure:
                continue

            gap_start = (
                previous_departure
            )

            gap_end = (
                next_arrival
            )

            duration = (
                gap_end -
                gap_start
            )

            gaps.append(
                {
                    "gap_id":
                        f"G{gap_counter:03d}",

                    "date":
                        safe_str(
                            date
                        ),

                    "start":
                        minutes_to_time(
                            gap_start
                        ),

                    "end":
                        minutes_to_time(
                            gap_end
                        ),

                    "start_minutes":
                        gap_start,

                    "end_minutes":
                        gap_end,

                    "duration_minutes":
                        duration,

                    "required_duration_minutes":
                        required_duration,

                    "duration_sufficient_for_phase1_requirement":
                        duration >= required_duration,

                    "previous_train":
                        {
                            "train_id":
                                safe_str(
                                    previous[
                                        "train_id"
                                    ]
                                ),

                            "train_type":
                                safe_str(
                                    previous[
                                        "train_type"
                                    ]
                                ),

                            "category":
                                safe_str(
                                    previous[
                                        "category"
                                    ]
                                ),

                            "arrival_time":
                                safe_str(
                                    previous[
                                        "arrival_time"
                                    ]
                                ),

                            "departure_time":
                                safe_str(
                                    previous[
                                        "departure_time"
                                    ]
                                ),

                            "train_priority":
                                safe_int(
                                    previous[
                                        "train_priority"
                                    ]
                                ),
                        },

                    "next_train":
                        {
                            "train_id":
                                safe_str(
                                    next_train[
                                        "train_id"
                                    ]
                                ),

                            "train_type":
                                safe_str(
                                    next_train[
                                        "train_type"
                                    ]
                                ),

                            "category":
                                safe_str(
                                    next_train[
                                        "category"
                                    ]
                                ),

                            "arrival_time":
                                safe_str(
                                    next_train[
                                        "arrival_time"
                                    ]
                                ),

                            "departure_time":
                                safe_str(
                                    next_train[
                                        "departure_time"
                                    ]
                                ),

                            "train_priority":
                                safe_int(
                                    next_train[
                                        "train_priority"
                                    ]
                                ),
                        },
                }
            )

            gap_counter += 1

        # ----------------------------------------------------
        # Gap after last train
        # ----------------------------------------------------

        if len(day_trains) > 0:

            last = day_trains.iloc[-1]

            last_departure = int(
                last[
                    "departure_minutes"
                ]
            )

            if last_departure < 1440:

                gap_start = last_departure
                gap_end = 1440

                duration = (
                    gap_end -
                    gap_start
                )

                gaps.append(
                    {
                        "gap_id":
                            f"G{gap_counter:03d}",

                        "date":
                            safe_str(
                                date
                            ),

                        "start":
                            minutes_to_time(
                                gap_start
                            ),

                        "end":
                            minutes_to_time(
                                gap_end
                            ),

                        "start_minutes":
                            gap_start,

                        "end_minutes":
                            gap_end,

                        "duration_minutes":
                            duration,

                        "required_duration_minutes":
                            required_duration,

                        "duration_sufficient_for_phase1_requirement":
                            duration >= required_duration,

                        "previous_train":
                            {
                                "train_id":
                                    safe_str(
                                        last[
                                            "train_id"
                                        ]
                                    ),

                                "train_type":
                                    safe_str(
                                        last[
                                            "train_type"
                                        ]
                                    ),

                                "category":
                                    safe_str(
                                        last[
                                            "category"
                                        ]
                                    ),

                                "arrival_time":
                                    safe_str(
                                        last[
                                            "arrival_time"
                                        ]
                                    ),

                                "departure_time":
                                    safe_str(
                                        last[
                                            "departure_time"
                                        ]
                                    ),

                                "train_priority":
                                    safe_int(
                                        last[
                                            "train_priority"
                                        ]
                                    ),
                            },

                        "next_train":
                            None,
                    }
                )

                gap_counter += 1

    # --------------------------------------------------------
    # Longest gap
    # --------------------------------------------------------

    if gaps:

        longest_duration = max(
            gap[
                "duration_minutes"
            ]
            for gap in gaps
        )

        for gap in gaps:

            gap[
                "is_longest_gap"
            ] = (
                gap[
                    "duration_minutes"
                ]
                ==
                longest_duration
            )

    return gaps


# ============================================================
# HOURLY TRAFFIC
# ============================================================

def calculate_hourly_traffic(
    trains: pd.DataFrame
) -> List[Dict[str, Any]]:

    result = []

    if trains.empty:

        return result

    for hour in range(
        24
    ):

        start = hour * 60
        end = start + 60

        hour_trains = trains[
            (
                trains[
                    "arrival_minutes"
                ]
                >= start
            )
            &
            (
                trains[
                    "arrival_minutes"
                ]
                < end
            )
        ]

        total = len(
            hour_trains
        )

        passenger = len(
            hour_trains[
                hour_trains[
                    "category"
                ]
                ==
                "Passenger"
            ]
        )

        goods = len(
            hour_trains[
                hour_trains[
                    "category"
                ]
                ==
                "Goods"
            ]
        )

        if total >= 5:
            density = "HIGH"

        elif total >= 3:
            density = "MEDIUM"

        else:
            density = "LOW"

        if total > 0:

            result.append(
                {
                    "period":
                        f"{hour:02d}:00-"
                        f"{(hour + 1) % 24:02d}:00",

                    "hour":
                        hour,

                    "total_trains":
                        total,

                    "passenger_trains":
                        passenger,

                    "goods_trains":
                        goods,

                    "traffic_density":
                        density,
                }
            )

    return result


# ============================================================
# TRAFFIC SUMMARY
# ============================================================

def traffic_summary(
    trains: pd.DataFrame
) -> Dict[str, Any]:

    if trains.empty:

        return {

            "total_trains":
                0,

            "analysis_span_hours":
                0,

            "trains_per_hour":
                0,

            "passenger_trains":
                0,

            "goods_trains":
                0,

            "passenger_trains_per_hour":
                0,

            "goods_trains_per_hour":
                0,

            "traffic_density":
                "LOW",
        }

    total = len(
        trains
    )

    passenger = len(
        trains[
            trains[
                "category"
            ]
            ==
            "Passenger"
        ]
    )

    goods = len(
        trains[
            trains[
                "category"
            ]
            ==
            "Goods"
        ]
    )

    min_time = int(
        trains[
            "arrival_minutes"
        ].min()
    )

    max_time = int(
        trains[
            "departure_minutes"
        ].max()
    )

    span = max(
        1,
        max_time - min_time
    ) / 60.0

    trains_per_hour = (
        total /
        span
    )

    if trains_per_hour >= 5:
        density = "HIGH"

    elif trains_per_hour >= 3:
        density = "MEDIUM"

    else:
        density = "LOW"

    return {

        "total_trains":
            int(total),

        "analysis_span_hours":
            round(
                span,
                2
            ),

        "trains_per_hour":
            round(
                trains_per_hour,
                2
            ),

        "passenger_trains":
            int(passenger),

        "goods_trains":
            int(goods),

        "passenger_trains_per_hour":
            round(
                passenger / span,
                2
            ),

        "goods_trains_per_hour":
            round(
                goods / span,
                2
            ),

        "traffic_density":
            density,
    }


# ============================================================
# GAP TRAFFIC INFORMATION
# ============================================================

def add_gap_traffic_information(
    gaps: List[Dict[str, Any]],
    trains: pd.DataFrame
) -> List[Dict[str, Any]]:

    for gap in gaps:

        date = gap[
            "date"
        ]

        start = gap[
            "start_minutes"
        ]

        end = gap[
            "end_minutes"
        ]

        day_trains = trains[
            trains[
                "date"
            ].astype(str)
            ==
            str(date)
        ]

        # ----------------------------------------------------
        # Trains around this gap
        # ----------------------------------------------------

        surrounding = day_trains[
            (
                day_trains[
                    "arrival_minutes"
                ]
                >= start
            )
            &
            (
                day_trains[
                    "arrival_minutes"
                ]
                <= end
            )
        ]

        # ----------------------------------------------------
        # Traffic around one-hour context
        # ----------------------------------------------------

        context_start = max(
            0,
            start - 30
        )

        context_end = min(
            1440,
            end + 30
        )

        context = day_trains[
            (
                day_trains[
                    "arrival_minutes"
                ]
                >= context_start
            )
            &
            (
                day_trains[
                    "arrival_minutes"
                ]
                <= context_end
            )
        ]

        total = len(
            context
        )

        passenger = len(
            context[
                context[
                    "category"
                ]
                ==
                "Passenger"
            ]
        )

        goods = len(
            context[
                context[
                    "category"
                ]
                ==
                "Goods"
            ]
        )

        gap_hours = max(
            1 / 60,
            (
                end - start
            ) / 60
        )

        frequency = (
            total /
            max(
                gap_hours,
                1
            )
        )

        density_ratio = min(
            1.0,
            (
                total /
                10.0
            )
        )

        if density_ratio >= 0.7:
            density = "HIGH"

        elif density_ratio >= 0.4:
            density = "MEDIUM"

        else:
            density = "LOW"

        gap[
            "traffic_during_gap_context"
        ] = {

            "trains_per_hour":
                round(
                    frequency,
                    2
                ),

            "passenger_trains":
                int(passenger),

            "goods_trains":
                int(goods),

            "total_trains":
                int(total),
        }

        gap[
            "train_frequency"
        ] = round(
            frequency,
            2
        )

        gap[
            "passenger_trains"
        ] = int(
            passenger
        )

        gap[
            "goods_trains"
        ] = int(
            goods
        )

        gap[
            "traffic_density"
        ] = round(
            density_ratio,
            2
        )

        gap[
            "traffic_density_level"
        ] = density

    return gaps


# ============================================================
# CORRIDOR ANALYSIS
# ============================================================

def analyze_corridor(
    corridor_data: pd.DataFrame,
    request: Dict[str, Any]
) -> Dict[str, Any]:

    corridor_id = safe_str(
        request.get(
            "corridor_id"
        ),
        DEFAULT_CORRIDOR
    )

    maintenance_track = safe_str(
        request.get(
            "track_id"
        ),
        DEFAULT_TRACK
    )

    data = corridor_data.copy()

    if (
        "corridor_id"
        in data.columns
    ):

        filtered = data[
            data[
                "corridor_id"
            ].astype(str).str.upper()
            ==
            corridor_id.upper()
        ]

        if not filtered.empty:

            data = filtered

    track_results = []

    for _, row in data.iterrows():

        track_id = safe_str(
            row.get(
                "track_id"
            ),
            ""
        )

        if not track_id:
            continue

        status = safe_str(
            row.get(
                "status"
            ),
            "unknown"
        )

        capacity = safe_float(
            row.get(
                "track_capacity",
                row.get(
                    "capacity",
                    100
                )
            ),
            100
        )

        occupancy = safe_float(
            row.get(
                "occupancy_percentage",
                row.get(
                    "occupancy",
                    0
                )
            )
        )

        available = safe_float(
            row.get(
                "available_capacity_percentage",
                row.get(
                    "available_capacity",
                    max(
                        0,
                        capacity - occupancy
                    )
                )
            )
        )

        track_results.append(
            {
                "track_id":
                    track_id,

                "status":
                    status,

                "track_capacity":
                    capacity,

                "occupancy_percentage":
                    occupancy,

                "available_capacity_percentage":
                    available,
            }
        )

    # --------------------------------------------------------
    # If corridor CSV is empty / has another format
    # --------------------------------------------------------

    if not track_results:

        track_results.append(
            {
                "track_id":
                    maintenance_track,

                "status":
                    "maintenance_candidate",

                "track_capacity":
                    100,

                "occupancy_percentage":
                    0,

                "available_capacity_percentage":
                    0,
            }
        )

    alternative_tracks = []

    for track in track_results:

        if (
            track[
                "track_id"
            ].upper()
            !=
            maintenance_track.upper()
        ):

            alternative_tracks.append(
                {
                    "track_id":
                        track[
                            "track_id"
                        ],

                    "status":
                        "available_for_rerouting",

                    "available_capacity":
                        track[
                            "available_capacity_percentage"
                        ],
                }
            )

    total_alternative_capacity = sum(
        float(
            track[
                "available_capacity"
            ]
        )
        for track
        in alternative_tracks
    )

    return {

        "corridor_id":
            corridor_id,

        "maintenance_track":
            maintenance_track,

        "number_of_tracks":
            len(track_results),

        "tracks":
            track_results,

        "alternative_tracks":
            alternative_tracks,

        "total_alternative_available_capacity":
            round(
                total_alternative_capacity,
                2
            ),
    }


# ============================================================
# POTENTIAL TRAIN IMPACT
# ============================================================

def calculate_potential_train_impact(
    gap: Dict[str, Any],
    corridor_analysis: Dict[str, Any]
) -> Dict[str, Any]:

    context = gap.get(
        "traffic_during_gap_context",
        {}
    )

    frequency = safe_float(
        context.get(
            "trains_per_hour"
        )
    )

    passenger = safe_int(
        context.get(
            "passenger_trains"
        )
    )

    goods = safe_int(
        context.get(
            "goods_trains"
        )
    )

    alternative_capacity = sum(
        safe_float(
            track.get(
                "available_capacity"
            )
        )
        for track
        in corridor_analysis.get(
            "alternative_tracks",
            []
        )
    )

    if (
        frequency <= 2
        and
        alternative_capacity > 0
    ):

        impact = "LOW"

    elif (
        passenger >= 3
        or
        frequency >= 5
    ):

        impact = "HIGH"

    else:

        impact = "MEDIUM"

    return {

        "impact_level":
            impact,

        "trains_per_hour_context":
            frequency,

        "passenger_trains_context":
            passenger,

        "goods_trains_context":
            goods,

        "alternative_capacity_available":
            round(
                alternative_capacity,
                2
            ),

        "note":
            (
                "Informational only. "
                "Phase 3 makes the final "
                "operational decision."
            ),
    }


# ============================================================
# HISTORICAL TRAFFIC
# ============================================================

def historical_traffic_information(
    trains: pd.DataFrame
) -> Dict[str, Any]:

    if trains.empty:

        return {

            "historical_data_available":
                False,

            "historical_average_trains_per_hour":
                0,

            "historical_traffic_density":
                "LOW",

            "average_expected_delay_minutes":
                0,
        }

    if "date" in trains.columns:

        dates = max(
            1,
            trains[
                "date"
            ].nunique()
        )

    else:

        dates = 1

    total_trains = len(
        trains
    )

    average_trains_per_day = (
        total_trains /
        dates
    )

    average_trains_per_hour = (
        average_trains_per_day /
        24.0
    )

    if average_trains_per_hour >= 5:

        density = "HIGH"

    elif average_trains_per_hour >= 3:

        density = "MEDIUM"

    else:

        density = "LOW"

    delay = safe_float(
        trains[
            "expected_delay_minutes"
        ].mean()
    )

    return {

        "historical_data_available":
            True,

        "historical_days_used":
            int(dates),

        "historical_average_trains_per_hour":
            round(
                average_trains_per_hour,
                2
            ),

        "historical_traffic_density":
            density,

        "average_expected_delay_minutes":
            round(
                delay,
                2
            ),
    }


# ============================================================
# GOODS TRAIN FORECAST
# ============================================================

def goods_train_forecast(
    trains: pd.DataFrame
) -> Dict[str, Any]:

    goods_count = len(
        trains[
            trains[
                "category"
            ]
            ==
            "Goods"
        ]
    )

    return {

        "forecast_available":
            False,

        "forecast_goods_trains":
            int(goods_count),

        "method":
            (
                "Current timetable goods count; "
                "no forecast model supplied."
            ),
    }


# ============================================================
# ANALYZE ONE REQUEST
# ============================================================

def analyze_one_request(
    request: Dict[str, Any],
    trains_all: pd.DataFrame,
    corridor_data: pd.DataFrame
) -> Dict[str, Any]:

    required_duration = safe_float(
        request[
            "required_duration_minutes"
        ]
    )

    # --------------------------------------------------------
    # 1. Filter trains
    # --------------------------------------------------------

    trains = filter_trains_for_request(
        trains_all,
        request
    )

    # --------------------------------------------------------
    # 2. Find all actual gaps
    # --------------------------------------------------------

    gaps = detect_all_gaps(
        trains,
        required_duration
    )

    # --------------------------------------------------------
    # 3. Traffic
    # --------------------------------------------------------

    hourly = calculate_hourly_traffic(
        trains
    )

    summary = traffic_summary(
        trains
    )

    gaps = add_gap_traffic_information(
        gaps,
        trains
    )

    # --------------------------------------------------------
    # 4. Corridor
    # --------------------------------------------------------

    corridor_analysis = analyze_corridor(
        corridor_data,
        request
    )

    # --------------------------------------------------------
    # 5. Potential impact
    # --------------------------------------------------------

    for gap in gaps:

        gap[
            "potential_train_impact"
        ] = calculate_potential_train_impact(
            gap,
            corridor_analysis
        )

    # --------------------------------------------------------
    # 6. Historical traffic
    # --------------------------------------------------------

    historical = (
        historical_traffic_information(
            trains
        )
    )

    # --------------------------------------------------------
    # 7. Goods forecast
    # --------------------------------------------------------

    goods_forecast = (
        goods_train_forecast(
            trains
        )
    )

    # --------------------------------------------------------
    # 8. Gap statistics
    # --------------------------------------------------------

    sufficient_gaps = [
        gap
        for gap in gaps
        if gap[
            "duration_sufficient_for_phase1_requirement"
        ]
    ]

    longest_gap = None

    if gaps:

        longest_gap = max(
            gaps,
            key=lambda x:
                x[
                    "duration_minutes"
                ]
        )

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # longest_gap is INFORMATION ONLY.
    #
    # Phase 2 does not select it.
    # --------------------------------------------------------

    return {

        "maintenance_request":
            request,

        "train_data_used":
            {
                "total_filtered_train_records":
                    int(len(trains)),

                "dates":
                    sorted(
                        set(
                            trains[
                                "date"
                            ].astype(str)
                        )
                    )
            },

        "traffic_summary":
            summary,

        "hourly_traffic":
            hourly,

        "candidate_gaps":
            gaps,

        "gap_statistics":
            {

                "total_gaps":
                    len(gaps),

                "gaps_sufficient_for_required_duration":
                    len(sufficient_gaps),

                "longest_gap":
                    longest_gap,
            },

        "corridor_analysis":
            corridor_analysis,

        "historical_traffic":
            historical,

        "goods_train_forecast":
            goods_forecast,
    }


# ============================================================
# RUN COMPLETE PHASE 2
# ============================================================

def run_phase2() -> Dict[str, Any]:

    # --------------------------------------------------------
    # LOAD PHASE 1
    # --------------------------------------------------------

    section(
        "LOADING PHASE 1"
    )

    print(
        "Phase 1 JSON:"
    )

    print(
        PHASE1_FILE
    )

    requests = load_phase1_requests()

    print()

    print(
        "[OK] Phase 1 requests loaded: "
        f"{len(requests)}"
    )

    # --------------------------------------------------------
    # LOAD TRAIN DATA
    # --------------------------------------------------------

    section(
        "LOADING TRAIN TIMETABLE"
    )

    print(
        "Train file:"
    )

    print(
        TRAIN_FILE
    )

    trains = load_train_data(
        TRAIN_FILE
    )

    print()

    print(
        "[OK] Train records: "
        f"{len(trains)}"
    )

    # --------------------------------------------------------
    # LOAD CORRIDOR DATA
    # --------------------------------------------------------

    section(
        "LOADING CORRIDOR DATA"
    )

    print(
        "Corridor file:"
    )

    print(
        CORRIDOR_FILE
    )

    corridor = load_corridor_data(
        CORRIDOR_FILE
    )

    print()

    print(
        "[OK] Corridor records: "
        f"{len(corridor)}"
    )

    # --------------------------------------------------------
    # ANALYZE EVERY REQUEST
    # --------------------------------------------------------

    section(
        "PHASE 2 REQUEST ANALYSIS"
    )

    request_results = []

    for index, request in enumerate(
        requests,
        start=1
    ):

        print()

        print(
            f"[{index}/{len(requests)}] "
            f"{request['request_id']}"
        )

        print(
            f"Asset: "
            f"{request['asset_id']}"
        )

        print(
            f"Priority: "
            f"{request['priority_score']}"
        )

        print(
            f"Risk: "
            f"{request['current_request_risk_score']}"
        )

        print(
            f"Required duration: "
            f"{request['required_duration_hours']} "
            f"hours = "
            f"{request['required_duration_minutes']} "
            f"minutes"
        )

        print(
            f"Workers: "
            f"{request['workers_required']}"
        )

        print(
            f"Equipment: "
            f"{', '.join(request['equipment_required'])}"
        )

        result = analyze_one_request(
            request,
            trains,
            corridor
        )

        request_results.append(
            result
        )

        print(
            f"Train records considered: "
            f"{result['train_data_used']['total_filtered_train_records']}"
        )

        print(
            f"Actual gaps found: "
            f"{result['gap_statistics']['total_gaps']}"
        )

        print(
            f"Usable-duration gaps: "
            f"{result['gap_statistics']['gaps_sufficient_for_required_duration']}"
        )

        longest = (
            result[
                "gap_statistics"
            ][
                "longest_gap"
            ]
        )

        if longest:

            print(
                f"Longest gap: "
                f"{longest['start']} -> "
                f"{longest['end']} "
                f"({longest['duration_minutes']} min)"
            )

        else:

            print(
                "Longest gap: None"
            )

    # ========================================================
    # COMPLETE OUTPUT
    # ========================================================

    output = {

        "phase":
            "Phase 2",

        "module":
            "Traffic & Corridor Analysis Engine",

        "version":
            VERSION,

        "generated_at":
            datetime.now().isoformat(),

        "phase2_role":
            (
                "Generate ALL possible traffic and "
                "corridor options for Phase 3. "
                "Phase 2 does not select the final block."
            ),

        "phase1_input_file":
            str(
                PHASE1_FILE
            ),

        "train_input_file":
            str(
                TRAIN_FILE
            ),

        "corridor_input_file":
            str(
                CORRIDOR_FILE
            ),

        "total_maintenance_requests":
            len(
                request_results
            ),

        "requests":
            request_results,

        # ----------------------------------------------------
        # Direct Phase 3 integration
        # ----------------------------------------------------

        "integration_for_phase3":
            {

                "maintenance_requests":
                    [
                        result[
                            "maintenance_request"
                        ]

                        for result
                        in request_results
                    ],

                "all_candidate_gaps":
                    [

                        {

                            "task_id":
                                result[
                                    "maintenance_request"
                                ][
                                    "task_id"
                                ],

                            "request_id":
                                result[
                                    "maintenance_request"
                                ][
                                    "request_id"
                                ],

                            "asset_id":
                                result[
                                    "maintenance_request"
                                ][
                                    "asset_id"
                                ],

                            "corridor_id":
                                result[
                                    "maintenance_request"
                                ][
                                    "corridor_id"
                                ],

                            "track_id":
                                result[
                                    "maintenance_request"
                                ][
                                    "track_id"
                                ],

                            "required_duration_minutes":
                                result[
                                    "maintenance_request"
                                ][
                                    "required_duration_minutes"
                                ],

                            "priority_score":
                                result[
                                    "maintenance_request"
                                ][
                                    "priority_score"
                                ],

                            "priority_level":
                                result[
                                    "maintenance_request"
                                ][
                                    "priority_level"
                                ],

                            "current_request_risk_score":
                                result[
                                    "maintenance_request"
                                ][
                                    "current_request_risk_score"
                                ],

                            "asset_risk_score":
                                result[
                                    "maintenance_request"
                                ][
                                    "asset_risk_score"
                                ],

                            "overdue_days":
                                result[
                                    "maintenance_request"
                                ][
                                    "overdue_days"
                                ],

                            "workers_required":
                                result[
                                    "maintenance_request"
                                ][
                                    "workers_required"
                                ],

                            "equipment_required":
                                result[
                                    "maintenance_request"
                                ][
                                    "equipment_required"
                                ],

                            "deadline":
                                result[
                                    "maintenance_request"
                                ][
                                    "deadline"
                                ],

                            "candidate_gaps":
                                result[
                                    "candidate_gaps"
                                ],

                            "traffic_summary":
                                result[
                                    "traffic_summary"
                                ],

                            "corridor_analysis":
                                result[
                                    "corridor_analysis"
                                ],

                            "historical_traffic":
                                result[
                                    "historical_traffic"
                                ],

                            "goods_train_forecast":
                                result[
                                    "goods_train_forecast"
                                ],
                        }

                        for result
                        in request_results
                    ],
            },

        # ----------------------------------------------------
        # Phase boundary
        # ----------------------------------------------------

        "important_boundary":
            {

                "phase2_does":
                    [

                        "Generate all candidate train gaps",

                        "Calculate exact gap durations",

                        "Calculate train frequency",

                        "Analyse passenger and goods traffic",

                        "Calculate traffic density",

                        "Analyse corridor occupancy",

                        "Calculate alternative-track capacity",

                        "Calculate potential train impact",

                        "Provide historical traffic information",

                        "Pass all candidate options to Phase 3",
                    ],

                "phase2_does_not":
                    [

                        "Select the final maintenance window",

                        "Assign workers",

                        "Assign equipment",

                        "Optimize the final block",

                        "Make the final operational decision",
                    ],
            },
    }

    return json_safe(
        output
    )


# ============================================================
# SAVE OUTPUT
# ============================================================

def save_output(
    output: Dict[str, Any]
):

    DATA_DIR.mkdir(
        parents=True,
        exist_ok=True
    )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            output,
            file,
            indent=4,
            ensure_ascii=False
        )

    print()

    print(
        "[OK] Phase 2 output saved:"
    )

    print(
        OUTPUT_FILE
    )


# ============================================================
# DISPLAY SUMMARY
# ============================================================

def display_summary(
    output: Dict[str, Any]
):

    section(
        "PHASE 2 FINAL SUMMARY"
    )

    total_requests = (
        output[
            "total_maintenance_requests"
        ]
    )

    print(
        f"Maintenance requests: "
        f"{total_requests}"
    )

    total_gaps = 0

    total_usable = 0

    # --------------------------------------------------------
    # Every maintenance request
    # --------------------------------------------------------

    for result in output[
        "requests"
    ]:

        request = result[
            "maintenance_request"
        ]

        statistics = result[
            "gap_statistics"
        ]

        total_gaps += (
            statistics[
                "total_gaps"
            ]
        )

        total_usable += (
            statistics[
                "gaps_sufficient_for_required_duration"
            ]
        )

        print()

        print(
            f"{request['request_id']} | "
            f"{request['asset_id']} | "
            f"Priority: "
            f"{request['priority_score']} | "
            f"Risk: "
            f"{request['current_request_risk_score']} | "
            f"Required: "
            f"{request['required_duration_minutes']} min"
        )

        print(
            f"  Gaps: "
            f"{statistics['total_gaps']} | "
            f"Usable: "
            f"{statistics['gaps_sufficient_for_required_duration']}"
        )

        longest = (
            statistics[
                "longest_gap"
            ]
        )

        if longest:

            print(
                f"  Longest: "
                f"{longest['start']} -> "
                f"{longest['end']} | "
                f"{longest['duration_minutes']} min"
            )

    print()

    print(
        f"Total candidate gaps: "
        f"{total_gaps}"
    )

    print(
        f"Total duration-sufficient gaps: "
        f"{total_usable}"
    )

    print()

    print(
        "Phase 2 does NOT select the final block."
    )

    print(
        "Phase 3 will perform the final optimization."
    )


# ============================================================
# MAIN
# ============================================================

def main():

    section(
        f"{VERSION} STARTED"
    )

    try:

        output = run_phase2()

        save_output(
            output
        )

        display_summary(
            output
        )

        section(
            "PHASE 2 COMPLETED SUCCESSFULLY"
        )

        print(
            "[OK] Phase 1 -> Phase 2 integration"
        )

        print(
            "[OK] Multiple maintenance requests"
        )

        print(
            "[OK] Phase 1 JSON loaded from external folder"
        )

        print(
            "[OK] Duration converted from hours to minutes"
        )

        print(
            "[OK] Actual train gaps calculated"
        )

        print(
            "[OK] Train frequency calculated"
        )

        print(
            "[OK] Passenger/Goods traffic analysed"
        )

        print(
            "[OK] Corridor capacity analysed"
        )

        print(
            "[OK] Alternative tracks analysed"
        )

        print(
            "[OK] Potential train impact calculated"
        )

        print(
            "[OK] Phase 3 integration output generated"
        )

    except Exception as error:

        section(
            "PHASE 2 ERROR"
        )

        print(
            str(error)
        )

        print()

        print(
            "CHECK:"
        )

        print(
            f"1. Phase 1 JSON:"
        )

        print(
            f"   {PHASE1_FILE}"
        )

        print(
            f"2. Train data:"
        )

        print(
            f"   {TRAIN_FILE}"
        )

        print(
            f"3. Corridor data:"
        )

        print(
            f"   {CORRIDOR_FILE}"
        )

        print()

        print(
            "Phase 2 stopped."
        )

        raise


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":

    main()