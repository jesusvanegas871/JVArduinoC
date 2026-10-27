import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { StatusPanel } from './components/StatusPanel';
import { SensorsVisualizer } from './components/SensorsVisualizer';
import { MotorsMonitor } from './components/MotorsMonitor';
import { ControlPanel } from './components/ControlPanel';
import { ManualPanel } from './components/ManualPanel';
import { RutasPanel } from './components/RutasPanel';
import { EventLog } from './components/EventLog';
import { DashboardModule } from './components/DashboardModule';
import { ProductsModule } from './components/ProductsModule';
import { ExcelImportModule } from './components/ExcelImportModule';
import { CycleCountModule } from './components/CycleCountModule';
import { InventoryModule } from './components/InventoryModule';
import { LocationsModule } from './components/LocationsModule';
import { OrdersModule } from './components/OrdersModule';
import { MissionsModule } from './components/MissionsModule';

import { serialService } from './services/serialService';
import { demoService } from './services/demoService';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'productos' | 'inventario' | 'ubicaciones' | 'pedidos' | 'misiones' | 'robotrack'
  const [connectionStatus, setConnectionStatus] = useState('desconectado'); // 'desconectado' | 'conectado' | 'error'
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [baudRate, setBaudRate] = useState(9600);
  const [activeMode, setActiveMode] = useState('AUTO'); // 'AUTO' | 'MANUAL' | 'RUTAS'

  const [telemetry, setTelemetry] = useState({
    mode: 'AUTO',
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
    lastRef: 'Inicio'
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

  // Listen to telemetry data stream from serial or demo
  useEffect(() => {
    const handleTelemetry = (data) => {
      setTelemetry((prev) => {
        if (data.mode && data.mode !== prev.mode) {
          setActiveMode(data.mode);
          addEvent(`Modo confirmado por firmware: ${data.mode}`, 'success');
        }
        if (prev.status !== data.status) {
          addEvent(`Estado del robot: ${prev.status} -> ${data.status}`, 'info');
        }
        if (prev.dir !== data.dir && data.dir !== 'detenido') {
          addEvent(`Dirección de motores: ${data.dir.toUpperCase()}`, 'info');
        }
        return { ...prev, ...data };
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
        mode: 'AUTO',
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
        lastRef: 'Inicio'
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
        mode: 'AUTO',
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
        lastRef: 'Inicio'
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

  // Send robot command
  const sendRobotCommand = async (cmd, label) => {
    if (isDemoMode) {
      demoService.sendCommand(cmd);
      addEvent(`[DEMO] Comando enviado: ${label || cmd}`, 'info');
      return;
    }

    if (connectionStatus !== 'conectado') {
      addEvent(`No se puede enviar '${label || cmd}': Carrito no conectado`, 'error');
      return;
    }

    try {
      await serialService.sendCommand(cmd);
      addEvent(`Comando enviado al Arduino: ${label || cmd}`, 'success');
    } catch (err) {
      addEvent(`Error enviando comando '${label || cmd}': ${err.message}`, 'error');
    }
  };

  // Select Operating Mode (Ensures motors stop before mode transition)
  const handleSelectMode = async (newMode) => {
    if (newMode === activeMode) return;
    addEvent(`Cambiando modo a: ${newMode}...`, 'info');
    await sendRobotCommand('STOP', 'Detener Motores');
    await sendRobotCommand(`MODE:${newMode}`, `Cambiar a Modo ${newMode}`);
    setActiveMode(newMode);
  };

  // Change Speed
  const handleSendSpeed = async (speedVal) => {
    await sendRobotCommand(`SPEED:${speedVal}`, `Ajustar Velocidad PWM (${speedVal})`);
    setTelemetry((prev) => ({ ...prev, speed: speedVal }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeMode={activeMode}
        onSelectMode={handleSelectMode}
        isConnected={connectionStatus === 'conectado'}
        isDemoMode={isDemoMode}
        baudRate={baudRate}
        setBaudRate={setBaudRate}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onToggleDemo={handleToggleDemo}
        webSerialSupported={webSerialSupported}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {/* Render Tab Content based on Navigation Selection */}
        {activeTab === 'dashboard' && <DashboardModule />}

        {activeTab === 'productos' && <ProductsModule />}

        {activeTab === 'importar' && <ExcelImportModule />}

        {activeTab === 'conteos' && <CycleCountModule />}

        {activeTab === 'inventario' && <InventoryModule />}

        {activeTab === 'ubicaciones' && <LocationsModule />}

        {activeTab === 'pedidos' && <OrdersModule />}

        {activeTab === 'misiones' && (
          <MissionsModule
            isConnected={connectionStatus === 'conectado'}
            isDemoMode={isDemoMode}
            onSendCommand={sendRobotCommand}
          />
        )}

        {activeTab === 'robotrack' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (Status & Hardware Visualizers) */}
            <div className="lg:col-span-1 space-y-6">
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

            {/* Right Column (Mode Control Panel & Event Log) */}
            <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
              {/* Render Panel based on selected Active Mode */}
              {activeMode === 'AUTO' && (
                <ControlPanel
                  isConnected={connectionStatus === 'conectado'}
                  isDemoMode={isDemoMode}
                  buzzerActive={Boolean(telemetry.buzzer)}
                  onStart={() => sendRobotCommand('START', 'Iniciar Seguimiento (AUTO)')}
                  onStop={() => sendRobotCommand('STOP', 'Parada de Emergencia')}
                  onToggleBuzzer={() =>
                    sendRobotCommand(
                      telemetry.buzzer ? 'BUZZER_OFF' : 'BUZZER_ON',
                      telemetry.buzzer ? 'Apagar Zumbador' : 'Activar Zumbador'
                    )
                  }
                  onMonitorMode={() => sendRobotCommand('MONITOR', 'Modo Monitoreo')}
                />
              )}

              {activeMode === 'MANUAL' && (
                <ManualPanel
                  isConnected={connectionStatus === 'conectado'}
                  isDemoMode={isDemoMode}
                  speed={telemetry.speed || 180}
                  onSendSpeed={handleSendSpeed}
                  onSendCommand={sendRobotCommand}
                  onStop={() => sendRobotCommand('STOP', 'Parada de Emergencia')}
                />
              )}

              {activeMode === 'RUTAS' && (
                <RutasPanel
                  isConnected={connectionStatus === 'conectado'}
                  isDemoMode={isDemoMode}
                  robotStatus={telemetry.status}
                  routeStep={telemetry.routeStep || 0}
                  routeTotal={telemetry.routeTotal || 0}
                  lastRef={telemetry.lastRef || 'Inicio'}
                  onSendCommand={sendRobotCommand}
                  onStop={() => sendRobotCommand('STOP', 'Parada / Cancelar Ruta')}
                />
              )}

              {/* Event Log */}
              <div className="flex-1">
                <EventLog events={events} onClear={() => setEvents([])} />
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-3 px-6 text-center text-xs text-slate-600">
        RoboTrack WMS & Logística &copy; {new Date().getFullYear()} - Sistema Integrado de Gestión de Almacenes y Operaciones Robóticas
      </footer>
    </div>
  );
}
