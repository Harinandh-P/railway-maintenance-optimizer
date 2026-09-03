from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any
import io
import pandas as pd
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/data/maintenance-history", tags=["Maintenance History"])

@router.get("/")
def get_maintenance_history(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.HISTORY_CSV)

@router.post("/")
def save_maintenance_history(data: List[Dict[str, Any]], current_user: TokenData = Depends(require_admin)):
    success, errors = CSVService.write_csv(AppConfig.HISTORY_CSV, data)
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})
    AuditService.log_action(current_user.username, current_user.role, "UPDATE_MAINTENANCE_HISTORY", dataset="maintenance_history.csv", details=f"Saved {len(data)} records")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} Maintenance History records"}

@router.post("/import/csv")
async def import_history_csv(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.HISTORY_CSV, data)
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_MAINTENANCE_HISTORY_CSV", dataset="maintenance_history.csv", details=f"Imported {len(data)} records")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} records from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_history_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.HISTORY_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=maintenance_history.csv"})

@router.get("/export/excel")
def export_history_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.HISTORY_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Maintenance History")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=maintenance_history.xlsx"})

@router.delete("/{task_id}")
def delete_maintenance_history(task_id: str, current_user: TokenData = Depends(require_admin)):
    CSVService.delete_record(AppConfig.HISTORY_CSV, "maintenance_history", "task_id", task_id)
    AuditService.log_action(current_user.username, current_user.role, "DELETE_MAINTENANCE_HISTORY", dataset="maintenance_history.csv", details=f"Deleted history task {task_id}")
    return {"status": "SUCCESS", "message": f"Task {task_id} deleted successfully"}
