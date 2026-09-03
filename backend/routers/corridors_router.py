from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from typing import List, Dict, Any
import io
import pandas as pd
from config import AppConfig
from backend.auth import get_current_user, require_admin, TokenData
from backend.services.csv_service import CSVService
from backend.services.excel_service import ExcelService
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/data/corridors", tags=["Corridors"])

@router.get("")
@router.get("/")
def get_corridors(current_user: TokenData = Depends(get_current_user)):
    return CSVService.read_csv(AppConfig.CORRIDOR_CSV)

@router.post("")
@router.post("/")
def save_corridors(data: List[Dict[str, Any]], current_user: TokenData = Depends(require_admin)):
    success, errors = CSVService.write_csv(AppConfig.CORRIDOR_CSV, data)
    if not success:
        raise HTTPException(status_code=400, detail={"message": "Validation failed", "errors": errors})
    AuditService.log_action(current_user.username, current_user.role, "UPDATE_CORRIDORS", dataset="corridor_data.csv", details=f"Saved {len(data)} corridors")
    return {"status": "SUCCESS", "message": f"Saved {len(data)} corridor records"}

@router.post("/import/csv")
async def import_corridors_csv(file: UploadFile = File(...), current_user: TokenData = Depends(require_admin)):
    try:
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))
        data = df.to_dict(orient="records")
        success, errors = CSVService.write_csv(AppConfig.CORRIDOR_CSV, data)
        if not success:
            raise HTTPException(status_code=400, detail={"message": "CSV Import validation failed", "errors": errors})
        AuditService.log_action(current_user.username, current_user.role, "IMPORT_CORRIDORS_CSV", dataset="corridor_data.csv", details=f"Imported {len(data)} corridor records")
        return {"status": "SUCCESS", "message": f"Imported {len(data)} corridor records from CSV"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse CSV file: {str(e)}")

@router.get("/export/csv")
def export_corridors_csv(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.CORRIDOR_CSV)
    df = pd.DataFrame(data)
    stream = io.StringIO()
    df.to_csv(stream, index=False)
    return Response(content=stream.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=corridor_data.csv"})

@router.get("/export/excel")
def export_corridors_excel(current_user: TokenData = Depends(get_current_user)):
    data = CSVService.read_csv(AppConfig.CORRIDOR_CSV)
    excel_bytes = ExcelService.export_to_excel(data, sheet_name="Corridors")
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=corridor_data.xlsx"})

@router.delete("/{corridor_id}/{track_id}")
def delete_corridor_track(corridor_id: str, track_id: str, current_user: TokenData = Depends(require_admin)):
    from backend.database import execute_statement
    import pandas as pd
    execute_statement("DELETE FROM corridor_data WHERE corridor_id = ? AND track_id = ?", (corridor_id, track_id))
    if AppConfig.CORRIDOR_CSV.exists():
        try:
            df = pd.read_csv(AppConfig.CORRIDOR_CSV)
            df = df[~((df['corridor_id'].astype(str) == str(corridor_id)) & (df['track_id'].astype(str) == str(track_id)))]
            df.to_csv(AppConfig.CORRIDOR_CSV, index=False)
        except Exception:
            pass
    AuditService.log_action(current_user.username, current_user.role, "DELETE_CORRIDOR", dataset="corridor_data.csv", details=f"Deleted corridor track {corridor_id}/{track_id}")
    return {"status": "SUCCESS", "message": f"Corridor track {corridor_id}/{track_id} deleted successfully"}

@router.delete("/{corridor_id}")
def delete_corridor(corridor_id: str, current_user: TokenData = Depends(require_admin)):
    CSVService.delete_record(AppConfig.CORRIDOR_CSV, "corridor_data", "corridor_id", corridor_id)
    AuditService.log_action(current_user.username, current_user.role, "DELETE_CORRIDOR", dataset="corridor_data.csv", details=f"Deleted corridor record {corridor_id}")
    return {"status": "SUCCESS", "message": f"Corridor {corridor_id} deleted successfully"}
