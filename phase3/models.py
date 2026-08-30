from dataclasses import dataclass, field
from typing import List, Dict, Optional


# ============================================================
# MAINTENANCE REQUEST
# ============================================================

@dataclass
class MaintenanceRequest:
    task_id: str
    department: str
    work_area: str
    corridor: str

    required_duration: int
    priority: int
    risk_score: int

    workers_required: int
    equipment_required: str

    request_date: str
    due_date: str
    overdue_date: str

    parallel_allowed: bool = True


# ============================================================
# TRAIN INFORMATION
# ============================================================

@dataclass
class Train:
    train_id: str
    train_name: str
    train_type: str
    priority: int
    arrival: int
    departure: int


# ============================================================
# RAILWAY GAP
# ============================================================

@dataclass
class RailwayGap:
    gap_id: str
    date: str

    start: int
    end: int

    corridor: str

    previous_train: Optional[Train]
    next_train: Optional[Train]

    train_frequency: int
    passenger_trains: int
    goods_trains: int

    traffic_density: float

    alternative_capacity: int

    available_tracks: List[str] = field(default_factory=list)

    safety_before: int = 10
    safety_after: int = 10

    @property
    def duration(self):
        return self.end - self.start

    @property
    def usable_duration(self):
        return max(
            0,
            self.duration
            - self.safety_before
            - self.safety_after
        )


# ============================================================
# WORKER AVAILABILITY
# ============================================================

@dataclass
class WorkerAvailability:
    date: str
    start: int
    end: int
    available_workers: int


# ============================================================
# EQUIPMENT AVAILABILITY
# ============================================================

@dataclass
class EquipmentAvailability:
    date: str
    start: int
    end: int
    equipment_name: str
    quantity: int


# ============================================================
# MAINTENANCE GROUP
# ============================================================

@dataclass
class MaintenanceGroup:
    group_id: str
    work_area: str
    corridor: str
    tasks: List[MaintenanceRequest]

    @property
    def required_duration(self):

        # If every task can run in parallel,
        # longest task determines block duration.

        if all(task.parallel_allowed for task in self.tasks):
            return max(
                task.required_duration
                for task in self.tasks
            )

        # Otherwise execute sequentially.
        return sum(
            task.required_duration
            for task in self.tasks
        )

    @property
    def total_workers(self):
        return sum(
            task.workers_required
            for task in self.tasks
        )

    @property
    def highest_priority(self):
        return max(
            task.priority
            for task in self.tasks
        )

    @property
    def highest_risk(self):
        return max(
            task.risk_score
            for task in self.tasks
        )

    @property
    def earliest_due_date(self):
        return min(
            task.due_date
            for task in self.tasks
        )

    @property
    def latest_overdue_date(self):
        return min(
            task.overdue_date
            for task in self.tasks
        )


# ============================================================
# ALLOCATED BLOCK
# ============================================================

@dataclass
class AllocatedBlock:

    group_id: str

    date: str

    gap_id: str

    corridor: str
    work_area: str

    start: int
    end: int

    required_duration: int

    tasks: List[MaintenanceRequest]

    workers_required: int
    workers_available: int

    equipment_used: List[str]

    previous_train: Optional[Train]
    next_train: Optional[Train]

    train_frequency: int
    passenger_trains: int
    goods_trains: int

    traffic_density: float
    traffic_impact: float

    alternative_capacity: int

    priority: int
    risk_score: int

    score: float

    deadline_status: str

    reasons: List[str] = field(default_factory=list)