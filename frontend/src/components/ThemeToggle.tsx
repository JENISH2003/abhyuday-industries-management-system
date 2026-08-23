import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export interface ThemeToggleProps {
  /**
   * Style variant for the theme toggle.
   * - 'pill': Medium sliding track toggle with Sun and Moon icons (no text).
   * - 'icon': Medium square/rounded icon button with hover animations and glow (no text).
   * - 'segmented': Medium dual icon segmented tab control (no text).
   * Defaults to 'pill'.
   */
  variant?: 'pill' | 'icon' | 'segmented';
  /**
   * Additional custom CSS classes.
   */
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        className={`
          relative inline-flex items-center justify-center w-10 h-10 rounded-xl
          border transition-all duration-300 cursor-pointer select-none outline-none
          active:scale-95 focus-visible:ring-2 focus-visible:ring-brand/50
          ${
            isDark
              ? 'bg-slate-800/90 hover:bg-slate-750 border-slate-700/80 text-amber-400 hover:text-amber-300 shadow-lg shadow-amber-500/10 hover:border-amber-400/40'
              : 'bg-white hover:bg-slate-50 border-slate-200/90 text-brand hover:text-brand-dark shadow-md shadow-brand/10 hover:border-brand/40'
          }
          ${className}
        `}
      >
        <span className="relative flex items-center justify-center">
          {isDark ? (
            <Sun
              size={18}
              className="transform transition-transform duration-500 ease-out rotate-0 hover:rotate-90 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
            />
          ) : (
            <Moon
              size={18}
              className="transform transition-transform duration-500 ease-out -rotate-12 hover:rotate-0 text-brand filter drop-shadow-[0_0_8px_rgba(0,200,83,0.35)]"
            />
          )}
        </span>
      </button>
    );
  }

  if (variant === 'segmented') {
    return (
      <div
        className={`
          inline-flex items-center p-1 rounded-xl border transition-all duration-300
          ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 text-slate-400'
              : 'bg-slate-100 border-slate-200 text-slate-500'
          }
          ${className}
        `}
        aria-label="Theme switcher"
      >
        <button
          type="button"
          onClick={() => isDark && toggleTheme()}
          aria-label="Switch to light theme"
          title="Light Mode"
          className={`
            relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer
            ${
              !isDark
                ? 'bg-white text-amber-500 shadow-sm font-bold border border-slate-200/80 scale-100'
                : 'hover:text-slate-200 hover:bg-slate-800/50 scale-95 opacity-70 hover:opacity-100'
            }
          `}
        >
          <Sun size={16} />
        </button>

        <button
          type="button"
          onClick={() => !isDark && toggleTheme()}
          aria-label="Switch to dark theme"
          title="Dark Mode"
          className={`
            relative flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200 cursor-pointer
            ${
              isDark
                ? 'bg-slate-800 text-brand-light shadow-sm font-bold border border-slate-700/80 scale-100'
                : 'hover:text-slate-700 hover:bg-slate-200/60 scale-95 opacity-70 hover:opacity-100'
            }
          `}
        >
          <Moon size={16} />
        </button>
      </div>
    );
  }

  // Default 'pill' variant: medium sliding track with dual icons (no text)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`
        group relative inline-flex items-center h-9 w-16 px-1 rounded-full border
        transition-colors duration-300 ease-in-out cursor-pointer select-none outline-none
        active:scale-95 focus-visible:ring-2 focus-visible:ring-brand/50
        ${
          isDark
            ? 'bg-slate-900 border-slate-700/80 hover:border-slate-600 shadow-inner'
            : 'bg-slate-200/90 border-slate-300 hover:border-slate-400 shadow-inner'
        }
        ${className}
      `}
    >
      {/* Background Icons on track */}
      <span className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <Sun
          size={14}
          className={`transition-all duration-300 ${
            isDark ? 'text-slate-600 opacity-60 scale-90' : 'text-amber-500 opacity-100 scale-100'
          }`}
        />
        <Moon
          size={14}
          className={`transition-all duration-300 ${
            isDark ? 'text-brand-light opacity-100 scale-100' : 'text-slate-400 opacity-60 scale-90'
          }`}
        />
      </span>

      {/* Animated Sliding Thumb Knob */}
      <span
        className={`
          relative z-10 flex items-center justify-center w-7 h-7 rounded-full shadow-md
          transform transition-all duration-300 ease-spring
          ${
            isDark
              ? 'translate-x-7 bg-slate-800 text-brand-light border border-slate-700 shadow-brand/20'
              : 'translate-x-0 bg-white text-amber-500 border border-slate-200 shadow-amber-500/20'
          }
        `}
      >
        {isDark ? (
          <Moon size={14} className="transform -rotate-12 transition-transform group-hover:rotate-0" />
        ) : (
          <Sun size={14} className="transform transition-transform group-hover:rotate-45" />
        )}
      </span>
    </button>
  );
};

export default ThemeToggle;
