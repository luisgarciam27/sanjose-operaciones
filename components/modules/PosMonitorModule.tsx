
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, PosSession } from '../../types';
import { OdooClient } from '../../services/odooService';
import { ODOO_COLORS } from '../../constants';

interface PosMonitorModuleProps {
  session: UserSession;
  odooClient: OdooClient;
}

const PosMonitorModule: React.FC<PosMonitorModuleProps> = ({ session, odooClient }) => {
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, [odooClient, session]);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      // Filtrado estricto: Solo la caja del usuario actual si es empleado
      const domain: any[] = [['state', '=', 'opened']];
      if (session.role === 'employee') {
        domain.push(['user_id', '=', session.odoo_user_id]);
      }

      const data = await odooClient.searchRead('pos.session', domain, ['name', 'user_id', 'start_at', 'state']);
      setSessions(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Panel de Caja</h1>
          <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest">
            {session.role === 'employee' ? 'Control de sesión personal' : 'Supervisión global de boticas'}
          </p>
        </div>
        <button 
          onClick={fetchSessions}
          className="bg-slate-50 border border-slate-200 text-slate-900 px-6 py-4 rounded-2xl flex items-center gap-3 hover:bg-slate-100 transition-all font-black text-xs uppercase tracking-widest"
        >
          <Icons.RotateCcw size={16} className={isLoading ? 'animate-spin' : ''} />
          Refrescar Conexión
        </button>
      </div>

      {isLoading ? (
        <div className="py-40 flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-slate-100 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-300 font-black text-[10px] uppercase tracking-[0.3em]">Sincronizando con Odoo POS...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem] p-24 text-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <Icons.MonitorOff size={48} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">No tienes una caja abierta</h3>
          <p className="text-slate-400 font-bold text-sm max-w-sm mx-auto mb-8">
            Debes iniciar una sesión en el terminal físico de la botica para visualizarla aquí.
          </p>
          <button 
             style={{ backgroundColor: ODOO_COLORS.teal }}
             className="text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:opacity-90 transition-all"
          >
            Abrir Punto de Venta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {sessions.map(s => (
            <div key={s.id} className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100 hover:shadow-2xl transition-all relative group overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 -mr-16 -mt-16 rounded-full group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-10">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: ODOO_COLORS.purple }}>
                    <Icons.Monitor size={32} />
                  </div>
                  <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-emerald-100">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    En línea
                  </div>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{s.name}</h3>
                <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">{s.user_id[1]}</p>

                <div className="grid grid-cols-2 gap-4 pt-8 border-t border-slate-50">
                   <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Apertura</p>
                      <p className="text-sm font-bold text-slate-800">{new Date(s.start_at).toLocaleTimeString('es-PE', {hour:'2-digit', minute:'2-digit'})}</p>
                   </div>
                   <div>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Fecha</p>
                      <p className="text-sm font-bold text-slate-800">{new Date(s.start_at).toLocaleDateString('es-PE', {day:'2-digit', month:'short'})}</p>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PosMonitorModule;
