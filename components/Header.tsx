
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  session: UserSession;
}

const Header: React.FC<HeaderProps> = ({ session }) => {
  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex items-center gap-4">
        <div className="text-slate-300">
          <LucideIcons.LayoutGrid size={20} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Portal</span>
          <LucideIcons.ChevronRight size={14} className="text-slate-300" />
          <span className="text-slate-900 text-xs font-black uppercase tracking-widest">Abastecimiento</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 text-[10px] font-bold">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Cloud Connected
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
            <LucideIcons.Search size={20} />
          </button>
          <button className="relative p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition">
            <LucideIcons.Bell size={20} />
            <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 bg-indigo-500 rounded-full ring-2 ring-white" />
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold border border-slate-200">
              {session.name.substring(0, 1).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
