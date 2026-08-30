import pandas as pd
from pathlib import Path
from typing import Optional, List, Dict, Tuple
from config import AppConfig

def time_to_minutes(time_str: str) -> int:
    """Converts 'HH:MM' string to minutes since 00:00."""
    if not time_str or pd.isna(time_str):
        return 0
    try:
        parts = str(time_str).strip().split(":")
        hours = int(parts[0])
        minutes = int(parts[1])
        return hours * 60 + minutes
    except Exception:
        return 0

def minutes_to_time(minutes: int) -> str:
    """Converts minutes since 00:00 to 'HH:MM' string."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"

def load_train_routes(csv_path: Path = None) -> pd.DataFrame:
    path = csv_path or AppConfig.TRAIN_ROUTES_CSV
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)

def load_station_km_mapping(csv_path: Path = None) -> pd.DataFrame:
    path = csv_path or AppConfig.STATION_KM_CSV
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)

def get_section_movement(
    train_id: str,
    from_km: float,
    to_km: float,
    routes_df: pd.DataFrame,
    mapping_df: pd.DataFrame = None
) -> Optional[Dict]:
    """
    Determines train's exact section entry time and section clear time for a KM range [to_km, from_km].
    
    Algorithm:
    1. Filter train_routes for train_id.
    2. Sort by sequence.
    3. Find stations traversing or adjacent to [min(from_km, to_km), max(from_km, to_km)].
    4. Determine train_entry_time (departure from station before/at section entry)
       and train_clear_time (departure from station at/after section exit).
    5. Return dict with train_id, train_entry_time, train_clear_time, entry_minutes, clear_minutes, sequence.
    """
    if routes_df.empty:
        return None

    train_routes = routes_df[routes_df["train_id"] == str(train_id)].sort_values("sequence")
    if train_routes.empty:
        return None

    min_km = min(from_km, to_km)
    max_km = max(from_km, to_km)

    # Find stations within or bounding the section
    stops_in_section = train_routes[
        (train_routes["km_location"] >= min_km) & (train_routes["km_location"] <= max_km)
    ]

    if stops_in_section.empty:
        # Check if train passes through range without stopping
        min_route_km = train_routes["km_location"].min()
        max_route_km = train_routes["km_location"].max()
        if min_route_km <= min_km and max_route_km >= max_km:
            stops_in_section = train_routes
        else:
            return None

    # Entry station time: departure time of first station in/before section
    entry_stop = stops_in_section.iloc[0]
    entry_time = entry_stop.get("departure_time") or entry_stop.get("arrival_time") or "00:00"

    # Clear station time: departure time of last station in section (or arrival if terminus)
    clear_stop = stops_in_section.iloc[-1]
    clear_time = clear_stop.get("departure_time") or clear_stop.get("arrival_time") or "23:59"

    entry_min = time_to_minutes(entry_time)
    clear_min = time_to_minutes(clear_time)

    # Handle overnight or reversed times
    if clear_min < entry_min:
        clear_min += 1440

    route_seq = stops_in_section[["sequence", "station_code", "station_name", "km_location", "departure_time"]].to_dict(orient="records")

    return {
        "train_id": str(train_id),
        "train_entry_time": str(entry_time),
        "train_clear_time": str(clear_time),
        "entry_minutes": entry_min,
        "clear_minutes": clear_min,
        "start_station": str(entry_stop.get("station_name", "")),
        "end_station": str(clear_stop.get("station_name", "")),
        "route_sequence": route_seq,
        "track_id": str(entry_stop.get("track_id", "T1")),
        "direction": str(entry_stop.get("direction", "A-B"))
    }

def calculate_section_gaps(
    movements: List[Dict],
    required_duration_minutes: float,
    safety_buffer_minutes: int = 10
) -> List[Dict]:
    """
    Calculates gaps between consecutive train section movements.
    Enforces required_duration_minutes + safety_buffer_minutes threshold.
    """
    gaps = []
    sorted_movs = sorted(movements, key=lambda m: m["entry_minutes"])

    day_start = 0     # 00:00
    day_end = 1440    # 24:00

    current_time = day_start
    gap_idx = 1

    for idx, mov in enumerate(sorted_movs):
        gap_start = current_time
        gap_end = mov["entry_minutes"]

        if gap_end > gap_start:
            duration = gap_end - gap_start
            usable_duration = duration - safety_buffer_minutes
            is_sufficient = usable_duration >= required_duration_minutes

            prev_t = sorted_movs[idx - 1] if idx > 0 else None
            next_t = mov

            gaps.append({
                "gap_id": f"G{gap_idx:03d}",
                "date": "2026-08-28",
                "start": minutes_to_time(gap_start),
                "end": minutes_to_time(gap_end),
                "start_minutes": gap_start,
                "end_minutes": gap_end,
                "duration_minutes": duration,
                "usable_duration_minutes": usable_duration,
                "required_duration_minutes": required_duration_minutes,
                "duration_sufficient_for_phase1_requirement": is_sufficient,
                "previous_train": prev_t["train_id"] if prev_t else None,
                "next_train": next_t["train_id"] if next_t else None,
                "train_entry_time": next_t["train_entry_time"] if next_t else None,
                "train_clear_time": prev_t["train_clear_time"] if prev_t else None,
                "is_longest_gap": False,
                "train_frequency": round(len(sorted_movs) / 24.0, 2),
                "passenger_trains": sum(1 for m in sorted_movs if "Goods" not in m.get("train_id", "")),
                "goods_trains": sum(1 for m in sorted_movs if "Goods" in m.get("train_id", "")),
                "traffic_density": round(len(sorted_movs) / 10.0, 2),
                "traffic_density_level": "HIGH" if len(sorted_movs) > 6 else "MEDIUM" if len(sorted_movs) > 3 else "LOW",
                "potential_train_impact": {
                    "impact_level": "LOW" if is_sufficient else "HIGH",
                    "note": "Section clear gap" if is_sufficient else "Insufficient section gap"
                }
            })
            gap_idx += 1

        current_time = max(current_time, mov["clear_minutes"])

    # Final gap after last train
    if current_time < day_end:
        duration = day_end - current_time
        usable_duration = duration - safety_buffer_minutes
        is_sufficient = usable_duration >= required_duration_minutes
        prev_t = sorted_movs[-1] if sorted_movs else None

        gaps.append({
            "gap_id": f"G{gap_idx:03d}",
            "date": "2026-08-28",
            "start": minutes_to_time(current_time),
            "end": minutes_to_time(day_end),
            "start_minutes": current_time,
            "end_minutes": day_end,
            "duration_minutes": duration,
            "usable_duration_minutes": usable_duration,
            "required_duration_minutes": required_duration_minutes,
            "duration_sufficient_for_phase1_requirement": is_sufficient,
            "previous_train": prev_t["train_id"] if prev_t else None,
            "next_train": None,
            "train_entry_time": None,
            "train_clear_time": prev_t["train_clear_time"] if prev_t else None,
            "is_longest_gap": False,
            "train_frequency": round(len(sorted_movs) / 24.0, 2),
            "passenger_trains": sum(1 for m in sorted_movs if "Goods" not in m.get("train_id", "")),
            "goods_trains": sum(1 for m in sorted_movs if "Goods" in m.get("train_id", "")),
            "traffic_density": round(len(sorted_movs) / 10.0, 2),
            "traffic_density_level": "LOW",
            "potential_train_impact": {
                "impact_level": "LOW" if is_sufficient else "HIGH",
                "note": "End of day gap"
            }
        })

    # Mark longest gap
    if gaps:
        longest = max(gaps, key=lambda g: g["duration_minutes"])
        longest["is_longest_gap"] = True

    return gaps

def enrich_candidate_gaps_with_section_data(
    candidate_gaps: List[Dict],
    movements: List[Dict],
    section_id: str,
    from_km: float,
    to_km: float,
    direction: str = "A-B",
    track_id: str = "T1"
) -> List[Dict]:
    """Enriches candidate gap records with detailed section fields without altering existing fields."""
    enriched = []
    for gap in candidate_gaps:
        g = dict(gap)
        g["section_id"] = section_id
        g["section_name"] = f"KM{from_km}-KM{to_km}"
        g["from_km"] = from_km
        g["to_km"] = to_km
        g["track_id"] = track_id
        g["direction"] = direction
        g["section_gap_calculation_used"] = True
        enriched.append(g)
    return enriched
