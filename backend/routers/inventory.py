from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import Product, Location, StockLocation, InventoryMovement
from backend.schemas import MovementCreate, MovementOut, StockLocationOut

router = APIRouter(prefix="/api/inventory", tags=["inventory"])

@router.get("/stock", response_model=List[StockLocationOut])
def get_all_stock(db: Session = Depends(get_db)):
    return db.query(StockLocation).all()

@router.get("/movements", response_model=List[MovementOut])
def list_movements(
    product_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(InventoryMovement)
    if product_id:
        query = query.filter(InventoryMovement.product_id == product_id)
    return query.order_by(InventoryMovement.created_at.desc()).limit(limit).all()

@router.post("/movements", response_model=MovementOut, status_code=status.HTTP_201_CREATED)
def create_movement(payload: MovementCreate, db: Session = Depends(get_db)):
    product = db.query(Product).with_for_update().filter(Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    movement_type = payload.movement_type.upper()
    qty = payload.quantity

    if qty <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor que cero")

    # ENTRADA
    if movement_type == "ENTRADA":
        dest_code = payload.destination_location_code or product.default_location_code
        loc = db.query(Location).filter(Location.code == dest_code).first()
        if not loc:
            raise HTTPException(status_code=400, detail=f"Ubicación de destino '{dest_code}' no existe")

        product.total_quantity += qty

        stock_loc = db.query(StockLocation).filter(
            StockLocation.product_id == product.id,
            StockLocation.location_id == loc.id
        ).first()
        if not stock_loc:
            stock_loc = StockLocation(product_id=product.id, location_id=loc.id, quantity=qty)
            db.add(stock_loc)
        else:
            stock_loc.quantity += qty

    # SALIDA
    elif movement_type == "SALIDA":
        orig_code = payload.origin_location_code or product.default_location_code
        loc = db.query(Location).filter(Location.code == orig_code).first()
        if not loc:
            raise HTTPException(status_code=400, detail=f"Ubicación de origen '{orig_code}' no existe")

        if product.available_quantity < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Cantidad disponible insuficiente ({product.available_quantity} disp, {qty} req)"
            )

        stock_loc = db.query(StockLocation).filter(
            StockLocation.product_id == product.id,
            StockLocation.location_id == loc.id
        ).first()

        if not stock_loc or stock_loc.quantity < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente en ubicación {orig_code} ({stock_loc.quantity if stock_loc else 0} unidades)"
            )

        product.total_quantity -= qty
        stock_loc.quantity -= qty

    # TRASLADO
    elif movement_type == "TRASLADO":
        if not payload.origin_location_code or not payload.destination_location_code:
            raise HTTPException(status_code=400, detail="Traslado requiere ubicación de origen y destino")

        if payload.origin_location_code == payload.destination_location_code:
            raise HTTPException(status_code=400, detail="Ubicación de origen y destino deben ser distintas")

        orig_loc = db.query(Location).filter(Location.code == payload.origin_location_code).first()
        dest_loc = db.query(Location).filter(Location.code == payload.destination_location_code).first()

        if not orig_loc or not dest_loc:
            raise HTTPException(status_code=400, detail="Ubicación de origen o destino no existe")

        stock_orig = db.query(StockLocation).filter(
            StockLocation.product_id == product.id,
            StockLocation.location_id == orig_loc.id
        ).first()

        if not stock_orig or stock_orig.quantity < qty:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente en origen '{payload.origin_location_code}' ({stock_orig.quantity if stock_orig else 0} disp)"
            )

        stock_orig.quantity -= qty

        stock_dest = db.query(StockLocation).filter(
            StockLocation.product_id == product.id,
            StockLocation.location_id == dest_loc.id
        ).first()

        if not stock_dest:
            stock_dest = StockLocation(product_id=product.id, location_id=dest_loc.id, quantity=qty)
            db.add(stock_dest)
        else:
            stock_dest.quantity += qty

    # AJUSTE
    elif movement_type == "AJUSTE":
        loc_code = payload.destination_location_code or product.default_location_code
        loc = db.query(Location).filter(Location.code == loc_code).first()
        if not loc:
            raise HTTPException(status_code=400, detail=f"Ubicación '{loc_code}' no existe")

        # In AJUSTE, quantity in payload is the new target total quantity or diff
        diff = qty - product.total_quantity
        if qty < product.reserved_quantity:
            raise HTTPException(
                status_code=400,
                detail=f"No se puede ajustar total ({qty}) por debajo del stock reservado ({product.reserved_quantity})"
            )

        product.total_quantity = qty

        stock_loc = db.query(StockLocation).filter(
            StockLocation.product_id == product.id,
            StockLocation.location_id == loc.id
        ).first()

        if not stock_loc:
            stock_loc = StockLocation(product_id=product.id, location_id=loc.id, quantity=max(0, qty))
            db.add(stock_loc)
        else:
            stock_loc.quantity = max(0, stock_loc.quantity + diff)

    else:
        raise HTTPException(status_code=400, detail=f"Tipo de movimiento '{movement_type}' no soportado")

    movement = InventoryMovement(
        product_id=product.id,
        movement_type=movement_type,
        quantity=qty,
        origin_location_code=payload.origin_location_code,
        destination_location_code=payload.destination_location_code,
        reason=payload.reason,
        user_id=payload.user_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)
    return movement
