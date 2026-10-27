from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import random

from backend.database import get_db
from backend.models import Product, Location, StockLocation, Order, OrderStatus, Mission, MissionStatus, MissionEvent, InventoryMovement
from backend.schemas import MissionCreate, MissionOut, MissionEventCreate, MissionEventOut

router = APIRouter(prefix="/api/missions", tags=["missions"])

@router.get("", response_model=List[MissionOut])
def list_missions(
    status_filter: Optional[str] = None,
    order_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Mission)
    if status_filter:
        query = query.filter(Mission.status == status_filter)
    if order_id:
        query = query.filter(Mission.order_id == order_id)
    return query.order_by(Mission.created_at.desc()).all()

@router.post("", response_model=MissionOut, status_code=status.HTTP_201_CREATED)
def create_mission(payload: MissionCreate, db: Session = Depends(get_db)):
    order = db.query(Order).with_for_update().filter(Order.id == payload.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if order.status not in [OrderStatus.RESERVED.value, OrderStatus.PENDING.value]:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede asignar una misión a un pedido en estado '{order.status}'"
        )

    # Check if active mission already exists for this order
    active_mission = db.query(Mission).filter(
        Mission.order_id == order.id,
        Mission.status.in_([
            MissionStatus.PENDING.value,
            MissionStatus.ASSIGNED.value,
            MissionStatus.EXECUTING.value,
            MissionStatus.ARRIVED_PICKUP.value,
            MissionStatus.PICKED_UP.value,
            MissionStatus.IN_TRANSIT.value,
            MissionStatus.ARRIVED_DESTINATION.value
        ])
    ).first()

    if active_mission:
        raise HTTPException(status_code=400, detail=f"El pedido ya tiene una misión activa ({active_mission.mission_code})")

    mission_code = f"MIS-{datetime.now().strftime('%Y%m%d')}-{random.randint(100, 999)}"

    mission = Mission(
        mission_code=mission_code,
        order_id=order.id,
        robot_id="RoboTrack-01",
        assigned_route_id=payload.assigned_route_id or "RUTA_DEFAULT",
        status=MissionStatus.ASSIGNED.value
    )
    db.add(mission)
    db.flush()

    # Update order state
    order.status = OrderStatus.ASSIGNED.value
    order.updated_at = datetime.now(timezone.utc)

    # Event record
    evt = MissionEvent(
        mission_id=mission.id,
        event_key=f"EVT-ASSIGN-{mission.id}",
        event_type="CREATED",
        description=f"Misión {mission_code} asignada al carrito RoboTrack-01 para pedido {order.order_number}",
        source="SISTEMA"
    )
    db.add(evt)

    db.commit()
    db.refresh(mission)
    return mission

@router.get("/{mission_id}", response_model=MissionOut)
def get_mission(mission_id: int, db: Session = Depends(get_db)):
    mission = db.query(Mission).filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Misión no encontrada")
    return mission

@router.post("/{mission_id}/events", response_model=MissionEventOut)
def record_mission_event(
    mission_id: int,
    payload: MissionEventCreate,
    db: Session = Depends(get_db)
):
    mission = db.query(Mission).with_for_update().filter(Mission.id == mission_id).first()
    if not mission:
        raise HTTPException(status_code=404, detail="Misión no encontrada")

    # Idempotency check: if event_key is present and already processed, return existing event
    if payload.event_key:
        existing_evt = db.query(MissionEvent).filter(MissionEvent.event_key == payload.event_key).first()
        if existing_evt:
            return existing_evt

    order = db.query(Order).with_for_update().filter(Order.id == mission.order_id).first()
    product = db.query(Product).with_for_update().filter(Product.id == order.product_id).first()

    event_type = payload.event_type.upper()

    # Process status transition & inventory actions based on event
    if event_type == "DISPATCHED":
        mission.status = MissionStatus.EXECUTING.value
        order.status = OrderStatus.EXECUTING.value

    elif event_type == "ARRIVED_PICKUP":
        mission.status = MissionStatus.ARRIVED_PICKUP.value

    elif event_type == "CONFIRM_PICKUP":
        if mission.status == MissionStatus.PICKED_UP.value or order.status in [OrderStatus.IN_TRANSIT.value, OrderStatus.COMPLETED.value]:
            # Already picked up, idempotent skip double deduction
            pass
        else:
            # Reached pickup point & user/sensor confirms merchandise load
            # Deduct from origin location
            orig_loc = db.query(Location).filter(Location.code == order.origin_location_code).first()
            if orig_loc:
                stock_orig = db.query(StockLocation).filter(
                    StockLocation.product_id == product.id,
                    StockLocation.location_id == orig_loc.id
                ).first()

                if stock_orig:
                    stock_orig.quantity = max(0, stock_orig.quantity - order.requested_quantity)

            # Record origin movement
            db.add(InventoryMovement(
                product_id=product.id,
                movement_type="RECOGIDA",
                quantity=order.requested_quantity,
                origin_location_code=order.origin_location_code,
                reason=f"Recogida confirmada para misión {mission.mission_code} (Pedido {order.order_number})",
                user_id=payload.source
            ))

            mission.status = MissionStatus.PICKED_UP.value
            order.status = OrderStatus.IN_TRANSIT.value

    elif event_type == "IN_TRANSIT":
        mission.status = MissionStatus.IN_TRANSIT.value
        order.status = OrderStatus.IN_TRANSIT.value

    elif event_type == "ARRIVED_DESTINATION":
        mission.status = MissionStatus.ARRIVED_DESTINATION.value
        order.status = OrderStatus.DELIVERY_PENDING.value

    elif event_type == "CONFIRM_DELIVERY":
        if mission.status == MissionStatus.COMPLETED.value or order.status == OrderStatus.COMPLETED.value:
            # Already delivered, idempotent skip double entry
            pass
        else:
            # Reached delivery point & user/sensor confirms delivery
            dest_loc = db.query(Location).filter(Location.code == order.destination_location_code).first()
            if dest_loc:
                stock_dest = db.query(StockLocation).filter(
                    StockLocation.product_id == product.id,
                    StockLocation.location_id == dest_loc.id
                ).first()

                if not stock_dest:
                    stock_dest = StockLocation(
                        product_id=product.id,
                        location_id=dest_loc.id,
                        quantity=order.requested_quantity
                    )
                    db.add(stock_dest)
                else:
                    stock_dest.quantity += order.requested_quantity

            # Fulfill product total stock deduction & release reserved quantity
            product.total_quantity = max(0, product.total_quantity - order.requested_quantity)
            product.reserved_quantity = max(0, product.reserved_quantity - order.requested_quantity)

            # Record delivery movement
            db.add(InventoryMovement(
                product_id=product.id,
                movement_type="ENTREGA",
                quantity=order.requested_quantity,
                destination_location_code=order.destination_location_code,
                reason=f"Entrega completada para misión {mission.mission_code} (Pedido {order.order_number})",
                user_id=payload.source
            ))

            mission.status = MissionStatus.COMPLETED.value
            order.status = OrderStatus.COMPLETED.value

    elif event_type == "FAILED":
        mission.status = MissionStatus.FAILED.value
        order.status = OrderStatus.FAILED.value

    elif event_type == "CANCELLED":
        mission.status = MissionStatus.CANCELLED.value
        if order.status != OrderStatus.COMPLETED.value:
            order.status = OrderStatus.CANCELLED.value
            # Release reservation
            product.reserved_quantity = max(0, product.reserved_quantity - order.requested_quantity)

    mission.updated_at = datetime.now(timezone.utc)
    order.updated_at = datetime.now(timezone.utc)

    evt = MissionEvent(
        mission_id=mission.id,
        event_key=payload.event_key,
        event_type=payload.event_type,
        description=payload.description,
        source=payload.source
    )
    db.add(evt)

    db.commit()
    db.refresh(evt)
    return evt
