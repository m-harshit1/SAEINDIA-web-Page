'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Bell } from 'lucide-react';

export default function GlobalUX({ hide = false }: { hide?: boolean }) {
  const [toasts, setToasts] = useState<{ id: number, message: string }[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const addToast = (message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const applyTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    localStorage.setItem('theme_preference', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-theme');
    } else {
      document.documentElement.classList.remove('light-theme');
    }
  };

  // Restore the saved theme once, after mount.
  useEffect(() => {
    // Theme check
    const savedTheme = localStorage.getItem('theme_preference') as 'dark' | 'light';
    if (savedTheme) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
      applyTheme(savedTheme);
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    addToast(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} Mode activated`);
  };

  return (
    <>
      {/* Theme Toggle Button (Fixed bottom-left) */}
      <button 
        onClick={toggleTheme}
        data-theme-toggle
        className={`fixed bottom-6 left-6 z-50 w-10 h-10 bg-titanium-700/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:border-white/30 transition-all duration-500 cursor-pointer shadow-lg hidden md:flex ${
          hide ? "opacity-0 pointer-events-none translate-y-8" : "opacity-100 translate-y-0"
        }`}
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Toast Container */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="bg-carbon-900/90 backdrop-blur-md border-l-2 border-apex-red shadow-xl px-4 py-3 rounded-r flex items-center gap-3 w-72 pointer-events-auto"
            >
              <Bell size={14} className="text-apex-red shrink-0" />
              <span className="font-mono text-[10px] text-slate-200">{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
