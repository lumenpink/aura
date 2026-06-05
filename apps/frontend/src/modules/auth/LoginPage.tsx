import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginCredentials } from '@aura/shared';
import { Logo, CloudStatus } from '@aura/ui';
import { useCloudStatus } from '../core/context/CloudStatusContext';
import { Sun, Moon, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

/**
 * Formats a string to a standard CPF mask (999.999.999-99) in real-time,
 * ensuring cursor stability and removing any non-digit characters.
 */
const formatCPF = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, theme, toggleTheme }) => {
  const { status } = useCloudStatus();

  // Initialize react-hook-form with zod schema validation
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = (data: LoginCredentials) => {
    // Passes the clean unmasked username (Zod schema strips formatting)
    onLogin(data.username);
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

      {/* 1. Background Layer (Ambient Light & Waves) */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] rounded-full bg-violet-500/[0.04] dark:bg-violet-500/[0.08] blur-[120px] transition-all duration-300" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] min-w-[500px] min-h-[500px] rounded-full bg-pink-500/[0.04] dark:bg-pink-500/[0.08] blur-[120px] transition-all duration-300" />
        
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

      {/* 2. Crystalline Login Card */}
      <div className="w-full max-w-[420px] backdrop-blur-xl bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-10 shadow-2xl dark:shadow-black/40 aura-glow transition-all duration-300">
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo orientation="vertical" size="large" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          {/* CPF Username Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 ml-1">Usuário</label>
            <Controller
              name="username"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="text"
                  placeholder="000.000.000-00"
                  onChange={(e) => {
                    const formatted = formatCPF(e.target.value);
                    field.onChange(formatted);
                  }}
                  className={`w-full bg-zinc-50/50 dark:bg-zinc-950/50 border ${
                    errors.username 
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-zinc-200/60 dark:border-zinc-800/60 focus:ring-aura-violet focus:border-aura-violet'
                  } rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-1 transition-all duration-200 text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-650`}
                />
              )}
            />
            {errors.username && (
              <span className="text-[10px] text-red-500 dark:text-red-400 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.username.message}
              </span>
            )}
          </div>

          {/* Password Input */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center px-1">
              <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Senha de acesso</label>
              <a href="#forgot" className="text-[10px] text-aura-violet dark:text-violet-400 hover:underline">Esqueceu a senha?</a>
            </div>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  type="password"
                  placeholder="••••••••••••"
                  className={`w-full bg-zinc-50/50 dark:bg-zinc-950/50 border ${
                    errors.password 
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'border-zinc-200/60 dark:border-zinc-800/60 focus:ring-aura-violet focus:border-aura-violet'
                  } rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:ring-1 transition-all duration-200 text-zinc-900 dark:text-zinc-100 placeholder-zinc-450 dark:placeholder-zinc-650`}
                />
              )}
            />
            {errors.password && (
              <span className="text-[10px] text-red-500 dark:text-red-400 ml-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 rounded-xl font-medium text-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all duration-200 cursor-pointer shadow-md shadow-zinc-900/10 active:scale-[0.98] mt-2"
          >
            Acessar
          </button>
        </form>
      </div>

      {/* 3. Rodapé de Segurança (Trust Footer & Cloud Status) */}
      <footer className="absolute bottom-6 left-6 right-6 flex flex-col items-center gap-3 select-none text-[10px] text-zinc-400 dark:text-zinc-500 tracking-wide font-light transition-all duration-300">
        <div className="flex flex-col sm:flex-row items-center gap-1.5 sm:gap-2">
          <span>Conexão de ponta a ponta criptografada via TLS 1.3</span>
          <span className="hidden sm:inline text-zinc-350 dark:text-zinc-800">•</span>
          <span>Em conformidade com a LGPD</span>
        </div>
        <CloudStatus status={status} showText={true} />
      </footer>
    </div>
  );
};

export default LoginPage;
