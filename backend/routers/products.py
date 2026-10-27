from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timezone

from backend.database import get_db
from backend.models import Product, Category, StockLocation, Location, InventoryMovement
from backend.schemas import ProductCreate, ProductUpdate, ProductOut, CategoryOut

router = APIRouter(prefix="/api/products", tags=["products"])

@router.get("/categories", response_model=List[CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    return db.query(Category).all()

@router.get("", response_model=List[ProductOut])
def list_products(
    search: Optional[str] = None,
    category_id: Optional[int] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if is_active is not None:
        query = query.filter(Product.is_active == is_active)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        s = f"%{search}%"
        query = query.filter((Product.name.ilike(s)) | (Product.sku.ilike(s)))
    return query.all()

@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    # Validate SKU uniqueness
    existing = db.query(Product).filter(Product.sku == payload.sku.upper().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"El SKU '{payload.sku}' ya se encuentra registrado."
        )

    # Validate location exists
    default_loc = db.query(Location).filter(Location.code == payload.default_location_code).first()
    if not default_loc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La ubicación predeterminada '{payload.default_location_code}' no existe."
        )

    product = Product(
        sku=payload.sku.upper().strip(),
        name=payload.name.strip(),
        description=payload.description,
        category_id=payload.category_id,
        unit_of_measure=payload.unit_of_measure,
        min_stock=payload.min_stock,
        default_location_code=payload.default_location_code,
        is_active=payload.is_active,
        total_quantity=payload.initial_quantity,
        reserved_quantity=0
    )
    db.add(product)
    db.flush()

    # Assign initial stock if > 0
    if payload.initial_quantity > 0:
        stock_loc = StockLocation(
            product_id=product.id,
            location_id=default_loc.id,
            quantity=payload.initial_quantity
        )
        db.add(stock_loc)

        movement = InventoryMovement(
            product_id=product.id,
            movement_type="ENTRADA",
            quantity=payload.initial_quantity,
            destination_location_code=payload.default_location_code,
            reason="Registro inicial de producto",
            user_id="admin"
        )
        db.add(movement)

    db.commit()
    db.refresh(product)
    return product

@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")
    return product

@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(product, key, value)

    product.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(product)
    return product

@router.delete("/{product_id}", response_model=ProductOut)
def deactivate_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Producto no encontrado")

    product.is_active = False
    product.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(product)
    return product
