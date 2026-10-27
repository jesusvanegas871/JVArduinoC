# RoboTrack - Panel de Control, Telemetría & Rutas para Carrito Seguidor de Línea

Este repositorio contiene la solución completa de firmware C++ (PlatformIO) y la aplicación web frontend en React + Vite + Tailwind CSS (**RoboTrack v2.0 Multimodo**) para un carrito robótico basado en **Arduino UNO**.

---

## 1. Arquitectura del Proyecto y Modos de Funcionamiento

RoboTrack integra **tres modos de funcionamiento seleccionables** desde la interfaz web, manteniendo un único controlador de motores en el firmware con parada previa antes de cambiar de modo:

1. **Modo 1: AUTO — Seguidor de Línea**
   - Mantiene la lógica de seguimiento de línea negra mediante los 3 sensores infrarrojos.
   - Muestra las lecturas digitales en tiempo real.
   - Inicia (`START`), detiene (`STOP`) e informa cuando la línea se pierde (`buscando`).

2. **Modo 2: MANUAL — Control Direccional**
   - Controles direccionales para avanzar, retroceder, girar e incluso rotar sobre su propio eje.
   - Regulación de velocidad PWM de motores mediante comando `SPEED:<100..255>`.
   - Soporte para control por teclado (**WASD / Flechas / Espacio** para Parada de Emergencia).
   - **Tiempo límite de seguridad (Timeout 500ms):** El Arduino detiene automáticamente los motores si dejan de llegar comandos válidos.

3. **Modo 3: RUTAS — Recorridos y Destinos**
   - Mapa esquemático visual de la pista con origen, intersecciones de referencia y destinos.
   - Secuenciador de rutas: avanzar hasta intersección, girar a la izquierda, girar a la derecha y detenerse.
   - Gestión de rutas: plantillas predefinidas y guardado de rutas personalizadas en `localStorage`.
   - Monitor de progreso de la ruta, número de paso activo y última referencia detectada.

---

## 2. Inspección del Hardware y Requisitos de Navegación

### Análisis de Sensores Infrarrojos (3x IR)
El robot cuenta con 3 sensores infrarrojos digitales colocados en línea frontal (**Pin D8, D9, D10**):

* **Capacidades Físicas Reales:**
  - **Seguimiento de Línea:** Diferencia entre línea negra (`1` / `LOW`) y fondo claro (`0` / `HIGH`).
  - **Detección de Intersecciones:** Detecta cruces en T o en X cuando los tres sensores detectan línea negra (`1 1 1`).
  - **Decisiones de Giro:** Ejecuta giros programados en cruces rotando hasta que el sensor central se relocaliza sobre la línea.

* **Documentación de Limitaciones Hardware:**
  - **Sin Odometría ni Encoders:** El chasis no dispone de encoders en las ruedas para medir distancia en centímetros o metros.
  - **Sin Posicionamiento Absoluto:** No incluye GPS interno, IMU ni sensor ultrasónico para evasión de obstáculos en espacio libre.
  - **Navegación Referenciada:** La navegación física se realiza estrictamente sobre líneas marcadas en el suelo e intersecciones detectadas. No se simula odometría libre inexistente.

---

## 3. Pinout y Conexiones Arduino UNO

| Componente | Pin Arduino UNO | Descripción |
| :--- | :--- | :--- |
| **Driver L298N** | `D5` (PWM) | Motor Izquierdo ENA |
| | `D2` | Motor Izquierdo IN1 |
| | `D3` | Motor Izquierdo IN2 |
| | `D4` | Motor Derecho IN3 |
| | `D7` | Motor Derecho IN4 |
| | `D6` (PWM) | Motor Derecho ENB |
| **Sensores IR** | `D8` | Sensor Infrarrojo Izquierdo |
| | `D9` | Sensor Infrarrojo Central |
| | `D10` | Sensor Infrarrojo Derecho |
| **Zumbador** | `D11` | Buzzer piezoeléctrico |
| **Alimentación** | Batería 9V / 12V | Driver L298N y Arduino (VCC/GND común) |

---

## 4. Protocolo de Comunicación Serial

La comunicación opera a **9600 baudios** por defecto mediante la Web Serial API (`Serial`).

### A. Telemetría Enviada por Arduino (JSON continuo cada 100 ms)
```json
{
  "mode": "AUTO",
  "status": "seguimiento",
  "left": 0,
  "center": 1,
  "right": 0,
  "dir": "adelante",
  "mLeft": 180,
  "mRight": 180,
  "speed": 180,
  "buzzer": false,
  "routeStep": 1,
  "routeTotal": 3,
  "lastRef": "Intersección 1"
}
```

### B. Comandos Seriales Soportados por el Firmware

* **Comandos Globales:**
  - `STOP` / `EMERGENCY_STOP`: Detiene motores inmediatamente en cualquier modo.
  - `MODE:AUTO`: Cambia a modo autónomo seguidor de línea.
  - `MODE:MANUAL`: Cambia a modo de control manual direccional.
  - `MODE:RUTAS`: Cambia a modo de ejecución de rutas.
  - `SPEED:<valor>`: Establece la velocidad PWM (rango 100 a 255).
  - `BUZZER_ON` / `BUZZER_OFF`: Controla la alerta sonora (D11).
  - `MONITOR`: Mantiene motores detenidos y transmite solo lectura de sensores.

* **Comandos de Modo MANUAL:**
  - `MANUAL:FW`: Avanza hacia adelante.
  - `MANUAL:BW`: Retrocede.
  - `MANUAL:LEFT`: Giro suave a la izquierda.
  - `MANUAL:RIGHT`: Giro suave a la derecha.
  - `MANUAL:SPIN_LEFT`: Rotación sobre su eje a la izquierda.
  - `MANUAL:SPIN_RIGHT`: Rotación sobre su eje a la derecha.
  - `MANUAL:STOP`: Detiene movimiento manual.

* **Comandos de Modo RUTAS:**
  - `ROUTE:CLEAR`: Limpia el búfer de pasos en el firmware.
  - `ROUTE:ADD:<PASO>`: Añade instrucción (`FW_REF`, `TURN_LEFT`, `TURN_RIGHT`, `STOP`).
  - `ROUTE:START`: Inicia la ejecución secuencial de la ruta cargada.
  - `ROUTE:PAUSE` / `ROUTE:STOP`: Detiene la ejecución de la ruta.

---

## 5. Instrucciones de Compilación y Ejecución

### A. Cargar Firmware C++ al Arduino UNO
```bash
# Compilar firmware con PlatformIO
pio run

# Ssubir al Arduino UNO conectado
pio run --target upload
```

### B. Ejecutar el Frontend Web
```bash
cd frontend
npm install
npm run dev
```
Abre en tu navegador (Chrome, Edge u Opera): `http://localhost:5173`

---

## 6. Guía de Pruebas Físicas y Demostración

1. **Pruebas en Modo AUTO (Seguidor de línea):**
   - Ubica el carrito sobre una pista con cinta aislante negra.
   - Selecciona **AUTO — Seguidor** en la barra superior.
   - Haz clic en **Iniciar Seguimiento**. Verifica que siga la línea y que al levantar el robot pase al estado `buscando`.

2. **Pruebas en Modo MANUAL (Control direccional):**
   - Selecciona **MANUAL — Control**.
   - Ajusta el deslizador de velocidad PWM (ej. 180 PWM).
   - Utiliza las teclas **WASD / Flechas** o la cruceta en pantalla.
   - Suelta las teclas y verifica que el robot se detenga. Desconecta o interrumpe la señal para comprobar que el **timeout de 500ms** detiene los motores en el firmware.

3. **Pruebas en Modo RUTAS (Recorridos en mapa):**
   - Selecciona **RUTAS — Recorridos**.
   - Selecciona una plantilla (ej. *Ruta 1: Directo a Destino A*) o construye tu secuencia.
   - Presiona **Iniciar Ruta Programada**.
   - Observa cómo el robot avanza hasta la intersección (`1 1 1`), ejecuta el giro programado y actualiza el mapa esquemático y el porcentaje de progreso hasta completar el recorrido.

4. **Pruebas en Modo Demostración Simulado:**
   - Si no dispones del hardware físico conectado, haz clic en **Activar Demo**.
   - Podrás probar la respuesta gráfica de la interfaz en los 3 modos de forma completamente simulada e aislada del puerto físico.
