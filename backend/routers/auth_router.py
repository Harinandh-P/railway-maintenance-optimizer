from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from config import AppConfig
from backend.auth import create_access_token, verify_password, hash_password, get_current_user, require_admin, TokenData
from backend.database import execute_query, execute_statement
from backend.services.audit_service import AuditService

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    username: str
    full_name: str
    role: str
    department: Optional[str] = "ALL"

class ChangeUsernameModel(BaseModel):
    current_username: str
    new_username: str
    passkey: str

class ChangePasswordModel(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

@router.post("/token")
async def login_for_access_token(
    request: Request,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None)
):
    username = None
    password = None

    if form_data and form_data.username:
        username = form_data.username
        password = form_data.password
    else:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                body = await request.json()
                username = body.get("username")
                password = body.get("password")
            except Exception:
                pass
        else:
            try:
                form = await request.form()
                username = form.get("username")
                password = form.get("password")
            except Exception:
                pass

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username and password are required."
        )

    users = execute_query("SELECT * FROM users WHERE username = ?", (username,))
    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = users[0]
    if not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_role = user["role"]
    user_dept = user.get("department") or "ALL"

    access_token = create_access_token(data={"sub": user["username"], "role": user_role, "department": user_dept})
    
    AuditService.log_action(user["username"], user_role, "USER_LOGIN", dataset="auth", details=f"User {user['username']} logged in successfully")

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user_role,
        "full_name": user["full_name"],
        "department": user_dept,
        "username": user["username"]
    }

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: TokenData = Depends(get_current_user)):
    users = execute_query("SELECT username, full_name, role, department FROM users WHERE username = ?", (current_user.username,))
    if not users:
        raise HTTPException(status_code=404, detail="User not found")
    
    u = users[0]
    return UserResponse(
        username=u["username"],
        full_name=u["full_name"],
        role=u["role"],
        department=u.get("department") or "ALL"
    )

@router.post("/change-username")
def change_admin_username(
    payload: ChangeUsernameModel,
    current_user: TokenData = Depends(require_admin)
):
    # Server-Side Passkey Validation (Never validated on frontend)
    if payload.passkey.strip() != AppConfig.ADMIN_PASSKEY.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid passkey.")

    new_uname = payload.new_username.strip()
    if not new_uname:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New username cannot be empty.")

    # Check duplicate username
    existing = execute_query("SELECT * FROM users WHERE username = ?", (new_uname,))
    if existing and new_uname != current_user.username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Username '{new_uname}' is already taken.")

    # Update database record
    execute_statement(
        "UPDATE users SET username = ? WHERE username = ?",
        (new_uname, current_user.username)
    )

    # Issue new access token for updated username
    access_token = create_access_token(data={"sub": new_uname, "role": current_user.role, "department": current_user.department})

    AuditService.log_action(
        current_user.username,
        current_user.role,
        "ADMIN_USERNAME_CHANGED",
        dataset="users",
        details=f"Admin username changed from {current_user.username} to {new_uname}"
    )

    return {
        "status": "SUCCESS",
        "message": f"Username updated to '{new_uname}' successfully.",
        "access_token": access_token,
        "new_username": new_uname
    }

@router.post("/change-password")
def change_admin_password(
    payload: ChangePasswordModel,
    current_user: TokenData = Depends(get_current_user)
):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password and confirmation password do not match.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be at least 6 characters long.")

    users = execute_query("SELECT * FROM users WHERE username = ?", (current_user.username,))
    if not users:
        raise HTTPException(status_code=404, detail="User account not found.")

    user = users[0]
    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect current password.")

    new_hash = hash_password(payload.new_password)
    execute_statement(
        "UPDATE users SET password_hash = ? WHERE username = ?",
        (new_hash, current_user.username)
    )

    AuditService.log_action(
        current_user.username,
        current_user.role,
        "ADMIN_PASSWORD_CHANGED",
        dataset="users",
        details=f"User {current_user.username} changed password successfully"
    )

    return {
        "status": "SUCCESS",
        "message": "Password changed successfully."
    }
