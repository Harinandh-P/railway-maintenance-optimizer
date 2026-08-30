from collections import defaultdict

from models import MaintenanceGroup


# ============================================================
# GROUP MAINTENANCE REQUESTS
# ============================================================

def create_maintenance_groups(tasks):

    grouped = defaultdict(list)

    # Same corridor + same work area
    # means the jobs can potentially be performed
    # in the same maintenance block.

    for task in tasks:

        key = (
            task.corridor,
            task.work_area
        )

        grouped[key].append(task)

    groups = []

    counter = 1

    for (corridor, work_area), group_tasks in grouped.items():

        group = MaintenanceGroup(
            group_id=f"GRP{counter:03d}",
            work_area=work_area,
            corridor=corridor,
            tasks=group_tasks
        )

        groups.append(group)

        counter += 1

    return groups


# ============================================================
# GROUP DESCRIPTION
# ============================================================

def explain_group(group):

    if all(
        task.parallel_allowed
        for task in group.tasks
    ):

        execution_mode = "PARALLEL"

        rule = (
            "MAX(task duration)"
        )

    else:

        execution_mode = "SEQUENTIAL"

        rule = (
            "SUM(task duration)"
        )

    return {
        "group_id": group.group_id,
        "work_area": group.work_area,
        "corridor": group.corridor,
        "task_count": len(group.tasks),
        "required_duration": group.required_duration,
        "total_workers": group.total_workers,
        "highest_priority": group.highest_priority,
        "highest_risk": group.highest_risk,
        "execution_mode": execution_mode,
        "duration_rule": rule
    }