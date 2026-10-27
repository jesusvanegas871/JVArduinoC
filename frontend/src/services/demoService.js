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
      status: 'detenido',
      left: 0,
      center: 0,
      right: 0,
      dir: 'detenido',
      mLeft: 0,
      mRight: 0,
      buzzer: false,
      isDemo: true
    };
    this.stepCount = 0;
  }

  start() {
    if (this.isSimulating) return;
    this.isSimulating = true;
    this.simState.status = 'detenido';
    this.simState.dir = 'detenido';
    this.simState.mLeft = 0;
    this.simState.mRight = 0;
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

    if (cmd === 'START') {
      this.simState.status = 'seguimiento';
      this.simState.dir = 'adelante';
      this.simState.mLeft = 180;
      this.simState.mRight = 180;
    } else if (cmd === 'STOP') {
      this.simState.status = 'detenido';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
    } else if (cmd === 'BUZZER_ON') {
      this.simState.buzzer = true;
    } else if (cmd === 'BUZZER_OFF') {
      this.simState.buzzer = false;
    } else if (cmd === 'MONITOR') {
      this.simState.status = 'monitoreo';
      this.simState.dir = 'detenido';
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
    }
  }

  updateSimulation() {
    this.stepCount++;

    if (this.simState.status === 'seguimiento') {
      // Simulate typical line-following scenario cycles
      const cycle = this.stepCount % 40;
      if (cycle < 15) {
        // Moving straight on line
        this.simState.left = 0;
        this.simState.center = 1;
        this.simState.right = 0;
        this.simState.dir = 'adelante';
        this.simState.mLeft = 180;
        this.simState.mRight = 180;
        this.simState.status = 'seguimiento';
      } else if (cycle < 25) {
        // Turning left on curve
        this.simState.left = 1;
        this.simState.center = 0;
        this.simState.right = 0;
        this.simState.dir = 'izquierda';
        this.simState.mLeft = 75;
        this.simState.mRight = 150;
        this.simState.status = 'seguimiento';
      } else if (cycle < 35) {
        // Turning right on curve
        this.simState.left = 0;
        this.simState.center = 0;
        this.simState.right = 1;
        this.simState.dir = 'derecha';
        this.simState.mLeft = 150;
        this.simState.mRight = 75;
        this.simState.status = 'seguimiento';
      } else {
        // Lost line briefly -> Searching
        this.simState.left = 0;
        this.simState.center = 0;
        this.simState.right = 0;
        this.simState.dir = 'izquierda';
        this.simState.mLeft = 150;
        this.simState.mRight = 150;
        this.simState.status = 'buscando';
      }
    } else if (this.simState.status === 'monitoreo') {
      // Random sensor changes in monitoring mode
      this.simState.left = Math.random() > 0.5 ? 1 : 0;
      this.simState.center = Math.random() > 0.5 ? 1 : 0;
      this.simState.right = Math.random() > 0.5 ? 1 : 0;
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      this.simState.dir = 'detenido';
    } else {
      // Stopped
      this.simState.left = 0;
      this.simState.center = 0;
      this.simState.right = 0;
      this.simState.mLeft = 0;
      this.simState.mRight = 0;
      this.simState.dir = 'detenido';
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
