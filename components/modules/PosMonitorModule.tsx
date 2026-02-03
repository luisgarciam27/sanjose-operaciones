
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, PosSession } from '../../types';
import { OdooClient } from '../../services/odooService';

interface PosMonitorModuleProps {
  session: UserSession;
  odooClient: OdooClient;
}

const PosMonitorModule: React.FC<PosMonitorModuleProps> = ({ session, odooClient }) => {
  const [sessions, setSessions] = useState<PosSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await odooClient.searchRead('pos.session', [], ['name', 'user_id', 'start_at', 'state']);
        setSessions(data as any[]);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSessions();
  }, [odooClient]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Monitor de Cajas (POS)</h1>
        <p className="text-gray-500">Supervisión en tiempo real de sesiones activas y cierres de caja.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-20">
            <Icons.Loader2 className="animate-spin text-purple-600" size={40} />
          </div>
        ) : sessions.map(s => (
          <div key={s.id} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group overflow-hidden relative">
            {s.state === 'opened' && (
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 -mr-16 -mt-16 rounded-full blur-2xl group-hover:bg-green-500/10 transition" />
            )}
            
            <div className="flex items-center justify-between mb-6">
              <div className={`p-3 rounded-2xl ${s.state === 'opened' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                <Icons.Monitor size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.state === 'opened' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                {s.state === 'opened' ? 'ABIERTA' : 'CERRADA'}
              </span>
            </div>

            <h3 className="text-lg font-bold text-gray-900 mb-1">{s.name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-2 mb-4">
              <Icons.User size={14} /> {s.user_id[1]}
            </p>

            <div className="space-y-3 pt-4 border-t border-gray-50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Inicio:</span>
                <span className="text-gray-900 font-semibold">{new Date(s.start_at).toLocaleString('es-PE')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Ventas Hoy:</span>
                <span className="text-green-600 font-bold">S/ 1,240.50</span>
              </div>
            </div>

            <button className="w-full mt-6 py-3 bg-purple-50 text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-600 hover:text-white transition-all shadow-sm">
              Ver Transacciones
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PosMonitorModule;
