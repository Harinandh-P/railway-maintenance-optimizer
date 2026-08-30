def display_worker(worker, number):

    print("\n" + "-" * 70)

    print(f"WORKER {number}")

    print("-" * 70)

    print(f"Worker ID           : {worker['worker_id']}")
    print(f"Worker Name         : {worker['worker_name']}")
    print(f"Sector / Skill      : {worker['skill']}")
    print(f"Skill Level         : {worker['skill_level']}")
    print(f"Qualification       : {worker['qualification_level']}")
    print(f"Corridor            : {worker['corridor']}")
    print(f"Available            : {worker['available']}")
    print(f"Status               : {worker['status']}")

    # Detailed explanation
    print("\nWORKER ASSESSMENT")
    print("-" * 70)

    level = str(worker["skill_level"]).strip()

    if level == "4":
        print(
            f"{worker['worker_name']} is an experienced "
            f"{worker['skill']} with a skill level of 4. "
            f"The worker has {worker['qualification_level']} "
            f"qualification and is currently available "
            f"for maintenance work in {worker['corridor']}."
        )

    elif level == "3":
        print(
            f"{worker['worker_name']} is a skilled "
            f"{worker['skill']} with a skill level of 3. "
            f"The worker has {worker['qualification_level']} "
            f"qualification and is currently available "
            f"for assignments in {worker['corridor']}."
        )

    elif level == "2":
        print(
            f"{worker['worker_name']} has an intermediate "
            f"skill level of 2 as a {worker['skill']}. "
            f"The worker has {worker['qualification_level']} "
            f"qualification and is available in "
            f"{worker['corridor']}."
        )

    elif level == "1":
        print(
            f"{worker['worker_name']} is a beginner-level "
            f"{worker['skill']}. The worker has "
            f"{worker['qualification_level']} qualification "
            f"and is currently available in "
            f"{worker['corridor']}. "
            f"Supervision may be recommended for complex work."
        )

    else:
        print(
            f"{worker['worker_name']} has skill level "
            f"{worker['skill_level']}. Further assessment "
            f"may be required before assigning complex work."
        )