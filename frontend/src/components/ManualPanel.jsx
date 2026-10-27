import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Square,
  Zap,
  Keyboard,
  ShieldCheck,
  Octagon
} from 'lucide-react';

export function ManualPanel({
  isConnected,
  isDemoMode,
  speed,
  onSendSpeed,
  onSendCommand,
  onStop
}) {
  const [activeKey, setActiveKey] = useState(null);
  const [keyboardEnabled, setKeyboardEnabled] = useState(true);
  const disabled = !isConnected && !isDemoMode;
  const keyIntervalRef = useRef(null);

  // Send directional command
  const handleDirCommand = useCallback(
    (cmd, label) => {
      if (disabled) return;
      onSendCommand(`MANUAL:${cmd}`, `Manual: ${label}`);
    },
    [disabled, onSendCommand]
  );

  // Stop manual movement
  const handleStopMovement = useCallback(() => {
    if (disabled) return;
    onSendCommand('MANUAL:STOP', 'Manual: Detener');
  }, [disabled, onSendCommand]);

  // Periodic command sender when key is held down to prevent 500ms safety timeout
  const startKeyRepeat = useCallback(
    (cmd, label) => {
      if (keyIntervalRef.current) clearInterval(keyIntervalRef.current);
      handleDirCommand(cmd, label);
      keyIntervalRef.current = setInterval(() => {
        handleDirCommand(cmd, label);
      }, 150);
    },
    [handleDirCommand]
  );

  const stopKeyRepeat = useCallback(() => {
    if (keyIntervalRef.current) {
      clearInterval(keyIntervalRef.current);
      keyIntervalRef.current = null;
    }
    handleStopMovement();
  }, [handleStopMovement]);

  // Keyboard Event Handlers
  useEffect(() => {
    if (!keyboardEnabled || disabled) return;

    const handleKeyDown = (e) => {
      if (e.repeat) return; // Prevent native browser repeat firing multiple intervals
      const key = e.key.toLowerCase();

      let cmd = null;
      let label = '';

      if (key === 'arrowup' || key === 'w') {
        cmd = 'FW';
        label = 'Avanzar (W)';
      } else if (key === 'arrowdown' || key === 's') {
        cmd = 'BW';
        label = 'Retroceder (S)';
      } else if (key === 'arrowleft' || key === 'a') {
        cmd = 'LEFT';
        label = 'Giro Izquierda (A)';
      } else if (key === 'arrowright' || key === 'd') {
        cmd = 'RIGHT';
        label = 'Giro Derecha (D)';
      } else if (key === 'q') {
        cmd = 'SPIN_LEFT';
        label = 'Rotar Izquierda (Q)';
      } else if (key === 'e') {
        cmd = 'SPIN_RIGHT';
        label = 'Rotar Derecha (E)';
      } else if (key === ' ' || key === 'escape') {
        e.preventDefault();
        onStop();
        return;
      }

      if (cmd) {
        e.preventDefault();
        setActiveKey(key);
        startKeyRepeat(cmd, label);
      }
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (
        ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', 'q', 'e'].includes(key)
      ) {
        setActiveKey(null);
        stopKeyRepeat();
      }
    };

    const handleBlur = () => {
      setActiveKey(null);
      stopKeyRepeat();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (keyIntervalRef.current) clearInterval(keyIntervalRef.current);
    };
  }, [keyboardEnabled, disabled, startKeyRepeat, stopKeyRepeat, onStop]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
      {/* Panel Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Control Manual Direccional
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manejo directo de motores con timeout de seguridad de 500ms
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
            <Keyboard className="w-3.5 h-3.5 text-indigo-400" />
            <input
              type="checkbox"
              checked={keyboardEnabled}
              onChange={(e) => setKeyboardEnabled(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
            />
            <span>Teclado (WASD/Flechas)</span>
          </label>
        </div>
      </div>

      {/* Emergency Stop Button */}
      <button
        onClick={onStop}
        disabled={disabled}
        className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-3.5 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-red-950/50 transition-all active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed border border-red-500/50"
      >
        <Octagon className="w-5 h-5 fill-white stroke-red-700" />
        <span className="text-sm tracking-wide">PARADA DE EMERGENCIA (ESPACIO)</span>
      </button>

      {/* PWM Speed Adjustment Slider */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
            Ajuste de Velocidad PWM (Firmware L298N)
          </span>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {speed} PWM ({Math.round((speed / 255) * 100)}%)
          </span>
        </div>

        <input
          type="range"
          min="100"
          max="255"
          value={speed}
          disabled={disabled}
          onChange={(e) => {
            const newSpd = parseInt(e.target.value, 10);
            onSendSpeed(newSpd);
          }}
          className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer disabled:opacity-30"
        />

        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span>Min (100)</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => onSendSpeed(120)}
              disabled={disabled}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            >
              Lento (120)
            </button>
            <button
              onClick={() => onSendSpeed(180)}
              disabled={disabled}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-medium disabled:opacity-30"
            >
              Normal (180)
            </button>
            <button
              onClick={() => onSendSpeed(240)}
              disabled={disabled}
              className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30"
            >
              Máximo (240)
            </button>
          </div>
          <span>Max (255)</span>
        </div>
      </div>

      {/* Directional Pad Controls */}
      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {/* Spin Left */}
        <button
          onMouseDown={() => startKeyRepeat('SPIN_LEFT', 'Rotar Izq')}
          onMouseUp={stopKeyRepeat}
          onMouseLeave={stopKeyRepeat}
          onTouchStart={() => startKeyRepeat('SPIN_LEFT', 'Rotar Izq')}
          onTouchEnd={stopKeyRepeat}
          disabled={disabled}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30 ${
            activeKey === 'q'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Rotar sobre su propio eje a la izquierda (Q)"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="text-[10px] uppercase font-semibold">Q / Rotar</span>
        </button>

        {/* Move Forward */}
        <button
          onMouseDown={() => startKeyRepeat('FW', 'Avanzar')}
          onMouseUp={stopKeyRepeat}
          onMouseLeave={stopKeyRepeat}
          onTouchStart={() => startKeyRepeat('FW', 'Avanzar')}
          onTouchEnd={stopKeyRepeat}
          disabled={disabled}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30 ${
            activeKey === 'w' || activeKey === 'arrowup'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30'
          }`}
          title="Avanzar (W / Flecha Arriba)"
        >
          <ArrowUp className="w-6 h-6" />
          <span className="text-[10px] uppercase font-bold">W / Adelante</span>
        </button>

        {/* Spin Right */}
        <button
          onMouseDown={() => startKeyRepeat('SPIN_RIGHT', 'Rotar Der')}
          onMouseUp={stopKeyRepeat}
          onMouseLeave={stopKeyRepeat}
          onTouchStart={() => startKeyRepeat('SPIN_RIGHT', 'Rotar Der')}
          onTouchEnd={stopKeyRepeat}
          disabled={disabled}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30 ${
            activeKey === 'e'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Rotar sobre su propio eje a la derecha (E)"
        >
          <RotateCw className="w-5 h-5" />
          <span className="text-[10px] uppercase font-semibold">E / Rotar</span>
        </button>

        {/* Turn Left */}
        <button
          onMouseDown={() => startKeyRepeat('LEFT', 'Giro Izq')}
          onMouseUp={stopKeyRepeat}
          onMouseLeave={stopKeyRepeat}
          onTouchStart={() => startKeyRepeat('LEFT', 'Giro Izq')}
          onTouchEnd={stopKeyRepeat}
          disabled={disabled}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30 ${
            activeKey === 'a' || activeKey === 'arrowleft'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Girar a la izquierda (A / Flecha Izquierda)"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="text-[10px] uppercase font-semibold">A / Izquierda</span>
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStopMovement}
          disabled={disabled}
          className="p-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-300 rounded-xl flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30"
          title="Parar movimiento"
        >
          <Square className="w-5 h-5 fill-red-400 stroke-none" />
          <span className="text-[10px] uppercase font-bold">Parar</span>
        </button>

        {/* Turn Right */}
        <button
          onMouseDown={() => startKeyRepeat('RIGHT', 'Giro Der')}
          onMouseUp={stopKeyRepeat}
          onMouseLeave={stopKeyRepeat}
          onTouchStart={() => startKeyRepeat('RIGHT', 'Giro Der')}
          onTouchEnd={stopKeyRepeat}
          disabled={disabled}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30 ${
            activeKey === 'd' || activeKey === 'arrowright'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Girar a la derecha (D / Flecha Derecha)"
        >
          <ArrowRight className="w-6 h-6" />
          <span className="text-[10px] uppercase font-semibold">D / Derecha</span>
        </button>

        {/* Spacer */}
        <div />

        {/* Move Backward */}
        <button
          onMouseDown={() => startKeyRepeat('BW', 'Retroceder')}
          onMouseUp={stopKeyRepeat}
          onMouseLeave={stopKeyRepeat}
          onTouchStart={() => startKeyRepeat('BW', 'Retroceder')}
          onTouchEnd={stopKeyRepeat}
          disabled={disabled}
          className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 disabled:opacity-30 ${
            activeKey === 's' || activeKey === 'arrowdown'
              ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title="Retroceder (S / Flecha Abajo)"
        >
          <ArrowDown className="w-6 h-6" />
          <span className="text-[10px] uppercase font-semibold">S / Atrás</span>
        </button>

        {/* Spacer */}
        <div />
      </div>

      {/* Safety Notice */}
      <div className="flex items-center gap-2 p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span>
          <strong>Protección de seguridad Arduino:</strong> Los motores se detienen automáticamente si dejan de recibir comandos durante más de 500ms.
        </span>
      </div>
    </div>
  );
}
