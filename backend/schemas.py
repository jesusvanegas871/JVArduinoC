from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryOut(CategoryBase):
    id: int

    class Config:
        from_attributes = True

# --- PRODUCT ---
class ProductBase(BaseModel):
    sku: str = Field(..., min_length=2, max_length=50)
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: str = "unidades"
    min_stock: int = 5
    default_location_code: str = "ALM-01"
    is_active: bool = True

class ProductCreate(ProductBase):
    initial_quantity: int = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: Optional[str] = None
    min_stock: Optional[int] = None
    default_location_code: Optional[str] = None
    is_active: Optional[bool] = None

class ProductOut(ProductBase):
    id: int
    total_quantity: int
    reserved_quantity: int
    available_quantity: int
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryOut] = None

    class Config:
        from_attributes = True

# --- LOCATION ---
class LocationBase(BaseModel):
    code: str
    name: str
    type: str = "ALMACEN"
    description: Optional[str] = None
    is_active: bool = True

class LocationCreate(LocationBase):
    pass

class LocationOut(LocationBase):
    id: int

    class Config:
        from_attributes = True

class StockLocationOut(BaseModel):
    id: int
    product_id: int
    location_id: int
    quantity: int
    location: LocationOut
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True

# --- INVENTORY MOVEMENTS ---
class MovementCreate(BaseModel):
    product_id: int
    movement_type: str # ENTRADA, SALIDA, TRASLADO, AJUSTE
    quantity: int = Field(..., gt=0)
    origin_location_code: Optional[str] = None
    destination_location_code: Optional[str] = None
    reason: str
    user_id: str = "admin"

class MovementOut(BaseModel):
    id: int
    product_id: int
    movement_type: str
    quantity: int
    origin_location_code: Optional[str] = None
    destination_location_code: Optional[str] = None
    reason: str
    user_id: str
    created_at: datetime
    product: Optional[ProductOut] = None

    class Config:
        from_attributes = True

# --- ORDERS ---
class OrderCreate(BaseModel):
    product_id: int
    requested_quantity: int = Field(..., gt=0)
    origin_location_code: str
    destination_location_code: str
    priority: str = "Media"
    requester_user: str = "operador"
    notes: Optional[str] = None

class OrderOut(BaseModel):
    id: int
    order_number: str
    product_id: int
    requested_quantity: int
    origin_location_code: str
    destination_location_code: str
    priority: str
    requester_user: str
    status: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    product: ProductOut

    class Config:
        from_attributes = True

# --- MISSIONS ---
class MissionCreate(BaseModel):
    order_id: int
    assigned_route_id: Optional[str] = None

class MissionEventCreate(BaseModel):
    event_key: Optional[str] = None
    event_type: str
    description: str
    source: str = "SISTEMA"

class MissionEventOut(BaseModel):
    id: int
    mission_id: int
    event_key: Optional[str] = None
    event_type: str
    description: str
    source: str
    timestamp: datetime

    class Config:
        from_attributes = True

class MissionOut(BaseModel):
    id: int
    mission_code: str
    order_id: int
    robot_id: str
    assigned_route_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
    order: OrderOut
    events: List[MissionEventOut] = []

    class Config:
        from_attributes = True

# --- DASHBOARD STATS ---
class DashboardStats(BaseModel):
    total_active_products: int
    total_available_units: int
    low_stock_products_count: int
    pending_orders_count: int
    executing_missions_count: int
    completed_deliveries_count: int
    recent_movements: List[MovementOut] = []
    recent_events: List[MissionEventOut] = []
