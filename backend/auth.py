from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import hashlib
import secrets
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel
from config import AppConfig

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

class TokenData(BaseModel):
    username: str
    role: str
    department: Optional[str] = "ALL"

def generate_salt() -> str:
    return secrets.token_hex(16)

def hash_password(password: str, salt: Optional[str] = None) -> str:
    use_salt = salt if salt else "legacy_salt_default"
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), use_salt.encode("utf-8"), 100000).hex()

def verify_password(plain_password: str, user_record: Dict[str, Any]) -> bool:
    if not user_record or not isinstance(user_record, dict):
        return False

    stored_hash = str(user_record.get("password_hash", ""))
    stored_salt = user_record.get("salt")
    username = str(user_record.get("username", ""))

    if stored_salt and str(stored_salt).strip():
        computed_hash = hash_password(plain_password, str(stored_salt).strip())
        return computed_hash == stored_hash
    else:
        # Legacy fallback verification + automatic inline migration to per-user salt
        legacy_hash = hash_password(plain_password, "legacy_salt_default")
        if legacy_hash == stored_hash:
            new_salt = generate_salt()
            new_hash = hash_password(plain_password, new_salt)
            try:
                from backend.database import execute_statement
                execute_statement(
                    "UPDATE users SET password_hash = ?, salt = ? WHERE username = ?",
                    (new_hash, new_salt, username)
                )
                print(f"[AUTH SECURITY] Upgraded user '{username}' to per-user random cryptographic salt.")
            except Exception as e:
                print(f"[AUTH MIGRATION NOTICE] Failed to store upgraded salt: {e}")
            return True
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=AppConfig.TOKEN_EXPIRE_MIN))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, AppConfig.SECRET_KEY, algorithm=AppConfig.ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, AppConfig.SECRET_KEY, algorithms=[AppConfig.ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        department: str = payload.get("department", "ALL")
        if username is None or role is None:
            raise credentials_exception
        return TokenData(username=username, role=role, department=department)
    except JWTError:
        raise credentials_exception

def require_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ADMIN privileges required for this action. Operators cannot execute optimization or modify master data."
        )
    return current_user

def require_operator_or_admin(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    if current_user.role not in ["ADMIN", "OPERATOR"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="OPERATOR or ADMIN privileges required"
        )
    return current_user
