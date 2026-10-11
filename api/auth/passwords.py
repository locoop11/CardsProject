"""Password hashing helpers (bcrypt). Never store plaintext passwords."""

from __future__ import annotations

import bcrypt

MIN_PASSWORD_LENGTH = 6


def hash_password(password: str) -> str:
    """Return a bcrypt hash string for storage."""
    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    """Return True if password matches the stored hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8"),
        )
    except (ValueError, TypeError):
        return False
