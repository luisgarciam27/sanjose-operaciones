
import React from 'react';
import * as Icons from 'lucide-react';
import { UserSession } from '../types';
import { MODULES } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: UserSession;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, session, onLogout }) => {
  return (
    <aside className="w-72 bg-[#0f172a] text-slate-400 flex flex-col h-full z-50">
      <div className="p-8 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
          <Icons.Zap size={20} fill="currentColor" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base tracking-tight leading-none">SJS Portal</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Enterprise</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {MODULES.filter(m => (m.roles as readonly string[]).includes(session.role)).map((item) => {
          const Icon = (Icons as any)[item.icon];
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20' 
                  : 'hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Icon 
                size={18} 
                className={isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} 
              />
              <span className="text-sm font-semibold tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 m-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-white font-bold text-sm">
            {session.name.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-white truncate">{session.name}</p>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{session.role}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 rounded-xl transition-all text-xs font-bold"
        >
          <Icons.LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
