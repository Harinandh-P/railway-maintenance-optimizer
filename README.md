# Railway Maintenance Block Optimization System

A deployable web application integrating a 3-Phase Railway Maintenance Optimization pipeline with section-specific train movement modeling and CP-SAT resource allocation.

---

## Key Features

- **Phase 1: Priority & Risk Scoring**
  Scoring maintenance requests based on defect severity, safety risk, asset criticality, and historical failure frequency.

- **Phase 2: Traffic & Corridor Analysis**
  Calculates section-specific train entry and clear times for requested maintenance sections (e.g. Salem–Chennai C1 / KM292 → KM223) and generates feasible candidate block gaps.

- **Phase 3: CP-SAT Resource Optimization**
  Solves constraint satisfaction and optimization for tasks, groups, workers (skill/availability), and equipment (quantities/overlaps).

- **Data Management UI**
  Full Excel-like DataGrid editing for Train Master, Train Routes, Station/KM Mapping, Maintenance Requests, Workers, and Equipment with export/import.

- **Role-Based Access Control (RBAC)**
  Enforces `ADMIN` and `OPERATOR` access levels at the backend API level.

---

## Quick Start

### 1. Backend Setup & Run

```bash
# Navigate to project root
cd railway-maintenance-optimizer

# Install Python requirements
pip install -r requirements.txt

# Start FastAPI backend server
uvicorn backend.main:app --reload --port 8000
```
Backend API will be running at: `http://127.0.0.1:8000`
API Documentation (Swagger): `http://127.0.0.1:8000/docs`

### 2. Frontend Setup & Run

```bash
# Navigate to frontend folder
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server
npm run dev
```
Frontend UI will be running at: `http://localhost:3000`

---

## Credentials

- **ADMIN**: `admin` / `admin123` (Full CRUD + Pipeline Execution + Audit Log)
- **OPERATOR**: `operator` / `operator123` (Operational View + Requests Submission)

---

## Test Suite Execution

Run automated unit and integration tests:

```bash
python -m pytest tests/
```
