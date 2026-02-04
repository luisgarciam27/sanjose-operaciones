
import React from 'react';
import * as Icons from 'lucide-react';
import { UserSession } from '../types';
import { MODULES, ODOO_COLORS } from '../constants';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  session: UserSession;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, session, onLogout }) => {
  return (
    <aside className="w-80 h-full flex flex-col z-50 transition-all duration-500" style={{ backgroundColor: ODOO_COLORS.purple }}>
      {/* Branding Section */}
      <div className="p-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-white flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-transform">
            <Icons.Infinity size={32} style={{ color: ODOO_COLORS.purple }} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tighter leading-none">SAN JOSÉ</h1>
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-1.5">Enterprise Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation - Solo muestra lo que el usuario tiene permitido */}
      <nav className="flex-1 px-4 mt-8 space-y-2">
        {MODULES.filter(m => (m.roles as readonly string[]).includes(session.role)).map((item) => {
          const Icon = (Icons as any)[item.icon];
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${
                isActive 
                  ? 'bg-white text-slate-900 shadow-xl shadow-black/20 translate-x-2' 
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon 
                size={22} 
                className={isActive ? '' : 'opacity-40 group-hover:opacity-100'} 
                style={isActive ? { color: ODOO_COLORS.purple } : {}}
              />
              <span className={`text-sm font-bold tracking-tight ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ODOO_COLORS.teal }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Info Card */}
      <div className="p-6">
        <div className="bg-black/10 rounded-[2rem] p-6 border border-white/5 backdrop-blur-md">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg border-2 border-white/10 shadow-inner" style={{ backgroundColor: ODOO_COLORS.teal }}>
              {session.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-black text-white truncate leading-tight">{session.name}</p>
              <p className="text-[10px] uppercase font-black text-white/30 tracking-widest mt-1">{session.role}</p>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-3 py-3.5 bg-white/5 hover:bg-red-500/20 hover:text-red-100 text-white/50 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest border border-white/5"
          >
            <Icons.LogOut size={14} strokeWidth={3} />
            Salir del Sistema
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
