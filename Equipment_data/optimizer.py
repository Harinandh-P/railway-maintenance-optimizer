# optimizer.py
# EQUIPMENT DATA - EQUIPMENT OPTIMIZER
# ------------------------------------------------------------
# Selects available and operational equipment for each day.
# Output:
#     data/optimized_equipment_schedule.csv
# ------------------------------------------------------------


# ============================================================
# 1. IMPORTS
# ============================================================

try:
    import pandas as pd
except ImportError:
    print()
    print("=" * 70)
    print("ERROR: pandas is not installed")
    print("=" * 70)
    print()
    print("Run:")
    print("python -m pip install pandas")
    print()
    raise


try:
    from ortools.sat.python import cp_model
except ImportError:
    print()
    print("=" * 70)
    print("ERROR: OR-Tools is not installed")
    print("=" * 70)
    print()
    print("Run:")
    print("python -m pip install ortools")
    print()
    raise


from pathlib import Path


# ============================================================
# 2. TITLE
# ============================================================

print()
print("=" * 70)
print("EQUIPMENT OPTIMIZATION")
print("=" * 70)


# ============================================================
# 3. FILE PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"

EQUIPMENT_FILE = (
    DATA_DIR /
    "equipment_database.csv"
)

OUTPUT_FILE = (
    DATA_DIR /
    "optimized_equipment_schedule.csv"
)


# ============================================================
# 4. CHECK DATA DIRECTORY
# ============================================================

if not DATA_DIR.exists():

    print()
    print("ERROR: data folder not found!")
    print()
    print("Expected folder:")
    print(DATA_DIR)
    print()

    raise SystemExit


# ============================================================
# 5. CHECK EQUIPMENT DATABASE
# ============================================================

if not EQUIPMENT_FILE.exists():

    print()
    print("=" * 70)
    print("ERROR: Equipment database not found!")
    print("=" * 70)
    print()
    print("Expected file:")
    print(EQUIPMENT_FILE)
    print()
    print("Your folder should contain:")
    print()
    print("Equipment_data/")
    print("│")
    print("├── optimizer.py")
    print("│")
    print("└── data/")
    print("    └── equipment_database.csv")
    print()

    raise SystemExit


# ============================================================
# 6. LOAD CSV
# ============================================================

print()
print("Loading equipment database...")
print(EQUIPMENT_FILE)

try:

    df = pd.read_csv(
        EQUIPMENT_FILE
    )

except Exception as error:

    print()
    print("ERROR: Could not read equipment database.")
    print()
    print(error)
    print()

    raise SystemExit


# ============================================================
# 7. CHECK EMPTY DATABASE
# ============================================================

if df.empty:

    print()
    print("ERROR: Equipment database is empty.")
    print()

    raise SystemExit


# ============================================================
# 8. CLEAN COLUMN NAMES
# ============================================================

df.columns = (
    df.columns
    .astype(str)
    .str.strip()
)


# ============================================================
# 9. CLEAN STRING VALUES
# ============================================================

for column in df.columns:

    if df[column].dtype == "object":

        df[column] = (
            df[column]
            .astype(str)
            .str.strip()
        )


# ============================================================
# 10. REQUIRED COLUMNS
# ============================================================

required_columns = [

    "equipment_id",
    "equipment_name",
    "equipment_type",
    "date",
    "corridor",
    "location",
    "availability_start",
    "availability_end",
    "available",
    "operational",
    "status",
    "quantity"

]


missing_columns = [

    column

    for column in required_columns

    if column not in df.columns

]


if missing_columns:

    print()
    print("=" * 70)
    print("ERROR: Missing columns in equipment_database.csv")
    print("=" * 70)
    print()

    for column in missing_columns:

        print(
            f"Missing: {column}"
        )

    print()

    raise SystemExit


# ============================================================
# 11. DATABASE INFORMATION
# ============================================================

print()
print(
    "Equipment database loaded successfully."
)

print(
    f"Total records: {len(df)}"
)

print(
    f"Unique equipment: "
    f"{df['equipment_id'].nunique()}"
)

print(
    f"Dates: "
    f"{df['date'].nunique()}"
)


# ============================================================
# 12. NORMALIZE BOOLEAN VALUES
# ============================================================

def is_true(value):

    return str(
        value
    ).strip().lower() in [

        "true",
        "1",
        "yes",
        "available"

    ]


# ============================================================
# 13. NORMALIZE STATUS
# ============================================================

df["status"] = (
    df["status"]
    .astype(str)
    .str.strip()
    .str.lower()
)


# ============================================================
# 14. CONVERT QUANTITY
# ============================================================

df["quantity"] = pd.to_numeric(

    df["quantity"],

    errors="coerce"

).fillna(0)


df["quantity"] = (
    df["quantity"]
    .astype(int)
)


# ============================================================
# 15. SELECT AVAILABLE EQUIPMENT
# ============================================================

available_df = df[

    df["available"].apply(
        is_true
    )

    &

    df["operational"].apply(
        is_true
    )

    &

    df["status"].isin([
        "available"
    ])

    &

    (
        df["quantity"] > 0
    )

].copy()


# ============================================================
# 16. DISPLAY AVAILABLE RECORDS
# ============================================================

print()
print(
    "Available equipment records: "
    f"{len(available_df)}"
)


if available_df.empty:

    print()
    print(
        "WARNING: No equipment is currently available."
    )

    empty_columns = [

        "date",
        "equipment_id",
        "equipment_name",
        "equipment_type",
        "corridor",
        "location",
        "availability_start",
        "availability_end",
        "quantity",
        "operator_required",
        "required_operator_skill",
        "status"

    ]

    empty_df = pd.DataFrame(
        columns=empty_columns
    )

    empty_df.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print()
    print(
        "Empty output file created:"
    )

    print(
        OUTPUT_FILE
    )

    raise SystemExit


# ============================================================
# 17. CREATE CP-SAT MODEL
# ============================================================

model = cp_model.CpModel()


# ============================================================
# 18. DECISION VARIABLES
# ============================================================

variables = {}


for index, row in available_df.iterrows():

    equipment_id = str(
        row["equipment_id"]
    )

    current_date = str(
        row["date"]
    )

    variable_name = (

        "assign_"

        + equipment_id

        + "_"

        + current_date

        + "_"

        + str(index)

    )

    variables[index] = (
        model.NewBoolVar(
            variable_name
        )
    )


# ============================================================
# 19. EQUIPMENT SELECTION RULE
# ============================================================
#
# Same physical equipment ID cannot be selected
# more than once for the same date.
#
# Example:
#
# Signal Tester ST001
# 2026-08-28
#
# Only one database record for that equipment/date
# can be selected.
#
# ============================================================

for current_date in (
    available_df["date"]
    .unique()
):

    date_rows = available_df[
        available_df["date"]
        == current_date
    ]

    equipment_ids = (
        date_rows["equipment_id"]
        .unique()
    )

    for equipment_id in equipment_ids:

        indexes = (
            date_rows[
                date_rows["equipment_id"]
                == equipment_id
            ]
            .index
            .tolist()
        )

        if not indexes:
            continue

        model.Add(

            sum(
                variables[index]
                for index in indexes
            )

            <= 1

        )


# ============================================================
# 20. OBJECTIVE
# ============================================================
#
# Prefer equipment that is already positioned
# in the railway corridor.
#
# Corridor equipment:
#     C1 = 10
#     C2 = 10
#     C3 = 10
#
# Other location:
#     1
#
# Higher score = better candidate.
#
# ============================================================

objective_terms = []


for index, row in available_df.iterrows():

    corridor = str(
        row["corridor"]
    ).strip().upper()


    if corridor in [

        "C1",
        "C2",
        "C3"

    ]:

        score = 10

    else:

        score = 1


    # Small preference for larger quantity.
    quantity = int(
        row["quantity"]
    )


    quantity_bonus = min(
        quantity,
        5
    )


    total_score = (
        score
        +
        quantity_bonus
    )


    objective_terms.append(

        total_score
        *
        variables[index]

    )


# ============================================================
# 21. MAXIMIZE OBJECTIVE
# ============================================================

model.Maximize(

    sum(
        objective_terms
    )

)


# ============================================================
# 22. SOLVER
# ============================================================

solver = cp_model.CpSolver()

solver.parameters.max_time_in_seconds = 60
solver.parameters.num_search_workers = 4
solver.parameters.log_search_progress = True


# ============================================================
# 23. SOLVE
# ============================================================

print()
print(
    "Running equipment optimization..."
)

status = solver.Solve(
    model
)

status_name = solver.StatusName(status)
print(f"Solver status: {status_name}")
print(f"Solver wall time: {solver.WallTime():.2f}s")
print(f"Number of branches: {solver.NumBranches()}")
print(f"Number of conflicts: {solver.NumConflicts()}")


# ============================================================
# 24. CHECK SOLUTION
# ============================================================

print()
print("-" * 70)


if status == cp_model.OPTIMAL:

    print(
        "EQUIPMENT OPTIMIZATION: OPTIMAL"
    )


elif status == cp_model.FEASIBLE:

    print(
        "EQUIPMENT OPTIMIZATION: FEASIBLE"
    )


elif status == cp_model.INFEASIBLE:

    print()
    print(
        "ERROR: No feasible allocation exists (CP-SAT Solver INFEASIBLE)."
    )
    print()

    raise RuntimeError("No feasible allocation exists.")


else:

    print()
    print(
        f"ERROR: Solver failure or timeout (CP-SAT Solver status: {status_name})."
    )
    print()

    raise RuntimeError(f"Solver failure or timeout: {status_name}")


# ============================================================
# 25. CREATE RESULT
# ============================================================

results = []


for index, row in available_df.iterrows():

    selected = solver.Value(
        variables[index]
    )


    if selected != 1:

        continue


    # --------------------------------------------------------
    # Safe optional columns
    # --------------------------------------------------------

    operator_required = row.get(
        "operator_required",
        ""
    )

    required_operator_skill = row.get(
        "required_operator_skill",
        ""
    )


    results.append({

        "date":
            row["date"],

        "equipment_id":
            row["equipment_id"],

        "equipment_name":
            row["equipment_name"],

        "equipment_type":
            row["equipment_type"],

        "corridor":
            row["corridor"],

        "location":
            row["location"],

        "availability_start":
            row["availability_start"],

        "availability_end":
            row["availability_end"],

        "quantity":
            row["quantity"],

        "operator_required":
            operator_required,

        "required_operator_skill":
            required_operator_skill,

        "status":
            "SELECTED"

    })


# ============================================================
# 26. CREATE DATAFRAME
# ============================================================

result_df = pd.DataFrame(
    results
)


# ============================================================
# 27. SORT RESULT
# ============================================================

if not result_df.empty:

    result_df = (
        result_df
        .sort_values(
            by=[
                "date",
                "corridor",
                "availability_start",
                "equipment_id"
            ]
        )
        .reset_index(
            drop=True
        )
    )


# ============================================================
# 28. SAVE OUTPUT
# ============================================================

try:

    result_df.to_csv(

        OUTPUT_FILE,

        index=False

    )

except Exception as error:

    print()
    print(
        "ERROR: Could not save output file."
    )
    print()
    print(error)
    print()

    raise SystemExit


# ============================================================
# 29. DISPLAY RESULT
# ============================================================

print()
print(
    "OPTIMIZED EQUIPMENT SCHEDULE"
)

print(
    "-" * 70
)


if result_df.empty:

    print(
        "No equipment selected."
    )

else:

    print(
        result_df.to_string(
            index=False
        )
    )


# ============================================================
# 30. SUMMARY
# ============================================================

print()
print(
    "-" * 70
)

print(
    f"Available records: "
    f"{len(available_df)}"
)

print(
    f"Selected equipment: "
    f"{len(result_df)}"
)

print(
    f"Equipment IDs: "
    f"{available_df['equipment_id'].nunique()}"
)

print(
    f"Dates processed: "
    f"{available_df['date'].nunique()}"
)


# ============================================================
# 31. OUTPUT FILE
# ============================================================

print()
print(
    "Output file:"
)

print(
    OUTPUT_FILE
)


# ============================================================
# 32. COMPLETED
# ============================================================

print()
print("=" * 70)

print(
    "EQUIPMENT OPTIMIZATION COMPLETED"
)

print("=" * 70)