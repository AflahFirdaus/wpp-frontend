import { useState, useEffect } from 'react';

export const useTheme = () => {
  // Ambil state dari localStorage, atau gunakan settingan bawaan sistem OS
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme) {
        return savedTheme;
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default fallback
  });

  // Terapkan class "dark" pada elemen <html> setiap kali state berubah
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Simpan di local storage
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fungsi khusus untuk Switch/Toggle
  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme };
};
