from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.database import get_db
from backend.models import Product, Order, Mission, InventoryMovement, MissionEvent, OrderStatus, MissionStatus
from backend.schemas import DashboardStats

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    active_products = db.query(Product).filter(Product.is_active == True).all()

    total_active_count = len(active_products)
    total_available_units = sum(p.available_quantity for p in active_products)
    low_stock_count = sum(1 for p in active_products if p.available_quantity <= p.min_stock)

    pending_orders = db.query(Order).filter(Order.status.in_([
        OrderStatus.PENDING.value,
        OrderStatus.RESERVED.value,
        OrderStatus.ASSIGNED.value
    ])).count()

    executing_missions = db.query(Mission).filter(Mission.status.in_([
        MissionStatus.EXECUTING.value,
        MissionStatus.ARRIVED_PICKUP.value,
        MissionStatus.PICKED_UP.value,
        MissionStatus.IN_TRANSIT.value,
        MissionStatus.ARRIVED_DESTINATION.value
    ])).count()

    completed_deliveries = db.query(Order).filter(Order.status == OrderStatus.COMPLETED.value).count()

    recent_movements = db.query(InventoryMovement).order_by(InventoryMovement.created_at.desc()).limit(10).all()
    recent_events = db.query(MissionEvent).order_by(MissionEvent.timestamp.desc()).limit(10).all()

    return DashboardStats(
        total_active_products=total_active_count,
        total_available_units=total_available_units,
        low_stock_products_count=low_stock_count,
        pending_orders_count=pending_orders,
        executing_missions_count=executing_missions,
        completed_deliveries_count=completed_deliveries,
        recent_movements=recent_movements,
        recent_events=recent_events
    )
