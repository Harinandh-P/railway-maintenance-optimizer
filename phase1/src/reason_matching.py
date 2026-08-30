import pandas as pd
import re
import json
from datetime import datetime


# ============================================================
# REASON CATEGORIES
# ============================================================

REASON_CATEGORIES = {
    "fatigue": "Mechanical_Fatigue",
    "cyclic fatigue": "Mechanical_Fatigue",

    "wear": "Mechanical_Wear",
    "normal wear": "Mechanical_Wear",
    "mechanical wear": "Mechanical_Wear",

    "impact": "Mechanical_Impact",
    "vehicle impact": "Mechanical_Impact",

    "aging": "Aging",
    "component aging": "Aging",

    "electrical fault": "Electrical_Fault",
    "short circuit": "Electrical_Fault",
    "insulation failure": "Electrical_Fault",

    "corrosion": "Environmental_Corrosion",
    "water ingress": "Environmental_Water",

    "lightning": "Weather_Lightning",
    "heavy rain": "Weather_Rain",
    "storm": "Weather_Storm",

    "installation error": "Human_Error",
    "maintenance error": "Human_Error"
}


# ============================================================
# TEXT NORMALIZATION
# ============================================================

def normalize_text(text):

    if pd.isna(text):
        return ""

    text = str(text).lower().strip()

    # Remove unnecessary punctuation
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    # Remove repeated spaces
    text = re.sub(r"\s+", " ", text)

    return text


# ============================================================
# REASON CLASSIFICATION
# ============================================================

def classify_reason(reason):

    normalized = normalize_text(reason)

    if not normalized:
        return "Unknown"

    # Exact dictionary match
    if normalized in REASON_CATEGORIES:
        return REASON_CATEGORIES[normalized]

    # Mechanical causes
    if "fatigue" in normalized:
        return "Mechanical_Fatigue"

    if "wear" in normalized:
        return "Mechanical_Wear"

    if "impact" in normalized:
        return "Mechanical_Impact"

    # Aging
    if "aging" in normalized:
        return "Aging"

    # Electrical causes
    if (
        "electrical" in normalized
        or "short circuit" in normalized
        or "insulation" in normalized
    ):
        return "Electrical_Fault"

    # Environmental causes
    if "corrosion" in normalized:
        return "Environmental_Corrosion"

    if "water" in normalized or "moisture" in normalized:
        return "Environmental_Water"

    # Weather causes
    if "lightning" in normalized:
        return "Weather_Lightning"

    if "rain" in normalized or "rainfall" in normalized:
        return "Weather_Rain"

    if "storm" in normalized:
        return "Weather_Storm"

    # Human-related causes
    if (
        "installation error" in normalized
        or "installation mistake" in normalized
        or "maintenance error" in normalized
    ):
        return "Human_Error"

    return "Unknown"


# ============================================================
# REASON COMPARISON
# ============================================================

def compare_reasons(current_reason, historical_reason):

    current_category = classify_reason(current_reason)
    historical_category = classify_reason(historical_reason)

    # Both reasons are unknown
    if (
        current_category == "Unknown"
        and historical_category == "Unknown"
    ):
        return {
            "score": None,
            "match": "Unknown",
            "current_category": current_category,
            "historical_category": historical_category
        }

    # Current reason is unknown
    if current_category == "Unknown":
        return {
            "score": None,
            "match": "Unknown_Current",
            "current_category": current_category,
            "historical_category": historical_category
        }

    # Historical reason is unknown
    if historical_category == "Unknown":
        return {
            "score": None,
            "match": "Unknown_Historical",
            "current_category": current_category,
            "historical_category": historical_category
        }

    # Same category
    if current_category == historical_category:
        return {
            "score": 1.0,
            "match": "Strong",
            "current_category": current_category,
            "historical_category": historical_category
        }

    # Different categories
    return {
        "score": 0.0,
        "match": "Different",
        "current_category": current_category,
        "historical_category": historical_category
    }


# ============================================================
# DEFECT COMPARISON
# ============================================================

def compare_defects(current_defect, historical_defect):

    current = normalize_text(current_defect)
    historical = normalize_text(historical_defect)

    # Missing defect information
    if not current and not historical:
        return {
            "score": None,
            "match": "Unknown"
        }

    if not current:
        return {
            "score": None,
            "match": "Unknown_Current"
        }

    if not historical:
        return {
            "score": None,
            "match": "Unknown_Historical"
        }

    # Exact defect match
    if current == historical:
        return {
            "score": 1.0,
            "match": "Exact"
        }

    # Related crack / fracture terminology
    if (
        ("crack" in current and "fracture" in historical)
        or
        ("fracture" in current and "crack" in historical)
    ):
        return {
            "score": 0.8,
            "match": "Related"
        }

    # Related wear / degradation terminology
    if (
        ("wear" in current and "degradation" in historical)
        or
        ("degradation" in current and "wear" in historical)
    ):
        return {
            "score": 0.7,
            "match": "Related"
        }

    # Known defects but no established relationship
    return {
        "score": 0.0,
        "match": "Different"
    }


# ============================================================
# ASSET COMPARISON
# ============================================================

def compare_assets(current_asset, historical_asset):

    current = normalize_text(current_asset)
    historical = normalize_text(historical_asset)

    # Both missing
    if not current and not historical:
        return {
            "score": None,
            "match": "Unknown"
        }

    # Current asset missing
    if not current:
        return {
            "score": None,
            "match": "Unknown_Current"
        }

    # Historical asset missing
    if not historical:
        return {
            "score": None,
            "match": "Unknown_Historical"
        }

    # Same asset
    if current == historical:
        return {
            "score": 1.0,
            "match": "Same_Asset"
        }

    # Different assets
    return {
        "score": 0.0,
        "match": "Different_Asset"
    }


# ============================================================
# HISTORICAL MATCH ENGINE
# ============================================================

def historical_match_engine(
    current_request,
    historical_record
):

    reason_result = compare_reasons(
        current_request.get("reason"),
        historical_record.get("reason")
    )

    defect_result = compare_defects(
        current_request.get("defect"),
        historical_record.get("defect")
    )

    asset_result = compare_assets(
        current_request.get("asset_id"),
        historical_record.get("asset_id")
    )

    # Comparison weights
    ASSET_WEIGHT = 0.40
    DEFECT_WEIGHT = 0.35
    REASON_WEIGHT = 0.25

    scores = []
    weighted_scores = []
    evidence = []

    # Asset evidence
    if asset_result["score"] is not None:

        scores.append(ASSET_WEIGHT)

        weighted_scores.append(
            asset_result["score"] * ASSET_WEIGHT
        )

        evidence.append(
            f"Asset: {asset_result['match']}"
        )

    # Defect evidence
    if defect_result["score"] is not None:

        scores.append(DEFECT_WEIGHT)

        weighted_scores.append(
            defect_result["score"] * DEFECT_WEIGHT
        )

        evidence.append(
            f"Defect: {defect_result['match']}"
        )

    # Reason evidence
    if reason_result["score"] is not None:

        scores.append(REASON_WEIGHT)

        weighted_scores.append(
            reason_result["score"] * REASON_WEIGHT
        )

        evidence.append(
            f"Reason: {reason_result['match']}"
        )

    # No usable information
    if not scores:

        return {
            "score": None,
            "match": "No_Evidence",
            "evidence": evidence
        }

    # Normalize based on available evidence
    final_score = (
        sum(weighted_scores) /
        sum(scores)
    )

    # Overall classification
    if final_score >= 0.80:
        match = "Strong"

    elif final_score >= 0.50:
        match = "Moderate"

    elif final_score > 0:
        match = "Weak"

    else:
        match = "Different"

    return {
        "score": round(final_score, 3),
        "match": match,
        "evidence": evidence,
        "reason_match": reason_result,
        "defect_match": defect_result,
        "asset_match": asset_result
    }


# ============================================================
# RANK HISTORICAL RECORDS
# ============================================================

def rank_historical_records(
    current_request,
    historical_records
):

    ranked_records = []

    for record in historical_records:

        result = historical_match_engine(
            current_request,
            record
        )

        ranked_records.append({

            "task_id":
                record.get("task_id"),

            "asset_id":
                record.get("asset_id"),

            "defect":
                record.get("defect"),

            "reason":
                record.get("reason"),

            # Historical planning features
            "actual_duration":
                record.get("actual_duration"),

            "required_workers":
                record.get("workers_used"),

            "previous_failure":
                record.get("previous_failure"),

            "maintenance_frequency":
                record.get("maintenance_frequency"),

            "previous_priority":
                record.get("previous_priority"),

            "operational_impact":
                record.get("operational_impact"),

            # Matching results
            "score":
                result["score"],

            "match":
                result["match"],

            "evidence":
                result["evidence"]
        })

    # Highest matching records first
    ranked_records.sort(
        key=lambda x: (
            x["score"] is not None,
            x["score"]
            if x["score"] is not None
            else -1
        ),
        reverse=True
    )

    return ranked_records


# ============================================================
# ESTIMATE DURATION
# ============================================================

def estimate_duration(ranked_records):

    RELEVANCE_THRESHOLD = 0.50

    durations = []
    weights = []

    for record in ranked_records:

        score = record.get("score")

        if (
            score is None
            or score < RELEVANCE_THRESHOLD
        ):
            continue

        actual_duration = record.get(
            "actual_duration"
        )

        if actual_duration is None:
            continue

        try:
            actual_duration = float(
                actual_duration
            )

        except (ValueError, TypeError):
            continue

        if actual_duration <= 0:
            continue

        durations.append(
            actual_duration
        )

        weights.append(
            score
        )

    if not durations:

        return {
            "estimated_duration": None,
            "method": "No_Historical_Data",
            "records_used": 0
        }

    weighted_duration = sum(
        duration * weight
        for duration, weight
        in zip(durations, weights)
    ) / sum(weights)

    return {

        "estimated_duration":
            round(weighted_duration, 2),

        "method":
            "Weighted_Historical_Average",

        "records_used":
            len(durations)
    }


# ============================================================
# ESTIMATE WORKERS
# ============================================================

def estimate_workers(ranked_records):

    RELEVANCE_THRESHOLD = 0.50

    workers = []
    weights = []

    for record in ranked_records:

        score = record.get("score")

        if (
            score is None
            or score < RELEVANCE_THRESHOLD
        ):
            continue

        workers_used = record.get(
            "required_workers"
        )

        if workers_used is None:
            continue

        try:
            workers_used = float(
                workers_used
            )

        except (ValueError, TypeError):
            continue

        if workers_used <= 0:
            continue

        workers.append(
            workers_used
        )

        weights.append(
            score
        )

    if not workers:

        return {
            "estimated_workers": None,
            "method": "No_Historical_Data",
            "records_used": 0
        }

    weighted_workers = sum(
        worker * weight
        for worker, weight
        in zip(workers, weights)
    ) / sum(weights)

    estimated_workers = max(
        1,
        round(weighted_workers)
    )

    return {

        "estimated_workers":
            estimated_workers,

        "method":
            "Weighted_Historical_Average",

        "records_used":
            len(workers)
    }


# ============================================================
# BUILD MAINTENANCE REQUIREMENT
# ============================================================

def build_maintenance_requirement(
    current_request,
    current_request_risk,
    priority_result,
    duration_result,
    worker_result,
    asset_risk,
    historical_features
):

    return {

        "request_id":
            current_request.get("request_id"),

        "asset_id":
            current_request.get("asset_id"),

        "defect":
            current_request.get("defect"),

        "reason":
            current_request.get("reason"),

        "priority_score":
            priority_result.get("priority_score"),

        "priority_level":
            priority_result.get("priority_level"),

        "required_duration":
            duration_result.get(
                "estimated_duration"
            ),

        "required_workers":
            worker_result.get(
                "estimated_workers"
            ),

        "current_request_risk_score":
            current_request_risk.get(
                "current_request_risk_score"
            ),

        "asset_risk_score":
            asset_risk.get(
                "asset_risk_score"
            ),

        "asset_risk_level":
            asset_risk.get(
                "risk_level"
            ),

        "historical_failure_frequency":
            historical_features.get(
                "failure_frequency"
            ),

        "historical_operational_impact":
            historical_features.get(
                "operational_impact"
            ),

        "historical_records_used":
            historical_features.get(
                "relevant_record_count"
            ),

        "required_equipment":
            current_request.get(
                "required_equipment"
            ),

        "overdue_days":
            current_request.get(
                "overdue_days"
            )
    }


# ============================================================
# EXTRACT HISTORICAL FEATURES
# ============================================================

def extract_historical_features(
    ranked_records,
    historical_records
):

    RELEVANCE_THRESHOLD = 0.50

    relevant_task_ids = {

        record["task_id"]

        for record in ranked_records

        if (
            record["score"] is not None
            and record["score"]
            >= RELEVANCE_THRESHOLD
        )
    }

    relevant_records = [

        record

        for record in historical_records

        if record.get("task_id")
        in relevant_task_ids
    ]

    if not relevant_records:

        return {

            "relevant_record_count": 0,

            "failure_count": 0,

            "failure_frequency": None,

            "average_duration": None,

            "average_previous_priority": None,

            "average_maintenance_frequency": None,

            "operational_impact": "Unknown"
        }

    # --------------------------------------------------------
    # PREVIOUS FAILURES
    # --------------------------------------------------------

    failure_values = [

        record.get("previous_failure")

        for record in relevant_records

        if record.get(
            "previous_failure"
        ) is not None
    ]

    failure_count = sum(

        1

        for value in failure_values

        if value is True
    )

    if failure_values:

        failure_frequency = (
            failure_count /
            len(failure_values)
        )

    else:

        failure_frequency = None

    # --------------------------------------------------------
    # ACTUAL DURATION
    # --------------------------------------------------------

    duration_values = [

        record.get(
            "actual_duration"
        )

        for record in relevant_records

        if isinstance(
            record.get(
                "actual_duration"
            ),
            (int, float)
        )
    ]

    if duration_values:

        average_duration = (
            sum(duration_values) /
            len(duration_values)
        )

    else:

        average_duration = None

    # --------------------------------------------------------
    # PREVIOUS PRIORITY
    # --------------------------------------------------------

    priority_values = [

        record.get(
            "previous_priority"
        )

        for record in relevant_records

        if isinstance(
            record.get(
                "previous_priority"
            ),
            (int, float)
        )
    ]

    if priority_values:

        average_previous_priority = (
            sum(priority_values) /
            len(priority_values)
        )

    else:

        average_previous_priority = None

    # --------------------------------------------------------
    # MAINTENANCE FREQUENCY
    # --------------------------------------------------------

    frequency_values = [

        record.get(
            "maintenance_frequency"
        )

        for record in relevant_records

        if isinstance(
            record.get(
                "maintenance_frequency"
            ),
            (int, float)
        )
    ]

    if frequency_values:

        average_maintenance_frequency = (
            sum(frequency_values) /
            len(frequency_values)
        )

    else:

        average_maintenance_frequency = None

    # --------------------------------------------------------
    # OPERATIONAL IMPACT
    # --------------------------------------------------------

    impact_values = [

        record.get(
            "operational_impact"
        )

        for record in relevant_records

        if record.get(
            "operational_impact"
        )
    ]

    if impact_values:

        impact_order = {

            "Low": 1,

            "Medium": 2,

            "High": 3
        }

        highest_impact = max(

            impact_values,

            key=lambda x:
                impact_order.get(
                    x,
                    0
                )
        )

    else:

        highest_impact = "Unknown"

    return {

        "relevant_record_count":
            len(relevant_records),

        "failure_count":
            failure_count,

        "failure_frequency":
            round(
                failure_frequency,
                3
            )
            if failure_frequency is not None
            else None,

        "average_duration":
            round(
                average_duration,
                2
            )
            if average_duration is not None
            else None,

        "average_previous_priority":
            round(
                average_previous_priority,
                2
            )
            if average_previous_priority is not None
            else None,

        "average_maintenance_frequency":
            round(
                average_maintenance_frequency,
                2
            )
            if average_maintenance_frequency is not None
            else None,

        "operational_impact":
            highest_impact
    }


# ============================================================
# ASSET RISK
# ============================================================

def calculate_asset_risk(asset_data):

    criticality_map = {

        "Low": 0.30,

        "Medium": 0.60,

        "High": 1.00
    }

    condition_map = {

        "Good": 0.20,

        "Fair": 0.50,

        "Deteriorating": 0.80,

        "Degraded": 0.80,

        "Poor": 0.80,

        "Critical": 1.00
    }

    traffic_map = {

        "Low": 0.30,

        "Medium": 0.60,

        "High": 1.00
    }

    criticality = asset_data.get(
        "asset_criticality"
    )

    age = asset_data.get(
        "asset_age"
    )

    condition = asset_data.get(
        "asset_condition"
    )

    failure_history = asset_data.get(
        "failure_history"
    )

    traffic_importance = asset_data.get(
        "traffic_importance"
    )

    trains_per_day = asset_data.get(
        "trains_per_day"
    )

    criticality_score = (
        criticality_map.get(
            criticality,
            None
        )
    )

    condition_score = (
        condition_map.get(
            condition,
            None
        )
    )

    traffic_score = (
        traffic_map.get(
            traffic_importance,
            None
        )
    )

    # Failure history
    if isinstance(
        failure_history,
        (int, float)
    ):

        failure_score = min(
            failure_history / 10,
            1.0
        )

    else:

        failure_score = None

    # Traffic volume
    if isinstance(
        trains_per_day,
        (int, float)
    ):

        traffic_volume_score = min(
            trains_per_day / 100,
            1.0
        )

    else:

        traffic_volume_score = None

    # Age
    if isinstance(
        age,
        (int, float)
    ):

        age_score = min(
            age / 30,
            1.0
        )

    else:

        age_score = None

    scores = [

        criticality_score,

        age_score,

        condition_score,

        failure_score,

        traffic_score,

        traffic_volume_score
    ]

    valid_scores = [

        score

        for score in scores

        if score is not None
    ]

    if not valid_scores:

        return {

            "asset_risk_score": None,

            "risk_level": "Unknown"
        }

    asset_risk_score = (

        sum(valid_scores) /
        len(valid_scores)
    )

    if asset_risk_score >= 0.75:

        risk_level = "High"

    elif asset_risk_score >= 0.50:

        risk_level = "Medium"

    else:

        risk_level = "Low"

    return {

        "asset_risk_score":
            round(
                asset_risk_score,
                3
            ),

        "risk_level":
            risk_level,

        "criticality_score":
            criticality_score,

        "age_score":
            age_score,

        "condition_score":
            condition_score,

        "failure_history_score":
            failure_score,

        "traffic_importance_score":
            traffic_score,

        "traffic_volume_score":
            traffic_volume_score
    }


# ============================================================
# CURRENT REQUEST RISK
# ============================================================

def calculate_current_request_risk(
    current_request
):

    severity_map = {

        "Low": 0.25,

        "Medium": 0.50,

        "High": 0.75,

        "Critical": 1.00
    }

    safety_map = {

        "Low": 0.25,

        "Medium": 0.50,

        "High": 0.75,

        "Critical": 1.00
    }

    severity = current_request.get(
        "defect_severity"
    )

    safety_risk = current_request.get(
        "safety_risk"
    )

    overdue_days = current_request.get(
        "overdue_days"
    )

    severity_score = severity_map.get(
        severity,
        None
    )

    safety_score = safety_map.get(
        safety_risk,
        None
    )

    # Overdue risk
    if isinstance(
        overdue_days,
        (int, float)
    ):

        overdue_score = min(
            overdue_days / 10,
            1.0
        )

    else:

        overdue_score = None

    scores = [

        severity_score,

        safety_score,

        overdue_score
    ]

    valid_scores = [

        score

        for score in scores

        if score is not None
    ]

    if not valid_scores:

        return {

            "current_request_risk_score":
                None,

            "risk_level":
                "Unknown"
        }

    current_risk_score = (

        sum(valid_scores) /
        len(valid_scores)
    )

    if current_risk_score >= 0.75:

        risk_level = "High"

    elif current_risk_score >= 0.50:

        risk_level = "Medium"

    else:

        risk_level = "Low"

    return {

        "current_request_risk_score":
            round(
                current_risk_score,
                3
            ),

        "risk_level":
            risk_level,

        "severity_score":
            severity_score,

        "safety_score":
            safety_score,

        "overdue_score":
            overdue_score
    }


# ============================================================
# PRIORITY SCORE
# ============================================================

def calculate_priority_score(
    current_request_risk,
    asset_risk,
    historical_features
):

    CURRENT_WEIGHT = 0.30

    ASSET_WEIGHT = 0.25

    HISTORICAL_WEIGHT = 0.20

    OPERATIONAL_WEIGHT = 0.15

    PREVIOUS_PRIORITY_WEIGHT = 0.10

    # --------------------------------------------------------
    # CURRENT REQUEST RISK
    # --------------------------------------------------------

    current_score = (
        current_request_risk.get(
            "current_request_risk_score"
        )
    )

    # --------------------------------------------------------
    # ASSET RISK
    # --------------------------------------------------------

    asset_score = (
        asset_risk.get(
            "asset_risk_score"
        )
    )

    # --------------------------------------------------------
    # HISTORICAL FAILURE
    # --------------------------------------------------------

    historical_score = (
        historical_features.get(
            "failure_frequency"
        )
    )

    # --------------------------------------------------------
    # PREVIOUS PRIORITY
    # --------------------------------------------------------

    previous_priority = (
        historical_features.get(
            "average_previous_priority"
        )
    )

    if previous_priority is not None:

        previous_priority_score = (
            previous_priority / 10
        )

    else:

        previous_priority_score = None

    # --------------------------------------------------------
    # OPERATIONAL IMPACT
    # --------------------------------------------------------

    operational_impact = (
        historical_features.get(
            "operational_impact"
        )
    )

    operational_map = {

        "Low": 0.25,

        "Medium": 0.50,

        "High": 0.75,

        "Critical": 1.00
    }

    operational_score = (
        operational_map.get(
            operational_impact
        )
    )

    # --------------------------------------------------------
    # VALID COMPONENTS
    # --------------------------------------------------------

    components = []

    if current_score is not None:

        components.append(
            (
                current_score,
                CURRENT_WEIGHT
            )
        )

    if asset_score is not None:

        components.append(
            (
                asset_score,
                ASSET_WEIGHT
            )
        )

    if historical_score is not None:

        components.append(
            (
                historical_score,
                HISTORICAL_WEIGHT
            )
        )

    if operational_score is not None:

        components.append(
            (
                operational_score,
                OPERATIONAL_WEIGHT
            )
        )

    if previous_priority_score is not None:

        components.append(
            (
                previous_priority_score,
                PREVIOUS_PRIORITY_WEIGHT
            )
        )

    if not components:

        return {

            "priority_score":
                None,

            "priority_level":
                "Unknown"
        }

    total_weight = sum(

        weight

        for score, weight
        in components
    )

    weighted_score = sum(

        score * weight

        for score, weight
        in components
    )

    final_score = (

        weighted_score /
        total_weight
    )

    priority_score = round(
        final_score * 10,
        2
    )

    if priority_score >= 8.5:

        priority_level = "Critical"

    elif priority_score >= 7.0:

        priority_level = "High"

    elif priority_score >= 4.0:

        priority_level = "Medium"

    else:

        priority_level = "Low"

    explanation = generate_priority_explanation(

        current_score,

        asset_score,

        historical_score,

        previous_priority_score,

        operational_score
    )

    return {

        "priority_score":
            priority_score,

        "priority_level":
            priority_level,

        "normalized_score":
            round(
                final_score,
                3
            ),

        "current_risk_contribution":
            round(
                current_score *
                CURRENT_WEIGHT,
                3
            )
            if current_score is not None
            else None,

        "asset_risk_contribution":
            round(
                asset_score *
                ASSET_WEIGHT,
                3
            )
            if asset_score is not None
            else None,

        "historical_failure_contribution":
            round(
                historical_score *
                HISTORICAL_WEIGHT,
                3
            )
            if historical_score is not None
            else None,

        "operational_impact_contribution":
            round(
                operational_score *
                OPERATIONAL_WEIGHT,
                3
            )
            if operational_score is not None
            else None,

        "previous_priority_contribution":
            round(
                previous_priority_score *
                PREVIOUS_PRIORITY_WEIGHT,
                3
            )
            if previous_priority_score is not None
            else None,

        "explanation":
            explanation
    }


# ============================================================
# PRIORITY EXPLANATION
# ============================================================

def generate_priority_explanation(
    current_risk,
    asset_risk,
    historical_failure,
    previous_priority,
    operational_impact
):

    reasons = []

    # Current request risk
    if current_risk is not None:

        if current_risk >= 0.75:

            reasons.append(
                "Current maintenance request has HIGH risk"
            )

        elif current_risk >= 0.50:

            reasons.append(
                "Current maintenance request has MODERATE risk"
            )

        else:

            reasons.append(
                "Current maintenance request has LOW risk"
            )

    # Asset risk
    if asset_risk is not None:

        if asset_risk >= 0.75:

            reasons.append(
                "Affected asset has HIGH risk"
            )

        elif asset_risk >= 0.50:

            reasons.append(
                "Affected asset has MODERATE risk"
            )

        else:

            reasons.append(
                "Affected asset has LOW risk"
            )

    # Historical failure
    if historical_failure is not None:

        if historical_failure >= 0.75:

            reasons.append(
                "Similar historical tasks show HIGH failure frequency"
            )

        elif historical_failure >= 0.50:

            reasons.append(
                "Similar historical tasks show MODERATE failure frequency"
            )

        elif historical_failure > 0:

            reasons.append(
                "Similar historical tasks show LOW failure frequency"
            )

    else:

        reasons.append(
            "No relevant historical failure data available"
        )

    # Previous priority
    if previous_priority is not None:

        if previous_priority >= 0.75:

            reasons.append(
                "Similar historical tasks previously received HIGH priority"
            )

        elif previous_priority >= 0.50:

            reasons.append(
                "Similar historical tasks previously received MODERATE priority"
            )

        elif previous_priority > 0:

            reasons.append(
                "Similar historical tasks previously received LOW priority"
            )

    else:

        reasons.append(
            "No relevant historical priority data available"
        )

    # Operational impact
    if operational_impact is not None:

        if isinstance(
            operational_impact,
            (int, float)
        ):

            if operational_impact >= 0.75:

                reasons.append(
                    "Historical tasks show HIGH operational impact"
                )

            elif operational_impact >= 0.50:

                reasons.append(
                    "Historical tasks show MODERATE operational impact"
                )

            elif operational_impact > 0:

                reasons.append(
                    "Historical tasks show LOW operational impact"
                )

        else:

            impact = str(
                operational_impact
            ).lower()

            if impact == "high":

                reasons.append(
                    "Historical tasks show HIGH operational impact"
                )

            elif impact == "medium":

                reasons.append(
                    "Historical tasks show MODERATE operational impact"
                )

            elif impact == "low":

                reasons.append(
                    "Historical tasks show LOW operational impact"
                )

    else:

        reasons.append(
            "No relevant historical operational impact data available"
        )

    return reasons


# ============================================================
# PREPARE REAL CSV DATA
# ============================================================

def prepare_real_data():

    # --------------------------------------------------------
    # LOAD CSV FILES
    # --------------------------------------------------------

    requests_df = pd.read_csv(
        "data/maintenance_requests.csv"
    )

    history_df = pd.read_csv(
        "data/maintenance_history.csv"
    )

    assets_df = pd.read_csv(
        "data/assets.csv"
    )

    # --------------------------------------------------------
    # CONVERT HISTORICAL DATA
    # --------------------------------------------------------

    historical_records = []

    for _, row in history_df.iterrows():

        previous_failure = str(
            row.get(
                "previous_failure",
                ""
            )
        ).strip().lower() == "yes"

        historical_records.append({

            "task_id":
                row.get("task_id"),

            "asset_id":
                row.get("asset_id"),

            "defect":
                row.get("defect_type"),

            "reason":
                row.get("defect_reason"),

            "previous_failure":
                previous_failure,

            "actual_duration":
                row.get(
                    "actual_duration_hours"
                ),

            "workers_used":
                row.get(
                    "workers_used"
                ),

            "previous_priority":
                row.get(
                    "previous_priority"
                ),

            "operational_impact":
                row.get(
                    "train_operational_impact"
                ),

            # Calculate maintenance frequency
            "maintenance_frequency": (

                (
                    pd.to_datetime(
                        row.get(
                            "next_scheduled_maintenance"
                        )
                    )
                    -
                    pd.to_datetime(
                        row.get(
                            "maintenance_date"
                        )
                    )
                ).days

                if pd.notna(
                    row.get(
                        "maintenance_date"
                    )
                )

                and pd.notna(
                    row.get(
                        "next_scheduled_maintenance"
                    )
                )

                else None
            )
        })

    # --------------------------------------------------------
    # CONVERT ASSET DATA
    # --------------------------------------------------------

    asset_records = {}

    for _, row in assets_df.iterrows():

        asset_records[
            row.get("asset_id")
        ] = {

            "asset_id":
                row.get("asset_id"),

            "asset_criticality":
                row.get(
                    "asset_criticality"
                ),

            "asset_age":
                row.get(
                    "asset_age_years"
                ),

            "asset_condition":
                row.get(
                    "asset_condition"
                ),

            "failure_history":
                row.get(
                    "total_failure_count"
                ),

            "traffic_importance":
                row.get(
                    "traffic_importance"
                ),

            "trains_per_day":
                row.get(
                    "normal_daily_train_count"
                )
        }

    # --------------------------------------------------------
    # CONVERT CURRENT REQUESTS
    # --------------------------------------------------------

    current_requests = []

    today = datetime.now().date()

    for _, row in requests_df.iterrows():

        # Calculate overdue days
        try:

            due_date = pd.to_datetime(
                row.get("due_date")
            ).date()

            overdue_days = max(
                0,
                (
                    today -
                    due_date
                ).days
            )

        except Exception:

            overdue_days = None

        current_requests.append({

            "request_id":
                row.get(
                    "request_id"
                ),

            "asset_id":
                row.get(
                    "asset_id"
                ),

            "defect":
                row.get(
                    "defect_type"
                ),

            "reason":
                row.get(
                    "defect_reason"
                ),

            "defect_severity":
                row.get(
                    "defect_severity"
                ),

            "safety_risk":
                row.get(
                    "safety_risk"
                ),

            "overdue_days":
                overdue_days,

            "required_duration":
                row.get(
                    "required_duration_hours"
                ),

            "required_workers":
                row.get(
                    "required_workers"
                ),

            "required_equipment":
                row.get(
                    "required_equipment"
                )
        })

    return (
        current_requests,
        historical_records,
        asset_records
    )


# ============================================================
# MAIN PROGRAM
# ============================================================

if __name__ == "__main__":

    print("\n===================================")
    print("AROHA REAL CSV PIPELINE")
    print("===================================\n")

    # --------------------------------------------------------
    # LOAD REAL DATA
    # --------------------------------------------------------

    (
        current_requests,
        historical_records,
        asset_records
    ) = prepare_real_data()

    print(
        f"Maintenance requests loaded : "
        f"{len(current_requests)}"
    )

    print(
        f"Historical records loaded    : "
        f"{len(historical_records)}"
    )

    print(
        f"Assets loaded                : "
        f"{len(asset_records)}"
    )

    # ========================================================
    # IMPORTANT:
    # THIS LIST STORES THE FINAL RESULT OF EVERY REQUEST
    # ========================================================

    all_maintenance_requirements = []

    # --------------------------------------------------------
    # PROCESS EACH REQUEST
    # --------------------------------------------------------

    for current_request in current_requests:

        request_id = current_request.get(
            "request_id"
        )

        asset_id = current_request.get(
            "asset_id"
        )

        print("\n")
        print("===================================")
        print(
            f"AROHA REQUEST: {request_id}"
        )
        print("===================================\n")

        print(
            f"Asset       : {asset_id}"
        )

        print(
            f"Defect      : "
            f"{current_request.get('defect')}"
        )

        print(
            f"Reason      : "
            f"{current_request.get('reason')}"
        )

        print(
            f"Severity    : "
            f"{current_request.get('defect_severity')}"
        )

        print(
            f"Safety Risk : "
            f"{current_request.get('safety_risk')}"
        )

        print(
            f"Overdue     : "
            f"{current_request.get('overdue_days')} days"
        )

        # ====================================================
        # HISTORICAL MATCHING
        # ====================================================

        ranked_records = rank_historical_records(
            current_request,
            historical_records
        )

        print("\n-----------------------------------")
        print("HISTORICAL MATCHING")
        print("-----------------------------------\n")

        for record in ranked_records:

            if (
                record["score"] is not None
                and record["score"] > 0
            ):

                print(
                    f"Task: {record['task_id']:8} | "
                    f"Score: {record['score']:.3f} | "
                    f"Match: {record['match']}"
                )

                print(
                    f"    "
                    f"{' | '.join(record['evidence'])}"
                )

        # ====================================================
        # HISTORICAL FEATURES
        # ====================================================

        historical_features = (
            extract_historical_features(
                ranked_records,
                historical_records
            )
        )

        print("\n-----------------------------------")
        print("HISTORICAL FEATURES")
        print("-----------------------------------\n")

        for feature, value in (
            historical_features.items()
        ):

            print(
                f"{feature:35} → {value}"
            )

        # ====================================================
        # ASSET RISK
        # ====================================================

        asset_data = asset_records.get(
            asset_id
        )

        if asset_data is None:

            asset_risk = {

                "asset_risk_score":
                    None,

                "risk_level":
                    "Unknown"
            }

        else:

            asset_risk = calculate_asset_risk(
                asset_data
            )

        print("\n-----------------------------------")
        print("ASSET RISK")
        print("-----------------------------------\n")

        for feature, value in (
            asset_risk.items()
        ):

            print(
                f"{feature:35} → {value}"
            )

        # ====================================================
        # CURRENT REQUEST RISK
        # ====================================================

        current_request_risk = (
            calculate_current_request_risk(
                current_request
            )
        )

        print("\n-----------------------------------")
        print("CURRENT REQUEST RISK")
        print("-----------------------------------\n")

        for feature, value in (
            current_request_risk.items()
        ):

            print(
                f"{feature:35} → {value}"
            )

        # ====================================================
        # PRIORITY
        # ====================================================

        priority_result = calculate_priority_score(

            current_request_risk,

            asset_risk,

            historical_features
        )

        print("\n-----------------------------------")
        print("MAINTENANCE PRIORITY")
        print("-----------------------------------\n")

        for feature, value in (
            priority_result.items()
        ):

            print(
                f"{feature:40} → {value}"
            )

        # ====================================================
        # DURATION
        # ====================================================

        duration_result = estimate_duration(
            ranked_records
        )

        print("\n-----------------------------------")
        print("DURATION ESTIMATION")
        print("-----------------------------------\n")

        print(
            f"Estimated duration : "
            f"{duration_result['estimated_duration']} hours"
        )

        print(
            f"Method             : "
            f"{duration_result['method']}"
        )

        print(
            f"Records used       : "
            f"{duration_result['records_used']}"
        )

        # ====================================================
        # WORKERS
        # ====================================================

        worker_result = estimate_workers(
            ranked_records
        )

        print("\n-----------------------------------")
        print("WORKER REQUIREMENT")
        print("-----------------------------------\n")

        print(
            f"Estimated workers  : "
            f"{worker_result['estimated_workers']}"
        )

        print(
            f"Method             : "
            f"{worker_result['method']}"
        )

        print(
            f"Records used       : "
            f"{worker_result['records_used']}"
        )

        # ====================================================
        # FINAL MAINTENANCE REQUIREMENT
        # ====================================================

        maintenance_requirement = (
            build_maintenance_requirement(

                current_request,

                current_request_risk,

                priority_result,

                duration_result,

                worker_result,

                asset_risk,

                historical_features
            )
        )

        # ----------------------------------------------------
        # ADD RESULT TO MASTER LIST
        # ----------------------------------------------------

        all_maintenance_requirements.append(
            maintenance_requirement
        )

        print("\n-----------------------------------")
        print("FINAL MAINTENANCE REQUIREMENT")
        print("-----------------------------------\n")

        for feature, value in (
            maintenance_requirement.items()
        ):

            print(
                f"{feature:35} → {value}"
            )

        print("\n===================================")
        print(
            f"END REQUEST {request_id}"
        )
        print("===================================")

    # ========================================================
    # SAVE ALL REQUESTS TO JSON
    # ========================================================

    output_file = (
        "output/maintenance_requirements.json"
    )

    with open(
        output_file,
        "w",
        encoding="utf-8"
    ) as json_file:

        json.dump(
            all_maintenance_requirements,
            json_file,
            indent=4,
            default=str
        )

    # ========================================================
    # FINAL MESSAGE
    # ========================================================

    print("\n")
    print("===================================")
    print("JSON OUTPUT SAVED SUCCESSFULLY")
    print("===================================")

    print(
        f"File       : {output_file}"
    )

    print(
        f"Requests   : "
        f"{len(all_maintenance_requirements)}"
    )

    print("===================================\n")