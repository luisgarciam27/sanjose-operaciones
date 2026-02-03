
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, Product } from '../../types';
import { OdooClient } from '../../services/odooService';

interface StockModuleProps {
  session: UserSession;
  odooClient: OdooClient;
}

const StockModule: React.FC<StockModuleProps> = ({ session, odooClient }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        // Relajamos el filtro de compañía por si los productos están asociados a la compañía madre
        const data = await odooClient.searchRead(
          'product.product', 
          [['qty_available', '>', 0]], 
          ['name', 'default_code', 'qty_available', 'list_price']
        );
        setProducts(data as any[]);
      } catch (err) {
        console.error("Error cargando inventario SJS:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStock();
  }, [odooClient]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.default_code && p.default_code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase">Inventario San José</h1>
          <p className="text-gray-500 text-sm font-medium">Consulta global de disponibilidad en red de boticas.</p>
        </div>
        <div className="relative w-full md:w-96">
          <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar en San José B1, B2, B3..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition shadow-sm font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          Array.from({length: 8}).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-gray-100 shadow-sm" />
          ))
        ) : filteredProducts.map(p => (
          <div key={p.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all border-b-4 border-b-transparent hover:border-b-[#017e84]">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                <Icons.Package size={20} />
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest ${p.qty_available < 10 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                SJS STOCK: {p.qty_available}
              </span>
            </div>
            
            <h3 className="font-black text-gray-900 line-clamp-2 min-h-[3rem] mb-2 uppercase text-sm tracking-tight">{p.name}</h3>
            <p className="text-[10px] text-gray-400 font-bold mb-4 uppercase tracking-widest">{p.default_code || 'SIN CODIGO'}</p>
            
            <div className="flex items-center justify-between mt-auto">
              <span className="text-lg font-black text-[#017e84]">S/ {p.list_price.toFixed(2)}</span>
              <button className="text-[10px] font-black text-gray-400 hover:text-teal-600 transition underline uppercase tracking-widest">Ver Boticas</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StockModule;
