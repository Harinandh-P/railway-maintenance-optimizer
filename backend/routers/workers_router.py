from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any
import io
import pandas as pd
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService
from workersAvailability.sync import sync_workers_to_json

router = APIRouter(prefix="/api/data/workers", tags=["Workers"])

@router.get("/")
def get_workers(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.WORKER_DB_CSV)

@router.post("/")
def save_workers(data: List[Dict[str, Any]], current_user: TokenData = Depends(require_admin)):
    success, errors = CSVService.write_csv(AppConfig.WORKER_DB_CSV, data, dataset_type="workers")
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})
    
    # Auto-synchronize WorkerAvailability.json after CSV write
    sync_workers_to_json()

    AuditService.log_action(current_user.username, current_user.role, "UPDATE_WORKERS", dataset="worker_database.csv", details=f"Saved {len(data)} workers & synced WorkerAvailability.json")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} workers & updated WorkerAvailability.json"}

@router.post("/import/csv")
async def import_workers_csv(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.WORKER_DB_CSV, data, dataset_type="workers")
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        
        sync_workers_to_json()
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_WORKERS_CSV", dataset="worker_database.csv", details=f"Imported {len(data)} workers & synced WorkerAvailability.json")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} workers from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_workers_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.WORKER_DB_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=worker_database.csv"})

@router.get("/export/excel")
def export_workers_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.WORKER_DB_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Workers")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=worker_database.xlsx"})

@router.delete("/{worker_id}")
def delete_worker(worker_id: str, current_user: TokenData = Depends(require_admin)):
    CSVService.delete_record(AppConfig.WORKER_DB_CSV, "workers", "worker_id", worker_id)
    sync_workers_to_json()
    AuditService.log_action(current_user.username, current_user.role, "DELETE_WORKER", dataset="worker_database.csv", details=f"Deleted worker {worker_id}")
    return {"status": "SUCCESS", "message": f"Worker {worker_id} deleted successfully"}
