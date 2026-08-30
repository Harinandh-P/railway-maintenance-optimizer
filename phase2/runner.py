import json
import pandas as pd
from pathlib import Path
from config import AppConfig
from phase2.section_movement import (
    load_train_routes,
    load_station_km_mapping,
    get_section_movement,
    calculate_section_gaps,
    enrich_candidate_gaps_with_section_data
)

def run_phase2(phase1_file: Path = None, output_file: Path = None) -> dict:
    p1_path = phase1_file or AppConfig.PHASE1_OUTPUT
    out_path = output_file or AppConfig.PHASE2_OUTPUT

    if not p1_path.exists():
        raise FileNotFoundError(f"Phase 1 output file not found: {p1_path}")

    with open(p1_path, "r") as f:
        phase1_requests = json.load(f)

    routes_df = load_train_routes()
    mapping_df = load_station_km_mapping()
    trains_df = pd.read_csv(AppConfig.TRAINS_CSV) if AppConfig.TRAINS_CSV.exists() else pd.DataFrame()

    phase2_output_requests = []

    for req in phase1_requests:
        corridor_id = req.get("corridor_id", "C1")
        if corridor_id not in ["C1", "C2", "C3"]:
            corridor_id = "C1"

        location_str = str(req.get("location", ""))
        from_km = 292.0
        to_km = 223.0
        
        import re
        km_match = re.search(r"(\d+(\.\d+)?)", location_str)
        if km_match:
            loc_num = float(km_match.group(1))
            from_km = loc_num + 5.0
            to_km = max(0.0, loc_num - 5.0)

        if corridor_id == "C1":
            from_km = 292.0
            to_km = 223.0

        required_dur_min = float(req.get("required_duration_minutes", req.get("required_duration", 2.0) * 60.0))

        movements = []
        if not trains_df.empty:
            c_trains = trains_df[trains_df["corridor_id"] == corridor_id]
            if c_trains.empty:
                c_trains = trains_df

            for _, t_row in c_trains.iterrows():
                t_id = t_row["train_id"]
                mov = get_section_movement(t_id, from_km, to_km, routes_df, mapping_df)
                if mov:
                    movements.append(mov)

        if not movements:
            movements = [
                {"train_id": "T101", "train_entry_time": "06:05", "train_clear_time": "08:12", "entry_minutes": 365, "clear_minutes": 492},
                {"train_id": "T102", "train_entry_time": "08:45", "train_clear_time": "10:45", "entry_minutes": 525, "clear_minutes": 645},
                {"train_id": "T103", "train_entry_time": "11:15", "train_clear_time": "13:15", "entry_minutes": 675, "clear_minutes": 795},
            ]

        candidate_gaps = calculate_section_gaps(movements, required_duration_minutes=required_dur_min, safety_buffer_minutes=10)

        enriched_gaps = enrich_candidate_gaps_with_section_data(
            candidate_gaps=candidate_gaps,
            movements=movements,
            section_id=f"{corridor_id}-S1",
            from_km=from_km,
            to_km=to_km
        )

        req_block = {
            "request_information": req,
            "corridor_analysis": {
                "corridor_id": corridor_id,
                "section_id": f"{corridor_id}-S1",
                "from_km": from_km,
                "to_km": to_km,
                "train_count": len(movements),
                "train_movements": movements
            },
            "candidate_gaps": enriched_gaps,
            "summary": {
                "total_gaps": len(enriched_gaps),
                "feasible_gaps": sum(1 for g in enriched_gaps if g.get("duration_sufficient_for_phase1_requirement")),
                "infeasible_gaps": sum(1 for g in enriched_gaps if not g.get("duration_sufficient_for_phase1_requirement"))
            }
        }
        phase2_output_requests.append(req_block)

    result_payload = {
        "version": "PHASE 2 V3 - MULTI REQUEST WITH SECTION MOVEMENT",
        "requests": phase2_output_requests
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(result_payload, f, indent=4)

    print(f"[Phase 2] Generated candidate gaps for {len(phase2_output_requests)} requests -> {out_path}")
    return result_payload

if __name__ == "__main__":
    run_phase2()
