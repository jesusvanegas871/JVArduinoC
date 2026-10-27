from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import random
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import Product, CycleCountSchedule, CycleCountScheduleItem
from backend.schemas import (
    CycleScheduleGenerate, CycleCountScheduleOut, CycleCountItemOut, BulkCycleCountCompleteRequest
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
        missing_count = target_qty - len(eligible_products)
        warning_msg = f"Advertencia: Se requerían {target_qty} referencias pero solo existen {len(eligible_products)} referencias elegibles disponibles. Faltan {missing_count} para cumplir la meta semanal de {target_qty}."
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
            expected_quantity=p.total_quantity,
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
    physical_quantity: Optional[int] = None,
    db: Session = Depends(get_db)
):
    item = db.query(CycleCountScheduleItem).filter(CycleCountScheduleItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Ítem de conteo cíclico no encontrado")

    if item.status == "FINALIZADO":
        raise HTTPException(status_code=400, detail="Este conteo cíclico ya ha sido finalizado previamente.")

    if physical_quantity is not None and physical_quantity < 0:
        raise HTTPException(status_code=400, detail="La cantidad física contada no puede ser negativa.")

    product = db.query(Product).with_for_update().filter(Product.id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto asociado no encontrado")

    if product.annual_physical_count >= 5:
        raise HTTPException(status_code=400, detail=f"El producto '{product.sku}' ya ha alcanzado el límite máximo anual de 5 conteos físicos.")

    # Increment annual physical count
    product.annual_physical_count += 1

    expected_qty = item.expected_quantity if item.expected_quantity is not None else product.total_quantity
    item.expected_quantity = expected_qty

    if physical_quantity is not None:
        item.physical_quantity = physical_quantity
        item.discrepancy = physical_quantity - expected_qty

    item.status = "FINALIZADO"
    item.completed_at = datetime.now(timezone.utc)
    item.completed_by = user_id
    if notes:
        item.notes = notes

    # Update parent schedule counters
    schedule = item.schedule
    schedule.completed_count += 1
    if schedule.completed_count >= schedule.scheduled_count:
        schedule.status = "COMPLETADO"

    db.commit()
    db.refresh(item)
    return item

@router.post("/bulk-complete", response_model=CycleCountScheduleOut)
def bulk_complete_cycle_counts(
    payload: BulkCycleCountCompleteRequest,
    db: Session = Depends(get_db)
):
    schedule = db.query(CycleCountSchedule).filter(CycleCountSchedule.id == payload.schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Programación de conteo cíclico no encontrada.")

    if schedule.status == "COMPLETADO":
        raise HTTPException(status_code=400, detail="Esta programación semanal ya se encuentra COMPLETADA.")

    if not payload.items:
        raise HTTPException(status_code=400, detail="Debe proporcionar al menos una referencia para finalizar.")

    items_map = {i.id: i for i in schedule.items}

    # Pre-validation step
    processed_item_ids = set()
    for req_item in payload.items:
        if req_item.item_id in processed_item_ids:
            continue
        processed_item_ids.add(req_item.item_id)

        item = items_map.get(req_item.item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"El ítem con ID {req_item.item_id} no pertenece a esta programación semanal.")

        if item.status == "FINALIZADO":
            raise HTTPException(status_code=400, detail=f"El ítem '{item.product.sku}' ya ha sido finalizado previamente.")

        if req_item.physical_quantity < 0:
            raise HTTPException(status_code=400, detail=f"Cantidad física inválida ({req_item.physical_quantity}) para la referencia '{item.product.sku}'. No se aceptan cantidades negativas.")

        if item.product.annual_physical_count >= 5:
            raise HTTPException(status_code=400, detail=f"La referencia '{item.product.sku}' ya alcanzó el límite máximo de 5 conteos anuales.")

    # Execution step in nested transaction
    try:
        with db.begin_nested():
            for req_item in payload.items:
                item = items_map[req_item.item_id]
                if item.status == "FINALIZADO":
                    continue

                product = db.query(Product).with_for_update().filter(Product.id == item.product_id).first()

                # Increment annual count
                product.annual_physical_count += 1

                expected_qty = product.total_quantity
                item.expected_quantity = expected_qty
                item.physical_quantity = req_item.physical_quantity
                item.discrepancy = req_item.physical_quantity - expected_qty

                item.status = "FINALIZADO"
                item.completed_at = datetime.now(timezone.utc)
                item.completed_by = payload.user_id
                if req_item.notes:
                    item.notes = req_item.notes

                schedule.completed_count += 1

            if schedule.completed_count >= schedule.scheduled_count:
                schedule.status = "COMPLETADO"

        db.commit()
        db.refresh(schedule)
        return schedule
    except Exception as e:
        db.rollback()
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error procesando el registro masivo de conteos: {str(e)}")
