import React from 'react';
import { Cpu, Plug, Unplug, Play, AlertTriangle, LayoutDashboard, Package, Boxes, MapPin, ShoppingBag, Truck, Compass, FileSpreadsheet, Calendar } from 'lucide-react';

export function Header({
  activeTab,
  onSelectTab,
  activeMode,
  onSelectMode,
  isConnected,
  isDemoMode,
  baudRate,
  setBaudRate,
  onConnect,
  onDisconnect,
  onToggleDemo,
  webSerialSupported
}) {
  const wmsTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'productos', label: 'Productos', icon: Package },
    { id: 'importar', label: 'Importar Excel', icon: FileSpreadsheet },
    { id: 'conteos', label: 'Conteos Cíclicos', icon: Calendar },
    { id: 'inventario', label: 'Inventario', icon: Boxes },
    { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
    { id: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
    { id: 'misiones', label: 'Misiones Robot', icon: Truck },
    { id: 'robotrack', label: 'RoboTrack Control', icon: Compass }
  ];

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-50 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
              <Cpu className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight text-white">RoboTrack WMS</h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v2.0 WMS + Robot
                </span>
              </div>
              <p className="text-xs text-slate-400">Sistema de Gestión de Inventarios y Logística Robótica</p>
            </div>
          </div>

          {/* Web Serial Warning */}
          {!webSerialSupported && !isDemoMode && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Navegador sin soporte Web Serial. Usa Chrome/Edge o activa el Modo Demo.</span>
            </div>
          )}

          {/* Controls: Connection & Demo Toggle */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={onToggleDemo}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
                isDemoMode
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 shadow-lg shadow-purple-950/40'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Play className={`w-4 h-4 ${isDemoMode ? 'fill-purple-300' : ''}`} />
              {isDemoMode ? 'Modo Demo Activo' : 'Activar Demo'}
            </button>

            {!isDemoMode && (
              <>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  disabled={isConnected}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50"
                >
                  <option value={9600}>9600 Baud</option>
                  <option value={115200}>115200 Baud</option>
                  <option value={57600}>57600 Baud</option>
                  <option value={19200}>19200 Baud</option>
                </select>

                {isConnected ? (
                  <button
                    onClick={onDisconnect}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 text-xs font-semibold rounded-xl transition-all shadow-md shadow-red-950/20"
                  >
                    <Unplug className="w-4 h-4" />
                    Desconectar
                  </button>
                ) : (
                  <button
                    onClick={onConnect}
                    disabled={!webSerialSupported}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plug className="w-4 h-4" />
                    Conectar USB
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* WMS & Robot Navigation Tabs */}
        <div className="flex items-center justify-start border-t border-slate-800/80 pt-2 gap-2 overflow-x-auto">
          {wmsTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTab(t.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-400/50 shadow-md shadow-emerald-950/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
