from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime, timezone
import enum

Base = declarative_base()

class MovementType(str, enum.Enum):
    ENTRY = "ENTRADA"
    EXIT = "SALIDA"
    TRANSFER = "TRASLADO"
    ADJUSTMENT = "AJUSTE"
    PICKUP = "RECOGIDA"
    DELIVERY = "ENTREGA"
    RESERVATION_HOLD = "RESERVA"
    RESERVATION_RELEASE = "LIBERACION_RESERVA"

class OrderStatus(str, enum.Enum):
    DRAFT = "Borrador"
    PENDING = "Pendiente"
    RESERVED = "Reservada"
    ASSIGNED = "Asignada"
    EXECUTING = "En ejecución"
    PICKED_UP = "Recogida confirmada"
    IN_TRANSIT = "En transporte"
    DELIVERY_PENDING = "Entrega pendiente"
    COMPLETED = "Completada"
    CANCELLED = "Cancelada"
    FAILED = "Fallida"

class MissionStatus(str, enum.Enum):
    PENDING = "Pendiente"
    ASSIGNED = "Asignada"
    EXECUTING = "En ejecución"
    ARRIVED_PICKUP = "Llegada a origen"
    PICKED_UP = "Recogida confirmada"
    IN_TRANSIT = "En transporte"
    ARRIVED_DESTINATION = "Llegada a destino"
    DELIVERED = "Entrega confirmada"
    COMPLETED = "Completada"
    CANCELLED = "Cancelada"
    FAILED = "Fallida"

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    unit_of_measure = Column(String(20), default="unidades")

    total_quantity = Column(Integer, default=0, nullable=False)
    reserved_quantity = Column(Integer, default=0, nullable=False)
    min_stock = Column(Integer, default=5, nullable=False)
    default_location_code = Column(String(50), default="ALM-01")
    is_active = Column(Boolean, default=True)

    # Cycle count & excel aux data
    annual_physical_count = Column(Integer, default=0, nullable=False)
    monthly_projections = Column(Text, nullable=True) # JSON object for Enero-Diciembre projections
    source_origin = Column(String(50), default="MANUAL") # PRODUCTOS A INCLUIR, DATA VENTAS, MANUAL

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    category = relationship("Category", back_populates="products")
    stock_locations = relationship("StockLocation", back_populates="product", cascade="all, delete-orphan")
    movements = relationship("InventoryMovement", back_populates="product")
    orders = relationship("Order", back_populates="product")

    @property
    def available_quantity(self):
        return max(0, self.total_quantity - self.reserved_quantity)

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    type = Column(String(50), default="ALMACEN") # ALMACEN, RECOGIDA, DESPACHO, ENTREGA
    description = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)

    stock_locations = relationship("StockLocation", back_populates="location")

class StockLocation(Base):
    __tablename__ = "stock_locations"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)

    product = relationship("Product", back_populates="stock_locations")
    location = relationship("Location", back_populates="stock_locations")

class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    movement_type = Column(String(50), nullable=False) # ENTRADA, SALIDA, TRASLADO, AJUSTE, RECOGIDA, ENTREGA
    quantity = Column(Integer, nullable=False)
    origin_location_code = Column(String(50), nullable=True)
    destination_location_code = Column(String(50), nullable=True)
    reason = Column(String(255), nullable=False)
    user_id = Column(String(50), default="admin")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="movements")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    requested_quantity = Column(Integer, nullable=False)
    origin_location_code = Column(String(50), nullable=False)
    destination_location_code = Column(String(50), nullable=False)
    priority = Column(String(20), default="Media") # Alta, Media, Baja
    requester_user = Column(String(50), default="operador")
    status = Column(String(50), default=OrderStatus.PENDING.value)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    product = relationship("Product", back_populates="orders")
    missions = relationship("Mission", back_populates="order", cascade="all, delete-orphan")

class Mission(Base):
    __tablename__ = "missions"

    id = Column(Integer, primary_key=True, index=True)
    mission_code = Column(String(50), unique=True, nullable=False, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    robot_id = Column(String(50), default="RoboTrack-01")
    assigned_route_id = Column(String(100), nullable=True)
    status = Column(String(50), default=MissionStatus.PENDING.value)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    order = relationship("Order", back_populates="missions")
    events = relationship("MissionEvent", back_populates="mission", cascade="all, delete-orphan")

class MissionEvent(Base):
    __tablename__ = "mission_events"

    id = Column(Integer, primary_key=True, index=True)
    mission_id = Column(Integer, ForeignKey("missions.id"), nullable=False)
    event_key = Column(String(100), unique=True, nullable=True) # For idempotency
    event_type = Column(String(100), nullable=False) # CREATED, DISPATCHED, CMD_ACCEPTED, ARRIVED_PICKUP, PICKED_UP, IN_TRANSIT, ARRIVED_DESTINATION, DELIVERED, COMPLETED, FAILED, CANCELLED
    description = Column(Text, nullable=False)
    source = Column(String(50), default="SISTEMA") # ARDUINO, USER_MANUAL, SISTEMA
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    mission = relationship("Mission", back_populates="events")

class SalesHistory(Base):
    __tablename__ = "sales_history"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(100), nullable=True)
    sale_date = Column(DateTime, nullable=True)
    total_order_value = Column(Float, nullable=True)
    currency = Column(String(20), default="COP")
    sku = Column(String(50), nullable=False, index=True)
    description = Column(String(255), nullable=True)
    quantity = Column(Integer, default=1, nullable=False)
    total_ref_value = Column(Float, nullable=True)
    company = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    category_raw = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ExcelImportLog(Base):
    __tablename__ = "excel_import_logs"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    sheet_name = Column(String(100), nullable=False)
    imported_by = Column(String(100), default="admin")
    total_records = Column(Integer, default=0)
    created_count = Column(Integer, default=0)
    updated_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    details_json = Column(Text, nullable=True) # Summary or error details
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class CycleCountSchedule(Base):
    __tablename__ = "cycle_count_schedules"

    id = Column(Integer, primary_key=True, index=True)
    week_number = Column(Integer, nullable=False)
    year = Column(Integer, nullable=False)
    status = Column(String(50), default="EN_PROGRESO") # EN_PROGRESO, COMPLETADO, CANCELADO
    target_count = Column(Integer, default=57)
    scheduled_count = Column(Integer, default=0)
    completed_count = Column(Integer, default=0)
    warning_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    items = relationship("CycleCountScheduleItem", back_populates="schedule", cascade="all, delete-orphan")

class CycleCountScheduleItem(Base):
    __tablename__ = "cycle_count_schedule_items"

    id = Column(Integer, primary_key=True, index=True)
    schedule_id = Column(Integer, ForeignKey("cycle_count_schedules.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    status = Column(String(50), default="PENDIENTE") # PENDIENTE, FINALIZADO, OMITIDO
    expected_quantity = Column(Integer, nullable=True)
    physical_quantity = Column(Integer, nullable=True)
    discrepancy = Column(Integer, nullable=True) # physical - expected
    completed_at = Column(DateTime, nullable=True)
    completed_by = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)

    schedule = relationship("CycleCountSchedule", back_populates="items")
    product = relationship("Product")
