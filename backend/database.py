import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models import Base, Category, Product, Location, StockLocation, InventoryMovement

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./robotrack_wms.db")

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed default locations if not exists
        default_locations = [
            {"code": "ALM-01", "name": "Almacén Principal", "type": "ALMACEN", "description": "Zona de almacenamiento principal"},
            {"code": "REC-01", "name": "Estación de Recogida A", "type": "RECOGIDA", "description": "Punto de recogida de mercancía"},
            {"code": "DES-01", "name": "Estación de Despacho", "type": "DESPACHO", "description": "Zona de control de despacho"},
            {"code": "ENT-01", "name": "Estación de Entrega B", "type": "ENTREGA", "description": "Punto de entrega final"},
        ]
        for loc in default_locations:
            existing = db.query(Location).filter(Location.code == loc["code"]).first()
            if not existing:
                db.add(Location(**loc))

        # Seed categories if not exists
        default_categories = [
            {"name": "Electrónica y Sensores", "description": "Componentes electrónicos y sensores de navegación"},
            {"name": "Mecanizados y Estructuras", "description": "Piezas mecánicas, motores y chasis"},
            {"name": "Empaquetado y Cajas", "description": "Contenedores y material de empaque"},
        ]
        for cat in default_categories:
            existing = db.query(Category).filter(Category.name == cat["name"]).first()
            if not existing:
                db.add(Category(**cat))

        db.commit()

        # Seed default products for testing
        cat_elec = db.query(Category).filter(Category.name == "Electrónica y Sensores").first()
        cat_mec = db.query(Category).filter(Category.name == "Mecanizados y Estructuras").first()
        alm_01 = db.query(Location).filter(Location.code == "ALM-01").first()

        default_products = [
            {
                "sku": "PROD-MOD-01",
                "name": "Módulo Sensor IR Fijo",
                "description": "Sensor de línea infrarrojo reflectivo de repuesto",
                "category_id": cat_elec.id if cat_elec else None,
                "unit_of_measure": "unidades",
                "total_quantity": 25,
                "reserved_quantity": 0,
                "min_stock": 5,
                "default_location_code": "ALM-01",
            },
            {
                "sku": "PROD-MOT-02",
                "name": "Motor DC 6V TT con Reductora",
                "description": "Motor de tracción para ruedas de robot móvil",
                "category_id": cat_mec.id if cat_mec else None,
                "unit_of_measure": "unidades",
                "total_quantity": 4,
                "reserved_quantity": 0,
                "min_stock": 8, # Low stock alert trigger
                "default_location_code": "ALM-01",
            },
            {
                "sku": "PROD-BAT-03",
                "name": "Batería LiPo 7.4V 2200mAh",
                "description": "Batería recargable para alimentación del robot",
                "category_id": cat_elec.id if cat_elec else None,
                "unit_of_measure": "unidades",
                "total_quantity": 12,
                "reserved_quantity": 0,
                "min_stock": 3,
                "default_location_code": "ALM-01",
            }
        ]

        for p_data in default_products:
            existing = db.query(Product).filter(Product.sku == p_data["sku"]).first()
            if not existing:
                prod = Product(**p_data)
                db.add(prod)
                db.flush()

                if alm_01:
                    db.add(StockLocation(
                        product_id=prod.id,
                        location_id=alm_01.id,
                        quantity=prod.total_quantity
                    ))

                db.add(InventoryMovement(
                    product_id=prod.id,
                    movement_type="ENTRADA",
                    quantity=prod.total_quantity,
                    destination_location_code="ALM-01",
                    reason="Inventario inicial de prueba",
                    user_id="sistema"
                ))

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error initializing database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
