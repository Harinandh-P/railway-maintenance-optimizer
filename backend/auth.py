from datetime import datetime, timedelta
from typing import Optional
import hashlib
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

def hash_password(password: str) -> str:
    salt = "railway_salt_2026"
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

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
