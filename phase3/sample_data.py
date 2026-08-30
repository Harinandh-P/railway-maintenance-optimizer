from models import (
    MaintenanceRequest,
    Train,
    RailwayGap,
    WorkerAvailability,
    EquipmentAvailability
)


# ============================================================
# MAINTENANCE REQUESTS
# ============================================================

def get_maintenance_requests():

    return [

        MaintenanceRequest(
            task_id="M001",
            department="Signal",
            work_area="C1-KM125",
            corridor="C1",
            required_duration=60,
            priority=9,
            risk_score=9,
            workers_required=4,
            equipment_required="Signal Tester",
            request_date="2026-08-28",
            due_date="2026-08-30",
            overdue_date="2026-09-01",
            parallel_allowed=True
        ),

        MaintenanceRequest(
            task_id="M002",
            department="Track",
            work_area="C1-KM125",
            corridor="C1",
            required_duration=60,
            priority=8,
            risk_score=8,
            workers_required=6,
            equipment_required="Tamping Machine",
            request_date="2026-08-28",
            due_date="2026-08-30",
            overdue_date="2026-09-01",
            parallel_allowed=True
        ),

        MaintenanceRequest(
            task_id="M003",
            department="Electrical",
            work_area="C1-KM125",
            corridor="C1",
            required_duration=80,
            priority=9,
            risk_score=9,
            workers_required=5,
            equipment_required="Electrical Tester",
            request_date="2026-08-28",
            due_date="2026-08-31",
            overdue_date="2026-09-02",
            parallel_allowed=True
        ),

        MaintenanceRequest(
            task_id="M004",
            department="Signal",
            work_area="C1-KM140",
            corridor="C1",
            required_duration=45,
            priority=7,
            risk_score=6,
            workers_required=3,
            equipment_required="Signal Tester",
            request_date="2026-08-28",
            due_date="2026-08-31",
            overdue_date="2026-09-02",
            parallel_allowed=True
        ),

        MaintenanceRequest(
            task_id="M005",
            department="Track",
            work_area="C1-KM140",
            corridor="C1",
            required_duration=90,
            priority=8,
            risk_score=8,
            workers_required=6,
            equipment_required="Tamping Machine",
            request_date="2026-08-28",
            due_date="2026-09-01",
            overdue_date="2026-09-03",
            parallel_allowed=True
        ),

        # Another request to demonstrate priority competition.
        MaintenanceRequest(
            task_id="M006",
            department="Signal",
            work_area="C1-KM155",
            corridor="C1",
            required_duration=60,
            priority=10,
            risk_score=10,
            workers_required=4,
            equipment_required="Signal Tester",
            request_date="2026-08-28",
            due_date="2026-08-29",
            overdue_date="2026-08-30",
            parallel_allowed=True
        )
    ]


# ============================================================
# TRAINS
# ============================================================

def train(
    train_id,
    name,
    train_type,
    priority,
    arrival,
    departure
):

    return Train(
        train_id=train_id,
        train_name=name,
        train_type=train_type,
        priority=priority,
        arrival=arrival,
        departure=departure
    )


# ============================================================
# RAILWAY GAPS
#
# Time is represented in minutes from 00:00.
#
# 610 = 10:10
# 720 = 12:00
# etc.
# ============================================================

def get_railway_gaps():

    return [

        # ====================================================
        # 28 AUGUST
        # ====================================================

        RailwayGap(
            gap_id="D1-G001",
            date="2026-08-28",
            start=500,
            end=590,
            corridor="C1",
            previous_train=train(
                "12601",
                "Express 12601",
                "Passenger",
                2,
                450,
                500
            ),
            next_train=train(
                "12602",
                "Passenger 12602",
                "Passenger",
                1,
                590,
                600
            ),
            train_frequency=3,
            passenger_trains=2,
            goods_trains=1,
            traffic_density=0.45,
            alternative_capacity=50,
            available_tracks=["Track 2", "Track 3"]
        ),

        RailwayGap(
            gap_id="D1-G002",
            date="2026-08-28",
            start=610,
            end=720,
            corridor="C1",
            previous_train=train(
                "12603",
                "Express 12603",
                "Passenger",
                2,
                560,
                610
            ),
            next_train=train(
                "12604",
                "Passenger 12604",
                "Passenger",
                1,
                720,
                730
            ),
            train_frequency=2,
            passenger_trains=1,
            goods_trains=1,
            traffic_density=0.30,
            alternative_capacity=60,
            available_tracks=["Track 2", "Track 3"]
        ),

        RailwayGap(
            gap_id="D1-G003",
            date="2026-08-28",
            start=720,
            end=840,
            corridor="C1",
            previous_train=train(
                "12605",
                "Passenger 12605",
                "Passenger",
                1,
                680,
                720
            ),
            next_train=train(
                "12606",
                "Express 12606",
                "Passenger",
                2,
                840,
                850
            ),
            train_frequency=4,
            passenger_trains=3,
            goods_trains=1,
            traffic_density=0.70,
            alternative_capacity=40,
            available_tracks=["Track 2"]
        ),

        # ====================================================
        # 29 AUGUST
        # ====================================================

        RailwayGap(
            gap_id="D2-G001",
            date="2026-08-29",
            start=520,
            end=650,
            corridor="C1",
            previous_train=train(
                "12607",
                "Express 12607",
                "Passenger",
                2,
                470,
                520
            ),
            next_train=train(
                "12608",
                "Passenger 12608",
                "Passenger",
                1,
                650,
                660
            ),
            train_frequency=2,
            passenger_trains=1,
            goods_trains=1,
            traffic_density=0.25,
            alternative_capacity=70,
            available_tracks=["Track 2", "Track 3"]
        ),

        RailwayGap(
            gap_id="D2-G002",
            date="2026-08-29",
            start=700,
            end=830,
            corridor="C1",
            previous_train=train(
                "12609",
                "Passenger 12609",
                "Passenger",
                1,
                660,
                700
            ),
            next_train=train(
                "12610",
                "Express 12610",
                "Passenger",
                2,
                830,
                840
            ),
            train_frequency=3,
            passenger_trains=2,
            goods_trains=1,
            traffic_density=0.40,
            alternative_capacity=60,
            available_tracks=["Track 2", "Track 3"]
        ),

        # ====================================================
        # 30 AUGUST
        # ====================================================

        RailwayGap(
            gap_id="D3-G001",
            date="2026-08-30",
            start=480,
            end=610,
            corridor="C1",
            previous_train=train(
                "12611",
                "Express 12611",
                "Passenger",
                2,
                430,
                480
            ),
            next_train=train(
                "12612",
                "Passenger 12612",
                "Passenger",
                1,
                610,
                620
            ),
            train_frequency=2,
            passenger_trains=1,
            goods_trains=1,
            traffic_density=0.20,
            alternative_capacity=75,
            available_tracks=["Track 2", "Track 3"]
        ),

        RailwayGap(
            gap_id="D3-G002",
            date="2026-08-30",
            start=680,
            end=820,
            corridor="C1",
            previous_train=train(
                "12613",
                "Passenger 12613",
                "Passenger",
                1,
                640,
                680
            ),
            next_train=train(
                "12614",
                "Express 12614",
                "Passenger",
                2,
                820,
                830
            ),
            train_frequency=2,
            passenger_trains=1,
            goods_trains=1,
            traffic_density=0.30,
            alternative_capacity=65,
            available_tracks=["Track 2", "Track 3"]
        ),

        # ====================================================
        # 31 AUGUST
        # ====================================================

        RailwayGap(
            gap_id="D4-G001",
            date="2026-08-31",
            start=540,
            end=670,
            corridor="C1",
            previous_train=train(
                "12615",
                "Express 12615",
                "Passenger",
                2,
                490,
                540
            ),
            next_train=train(
                "12616",
                "Passenger 12616",
                "Passenger",
                1,
                670,
                680
            ),
            train_frequency=3,
            passenger_trains=2,
            goods_trains=1,
            traffic_density=0.35,
            alternative_capacity=65,
            available_tracks=["Track 2", "Track 3"]
        ),

        # ====================================================
        # 01 SEPTEMBER
        # ====================================================

        RailwayGap(
            gap_id="D5-G001",
            date="2026-09-01",
            start=600,
            end=740,
            corridor="C1",
            previous_train=train(
                "12617",
                "Passenger 12617",
                "Passenger",
                1,
                560,
                600
            ),
            next_train=train(
                "12618",
                "Express 12618",
                "Passenger",
                2,
                740,
                750
            ),
            train_frequency=2,
            passenger_trains=1,
            goods_trains=1,
            traffic_density=0.25,
            alternative_capacity=70,
            available_tracks=["Track 2", "Track 3"]
        ),

        # ====================================================
        # 02 SEPTEMBER
        # ====================================================

        RailwayGap(
            gap_id="D6-G001",
            date="2026-09-02",
            start=620,
            end=760,
            corridor="C1",
            previous_train=train(
                "12619",
                "Express 12619",
                "Passenger",
                2,
                580,
                620
            ),
            next_train=train(
                "12620",
                "Passenger 12620",
                "Passenger",
                1,
                760,
                770
            ),
            train_frequency=2,
            passenger_trains=1,
            goods_trains=1,
            traffic_density=0.28,
            alternative_capacity=70,
            available_tracks=["Track 2", "Track 3"]
        )
    ]


# ============================================================
# WORKER AVAILABILITY
# ============================================================

def get_worker_availability():

    return [

        WorkerAvailability(
            "2026-08-28",
            0,
            1440,
            15
        ),

        WorkerAvailability(
            "2026-08-29",
            0,
            1440,
            15
        ),

        WorkerAvailability(
            "2026-08-30",
            0,
            1440,
            12
        ),

        WorkerAvailability(
            "2026-08-31",
            0,
            1440,
            15
        ),

        WorkerAvailability(
            "2026-09-01",
            0,
            1440,
            15
        ),

        WorkerAvailability(
            "2026-09-02",
            0,
            1440,
            15
        )
    ]


# ============================================================
# EQUIPMENT AVAILABILITY
# ============================================================

def get_equipment_availability():

    equipment = []

    dates = [
        "2026-08-28",
        "2026-08-29",
        "2026-08-30",
        "2026-08-31",
        "2026-09-01",
        "2026-09-02"
    ]

    for date in dates:

        equipment.append(
            EquipmentAvailability(
                date,
                0,
                1440,
                "Signal Tester",
                1
            )
        )

        equipment.append(
            EquipmentAvailability(
                date,
                0,
                1440,
                "Tamping Machine",
                1
            )
        )

        equipment.append(
            EquipmentAvailability(
                date,
                0,
                1440,
                "Electrical Tester",
                1
            )
        )

    return equipment