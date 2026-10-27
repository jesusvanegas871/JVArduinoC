import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

from backend.main import app
from backend.database import Base, get_db

from sqlalchemy.pool import StaticPool

from sqlalchemy.pool import StaticPool

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///:memory:"

test_api_engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestApiSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_api_engine)

def override_get_db_api():
    db = TestApiSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db_api
    Base.metadata.create_all(bind=test_api_engine)
    db = TestApiSessionLocal()
    from backend.models import Location
    if not db.query(Location).filter(Location.code == "ALM-01").first():
        db.add(Location(code="ALM-01", name="Almacén Test", type="ALMACEN"))
        db.add(Location(code="REC-01", name="Recogida Test", type="RECOGIDA"))
        db.add(Location(code="ENT-01", name="Entrega Test", type="ENTREGA"))
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=test_api_engine)

client = TestClient(app)

def test_root():
    res = client.get("/")
    assert res.status_code == 200
    assert res.json()["service"] == "RoboTrack WMS API"

def test_create_product_and_duplicate_sku_validation():
    # 1. Create product
    prod_data = {
        "sku": "SKU-TEST-01",
        "name": "Producto Test 1",
        "description": "Prueba de creación",
        "unit_of_measure": "unidades",
        "min_stock": 5,
        "default_location_code": "ALM-01",
        "initial_quantity": 20
    }
    res = client.post("/api/products", json=prod_data)
    assert res.status_code == 201
    data = res.json()
    assert data["sku"] == "SKU-TEST-01"
    assert data["total_quantity"] == 20
    assert data["available_quantity"] == 20

    # 2. Try creating duplicate SKU
    res_dup = client.post("/api/products", json=prod_data)
    assert res_dup.status_code == 400
    assert "ya se encuentra registrado" in res_dup.json()["detail"]

def test_inventory_entry_exit_and_transfer():
    # Create product
    prod_data = {
        "sku": "SKU-INV-01",
        "name": "Producto Inventario",
        "default_location_code": "ALM-01",
        "initial_quantity": 10
    }
    prod = client.post("/api/products", json=prod_data).json()
    p_id = prod["id"]

    # Entry movement
    entry_res = client.post("/api/inventory/movements", json={
        "product_id": p_id,
        "movement_type": "ENTRADA",
        "quantity": 15,
        "destination_location_code": "ALM-01",
        "reason": "Entrada compra"
    })
    assert entry_res.status_code == 201

    # Check updated total
    p_updated = client.get(f"/api/products/{p_id}").json()
    assert p_updated["total_quantity"] == 25

    # Transfer movement
    xfer_res = client.post("/api/inventory/movements", json={
        "product_id": p_id,
        "movement_type": "TRASLADO",
        "quantity": 5,
        "origin_location_code": "ALM-01",
        "destination_location_code": "REC-01",
        "reason": "Traslado a zona de recogida"
    })
    assert xfer_res.status_code == 201

    # Exit excess movement (should fail)
    exit_fail = client.post("/api/inventory/movements", json={
        "product_id": p_id,
        "movement_type": "SALIDA",
        "quantity": 100,
        "origin_location_code": "ALM-01",
        "reason": "Salida excesiva"
    })
    assert exit_fail.status_code == 400

def test_order_creation_reservation_and_cancellation():
    prod = client.post("/api/products", json={
        "sku": "SKU-ORD-01",
        "name": "Producto Pedido",
        "default_location_code": "ALM-01",
        "initial_quantity": 10
    }).json()

    # Create order reserving 4 units
    order_res = client.post("/api/orders", json={
        "product_id": prod["id"],
        "requested_quantity": 4,
        "origin_location_code": "ALM-01",
        "destination_location_code": "ENT-01",
        "priority": "Alta"
    })
    assert order_res.status_code == 201
    order = order_res.json()
    assert order["status"] == "Reservada"

    # Verify product available quantity decreased
    p_after_ord = client.get(f"/api/products/{prod['id']}").json()
    assert p_after_ord["reserved_quantity"] == 4
    assert p_after_ord["available_quantity"] == 6

    # Cancel order and verify reservation release
    cancel_res = client.post(f"/api/orders/{order['id']}/cancel?reason=Cliente%20cancela")
    assert cancel_res.status_code == 200

    p_after_cancel = client.get(f"/api/products/{prod['id']}").json()
    assert p_after_cancel["reserved_quantity"] == 0
    assert p_after_cancel["available_quantity"] == 10

def test_mission_flow_and_idempotent_events():
    prod = client.post("/api/products", json={
        "sku": "SKU-MIS-01",
        "name": "Producto Misión",
        "default_location_code": "ALM-01",
        "initial_quantity": 8
    }).json()

    order = client.post("/api/orders", json={
        "product_id": prod["id"],
        "requested_quantity": 2,
        "origin_location_code": "REC-01",
        "destination_location_code": "ENT-01"
    }).json()

    # Assign mission
    mission = client.post("/api/missions", json={
        "order_id": order["id"],
        "assigned_route_id": "RUTA_A_B"
    }).json()
    m_id = mission["id"]

    # Dispatch mission
    client.post(f"/api/missions/{m_id}/events", json={
        "event_key": "EVT-DISPATCH-1",
        "event_type": "DISPATCHED",
        "description": "Robot inicia marcha"
    })

    # Pickup confirmation
    client.post(f"/api/missions/{m_id}/events", json={
        "event_key": "EVT-PICKUP-1",
        "event_type": "CONFIRM_PICKUP",
        "description": "Carga recogida en REC-01"
    })

    # Duplicate pickup event call (idempotency check)
    dup_evt = client.post(f"/api/missions/{m_id}/events", json={
        "event_key": "EVT-PICKUP-1",
        "event_type": "CONFIRM_PICKUP",
        "description": "Carga recogida repetida"
    }).json()
    assert dup_evt["event_key"] == "EVT-PICKUP-1"

    # Delivery confirmation
    client.post(f"/api/missions/{m_id}/events", json={
        "event_key": "EVT-DELIVER-1",
        "event_type": "CONFIRM_DELIVERY",
        "description": "Entrega realizada en ENT-01"
    })

    m_final = client.get(f"/api/missions/{m_id}").json()
    assert m_final["status"] == "Completada"
    assert m_final["order"]["status"] == "Completada"
