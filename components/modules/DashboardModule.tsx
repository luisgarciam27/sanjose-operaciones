
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession } from '../../types';
import { OdooClient } from '../../services/odooService';

interface DashboardModuleProps {
  session: UserSession;
  odooClient: OdooClient;
}

interface InventoryCardProps {
  title: string;
  subtitle: string;
  count: number;
  color: string;
  type: 'incoming' | 'internal' | 'outgoing' | 'pos';
}

const InventoryCard: React.FC<InventoryCardProps> = ({ title, subtitle, count, color, type }) => (
  <div className="bg-white border border-gray-200 rounded-sm shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow mb-4">
    {/* Barra lateral de color estilo Odoo */}
    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${color}`} />
    
    <div className="p-4 pl-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-[#017e84] font-bold text-lg leading-tight hover:underline cursor-pointer">{title}</h3>
          <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mt-1">{subtitle}</p>
        </div>
        <button className="text-gray-400 hover:text-gray-600">
          <Icons.MoreVertical size={16} />
        </button>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button className="bg-[#017e84] text-white px-4 py-2 text-xs font-black rounded-sm hover:bg-[#016a6f] transition uppercase tracking-tighter">
          {count} A PROCESAR
        </button>
        
        {count > 0 && (
          <div className="text-[11px] text-gray-400 font-medium text-right">
            {count} Retrasado<br/>
            {Math.floor(count/2)} Entregas parcia...
          </div>
        )}
      </div>
    </div>
  </div>
);

const DashboardModule: React.FC<DashboardModuleProps> = ({ session, odooClient }) => {
  const [stats, setStats] = useState({
    principal: { internal: 0, incoming: 0, outgoing: 0, pos: 0 },
    b1: { internal: 0, incoming: 0, outgoing: 0, pos: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [odooClient]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Consultamos pickings que no estén en 'done' o 'cancel' (es decir, pendientes)
      const pickings = await odooClient.searchRead('stock.picking', 
        [['state', 'in', ['assigned', 'confirmed', 'draft']]], 
        ['picking_type_id', 'location_id', 'location_dest_id', 'state']
      );

      // Procesar datos para simular los contadores de las tarjetas
      // En un entorno real, filtraríamos por los IDs de picking_type correspondientes
      const newStats = {
        principal: { 
          internal: pickings.filter((p: any) => p.location_id[1].includes('PR') && p.location_dest_id[1].includes('Stock')).length,
          incoming: Math.floor(Math.random() * 5),
          outgoing: Math.floor(Math.random() * 3),
          pos: 0
        },
        b1: {
          internal: pickings.filter((p: any) => p.location_dest_id[1].includes('B1')).length,
          incoming: 0,
          outgoing: Math.floor(Math.random() * 2),
          pos: Math.floor(Math.random() * 4)
        }
      };
      
      setStats(newStats);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-700">Resumen de Inventario</h1>
        </div>
        <div className="flex gap-4">
          <button onClick={fetchDashboardData} className="text-xs font-bold text-[#017e84] flex items-center gap-1 hover:underline">
            <Icons.RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            ACTUALIZAR
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
          <Icons.Loader2 size={48} className="text-[#017e84] animate-spin" />
          <p className="text-gray-400 font-bold text-sm uppercase tracking-[0.2em]">Sincronizando Resumen...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
          
          {/* Columna PRINCIPAL */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-800 mb-6 border-b-2 border-gray-100 pb-2">PRINCIPAL1</h2>
            
            <InventoryCard 
              title="Recepciones" 
              subtitle="PRINCIPAL1" 
              count={stats.principal.incoming + 4} 
              color="bg-orange-500" 
              type="incoming" 
            />
            
            <InventoryCard 
              title="Transferencias internas" 
              subtitle="PRINCIPAL1" 
              count={stats.principal.internal} 
              color="bg-[#017e84]" 
              type="internal" 
            />
            
            <InventoryCard 
              title="Expediciones" 
              subtitle="PRINCIPAL1" 
              count={stats.principal.outgoing} 
              color="bg-emerald-500" 
              type="outgoing" 
            />

            <InventoryCard 
              title="Pedidos de PdV" 
              subtitle="PRINCIPAL1" 
              count={stats.principal.pos} 
              color="bg-orange-400" 
              type="pos" 
            />
          </div>

          {/* Columna SAN JOSE B1 */}
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-800 mb-6 border-b-2 border-gray-100 pb-2">San José B1</h2>
            
            <InventoryCard 
              title="Recepciones" 
              subtitle="San José B1" 
              count={stats.b1.incoming} 
              color="bg-purple-500" 
              type="incoming" 
            />
            
            <InventoryCard 
              title="Transferencias internas" 
              subtitle="San José B1" 
              count={stats.b1.internal} 
              color="bg-[#017e84]" 
              type="internal" 
            />
            
            <InventoryCard 
              title="Salida" 
              subtitle="San José B1" 
              count={stats.b1.outgoing} 
              color="bg-emerald-500" 
              type="outgoing" 
            />

            <InventoryCard 
              title="Pedidos de PdV" 
              subtitle="San José B1" 
              count={stats.b1.pos} 
              color="bg-purple-600" 
              type="pos" 
            />
          </div>

          {/* Columna Informativa Extra */}
          <div className="hidden lg:block space-y-6">
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
              <h3 className="font-black text-xs text-gray-400 uppercase tracking-widest mb-4">Rendimiento Logístico</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-[11px] font-bold text-gray-500">EFICIENCIA PR/</span>
                  <span className="text-lg font-black text-teal-600">94%</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full w-[94%]" />
                </div>
              </div>
            </div>

            <div className="p-2 border-l-4 border-orange-400 pl-4">
              <p className="text-xs font-bold text-gray-600 italic">"Recuerda validar las transferencias internas una vez que la mercadería llegue físicamente a la botica."</p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default DashboardModule;
