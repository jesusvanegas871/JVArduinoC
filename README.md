# RoboTrack WMS - Sistema Integrado de Gestión de Inventarios & Robótica Logística

RoboTrack WMS es un sistema web completo de gestión de almacenes (WMS - Warehouse Management System) y logística interna integrado con un vehículo de transporte robótico basado en **Arduino UNO**.

El proyecto diferencia estrictamente entre las **operaciones digitales de inventario** (órdenes, reservas, trazabilidad auditable) y las **acciones físicas del robot** (desplazamientos en línea, lectura de intersecciones por sensores IR).

---

## 1. Arquitectura General del Sistema

El sistema se compone de tres capas principales:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend React + Vite                │
│ (Dashboard, Productos, Inventario, Ubicaciones, Orders) │
└─────────────┬─────────────────────────────┬─────────────┘
              │ REST API (HTTP)             │ Web Serial / Demo
              ▼                             ▼
┌───────────────────────────┐  ┌───────────────────────────┐
│    Backend FastAPI        │  │   Arduino UNO Firmware    │
│ (SQLAlchemy + SQLite)     │  │ (Sensores IR + L298N)     │
└───────────────────────────┘  └───────────────────────────┘
```

1. **Backend FastAPI (Python & SQLAlchemy):**
   - Transacciones de inventario seguras y atómicas.
   - Gestión de stock disponible (`disponible = total - reservado`).
   - Registro auditable de movimientos de entrada, salida, traslado y ajustes.
   - Ciclo de vida completo de órdenes de transporte interno y misiones del robot.
   - Idempotencia en eventos de misiones para prevenir deducciones dobles.

2. **Frontend React + Vite + Tailwind CSS:**
   - Interfaz en español con diseño B2B oscuro y acentos verdes.
   - Módulos: **Dashboard**, **Productos**, **Inventario**, **Ubicaciones**, **Pedidos**, **Misiones** y **RoboTrack Control**.
   - Comunicación con backend FastAPI y soporte de control directo al Arduino vía **Web Serial API** y **Modo Demostración Simulado**.

3. **Firmware C++ (Arduino UNO & PlatformIO):**
   - Control de motores L298N y lectura de 3 sensores infrarrojos reflectivos.
   - Tres modos de trabajo: **AUTO** (seguidor de línea), **MANUAL** (control direccional) y **RUTAS** (secuenciación en intersecciones).

---

## 2. Estructura de la Base de Datos

- **`categories`**: Categorización del catálogo.
- **`products`**: Productos con SKU único, nombre, unidad de medida, total, reservado, disponible (propiedad calculada) y stock mínimo.
- **`locations`**: Ubicaciones del almacén (`ALM-01`, `REC-01`, `DES-01`, `ENT-01`).
- **`stock_locations`**: Cantidad de un producto por ubicación específica.
- **`inventory_movements`**: Registro auditable histórico (ENTRADA, SALIDA, TRASLADO, AJUSTE, RECOGIDA, ENTREGA).
- **`orders`**: Solicitudes de transporte interno con trazabilidad de estado (Pendiente, Reservada, Asignada, En ejecución, Completada, Cancelada, Fallida).
- **`missions`**: Misiones asociadas a órdenes para asignación al robot RoboTrack.
- **`mission_events`**: Historial de eventos de ejecución física y digital con claves de idempotencia.

---

## 3. Guía de Inicio y Ejecución

### Requisitos Previos
- Python 3.10+
- Node.js 18+ y npm

### A. Iniciar el Backend (FastAPI)
```bash
# Crear entorno virtual e instalar dependencias (si aplica)
python3 -m venv venv
./venv/bin/pip install fastapi uvicorn sqlalchemy pydantic pytest httpx

# Ejecutar el servidor backend en http://localhost:8000
PYTHONPATH=. ./venv/bin/uvicorn backend.main:app --reload --port 8000
```

### B. Iniciar el Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Abre en el navegador: `http://localhost:5173`

### C. Pruebas Unitarias Automatizadas
```bash
# Ejecutar suite completa de pruebas backend con pytest
PYTHONPATH=. ./venv/bin/pytest backend/tests/test_api.py
```

---

## 4. Flujo Operativo Completo (Desde Producto hasta Misión)

1. **Creación de Producto:** El usuario registra un producto con su SKU único en la pestaña *Productos*.
2. **Entrada de Mercancía:** Se registra la cantidad en una ubicación (ej. `ALM-01`) mediante la pestaña *Inventario*.
3. **Creación de Orden de Transporte:** En *Pedidos*, un operador solicita llevar $N$ unidades de `ALM-01` a `ENT-01`. El backend verifica la disponibilidad y **reserva el stock de forma transaccional**.
4. **Asignación de Misión:** En *Misiones*, se vincula la orden a una ruta compatible del robot RoboTrack.
5. **Despacho del Robot:** Se envía la secuencia de ruta al Arduino vía Web Serial / Demo.
6. **Confirmación de Recogida:** Al llegar a origen, el operador o evento de sistema confirma la recogida. El backend registra un movimiento auditable de `RECOGIDA`.
7. **Confirmación de Entrega:** Al llegar a destino, se confirma la entrega. El backend registra la `ENTREGA`, incrementa el stock en destino y liquida la reserva.

---

## 5. Capacidades Reales del Hardware vs Limitaciones

* **Capacidades Reales del Robot (Arduino UNO + 3x IR):**
  - Tracking autónomo de línea negra.
  - Detección de intersecciones y giros en cruces rotando sobre el sensor central.
  - Parada de emergencia y timeout de seguridad en modo manual (500ms).

* **Limitaciones Documentadas y Confirmación Manual:**
  - **Sin Odometría ni Sensores de Carga:** El robot no posee encoders en ruedas ni balanza física para detectar si lleva una carga.
  - **Diferenciación de Ubicaciones:** Las ubicaciones de inventario son lógicas en la base de datos; la llegada del robot a una estación requiere la confirmación manual autorizada o la lectura de un cruce de referencia en la pista.

---

## 6. Resumen de Módulos Modificados / Creados

- `backend/models.py`, `backend/schemas.py`, `backend/database.py`: Estructura ORM y migración/semilla.
- `backend/routers/`: Routers REST para `products`, `inventory`, `locations`, `orders`, `missions`, `dashboard`.
- `backend/tests/test_api.py`: Pruebas de integración y unitarias de API con pytest.
- `frontend/src/services/apiService.js`: Cliente HTTP centralizado.
- `frontend/src/components/`: Componentes WMS (`DashboardModule`, `ProductsModule`, `InventoryModule`, `LocationsModule`, `OrdersModule`, `MissionsModule`).
- `frontend/src/App.jsx` y `Header.jsx`: Integración de navegación por pestañas conservando el panel RoboTrack.
