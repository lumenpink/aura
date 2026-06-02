import React, { useState } from 'react';
import { Odontogram } from './Odontogram';
import { AlertTriangle, Stethoscope, Syringe, Sparkles, Save, Eraser, CheckCircle2 } from 'lucide-react';

type Surface = 'V' | 'D' | 'L' | 'M' | 'O';

interface OdontogramEvent {
  toothFdi: number;
  surface: Surface;
  conceptId: string;
}

export function OdontogramWorkspace() {
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [patientEvents, setPatientEvents] = useState<OdontogramEvent[]>([]);

  const patient = { name: "Lisiane Freitas", age: 46, id: "PAC-9938", alerts: ["Alérgica a Penicilina"] };

  const toolCategories = [
    {
      title: "Diagnóstico (Patologias)",
      tools: [{ id: 'CON-CARIE', label: 'Cárie', color: 'bg-red-500', icon: Stethoscope }]
    },
    {
      title: "Procedimentos (Execução)",
      tools: [
        { id: 'CON-RESINA', label: 'Resina', color: 'bg-sky-400', icon: Sparkles },
        { id: 'CON-EXTRA', label: 'Extração', color: 'bg-slate-800', icon: Syringe }
      ]
    }
  ];

  const handleSurfaceSelect = (tooth: number, surface: Surface) => {
    if (!activeTool) return;
    setPatientEvents(prev => [...prev, { toothFdi: tooth, surface, conceptId: activeTool }]);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-md font-bold">{patient.name}</h1>
            <p className="text-xs text-slate-500">ID: {patient.id} • {patient.age} anos</p>
          </div>
          <div className="flex gap-2">
            {patient.alerts.map(a => (
              <span key={a} className="flex items-center gap-1 bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-bold border border-red-200">
                <AlertTriangle size={12} /> {a}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm font-bold text-emerald-600 flex items-center gap-1"><CheckCircle2 size={14} /> Aura OS • Ativa</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto p-6 bg-slate-100/40 flex flex-col justify-center">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
            <Odontogram events={patientEvents} onSurfaceSelect={handleSurfaceSelect} />
          </div>
        </main>

        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 shadow-sm">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <button onClick={() => setPatientEvents([])} className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
              <Eraser size={14} /> Limpar Gráfico
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {toolCategories.map(cat => (
              <div key={cat.title}>
                <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">{cat.title}</h4>
                <div className="grid grid-cols-2 gap-2">
                  {cat.tools.map(t => (
                    <button key={t.id} onClick={() => setActiveTool(t.id)} className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${activeTool === t.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                      <t.icon size={16} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col gap-2">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700">
              <Save size={16} /> Salvar Prontuário
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
