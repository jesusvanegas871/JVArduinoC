from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone
import random

from backend.database import get_db
from backend.models import Product, Location, Order, OrderStatus, InventoryMovement
from backend.schemas import OrderCreate, OrderOut

router = APIRouter(prefix="/api/orders", tags=["orders"])

@router.get("", response_model=List[OrderOut])
def list_orders(
    status_filter: Optional[str] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)
    if product_id:
        query = query.filter(Order.product_id == product_id)
    return query.order_by(Order.created_at.desc()).all()

@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    # Validate product exists and is active
    product = db.query(Product).with_for_update().filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    if not product.is_active:
        raise HTTPException(status_code=400, detail="El producto seleccionado está inactivo")

    # Validate locations exist
    orig_loc = db.query(Location).filter(Location.code == payload.origin_location_code).first()
    dest_loc = db.query(Location).filter(Location.code == payload.destination_location_code).first()

    if not orig_loc or not dest_loc:
        raise HTTPException(status_code=400, detail="Ubicación de origen o destino no existe")

    if payload.origin_location_code == payload.destination_location_code:
        raise HTTPException(status_code=400, detail="Ubicación de origen y destino no pueden ser iguales")

    # Transactional check: available stock >= requested quantity
    if product.available_quantity < payload.requested_quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Stock disponible insuficiente ({product.available_quantity} disp, {payload.requested_quantity} sol)"
        )

    # Reserve inventory
    product.reserved_quantity += payload.requested_quantity

    order_num = f"ORD-{datetime.now().strftime('%Y%m%d')}-{random.randint(1000, 9999)}"

    order = Order(
        order_number=order_num,
        product_id=product.id,
        requested_quantity=payload.requested_quantity,
        origin_location_code=payload.origin_location_code,
        destination_location_code=payload.destination_location_code,
        priority=payload.priority,
        requester_user=payload.requester_user,
        status=OrderStatus.RESERVED.value,
        notes=payload.notes
    )
    db.add(order)

    # Movement record for audit
    movement = InventoryMovement(
        product_id=product.id,
        movement_type="RESERVA",
        quantity=payload.requested_quantity,
        origin_location_code=payload.origin_location_code,
        destination_location_code=payload.destination_location_code,
        reason=f"Reserva de stock para pedido {order_num}",
        user_id=payload.requester_user
    )
    db.add(movement)

    db.commit()
    db.refresh(order)
    return order

@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    return order

@router.post("/{order_id}/cancel", response_model=OrderOut)
def cancel_order(order_id: int, reason: Optional[str] = "Cancelado por el usuario", db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if order.status in [OrderStatus.COMPLETED.value, OrderStatus.CANCELLED.value, OrderStatus.FAILED.value]:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cancelar un pedido en estado '{order.status}'"
        )

    product = db.query(Product).with_for_update().filter(Product.id == order.product_id).first()

    # Release reservations if previously reserved/assigned
    if order.status in [
        OrderStatus.RESERVED.value,
        OrderStatus.ASSIGNED.value,
        OrderStatus.EXECUTING.value,
        OrderStatus.PENDING.value
    ]:
        product.reserved_quantity = max(0, product.reserved_quantity - order.requested_quantity)

        movement = InventoryMovement(
            product_id=product.id,
            movement_type="LIBERACION_RESERVA",
            quantity=order.requested_quantity,
            origin_location_code=order.origin_location_code,
            destination_location_code=order.destination_location_code,
            reason=f"Liberación de reserva por cancelación de pedido {order.order_number} ({reason})",
            user_id="admin"
        )
        db.add(movement)

    order.status = OrderStatus.CANCELLED.value
    order.notes = f"{order.notes or ''} | Cancelado: {reason}".strip(" |")
    order.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(order)
    return order
