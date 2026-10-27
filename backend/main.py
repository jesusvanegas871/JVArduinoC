from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.database import init_db
from backend.routers import products, inventory, locations, orders, missions, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB tables & seed initial data
    init_db()
    yield

app = FastAPI(
    title="RoboTrack WMS & Logistics API",
    description="API para la gestión integrada de inventarios, almacén y misiones del robot RoboTrack.",
    version="2.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(locations.router)
app.include_router(orders.router)
app.include_router(missions.router)
app.include_router(dashboard.router)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "RoboTrack WMS API",
        "version": "2.0.0"
    }
