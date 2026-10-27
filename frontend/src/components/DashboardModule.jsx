import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Package, ShieldAlert, ShoppingBag, Truck, CheckCircle2, ArrowUpRight, ArrowDownLeft, RefreshCw, AlertCircle } from 'lucide-react';

export function DashboardModule() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Error cargando estadísticas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000); // 10s auto-refresh
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-emerald-400" />
        <span>Cargando datos del dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
        <button onClick={fetchStats} className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-white rounded-lg text-xs font-semibold">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Active Products */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Productos Activos</span>
            <Package className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total_active_products}</div>
          <span className="text-[11px] text-slate-500 mt-1">Registrados en catálogo</span>
        </div>

        {/* Available Units */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Unidades Disponibles</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.total_available_units}</div>
          <span className="text-[11px] text-slate-500 mt-1">Libres para reserva</span>
        </div>

        {/* Low Stock Alerts */}
        <div className={`border p-4 rounded-2xl flex flex-col justify-between ${
          stats.low_stock_products_count > 0 ? 'bg-amber-500/10 border-amber-500/40 text-amber-300' : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Alertas Stock Bajo</span>
            <ShieldAlert className={`w-4 h-4 ${stats.low_stock_products_count > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-2xl font-bold ${stats.low_stock_products_count > 0 ? 'text-amber-400' : 'text-white'}`}>
            {stats.low_stock_products_count}
          </div>
          <span className="text-[11px] text-slate-500 mt-1">Por debajo de min_stock</span>
        </div>

        {/* Pending Orders */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Órdenes Pendientes</span>
            <ShoppingBag className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.pending_orders_count}</div>
          <span className="text-[11px] text-slate-500 mt-1">Pendientes de misión</span>
        </div>

        {/* Active Missions */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Misiones en Curso</span>
            <Truck className="w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-indigo-400">{stats.executing_missions_count}</div>
          <span className="text-[11px] text-slate-500 mt-1">Robot en operación</span>
        </div>

        {/* Completed Deliveries */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Entregas Exitosas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.completed_deliveries_count}</div>
          <span className="text-[11px] text-slate-500 mt-1">Histórico completado</span>
        </div>
      </div>

      {/* Two columns: Recent Movements & Mission Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movements Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              Movimientos Recientes de Inventario
            </h3>
            <span className="text-xs text-slate-500">Auditoría en tiempo real</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Fecha</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3">Producto</th>
                  <th className="py-2.5 px-3">Cant.</th>
                  <th className="py-2.5 px-3">Motivo / Usuario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stats.recent_movements.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-6 text-slate-500">Sin movimientos registrados</td>
                  </tr>
                ) : (
                  stats.recent_movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          m.movement_type === 'ENTRADA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          m.movement_type === 'SALIDA' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          m.movement_type === 'TRASLADO' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {m.movement_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-white">{m.product?.name || `ID ${m.product_id}`}</td>
                      <td className="py-2.5 px-3 font-bold">{m.quantity}</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        {m.reason} <span className="text-slate-500">({m.user_id})</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mission Event Log */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              Eventos de Ejecución del Robot
            </h3>
            <span className="text-xs text-slate-500">Trazabilidad física y digital</span>
          </div>

          <div className="space-y-3">
            {stats.recent_events.length === 0 ? (
              <p className="text-xs text-center text-slate-500 py-6">Sin eventos de misiones registrados</p>
            ) : (
              stats.recent_events.map((evt) => (
                <div key={evt.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-start gap-3 text-xs">
                  <div className="p-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400 shrink-0">
                    <Truck className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">{evt.event_type}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(evt.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-0.5">{evt.description}</p>
                    <span className="text-[10px] text-slate-500 mt-1 inline-block">Origen: {evt.source}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
