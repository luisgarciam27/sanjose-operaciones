
import React, { useState, useEffect, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, Product, SupplyRequestLine, Location } from '../../types';
import { OdooClient } from '../../services/odooService';
import { ODOO_COLORS } from '../../constants';

interface ExtendedSupplyLine extends SupplyRequestLine {
  uom_id: number;
}

interface TransfersModuleProps {
  session: any;
  odooClient: OdooClient;
}

const TransfersModule: React.FC<TransfersModuleProps> = ({ session, odooClient }) => {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [sourceLoc, setSourceLoc] = useState<number>(0);
  const [destLoc, setDestLoc] = useState<number>(0);
  const [cart, setCart] = useState<ExtendedSupplyLine[]>([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const SJS_MAP: Record<string, string> = {
    'PR/': 'PRINCIPAL1',
    'B1/': 'San José B1',
    'B2/': 'San José B2',
    'B3/': 'San José B3',
    'B4/': 'San José B4',
    'B5/': 'San José B5',
  };

  // 1. CARGA DE BORRADORES LOCALES (LocalStorage)
  useEffect(() => {
    const savedCart = localStorage.getItem(`sjs_draft_${session.id}`);
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) setCart(parsed);
      } catch (e) {
        console.error("Error al cargar borrador local");
      }
    }
  }, [session.id]);

  const saveLocalDraft = (newCart: ExtendedSupplyLine[]) => {
    localStorage.setItem(`sjs_draft_${session.id}`, JSON.stringify(newCart));
  };

  // 2. OBTENER TRANSFERENCIAS (VISIBILIDAD MEJORADA)
  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Buscamos cualquier pedido que tenga nuestra etiqueta de origen
      const domain: any[] = [
        ['picking_type_id.name', 'ilike', 'Transferencias internas'],
        '|', 
        ['origin', 'ilike', 'Solicitud App:'], 
        ['origin', 'ilike', 'Borrador App:']
      ];
      
      const data = await odooClient.searchRead('stock.picking', domain, 
        ['name', 'origin', 'state', 'scheduled_date', 'location_id', 'location_dest_id'], 
        { limit: 40, order: 'id desc' }
      );
      setTransfers(data);
    } catch (err) {
      console.error("Error al sincronizar con Odoo:", err);
    } finally {
      setIsLoading(false);
    }
  }, [odooClient]);

  // 3. DATOS INICIALES
  const fetchInitialData = useCallback(async () => {
    try {
      const locationsData = await odooClient.searchRead('stock.location', [['usage', '=', 'internal']], ['name', 'complete_name']);
      const allLocs = locationsData as Location[];
      const filteredLocs = allLocs.filter(l => Object.keys(SJS_MAP).some(code => (l.complete_name || l.name).toUpperCase().includes(code)));
      setLocations(filteredLocs.length > 0 ? filteredLocs : allLocs);

      const main = filteredLocs.find(l => (l.complete_name || l.name).toUpperCase().includes('PR/'));
      if (main) setSourceLoc(main.id);
      
      const b1 = filteredLocs.find(l => (l.complete_name || l.name).toUpperCase().includes('B1/'));
      if (b1) setDestLoc(b1.id);
      
      await fetchTransfers();
    } catch (err) {
      console.error(err);
    }
  }, [odooClient, fetchTransfers]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Búsqueda de productos en stock central
  useEffect(() => {
    if (showModal && sourceLoc > 0) {
      const delayDebounceFn = setTimeout(() => { fetchProductsWithStock(); }, 350);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [sourceLoc, search, showModal]);

  const fetchProductsWithStock = async () => {
    setIsSearching(true);
    try {
      const data = await odooClient.getProductsWithStock(sourceLoc, search);
      setProducts(data as any[]);
    } finally {
      setIsSearching(false);
    }
  };

  const formatLocationName = (loc: any) => {
    if (!loc) return '---';
    const nameStr = Array.isArray(loc) ? loc[1] : (loc.complete_name || loc.name);
    if (!nameStr) return '---';
    const path = nameStr.toUpperCase();
    for (const [code, friendlyName] of Object.entries(SJS_MAP)) {
      if (path.includes(code)) return friendlyName;
    }
    return nameStr.split('/').pop() || nameStr;
  };

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product_id === product.id);
    if (existing) return;
    
    const newCart = [...cart, { 
      product_id: product.id, 
      product_name: product.name, 
      qty: 1, 
      available_at_source: product.qty_available, 
      uom_id: product.uom_id ? product.uom_id[0] : 1 
    }];
    setCart(newCart);
    saveLocalDraft(newCart);
  };

  const updateQty = (productId: number, qty: number) => {
    const newCart = cart.map(item => item.product_id === productId ? { ...item, qty: Math.max(0, qty) } : item);
    setCart(newCart);
    saveLocalDraft(newCart);
  };

  const removeFromCart = (productId: number) => {
    const newCart = cart.filter(i => i.product_id !== productId);
    setCart(newCart);
    saveLocalDraft(newCart);
  };

  // 4. ENVÍO A ODOO (BORRADOR O PEDIDO)
  const handleAction = async (isFinal: boolean) => {
    const items = cart.filter(i => i.qty > 0);
    if (items.length === 0) { alert("Agregue productos para continuar."); return; }
    
    setIsSubmitting(true);
    try {
      const pickingTypes = await odooClient.searchRead('stock.picking.type', [['name', 'ilike', 'Transferencias internas']], ['id']);
      const pickingTypeId = pickingTypes.length > 0 ? pickingTypes[0].id : 5;
      
      const tag = isFinal ? "Solicitud App" : "Borrador App";
      
      await odooClient.create('stock.picking', {
        picking_type_id: pickingTypeId,
        location_id: sourceLoc,
        location_dest_id: destLoc,
        origin: `${tag}: ${session.name} (${new Date().toLocaleTimeString()})`,
        company_id: session.company_id,
        state: 'draft',
        move_lines: items.map(item => [0, 0, {
          product_id: item.product_id,
          name: item.product_name,
          product_uom_qty: item.qty,
          product_uom: item.uom_id,
          location_id: sourceLoc,
          location_dest_id: destLoc,
        }])
      });
      
      setCart([]);
      localStorage.removeItem(`sjs_draft_${session.id}`);
      setShowModal(false);
      await fetchTransfers();
      alert(`✅ ${isFinal ? 'Pedido enviado' : 'Borrador guardado'} exitosamente en Odoo.`);
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Logística San José</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
            <Icons.Globe size={14} className="text-[#017e84]" />
            Sincronización en tiempo real con Odoo 14
          </p>
        </div>
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <button 
            onClick={fetchTransfers}
            className="flex-1 lg:flex-none bg-slate-50 text-slate-600 border border-slate-200 px-8 py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            <Icons.RefreshCcw size={18} className={isLoading ? 'animate-spin' : ''} />
            Actualizar Lista
          </button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: ODOO_COLORS.teal }}
            className="flex-1 lg:flex-none text-white px-10 py-5 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Icons.PlusCircle size={22} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* Historial de Pedidos */}
      <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden min-h-[500px]">
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
          <div className="flex items-center gap-3">
             <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
             <h2 className="text-[12px] font-black text-slate-600 uppercase tracking-widest">Pedidos y Borradores Sincronizados</h2>
          </div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{transfers.length} Movimientos</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ruta (Destino)</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Origen/Marca</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <Icons.Loader2 className="animate-spin mx-auto text-slate-200 mb-4" size={56} />
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">Obteniendo datos de Odoo...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <Icons.Inbox size={56} className="mx-auto text-slate-100 mb-6" />
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">No se encontraron pedidos en esta sesión</p>
                  </td>
                </tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-all cursor-default group">
                  <td className="px-10 py-6 font-black text-slate-900 text-sm tracking-tight">{t.name}</td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#714B67] bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-100">
                        {formatLocationName(t.location_dest_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter max-w-[200px] truncate">{t.origin || '---'}</p>
                  </td>
                  <td className="px-10 py-6 text-xs font-bold text-slate-400">
                    {new Date(t.scheduled_date).toLocaleDateString()}
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] border shadow-sm ${
                      t.state === 'draft' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      t.state === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                      'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {t.state === 'draft' ? 'BORRADOR' : t.state === 'assigned' ? 'LISTO' : t.state === 'done' ? 'HECHO' : t.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE OPERACIÓN LOGÍSTICA */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-4 animate-fade-in">
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border border-white">
            
            {/* Header del Modal */}
            <div className="px-12 py-8 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center gap-10">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede de Origen (Stock)</p>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
                    <Icons.Warehouse size={16} className="text-[#714B67]" />
                    <span className="text-xs font-black text-slate-800 uppercase tracking-tight">PRINCIPAL 1 (CENTRAL)</span>
                  </div>
                </div>
                <Icons.MoveRight className="text-slate-200 mt-4" size={24} />
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sede de Destino</p>
                  <select 
                    value={destLoc}
                    onChange={(e) => setDestLoc(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-2xl px-6 py-3 text-xs font-black text-[#017e84] outline-none focus:ring-4 focus:ring-[#017e84]/5 cursor-pointer shadow-sm min-w-[220px]"
                  >
                    {locations.map(l => <option key={l.id} value={l.id}>{formatLocationName(l)}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-300 hover:text-red-500 transition-all shadow-sm">
                <Icons.X size={32} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Catálogo Centralizado (Izquierda) */}
              <div className="w-[45%] border-r border-slate-100 flex flex-col bg-slate-50/10">
                <div className="p-10 pb-6">
                  <div className="relative group">
                    <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#714B67] transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="Medicamento, marca o código..."
                      className="w-full pl-16 pr-8 py-5 rounded-[2.5rem] border-2 border-slate-100 text-sm font-bold outline-none focus:border-[#714B67] focus:ring-8 focus:ring-[#714B67]/5 transition-all shadow-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-4">
                  {isSearching ? (
                    <div className="py-20 text-center animate-pulse"><Icons.Loader2 className="animate-spin mx-auto text-slate-200" size={56} /></div>
                  ) : products.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addToCart(p)}
                      className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center justify-between cursor-pointer hover:border-[#714B67] hover:shadow-2xl transition-all group active:scale-[0.98] border-l-8 border-l-transparent hover:border-l-[#714B67]"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[12px] font-black text-slate-800 uppercase truncate mb-2">{p.name}</p>
                        <div className="flex items-center gap-4">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${p.qty_available > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                             Stock Central: {p.qty_available}
                           </span>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">S/ {p.list_price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#714B67] group-hover:text-white transition-all shadow-inner">
                        <Icons.Plus size={24} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pedido Actual (Derecha) */}
              <div className="flex-1 flex flex-col bg-white">
                <div className="px-10 py-10 flex justify-between items-center border-b border-slate-50">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Líneas de Pedido</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Configura las cantidades finales aquí</p>
                  </div>
                  {cart.length > 0 && (
                    <button 
                      onClick={() => {setCart([]); localStorage.removeItem(`sjs_draft_${session.id}`);}}
                      className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest underline"
                    >
                      Vaciar Pedido
                    </button>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-50 z-10">
                      <tr>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Producto</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] w-48 text-center">Cantidad</th>
                        <th className="px-10 py-5 text-right w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-40 text-center">
                            <Icons.ShoppingBag size={80} className="mx-auto text-slate-50 mb-8" />
                            <p className="text-[12px] font-black text-slate-200 uppercase tracking-[0.4em]">El carrito está vacío</p>
                          </td>
                        </tr>
                      ) : cart.map(item => (
                        <tr key={item.product_id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-10 py-6">
                            <p className="text-[13px] font-black text-slate-800 uppercase mb-2 leading-tight">{item.product_name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Disponible en Central: {item.available_at_source} UND</span>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex items-center justify-center gap-3">
                              <button onClick={() => updateQty(item.product_id, item.qty - 1)} className="p-2 text-slate-300 hover:text-[#714B67] transition-colors"><Icons.Minus size={18}/></button>
                              <input 
                                type="number"
                                value={item.qty}
                                onChange={(e) => updateQty(item.product_id, parseInt(e.target.value) || 0)}
                                className="w-24 bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-4 text-sm font-black text-center text-slate-900 focus:border-[#714B67] focus:bg-white outline-none transition-all"
                              />
                              <button onClick={() => updateQty(item.product_id, item.qty + 1)} className="p-2 text-slate-300 hover:text-[#714B67] transition-colors"><Icons.Plus size={18}/></button>
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button 
                              onClick={() => removeFromCart(item.product_id)}
                              className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Icons.Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Acciones Finales del Modal */}
                <div className="p-10 bg-slate-50/60 border-t border-slate-100">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                        <Icons.Save size={28} />
                      </div>
                      <div className="max-w-[200px]">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Guardado</p>
                         <p className="text-[11px] font-bold text-slate-500 leading-tight">No perderás los cambios si cierras la ventana.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 w-full lg:w-auto">
                      <button 
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={() => handleAction(false)}
                        className="flex-1 lg:flex-none px-10 py-6 bg-white border border-slate-200 text-slate-600 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm disabled:opacity-40"
                      >
                        {isSubmitting ? '...' : 'Crear Borrador Odoo'}
                      </button>
                      <button 
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={() => handleAction(true)}
                        style={{ backgroundColor: ODOO_COLORS.teal }}
                        className="flex-1 lg:flex-none px-16 py-6 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-4"
                      >
                        {isSubmitting ? <Icons.Loader2 className="animate-spin" size={24} /> : (
                          <>
                            Enviar Pedido Final
                            <Icons.ArrowRightCircle size={24} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
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
