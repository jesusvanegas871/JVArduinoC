from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import random
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import Product, CycleCountSchedule, CycleCountScheduleItem
from backend.schemas import (
    CycleScheduleGenerate, CycleCountScheduleOut, CycleCountItemOut
)

router = APIRouter(prefix="/api/cycle-counts", tags=["cycle-counts"])

@router.get("/schedules", response_model=List[CycleCountScheduleOut])
def list_cycle_schedules(db: Session = Depends(get_db)):
    return db.query(CycleCountSchedule).order_by(CycleCountSchedule.created_at.desc()).all()

@router.get("/schedules/{schedule_id}", response_model=CycleCountScheduleOut)
def get_cycle_schedule(schedule_id: int, db: Session = Depends(get_db)):
    sched = db.query(CycleCountSchedule).filter(CycleCountSchedule.id == schedule_id).first()
    if not sched:
        raise HTTPException(status_code=404, detail="Programación de conteos no encontrada")
    return sched

@router.post("/generate", response_model=CycleCountScheduleOut, status_code=status.HTTP_201_CREATED)
def generate_weekly_cycle_schedule(
    payload: CycleScheduleGenerate,
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    current_year, current_week, _ = now.isocalendar()

    year = payload.year or current_year
    week_number = payload.week_number or current_week
    target_qty = payload.target_count or 57

    # Find active products with < 5 completed physical counts this year
    eligible_products = db.query(Product).filter(
        Product.is_active == True,
        Product.annual_physical_count < 5
    ).all()

    warning_msg = None
    if not eligible_products:
        raise HTTPException(
            status_code=400,
            detail="No hay referencias activas elegibles para conteo cíclico (todas alcanzaron el máximo de 5 conteos anuales o el catálogo está vacío)."
        )

    if len(eligible_products) < target_qty:
        warning_msg = f"Advertencia: Se requerían {target_qty} referencias pero solo existen {len(eligible_products)} referencias elegibles disponibles."
        selected_products = eligible_products
    else:
        # Random selection without replacement
        selected_products = random.sample(eligible_products, target_qty)

    schedule = CycleCountSchedule(
        week_number=week_number,
        year=year,
        status="EN_PROGRESO",
        target_count=target_qty,
        scheduled_count=len(selected_products),
        completed_count=0,
        warning_message=warning_msg
    )
    db.add(schedule)
    db.flush()

    for p in selected_products:
        item = CycleCountScheduleItem(
            schedule_id=schedule.id,
            product_id=p.id,
            status="PENDIENTE"
        )
        db.add(item)

    db.commit()
    db.refresh(schedule)
    return schedule

@router.post("/items/{item_id}/complete", response_model=CycleCountItemOut)
def complete_cycle_count_item(
    item_id: int,
    user_id: str = "operador",
    notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    item = db.query(CycleCountScheduleItem).filter(CycleCountScheduleItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem de conteo cíclico no encontrado")

    if item.status == "FINALIZADO":
        raise HTTPException(status_code=400, detail="Este conteo cíclico ya ha sido finalizado previamente.")

    product = db.query(Product).with_for_update().filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto asociado no encontrado")

    if product.annual_physical_count >= 5:
        raise HTTPException(status_code=400, detail=f"El producto '{product.sku}' ya ha alcanzado el límite máximo anual de 5 conteos físicos.")

    # Increment annual physical count
    product.annual_physical_count += 1

    item.status = "FINALIZADO"
    item.completed_at = datetime.now(timezone.utc)
    item.completed_by = user_id
    item.notes = notes

    # Update parent schedule counters
    schedule = item.schedule
    schedule.completed_count += 1
    if schedule.completed_count >= schedule.scheduled_count:
        schedule.status = "COMPLETADO"

    db.commit()
    db.refresh(item)
    return item
