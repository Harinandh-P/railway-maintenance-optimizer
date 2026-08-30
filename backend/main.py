from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import AppConfig
from backend.database import init_db

# Import routers
from backend.routers import (
    auth_router,
    pipeline_router,
    phase_results_router,
    train_master_router,
    train_routes_router,
    maintenance_router,
    maintenance_history_router,
    workers_router,
    equipment_router,
    station_km_router,
    corridors_router,
    dashboard_router,
    audit_router
)

app = FastAPI(
    title="Railway Maintenance Block Optimization System",
    description="Integrated 3-Phase Railway Maintenance Block Optimization Backend API",
    version="1.0.0"
)

# CORS middleware for local frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "system": "Railway Maintenance Block Optimization System",
        "version": "1.0.0",
        "phase1_output_exists": AppConfig.PHASE1_OUTPUT.exists(),
        "phase2_output_exists": AppConfig.PHASE2_OUTPUT.exists(),
        "phase3_output_exists": AppConfig.PHASE3_OUTPUT.exists(),
        "final_plan_exists": AppConfig.FINAL_BLOCK_PLAN.exists()
    }

# Include all routers
app.include_router(auth_router.router)
app.include_router(pipeline_router.router)
app.include_router(phase_results_router.router)
app.include_router(train_master_router.router)
app.include_router(train_routes_router.router)
app.include_router(maintenance_router.router)
app.include_router(maintenance_history_router.router)
app.include_router(workers_router.router)
app.include_router(equipment_router.router)
app.include_router(station_km_router.router)
app.include_router(corridors_router.router)
app.include_router(dashboard_router.router)
app.include_router(audit_router.router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True)
