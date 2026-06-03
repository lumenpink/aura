import React, { useState } from 'react';
import Logo from '../../components/brand/Logo';
import { Sun, Moon } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, theme, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email);
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300">
      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2.5 bg-white/70 dark:bg-zinc-900/70 border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all cursor-pointer shadow-xs text-zinc-600 dark:text-zinc-300"
        aria-label="Alternar tema"
      >
        {theme === 'light' ? <Moon className="w-4.5 h-4.5 stroke-[1.5]" /> : <Sun className="w-4.5 h-4.5 stroke-[1.5]" />}
      </button>

      {/* 1. Camada de Fundo (Ambient Light & Waves) */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        {/* Ambient Lights simulating logo emission - stronger in dark mode */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] rounded-full bg-violet-500/[0.04] dark:bg-violet-500/[0.08] blur-[120px] transition-all duration-300" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] rounded-full bg-pink-500/[0.04] dark:bg-pink-500/[0.08] blur-[120px] transition-all duration-300" />
        
        {/* SVG Waves - increased opacity in dark mode */}
        <svg className="absolute bottom-0 left-0 w-full h-[60vh] min-h-[400px]" viewBox="0 0 1440 600" fill="none" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={theme === 'light' ? '0.08' : '0.14'} />
              <stop offset="100%" stopColor="#ec4899" stopOpacity={theme === 'light' ? '0.03' : '0.06'} />
            </linearGradient>
            <linearGradient id="waveGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity={theme === 'light' ? '0.06' : '0.12'} />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity={theme === 'light' ? '0.1' : '0.15'} />
            </linearGradient>
            <linearGradient id="waveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={theme === 'light' ? '0.03' : '0.07'} />
              <stop offset="50%" stopColor="#e2e8f0" stopOpacity={theme === 'light' ? '0.08' : '0.12'} />
              <stop offset="100%" stopColor="#ec4899" stopOpacity={theme === 'light' ? '0.05' : '0.1'} />
            </linearGradient>
          </defs>
          <path d="M0 250 C 360 180, 720 320, 1080 200 C 1260 140, 1440 220, 1440 220 V600 H0 Z" fill="url(#waveGrad1)" className="transition-all duration-300" />
          <path d="M0 320 C 480 400, 960 220, 1440 350 V600 H0 Z" fill="url(#waveGrad2)" className="transition-all duration-300" />
          <path d="M0 400 C 360 300, 720 450, 1080 380 C 1260 340, 1440 400, 1440 400 V600 H0 Z" fill="url(#waveGrad3)" className="transition-all duration-300" />
        </svg>
      </div>

      {/* 2. Card de Login Cristalino */}
      <div className="w-full max-w-[420px] backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-10 shadow-2xl dark:shadow-black/40 aura-glow transition-all duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo orientation="vertical" size="large" />
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4">Insira suas credenciais para acessar o painel administrativo.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-1">E-mail corporativo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@aura.design"
              className="w-full bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-aura-violet focus:border-aura-violet transition-all duration-200 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Senha de acesso</label>
              <a href="#forgot" className="text-[10px] text-aura-violet dark:text-violet-400 hover:underline">Esqueceu a senha?</a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-zinc-50/50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-1 focus:ring-aura-violet focus:border-aura-violet transition-all duration-200 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all duration-200 cursor-pointer shadow-md shadow-zinc-900/10 active:scale-[0.98] mt-2"
          >
            Entrar no ecossistema
          </button>
        </form>

        <div className="mt-8 text-center">
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">Não tem acesso? </span>
          <a href="#request" className="text-[11px] text-aura-violet dark:text-violet-400 font-semibold hover:underline">Solicitar convite</a>
        </div>
      </div>

      {/* 3. Rodapé de Segurança (Trust Footer) */}
      <footer className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-4 sm:gap-6 justify-center text-zinc-400 dark:text-zinc-500 text-[10px] sm:text-xs tracking-wider uppercase select-none text-center transition-all duration-300">
        <span>Ambiente Seguro LGPD</span>
        <span className="text-zinc-200 dark:text-zinc-800 hidden sm:inline">|</span>
        <span>Criptografia de Elite</span>
        <span className="text-zinc-200 dark:text-zinc-800 hidden sm:inline">|</span>
        <span className="flex items-center gap-1.5 justify-center">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          Aura Cloud: Online
        </span>
      </footer>
    </div>
  );
};

export default LoginPage;
