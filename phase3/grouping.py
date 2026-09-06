from collections import defaultdict

from models import MaintenanceGroup


# ============================================================
# GROUP MAINTENANCE REQUESTS
# ============================================================

def create_maintenance_groups(tasks, max_group_duration=360, max_group_workers=25, max_group_tasks=5):
    """
    Feasibility-Aware Grouping Algorithm.
    Groups compatible tasks sharing (corridor, work_area), while preventing artificial infeasibility:
    - Separates long-duration outliers (duration > max_group_duration) into standalone groups.
    - Partitions tasks at the same location into manageable sub-groups:
      - Group duration <= max_group_duration (default 360 min / 6h).
      - Total workers required <= max_group_workers (default 25 workers).
      - Total tasks per group <= max_group_tasks (default 5 tasks).
    - Retains task properties (priority, risk, due_date, worker requirements, equipment, etc.).
    """
    location_groups = defaultdict(list)
    for task in tasks:
        key = (task.corridor, task.work_area)
        location_groups[key].append(task)

    groups = []
    counter = 1

    for (corridor, work_area), loc_tasks in location_groups.items():
        # Sort tasks by priority (descending) and risk (descending) to prioritize high-value work
        sorted_tasks = sorted(loc_tasks, key=lambda t: (getattr(t, 'priority', 5), getattr(t, 'risk_score', 5)), reverse=True)

        current_subgroup = []
        current_workers = 0
        current_max_dur = 0

        for task in sorted_tasks:
            task_dur = getattr(task, 'required_duration', 120)
            task_workers = getattr(task, 'workers_required', 4)

            # Long duration outlier (e.g. > 360 min): place in standalone group
            if task_dur > max_group_duration:
                outlier_group = MaintenanceGroup(
                    group_id=f"GRP{counter:03d}",
                    work_area=work_area,
                    corridor=corridor,
                    tasks=[task]
                )
                groups.append(outlier_group)
                counter += 1
                continue

            # Check if adding task exceeds subgroup feasibility thresholds
            new_workers = current_workers + task_workers
            new_max_dur = max(current_max_dur, task_dur)
            new_task_count = len(current_subgroup) + 1

            if current_subgroup and (new_workers > max_group_workers or new_max_dur > max_group_duration or new_task_count > max_group_tasks):
                # Close current subgroup and create MaintenanceGroup
                grp = MaintenanceGroup(
                    group_id=f"GRP{counter:03d}",
                    work_area=work_area,
                    corridor=corridor,
                    tasks=current_subgroup
                )
                groups.append(grp)
                counter += 1

                current_subgroup = [task]
                current_workers = task_workers
                current_max_dur = task_dur
            else:
                current_subgroup.append(task)
                current_workers = new_workers
                current_max_dur = new_max_dur

        if current_subgroup:
            grp = MaintenanceGroup(
                group_id=f"GRP{counter:03d}",
                work_area=work_area,
                corridor=corridor,
                tasks=current_subgroup
            )
            groups.append(grp)
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