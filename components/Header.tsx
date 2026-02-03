
import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  session: UserSession;
}

const Header: React.FC<HeaderProps> = ({ session }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-gray-400">
          <LucideIcons.Calendar size={18} />
          <span className="text-xs font-bold uppercase tracking-wider">
            {currentTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="h-4 w-px bg-gray-200 hidden md:block" />
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
             <LucideIcons.Building size={18} className="text-purple-600" />
          </div>
          <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
            CADENA DE BOTICAS SAN JOSE S.A.C.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100 text-[10px] font-black">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          SISTEMA EN LÍNEA
        </div>
        
        <div className="flex items-center gap-4 border-l border-gray-100 pl-6">
          <button className="relative p-2 text-gray-400 hover:bg-gray-50 rounded-full transition">
            <LucideIcons.Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
          </button>
          
          <button className="flex items-center gap-3 p-1 pr-4 hover:bg-gray-50 rounded-full transition border border-transparent hover:border-gray-100">
            <div className="w-8 h-8 rounded-full bg-[#714B67] flex items-center justify-center text-white text-[10px] font-black shadow-lg">
              {session.name.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-xs font-black text-gray-700 hidden sm:block uppercase tracking-wider">Mi Perfil</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
