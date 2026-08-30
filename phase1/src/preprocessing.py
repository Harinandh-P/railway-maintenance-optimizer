import pandas as pd
import numpy as np


VALID_DEPARTMENTS = {
    "Engineering",
    "S&T",
    "Traction"
}

VALID_SEVERITY = {
    "Low",
    "Medium",
    "High",
    "Critical"
}

VALID_RISK = {
    "Low",
    "Medium",
    "High",
    "Critical"
}

VALID_CRITICALITY = {
    "Low",
    "Medium",
    "High",
    "Critical"
}

VALID_CONDITION = {
    "Good",
    "Fair",
    "Degraded",
    "Deteriorating",
    "Poor"
}
def clean_text(value):
    if pd.isna(value):
        return np.nan

    return str(value).strip()

def normalize_category(value):
    if pd.isna(value):
        return np.nan

    value = str(value).strip()

    mapping = {
        "low": "Low",
        "medium": "Medium",
        "high": "High",
        "critical": "Critical"
    }

    return mapping.get(value.lower(), value)
def clean_requests(df):

    df = df.copy()

    # Remove duplicate requests
    df = df.drop_duplicates(subset=["request_id"])

    # Clean text columns
    text_columns = [
        "request_id",
        "department",
        "asset_id",
        "asset_type",
        "location",
        "point_a",
        "point_b",
        "corridor_id",
        "maintenance_type",
        "defect_type",
        "defect_reason"
    ]

    for column in text_columns:
        df[column] = df[column].apply(clean_text)

    # Normalize categories
    df["defect_severity"] = df["defect_severity"].apply(
        normalize_category
    )

    df["safety_risk"] = df["safety_risk"].apply(
        normalize_category
    )

    # Convert dates
    df["request_datetime"] = pd.to_datetime(
        df["request_datetime"],
        errors="coerce"
    )

    df["due_date"] = pd.to_datetime(
        df["due_date"],
        errors="coerce"
    )

    # Convert numerical values
    df["required_duration_hours"] = pd.to_numeric(
        df["required_duration_hours"],
        errors="coerce"
    )

    df["required_workers"] = pd.to_numeric(
        df["required_workers"],
        errors="coerce"
    )

    # Invalid numerical values become NaN
    df.loc[
        df["required_duration_hours"] < 0,
        "required_duration_hours"
    ] = np.nan

    df.loc[
        df["required_workers"] < 0,
        "required_workers"
    ] = np.nan

    return df
def clean_history(df):

    df = df.copy()

    # Remove duplicate tasks
    df = df.drop_duplicates(subset=["task_id"])

    text_columns = [
        "task_id",
        "asset_id",
        "location",
        "department",
        "maintenance_type",
        "defect_type",
        "defect_reason",
        "equipment_used",
        "materials_used",
        "train_operational_impact"
    ]

    for column in text_columns:
        df[column] = df[column].apply(clean_text)

    # Normalize severity
    df["severity"] = df["severity"].apply(
        normalize_category
    )

    # Convert dates
    date_columns = [
        "failure_date",
        "maintenance_date",
        "next_scheduled_maintenance"
    ]

    for column in date_columns:
        df[column] = pd.to_datetime(
            df[column],
            errors="coerce"
        )

    # Numerical columns
    numerical_columns = [
        "planned_duration_hours",
        "actual_duration_hours",
        "overdue_days",
        "previous_priority",
        "workers_used"
    ]

    for column in numerical_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # Prevent impossible values
    for column in [
        "planned_duration_hours",
        "actual_duration_hours",
        "workers_used"
    ]:
        df.loc[df[column] < 0, column] = np.nan

    df.loc[
        df["overdue_days"] < 0,
        "overdue_days"
    ] = np.nan

    # Priority must be between 1 and 10
    df.loc[
        ~df["previous_priority"].between(1, 10),
        "previous_priority"
    ] = np.nan

    return df
def clean_assets(df):

    df = df.copy()

    df = df.drop_duplicates(subset=["asset_id"])

    text_columns = [
        "asset_id",
        "asset_type",
        "location",
        "point_a",
        "point_b",
        "corridor_id"
    ]

    for column in text_columns:
        df[column] = df[column].apply(clean_text)

    df["asset_criticality"] = df[
        "asset_criticality"
    ].apply(normalize_category)

    df["asset_condition"] = df[
        "asset_condition"
    ].apply(clean_text)

    # Numerical values
    numerical_columns = [
        "asset_age_years",
        "normal_daily_train_count",
        "total_failure_count"
    ]

    for column in numerical_columns:
        df[column] = pd.to_numeric(
            df[column],
            errors="coerce"
        )

    # Prevent impossible values
    for column in numerical_columns:
        df.loc[df[column] < 0, column] = np.nan

    df["last_failure_date"] = pd.to_datetime(
        df["last_failure_date"],
        errors="coerce"
    )

    return df
def validation_report(name, df):

    print(f"\n{'=' * 50}")
    print(f"{name} VALIDATION REPORT")
    print(f"{'=' * 50}")

    print(f"Rows          : {len(df)}")
    print(f"Columns       : {len(df.columns)}")

    print("\nMissing values:")

    missing = df.isnull().sum()

    missing = missing[missing > 0]

    if len(missing) == 0:
        print("No missing values found.")
    else:
        print(missing)

    print("\nDuplicate rows:", df.duplicated().sum())

if __name__ == "__main__":

    requests = pd.read_csv(
        "data/maintenance_requests.csv"
    )

    history = pd.read_csv(
        "data/maintenance_history.csv"
    )

    assets = pd.read_csv(
        "data/assets.csv"
    )

    print("\nRAW DATA")
    print("--------")

    print("Requests :", len(requests))
    print("History  :", len(history))
    print("Assets   :", len(assets))

    requests = clean_requests(requests)
    history = clean_history(history)
    assets = clean_assets(assets)

    validation_report(
        "MAINTENANCE REQUESTS",
        requests
    )

    validation_report(
        "MAINTENANCE HISTORY",
        history
    )

    validation_report(
        "ASSETS",
        assets
    )

    print("\nAROHA preprocessing completed successfully.")