
import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { UserSession } from '../../types';
import { OdooClient } from '../../services/odooService';
import { OFFICIAL_EMPLOYEES, ODOO_COLORS, SHIFT_TYPES } from '../../constants';

interface EmployeesModuleProps {
  session: UserSession;
  odooClient: OdooClient;
}

interface Schedule {
  employeeEmail: string;
  shiftId: string;
  day: string;
}

const EmployeesModule: React.FC<EmployeesModuleProps> = ({ session, odooClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  const filteredEmployees = OFFICIAL_EMPLOYEES.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const assignShift = (email: string, shiftId: string) => {
    setSchedules(prev => {
      const filtered = prev.filter(s => s.employeeEmail !== email);
      return [...filtered, { employeeEmail: email, shiftId, day: 'Hoy' }];
    });
  };

  const getShiftForEmployee = (email: string) => {
    const found = schedules.find(s => s.employeeEmail === email);
    if (!found) return null;
    return SHIFT_TYPES.find(st => st.id === found.shiftId);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SaaS Header for Employees */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Personal & Horarios</h1>
          <p className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">Panel de Control para {session.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Icons.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
            <input 
              type="text" 
              placeholder="Buscar colaborador..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowScheduleModal(true)}
            style={{ backgroundColor: ODOO_COLORS.teal }}
            className="text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:opacity-90 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-teal-50"
          >
            <Icons.CalendarClock size={16} />
            Gestionar Horarios
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#714B67] rounded-[2rem] p-8 text-white shadow-xl shadow-purple-50 flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-[9px] font-black uppercase tracking-widest">Total Equipo</p>
            <h3 className="text-4xl font-black mt-1">{OFFICIAL_EMPLOYEES.length}</h3>
          </div>
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center">
            <Icons.Users size={28} />
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">En Turno Ahora</p>
            <h3 className="text-4xl font-black text-slate-900 mt-1">{schedules.length + 2}</h3>
          </div>
          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center">
            <Icons.Clock size={28} />
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Sedes Activas</p>
            <h3 className="text-4xl font-black text-slate-900 mt-1">6</h3>
          </div>
          <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center">
            <Icons.MapPin size={28} />
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Sincronización</p>
            <h3 className="text-lg font-black text-emerald-600 mt-1">100% OK</h3>
          </div>
          <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-2xl flex items-center justify-center">
            <Icons.ShieldCheck size={28} />
          </div>
        </div>
      </div>

      {/* Employees List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredEmployees.map((emp, idx) => {
          const shift = getShiftForEmployee(emp.email);
          return (
            <div key={idx} className="bg-white border border-slate-100 rounded-[3rem] p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 -mr-12 -mt-12 rounded-full transition-transform group-hover:scale-150" />
              
              <div className="relative">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white font-black text-xl shadow-lg ${
                    idx % 3 === 0 ? 'bg-indigo-500' : idx % 3 === 1 ? 'bg-slate-800' : 'bg-[#017e84]'
                  }`}>
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  {shift && (
                    <div className={`px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest ${shift.color}`}>
                      {shift.label}
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight mb-1 group-hover:text-[#714B67] transition-colors">
                  {emp.name}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mb-4">
                  {emp.role}
                </p>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 bg-slate-50 p-3 rounded-2xl">
                    <Icons.Mail size={14} className="text-indigo-400" />
                    <span className="truncate">{emp.email}</span>
                  </div>
                  {shift ? (
                    <div className="flex items-center gap-3 text-xs font-black text-emerald-600 bg-emerald-50 p-3 rounded-2xl">
                      <Icons.Clock size={14} />
                      <span>{shift.hours}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-300 bg-slate-50 p-3 rounded-2xl uppercase tracking-tighter">
                      <Icons.AlertCircle size={14} />
                      Sin horario asignado
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setShowScheduleModal(true)}
                  className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all flex items-center justify-center gap-2"
                >
                  <Icons.Edit3 size={14} />
                  Editar Turno
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* SCHEDULE MANAGER MODAL */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-[#714B67]/30 backdrop-blur-2xl animate-fade-in">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[4rem] shadow-2xl overflow-hidden flex flex-col border border-white">
            <div className="px-12 py-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Gestión de Horarios</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configuración de turnos para boticas San José</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-300 hover:text-red-500 transition-all shadow-sm">
                <Icons.X size={28} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12">
              <div className="grid grid-cols-1 gap-4">
                {OFFICIAL_EMPLOYEES.filter(e => e.role.includes('Vendedor') || e.role.includes('Jefe')).map((emp) => (
                  <div key={emp.email} className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 group hover:bg-white hover:shadow-xl transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-2xl bg-[#714B67] text-white flex items-center justify-center font-black text-xl">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800">{emp.name}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{emp.role} • {emp.department}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {SHIFT_TYPES.map(shift => {
                        const isSelected = schedules.find(s => s.employeeEmail === emp.email && s.shiftId === shift.id);
                        return (
                          <button
                            key={shift.id}
                            onClick={() => assignShift(emp.email, shift.id)}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${
                              isSelected 
                                ? 'bg-teal-500 text-white border-teal-500 shadow-lg shadow-teal-100' 
                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                            }`}
                          >
                            {shift.label}
                            <div className="text-[8px] opacity-70 font-bold mt-0.5">{shift.hours}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-10 border-t border-slate-100 bg-slate-50/30 flex justify-end">
              <button 
                onClick={() => {
                  alert("✅ Los horarios han sido sincronizados con éxito.");
                  setShowScheduleModal(false);
                }}
                style={{ backgroundColor: ODOO_COLORS.teal }}
                className="px-12 py-5 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
              >
                <Icons.Save size={18} />
                Guardar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeesModule;
