
import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  noHover?: boolean;
}

export const GlassCard: React.FC<Props> = ({ children, className = '', onClick, noHover = false, ...props }) => {
  const { user } = useAuth();
  const isOled = user?.preferences.oledMode;

  const baseStyle = isOled
    ? 'bg-black border border-white/30 shadow-none' // OLED: Pure black, high contrast border
    : 'bg-white/40 dark:bg-slate-900/60 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-lg'; // Normal: Glassy

  const hoverStyle = (onClick && !noHover)
    ? (isOled ? 'hover:border-cyan-500 hover:bg-white/5' : 'hover:bg-white/50 dark:hover:bg-slate-900/70 hover:scale-[1.02]')
    : '';

  return (
    <div 
      onClick={onClick}
      className={`
        rounded-2xl 
        transition-all duration-300
        ${onClick ? 'cursor-pointer' : ''}
        ${baseStyle}
        ${hoverStyle}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
