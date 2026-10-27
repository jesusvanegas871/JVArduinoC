import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

from backend.main import app
from backend.database import Base, get_db
from backend.models import Product, Location, CycleCountSchedule, CycleCountScheduleItem

# Setup test DB file for isolation
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_excel_counts.db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db_excel():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db_excel
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Create default location
    if not db.query(Location).filter(Location.code == "ALM-01").first():
        db.add(Location(code="ALM-01", name="Almacén Principal", type="ALMACEN"))
        db.commit()

    db.close()
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client_fixture():
    return TestClient(app)

def test_excel_preview_productos_a_incluir(client_fixture):
    client = client_fixture
    excel_path = "DATA FINAL ENTREGAR2026.xlsx"
    assert os.path.exists(excel_path)

    with open(excel_path, "rb") as f:
        response = client.post(
            "/api/import/preview",
            files={"file": ("DATA FINAL ENTREGAR2026.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"sheet_name": "PRODUCTOS A INCLUIR"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "DATA FINAL ENTREGAR2026.xlsx"
    assert data["sheet_name"] == "PRODUCTOS A INCLUIR"
    assert data["valid_rows_count"] == 11
    assert data["to_create_count"] == 11
    assert len(data["preview_rows"]) == 11

    # Verify first row preservation of code
    first_row = data["preview_rows"][0]
    assert first_row["sku"] == "200040"
    assert first_row["name"] == "Slot nut        IPM-VN-05-12/M5-ST"
    assert first_row["category"] == "Equipos de audio"

def test_excel_preview_data_ventas(client_fixture):
    client = client_fixture
    excel_path = "DATA FINAL ENTREGAR2026.xlsx"
    with open(excel_path, "rb") as f:
        response = client.post(
            "/api/import/preview",
            files={"file": ("DATA FINAL ENTREGAR2026.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"sheet_name": "DATA VENTAS"}
        )

    assert response.status_code == 200
    data = response.json()
    assert data["sheet_name"] == "DATA VENTAS"
    assert data["valid_rows_count"] > 1000
    # Checks unique codes to create
    assert data["to_create_count"] == 112

def test_confirm_import_and_catalog_metrics(client_fixture):
    client = client_fixture
    # Preview PRODUCTOS A INCLUIR
    excel_path = "DATA FINAL ENTREGAR2026.xlsx"
    with open(excel_path, "rb") as f:
        prev_res = client.post(
            "/api/import/preview",
            files={"file": ("DATA FINAL ENTREGAR2026.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
            data={"sheet_name": "PRODUCTOS A INCLUIR"}
        )

    preview_rows = prev_res.json()["preview_rows"]

    # Confirm import
    conf_res = client.post(
        "/api/import/confirm",
        json={
            "filename": "DATA FINAL ENTREGAR2026.xlsx",
            "sheet_name": "PRODUCTOS A INCLUIR",
            "preview_rows": preview_rows,
            "user_id": "test_admin"
        }
    )

    assert conf_res.status_code == 200
    res_data = conf_res.json()
    assert res_data["created_count"] == 11
    assert res_data["catalog_metrics"]["total_existing_in_db"] == 11
    assert res_data["catalog_metrics"]["total_missing_for_600"] == 589 # 600 - 11

    # Check imported products DO NOT have incremented physical counts (annual_physical_count == 0)
    db = TestingSessionLocal()
    p = db.query(Product).filter(Product.sku == "200040").first()
    assert p is not None
    assert p.annual_physical_count == 0
    assert p.total_quantity == 0 # Projections do not fake physical inventory
    db.close()

def test_cycle_count_weekly_schedule_generation_and_limits(client_fixture):
    client = client_fixture
    # Seed 70 products to test 57 target selection
    db = TestingSessionLocal()
    for i in range(1, 71):
        p = Product(
            sku=f"SKU-TEST-{i:03d}",
            name=f"Producto Test {i}",
            min_stock=5,
            annual_physical_count=0
        )
        db.add(p)
    db.commit()
    db.close()

    # Generate schedule for 57 items
    response = client.post(
        "/api/cycle-counts/generate",
        json={"week_number": 1, "year": 2026, "target_count": 57}
    )

    assert response.status_code == 201
    sched = response.json()
    assert sched["scheduled_count"] == 57
    assert len(sched["items"]) == 57
    assert sched["warning_message"] is None

    # Check uniqueness of products in the weekly schedule
    product_ids = [item["product_id"] for item in sched["items"]]
    assert len(product_ids) == len(set(product_ids))

    # Complete 1 item count physical count
    first_item_id = sched["items"][0]["id"]
    comp_res = client.post(f"/api/cycle-counts/items/{first_item_id}/complete?user_id=operador1&notes=Conteo%20ok")
    assert comp_res.status_code == 200
    comp_data = comp_res.json()
    assert comp_data["status"] == "FINALIZADO"
    assert comp_data["product"]["annual_physical_count"] == 1

def test_annual_physical_count_max_5_limit(client_fixture):
    client = client_fixture
    db = TestingSessionLocal()
    # Create product with 5 completed physical counts
    p = Product(
        sku="SKU-MAX-COUNT",
        name="Producto Max Conteo",
        annual_physical_count=5
    )
    db.add(p)
    db.commit()

    # Create dummy schedule and item manually
    sched = CycleCountSchedule(week_number=2, year=2026, scheduled_count=1)
    db.add(sched)
    db.flush()

    item = CycleCountScheduleItem(schedule_id=sched.id, product_id=p.id, status="PENDIENTE")
    db.add(item)
    db.commit()

    item_id = item.id
    db.close()

    # Attempting to complete count on product with 5 counts should raise 400
    res = client.post(f"/api/cycle-counts/items/{item_id}/complete")
    assert res.status_code == 400
    assert "límite máximo anual de 5 conteos físicos" in res.json()["detail"]
