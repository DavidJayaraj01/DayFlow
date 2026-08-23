"""Login ID counter model — collision-safe serial counter per company per year."""

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base


class LoginIdCounter(Base):
    __tablename__ = "login_id_counters"
    __table_args__ = (
        UniqueConstraint("company_id", "year", name="uq_login_counter_company_year"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    current_serial: Mapped[int] = mapped_column(Integer, default=0)

    company = relationship("Company", back_populates="login_id_counters")
