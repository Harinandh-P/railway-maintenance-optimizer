from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any, Optional
import io
import pandas as pd
from pydantic import BaseModel
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/data/maintenance-requests", tags=["Maintenance Requests"])

class CreateMaintenanceRequestModel(BaseModel):
    request_id: str
    request_datetime: str
    department: str
    asset_id: str
    asset_type: str
    location: str
    point_a: str
    point_b: str
    corridor_id: str
    maintenance_type: str
    defect_type: str
    defect_reason: str
    defect_severity: str
    safety_risk: str
    required_duration_hours: float
    required_workers: int
    required_equipment: str
    required_materials: Optional[str] = ""
    due_date: str

@router.get("/")
def get_maintenance_requests(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.REQUESTS_CSV)

@router.post("/")
def save_maintenance_requests(data: List[Dict[str, Any]], current_user: TokenData = Depends(get_current_user)):
    success, errors = CSVService.write_csv(AppConfig.REQUESTS_CSV, data, dataset_type="requests")
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})
    AuditService.log_action(current_user.username, current_user.role, "UPDATE_MAINTENANCE_REQUESTS", dataset="maintenance_requests.csv", details=f"Saved {len(data)} requests")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} Maintenance Requests"}

@router.post("/create")
def create_single_maintenance_request(payload: CreateMaintenanceRequestModel, current_user: TokenData = Depends(get_current_user)):
    existing = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    
    # Check duplicate ID
    if any(str(r.get("request_id")).strip() == payload.request_id.strip() for r in existing):
        raise HTTPException(status_code=400, detail=f"Request ID '{payload.request_id}' already exists.")

    new_record = payload.dict()
    if not new_record.get("created_by"):
        new_record["created_by"] = current_user.username
    if not new_record.get("department"):
        new_record["department"] = current_user.department or "Engineering"

    updated_list = existing + [new_record]

    success, errors = CSVService.write_csv(AppConfig.REQUESTS_CSV, updated_list, dataset_type="requests")
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})

    AuditService.log_action(current_user.username, current_user.role, "CREATE_MAINTENANCE_REQUEST", dataset="maintenance_requests.csv", details=f"Created request {payload.request_id}")
    return {"status": "SUCCESS", "message": f"Maintenance Request {payload.request_id} created successfully", "data": new_record}

@router.post("/import/csv")
async def import_requests_csv(file: UploadFile = File(...), current_user: TokenData = Depends(get_current_user)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.REQUESTS_CSV, data, dataset_type="requests")
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_MAINTENANCE_REQUESTS_CSV", dataset="maintenance_requests.csv", details=f"Imported {len(data)} requests")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} requests from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_requests_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=maintenance_requests.csv"})

@router.get("/export/excel")
def export_requests_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.REQUESTS_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Maintenance Requests")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=maintenance_requests.xlsx"})
