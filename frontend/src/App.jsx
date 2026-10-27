import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StatusPanel } from './components/StatusPanel';
import { SensorsVisualizer } from './components/SensorsVisualizer';
import { MotorsMonitor } from './components/MotorsMonitor';
import { ControlPanel } from './components/ControlPanel';
import { EventLog } from './components/EventLog';
import { serialService } from './services/serialService';
import { demoService } from './services/demoService';

export default function App() {
  const [connectionStatus, setConnectionStatus] = useState('desconectado'); // 'desconectado' | 'conectado' | 'error'
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [baudRate, setBaudRate] = useState(9600);
  const [telemetry, setTelemetry] = useState({
    status: 'detenido',
    left: 0,
    center: 0,
    right: 0,
    dir: 'detenido',
    mLeft: 0,
    mRight: 0,
    buzzer: false
  });
  const [events, setEvents] = useState([]);

  const addEvent = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setEvents((prev) => [
      { id: Date.now() + Math.random(), timestamp, message, type },
      ...prev.slice(0, 49) // Keep last 50 events
    ]);
  }, []);

  const webSerialSupported = serialService.isSupported();

  // Listen to telemetry data stream
  useEffect(() => {
    const handleTelemetry = (data) => {
      setTelemetry((prev) => {
        // Log state changes
        if (prev.status !== data.status) {
          addEvent(`Cambio de estado del robot: ${prev.status} -> ${data.status}`, 'info');
        }
        if (prev.dir !== data.dir && data.dir !== 'detenido') {
          addEvent(`Dirección de motores: ${data.dir.toUpperCase()}`, 'info');
        }
        return data;
      });
    };

    if (isDemoMode) {
      demoService.onData(handleTelemetry);
    } else {
      serialService.onData(handleTelemetry);
    }
  }, [isDemoMode, addEvent]);

  // Handle Serial Disconnections & Errors
  useEffect(() => {
    serialService.onDisconnect((reason) => {
      setConnectionStatus('desconectado');
      setTelemetry({
        status: 'detenido',
        left: 0,
        center: 0,
        right: 0,
        dir: 'detenido',
        mLeft: 0,
        mRight: 0,
        buzzer: false
      });
      addEvent(`Conexión perdida: ${reason}`, 'error');
    });

    serialService.onError((errStr) => {
      addEvent(errStr, 'error');
    });
  }, [addEvent]);

  // Connect Serial USB
  const handleConnect = async () => {
    try {
      addEvent(`Solicitando conexión en puerto USB a ${baudRate} baudios...`, 'info');
      await serialService.connect(baudRate);
      setConnectionStatus('conectado');
      addEvent('Conexión serial establecida correctamente.', 'success');
    } catch (err) {
      setConnectionStatus('error');
      addEvent(`Fallo de conexión: ${err.message}`, 'error');
    }
  };

  // Disconnect Serial USB
  const handleDisconnect = async () => {
    try {
      await serialService.disconnect();
      setConnectionStatus('desconectado');
      addEvent('Conexión serial cerrada.', 'info');
    } catch (err) {
      addEvent(`Error al desconectar: ${err.message}`, 'error');
    }
  };

  // Toggle Demo Mode
  const handleToggleDemo = () => {
    if (isDemoMode) {
      demoService.stop();
      setIsDemoMode(false);
      setTelemetry({
        status: 'detenido',
        left: 0,
        center: 0,
        right: 0,
        dir: 'detenido',
        mLeft: 0,
        mRight: 0,
        buzzer: false
      });
      addEvent('Modo Demostración desactivado.', 'info');
    } else {
      if (connectionStatus === 'conectado') {
        serialService.disconnect();
      }
      setIsDemoMode(true);
      demoService.start();
      addEvent('Modo Demostración simulado iniciado.', 'warning');
    }
  };

  // Command handlers
  const sendRobotCommand = async (cmd, label) => {
    if (isDemoMode) {
      demoService.sendCommand(cmd);
      addEvent(`[DEMO] Comando enviado: ${label}`, 'info');
      return;
    }

    if (connectionStatus !== 'conectado') {
      addEvent(`No se puede enviar '${label}': Carrito no conectado`, 'error');
      return;
    }

    try {
      await serialService.sendCommand(cmd);
      addEvent(`Comando enviado al Arduino: ${label}`, 'success');
    } catch (err) {
      addEvent(`Error enviando comando '${label}': ${err.message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Header
        isConnected={connectionStatus === 'conectado'}
        isDemoMode={isDemoMode}
        baudRate={baudRate}
        setBaudRate={setBaudRate}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleDemo={handleToggleDemo}
        webSerialSupported={webSerialSupported}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main Status & Sensor Visualization) */}
        <div className="lg:col-span-2 space-y-6">
          <StatusPanel
            connectionStatus={connectionStatus}
            robotStatus={telemetry.status}
            isDemoMode={isDemoMode}
          />

          <SensorsVisualizer
            left={telemetry.left}
            center={telemetry.center}
            right={telemetry.right}
          />

          <MotorsMonitor
            mLeft={telemetry.mLeft}
            mRight={telemetry.mRight}
            dir={telemetry.dir}
          />
        </div>

        {/* Right Column (Controls & Event Log) */}
        <div className="lg:col-span-1 space-y-6 flex flex-col justify-between">
          <ControlPanel
            isConnected={connectionStatus === 'conectado'}
            isDemoMode={isDemoMode}
            buzzerActive={Boolean(telemetry.buzzer)}
            onStart={() => sendRobotCommand('START', 'Iniciar Seguimiento')}
            onStop={() => sendRobotCommand('STOP', 'Parada de Emergencia')}
            onToggleBuzzer={() =>
              sendRobotCommand(
                telemetry.buzzer ? 'BUZZER_OFF' : 'BUZZER_ON',
                telemetry.buzzer ? 'Apagar Zumbador' : 'Activar Zumbador'
              )
            }
            onMonitorMode={() => sendRobotCommand('MONITOR', 'Modo Monitoreo')}
          />

          <div className="flex-1">
            <EventLog events={events} onClear={() => setEvents([])} />
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-6 text-center text-xs text-slate-600">
        RoboTrack PlatformIO & React Control Interface &copy; {new Date().getFullYear()} - Jesus Vanegas & Ivan Carrasco
      </footer>
    </div>
  );
}
