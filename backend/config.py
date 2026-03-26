import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import computed_field


class Settings(BaseSettings):
    # JWT
    SECRET_KEY: str = "temple-erp-super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # Database
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "matru_erp"
    DB_USER: str = "root"
    DB_PASSWORD: str = ""

    # File Upload
    UPLOAD_DIR: str = "E:/Works/matru-consturction/v2/backend/uploads"

    # App
    APP_NAME: str = "Matru Construction ERP"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        return (
            f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# ── Constants (not from .env — these are code-level enums) ────────────────────

# GST Rates
GST_RATES = {
    "5":  {"cgst": 2.5,  "sgst": 2.5,  "igst": 5.0},
    "12": {"cgst": 6.0,  "sgst": 6.0,  "igst": 12.0},
    "18": {"cgst": 9.0,  "sgst": 9.0,  "igst": 18.0},
    "28": {"cgst": 14.0, "sgst": 14.0, "igst": 28.0},
}


# User Roles
class Role:
    ADMIN                  = "admin"
    PROJECT_MANAGER        = "project_manager"
    STRUCTURAL_ENGINEER    = "structural_engineer"
    PRODUCTION_SUPERVISOR  = "production_supervisor"
    STORE_MANAGER          = "store_manager"
    ACCOUNTS_MANAGER       = "accounts_manager"
    SITE_SUPERVISOR        = "site_supervisor"
    CONTRACTOR             = "contractor"


ALL_ROLES: List[str] = [
    Role.ADMIN,
    Role.PROJECT_MANAGER,
    Role.STRUCTURAL_ENGINEER,
    Role.PRODUCTION_SUPERVISOR,
    Role.STORE_MANAGER,
    Role.ACCOUNTS_MANAGER,
    Role.SITE_SUPERVISOR,
    Role.CONTRACTOR,
]


# Stock Movement Types
class MovementType:
    INWARD       = "inward"
    OUTWARD      = "outward"
    TRANSFER     = "transfer"
    ADJUSTMENT   = "adjustment"
    JOB_WORK_OUT = "job_work_out"
    JOB_WORK_IN  = "job_work_in"
    SITE_DISPATCH = "site_dispatch"
    SPLIT        = "split"


# Valuation Methods
class ValuationMethod:
    FIFO         = "fifo"
    WEIGHTED_AVG = "weighted_avg"


# Manufacturing Stage Status
class StageStatus:
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"


# WIP Status
class WIPStatus:
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    ON_HOLD     = "on_hold"


# Payment Status
class PaymentStatus:
    PENDING  = "pending"
    PARTIAL  = "partial"
    PAID     = "paid"
    ON_HOLD  = "on_hold"


# Milestone Status
class MilestoneStatus:
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"


# Installation Status
class InstallationStatus:
    PENDING   = "pending"
    INSTALLED = "installed"
    VERIFIED  = "verified"


# Backward-compatible direct imports
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
UPLOAD_DIR = settings.UPLOAD_DIR
DATABASE_URL = settings.DATABASE_URL