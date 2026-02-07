# auth_utils.py
import hashlib
from hashlib import pbkdf2_hmac
from fastapi import HTTPException

def validate_nust_email(email: str) -> str:
    email = email.lower().strip()
    if not email.endswith("@student.nust.edu.pk"):
        raise HTTPException(
            status_code=400,
            detail="Only @student.nust.edu.pk emails are allowed"
        )
    return email

def derive_pubkey_hash(email: str, password: str) -> str:
    email = validate_nust_email(email)
    salt = f"nust|{email}".encode()

    seed = pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        310_000
    )
    return hashlib.sha256(seed).hexdigest()
