import React from 'react';
import { Gauge, ArrowUp, ArrowLeft, ArrowRight, Octagon } from 'lucide-react';

export function MotorsMonitor({ mLeft = 0, mRight = 0, dir = 'detenido' }) {
  // Translate direction to user-facing labels & icons
  const getDirectionInfo = () => {
    switch (dir.toLowerCase()) {
      case 'adelante':
        return { label: 'Adelante', icon: ArrowUp, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'izquierda':
        return { label: 'Giro Izquierda', icon: ArrowLeft, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'derecha':
        return { label: 'Giro Derecha', icon: ArrowRight, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
      case 'detenido':
      default:
        return { label: 'Detenido', icon: Octagon, color: 'text-slate-400 bg-slate-800 border-slate-700' };
    }
  };

  const dirInfo = getDirectionInfo();
  const DirIcon = dirInfo.icon;

  // PWM range 0 - 255 to percentage
  const leftPct = Math.round((mLeft / 255) * 100);
  const rightPct = Math.round((mRight / 255) * 100);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-400" />
          Drivers de Motor L298N
        </h2>
        <span className="text-xs text-slate-500 font-mono">PWM 0-255</span>
      </div>

      {/* Direction Banner */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 mb-5 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">Dirección Solicitada</span>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-bold ${dirInfo.color}`}>
          <DirIcon className="w-4 h-4" />
          {dirInfo.label}
        </div>
      </div>

      {/* Dual Motor Speed Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Left Motor */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-300">Motor Izquierdo (ENA)</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{mLeft} PWM ({leftPct}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${leftPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
            <span>Pin D5 (PWM)</span>
            <span>{mLeft > 0 ? 'Energizado' : 'Inactivo'}</span>
          </div>
        </div>

        {/* Right Motor */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-300">Motor Derecho (ENB)</span>
            <span className="text-xs font-mono font-bold text-emerald-400">{mRight} PWM ({rightPct}%)</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${rightPct}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-2 text-[10px] text-slate-500">
            <span>Pin D6 (PWM)</span>
            <span>{mRight > 0 ? 'Energizado' : 'Inactivo'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
