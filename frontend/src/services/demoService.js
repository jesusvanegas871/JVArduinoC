/**
 * Service to generate simulated telemetry for RoboTrack in Demo Mode.
 * Ensures simulated data is isolated and does not affect physical hardware.
 */

class DemoService {
  constructor() {
    this.intervalId = null;
    this.isSimulating = false;
    this.onDataCallback = null;
    this.simState = {
      mode: 'AUTO', // AUTO, MANUAL, RUTAS
      status: 'detenido',
      left: 0,
      center: 0,
      right: 0,
      dir: 'detenido',
      mLeft: 0,
      mRight: 0,
      speed: 180,
      buzzer: false,
      routeStep: 0,
      routeTotal: 0,
      lastRef: 'Inicio',
      isDemo: true
    };
    this.routeBuffer = [];
    this.routeStepIndex = 0;
    this.stepTicks = 0;
    this.lastManualCmdTime = 0;
    this.stepCount = 0;
  }

  start() {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.simState.mode = 'AUTO';
    this.simState.status = 'detenido';
    this.simState.dir = 'detenido';
    this.simState.mLeft = 0;
    this.simState.mRight = 0;
    this.simState.routeStep = 0;
    this.simState.routeTotal = 0;
    this.simState.lastRef = 'Inicio';
    this.stepCount = 0;

    this.intervalId = setInterval(() => {
      this.updateSimulation();
    }, 200);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isSimulating = false;
  }

  sendCommand(cmdStr) {
    if (!this.isSimulating) return;

    let cmd = cmdStr.trim().toUpperCase();
    if (cmd.startsWith('{') && cmd.endsWith('}')) {
      try {
        const obj = JSON.parse(cmd);
        cmd = obj.CMD || cmd;
      } catch (e) {
        // ignore parse error
      }
    }

    // Emergency Stop / Global Commands
    if (cmd === 'STOP' || cmd === 'EMERGENCY_STOP') {
      this.simState.status = 'detenido';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      return;
    }

    if (cmd === 'BUZZER_ON') {
      this.simState.buzzer = true;
      return;
    }
    if (cmd === 'BUZZER_OFF') {
      this.simState.buzzer = false;
      return;
    }
    if (cmd === 'MONITOR') {
      this.simState.status = 'monitoreo';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      return;
    }

    // Mode Transitions
    if (cmd === 'MODE:AUTO' || cmd === 'SET_MODE AUTO') {
      this.simState.mode = 'AUTO';
      this.simState.status = 'detenido';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      return;
    }
    if (cmd === 'MODE:MANUAL' || cmd === 'SET_MODE MANUAL') {
      this.simState.mode = 'MANUAL';
      this.simState.status = 'detenido';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      return;
    }
    if (cmd === 'MODE:RUTAS' || cmd === 'SET_MODE RUTAS') {
      this.simState.mode = 'RUTAS';
      this.simState.status = 'detenido';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      return;
    }

    // Speed setting
    if (cmd.startsWith('SPEED:')) {
      const spd = parseInt(cmd.substring(6), 10);
      if (!isNaN(spd)) {
        this.simState.speed = Math.max(100, Math.min(255, spd));
      }
      return;
    }

    // Mode Specific Commands
    if (this.simState.mode === 'AUTO') {
      if (cmd === 'START') {
        this.simState.status = 'seguimiento';
        this.simState.dir = 'adelante';
        this.simState.mLeft = this.simState.speed;
        this.simState.mRight = this.simState.speed;
      }
    } else if (this.simState.mode === 'MANUAL') {
      if (cmd.startsWith('MANUAL:')) {
        const sub = cmd.substring(7);
        this.lastManualCmdTime = Date.now();
        this.simState.status = 'manual';

        if (sub === 'FW' || sub === 'FORWARD') {
          this.simState.dir = 'adelante';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;
        } else if (sub === 'BW' || sub === 'BACKWARD') {
          this.simState.dir = 'atras';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;
        } else if (sub === 'LEFT') {
          this.simState.dir = 'izquierda';
          this.simState.mLeft = Math.round(this.simState.speed / 2);
          this.simState.mRight = this.simState.speed;
        } else if (sub === 'RIGHT') {
          this.simState.dir = 'derecha';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = Math.round(this.simState.speed / 2);
        } else if (sub === 'SPIN_LEFT') {
          this.simState.dir = 'izquierda';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;
        } else if (sub === 'SPIN_RIGHT') {
          this.simState.dir = 'derecha';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;
        } else if (sub === 'STOP') {
          this.simState.status = 'detenido';
          this.simState.dir = 'detenido';
          this.simState.mLeft = 0;
          this.simState.mRight = 0;
        }
      }
    } else if (this.simState.mode === 'RUTAS') {
      if (cmd === 'ROUTE:CLEAR') {
        this.routeBuffer = [];
        this.routeStepIndex = 0;
        this.simState.routeStep = 0;
        this.simState.routeTotal = 0;
        this.simState.lastRef = 'Inicio';
        this.simState.status = 'detenido';
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
      } else if (cmd.startsWith('ROUTE:ADD:')) {
        const step = cmd.substring(10);
        this.routeBuffer.push(step);
        this.simState.routeTotal = this.routeBuffer.length;
        this.simState.routeStep = 1;
      } else if (cmd === 'ROUTE:START' || cmd === 'START') {
        if (this.routeBuffer.length > 0) {
          this.routeStepIndex = 0;
          this.stepTicks = 0;
          this.simState.status = 'ejecutando_ruta';
          this.simState.routeStep = 1;
          this.simState.routeTotal = this.routeBuffer.length;
          this.simState.lastRef = 'Inicio';
        }
      } else if (cmd === 'ROUTE:PAUSE' || cmd === 'ROUTE:STOP') {
        this.simState.status = 'detenido';
        this.simState.dir = 'detenido';
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
      }
    }
  }

  updateSimulation() {
    this.stepCount++;

    // Safety Timeout Check in MANUAL mode (500ms timeout)
    if (this.simState.mode === 'MANUAL' && this.simState.status === 'manual') {
      if (Date.now() - this.lastManualCmdTime > 550) {
        this.simState.status = 'detenido';
        this.simState.dir = 'detenido';
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
      }
    }

    if (this.simState.mode === 'AUTO') {
      if (this.simState.status === 'seguimiento') {
        const cycle = this.stepCount % 40;
        if (cycle < 15) {
          this.simState.left = 0;
          this.simState.center = 1;
          this.simState.right = 0;
          this.simState.dir = 'adelante';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;
          this.simState.status = 'seguimiento';
        } else if (cycle < 25) {
          this.simState.left = 1;
          this.simState.center = 0;
          this.simState.right = 0;
          this.simState.dir = 'izquierda';
          this.simState.mLeft = Math.round(this.simState.speed / 2);
          this.simState.mRight = this.simState.speed;
          this.simState.status = 'seguimiento';
        } else if (cycle < 35) {
          this.simState.left = 0;
          this.simState.center = 0;
          this.simState.right = 1;
          this.simState.dir = 'derecha';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = Math.round(this.simState.speed / 2);
          this.simState.status = 'seguimiento';
        } else {
          this.simState.left = 0;
          this.simState.center = 0;
          this.simState.right = 0;
          this.simState.dir = 'izquierda';
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;
          this.simState.status = 'buscando';
        }
      } else if (this.simState.status === 'monitoreo') {
        this.simState.left = Math.random() > 0.5 ? 1 : 0;
        this.simState.center = Math.random() > 0.5 ? 1 : 0;
        this.simState.right = Math.random() > 0.5 ? 1 : 0;
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
        this.simState.dir = 'detenido';
      } else {
        this.simState.left = 0;
        this.simState.center = 0;
        this.simState.right = 0;
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
        this.simState.dir = 'detenido';
      }
    } else if (this.simState.mode === 'MANUAL') {
      if (this.simState.status === 'detenido') {
        this.simState.left = 0;
        this.simState.center = 0;
        this.simState.right = 0;
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
        this.simState.dir = 'detenido';
      }
    } else if (this.simState.mode === 'RUTAS') {
      if (this.simState.status === 'ejecutando_ruta') {
        this.stepTicks++;
        if (this.routeStepIndex >= this.routeBuffer.length) {
          this.simState.status = 'ruta_completada';
          this.simState.dir = 'detenido';
          this.simState.mLeft = 0;
          this.simState.mRight = 0;
          this.simState.lastRef = 'Destino Alcanzado';
        } else {
          const activeStep = this.routeBuffer[this.routeStepIndex];
          this.simState.routeStep = this.routeStepIndex + 1;
          this.simState.mLeft = this.simState.speed;
          this.simState.mRight = this.simState.speed;

          if (activeStep === 'FW_REF') {
            this.simState.dir = 'adelante';
            if (this.stepTicks < 8) {
              this.simState.left = 0;
              this.simState.center = 1;
              this.simState.right = 0;
            } else {
              // Reached intersection!
              this.simState.left = 1;
              this.simState.center = 1;
              this.simState.right = 1;
              this.simState.lastRef = `Intersección ${this.routeStepIndex + 1}`;
              this.routeStepIndex++;
              this.stepTicks = 0;
            }
          } else if (activeStep === 'TURN_LEFT') {
            this.simState.dir = 'izquierda';
            if (this.stepTicks < 5) {
              this.simState.left = 1;
              this.simState.center = 0;
              this.simState.right = 0;
            } else {
              this.simState.left = 0;
              this.simState.center = 1;
              this.simState.right = 0;
              this.simState.lastRef = 'Giro Izquierda OK';
              this.routeStepIndex++;
              this.stepTicks = 0;
            }
          } else if (activeStep === 'TURN_RIGHT') {
            this.simState.dir = 'derecha';
            if (this.stepTicks < 5) {
              this.simState.left = 0;
              this.simState.center = 0;
              this.simState.right = 1;
            } else {
              this.simState.left = 0;
              this.simState.center = 1;
              this.simState.right = 0;
              this.simState.lastRef = 'Giro Derecha OK';
              this.routeStepIndex++;
              this.stepTicks = 0;
            }
          } else if (activeStep === 'STOP') {
            this.simState.status = 'ruta_completada';
            this.simState.dir = 'detenido';
            this.simState.mLeft = 0;
            this.simState.mRight = 0;
            this.simState.lastRef = 'Destino';
          }
        }
      } else {
        this.simState.mLeft = 0;
        this.simState.mRight = 0;
        this.simState.dir = 'detenido';
      }
    }

    if (this.onDataCallback) {
      this.onDataCallback({ ...this.simState });
    }
  }

  onData(cb) {
    this.onDataCallback = cb;
  }
}

export const demoService = new DemoService();
