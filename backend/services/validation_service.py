from typing import List, Dict, Any, Tuple
import re
import pandas as pd

class ValidationService:

    @staticmethod
    def validate_maintenance_requests(df: pd.DataFrame) -> Tuple[bool, List[str]]:
        errors = []
        required_cols = [
            "request_id", "department", "asset_id", "corridor_id",
            "required_duration_hours", "required_workers", "due_date"
        ]
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"Missing required column in Maintenance Requests: '{col}'")

        if errors:
            return False, errors

        request_ids = set()
        for idx, row in df.iterrows():
            req_id = str(row.get("request_id", "")).strip()
            if not req_id:
                errors.append(f"Row {idx+1}: Empty request_id")
            elif req_id in request_ids:
                errors.append(f"Row {idx+1}: Duplicate request_id '{req_id}'")
            else:
                request_ids.add(req_id)

            try:
                dur = float(row.get("required_duration_hours", 0))
                if dur <= 0:
                    errors.append(f"Row {idx+1} ({req_id}): required_duration_hours must be > 0 (got {dur})")
            except ValueError:
                errors.append(f"Row {idx+1} ({req_id}): Invalid numeric value for required_duration_hours")

            try:
                workers = int(row.get("required_workers", 0))
                if workers < 1:
                    errors.append(f"Row {idx+1} ({req_id}): required_workers must be >= 1 (got {workers})")
            except ValueError:
                errors.append(f"Row {idx+1} ({req_id}): Invalid integer value for required_workers")

        return len(errors) == 0, errors

    @staticmethod
    def validate_train_master(df: pd.DataFrame) -> Tuple[bool, List[str]]:
        errors = []
        required_cols = ["train_id", "train_number", "train_type", "direction"]
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"Missing required column in Train Master: '{col}'")

        if errors:
            return False, errors

        train_ids = set()
        train_numbers = set()

        for idx, row in df.iterrows():
            t_id = str(row.get("train_id", "")).strip()
            t_num = str(row.get("train_number", "")).strip()

            if not t_id:
                errors.append(f"Row {idx+1}: Empty train_id")
            elif t_id in train_ids:
                errors.append(f"Row {idx+1}: Duplicate train_id '{t_id}'")
            else:
                train_ids.add(t_id)

            if not t_num:
                errors.append(f"Row {idx+1}: Empty train_number")
            elif t_num in train_numbers:
                errors.append(f"Row {idx+1}: Duplicate train_number '{t_num}'")
            else:
                train_numbers.add(t_num)

            dir_val = str(row.get("direction", "")).strip()
            if dir_val not in ["A-B", "B-A", "Both"]:
                errors.append(f"Row {idx+1} ({t_id}): Invalid direction '{dir_val}'. Must be A-B, B-A, or Both.")

        return len(errors) == 0, errors

    @staticmethod
    def validate_train_routes(df: pd.DataFrame, valid_train_ids: set = None) -> Tuple[bool, List[str]]:
        errors = []
        required_cols = ["train_id", "sequence", "station_code", "corridor_id"]
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"Missing required column in Train Routes: '{col}'")

        if errors:
            return False, errors

        seq_tracker = {}

        for idx, row in df.iterrows():
            t_id = str(row.get("train_id", "")).strip()
            seq_val = row.get("sequence")

            if valid_train_ids and t_id not in valid_train_ids:
                errors.append(f"Row {idx+1}: train_id '{t_id}' does not exist in Train Master")

            try:
                seq = int(seq_val)
                if seq < 1:
                    errors.append(f"Row {idx+1} ({t_id}): sequence must be >= 1 (got {seq})")
                
                if t_id not in seq_tracker:
                    seq_tracker[t_id] = set()
                if seq in seq_tracker[t_id]:
                    errors.append(f"Row {idx+1} ({t_id}): Duplicate sequence {seq}")
                else:
                    seq_tracker[t_id].add(seq)
            except (ValueError, TypeError):
                errors.append(f"Row {idx+1} ({t_id}): Invalid integer sequence value '{seq_val}'")

            arr = str(row.get("arrival_time", "")).strip()
            dep = str(row.get("departure_time", "")).strip()

            if arr and not re.match(r"^\d{1,2}:\d{2}$", arr):
                errors.append(f"Row {idx+1} ({t_id}): Invalid arrival_time format '{arr}' (expected HH:MM)")
            if dep and not re.match(r"^\d{1,2}:\d{2}$", dep):
                errors.append(f"Row {idx+1} ({t_id}): Invalid departure_time format '{dep}' (expected HH:MM)")

        return len(errors) == 0, errors

    @staticmethod
    def validate_workers(df: pd.DataFrame) -> Tuple[bool, List[str]]:
        errors = []
        required_cols = ["worker_id", "worker_name", "worker_type", "skill_level", "corridor"]
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"Missing required column in Workers: '{col}'")

        if errors:
            return False, errors

        worker_ids = set()
        for idx, row in df.iterrows():
            w_id = str(row.get("worker_id", "")).strip()
            if not w_id:
                errors.append(f"Row {idx+1}: Empty worker_id")
            elif w_id in worker_ids:
                errors.append(f"Row {idx+1}: Duplicate worker_id '{w_id}'")
            else:
                worker_ids.add(w_id)

            try:
                s_level = int(row.get("skill_level", 1))
                if s_level < 1 or s_level > 5:
                    errors.append(f"Row {idx+1} ({w_id}): skill_level must be between 1 and 5 (got {s_level})")
            except (ValueError, TypeError):
                errors.append(f"Row {idx+1} ({w_id}): Invalid skill_level value")

        return len(errors) == 0, errors

    @staticmethod
    def validate_equipment(df: pd.DataFrame) -> Tuple[bool, List[str]]:
        errors = []
        required_cols = ["equipment_id", "equipment_name", "equipment_type", "corridor", "available", "operational"]
        for col in required_cols:
            if col not in df.columns:
                errors.append(f"Missing required column in Equipment: '{col}'")

        if errors:
            return False, errors

        eq_ids = set()
        for idx, row in df.iterrows():
            eq_id = str(row.get("equipment_id", "")).strip()
            if not eq_id:
                errors.append(f"Row {idx+1}: Empty equipment_id")
            elif eq_id in eq_ids:
                errors.append(f"Row {idx+1}: Duplicate equipment_id '{eq_id}'")
            else:
                eq_ids.add(eq_id)

        return len(errors) == 0, errors
