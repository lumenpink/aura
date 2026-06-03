import React from 'react';
import Logo from './components/brand/Logo';
import './styles/global.css';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-12 p-8 font-sans">
      <div className="text-center flex flex-col gap-2">
        <h1 className="text-2xl font-light text-zinc-850 tracking-wider">Aura Brand System</h1>
        <p className="text-sm text-zinc-500">Visual comparison of logo variants across different backgrounds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full">
        {/* 1. Luminous Premium Gradient Version */}
        <div className="flex flex-col items-center gap-6 p-8 bg-zinc-900 text-white rounded-2xl shadow-xl aura-glow">
          <span className="text-xs font-semibold text-aura-violet tracking-widest uppercase">1. Original Gradient</span>
          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            <Logo size="large" variant="original" />
          </div>
          <span className="text-[11px] text-zinc-400">Perfect for web applications & dark UIs</span>
        </div>

        {/* 2. Flat Black Version (On light card) */}
        <div className="flex flex-col items-center gap-6 p-8 bg-white text-zinc-850 rounded-2xl shadow-xl aura-glow">
          <span className="text-xs font-semibold text-zinc-400 tracking-widest uppercase">2. Flat Black</span>
          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            <Logo size="large" variant="flat-black" />
          </div>
          <span className="text-[11px] text-zinc-400">Best for printing & high-contrast light backgrounds</span>
        </div>

        {/* 3. Flat White Version (On pitch black card) */}
        <div className="flex flex-col items-center gap-6 p-8 bg-zinc-950 text-white rounded-2xl shadow-xl aura-glow">
          <span className="text-xs font-semibold text-zinc-500 tracking-widest uppercase">3. Flat White</span>
          <div className="flex-1 flex items-center justify-center min-h-[160px]">
            <Logo size="large" variant="flat-white" />
          </div>
          <span className="text-[11px] text-zinc-600">Great for dark backgrounds & monochrome setups</span>
        </div>
      </div>
    </div>
  );
}
