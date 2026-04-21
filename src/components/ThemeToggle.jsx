import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      title={`Beralih ke Mode ${theme === 'dark' ? 'Terang' : 'Gelap'}`}
      className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all duration-300 group"
      style={{ marginLeft: '8px' }} // Menggunakan inline style untuk margin agar stabil
    >
      {theme === 'dark' ? (
        <Moon 
          size={22} 
          strokeWidth={2} 
          className="text-[#aebac1] group-hover:text-[#e9edef] transition-all duration-300 rotate-0" 
        />
      ) : (
        <Sun 
          size={22} 
          strokeWidth={2} // Dipertebal dari 1.5 ke 2 agar lebih tegas
          className="text-amber-500 group-hover:text-amber-600 transition-all duration-300 rotate-0 scale-110 drop-shadow-[0_0_5px_rgba(245,158,11,0.5)]" 
        />
      )}
    </button>
  );
};