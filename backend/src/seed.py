"""Seed script — creates demo data for Dayflow HRMS.

Creates: 1 company, 1 admin, 10 employees with realistic data.

Usage: python -m src.seed
"""

import asyncio
import random
from datetime import date, time, datetime, timedelta, timezone

from src.core.database import AsyncSessionLocal, engine, Base
from src.core.security import hash_password, generate_temp_password
from src.models.company import Company
from src.models.user import User, UserRole
from src.models.employee import EmployeeProfile, EmployeePrivateInfo, EmployeeSkill, EmployeeCertification
from src.models.salary import SalaryStructure, SalaryComponent, WageType, CompensationType, PercentageOf
from src.models.attendance import AttendanceRecord, AttendanceStatus, AttendanceSource
from src.models.leave import LeaveType, LeaveBalance, LeaveRequest, LeaveStatus
from src.models.login_id_counter import LoginIdCounter
from src.employees.login_id import generate_login_id


EMPLOYEES = [
    {"first": "Divya", "last": "Menon", "dept": "Engineering", "desig": "Senior Developer", "gender": "Female"},
    {"first": "Arjun", "last": "Patel", "dept": "Engineering", "desig": "Full Stack Developer", "gender": "Male"},
    {"first": "Sneha", "last": "Sharma", "dept": "Design", "desig": "UI/UX Designer", "gender": "Female"},
    {"first": "Rahul", "last": "Kumar", "dept": "Marketing", "desig": "Marketing Manager", "gender": "Male"},
    {"first": "Priya", "last": "Nair", "dept": "HR", "desig": "HR Officer", "gender": "Female"},
    {"first": "Vikram", "last": "Singh", "dept": "Engineering", "desig": "DevOps Engineer", "gender": "Male"},
    {"first": "Ananya", "last": "Gupta", "dept": "Finance", "desig": "Financial Analyst", "gender": "Female"},
    {"first": "Karthik", "last": "Reddy", "dept": "Engineering", "desig": "Backend Developer", "gender": "Male"},
    {"first": "Meera", "last": "Joshi", "dept": "Product", "desig": "Product Manager", "gender": "Female"},
    {"first": "Aditya", "last": "Verma", "dept": "Sales", "desig": "Sales Executive", "gender": "Male"},
]

SKILLS = [
    "Python", "JavaScript", "TypeScript", "React", "FastAPI", "PostgreSQL",
    "Docker", "AWS", "Figma", "SEO", "Data Analysis", "Project Management",
    "Node.js", "GraphQL", "Kubernetes", "CI/CD",
]


async def seed():
    """Seed the database with demo data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            # 1. Create company
            company = Company(name="Dayflow Inc", logo_url=None)
            db.add(company)
            await db.flush()
            print(f"[+] Created company: {company.name} (id={company.id})")

            # 2. Create default leave types
            leave_types = [
                LeaveType(company_id=company.id, name="Paid Time Off", default_annual_quota=24),
                LeaveType(company_id=company.id, name="Sick Leave", default_annual_quota=7),
                LeaveType(company_id=company.id, name="Unpaid Leave", default_annual_quota=0),
            ]
            db.add_all(leave_types)
            await db.flush()
            print("[+] Created leave types: Paid Time Off, Sick Leave, Unpaid Leave")

            # 3. Create admin
            admin = User(
                company_id=company.id,
                login_id="admin@dayflow.app",
                email="admin@dayflow.app",
                phone="+91-9876543210",
                password_hash=hash_password("Admin@123"),
                role=UserRole.admin,
                must_change_password=False,
                is_active=True,
            )
            db.add(admin)
            await db.flush()

            admin_profile = EmployeeProfile(
                user_id=admin.id,
                first_name="Admin",
                last_name="Dayflow",
                department="Management",
                designation="Administrator",
                date_of_joining=date(2024, 1, 1),
            )
            db.add(admin_profile)
            admin_private = EmployeePrivateInfo(
                user_id=admin.id,
                phone="+91-9876543210",
            )
            db.add(admin_private)
            print(f"[+] Created admin: admin@dayflow.app / Admin@123")

            # 4. Create 10 employees
            current_year = date.today().year
            employee_users = []

            for i, emp in enumerate(EMPLOYEES):
                doj = date(current_year, random.randint(1, 6), random.randint(1, 28))
                email = f"{emp['first'].lower()}.{emp['last'].lower()}@dayflow.app"

                login_id = await generate_login_id(
                    db, company.name, emp["first"], emp["last"], doj.year, company.id
                )

                user = User(
                    company_id=company.id,
                    login_id=login_id,
                    email=email,
                    phone=f"+91-98765{str(i).zfill(5)}",
                    password_hash=hash_password("Employee@123"),
                    role=UserRole.hr_officer if emp["first"] == "Priya" else UserRole.employee,
                    must_change_password=False,  # Pre-set for demo
                    is_active=True,
                )
                db.add(user)
                await db.flush()

                profile = EmployeeProfile(
                    user_id=user.id,
                    first_name=emp["first"],
                    last_name=emp["last"],
                    department=emp["dept"],
                    designation=emp["desig"],
                    manager_id=admin.id,
                    date_of_joining=doj,
                    about=f"Passionate {emp['desig']} with experience in {emp['dept']}.",
                    job_love_note=f"I love working on challenging {emp['dept'].lower()} problems!",
                    hobbies_note="Reading, hiking, and exploring new technologies.",
                )
                db.add(profile)

                private = EmployeePrivateInfo(
                    user_id=user.id,
                    date_of_birth=date(1990 + i, (i % 12) + 1, (i * 3 % 28) + 1),
                    home_address=f"{100 + i} Tech Park, Bangalore",
                    personal_email=f"{emp['first'].lower()}.personal@gmail.com",
                    gender=emp["gender"],
                    marital_status=random.choice(["Single", "Married"]),
                    blood_group=random.choice(["A+", "B+", "O+", "AB+"]),
                    phone=f"+91-98765{str(i).zfill(5)}",
                )
                db.add(private)

                # Skills
                num_skills = random.randint(2, 5)
                for skill in random.sample(SKILLS, num_skills):
                    db.add(EmployeeSkill(user_id=user.id, skill_name=skill))

                # Salary structure
                base_wage = random.choice([40000, 50000, 60000, 75000, 80000, 100000])
                salary = SalaryStructure(
                    user_id=user.id,
                    wage_type=WageType.monthly,
                    month_wage=base_wage,
                    yearly_wage=base_wage * 12,
                    working_days_per_week=5,
                    basic_hours=8.0,
                    pf_employee_pct=12.0,
                    pf_employer_pct=12.0,
                    professional_tax=200,
                    updated_by=admin.id,
                )
                db.add(salary)
                await db.flush()

                # Salary components
                basic = round(base_wage * 0.6, 2)
                components = [
                    SalaryComponent(salary_structure_id=salary.id, name="Basic Salary",
                                    compensation_type=CompensationType.percentage,
                                    percentage_of=PercentageOf.wage, amount=basic, percentage_value=60),
                    SalaryComponent(salary_structure_id=salary.id, name="House Rent Allowance",
                                    compensation_type=CompensationType.percentage,
                                    percentage_of=PercentageOf.basic, amount=round(basic * 0.5, 2), percentage_value=50),
                    SalaryComponent(salary_structure_id=salary.id, name="Standard Allowance",
                                    compensation_type=CompensationType.fixed,
                                    amount=round(base_wage * 0.1, 2)),
                    SalaryComponent(salary_structure_id=salary.id, name="Performance Bonus",
                                    compensation_type=CompensationType.percentage,
                                    percentage_of=PercentageOf.wage, amount=round(base_wage * 0.05, 2), percentage_value=5),
                ]
                db.add_all(components)

                # Leave balances
                for lt in leave_types:
                    used = random.randint(0, min(5, lt.default_annual_quota))
                    db.add(LeaveBalance(
                        user_id=user.id,
                        leave_type_id=lt.id,
                        year=current_year,
                        allocated=lt.default_annual_quota,
                        used=used,
                        remaining=lt.default_annual_quota - used,
                    ))

                employee_users.append(user)
                print(f"  [+] {emp['first']} {emp['last']} - {login_id} / Employee@123 ({email})")

            # 5. Attendance records (last 30 days)
            today = date.today()
            for user in employee_users:
                for day_offset in range(30, 0, -1):
                    d = today - timedelta(days=day_offset)
                    if d.weekday() >= 5:  # Skip weekends
                        continue

                    # 85% present, 10% leave, 5% absent
                    roll = random.random()
                    if roll < 0.85:
                        ci = time(8 + random.randint(0, 1), random.randint(0, 59))
                        co = time(17 + random.randint(0, 2), random.randint(0, 59))
                        wh = round((co.hour * 60 + co.minute - ci.hour * 60 - ci.minute) / 60, 2)
                        eh = round(max(0, wh - 8), 2)
                        db.add(AttendanceRecord(
                            user_id=user.id, date=d, check_in_time=ci, check_out_time=co,
                            work_hours=wh, extra_hours=eh,
                            status=AttendanceStatus.present, source=AttendanceSource.manual,
                        ))
                    elif roll < 0.95:
                        db.add(AttendanceRecord(
                            user_id=user.id, date=d,
                            status=AttendanceStatus.on_leave, source=AttendanceSource.auto,
                        ))
                    else:
                        db.add(AttendanceRecord(
                            user_id=user.id, date=d,
                            status=AttendanceStatus.absent, source=AttendanceSource.auto,
                        ))

            print("[+] Created attendance records (last 30 days)")

            # 6. Some leave requests
            for user in employee_users[:5]:
                lt = random.choice(leave_types[:2])  # Paid or Sick
                start = today + timedelta(days=random.randint(5, 20))
                end = start + timedelta(days=random.randint(1, 3))
                statuses = [LeaveStatus.pending, LeaveStatus.approved, LeaveStatus.rejected]
                status = random.choice(statuses)
                db.add(LeaveRequest(
                    user_id=user.id,
                    leave_type_id=lt.id,
                    start_date=start,
                    end_date=end,
                    total_days=(end - start).days + 1,
                    status=status,
                    reviewed_by=admin.id if status != LeaveStatus.pending else None,
                    review_comment="Approved. Enjoy your time off!" if status == LeaveStatus.approved else None,
                ))

            print("[+] Created sample leave requests")

            await db.commit()
            print("\n" + "=" * 50)
            print("[SUCCESS] Seed complete!")
            print("=" * 50)
            print("\nAdmin login: admin@dayflow.app / Admin@123")
            print("Employee login: <login_id> / Employee@123")
            print("(All employees have pre-set passwords for demo)")

        except Exception as e:
            await db.rollback()
            print(f"[ERROR] Seed failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(seed())
