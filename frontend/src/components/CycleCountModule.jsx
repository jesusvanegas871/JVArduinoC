import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle, RefreshCw, Plus,
  Hash, Layers, User, ShieldAlert, FileText, CheckSquare
} from 'lucide-react';

export function CycleCountModule() {
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Complete Count Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [operatorName, setOperatorName] = useState('operador_inv');
  const [countNotes, setCountNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);

  const loadSchedules = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiService.getCycleSchedules();
      setSchedules(res);
      if (res.length > 0) {
        setActiveSchedule(res[0]);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar programaciones de conteo cíclico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleGenerateWeeklySchedule = async () => {
    try {
      setGenerating(true);
      setError(null);
      const newSched = await apiService.generateCycleSchedule({ target_count: 57 });
      await loadSchedules();
      setActiveSchedule(newSched);
    } catch (err) {
      setError(err.message || 'Error generando programación semanal de conteos cíclicos');
    } finally {
      setGenerating(false);
    }
  };

  const handleOpenCompleteModal = (item) => {
    setSelectedItem(item);
    setOperatorName('operador_inv');
    setCountNotes('');
    setCompleteError(null);
  };

  const handleConfirmCompleteItem = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      setCompleting(true);
      setCompleteError(null);
      await apiService.completeCycleCountItem(selectedItem.id, operatorName, countNotes);
      setSelectedItem(null);

      // Refresh schedule list & update active schedule state
      const updatedSchedules = await apiService.getCycleSchedules();
      setSchedules(updatedSchedules);
      const current = updatedSchedules.find(s => s.id === activeSchedule.id) || updatedSchedules[0];
      setActiveSchedule(current);
    } catch (err) {
      setCompleteError(err.message || 'Error al registrar la finalización del conteo físico.');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Programación Semanal de Conteos Cíclicos</h2>
            <p className="text-xs text-slate-400">Objetivo: 57 referencias por semana. Máximo 5 conteos físicos por referencia al año.</p>
          </div>
        </div>

        <button
          onClick={handleGenerateWeeklySchedule}
          disabled={generating}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50 shrink-0"
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {generating ? 'Generando 57 Referencias...' : 'Generar Nueva Programación Semanal'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Schedules History List */}
        <div className="lg:col-span-1 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Historial de Semanas
          </h3>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Cargando...
            </div>
          ) : schedules.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No hay programaciones semanales registradas. Haz clic en 'Generar Nueva Programación'.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {schedules.map((s) => {
                const isActive = activeSchedule && activeSchedule.id === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSchedule(s)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1 ${
                      isActive
                        ? 'bg-emerald-600/10 border-emerald-500/40 text-white shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>Semana #{s.week_number} - {s.year}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        s.status === 'COMPLETADO' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
                      <span>Progreso: {s.completed_count} / {s.scheduled_count}</span>
                      <span className="font-mono text-emerald-400">{Math.round((s.completed_count / (s.scheduled_count || 1)) * 100)}%</span>
                    </div>

                    {s.warning_message && (
                      <span className="text-[10px] text-amber-400 font-semibold truncate mt-0.5">
                        ⚠️ {s.warning_message}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Schedule Details & Items Table */}
        <div className="lg:col-span-3 space-y-4">
          {activeSchedule ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              {/* Schedule Summary Banner */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-white">
                      Programación Semana #{activeSchedule.week_number} ({activeSchedule.year})
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                      Target: {activeSchedule.target_count} refs
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Creada el {new Date(activeSchedule.created_at).toLocaleString('es-ES')} | Programadas: <strong className="text-white">{activeSchedule.scheduled_count}</strong> | Finalizadas: <strong className="text-emerald-400">{activeSchedule.completed_count}</strong>
                  </p>
                </div>

                {activeSchedule.warning_message && (
                  <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{activeSchedule.warning_message}</span>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Código / SKU</th>
                      <th className="py-2.5 px-3">Descripción Referencia</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3 text-center">Conteos Físicos Anuales</th>
                      <th className="py-2.5 px-3 text-center">Estado Conteo</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {activeSchedule.items.map((item) => {
                      const prod = item.product;
                      const isCompleted = item.status === 'FINALIZADO';
                      const isMaxCount = prod.annual_physical_count >= 5;

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{prod.sku}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-200">{prod.name}</td>
                          <td className="py-2.5 px-3 text-slate-400">{prod.category?.name || 'Sin categoría'}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-bold ${
                              isMaxCount ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}>
                              {prod.annual_physical_count} / 5
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Finalizado
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                <Clock className="w-3 h-3" /> Pendiente
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isCompleted && (
                              <button
                                onClick={() => handleOpenCompleteModal(item)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-emerald-950/40"
                              >
                                Finalizar Conteo
                              </button>
                            )}
                            {isCompleted && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                {item.completed_at ? new Date(item.completed_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'OK'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
              Selecciona una semana del panel izquierdo o genera una nueva programación de 57 referencias.
            </div>
          )}
        </div>
      </div>

      {/* Complete Count Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Registrar Conteo Físico Finalizado</h3>
              <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfirmCompleteItem} className="p-5 space-y-4 text-xs">
              {completeError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                  {completeError}
                </div>
              )}

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <div className="text-[11px] text-slate-400">Referencia seleccionada:</div>
                <div className="font-mono font-bold text-emerald-400">{selectedItem.product.sku}</div>
                <div className="text-white font-semibold">{selectedItem.product.name}</div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Conteos físicos completados este año: <strong className="text-emerald-400">{selectedItem.product.annual_physical_count} / 5</strong>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Nombre del Operador / Inspector *</label>
                <input
                  type="text"
                  required
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Observaciones / Notas del Conteo</label>
                <textarea
                  rows="2"
                  placeholder="Ej. Cantidad física verificada en estante A3..."
                  value={countNotes}
                  onChange={(e) => setCountNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] rounded-xl flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Al confirmar, el contador anual de conteos físicos de esta referencia se incrementará en +1.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold rounded-xl hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={completing}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-950/40 disabled:opacity-50"
                >
                  {completing ? 'Guardando...' : 'Confirmar y Finalizar Conteo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
