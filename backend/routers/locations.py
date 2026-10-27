from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from backend.database import get_db
from backend.models import Location, StockLocation
from backend.schemas import LocationOut, LocationCreate, StockLocationOut

router = APIRouter(prefix="/api/locations", tags=["locations"])

@router.get("", response_model=List[LocationOut])
def list_locations(db: Session = Depends(get_db)):
    return db.query(Location).all()

@router.post("", response_model=LocationOut, status_code=status.HTTP_201_CREATED)
def create_location(payload: LocationCreate, db: Session = Depends(get_db)):
    code_upper = payload.code.upper().strip()
    existing = db.query(Location).filter(Location.code == code_upper).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La ubicación con código '{code_upper}' ya existe."
        )

    location = Location(
        code=code_upper,
        name=payload.name.strip(),
        type=payload.type.upper().strip(),
        description=payload.description,
        is_active=payload.is_active
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return location

@router.get("/{code}/stock", response_model=List[StockLocationOut])
def get_location_stock(code: str, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.code == code.upper().strip()).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")

    return db.query(StockLocation).filter(StockLocation.location_id == location.id).all()
