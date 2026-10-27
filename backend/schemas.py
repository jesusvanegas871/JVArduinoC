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
    sku: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit_of_measure: str = "unidades"
    min_stock: int = 5
    default_location_code: str = "ALM-01"
    is_active: bool = True
    annual_physical_count: int = 0
    monthly_projections: Optional[str] = None
    source_origin: Optional[str] = "MANUAL"

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
    annual_physical_count: Optional[int] = None
    monthly_projections: Optional[str] = None
    source_origin: Optional[str] = None

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

# --- CATALOG METRICS (TARGET 600) ---
class CatalogMetrics(BaseModel):
    target_catalog: int = 600
    total_unique_imported: int
    total_existing_in_db: int
    total_new_imported: int
    total_duplicates_detected: int
    total_missing_for_600: int
    total_active_eligible_for_count: int
    info_message: Optional[str] = None

# --- EXCEL IMPORT SCHEMAS ---
class ImportRowPreview(BaseModel):
    row_index: int
    sku: str
    name: str
    category: Optional[str] = None
    origin_sheet: str
    status: str # "NUEVO", "EXISTENTE", "DUPLICADO_EN_ARCHIVO", "INVALIDO", "ADVERTENCIA"
    action: str # "CREAR", "ACTUALIZAR", "OMITIR", "ERROR"
    warnings: List[str] = []
    errors: List[str] = []
    auxiliary_data: Optional[dict] = None

class ImportPreviewResponse(BaseModel):
    filename: str
    sheet_name: str
    total_rows: int
    valid_rows_count: int
    to_create_count: int
    to_update_count: int
    skipped_count: int
    error_count: int
    detected_headers: List[str]
    preview_rows: List[ImportRowPreview]
    catalog_metrics: CatalogMetrics

class ImportConfirmRequest(BaseModel):
    filename: str
    sheet_name: str
    preview_rows: List[ImportRowPreview]
    user_id: str = "admin"

class ImportResult(BaseModel):
    log_id: int
    filename: str
    sheet_name: str
    created_count: int
    updated_count: int
    skipped_count: int
    error_count: int
    catalog_metrics: CatalogMetrics
    message: str

class ExcelImportLogOut(BaseModel):
    id: int
    filename: str
    sheet_name: str
    imported_by: str
    total_records: int
    created_count: int
    updated_count: int
    skipped_count: int
    error_count: int
    details_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- CYCLE COUNT SCHEDULES ---
class CycleScheduleGenerate(BaseModel):
    week_number: Optional[int] = None
    year: Optional[int] = None
    target_count: int = 57

class CycleCountItemOut(BaseModel):
    id: int
    schedule_id: int
    product_id: int
    status: str
    expected_quantity: Optional[int] = None
    physical_quantity: Optional[int] = None
    discrepancy: Optional[int] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    notes: Optional[str] = None
    product: ProductOut

    class Config:
        from_attributes = True

class CycleCountItemCompleteRequest(BaseModel):
    item_id: int
    physical_quantity: int = Field(..., ge=0, description="Cantidad física contada (debe ser mayor o igual a 0)")
    notes: Optional[str] = None

class BulkCycleCountCompleteRequest(BaseModel):
    schedule_id: int
    user_id: str = "operador"
    items: List[CycleCountItemCompleteRequest] = Field(..., min_length=1)

class CycleCountScheduleOut(BaseModel):
    id: int
    week_number: int
    year: int
    status: str
    target_count: int
    scheduled_count: int
    completed_count: int
    warning_message: Optional[str] = None
    created_at: datetime
    items: List[CycleCountItemOut] = []

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
