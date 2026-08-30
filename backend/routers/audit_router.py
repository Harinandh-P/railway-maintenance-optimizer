from fastapi import APIRouter, Depends
from backend.auth import require_admin, TokenData
from backend.database import execute_query

router = APIRouter(prefix="/api/audit-log", tags=["Audit Log"])

@router.get("/")
def get_audit_log(current_user: TokenData = Depends(require_admin)):
    return execute_query("SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 100")
