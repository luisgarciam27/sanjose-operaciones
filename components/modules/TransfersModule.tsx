
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, Product, SupplyRequestLine, Location } from '../../types';
import { OdooClient } from '../../services/odooService';

interface ExtendedSupplyLine extends SupplyRequestLine {
  uom_id: number;
}

interface LocationWithPos extends Location {
  pos_names: string[];
}

interface TransfersModuleProps {
  session: any;
  odooClient: OdooClient;
}

const TransfersModule: React.FC<TransfersModuleProps> = ({ session, odooClient }) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<LocationWithPos[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [sourceLoc, setSourceLoc] = useState<number>(0);
  const [destLoc, setDestLoc] = useState<number>(0);
  const [cart, setCart] = useState<ExtendedSupplyLine[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Patrones actualizados incluyendo PRINCIPAL1
  const allowedPatterns = ['B1', 'B2', 'B3', 'B4', 'B5', 'PRINCIPAL1', 'PRINCIPAL', 'PR/'];

  useEffect(() => {
    fetchInitialData();
  }, [odooClient, session]);

  useEffect(() => {
    if (showModal && sourceLoc > 0) {
      const delayDebounceFn = setTimeout(() => {
        fetchProductsWithStock();
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [sourceLoc, search, showModal]);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      const domain: any[] = [
        ['picking_type_id.name', 'ilike', 'Transferencias internas'],
        ['origin', 'ilike', 'Solicitud App:']
      ];
      
      if (session.role === 'employee') {
        domain.push('|', ['partner_id', '=', session.partner_id], ['create_uid', '=', session.odoo_user_id]);
      }

      const [transfersData, locationsData, posData] = await Promise.all([
        odooClient.searchRead('stock.picking', 
          domain, 
          ['name', 'origin', 'state', 'scheduled_date', 'location_id', 'location_dest_id', 'company_id', 'partner_id'], 
          { limit: 80, order: 'id desc' }
        ),
        odooClient.searchRead('stock.location', [['usage', '=', 'internal']], ['name', 'complete_name']),
        odooClient.searchRead('pos.config', [], ['name'])
      ]);
      
      setTransfers(transfersData);
      
      const rawLocs = locationsData as Location[];
      const posConfigs = posData as any[];

      // Enriquecer ubicaciones con el mapeo específico proporcionado por el usuario
      const enrichedLocs: LocationWithPos[] = rawLocs
        .filter(loc => {
          const fullName = (loc.complete_name || loc.name || '').toUpperCase();
          return allowedPatterns.some(pattern => fullName.includes(pattern.toUpperCase()));
        })
        .map(loc => {
          const locName = (loc.complete_name || loc.name || '').toUpperCase();
          
          // Mapeo manual según la distribución real del cliente
          let matchedPosNames: string[] = [];
          
          if (locName.includes('B1')) {
            matchedPosNames = ['Botica 1 CASA MIRIAM', 'BOTICA 1 - CAJA B'];
          } else if (locName.includes('B2')) {
            matchedPosNames = ['Botica 2'];
          } else if (locName.includes('B3')) {
            matchedPosNames = ['Botica 3'];
          } else if (locName.includes('B4')) {
            matchedPosNames = ['Botica 4'];
          } else if (locName.includes('B5')) {
            matchedPosNames = ['Botica 0'];
          } else if (locName.includes('PRINCIPAL') || locName.includes('PR/')) {
            matchedPosNames = ['ALMACÉN CENTRAL'];
          }

          // Si no hubo match manual, intentamos buscar en los configs de Odoo por si acaso
          if (matchedPosNames.length === 0) {
            matchedPosNames = posConfigs
              .filter(pos => {
                const pn = pos.name.toUpperCase();
                return pn.includes(locName.split('/').pop() || '!!!');
              })
              .map(pos => pos.name);
          }

          return {
            ...loc,
            pos_names: matchedPosNames
          };
        });

      setLocations(enrichedLocs);

      // Lógica de selección por defecto corregida
      if (enrichedLocs.length > 0) {
        // Buscar PRINCIPAL1 o similar para el ORIGEN
        const mainWarehouse = enrichedLocs.find(l => {
          const n = (l.complete_name || l.name || '').toUpperCase();
          return n.includes('PRINCIPAL1') || n.includes('PRINCIPAL') || n.includes('PR/');
        });
        setSourceLoc(mainWarehouse ? mainWarehouse.id : enrichedLocs[0].id);
        
        // Destino por defecto para el empleado
        const b1 = enrichedLocs.find(l => (l.complete_name || l.name || '').includes('B1'));
        setDestLoc(b1 ? b1.id : enrichedLocs[0].id);
      }
    } catch (err) {
      console.error("Error cargando datos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProductsWithStock = async () => {
    if (sourceLoc === 0) return;
    setIsSearching(true);
    try {
      const data = await odooClient.getProductsWithStock(sourceLoc, search);
      setProducts(data as any[]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatOdooDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      return <span className="text-[#e63946] font-bold">hace {diffDays} d</span>;
    }
    return <span className="text-gray-500 font-medium">{date.toLocaleDateString('es-PE')}</span>;
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => item.product_id === product.id ? {...item, qty: item.qty + 1} : item);
      }
      return [...prev, { 
        product_id: product.id, 
        product_name: product.name, 
        qty: 1,
        available_at_source: product.qty_available,
        uom_id: product.uom_id ? product.uom_id[0] : 1
      }];
    });
  };

  const getLocationDisplayName = (locId: number) => {
    const loc = locations.find(l => l.id === locId);
    if (!loc) return '---';
    const cleanName = loc.name.split('/').pop() || loc.name;
    const posStr = loc.pos_names.length > 0 ? ` (${loc.pos_names[0]})` : '';
    return cleanName + posStr;
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (sourceLoc === destLoc) {
      alert("Error: El origen y destino no pueden ser el mismo.");
      return;
    }
    setIsSubmitting(true);
    try {
      const pickingTypes = await odooClient.searchRead('stock.picking.type', 
        [['name', 'ilike', 'Transferencias internas']], 
        ['id']
      );
      
      const pickingTypeId = pickingTypes.length > 0 ? pickingTypes[0].id : 5;

      await odooClient.create('stock.picking', {
        picking_type_id: pickingTypeId,
        location_id: sourceLoc,
        location_dest_id: destLoc,
        partner_id: session.partner_id,
        origin: `Solicitud App: ${session.name}`,
        company_id: session.company_id,
        state: 'draft',
        move_lines: cart.map(item => [0, 0, {
          product_id: item.product_id,
          name: item.product_name,
          product_uom_qty: item.qty,
          product_uom: item.uom_id,
          location_id: sourceLoc,
          location_dest_id: destLoc,
          company_id: session.company_id,
        }])
      });

      alert(`✅ Pedido enviado a Odoo.`);
      setShowModal(false);
      setCart([]);
      fetchInitialData();
    } catch (err: any) {
      alert('Error en Odoo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h1 className="text-[22px] font-black text-[#2c2e3e] uppercase tracking-tight">
            Gestión de Abastecimiento
          </h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            Red de Boticas San José - Almacén Central {locations.find(l => (l.complete_name||'').includes('PRINCIPAL1')) ? 'Detectado' : ''}
          </p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#017e84] text-white px-6 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#016a6f] transition font-black text-xs uppercase shadow-lg active:scale-95"
        >
          <Icons.PlusCircle size={18} strokeWidth={3} />
          CREAR NUEVO PEDIDO
        </button>
      </div>

      <div className="bg-white border border-gray-100 shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f8f9fa] border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Referencia</th>
                <th className="px-6 py-4">Desde</th>
                <th className="px-6 py-4">Hacia</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6} className="p-20 text-center"><Icons.Loader2 className="animate-spin mx-auto text-teal-600" /></td></tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-24 text-center">
                    <Icons.PackageOpen size={48} className="text-gray-100 mx-auto mb-4" />
                    <p className="text-gray-300 font-bold uppercase text-[10px] tracking-widest italic">Sin pedidos registrados hoy.</p>
                  </td>
                </tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors text-[13px] group">
                  <td className="px-6 py-4 font-bold text-[#017e84]">{t.name}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{getLocationDisplayName(t.location_id[0])}</td>
                  <td className="px-6 py-4 text-gray-600 font-medium">{getLocationDisplayName(t.location_dest_id[0])}</td>
                  <td className="px-6 py-4 font-bold">{formatOdooDate(t.scheduled_date)}</td>
                  <td className="px-6 py-4 text-gray-400 font-medium truncate max-w-[150px]">{t.origin}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                      t.state === 'done' ? 'bg-[#dcfce7] text-[#15803d]' : 
                      t.state === 'draft' ? 'bg-blue-100 text-blue-800' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {t.state === 'done' ? 'RECIBIDO' : t.state === 'draft' ? 'BORRADOR' : 'EN CAMINO'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[#2c2e3e]/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-[#fcfcfc]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#017e84] text-white rounded-2xl flex items-center justify-center shadow-inner">
                  <Icons.Warehouse size={24} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-[#2c2e3e] uppercase leading-tight">Nueva Orden de Reabastecimiento</h2>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Configura tu transferencia interna</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-300 hover:text-red-500 transition-colors p-3 hover:bg-red-50 rounded-full">
                <Icons.X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-1 p-8 overflow-y-auto border-r border-gray-100 custom-scrollbar">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Icons.LogOut size={12} className="rotate-90" /> ALMACÉN DE SALIDA (ORIGEN)
                    </label>
                    <select 
                      value={sourceLoc} 
                      onChange={(e) => setSourceLoc(Number(e.target.value))}
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl text-[14px] font-black bg-white outline-none focus:border-[#017e84] transition-all cursor-pointer shadow-sm text-gray-700"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name.split('/').pop()} {l.pos_names.length > 0 ? `→ [${l.pos_names.join(', ')}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Icons.LogIn size={12} className="rotate-90" /> ALMACÉN DE LLEGADA (DESTINO)
                    </label>
                    <select 
                      value={destLoc} 
                      onChange={(e) => setDestLoc(Number(e.target.value))}
                      className="w-full p-4 border-2 border-gray-100 rounded-2xl text-[14px] font-black bg-white outline-none focus:border-[#017e84] transition-all cursor-pointer shadow-sm text-gray-700"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name.split('/').pop()} {l.pos_names.length > 0 ? `→ [${l.pos_names.join(', ')}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative mb-8">
                  <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                  <input 
                    type="text" 
                    placeholder="Escriba el nombre del producto o código..." 
                    className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-sm focus:bg-white transition-all outline-none focus:ring-4 focus:ring-[#017e84]/10 font-bold shadow-inner" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isSearching ? (
                    <div className="col-span-full py-16 text-center"><Icons.Loader2 className="animate-spin mx-auto text-[#017e84]" size={32} /></div>
                  ) : products.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-300 text-[10px] font-black uppercase tracking-widest italic flex flex-col items-center gap-4">
                       <Icons.Ghost size={32} />
                       No hay stock disponible en el origen seleccionado.
                    </div>
                  ) : products.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addToCart(p)} 
                      className="p-5 border-2 border-gray-50 rounded-[1.5rem] flex justify-between items-center cursor-pointer hover:border-[#017e84] hover:bg-teal-50/50 transition-all active:scale-95 bg-white shadow-sm group"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-black text-gray-800 uppercase truncate leading-tight mb-1">{p.name}</p>
                        <div className="flex items-center gap-3">
                           <span className={`text-[10px] px-2 py-0.5 rounded font-black ${p.qty_available > 0 ? 'bg-teal-100 text-teal-700' : 'bg-red-100 text-red-700'}`}>
                             {p.qty_available} EN STOCK
                           </span>
                           <span className="text-[9px] text-gray-400 font-bold uppercase">{p.default_code || 'S/C'}</span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-[#017e84] group-hover:bg-[#017e84] group-hover:text-white transition-all shadow-sm">
                        <Icons.Plus size={20} strokeWidth={3} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full lg:w-80 p-8 bg-[#fcfcfc] flex flex-col border-l border-gray-100 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Items Seleccionados</h3>
                   <span className="bg-[#017e84] text-white px-2.5 py-1 rounded-lg text-[10px] font-black">{cart.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="text-center py-20 text-gray-300 text-[10px] font-black uppercase italic flex flex-col items-center gap-4 border-2 border-dashed border-gray-100 rounded-3xl">
                       <Icons.ShoppingBasket size={32} />
                       Cesta Vacía
                    </div>
                  ) : cart.map(item => (
                    <div key={item.product_id} className="bg-white p-4 rounded-2xl border-2 border-gray-50 flex justify-between items-center shadow-sm animate-fade-in hover:border-teal-200 transition-colors">
                      <div className="flex-1 pr-3">
                        <p className="text-[10px] font-black text-gray-800 truncate uppercase leading-tight">{item.product_name}</p>
                        <p className="text-[9px] text-teal-600 font-bold mt-1 uppercase">Max: {item.available_at_source}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="number" 
                          value={item.qty} 
                          onChange={(e) => setCart(prev => prev.map(i => i.product_id === item.product_id ? {...i, qty: Math.max(1, parseInt(e.target.value) || 1)} : i))} 
                          className="w-12 text-center text-[12px] font-black py-2 border-2 border-gray-100 rounded-xl bg-gray-50 outline-none focus:border-[#017e84] focus:bg-white" 
                        />
                        <button onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 space-y-4">
                  <button 
                    disabled={cart.length === 0 || isSubmitting}
                    onClick={handleSubmit}
                    className="w-full py-5 bg-[#2c2e3e] text-white rounded-[1.5rem] font-black text-xs uppercase shadow-2xl disabled:opacity-50 hover:bg-[#017e84] transition-all flex items-center justify-center gap-3 transform active:scale-95"
                  >
                    {isSubmitting ? <Icons.Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <Icons.CheckCircle2 size={18} />
                        CONFIRMAR PEDIDO
                      </>
                    )}
                  </button>
                  <p className="text-[8px] text-gray-400 font-bold uppercase text-center tracking-widest leading-relaxed">
                    Los pedidos generados aparecerán en <br/>Odoo como Transferencia Interna: Borrador
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransfersModule;
