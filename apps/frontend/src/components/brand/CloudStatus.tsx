import React, { useState, useEffect } from 'react';
import { Cloud, Check, RefreshCw, HardDrive, AlertTriangle } from 'lucide-react';

export type CloudStatusType = 'online' | 'syncing' | 'offline' | 'error';

interface CloudStatusProps {
  status?: CloudStatusType;
  showText?: boolean;
  className?: string;
  tooltipAlign?: 'top' | 'right' | 'bottom' | 'left';
}

export const CloudStatus: React.FC<CloudStatusProps> = ({
  status = 'online',
  showText = false,
  className = '',
  tooltipAlign = 'top',
}) => {
  const [isClicked, setIsClicked] = useState(false);

  useEffect(() => {
    if (!isClicked) return;
    const handleOutsideClick = () => {
      setIsClicked(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isClicked]);

  const handleToggle = (e: React.MouseEvent) => {
    if (showText) return;
    e.stopPropagation();
    setIsClicked((prev) => !prev);
  };

  // Config for each status state
  const statusConfig = {
    online: {
      color: 'text-emerald-500 dark:text-emerald-400',
      dotColor: 'bg-emerald-500',
      label: 'Online',
      icon: (
        <div className="relative inline-flex items-center justify-center shrink-0">
          <Cloud className="w-5 h-5 stroke-[1.5]" />
          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white dark:text-zinc-950 rounded-full p-0.5 border border-white dark:border-zinc-950">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        </div>
      ),
    },
    syncing: {
      color: 'text-blue-500 dark:text-blue-400',
      dotColor: 'bg-blue-500',
      label: 'Sincronizando',
      icon: (
        <div className="relative inline-flex items-center justify-center shrink-0">
          <RefreshCw className="w-4.5 h-4.5 stroke-[1.5] animate-spin" />
        </div>
      ),
    },
    offline: {
      color: 'text-zinc-400 dark:text-zinc-500',
      dotColor: 'bg-zinc-400',
      label: 'Offline',
      icon: (
        <div className="relative inline-flex items-center justify-center shrink-0">
          <HardDrive className="w-4.5 h-4.5 stroke-[1.5]" />
        </div>
      ),
    },
    error: {
      color: 'text-red-500 dark:text-red-400',
      dotColor: 'bg-red-500',
      label: 'Erro',
      icon: (
        <div className="relative inline-flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4.5 h-4.5 stroke-[1.5]" />
        </div>
      ),
    },
  };

  const current = statusConfig[status] || statusConfig.online;

  // Tooltip position classes
  const tooltipPositionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  }[tooltipAlign];

  // Tooltip arrow position classes
  const arrowPositionClass = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-zinc-900/90 dark:border-t-zinc-950/90 border-x-transparent border-b-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-zinc-900/90 dark:border-r-zinc-950/90 border-y-transparent border-l-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-zinc-900/90 dark:border-b-zinc-950/90 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-zinc-900/90 dark:border-l-zinc-950/90 border-y-transparent border-r-transparent',
  }[tooltipAlign];

  if (showText) {
    return (
      <div className={`flex items-center gap-2 select-none ${className}`}>
        <span className={`${current.color} flex items-center justify-center`}>
          {current.icon}
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-xs tracking-wider uppercase font-semibold transition-colors duration-200">
          <span className={`w-1.5 h-1.5 rounded-full ${current.dotColor} ${status === 'syncing' ? 'animate-pulse' : ''} shrink-0`} />
          Aura Cloud: {current.label}
        </span>
      </div>
    );
  }

  return (
    <div 
      onClick={handleToggle}
      className={`group relative inline-flex items-center justify-center cursor-pointer transition-all duration-200 ${current.color} ${className}`}
    >
      {current.icon}

      {/* Glassmorphic Premium Tooltip */}
      <div className={`absolute ${tooltipPositionClass} px-2.5 py-1.5 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-xs text-white dark:text-zinc-150 text-[10px] font-semibold tracking-wider uppercase rounded-lg transition-all duration-200 shadow-lg border border-white/10 dark:border-zinc-800/40 whitespace-nowrap z-50 ${
        isClicked
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
      }`}>
        Aura Cloud: {current.label}
        <div className={`absolute border-[4px] border-solid border-transparent ${arrowPositionClass}`} />
      </div>
    </div>
  );
};

export default CloudStatus;
