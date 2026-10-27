import React from 'react';
import { Wifi, WifiOff, Activity, AlertCircle, Compass, CheckCircle2 } from 'lucide-react';

export function StatusPanel({ connectionStatus, robotStatus, isDemoMode }) {
  // Config state colors and icons
  const getStatusBadge = () => {
    if (isDemoMode) {
      return {
        label: 'MODO DEMOSTRACIÓN',
        color: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        dot: 'bg-purple-400 animate-pulse'
      };
    }
    switch (connectionStatus) {
      case 'conectado':
        return {
          label: 'CONECTADO USB',
          color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400 animate-pulse'
        };
      case 'error':
        return {
          label: 'ERROR CONEXIÓN',
          color: 'bg-red-500/10 border-red-500/30 text-red-400',
          dot: 'bg-red-500'
        };
      case 'desconectado':
      default:
        return {
          label: 'DESCONECTADO',
          color: 'bg-slate-800 border-slate-700 text-slate-400',
          dot: 'bg-slate-500'
        };
    }
  };

  const getRobotStatusBadge = () => {
    switch (robotStatus) {
      case 'seguimiento':
        return {
          label: 'Seguimiento de Línea',
          color: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
          icon: Activity
        };
      case 'buscando':
        return {
          label: 'Buscando Línea...',
          color: 'bg-amber-500/20 border-amber-500/40 text-amber-300',
          icon: Compass
        };
      case 'monitoreo':
        return {
          label: 'Modo Monitoreo',
          color: 'bg-blue-500/20 border-blue-500/40 text-blue-300',
          icon: CheckCircle2
        };
      case 'error':
        return {
          label: 'Error de Comunicación',
          color: 'bg-red-500/20 border-red-500/40 text-red-300',
          icon: AlertCircle
        };
      case 'detenido':
      default:
        return {
          label: 'Detenido',
          color: 'bg-slate-800 border-slate-700 text-slate-300',
          icon: AlertCircle
        };
    }
  };

  const connBadge = getStatusBadge();
  const rbtBadge = getRobotStatusBadge();
  const RobotIcon = rbtBadge.icon;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          {connectionStatus === 'conectado' || isDemoMode ? (
            <Wifi className="w-4 h-4 text-emerald-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-500" />
          )}
          Estado General
        </h2>

        <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${connBadge.color}`}>
          <span className={`w-2 h-2 rounded-full ${connBadge.dot}`} />
          {connBadge.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Connection State Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">Estado del Puerto Serial</span>
          <div className="mt-2 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${connBadge.color}`}>
              {connectionStatus === 'conectado' || isDemoMode ? (
                <Wifi className="w-5 h-5 text-emerald-400" />
              ) : (
                <WifiOff className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <div className="text-base font-bold text-slate-200">
                {isDemoMode ? 'Simulador Interno' : connectionStatus === 'conectado' ? 'Web Serial API (USB)' : 'Desconectado'}
              </div>
              <div className="text-xs text-slate-400">
                {isDemoMode ? 'Datos simulados activos' : connectionStatus === 'conectado' ? 'Canal bidireccional abierto' : 'Sin puerto activo'}
              </div>
            </div>
          </div>
        </div>

        {/* Robot Mode Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-xs text-slate-500 font-medium">Estado del Carrito</span>
          <div className="mt-2 flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${rbtBadge.color}`}>
              <RobotIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-bold text-slate-200">
                {rbtBadge.label}
              </div>
              <div className="text-xs text-slate-400">
                {robotStatus === 'seguimiento' && 'Control PID/Switch activo'}
                {robotStatus === 'buscando' && 'Reubicando trazo...'}
                {robotStatus === 'detenido' && 'Motores desenergizados'}
                {robotStatus === 'monitoreo' && 'Inspección de sensores'}
                {robotStatus === 'error' && 'Pérdida de paquetes/puerto'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
