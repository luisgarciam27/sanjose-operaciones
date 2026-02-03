
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
    <aside className="w-64 bg-[#2c2e3e] text-gray-300 flex flex-col h-full shadow-2xl z-50">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-gray-700">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold italic text-lg flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${ODOO_COLORS.purple} 0%, #4a3144 100%)` }}
        >
          SJS
        </div>
        <div className="overflow-hidden">
          <h1 className="text-white font-bold text-sm leading-none truncate">SJS Operaciones</h1>
          <p className="text-[9px] text-gray-500 mt-1 truncate">CADENA DE BOTICAS SAN JOSE</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto scrollbar-hide">
        {MODULES.filter(m => (m.roles as readonly string[]).includes(session.role)).map((item) => {
          const Icon = (Icons as any)[item.icon];
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-purple-600/10 text-white' 
                  : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon 
                size={20} 
                className={`${isActive ? 'text-purple-500' : 'text-gray-500 group-hover:text-gray-300'}`} 
              />
              <span className={`font-medium text-sm ${isActive ? 'text-white' : ''}`}>{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Session Profile Mini */}
      <div className="p-4 bg-gray-900/50 mt-auto border-t border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {session.name.charAt(0)}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{session.name}</p>
            <p className="text-[9px] uppercase tracking-wider text-gray-500 truncate">{session.role}</p>
          </div>
        </div>
        
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gray-800 hover:bg-red-900/20 hover:text-red-400 transition-colors text-[10px] font-black uppercase tracking-widest"
        >
          <Icons.LogOut size={14} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
