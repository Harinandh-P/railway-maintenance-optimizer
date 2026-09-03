from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any
import io
import pandas as pd
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/data/train-routes", tags=["Train Routes"])

@router.get("/")
def get_train_routes(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.TRAIN_ROUTES_CSV)

@router.post("/")
def save_train_routes(data: List[Dict[str, Any]], current_user: TokenData = Depends(require_admin)):
    train_master = CSVService.read_csv(AppConfig.TRAIN_MASTER_CSV)
    valid_ids = {str(t.get("train_id")) for t in train_master}

    from backend.services.validation_service import ValidationService
    df = pd.DataFrame(data)
    is_valid, errors = ValidationService.validate_train_routes(df, valid_ids)

    if not is_valid:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})

    success, write_errors = CSVService.write_csv(AppConfig.TRAIN_ROUTES_CSV, data)
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Save failed", "errors": write_errors})

    AuditService.log_action(current_user.username, current_user.role, "UPDATE_TRAIN_ROUTES", dataset="train_routes.csv", details=f"Saved {len(data)} route stops")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} Train Route stops"}

@router.post("/import/csv")
async def import_train_routes_csv(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.TRAIN_ROUTES_CSV, data)
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_TRAIN_ROUTES_CSV", dataset="train_routes.csv", details=f"Imported {len(data)} route stops")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} route stops from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_routes_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.TRAIN_ROUTES_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=train_routes.csv"})

@router.get("/export/excel")
def export_routes_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.TRAIN_ROUTES_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Train Routes")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=train_routes.xlsx"})

@router.delete("/{train_id}")
def delete_train_route(train_id: str, current_user: TokenData = Depends(require_admin)):
    CSVService.delete_record(AppConfig.TRAIN_ROUTES_CSV, "train_routes", "train_id", train_id)
    AuditService.log_action(current_user.username, current_user.role, "DELETE_TRAIN_ROUTE", dataset="train_routes.csv", details=f"Deleted train route for {train_id}")
    return {"status": "SUCCESS", "message": f"Train route {train_id} deleted successfully"}
