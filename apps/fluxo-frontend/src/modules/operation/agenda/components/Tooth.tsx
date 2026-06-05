import React from 'react';

type Surface = 'V' | 'D' | 'L' | 'M' | 'O';

interface ToothEvent {
  surface: Surface;
  conceptId: string;
}

interface ToothProps {
  toothNumber: number;
  events: ToothEvent[];
  onSurfaceClick: (tooth: number, surface: Surface) => void;
}

export function Tooth({ toothNumber, events, onSurfaceClick }: ToothProps) {
  const getSurfaceClass = (surface: Surface) => {
    const event = events.find((e) => e.surface === surface);
    if (!event) return 'fill-white stroke-slate-300 hover:fill-slate-100';
    
    switch (event.conceptId) {
      case 'CON-CARIE': return 'fill-red-500 stroke-red-600';
      case 'CON-RESINA': return 'fill-sky-400 stroke-sky-500';
      case 'CON-EXTRA': return 'fill-slate-800 stroke-slate-900 opacity-20';
      default: return 'fill-white stroke-slate-300';
    }
  };

  return (
    <g className="select-none">
      <polygon points="0,0 40,0 30,10 10,10" className={`cursor-pointer transition-colors duration-150 ${getSurfaceClass('V')}`} onClick={() => onSurfaceClick(toothNumber, 'V')} />
      <polygon points="40,0 40,40 30,30 30,10" className={`cursor-pointer transition-colors duration-150 ${getSurfaceClass('D')}`} onClick={() => onSurfaceClick(toothNumber, 'D')} />
      <polygon points="0,40 10,30 30,30 40,40" className={`cursor-pointer transition-colors duration-150 ${getSurfaceClass('L')}`} onClick={() => onSurfaceClick(toothNumber, 'L')} />
      <polygon points="0,0 10,10 10,30 0,40" className={`cursor-pointer transition-colors duration-150 ${getSurfaceClass('M')}`} onClick={() => onSurfaceClick(toothNumber, 'M')} />
      <polygon points="10,10 30,10 30,30 10,30" className={`cursor-pointer transition-colors duration-150 ${getSurfaceClass('O')}`} onClick={() => onSurfaceClick(toothNumber, 'O')} />
      <text x="20" y="-8" textAnchor="middle" className="fill-slate-400 text-[10px] font-mono">{toothNumber}</text>
    </g>
  );
}
