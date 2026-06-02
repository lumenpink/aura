import React from 'react';
import { Tooth } from './Tooth';

type Surface = 'V' | 'D' | 'L' | 'M' | 'O';

interface OdontogramEvent {
  toothFdi: number;
  surface: Surface;
  conceptId: string;
}

interface OdontogramProps {
  events: OdontogramEvent[];
  onSurfaceSelect: (tooth: number, surface: Surface) => void;
}

export function Odontogram({ events, onSurfaceSelect }: OdontogramProps) {
  const upperLeft = [18, 17, 16, 15, 14, 13, 12, 11];
  const upperRight = [21, 22, 23, 24, 25, 26, 27, 28];
  const lowerLeft = [48, 47, 46, 45, 44, 43, 42, 41];
  const lowerRight = [31, 32, 33, 34, 35, 36, 37, 38];

  const getToothEvents = (toothNumber: number) => {
    return events
      .filter((e) => e.toothFdi === toothNumber)
      .map((e) => ({ surface: e.surface, conceptId: e.conceptId }));
  };

  return (
    <div className="w-full overflow-x-auto bg-white p-4 rounded-xl">
      <div className="min-w-[760px] flex flex-col items-center justify-center">
        <svg viewBox="0 0 760 220" className="w-full h-auto">
          <g id="upper-arch">
            {upperLeft.map((tooth, index) => (
              <g key={tooth} transform={`translate(${index * 45 + 10}, 30)`}>
                <Tooth toothNumber={tooth} events={getToothEvents(tooth)} onSurfaceClick={onSurfaceSelect} />
              </g>
            ))}
            <line x1="375" y1="10" x2="375" y2="210" stroke="#e2e8f0" strokeDasharray="4" strokeWidth="2" />
            {upperRight.map((tooth, index) => (
              <g key={tooth} transform={`translate(${index * 45 + 390}, 30)`}>
                <Tooth toothNumber={tooth} events={getToothEvents(tooth)} onSurfaceClick={onSurfaceSelect} />
              </g>
            ))}
          </g>
          <g id="lower-arch">
            {lowerLeft.map((tooth, index) => (
              <g key={tooth} transform={`translate(${index * 45 + 10}, 140)`}>
                <Tooth toothNumber={tooth} events={getToothEvents(tooth)} onSurfaceClick={onSurfaceSelect} />
              </g>
            ))}
            {lowerRight.map((tooth, index) => (
              <g key={tooth} transform={`translate(${index * 45 + 390}, 140)`}>
                <Tooth toothNumber={tooth} events={getToothEvents(tooth)} onSurfaceClick={onSurfaceSelect} />
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
