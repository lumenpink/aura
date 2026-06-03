import React from 'react';
import logoUrl from '../../assets/logo.svg';
import logoBlackUrl from '../../assets/logo-black.svg';
import logoWhiteUrl from '../../assets/logo-white.svg';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
  variant?: 'original' | 'flat-black' | 'flat-white';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

const SIZE_MAP = {
  small: 32,
  medium: 48,
  large: 96,
};

export const Logo: React.FC<LogoProps> = ({
  size = 'medium',
  showText = true,
  variant = 'original',
  orientation = 'horizontal',
  className = '',
}) => {
  const pixelSize = SIZE_MAP[size];

  // Select the correct SVG asset based on the variant
  const logoSrc = {
    original: logoUrl,
    'flat-black': logoBlackUrl,
    'flat-white': logoWhiteUrl,
  }[variant];

  // Choose default text color based on the variant
  const defaultTextColor = {
    original: 'text-aura-violet',
    'flat-black': 'text-zinc-850 dark:text-zinc-100',
    'flat-white': 'text-white',
  }[variant];

  // Avoid overriding text color if it's explicitly passed in className
  const hasTextColor = /\btext-/.test(className);

  return (
    <div className={`inline-flex ${orientation === 'vertical' ? 'flex-col items-center text-center gap-3' : 'items-center gap-3.5'} ${hasTextColor ? '' : defaultTextColor} ${className}`}>
      <img
        src={logoSrc}
        width={pixelSize}
        height={pixelSize}
        className="shrink-0 drop-shadow-[0_0_8px_rgba(139,92,246,0.15)]"
        alt={`Aura ${variant} Logo`}
      />

      {showText && (
        <span className="font-light tracking-[0.3em] uppercase select-none font-sans text-[1.15rem]">
          AURA
        </span>
      )}
    </div>
  );
};

export default Logo;
