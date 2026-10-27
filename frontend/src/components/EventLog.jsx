import React from 'react';
import { History, Info, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

export function EventLog({ events = [], onClear }) {
  const getEventBadge = (type) => {
    switch (type) {
      case 'error':
        return { icon: AlertTriangle, color: 'text-red-400 bg-red-500/10 border-red-500/30' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
      case 'success':
        return { icon: CheckCircle2, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'info':
      default:
        return { icon: Info, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' };
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-400" />
          Historial de Eventos
        </h2>
        {events.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto space-y-2.5 pr-1 font-mono text-xs">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-600 italic">
            No hay eventos registrados aún.
          </div>
        ) : (
          events.map((evt) => {
            const badge = getEventBadge(evt.type);
            const Icon = badge.icon;
            return (
              <div
                key={evt.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2.5 flex items-start gap-2.5 transition-all"
              >
                <span className="text-[10px] text-slate-500 whitespace-nowrap pt-0.5 font-bold">
                  {evt.timestamp}
                </span>
                <div className={`p-1 rounded border shrink-0 ${badge.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 text-slate-300 break-words font-sans text-xs">
                  {evt.message}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
