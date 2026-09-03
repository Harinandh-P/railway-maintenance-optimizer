from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any
import io
import pandas as pd
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/data/equipment", tags=["Equipment"])

@router.get("/")
def get_equipment(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.EQUIPMENT_DB_CSV)

@router.post("/")
def save_equipment(data: List[Dict[str, Any]], current_user: TokenData = Depends(require_admin)):
    success, errors = CSVService.write_csv(AppConfig.EQUIPMENT_DB_CSV, data, dataset_type="equipment")
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})

    AuditService.log_action(current_user.username, current_user.role, "UPDATE_EQUIPMENT", dataset="equipment_database.csv", details=f"Saved {len(data)} equipment items")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} equipment items"}

@router.post("/import/csv")
async def import_equipment_csv(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.EQUIPMENT_DB_CSV, data, dataset_type="equipment")
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_EQUIPMENT_CSV", dataset="equipment_database.csv", details=f"Imported {len(data)} equipment items")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} equipment items from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_equipment_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.EQUIPMENT_DB_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=equipment_database.csv"})

@router.get("/export/excel")
def export_equipment_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.EQUIPMENT_DB_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Equipment")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=equipment_database.xlsx"})

@router.delete("/{equipment_id}")
def delete_equipment(equipment_id: str, current_user: TokenData = Depends(require_admin)):
    CSVService.delete_record(AppConfig.EQUIPMENT_DB_CSV, "equipment", "equipment_id", equipment_id)
    AuditService.log_action(current_user.username, current_user.role, "DELETE_EQUIPMENT", dataset="equipment_database.csv", details=f"Deleted equipment {equipment_id}")
    return {"status": "SUCCESS", "message": f"Equipment {equipment_id} deleted successfully"}
