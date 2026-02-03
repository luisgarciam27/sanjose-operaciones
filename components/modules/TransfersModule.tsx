
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

  // Mantenemos la lógica de filtros intacta
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
        odooClient.searchRead('stock.picking', domain, ['name', 'origin', 'state', 'scheduled_date', 'location_id', 'location_dest_id'], { limit: 80, order: 'id desc' }),
        odooClient.searchRead('stock.location', [['usage', '=', 'internal']], ['name', 'complete_name']),
        odooClient.searchRead('pos.config', [], ['name'])
      ]);
      setTransfers(transfersData);
      const rawLocs = locationsData as Location[];
      const enrichedLocs: LocationWithPos[] = rawLocs
        .filter(loc => {
          const fullName = (loc.complete_name || loc.name || '').toUpperCase();
          return allowedPatterns.some(pattern => fullName.includes(pattern.toUpperCase()));
        })
        .map(loc => {
          const locName = (loc.complete_name || loc.name || '').toUpperCase();
          let matchedPosNames: string[] = [];
          if (locName.includes('B1')) matchedPosNames = ['Botica 1 CASA MIRIAM', 'BOTICA 1 - CAJA B'];
          else if (locName.includes('B2')) matchedPosNames = ['Botica 2'];
          else if (locName.includes('B3')) matchedPosNames = ['Botica 3'];
          else if (locName.includes('B4')) matchedPosNames = ['Botica 4'];
          else if (locName.includes('B5')) matchedPosNames = ['Botica 0'];
          else if (locName.includes('PRINCIPAL') || locName.includes('PR/')) matchedPosNames = ['ALMACÉN CENTRAL'];
          return { ...loc, pos_names: matchedPosNames };
        });
      setLocations(enrichedLocs);
      if (enrichedLocs.length > 0) {
        const mainWarehouse = enrichedLocs.find(l => (l.complete_name || l.name || '').toUpperCase().includes('PRINCIPAL1'));
        setSourceLoc(mainWarehouse ? mainWarehouse.id : enrichedLocs[0].id);
        const b1 = enrichedLocs.find(l => (l.complete_name || l.name || '').includes('B1'));
        setDestLoc(b1 ? b1.id : enrichedLocs[0].id);
      }
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  };

  const fetchProductsWithStock = async () => {
    if (sourceLoc === 0) return;
    setIsSearching(true);
    try {
      const data = await odooClient.getProductsWithStock(sourceLoc, search);
      setProducts(data as any[]);
    } finally { setIsSearching(false); }
  };

  const getLocationDisplayName = (locId: number) => {
    const loc = locations.find(l => l.id === locId);
    if (!loc) return '---';
    const cleanName = loc.name.split('/').pop() || loc.name;
    return cleanName + (loc.pos_names.length > 0 ? ` (${loc.pos_names[0]})` : '');
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) return prev.map(item => item.product_id === product.id ? {...item, qty: item.qty + 1} : item);
      return [...prev, { product_id: product.id, product_name: product.name, qty: 1, available_at_source: product.qty_available, uom_id: product.uom_id ? product.uom_id[0] : 1 }];
    });
  };

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (sourceLoc === destLoc) { alert("Error: Origen y Destino idénticos"); return; }
    setIsSubmitting(true);
    try {
      const pickingTypes = await odooClient.searchRead('stock.picking.type', [['name', 'ilike', 'Transferencias internas']], ['id']);
      const pickingTypeId = pickingTypes.length > 0 ? pickingTypes[0].id : 5;
      await odooClient.create('stock.picking', {
        picking_type_id: pickingTypeId, location_id: sourceLoc, location_dest_id: destLoc, partner_id: session.partner_id,
        origin: `Solicitud App: ${session.name}`, company_id: session.company_id, state: 'draft',
        move_lines: cart.map(item => [0, 0, { product_id: item.product_id, name: item.product_name, product_uom_qty: item.qty, product_uom: item.uom_id, location_id: sourceLoc, location_dest_id: destLoc, company_id: session.company_id }])
      });
      alert(`✅ Orden generada con éxito.`); setShowModal(false); setCart([]); fetchInitialData();
    } catch (err: any) { alert('Odoo: ' + err.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SaaS Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Abastecimiento Interno</h1>
          <p className="text-slate-500 font-semibold text-sm mt-1">Gestión de stock entre almacenes y boticas.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl flex items-center gap-3 transition-all font-bold text-sm shadow-xl shadow-indigo-100 active:scale-95"
        >
          <Icons.Plus size={18} strokeWidth={3} />
          Nueva Solicitud
        </button>
      </div>

      {/* Main Table SaaS Style */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Documento</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Ruta</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Programado</th>
                <th className="px-8 py-5 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={4} className="p-20 text-center"><Icons.Loader2 className="animate-spin mx-auto text-indigo-500" size={32} /></td></tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                      <Icons.FileSearch size={64} strokeWidth={1} />
                      <p className="font-bold text-sm uppercase tracking-widest">No hay registros hoy</p>
                    </div>
                  </td>
                </tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{t.name}</span>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{t.origin}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-600">{getLocationDisplayName(t.location_id[0])}</span>
                      <Icons.ArrowRight size={14} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-900">{getLocationDisplayName(t.location_dest_id[0])}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(t.scheduled_date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      t.state === 'done' ? 'bg-emerald-50 text-emerald-600' : 
                      t.state === 'draft' ? 'bg-indigo-50 text-indigo-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      {t.state === 'done' ? 'Completado' : t.state === 'draft' ? 'Borrador' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modern Workspace Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 md:p-12 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-full">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Configurar Solicitud</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Llenado de stock inteligente</p>
              </div>
              <button onClick={() => setShowModal(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Icons.X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              {/* Warehouse & Search Selection */}
              <div className="flex-1 p-10 overflow-y-auto custom-scrollbar space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Icons.LogOut size={12} className="rotate-90 text-indigo-500" /> Almacén Origen
                    </label>
                    <select 
                      value={sourceLoc} 
                      onChange={(e) => setSourceLoc(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name.split('/').pop()} {l.pos_names.length > 0 ? `[${l.pos_names.join(', ')}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <Icons.LogIn size={12} className="rotate-90 text-emerald-500" /> Almacén Destino
                    </label>
                    <select 
                      value={destLoc} 
                      onChange={(e) => setDestLoc(Number(e.target.value))}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                    >
                      {locations.map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name.split('/').pop()} {l.pos_names.length > 0 ? `[${l.pos_names.join(', ')}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <Icons.Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  <input 
                    type="text" 
                    placeholder="Escriba el nombre o código del producto..." 
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm font-bold focus:bg-white outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-inner" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isSearching ? (
                    <div className="col-span-full py-16 text-center"><Icons.Loader2 className="animate-spin mx-auto text-indigo-500" size={40} /></div>
                  ) : products.length === 0 ? (
                    <div className="col-span-full py-24 text-center text-slate-300 flex flex-col items-center gap-4">
                       <Icons.Package size={48} strokeWidth={1} />
                       <p className="text-xs font-bold uppercase tracking-widest italic">No hay stock disponible en el origen.</p>
                    </div>
                  ) : products.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addToCart(p)} 
                      className="p-5 border border-slate-100 rounded-3xl flex justify-between items-center cursor-pointer hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/5 transition-all active:scale-95 bg-white shadow-sm group"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-black text-slate-900 uppercase truncate leading-tight mb-2">{p.name}</p>
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] px-2 py-0.5 rounded-lg font-black ${p.qty_available > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                             {p.qty_available} EN STOCK
                           </span>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Icons.Plus size={20} strokeWidth={3} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shopping Cart Summary SaaS Style */}
              <div className="w-full lg:w-96 p-10 bg-slate-50/80 border-l border-slate-100 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Cesta de Pedido</h3>
                   <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-[10px] font-black shadow-lg shadow-indigo-100">{cart.length}</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                  {cart.length === 0 ? (
                    <div className="text-center py-20 text-slate-300 flex flex-col items-center gap-4 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                       <Icons.ShoppingBag size={40} strokeWidth={1.5} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Sin productos</span>
                    </div>
                  ) : cart.map(item => (
                    <div key={item.product_id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-fade-in group hover:border-indigo-200 transition-colors">
                      <div className="flex-1 mb-3">
                        <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-tight mb-1">{item.product_name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Máx: {item.available_at_source}</p>
                      </div>
                      <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl">
                          <button onClick={() => setCart(prev => prev.map(i => i.product_id === item.product_id ? {...i, qty: Math.max(1, i.qty - 1)} : i))} className="w-8 h-8 rounded-lg hover:bg-white text-slate-500 transition-colors">
                            <Icons.Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            value={item.qty} 
                            onChange={(e) => setCart(prev => prev.map(i => i.product_id === item.product_id ? {...i, qty: Math.max(1, parseInt(e.target.value) || 1)} : i))} 
                            className="w-10 text-center text-xs font-black bg-transparent outline-none text-slate-900" 
                          />
                          <button onClick={() => setCart(prev => prev.map(i => i.product_id === item.product_id ? {...i, qty: i.qty + 1} : i))} className="w-8 h-8 rounded-lg hover:bg-white text-slate-500 transition-colors">
                            <Icons.Plus size={14} />
                          </button>
                        </div>
                        <button onClick={() => setCart(prev => prev.filter(i => i.product_id !== item.product_id))} className="text-slate-300 hover:text-red-500 transition-colors p-2">
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-10 space-y-4">
                  <button 
                    disabled={cart.length === 0 || isSubmitting}
                    onClick={handleSubmit}
                    className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 transform active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? <Icons.Loader2 className="animate-spin" size={18} /> : (
                      <>
                        <Icons.CheckCircle size={18} />
                        Confirmar Orden
                      </>
                    )}
                  </button>
                  <p className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-widest leading-relaxed px-4">
                    Al confirmar, se creará una transferencia en Odoo para su validación manual.
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
