import React from 'react';
import { Eye, CheckCircle, XCircle } from 'lucide-react';

export function SensorsVisualizer({ left = 0, center = 0, right = 0 }) {
  const sensors = [
    { id: 'left', label: 'Izquierdo', detected: Boolean(left) },
    { id: 'center', label: 'Central', detected: Boolean(center) },
    { id: 'right', label: 'Derecho', detected: Boolean(right) }
  ];

  // Calculate position indicator shift based on active sensors
  const getLineOffset = () => {
    if (left && !center && !right) return '-translate-x-24';
    if (left && center && !right) return '-translate-x-12';
    if (center && !left && !right) return 'translate-x-0';
    if (right && center && !left) return 'translate-x-12';
    if (right && !center && !left) return 'translate-x-24';
    if (left && center && right) return 'translate-x-0 scale-x-150';
    return 'hidden'; // lost line
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          Sensores Infrarrojos (IR)
        </h2>
        <span className="text-xs text-slate-500 font-mono">3 PIN DIGITAL</span>
      </div>

      {/* Track Representation */}
      <div className="mb-6 bg-slate-950 border border-slate-800 rounded-xl p-6 relative overflow-hidden flex flex-col items-center justify-center min-h-[120px]">
        {/* Track Line Background */}
        <div className="absolute inset-x-0 h-12 bg-slate-900/60 top-1/2 -translate-y-1/2 border-y border-slate-800/40" />

        {/* Dynamic Black Line Indicator */}
        <div className="relative w-full flex items-center justify-center h-12">
          {getLineOffset() !== 'hidden' ? (
            <div
              className={`w-16 h-8 bg-emerald-500/30 border-2 border-emerald-400 rounded-lg shadow-lg shadow-emerald-500/20 transition-all duration-300 flex items-center justify-center ${getLineOffset()}`}
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
          ) : (
            <div className="text-xs text-amber-400/80 font-medium bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
              Línea no detectada por sensores
            </div>
          )}
        </div>

        {/* Chassis Front Sensor Alignment Markers */}
        <div className="flex items-center justify-between w-full max-w-xs mt-4 border-t border-slate-800 pt-3 px-4">
          <span className={`text-[10px] font-mono ${left ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>S_IZQ</span>
          <span className={`text-[10px] font-mono ${center ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>S_CEN</span>
          <span className={`text-[10px] font-mono ${right ? 'text-emerald-400 font-bold' : 'text-slate-600'}`}>S_DER</span>
        </div>
      </div>

      {/* Individual Sensor Cards */}
      <div className="grid grid-cols-3 gap-3">
        {sensors.map((sensor) => (
          <div
            key={sensor.id}
            className={`p-3.5 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 text-center ${
              sensor.detected
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-md shadow-emerald-950/20'
                : 'bg-slate-950/50 border-slate-800/80 text-slate-500'
            }`}
          >
            {sensor.detected ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-slate-600" />
            )}
            <div>
              <div className="text-xs font-semibold text-slate-300">{sensor.label}</div>
              <div className="text-[10px] mt-0.5 font-mono">
                {sensor.detected ? 'LÍNEA NEGRA (LOW)' : 'FONDO (HIGH)'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
