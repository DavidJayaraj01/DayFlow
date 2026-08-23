# Dayflow — Human Resource Management System (HRMS)

> *"Every workday, perfectly aligned."*

Dayflow is a modern, full-stack Human Resource Management System built with a **clean, editorial enterprise design system (Wonderly style: warm sand `#FAF5EE`, terracotta `#743A24`, and crisp white cards)**. It delivers company onboarding, administrative employee provisioning with deterministic Login IDs, real-time presence status tracking, salary structure auto-calculation with percentage cascades, daily & monthly attendance consoles, and approval-driven leave management.

---

## ✨ Core Features & Architectural Modules

### 1. 🏢 Company Onboarding & Authentication
- **Admin-First Onboarding**: Company signup registers the organization and initializes the root **Admin** account. There is no open public registration for employees.
- **Deterministic Login ID Generation**: Automatically generates collision-safe IDs using the pattern `CC + FF + LL + YYYY + NNNN` (e.g., `ORDIME20260001` for *Orbit Corp* + *Divya Menon* joined in 2026, employee index 0001).
- **Security & Forced Password Change**: Auto-generates temporary passwords for provisioned employees; the system requires a password reset on first login (`must_change_password: true`) before workspace access is granted.

### 2. 🟢 Real-Time Presence & Status Dots
- **Live Status Dots**:
  - 🟢 **Green (Present)**: Checked in or active in the office today.
  - 🟡 **Yellow (On Leave)**: On an approved time-off / leave day.
  - 🟠 **Orange (Absent)**: Unexcused absence / not checked in today.
- **Persistent Punch Actions**: Top navigation and dashboard controls with optimistic updates, live duration counters, and double-punch prevention.
- **Nightly Sync Job**: APScheduler runs every night at 11:59 PM to evaluate missing punches and automatically mark absent records for payroll integrity.

### 3. 💰 Reactive 2-Pass Cascading Salary Engine (Admin & HR Only)
- **Cascading Formula**:
  - **Pass 1 (Base & Wage Pct)**: Calculates fixed amounts and wage percentages (e.g., *Basic Salary* = 60% of ₹50,000 = ₹30,000).
  - **Pass 2 (Basic Pct)**: Calculates components derived from Basic (e.g., *HRA* = 50% of Basic = ₹15,000).
- **Validation Engine**: Real-time balance checker alerts and blocks saving if total components do not equal the monthly wage.
- **Role-Based Protection**: Strict 403 authorization gates; non-admin users cannot access or view compensation breakdown endpoints.

### 4. 📅 Attendance Console
- **Employee View**: Monthly breakdown showing check-in/out timestamps, daily work hours, overtime, and monthly payable days.
- **Admin View**: Daily organization-wide roster with date switcher, employee filter, and live punch compliance statistics.

### 5. 🌴 Time Off & Leave Management
- **Balance Cards**: Real-time counters for **Paid Time Off (24 days)**, **Sick Time Off (7 days)**, and **Unpaid Leave**.
- **Medical Proof Requirement**: Sick leave requests require a medical certificate document/image attachment before submission.
- **Approval Workflow**: Admin/HR review queue with one-click approve/reject actions, comment logging, and automatic attendance synchronization.
- **Quota Allocation Table**: Admin interface to adjust annual leave quotas per employee.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend Framework** | Python 3.11+, FastAPI (Async) | High-performance RESTful API endpoints with Pydantic v2 schemas |
| **Database & ORM** | PostgreSQL 16+ / SQLite (aiosqlite), SQLAlchemy 2.0 Async | 13 normalized relational tables with relationship back-populates |
| **Authentication** | JWT (OAuth2 Password Bearer), bcrypt (`passlib`) | Access & refresh tokens, password hashing, role-based dependencies |
| **Background Jobs** | APScheduler | Nightly 11:59 PM attendance sync and absence evaluation |
| **Frontend Framework** | React 19, TypeScript, Vite | Fast single-page application with type safety |
| **Design System** | Wonderly Warm Sand & Terracotta Theme (Tailwind CSS v4 + Standard CSS) | Clean editorial aesthetics with card layouts, zero container overlap |
| **State & Networking** | TanStack Query (React Query v5), Zustand, Axios | Server state caching, optimistic UI updates, auth store |
| **Icons & Alerts** | Lucide React, React Hot Toast | Modern icon library and interactive feedback alerts |

---

## 🚀 Getting Started

### Option A: Local Development (Fastest)

#### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python -m src.seed
python -m uvicorn src.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

### Option B: Docker Compose (Full Stack with PostgreSQL)

```bash
docker compose up --build
```
This starts:
- **PostgreSQL 16**: Port `5432`
- **FastAPI Backend**: `http://localhost:8000`
- **React Frontend**: `http://localhost:5173`

---

## 🔐 Default Demo Accounts

| Role | Email / Login ID | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@dayflow.app` | `Admin@123` | Full access to directory, provisioning, salary calc, leave approvals, & attendance |
| **HR Officer** | `priya.nair@dayflow.app` | `Employee@123` | Directory management, leave review, quota adjustments, and org attendance |
| **Employee** | `divya.menon@dayflow.app` | `Employee@123` | Self-service profile, punch console, leave balance & requests, monthly attendance |

---

## 🧪 Unit Tests

To run automated backend unit tests (including the 2-pass cascading salary calculation engine):
```bash
cd backend
pytest tests/ -v
```

---

## 📂 Project Architecture

```
Dayflow/
├── backend/
│   ├── src/
│   │   ├── attendance/       # Check-in, check-out, today status, nightly sync job
│   │   ├── auth/             # Company signup, user login, password reset, JWT
│   │   ├── core/             # Database connection, security tokens, config
│   │   ├── employees/        # Directory search, employee provisioning, picture upload
│   │   ├── leave/            # Leave types, balances, requests, quota allocation
│   │   ├── models/           # 13 SQLAlchemy 2.0 async models
│   │   ├── profile/          # Personal & private info updates with permission gates
│   │   ├── salary/           # 2-pass cascading formula engine & calculations
│   │   ├── seed.py           # Demo company, admin, 10 employees, and attendance seed
│   │   └── main.py           # FastAPI entrypoint, lifespan schema creation, CORS
│   └── tests/
│       └── test_salary_calculator.py  # Automated tests for cascading salary calculation
├── frontend/
│   ├── src/
│   │   ├── components/       # AppShell (Sidebar & Header), ProtectedRoute
│   │   ├── lib/              # Axios API client with auth interceptors, Zustand store
│   │   ├── pages/
│   │   │   ├── auth/         # SignInPage, SignUpPage, ChangePasswordPage
│   │   │   ├── employees/    # EmployeesPage, EmployeeCard, View/Edit/Add Modals
│   │   │   ├── attendance/   # AttendancePage (Stats, Trends, Daily Roster)
│   │   │   ├── timeoff/      # TimeOffPage (Balance Cards, Requests, Quota Allocations)
│   │   │   └── profile/      # MyProfilePage (Hero, Personal, Private, Security)
│   │   ├── types.ts          # Shared TypeScript interfaces
│   │   └── index.css         # Wonderly Design System tokens & layout rules
│   └── package.json
├── docker-compose.yml
└── README.md
```
