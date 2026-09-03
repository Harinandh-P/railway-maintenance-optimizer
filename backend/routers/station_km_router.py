from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any
import io
import pandas as pd
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/data/station-km", tags=["Station KM Mapping"])

@router.get("/")
def get_station_km(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.STATION_KM_CSV)

@router.post("/")
def save_station_km(data: List[Dict[str, Any]], current_user: TokenData = Depends(require_admin)):
    success, errors = CSVService.write_csv(AppConfig.STATION_KM_CSV, data)
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})

    AuditService.log_action(current_user.username, current_user.role, "UPDATE_STATION_KM", dataset="station_km_mapping.csv", details=f"Saved {len(data)} section mappings")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} Station/KM section mappings"}

@router.post("/import/csv")
async def import_station_km_csv(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.STATION_KM_CSV, data)
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_STATION_KM_CSV", dataset="station_km_mapping.csv", details=f"Imported {len(data)} section mappings")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} section mappings from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_station_km_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.STATION_KM_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=station_km_mapping.csv"})

@router.get("/export/excel")
def export_station_km_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.STATION_KM_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Station KM Mapping")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=station_km_mapping.xlsx"})

@router.delete("/{mapping_id}")
def delete_station_km(mapping_id: str, current_user: TokenData = Depends(require_admin)):
    CSVService.delete_record(AppConfig.STATION_KM_CSV, "station_km_mapping", "mapping_id", mapping_id)
    AuditService.log_action(current_user.username, current_user.role, "DELETE_STATION_KM", dataset="station_km_mapping.csv", details=f"Deleted station mapping {mapping_id}")
    return {"status": "SUCCESS", "message": f"Mapping {mapping_id} deleted successfully"}
