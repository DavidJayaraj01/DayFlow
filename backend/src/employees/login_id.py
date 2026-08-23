"""Login ID generator — collision-safe, deterministic."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.login_id_counter import LoginIdCounter


async def generate_login_id(
    db: AsyncSession,
    company_name: str,
    first_name: str,
    last_name: str,
    joining_year: int,
    company_id: int,
) -> str:
    """Generate a deterministic Login ID.

    Format: CC + FF + LL + YYYY + NNNN
    - CC = first 2 chars of company name (uppercase)
    - FF = first 2 chars of first name (uppercase)
    - LL = first 2 chars of last name (uppercase)
    - YYYY = 4-digit year of joining
    - NNNN = 4-digit serial number (per-company-per-year)

    Uses SELECT ... FOR UPDATE on the counter row to prevent collisions.
    """
    # Extract prefix parts
    cc = company_name[:2].upper().ljust(2, "X")
    ff = first_name[:2].upper().ljust(2, "X")
    ll = last_name[:2].upper().ljust(2, "X")
    yyyy = str(joining_year)

    # Get or create counter row with row-level lock
    stmt = (
        select(LoginIdCounter)
        .where(
            LoginIdCounter.company_id == company_id,
            LoginIdCounter.year == joining_year,
        )
        .with_for_update()
    )
    result = await db.execute(stmt)
    counter = result.scalar_one_or_none()

    if counter is None:
        counter = LoginIdCounter(
            company_id=company_id,
            year=joining_year,
            current_serial=1,
        )
        db.add(counter)
        await db.flush()
        serial = 1
    else:
        counter.current_serial += 1
        serial = counter.current_serial
        await db.flush()

    nnnn = str(serial).zfill(4)
    return f"{cc}{ff}{ll}{yyyy}{nnnn}"
