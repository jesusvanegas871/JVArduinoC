import React from 'react';
import { Play, Octagon, Volume2, VolumeX, Eye, ShieldAlert } from 'lucide-react';

export function ControlPanel({
  isConnected,
  isDemoMode,
  buzzerActive,
  onStart,
  onStop,
  onToggleBuzzer,
  onMonitorMode
}) {
  const disabled = !isConnected && !isDemoMode;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-emerald-400" />
          Panel de Controles
        </h2>
        {disabled && (
          <span className="text-xs text-amber-400 font-medium">
            Conecta el Arduino para habilitar comandos
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Emergency Stop Button (Primary visual priority) */}
        <button
          onClick={onStop}
          disabled={disabled}
          className="col-span-1 sm:col-span-2 lg:col-span-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-red-950/50 transition-all transform active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:from-red-600 border border-red-500/50"
        >
          <Octagon className="w-6 h-6 fill-white stroke-red-700" />
          <div className="flex flex-col items-start">
            <span className="text-base tracking-wide">PARADA DE EMERGENCIA</span>
            <span className="text-[10px] font-normal text-red-200">
              Detiene inmediatamente los motores en el firmware
            </span>
          </div>
        </button>

        {/* Start Line Follower Button */}
        <button
          onClick={onStart}
          disabled={disabled}
          className="bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 p-3.5 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-emerald-500"
        >
          <Play className="w-5 h-5 fill-emerald-400 stroke-none" />
          <span className="text-xs">Iniciar Seguimiento</span>
          <span className="text-[10px] text-slate-400 font-normal">Modo automático</span>
        </button>

        {/* Monitor Mode Button */}
        <button
          onClick={onMonitorMode}
          disabled={disabled}
          className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 p-3.5 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500"
        >
          <Eye className="w-5 h-5 text-blue-400" />
          <span className="text-xs">Modo Monitoreo</span>
          <span className="text-[10px] text-slate-400 font-normal">Ver lecturas sin mover</span>
        </button>

        {/* Buzzer Toggle Button */}
        <button
          onClick={onToggleBuzzer}
          disabled={disabled}
          className={`p-3.5 rounded-xl font-semibold flex flex-col items-center justify-center gap-2 transition-all border disabled:opacity-30 disabled:cursor-not-allowed ${
            buzzerActive
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-950/30'
              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          {buzzerActive ? (
            <Volume2 className="w-5 h-5 text-amber-400 animate-pulse" />
          ) : (
            <VolumeX className="w-5 h-5 text-slate-400" />
          )}
          <span className="text-xs">{buzzerActive ? 'Apagar Zumbador' : 'Activar Zumbador'}</span>
          <span className="text-[10px] text-slate-400 font-normal">Pin D11 Digital</span>
        </button>
      </div>
    </div>
  );
}
