import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import {
  Calendar, CheckCircle2, Clock, AlertTriangle, RefreshCw, Plus,
  Layers, User, ShieldAlert, CheckSquare, Clipboard, Upload, Search, X
} from 'lucide-react';

export function CycleCountModule() {
  const [schedules, setSchedules] = useState([]);
  const [activeSchedule, setActiveSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Single Complete Count Modal State
  const [selectedItem, setSelectedItem] = useState(null);
  const [singlePhysicalQty, setSinglePhysicalQty] = useState('');
  const [operatorName, setOperatorName] = useState('operador_inv');
  const [countNotes, setCountNotes] = useState('');
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState(null);

  // Bulk Count Modal State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkItemData, setBulkItemData] = useState({}); // { item_id: { physical_qty: string, notes: string, selected: bool } }
  const [pasteBoxOpen, setPasteBoxOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [bulkOperator, setBulkOperator] = useState('operador_inv');
  const [bulkError, setBulkError] = useState(null);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Confirmation Modal State
  const [confirmModalData, setConfirmModalData] = useState(null); // { mode: 'selected' | 'all', itemsToSubmit: [] }

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

  // --- Single Item Completion Handlers ---
  const handleOpenCompleteModal = (item) => {
    setSelectedItem(item);
    setSinglePhysicalQty(item.product.total_quantity.toString());
    setOperatorName('operador_inv');
    setCountNotes('');
    setCompleteError(null);
  };

  const handleConfirmCompleteItem = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;

    const physQtyNum = parseInt(singlePhysicalQty, 10);
    if (isNaN(physQtyNum) || physQtyNum < 0) {
      setCompleteError('Ingresa una cantidad física contada válida (número mayor o igual a 0).');
      return;
    }

    try {
      setCompleting(true);
      setCompleteError(null);
      await apiService.completeCycleCountItem(selectedItem.id, operatorName, countNotes, physQtyNum);
      setSelectedItem(null);

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

  // --- Bulk Count Handlers ---
  const handleOpenBulkModal = () => {
    if (!activeSchedule) return;
    const pendingItems = activeSchedule.items.filter(i => i.status === 'PENDIENTE');
    if (pendingItems.length === 0) {
      alert('Todas las referencias de esta semana ya están finalizadas.');
      return;
    }

    const initialMap = {};
    pendingItems.forEach(i => {
      initialMap[i.id] = {
        physical_qty: '', // Empty initially so user must input or confirm real count
        notes: '',
        selected: true
      };
    });

    setBulkItemData(initialMap);
    setBulkSearch('');
    setPasteBoxOpen(false);
    setPastedText('');
    setBulkOperator('operador_inv');
    setBulkError(null);
    setIsBulkModalOpen(true);
  };

  const pendingItemsList = activeSchedule ? activeSchedule.items.filter(i => i.status === 'PENDIENTE') : [];
  const filteredPendingItems = pendingItemsList.filter(i => {
    if (!bulkSearch) return true;
    const query = bulkSearch.toLowerCase().trim();
    return i.product.sku.toLowerCase().includes(query) || i.product.name.toLowerCase().includes(query);
  });

  const handleSelectAllFiltered = (checked) => {
    setBulkItemData(prev => {
      const next = { ...prev };
      filteredPendingItems.forEach(i => {
        if (next[i.id]) {
          next[i.id].selected = checked;
        }
      });
      return next;
    });
  };

  const handleApplyPastedData = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText.split('\n');
    let matchedCount = 0;

    setBulkItemData(prev => {
      const next = { ...prev };
      lines.forEach(line => {
        const parts = line.trim().split(/[\t,;\s]+/);
        if (parts.length >= 2) {
          const skuCode = parts[0].trim().toUpperCase();
          const qtyStr = parts[1].trim();
          const qtyVal = parseInt(qtyStr, 10);

          if (!isNaN(qtyVal) && qtyVal >= 0) {
            // Find item by SKU
            const matchItem = pendingItemsList.find(i => i.product.sku.toUpperCase() === skuCode);
            if (matchItem && next[matchItem.id]) {
              next[matchItem.id].physical_qty = qtyVal.toString();
              next[matchItem.id].selected = true;
              matchedCount++;
            }
          }
        }
      });
      return next;
    });

    alert(`Se asignaron cantidades físicas contadas a ${matchedCount} referencias desde los datos pegados.`);
    setPastedText('');
    setPasteBoxOpen(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      let matchedCount = 0;

      setBulkItemData(prev => {
        const next = { ...prev };
        lines.forEach(line => {
          const parts = line.trim().split(/[\t,;\s]+/);
          if (parts.length >= 2) {
            const skuCode = parts[0].trim().toUpperCase();
            const qtyStr = parts[1].trim();
            const qtyVal = parseInt(qtyStr, 10);

            if (!isNaN(qtyVal) && qtyVal >= 0) {
              const matchItem = pendingItemsList.find(i => i.product.sku.toUpperCase() === skuCode);
              if (matchItem && next[matchItem.id]) {
                next[matchItem.id].physical_qty = qtyVal.toString();
                next[matchItem.id].selected = true;
                matchedCount++;
              }
            }
          }
        });
        return next;
      });

      alert(`Se cargaron resultados físicos para ${matchedCount} referencias desde el archivo.`);
    };
    reader.readAsText(file);
  };

  const validateAndPrepareSubmission = (mode) => {
    setBulkError(null);
    let targetItems = [];

    if (mode === 'selected') {
      targetItems = pendingItemsList.filter(i => bulkItemData[i.id] && bulkItemData[i.id].selected);
      if (targetItems.length === 0) {
        setBulkError('Selecciona al menos una referencia para finalizar.');
        return;
      }
    } else { // 'all'
      targetItems = [...pendingItemsList];
    }

    // Validate physical counts entered
    const invalidItems = [];
    const missingItems = [];
    const payloadItems = [];

    targetItems.forEach(item => {
      const data = bulkItemData[item.id] || {};
      const valStr = data.physical_qty !== undefined ? data.physical_qty.trim() : '';

      if (valStr === '') {
        missingItems.push(item);
      } else {
        const valNum = parseInt(valStr, 10);
        if (isNaN(valNum) || valNum < 0) {
          invalidItems.push(item);
        } else {
          payloadItems.push({
            item_id: item.id,
            physical_quantity: valNum,
            notes: data.notes ? data.notes.trim() : null
          });
        }
      }
    });

    if (invalidItems.length > 0) {
      setBulkError(`Las siguientes referencias tienen cantidades físicas inválidas (deben ser enteros mayores o iguales a 0): ${invalidItems.map(i => i.product.sku).join(', ')}`);
      return;
    }

    if (mode === 'all' && missingItems.length > 0) {
      setBulkError(`Para 'Finalizar todos los conteos pendientes', debes ingresar el conteo físico de todas las referencias. Faltan ${missingItems.length} por contar (Ej: ${missingItems.slice(0, 3).map(i => i.product.sku).join(', ')}).`);
      return;
    }

    if (payloadItems.length === 0) {
      setBulkError('Ingresa la cantidad física contada para las referencias seleccionadas antes de finalizar.');
      return;
    }

    // Open confirmation step modal
    setConfirmModalData({
      mode,
      itemsToSubmit: payloadItems,
      uncountedRemaining: pendingItemsList.length - payloadItems.length
    });
  };

  const handleExecuteBulkSubmit = async () => {
    if (!confirmModalData || !activeSchedule) return;

    try {
      setBulkSubmitting(true);
      setBulkError(null);

      await apiService.bulkCompleteCycleCountItems({
        schedule_id: activeSchedule.id,
        user_id: bulkOperator || 'operador_inv',
        items: confirmModalData.itemsToSubmit
      });

      setConfirmModalData(null);
      setIsBulkModalOpen(false);

      // Refresh schedule list & update active schedule state
      const updatedSchedules = await apiService.getCycleSchedules();
      setSchedules(updatedSchedules);
      const current = updatedSchedules.find(s => s.id === activeSchedule.id) || updatedSchedules[0];
      setActiveSchedule(current);
    } catch (err) {
      setBulkError(err.message || 'Error al ejecutar la finalización masiva de conteos.');
      setConfirmModalData(null);
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Programación Semanal de Conteos Cíclicos</h2>
            <p className="text-xs text-slate-400">Objetivo: 57 referencias por semana. Máximo 5 conteos físicos por referencia al año.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {activeSchedule && pendingItemsList.length > 0 && (
            <button
              onClick={handleOpenBulkModal}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-950/40"
            >
              <CheckSquare className="w-4 h-4" />
              Registrar Conteo Masivo ({pendingItemsList.length} pend.)
            </button>
          )}

          <button
            onClick={handleGenerateWeeklySchedule}
            disabled={generating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40 disabled:opacity-50"
          >
            {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {generating ? 'Generando 57 Referencias...' : 'Generar Nueva Programación Semanal'}
          </button>
        </div>
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
                  <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs rounded-xl flex items-center gap-2 max-w-md">
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
                      <th className="py-2.5 px-3">Ubicación</th>
                      <th className="py-2.5 px-3 text-center">Cant. Esperada</th>
                      <th className="py-2.5 px-3 text-center">Cant. Física</th>
                      <th className="py-2.5 px-3 text-center">Discrepancia</th>
                      <th className="py-2.5 px-3 text-center">Estado</th>
                      <th className="py-2.5 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {activeSchedule.items.map((item) => {
                      const prod = item.product;
                      const isCompleted = item.status === 'FINALIZADO';
                      const isMaxCount = prod.annual_physical_count >= 5;

                      let diffBadge = <span className="text-slate-500">-</span>;
                      if (item.discrepancy !== null && item.discrepancy !== undefined) {
                        if (item.discrepancy === 0) {
                          diffBadge = <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Coincide (0)</span>;
                        } else if (item.discrepancy > 0) {
                          diffBadge = <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">+{item.discrepancy} (Sobrante)</span>;
                        } else {
                          diffBadge = <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">{item.discrepancy} (Faltante)</span>;
                        }
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{prod.sku}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-200">{prod.name}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{prod.default_location_code}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-white">{item.expected_quantity !== null && item.expected_quantity !== undefined ? item.expected_quantity : prod.total_quantity}</td>
                          <td className="py-2.5 px-3 text-center font-bold font-mono text-emerald-300">
                            {item.physical_quantity !== null && item.physical_quantity !== undefined ? item.physical_quantity : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">{diffBadge}</td>
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
                                Finalizar
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

      {/* Single Item Complete Action Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-sm font-bold text-white">Registrar Conteo Físico Individual</h3>
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
                <div className="text-[11px] text-slate-400 pt-1 flex items-center justify-between">
                  <span>Cantidad Esperada (Sistema): <strong className="text-white">{selectedItem.product.total_quantity}</strong></span>
                  <span>Ubicación: <strong className="text-emerald-400">{selectedItem.product.default_location_code}</strong></span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Cantidad Física Real Contada *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={singlePhysicalQty}
                  onChange={(e) => setSinglePhysicalQty(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-emerald-300 font-mono font-bold text-sm px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
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

      {/* BULK COUNT MODAL ("Registrar Conteo Masivo") */}
      {isBulkModalOpen && activeSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl my-8 overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Registrar Conteo Masivo - Semana #{activeSchedule.week_number} ({activeSchedule.year})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ingresa o confirma las cantidades físicas reales para las referencias pendientes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs flex-1">
              {bulkError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{bulkError}</span>
                  </div>
                  <button onClick={() => setBulkError(null)} className="text-red-400 hover:text-white font-bold">✕</button>
                </div>
              )}

              {/* Operator & Tools Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Operador / Inspector Responsable *</label>
                  <input
                    type="text"
                    required
                    value={bulkOperator}
                    onChange={(e) => setBulkOperator(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-white px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPasteBoxOpen(!pasteBoxOpen)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-semibold"
                  >
                    <Clipboard className="w-4 h-4 text-emerald-400" />
                    Pegar desde Excel
                  </button>

                  <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 font-semibold cursor-pointer">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    Cargar Archivo
                    <input type="file" accept=".csv, .tsv, .txt, .xlsx" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Filtrar Referencias Pendientes</label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Buscar por código SKU o descripción..."
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-white pl-8 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* Collapsible Paste Box */}
              {pasteBoxOpen && (
                <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">Pegar celdas de Excel (SKU [Tab / Coma / Espacio] Cantidad)</span>
                    <button onClick={() => setPasteBoxOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Copia columnas desde Excel (Ejemplo: `200040	15`) y pégalas aquí. Las cantidades coincidentes se asignarán automáticamente a la tabla.
                  </p>
                  <textarea
                    rows="3"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="200040	15&#10;PROD-MOD-01	25"
                    className="w-full bg-slate-900 border border-slate-800 text-emerald-300 font-mono text-xs p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyPastedData}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-sm"
                    >
                      Aplicar Datos Pegados
                    </button>
                  </div>
                </div>
              )}

              {/* Main Editable Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[350px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">
                        <input
                          type="checkbox"
                          onChange={(e) => handleSelectAllFiltered(e.target.checked)}
                          checked={filteredPendingItems.length > 0 && filteredPendingItems.every(i => bulkItemData[i.id]?.selected)}
                          className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                        />
                      </th>
                      <th className="py-2.5 px-3">SKU / Código</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3">Ubicación</th>
                      <th className="py-2.5 px-3 text-center">Esperada</th>
                      <th className="py-2.5 px-3 text-center w-36">Física Contada *</th>
                      <th className="py-2.5 px-3 text-center">Discrepancia</th>
                      <th className="py-2.5 px-3">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredPendingItems.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-8 text-slate-500">
                          No se encontraron referencias pendientes que coincidan con la búsqueda.
                        </td>
                      </tr>
                    ) : (
                      filteredPendingItems.map((item) => {
                        const prod = item.product;
                        const data = bulkItemData[item.id] || { physical_qty: '', notes: '', selected: true };
                        const expectedQty = item.expected_quantity !== null && item.expected_quantity !== undefined ? item.expected_quantity : prod.total_quantity;

                        const physNum = parseInt(data.physical_qty, 10);
                        let diffBadge = <span className="text-slate-500">-</span>;

                        if (data.physical_qty.trim() !== '' && !isNaN(physNum) && physNum >= 0) {
                          const diff = physNum - expectedQty;
                          if (diff === 0) {
                            diffBadge = <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Coincide (0)</span>;
                          } else if (diff > 0) {
                            diffBadge = <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">+{diff} (Sobrante)</span>;
                          } else {
                            diffBadge = <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">{diff} (Faltante)</span>;
                          }
                        }

                        return (
                          <tr key={item.id} className={`hover:bg-slate-800/40 transition-colors ${data.selected ? 'bg-indigo-950/10' : ''}`}>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={Boolean(data.selected)}
                                onChange={(e) => {
                                  setBulkItemData(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], selected: e.target.checked }
                                  }));
                                }}
                                className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-emerald-400">{prod.sku}</td>
                            <td className="py-2 px-3 font-medium text-slate-200">{prod.name}</td>
                            <td className="py-2 px-3 font-mono text-slate-400">{prod.default_location_code}</td>
                            <td className="py-2 px-3 text-center font-bold text-white">{expectedQty}</td>
                            <td className="py-2 px-3 text-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="Ingresar..."
                                value={data.physical_qty}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkItemData(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], physical_qty: val }
                                  }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-emerald-300 font-mono font-bold text-xs text-center px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                              />
                            </td>
                            <td className="py-2 px-3 text-center">{diffBadge}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                placeholder="Notas opcionales..."
                                value={data.notes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setBulkItemData(prev => ({
                                    ...prev,
                                    [item.id]: { ...prev[item.id], notes: val }
                                  }));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shrink-0">
              <div className="text-xs text-slate-400">
                <span>Pendientes en la semana: <strong className="text-white">{pendingItemsList.length}</strong></span>
                <span className="mx-2">|</span>
                <span>Seleccionadas: <strong className="text-indigo-400">{pendingItemsList.filter(i => bulkItemData[i.id]?.selected).length}</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={() => validateAndPrepareSubmission('selected')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-indigo-950/40"
                >
                  Validar y finalizar seleccionados
                </button>

                <button
                  type="button"
                  onClick={() => validateAndPrepareSubmission('all')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/40"
                >
                  Finalizar todos los conteos pendientes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {confirmModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in duration-200 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirmar Registro de Conteos Físicos</h3>
                <p className="text-xs text-slate-400">Verifica los datos antes de guardar en la base de datos.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>Referencias a registrar:</span>
                <strong className="text-emerald-400 font-mono text-sm">{confirmModalData.itemsToSubmit.length}</strong>
              </div>
              {confirmModalData.uncountedRemaining > 0 && (
                <div className="flex items-center justify-between text-amber-400 pt-1 border-t border-slate-850">
                  <span>Referencias que permanecerán pendientes:</span>
                  <strong className="font-mono">{confirmModalData.uncountedRemaining}</strong>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-300">
              Se registrarán físicamente las <strong>{confirmModalData.itemsToSubmit.length} referencias</strong> con sus conteos ingresados.
              Esta acción incrementará el contador de conteos anuales de cada referencia. ¿Deseas continuar?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={bulkSubmitting}
                onClick={handleExecuteBulkSubmit}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/40 disabled:opacity-50"
              >
                {bulkSubmitting ? 'Guardando...' : 'Sí, Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
