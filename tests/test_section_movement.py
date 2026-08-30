import pytest
from phase2.section_movement import (
    get_section_movement,
    calculate_section_gaps,
    load_train_routes,
    load_station_km_mapping
)

def test_scenario_a_80_minute_duration():
    """
    SCENARIO A (Rule 15):
    Section: C1 / KM292 -> KM223
    Maintenance duration: 80 minutes
    Train movements:
      - Train A: 08:10 -> 08:25
      - Train B: 09:40 -> 09:55
    Gap between Train A clear (08:25 = 505m) and Train B entry (09:40 = 580m):
      75 minutes -> MUST BE REJECTED (< 80 min + 10 min safety buffer)
    Gap from 10:05 to 11:55 (110 minutes):
      110 minutes -> CANDIDATE (sufficient for 80 minutes)
    """
    movements = [
        {
            "train_id": "Train_A",
            "train_entry_time": "08:10",
            "train_clear_time": "08:25",
            "entry_minutes": 490,  # 08:10
            "clear_minutes": 505   # 08:25
        },
        {
            "train_id": "Train_B",
            "train_entry_time": "09:40",
            "train_clear_time": "09:55",
            "entry_minutes": 580,  # 09:40
            "clear_minutes": 595   # 09:55
        },
        {
            "train_id": "Train_C",
            "train_entry_time": "11:45",
            "train_clear_time": "12:00",
            "entry_minutes": 705,  # 11:45
            "clear_minutes": 720   # 12:00
        }
    ]

    gaps = calculate_section_gaps(movements, required_duration_minutes=80.0, safety_buffer_minutes=10)

    # Find the 75-minute gap (08:25 -> 09:40)
    gap_75 = next((g for g in gaps if g["start"] == "08:25" and g["end"] == "09:40"), None)
    assert gap_75 is not None, "75-minute gap should exist in candidate list"
    assert gap_75["duration_minutes"] == 75
    assert gap_75["duration_sufficient_for_phase1_requirement"] == False, "75-min gap MUST be rejected for 80-min requirement"

    # Find the 110-minute gap (09:55 -> 11:45)
    gap_110 = next((g for g in gaps if g["start"] == "09:55" and g["end"] == "11:45"), None)
    assert gap_110 is not None, "110-minute gap should exist in candidate list"
    assert gap_110["duration_minutes"] == 110
    assert gap_110["duration_sufficient_for_phase1_requirement"] == True, "110-min gap MUST be feasible for 80-min requirement"

def test_scenario_b_180_minute_duration():
    """
    SCENARIO B (Rule 15):
    Maintenance duration: 180 minutes
    Both the 75-minute gap and 110-minute gap MUST be rejected.
    """
    movements = [
        {
            "train_id": "Train_A",
            "train_entry_time": "08:10",
            "train_clear_time": "08:25",
            "entry_minutes": 490,
            "clear_minutes": 505
        },
        {
            "train_id": "Train_B",
            "train_entry_time": "09:40",
            "train_clear_time": "09:55",
            "entry_minutes": 580,
            "clear_minutes": 595
        },
        {
            "train_id": "Train_C",
            "train_entry_time": "11:45",
            "train_clear_time": "12:00",
            "entry_minutes": 705,
            "clear_minutes": 720
        }
    ]

    gaps = calculate_section_gaps(movements, required_duration_minutes=180.0, safety_buffer_minutes=10)

    gap_75 = next((g for g in gaps if g["start"] == "08:25" and g["end"] == "09:40"), None)
    assert gap_75["duration_sufficient_for_phase1_requirement"] == False

    gap_110 = next((g for g in gaps if g["start"] == "09:55" and g["end"] == "11:45"), None)
    assert gap_110["duration_sufficient_for_phase1_requirement"] == False
