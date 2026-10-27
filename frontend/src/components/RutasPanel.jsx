import React, { useState, useEffect } from 'react';
import { SchematicMap } from './SchematicMap';
import {
  Route,
  Play,
  Octagon,
  Trash2,
  Plus,
  Save,
  CheckCircle,
  Clock,
  Compass,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Square,
  Bookmark
} from 'lucide-react';

export function RutasPanel({
  isConnected,
  isDemoMode,
  robotStatus,
  routeStep,
  routeTotal,
  lastRef,
  onSendCommand,
  onStop
}) {
  const disabled = !isConnected && !isDemoMode;

  // Preset Routes Definition
  const PRESET_ROUTES = [
    {
      id: 'p1',
      name: 'Ruta 1: Directo a Destino A (Norte)',
      steps: [
        { type: 'FW_REF', label: 'Avanzar a Intersección 1' },
        { type: 'TURN_LEFT', label: 'Girar a la Izquierda en I1' },
        { type: 'FW_REF', label: 'Avanzar a Destino A' },
        { type: 'STOP', label: 'Detenerse en Destino A' }
      ]
    },
    {
      id: 'p2',
      name: 'Ruta 2: Recorrido Completo a Destino B (Sur)',
      steps: [
        { type: 'FW_REF', label: 'Avanzar a Intersección 1' },
        { type: 'FW_REF', label: 'Avanzar a Intersección 2' },
        { type: 'TURN_RIGHT', label: 'Girar a la Derecha en I2' },
        { type: 'STOP', label: 'Detenerse en Destino B' }
      ]
    }
  ];

  const [currentRouteSteps, setCurrentRouteSteps] = useState(PRESET_ROUTES[0].steps);
  const [customSavedRoutes, setCustomSavedRoutes] = useState([]);
  const [routeNameInput, setRouteNameInput] = useState('');

  // Load custom routes from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('robotrack_custom_routes');
      if (saved) {
        setCustomSavedRoutes(JSON.parse(saved));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Save custom route
  const handleSaveCustomRoute = () => {
    if (!routeNameInput.trim() || currentRouteSteps.length === 0) return;
    const newRoute = {
      id: `custom_${Date.now()}`,
      name: routeNameInput.trim(),
      steps: [...currentRouteSteps]
    };
    const updated = [...customSavedRoutes, newRoute];
    setCustomSavedRoutes(updated);
    setRouteNameInput('');
    try {
      localStorage.setItem('robotrack_custom_routes', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Delete custom route
  const handleDeleteCustomRoute = (id) => {
    const updated = customSavedRoutes.filter((r) => r.id !== id);
    setCustomSavedRoutes(updated);
    try {
      localStorage.setItem('robotrack_custom_routes', JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Add step to sequence
  const handleAddStep = (type, label) => {
    setCurrentRouteSteps((prev) => [...prev, { type, label }]);
  };

  // Remove step from sequence
  const handleRemoveStep = (index) => {
    setCurrentRouteSteps((prev) => prev.filter((_, i) => i !== index));
  };

  // Start route execution
  const handleStartRouteExecution = async () => {
    if (disabled || currentRouteSteps.length === 0) return;

    // Send sequence to Arduino / Demo: CLEAR -> ADD steps -> START
    await onSendCommand('ROUTE:CLEAR', 'Rutas: Limpiar Búfer');
    for (const step of currentRouteSteps) {
      await onSendCommand(`ROUTE:ADD:${step.type}`, `Rutas: + ${step.label}`);
    }
    await onSendCommand('ROUTE:START', 'Rutas: Iniciar Ejecución');
  };

  // Determine clear route status badge
  const isExecuting = robotStatus === 'ejecutando_ruta';
  const isCompleted = robotStatus === 'ruta_completada';
  const isPlanified = !isExecuting && !isCompleted;

  // Step Progress Calculation
  const progressPercent =
    routeTotal > 0 ? Math.min(100, Math.round((routeStep / routeTotal) * 100)) : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Header & Status Indicator Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Route className="w-4 h-4 text-indigo-400" />
            Planificación y Control de Rutas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Navegación mediante secuencia de giros y referencias en intersecciones
          </p>
        </div>

        {/* State Badges (Planificada / En ejecución / Completada) */}
        <div className="flex items-center gap-2">
          {isPlanified && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800 text-indigo-300 border border-indigo-500/30">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              Ruta Planificada
            </span>
          )}
          {isExecuting && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Ruta en Ejecución
            </span>
          )}
          {isCompleted && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              Ruta Completada
            </span>
          )}
        </div>
      </div>

      {/* Schematic Map Visualizer */}
      <SchematicMap
        lastRef={lastRef}
        routeStep={routeStep}
        routeTotal={routeTotal}
        robotStatus={robotStatus}
      />

      {/* Route Execution Monitor & Controls */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-medium text-slate-300">
          <span>Progreso del Recorrido:</span>
          <span className="font-mono text-indigo-300">
            Paso {routeStep} de {routeTotal || currentRouteSteps.length} ({progressPercent}%)
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isCompleted
                ? 'bg-emerald-500'
                : isExecuting
                ? 'bg-gradient-to-r from-indigo-500 to-amber-500'
                : 'bg-indigo-600'
            }`}
            style={{ width: `${isCompleted ? 100 : progressPercent}%` }}
          />
        </div>

        {/* Execution Control Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={handleStartRouteExecution}
            disabled={disabled || currentRouteSteps.length === 0 || isExecuting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-indigo-400/30"
          >
            <Play className="w-4 h-4 fill-white stroke-none" />
            <span>Iniciar Ruta Programada</span>
          </button>

          <button
            onClick={onStop}
            disabled={disabled}
            className="bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 p-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Octagon className="w-4 h-4 text-red-400" />
            <span>Parada / Cancelar Ruta</span>
          </button>
        </div>
      </div>

      {/* Preset & Custom Routes Selector */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
          Plantillas de Rutas Predefinidas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRESET_ROUTES.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setCurrentRouteSteps(preset.steps)}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 text-left transition-all text-xs flex flex-col justify-between"
            >
              <span className="font-semibold text-slate-200">{preset.name}</span>
              <span className="text-[10px] text-slate-400 mt-1">
                {preset.steps.length} instrucciones de navegación
              </span>
            </button>
          ))}

          {customSavedRoutes.map((custom) => (
            <div
              key={custom.id}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left text-xs flex items-center justify-between"
            >
              <button
                onClick={() => setCurrentRouteSteps(custom.steps)}
                className="flex-1 text-left font-semibold text-slate-200 hover:text-indigo-300"
              >
                <div>{custom.name}</div>
                <div className="text-[10px] text-slate-400">{custom.steps.length} pasos</div>
              </button>
              <button
                onClick={() => handleDeleteCustomRoute(custom.id)}
                className="text-slate-500 hover:text-red-400 p-1"
                title="Eliminar ruta guardada"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Route Sequence Builder */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Secuencia de Instrucciones de la Ruta ({currentRouteSteps.length})
          </h3>
          <button
            onClick={() => setCurrentRouteSteps([])}
            className="text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Limpiar Secuencia
          </button>
        </div>

        {/* Action Buttons to Add Instructions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => handleAddStep('FW_REF', 'Avanzar a Referencia')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
            <span>Avanzar Ref.</span>
          </button>

          <button
            onClick={() => handleAddStep('TURN_LEFT', 'Girar Izquierda')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Giro Izq.</span>
          </button>

          <button
            onClick={() => handleAddStep('TURN_RIGHT', 'Girar Derecha')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
            <span>Giro Der.</span>
          </button>

          <button
            onClick={() => handleAddStep('STOP', 'Detenerse en Destino')}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
          >
            <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
            <span>Detenerse</span>
          </button>
        </div>

        {/* Instruction List */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {currentRouteSteps.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
              No hay instrucciones en la ruta. Agrega pasos arriba o selecciona una plantilla.
            </div>
          ) : (
            currentRouteSteps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center border border-indigo-500/30">
                    {idx + 1}
                  </span>
                  <span>{step.label}</span>
                </div>
                <button
                  onClick={() => handleRemoveStep(idx)}
                  className="text-slate-500 hover:text-red-400 p-1"
                  title="Quitar paso"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Save Custom Route Form */}
        <div className="flex gap-2 pt-2 border-t border-slate-800/80">
          <input
            type="text"
            placeholder="Nombre para guardar esta ruta..."
            value={routeNameInput}
            onChange={(e) => setRouteNameInput(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSaveCustomRoute}
            disabled={!routeNameInput.trim() || currentRouteSteps.length === 0}
            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-30 border border-slate-700"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Guardar</span>
          </button>
        </div>
      </div>

      {/* Hardware Navigation Requirements & Limitations Disclosure */}
      <div className="p-4 bg-slate-950/90 rounded-xl border border-amber-500/30 space-y-2 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-amber-400 font-semibold uppercase tracking-wider">
          <AlertTriangle className="w-4 h-4" />
          Análisis Hardware y Requisitos de Navegación Físicos
        </div>
        <p className="text-slate-400 text-[11px] leading-relaxed">
          El robot utiliza <strong>3 sensores infrarrojos (D8, D9, D10)</strong> montados en linea frontal. Con esta configuración de hardware:
        </p>
        <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-1 pl-1">
          <li>
            <strong>Detección de Referencias:</strong> Las intersecciones o líneas perpendiculares activan los tres sensores simultáneamente (<code>1 1 1</code>), permitiendo al firmware contar referencias y ejecutar giros sobre la cinta.
          </li>
          <li>
            <strong>Limitaciones Físicas:</strong> No dispone de encoders de rueda, GPS interno, IMU ni sensor ultrasónico. Por lo tanto, no se simula navegación libre ni odometría absoluta sin líneas trazadas.
          </li>
        </ul>
      </div>
    </div>
  );
}
