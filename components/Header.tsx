
import React from 'react';
import * as LucideIcons from 'lucide-react';
import { UserSession } from '../types';

interface HeaderProps {
  session: UserSession;
}

const Header: React.FC<HeaderProps> = ({ session }) => {
  return (
    <header className="h-24 px-10 flex items-center justify-between z-40 bg-transparent">
      <div className="flex items-center gap-6">
        <div className="p-3 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-white">
          <LucideIcons.LayoutGrid size={20} className="text-[#714B67]" />
        </div>
        <div>
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-0.5">San José Portal</h2>
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-slate-900 uppercase">Operaciones en Vivo</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 px-6 py-3 bg-white/60 backdrop-blur-md border border-white rounded-2xl shadow-sm">
          <LucideIcons.ShieldCheck className="text-emerald-500" size={18} />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizado Odoo 14</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight">{session.name}</p>
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Online</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#714B67] text-white flex items-center justify-center font-black shadow-lg shadow-purple-100 border-2 border-white">
            {session.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
