import React from 'react';
import { MapPin, Navigation, Flag } from 'lucide-react';

export function SchematicMap({ lastRef, routeStep, routeTotal, robotStatus }) {
  // Determine active node highlighting based on lastRef & routeStep
  let activeNodeId = 'A'; // Default Origen

  const refUpper = (lastRef || '').toUpperCase();
  if (refUpper.includes('INTERSECCIÓN 1') || routeStep === 1) {
    activeNodeId = 'I1';
  } else if (refUpper.includes('INTERSECCIÓN 2') || routeStep === 2) {
    activeNodeId = 'I2';
  } else if (refUpper.includes('GIRO IZQUIERDA') || refUpper.includes('DESTINO A')) {
    activeNodeId = 'D1';
  } else if (refUpper.includes('GIRO DERECHA') || refUpper.includes('DESTINO B')) {
    activeNodeId = 'D2';
  } else if (refUpper.includes('DESTINO') || routeStep >= routeTotal) {
    activeNodeId = routeTotal > 2 ? 'D2' : 'D1';
  }

  const nodes = [
    { id: 'A', label: 'Origen (A)', x: 70, y: 110, type: 'start' },
    { id: 'I1', label: 'Intersección 1 (I1)', x: 210, y: 110, type: 'junction' },
    { id: 'I2', label: 'Intersección 2 (I2)', x: 350, y: 110, type: 'junction' },
    { id: 'D1', label: 'Destino A (Norte)', x: 470, y: 50, type: 'end' },
    { id: 'D2', label: 'Destino B (Sur)', x: 470, y: 170, type: 'end' }
  ];

  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Navigation className="w-4 h-4 text-indigo-400" />
          Mapa Esquemático del Recorrido
        </span>
        <span className="text-[11px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          Ref. Detectada: <strong className="text-indigo-300">{lastRef || 'Inicio'}</strong>
        </span>
      </div>

      <div className="relative w-full overflow-x-auto bg-slate-900/90 rounded-xl border border-slate-800/80 p-2">
        <svg viewBox="0 0 540 220" className="w-full h-auto min-w-[480px]">
          {/* Black circuit tracks */}
          {/* Track line: Origin -> I1 */}
          <line x1="70" y1="110" x2="210" y2="110" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <line x1="70" y1="110" x2="210" y2="110" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 4" />

          {/* Track line: I1 -> I2 */}
          <line x1="210" y1="110" x2="350" y2="110" stroke="#334155" strokeWidth="8" strokeLinecap="round" />
          <line x1="210" y1="110" x2="350" y2="110" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 4" />

          {/* Branch lines: I2 -> D1 (North) and I2 -> D2 (South) */}
          <path d="M 350 110 L 410 50 L 470 50" fill="none" stroke="#334155" strokeWidth="8" strokeLinejoin="round" />
          <path d="M 350 110 L 410 50 L 470 50" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 4" />

          <path d="M 350 110 L 410 170 L 470 170" fill="none" stroke="#334155" strokeWidth="8" strokeLinejoin="round" />
          <path d="M 350 110 L 410 170 L 470 170" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 4" />

          {/* Render Nodes */}
          {nodes.map((node) => {
            const isActive = node.id === activeNodeId;
            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                {/* Outer Glow Circle for Active Robot Position */}
                {isActive && (
                  <circle
                    r="22"
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth="3"
                    className="animate-ping opacity-75"
                  />
                )}

                {/* Node Circle */}
                <circle
                  r="14"
                  fill={isActive ? '#6366f1' : node.type === 'start' ? '#10b981' : node.type === 'end' ? '#f59e0b' : '#1e293b'}
                  stroke={isActive ? '#818cf8' : '#475569'}
                  strokeWidth="3"
                />

                {/* Icon inside node */}
                {node.type === 'start' && (
                  <circle r="4" fill="#ffffff" />
                )}
                {node.type === 'end' && (
                  <polygon points="-3,-4 5,0 -3,4" fill="#ffffff" />
                )}
                {node.type === 'junction' && (
                  <circle r="3" fill="#94a3b8" />
                )}

                {/* Robot Badge overlay if active */}
                {isActive && (
                  <g transform="translate(0, -28)">
                    <rect
                      x="-26"
                      y="-12"
                      width="52"
                      height="18"
                      rx="4"
                      fill="#4f46e5"
                      stroke="#818cf8"
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="9"
                      fontWeight="bold"
                    >
                      ROBOT
                    </text>
                  </g>
                )}

                {/* Node Text Label */}
                <text
                  x="0"
                  y="30"
                  textAnchor="middle"
                  fill={isActive ? '#818cf8' : '#94a3b8'}
                  fontSize="10"
                  fontWeight={isActive ? 'bold' : 'normal'}
                >
                  {node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Origen
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-700 inline-block"></span> Intersecciones IR
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> Destinos
        </span>
        <span className="flex items-center gap-1 text-indigo-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block animate-pulse"></span> Posición Detectada
        </span>
      </div>
    </div>
  );
}
