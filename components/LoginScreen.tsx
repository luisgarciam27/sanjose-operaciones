
import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { ODOO_COLORS } from '../constants';

interface LoginScreenProps {
  onLogin: (user: string, pass: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, isLoading, error }) => {
  const [username, setUsername] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.includes('@')) {
      alert("Ingrese su correo corporativo @sanjose.pe");
      return;
    }
    onLogin(username, "");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8 overflow-hidden relative">
      {/* Esferas de color Alegres y Dinámicas */}
      <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-100 rounded-full blur-[100px] animate-pulse opacity-60" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-teal-50 rounded-full blur-[100px] opacity-70" />
      <div className="absolute top-[20%] right-[10%] w-[300px] h-[300px] bg-indigo-50 rounded-full blur-[80px]" />
      
      {/* Grid Pattern Sutil */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#714B67 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white/80 backdrop-blur-2xl rounded-[4rem] overflow-hidden shadow-[0_40px_100px_-20px_rgba(113,75,103,0.15)] border border-white relative z-10">
        
        {/* Lado Izquierdo: Branding Vibrante */}
        <div className="p-20 flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: ODOO_COLORS.purple }}>
          {/* Patrón de ondas decorativo */}
          <svg className="absolute bottom-0 left-0 w-full opacity-20" viewBox="0 0 500 200" preserveAspectRatio="none">
            <path d="M0,150 C150,200 350,100 500,150 L500,200 L0,200 Z" fill="white"></path>
          </svg>
          
          <div className="relative z-10">
             <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center mb-12 shadow-2xl rotate-3">
                <Icons.Sparkles style={{ color: ODOO_COLORS.purple }} size={40} strokeWidth={2} />
             </div>
             <h2 className="text-5xl font-black text-white tracking-tighter leading-tight mb-6">
                ¡Hola de nuevo!
             </h2>
             <p className="text-white/70 font-bold text-lg max-w-xs leading-snug">
                Tu portal de operaciones San José está listo para hoy.
             </p>
          </div>

          <div className="relative z-10 pt-10 border-t border-white/10 flex items-center gap-8">
             <div>
                <p className="text-2xl font-black text-white">SJS</p>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1 italic">Premium ERP</p>
             </div>
             <div className="w-px h-10 bg-white/10" />
             <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-white/40" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <div className="w-2 h-2 rounded-full bg-white/10" />
             </div>
          </div>
        </div>

        {/* Lado Derecho: Formulario Limpio y Alegre */}
        <div className="p-20 bg-white/40">
          <div className="mb-14 text-center lg:text-left">
             <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-3">Iniciar Sesión</h3>
             <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Identificación del Colaborador</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-4">Tu Correo Corporativo</label>
              <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-xl group-focus-within:bg-[#f3e8ff] transition-colors">
                  <Icons.User style={{ color: ODOO_COLORS.purple }} size={18} strokeWidth={2.5} />
                </div>
                <input 
                  type="email"
                  className="w-full pl-20 pr-8 py-6 bg-white border-2 border-slate-100 focus:border-[#714B67] rounded-[2.5rem] outline-none transition-all font-bold text-slate-800 placeholder:text-slate-300 shadow-sm"
                  placeholder="ejemplo@sanjose.pe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex gap-4 p-6 bg-red-50 border border-red-100 rounded-[2rem] animate-bounce">
                <Icons.AlertCircle className="text-red-400 shrink-0" size={24} />
                <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: ODOO_COLORS.teal }}
              className="w-full text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-teal-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-4 group"
            >
              {isLoading ? <Icons.Loader2 className="animate-spin" size={24} /> : (
                <>
                  Entrar al Portal
                  <Icons.ChevronRight size={20} className="group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-16 flex flex-col items-center">
             <div className="h-px w-20 bg-slate-100 mb-8" />
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] text-center leading-loose">
               SAN JOSÉ S.A.C.<br />
               <span className="text-indigo-200">TECNOLOGÍA EN MOVIMIENTO</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
