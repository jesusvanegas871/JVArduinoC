# RoboTrack - Panel de Control & Telemetría para Carrito Seguidor de Línea

Este repositorio contiene la solución completa de firmware (C++ / PlatformIO) y la aplicación web frontend de monitoreo en tiempo real (**RoboTrack**) para un carrito robótico seguidor de línea basado en **Arduino UNO**.

---

## 1. Arquitectura del Proyecto

```text
.
├── platformio.ini       # Configuración de PlatformIO para Arduino UNO
├── src/
│   └── main.cpp         # Firmware C++ (Control L298N, 3x IR, Buzzer y Protocolo Serial JSON)
├── frontend/            # Panel de Control Web en React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/  # Header, StatusPanel, SensorsVisualizer, MotorsMonitor, ControlPanel, EventLog
│   │   ├── services/    # serialService (Web Serial API) y demoService (Simulador)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 2. Hardware y Conexiones Arduino UNO

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

## 3. Protocolo de Comunicación Serial

La comunicación opera a **9600 baudios** por defecto mediante el puerto USB nativo de Arduino (`Serial`).

### A. Telemetría Enviada por Arduino (Frecuencia: ~100 ms)
El Arduino transmite continuamente líneas de JSON con el estado en tiempo real:
```json
{
  "status": "seguimiento",
  "left": 0,
  "center": 1,
  "right": 0,
  "dir": "adelante",
  "mLeft": 180,
  "mRight": 180,
  "buzzer": false
}
```

* `status`: `detenido`, `seguimiento`, `buscando`, `monitoreo`.
* `left`, `center`, `right`: `1` (Línea negra detectada - LOW) o `0` (Fondo claro - HIGH).
* `dir`: `adelante`, `izquierda`, `derecha`, `detenido`.
* `mLeft`, `mRight`: Velocidad solicitada PWM (0 a 255).
* `buzzer`: `true` o `false`.

### B. Comandos Enviados desde el Frontend al Arduino
Los comandos se envían con salto de línea (`\n`):

* `START`: Inicia el algoritmo autónomo de seguimiento de línea.
* `STOP`: Detiene inmediatamente los motores y pasa a estado `detenido`.
* `MONITOR`: Detiene los motores y transmite únicamente la lectura de sensores.
* `BUZZER_ON`: Activa la alerta sonora en el pin D11.
* `BUZZER_OFF`: Desactiva la alerta sonora.

---

## 4. Instrucciones de Instalación y Ejecución

### A. Cargar el Firmware al Arduino UNO
1. Instala **VS Code** con la extensión **PlatformIO IDE**.
2. Conecta el Arduino UNO mediante cable USB a la computadora.
3. Abre la carpeta del proyecto en VS Code.
4. Compila y sube el firmware seleccionando `Upload` en PlatformIO.

### B. Ejecutar el Frontend Web
1. Abre una terminal en la carpeta `frontend/`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Abre la aplicación en Google Chrome, MS Edge u Opera navegando a `http://localhost:5173`.

---

## 5. Guía de Uso del Frontend (RoboTrack)

1. **Conexión Real mediante Web Serial API (USB):**
   * Selecciona el Baud Rate (**9600** por defecto).
   * Haz clic en **Conectar USB**.
   * Selecciona el puerto serie correspondiente a tu Arduino UNO en el diálogo del navegador.
   * Una vez conectado, la interfaz mostrará la telemetría enviada en tiempo real.

2. **Modo Demostración (Simulado):**
   * Si no tienes el hardware físico conectado o usas un navegador no compatible con Web Serial, haz clic en **Activar Demo**.
   * Podrás probar la respuesta gráfica de sensores, velocímetros y el historial de eventos sin enviar comandos al puerto físico.

3. **Parada de Emergencia:**
   * El botón rojo **PARADA DE EMERGENCIA** tiene máxima prioridad visual y envía de inmediato la instrucción `STOP` para desenergizar los motores en caso de desviación.

---

## 6. Pruebas y Verificación

* **Pruebas Sin Hardware (Simulación):** Se activan mediante el botón **Activar Demo**. Permiten validar la renderización responsive, la posición gráfica de la línea, la animación de velocidad de motores y la bitácora de eventos.
* **Pruebas Con Hardware Físico:** Conectar el Arduino UNO por USB, encender la batería del L298N y pulsar **Conectar USB**. Probar **Iniciar Seguimiento** sobre una pista de cinta aislante negra y presionar **PARADA DE EMERGENCIA** para verificar la detención inmediata.
