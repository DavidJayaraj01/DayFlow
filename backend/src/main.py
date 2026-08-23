"""Dayflow HRMS — FastAPI Application Entry Point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from src.core.config import settings

logging.basicConfig(
    level=logging.INFO if settings.is_dev else logging.WARNING,
    format="%(asctime)s %(levelname)-8s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Starting Dayflow HRMS API...")

    # Auto-create tables if not existing
    from src.core.database import engine, Base
    import src.models.company
    import src.models.user
    import src.models.employee
    import src.models.salary
    import src.models.attendance
    import src.models.leave
    import src.models.audit
    import src.models.login_id_counter

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start the nightly attendance scheduler
    from src.attendance.scheduler import start_scheduler
    scheduler = start_scheduler()

    yield

    # Shutdown
    if scheduler and scheduler.running:
        scheduler.shutdown()
    logger.info("Dayflow HRMS API shut down.")


app = FastAPI(
    title="Dayflow HRMS API",
    description="Every workday, perfectly aligned.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
import os
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
from src.auth.router import router as auth_router
from src.employees.router import router as employees_router
from src.profile.router import router as profile_router
from src.salary.router import router as salary_router
from src.attendance.router import router as attendance_router
from src.leave.router import router as leave_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(employees_router, prefix="/api/v1/employees", tags=["Employees"])
app.include_router(profile_router, prefix="/api/v1/employees", tags=["Profile"])
app.include_router(salary_router, prefix="/api/v1/employees", tags=["Salary"])
app.include_router(attendance_router, prefix="/api/v1/attendance", tags=["Attendance"])
app.include_router(leave_router, prefix="/api/v1/leave", tags=["Leave"])


@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy", "app": settings.APP_NAME}
