
import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, Employee } from '../../types';
import { OdooClient } from '../../services/odooService';

interface EmployeesModuleProps {
  session: UserSession;
  odooClient: OdooClient;
}

const EmployeesModule: React.FC<EmployeesModuleProps> = ({ odooClient }) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchEmployees = async () => {
    setIsSyncing(true);
    try {
      const data = await odooClient.searchRead('hr.employee', [], ['name', 'job_id', 'department_id', 'work_email']);
      setEmployees(data as any[]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [odooClient]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Personal & Asistencia</h1>
          <p className="text-gray-500 text-sm">Sincronización en tiempo real con la base de datos de Odoo.</p>
        </div>
        <button 
          onClick={fetchEmployees}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white font-medium hover:bg-gray-50 transition shadow-sm ${isSyncing ? 'text-purple-600' : 'text-gray-600'}`}
        >
          <Icons.RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({length: 6}).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse border border-gray-100" />
          ))
        ) : employees.map(emp => (
          <div key={emp.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-600 font-bold text-lg relative">
                {emp.name.charAt(0)}
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{emp.name}</h3>
                <p className="text-xs text-purple-600 font-medium">{emp.job_id[1]}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 uppercase tracking-wider">
                  <Icons.MapPin size={10} /> {emp.department_id[1]}
                </p>
              </div>
              <button className="p-2 text-gray-300 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition">
                <Icons.MoreVertical size={18} />
              </button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
               <span className="text-[10px] text-gray-400">Última actividad: hace 2 min</span>
               <button className="text-xs font-bold text-purple-600 hover:underline">Ver Perfil</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmployeesModule;
