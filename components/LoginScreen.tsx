
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
      alert("Por favor, ingrese su correo corporativo completo.");
      return;
    }
    // Enviamos un string vacío como contraseña ya que ahora el sistema usa la API Key maestra
    onLogin(username, "");
  };

  const renderError = () => {
    if (!error) return null;

    let title = "Acceso Denegado";
    let message = error;

    if (error.includes("Correo no encontrado")) {
      title = "Usuario No Registrado";
      message = "El correo ingresado no existe en nuestra base de datos de Odoo. Contacte con Almacén Central.";
    }

    return (
      <div className="bg-red-50 border border-red-200 p-5 rounded-2xl animate-shake">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-red-100 text-red-600 rounded-lg">
            <Icons.AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-red-900">{title}</p>
            <p className="text-xs text-red-700 mt-1 leading-relaxed">{message}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-100/30 rounded-full -mr-64 -mt-64 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-100/20 rounded-full -ml-64 -mb-64 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10 animate-fade-in">
          <div 
            className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center text-white font-black italic text-4xl shadow-[0_20px_50px_rgba(113,75,103,0.3)] mb-8"
            style={{ background: `linear-gradient(135deg, ${ODOO_COLORS.purple} 0%, #4a3144 100%)` }}
          >
            SJS
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight text-center">Portal de Abastecimiento</h1>
          <p className="text-gray-500 mt-2 font-bold uppercase tracking-widest text-[10px] text-center px-4">CADENA DE BOTICAS SAN JOSE S.A.C.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.08)] border border-gray-100 p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 via-teal-500 to-indigo-600" />
          
          <h2 className="text-lg font-black text-gray-900 mb-8 text-center uppercase tracking-tighter">Ingrese su Correo para comenzar</h2>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-1">Correo Corporativo Odoo</label>
              <div className="relative group">
                <Icons.User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-purple-500 transition-colors" size={20} />
                <input 
                  type="email"
                  className="w-full pl-14 pr-6 py-5 bg-gray-50 border-2 border-transparent focus:border-purple-500 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-gray-800 text-lg"
                  placeholder="nombre@sanjose.pe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {renderError()}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#017e84] text-white py-6 rounded-[1.5rem] font-black text-lg hover:bg-[#016a6f] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-4"
            >
              {isLoading ? (
                <>
                  <Icons.Loader2 className="animate-spin" size={24} strokeWidth={3} />
                  Buscando en Odoo...
                </>
              ) : (
                <>
                  <span>INGRESAR A MIS PEDIDOS</span>
                  <Icons.ArrowRight size={20} strokeWidth={3} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info */}
        <div className="mt-10 flex items-center justify-center gap-2 text-gray-400 animate-pulse">
          <Icons.ShieldCheck size={16} />
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">Acceso Seguro por ID de Empleado</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
