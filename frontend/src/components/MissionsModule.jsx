import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { Truck, Play, CheckCircle2, ArrowRight, Clock, AlertTriangle, RefreshCw, AlertCircle, X, ShieldCheck } from 'lucide-react';

export function MissionsModule({ isConnected, isDemoMode, onSendCommand }) {
  const [missions, setMissions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Assign Mission Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignedRoute, setAssignedRoute] = useState('RUTA_A_B');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [mList, pOrders] = await Promise.all([
        apiService.getMissions(),
        apiService.getOrders({ status_filter: 'Reservada' })
      ]);

      setMissions(mList);
      setPendingOrders(pOrders);
    } catch (err) {
      setError(err.message || 'Error cargando misiones del robot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenAssignModal = (order) => {
    setSelectedOrder(order);
    setAssignedRoute('RUTA_A_B');
    setFormError(null);
    setIsAssignModalOpen(true);
  };

  const handleCreateMission = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setFormError(null);
    setFormSubmitting(true);

    try {
      await apiService.createMission({
        order_id: selectedOrder.id,
        assigned_route_id: assignedRoute
      });
      setIsAssignModalOpen(false);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error creando misión');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Launch Mission Command to Hardware / Demo
  const handleDispatchMission = async (mission) => {
    try {
      // 1. Send Route Clear & Route Add commands to physical serial or demo
      if (onSendCommand) {
        await onSendCommand('ROUTE:CLEAR', 'Limpiar Ruta Robot');
        await onSendCommand('ROUTE:ADD:FW_REF', 'Avanzar a Origen');
        await onSendCommand('ROUTE:ADD:TURN_LEFT', 'Giro en Origen');
        await onSendCommand('ROUTE:ADD:FW_REF', 'Avanzar a Destino');
        await onSendCommand('ROUTE:ADD:STOP', 'Detener en Destino');
        await onSendCommand('ROUTE:START', 'Iniciar Ejecución de Misión');
      }

      // 2. Record Event in Backend
      await apiService.recordMissionEvent(mission.id, {
        event_key: `EVT-DISPATCH-${mission.id}-${Date.now()}`,
        event_type: 'DISPATCHED',
        description: `Misión ${mission.mission_code} despachada al robot en modo ${isDemoMode ? 'DEMO' : 'USB SERIAL'}`,
        source: isDemoMode ? 'DEMO_SIMULATOR' : 'SERIAL_USB'
      });

      loadData();
    } catch (err) {
      alert(`Error al despachar la misión: ${err.message}`);
    }
  };

  // Confirm Pickup
  const handleConfirmPickup = async (mission) => {
    try {
      await apiService.recordMissionEvent(mission.id, {
        event_key: `EVT-PICKUP-${mission.id}`,
        event_type: 'CONFIRM_PICKUP',
        description: `Recogida de mercancía confirmada por el operador en estación ${mission.order.origin_location_code}`,
        source: 'OPERADOR_MANUAL'
      });
      loadData();
    } catch (err) {
      alert(`Error confirmando recogida: ${err.message}`);
    }
  };

  // Confirm Delivery
  const handleConfirmDelivery = async (mission) => {
    try {
      await apiService.recordMissionEvent(mission.id, {
        event_key: `EVT-DELIVERY-${mission.id}`,
        event_type: 'CONFIRM_DELIVERY',
        description: `Entrega de mercancía confirmada por el operador en estación ${mission.order.destination_location_code}`,
        source: 'OPERADOR_MANUAL'
      });
      loadData();
    } catch (err) {
      alert(`Error confirmando entrega: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Robot Connection / Demo Status Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${
            isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
            isDemoMode ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30' :
            'bg-amber-500/10 text-amber-400 border border-amber-500/30'
          }`}>
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Estado de la Conexión de Control</h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                isConnected ? 'bg-emerald-500/20 text-emerald-300' :
                isDemoMode ? 'bg-purple-500/20 text-purple-300' :
                'bg-amber-500/20 text-amber-300'
              }`}>
                {isConnected ? 'USB SERIAL ONLINE' : isDemoMode ? 'DEMO SIMULADO' : 'CARRITO DESCONECTADO'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {isConnected ? 'Listo para enviar órdenes y secuencias de rutas directas al Arduino UNO.' :
               isDemoMode ? 'Simulador activo: Las misiones responderán con eventos de prueba.' :
               'Conecta el puerto USB o activa el Modo Demo para enviar mandos al carrito.'}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
          title="Actualizar Misiones"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Orders Ready for Mission Assignment */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              Órdenes Disponibles para Asignar
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingOrders.length}
            </span>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No hay órdenes con stock reservado pendientes de asignación de misión.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {pendingOrders.map((ord) => (
                <div key={ord.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white">{ord.order_number}</span>
                    <span className="text-emerald-400 font-semibold">{ord.product?.sku}</span>
                  </div>
                  <div className="text-slate-300 font-medium">{ord.product?.name} ({ord.requested_quantity} unids)</div>
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                    <span>Ruta: {ord.origin_location_code} &rarr; {ord.destination_location_code}</span>
                  </div>
                  <button
                    onClick={() => handleOpenAssignModal(ord)}
                    className="w-full mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Asignar Misión a Robot
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Active & Historical Missions List */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-400" />
              Tablero de Misiones del Robot
            </h3>
            <span className="text-xs text-slate-500">Listado en vivo</span>
          </div>

          {loading && missions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-400" />
              Cargando misiones...
            </div>
          ) : missions.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              No hay misiones creadas en el sistema. Selecciona una orden pendiente para crear una misión.
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
              {missions.map((m) => (
                <div key={m.id} className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3 text-xs">
                  {/* Mission Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-400 text-sm">{m.mission_code}</span>
                      <span className="text-slate-400">| Order: {m.order?.order_number}</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      m.status === 'Asignada' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      ['En ejecución', 'Recogida confirmada', 'En transporte', 'Llegada a origen'].includes(m.status) ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 animate-pulse' :
                      m.status === 'Completada' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {m.status}
                    </span>
                  </div>

                  {/* Cargo & Location Specs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Producto Solicitado</span>
                      <span className="font-semibold text-white">{m.order?.product?.name}</span> ({m.order?.requested_quantity} unids)
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Trayecto Registrado</span>
                      <span className="font-mono font-bold text-emerald-400">{m.order?.origin_location_code} &rarr; {m.order?.destination_location_code}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Ruta Navegación</span>
                      <span className="font-mono text-indigo-300">{m.assigned_route_id}</span>
                    </div>
                  </div>

                  {/* Action Buttons for Mission Steps */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60">
                    {m.status === 'Asignada' && (
                      <button
                        onClick={() => handleDispatchMission(m)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" /> Iniciar Misión en Robot
                      </button>
                    )}

                    {['Asignada', 'En ejecución', 'Llegada a origen'].includes(m.status) && (
                      <button
                        onClick={() => handleConfirmPickup(m)}
                        className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Confirmar Recogida Origen
                      </button>
                    )}

                    {['Recogida confirmada', 'En transporte', 'Llegada a destino'].includes(m.status) && (
                      <button
                        onClick={() => handleConfirmDelivery(m)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar Entrega Destino
                      </button>
                    )}
                  </div>

                  {/* Mission Timeline Events */}
                  {m.events && m.events.length > 0 && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Trazabilidad de Eventos:</span>
                      {m.events.map((evt) => (
                        <div key={evt.id} className="text-[11px] text-slate-400 flex items-center justify-between">
                          <span>&bull; {evt.description}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(evt.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form Assign Mission */}
      {isAssignModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Asignar Misión de Transporte</h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMission} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-white font-mono">{selectedOrder.order_number}</div>
                <div className="text-slate-300">{selectedOrder.product?.name} ({selectedOrder.requested_quantity} unids)</div>
                <div className="font-mono text-emerald-400 text-[11px]">
                  {selectedOrder.origin_location_code} &rarr; {selectedOrder.destination_location_code}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Ruta de Navegación Compatible *</label>
                <select
                  value={assignedRoute}
                  onChange={(e) => setAssignedRoute(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="RUTA_A_B">Ruta 1: Directo ALM-01 a ENT-01</option>
                  <option value="RUTA_A_INTERSECTION_B">Ruta 2: Cruce por Intersección Central</option>
                  <option value="RUTA_CIRCUITO_REC">Ruta 3: Circuito con parada en REC-01</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {formSubmitting ? 'Asignando...' : 'Confirmar Asignación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
