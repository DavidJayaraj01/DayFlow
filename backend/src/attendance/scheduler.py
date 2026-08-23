"""Nightly scheduler — marks absent employees who had no check-in and no leave."""

import logging
from datetime import date, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler

logger = logging.getLogger(__name__)


def start_scheduler() -> AsyncIOScheduler:
    """Start the nightly attendance marking scheduler."""
    scheduler = AsyncIOScheduler()

    scheduler.add_job(
        mark_absent_employees,
        "cron",
        hour=23,
        minute=59,
        id="nightly_absent_marker",
        replace_existing=True,
    )

    scheduler.start()
    logger.info("Nightly attendance scheduler started")
    return scheduler


async def mark_absent_employees():
    """Mark employees as absent if they have no check-in and no approved leave."""
    from src.core.database import AsyncSessionLocal
    from src.models.user import User, UserRole
    from src.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceSource
    from src.models.leave import LeaveRequest, LeaveStatus
    from sqlalchemy import select, and_

    logger.info("Running nightly absent-marking job...")
    yesterday = date.today() - timedelta(days=1)

    # Skip weekends
    if yesterday.weekday() >= 5:
        logger.info("Skipping weekend: %s", yesterday)
        return

    async with AsyncSessionLocal() as db:
        try:
            # Get all active employees
            result = await db.execute(
                select(User).where(User.is_active == True)
            )
            users = result.scalars().all()

            marked_count = 0
            for user in users:
                # Check if they already have an attendance record
                att_result = await db.execute(
                    select(AttendanceRecord).where(
                        AttendanceRecord.user_id == user.id,
                        AttendanceRecord.date == yesterday,
                    )
                )
                existing = att_result.scalar_one_or_none()

                if existing:
                    continue  # Already has a record (present or on_leave)

                # Check for approved leave covering this date
                leave_result = await db.execute(
                    select(LeaveRequest).where(
                        LeaveRequest.user_id == user.id,
                        LeaveRequest.status == LeaveStatus.approved,
                        LeaveRequest.start_date <= yesterday,
                        LeaveRequest.end_date >= yesterday,
                    )
                )
                leave = leave_result.scalar_one_or_none()

                if leave:
                    # Create on_leave attendance record
                    db.add(AttendanceRecord(
                        user_id=user.id,
                        date=yesterday,
                        status=AttendanceStatus.on_leave,
                        source=AttendanceSource.auto,
                    ))
                else:
                    # Mark as absent
                    db.add(AttendanceRecord(
                        user_id=user.id,
                        date=yesterday,
                        status=AttendanceStatus.absent,
                        source=AttendanceSource.auto,
                    ))
                    marked_count += 1

            await db.commit()
            logger.info("Marked %d employees as absent for %s", marked_count, yesterday)

        except Exception as e:
            await db.rollback()
            logger.error("Nightly job failed: %s", str(e))
            raise
