
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

  // Cargar borradores locales al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem(`sjs_draft_cart_${session.id}`);
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error cargando borrador local");
      }
    }
  }, [session.id]);

  // Guardar borrador local automáticamente cuando cambie el carrito
  const saveLocalDraft = (newCart: ExtendedSupplyLine[]) => {
    localStorage.setItem(`sjs_draft_cart_${session.id}`, JSON.stringify(newCart));
  };

  const fetchTransfers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simplificamos el dominio para asegurar que veamos TODO lo que diga "Solicitud App"
      const domain: any[] = [['origin', 'ilike', 'Solicitud App:']];
      
      const data = await odooClient.searchRead('stock.picking', domain, 
        ['name', 'origin', 'state', 'scheduled_date', 'location_id', 'location_dest_id'], 
        { limit: 50, order: 'id desc' }
      );
      setTransfers(data);
    } catch (err) {
      console.error("Error al sincronizar transferencias:", err);
    } finally {
      setIsLoading(false);
    }
  }, [odooClient]);

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

  useEffect(() => {
    if (showModal && sourceLoc > 0) {
      const delayDebounceFn = setTimeout(() => { fetchProductsWithStock(); }, 300);
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
    const newCart = [...cart];
    const existing = newCart.find(item => item.product_id === product.id);
    if (!existing) {
      const line = { 
        product_id: product.id, 
        product_name: product.name, 
        qty: 1, 
        available_at_source: product.qty_available, 
        uom_id: product.uom_id ? product.uom_id[0] : 1 
      };
      newCart.push(line);
      setCart(newCart);
      saveLocalDraft(newCart);
    }
  };

  const handleQtyChange = (productId: number, value: string) => {
    const num = parseInt(value) || 0;
    const newCart = cart.map(item => 
      item.product_id === productId ? { ...item, qty: num } : item
    );
    setCart(newCart);
    saveLocalDraft(newCart);
  };

  const removeFromCart = (productId: number) => {
    const newCart = cart.filter(i => i.product_id !== productId);
    setCart(newCart);
    saveLocalDraft(newCart);
  };

  const handleSubmit = async (confirm: boolean = false) => {
    const validItems = cart.filter(i => i.qty > 0);
    if (validItems.length === 0) { alert("Agregue productos con cantidad."); return; }
    
    setIsSubmitting(true);
    try {
      const pickingTypes = await odooClient.searchRead('stock.picking.type', [['name', 'ilike', 'Transferencias internas']], ['id']);
      const pickingTypeId = pickingTypes.length > 0 ? pickingTypes[0].id : 5;
      
      const originTag = confirm ? "Solicitud App: " : "Borrador App: ";
      
      await odooClient.create('stock.picking', {
        picking_type_id: pickingTypeId,
        location_id: sourceLoc,
        location_dest_id: destLoc,
        origin: `${originTag}${session.name} (${new Date().toLocaleTimeString()})`,
        company_id: session.company_id,
        state: 'draft',
        move_lines: validItems.map(item => [0, 0, {
          product_id: item.product_id,
          name: item.product_name,
          product_uom_qty: item.qty,
          product_uom: item.uom_id,
          location_id: sourceLoc,
          location_dest_id: destLoc,
        }])
      });
      
      setShowModal(false);
      setCart([]);
      localStorage.removeItem(`sjs_draft_cart_${session.id}`);
      await fetchTransfers();
      alert(`✅ Pedido ${confirm ? 'Confirmado' : 'Guardado como Borrador'} en Odoo.`);
    } catch (err: any) {
      alert('Error de sincronización: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyle = (state: string) => {
    switch(state) {
      case 'done': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'assigned': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'draft': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-8">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Gestión de Pedidos</h1>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em] mt-2 italic">Sincronización en vivo con Almacén Principal</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={fetchTransfers}
            className="flex-1 md:flex-none bg-slate-50 text-slate-500 border border-slate-200 px-6 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            <Icons.CloudSync size={18} className={isLoading ? 'animate-spin' : ''} />
            Refrescar Lista
          </button>
          <button 
            onClick={() => setShowModal(true)}
            style={{ backgroundColor: ODOO_COLORS.teal }}
            className="flex-1 md:flex-none text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all"
          >
            <Icons.PlusCircle size={20} />
            Nuevo Pedido
          </button>
        </div>
      </div>

      {/* LISTA DE PEDIDOS SINCRONIZADOS */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden min-h-[400px]">
        <div className="px-10 py-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/20">
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
             <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Historial Odoo App</h2>
          </div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{transfers.length} Pedidos encontrados</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referencia Odoo</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destino</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Etiqueta de Origen</th>
                <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-10 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <Icons.Loader2 className="animate-spin mx-auto text-slate-200 mb-4" size={48} />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Cargando datos de Odoo...</p>
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <Icons.FileSearch size={48} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">No hay pedidos registrados en Odoo todavía</p>
                  </td>
                </tr>
              ) : transfers.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-all cursor-default group">
                  <td className="px-10 py-6 font-black text-slate-900 text-sm">{t.name}</td>
                  <td className="px-10 py-6">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#714B67] bg-purple-50 px-4 py-1.5 rounded-xl border border-purple-100">
                        {formatLocationName(t.location_dest_id)}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter max-w-xs truncate">{t.origin || 'Sin origen'}</p>
                  </td>
                  <td className="px-10 py-6">
                    <p className="text-xs font-bold text-slate-400">{new Date(t.scheduled_date).toLocaleDateString()}</p>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <span className={`px-4 py-2 rounded-xl font-black uppercase text-[9px] border shadow-sm ${getStatusStyle(t.state)}`}>
                      {t.state === 'draft' ? 'Borrador' : t.state === 'assigned' ? 'Listo' : t.state === 'done' ? 'Hecho' : t.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE NUEVO PEDIDO / BORRADOR */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-2xl p-4 animate-fade-in">
          <div className="bg-white w-full max-w-7xl h-[94vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border border-white">
            
            {/* Modal Header */}
            <div className="px-12 py-8 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
              <div className="flex items-center gap-12">
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Consultar Stock de:</p>
                  <div className="flex items-center gap-4 bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm">
                    <Icons.Home size={16} className="text-[#714B67]" />
                    <span className="text-xs font-black text-slate-800 uppercase">PRINCIPAL1</span>
                  </div>
                </div>
                <Icons.ArrowRight className="text-slate-200 mt-6" size={24} />
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enviar a Sede:</p>
                  <select 
                    value={destLoc}
                    onChange={(e) => setDestLoc(Number(e.target.value))}
                    className="bg-white border border-slate-200 rounded-2xl px-6 py-3 text-xs font-black text-[#017e84] outline-none focus:ring-4 focus:ring-[#017e84]/5 cursor-pointer shadow-sm"
                  >
                    {locations.map(l => <option key={l.id} value={l.id}>{formatLocationName(l)}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-300 hover:text-red-500 transition-all shadow-sm">
                <Icons.X size={28} />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Catálogo Izquierdo (Buscador) */}
              <div className="w-[45%] border-r border-slate-100 flex flex-col bg-slate-50/10">
                <div className="p-10 pb-6">
                  <div className="relative group">
                    <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#714B67] transition-colors" size={20} />
                    <input 
                      type="text" 
                      placeholder="Nombre del medicamento o código..."
                      className="w-full pl-16 pr-8 py-5 rounded-[2rem] border-2 border-slate-100 text-sm font-bold outline-none focus:border-[#714B67] focus:ring-8 focus:ring-[#714B67]/5 transition-all shadow-sm"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-10 pb-10 space-y-3">
                  {isSearching ? (
                    <div className="py-20 text-center animate-pulse"><Icons.Loader2 className="animate-spin mx-auto text-slate-200" size={48} /></div>
                  ) : products.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => addToCart(p)}
                      className="p-5 bg-white border border-slate-100 rounded-3xl flex items-center justify-between cursor-pointer hover:border-[#714B67] hover:shadow-xl transition-all group active:scale-[0.98] border-l-8 border-l-transparent hover:border-l-[#714B67]"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-xs font-black text-slate-800 uppercase truncate leading-tight mb-2">{p.name}</p>
                        <div className="flex items-center gap-4">
                           <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${p.qty_available > 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'}`}>
                             Stock Central: {p.qty_available}
                           </span>
                           <span className="text-[10px] font-black text-slate-400 uppercase">S/ {p.list_price.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-[#714B67] group-hover:text-white transition-all shadow-inner">
                        <Icons.Plus size={20} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pedido Actual (Panel de Control) */}
              <div className="flex-1 flex flex-col bg-white">
                <div className="px-10 py-10 border-b border-slate-50 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">Preparación de Pedido</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Escribe la cantidad exacta para cada producto</p>
                  </div>
                  <div className="px-5 py-2.5 bg-purple-50 rounded-2xl border border-purple-100">
                    <span className="text-xs font-black text-[#714B67] uppercase">{cart.length} productos seleccionados</span>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-50 z-10">
                      <tr>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Descripción</th>
                        <th className="px-10 py-5 text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] w-48 text-center">Cantidad a Pedir</th>
                        <th className="px-10 py-5 text-right w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {cart.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-40 text-center">
                            <Icons.ShoppingBag size={80} className="mx-auto text-slate-50 mb-8" />
                            <p className="text-[11px] font-black text-slate-200 uppercase tracking-[0.5em]">Elige productos del catálogo principal</p>
                          </td>
                        </tr>
                      ) : cart.map(item => (
                        <tr key={item.product_id} className="group hover:bg-slate-50/50 transition-colors">
                          <td className="px-10 py-6">
                            <p className="text-[13px] font-black text-slate-800 uppercase mb-2">{item.product_name}</p>
                            <span className="text-[10px] font-bold text-slate-400 uppercase italic">Stock disponible: {item.available_at_source} UND</span>
                          </td>
                          <td className="px-10 py-6">
                            <div className="flex justify-center">
                              <input 
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) => handleQtyChange(item.product_id, e.target.value)}
                                className="w-28 bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-center text-slate-900 focus:border-[#714B67] focus:bg-white outline-none transition-all shadow-sm"
                              />
                            </div>
                          </td>
                          <td className="px-10 py-6 text-right">
                            <button 
                              onClick={() => removeFromCart(item.product_id)}
                              className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                            >
                              <Icons.Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Acciones del Pedido */}
                <div className="p-10 bg-slate-50/50 border-t border-slate-100">
                  <div className="flex items-center justify-between gap-6">
                    <div className="hidden lg:flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-emerald-500 shadow-sm">
                        <Icons.CheckCircle2 size={28} />
                      </div>
                      <div className="max-w-[180px]">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Autoguardado Local</p>
                         <p className="text-[11px] font-bold text-slate-500 leading-tight">Tu progreso se guarda automáticamente en este dispositivo.</p>
                      </div>
                    </div>

                    <div className="flex gap-4 w-full lg:w-auto">
                      <button 
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={() => handleSubmit(false)}
                        className="flex-1 lg:flex-none px-8 py-6 bg-white border border-slate-200 text-slate-500 rounded-[2.5rem] font-black text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-all shadow-sm disabled:opacity-30"
                      >
                        Guardar Borrador Odoo
                      </button>
                      <button 
                        disabled={cart.length === 0 || isSubmitting}
                        onClick={() => handleSubmit(true)}
                        style={{ backgroundColor: ODOO_COLORS.teal }}
                        className="flex-1 lg:flex-none px-14 py-6 text-white rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-4"
                      >
                        {isSubmitting ? <Icons.Loader2 className="animate-spin" size={24} /> : (
                          <>
                            Enviar Pedido Final
                            <Icons.Zap size={20} />
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
