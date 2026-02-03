
import React, { useState } from 'react';
import * as Icons from 'lucide-react';

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
    onLogin(username, "");
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 relative">
      {/* Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/5 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-blue-500/5 blur-[100px]" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200 mb-6">
            <Icons.Command size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">SJS Portal</h1>
          <p className="text-slate-500 mt-2 font-medium">Abastecimiento • Boticas San José</p>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Correo Corporativo</label>
              <div className="relative">
                <Icons.Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input 
                  type="email"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 rounded-2xl outline-none transition-all font-semibold text-slate-700"
                  placeholder="usuario@sanjose.pe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl animate-shake">
                <Icons.AlertCircle className="text-red-500 shrink-0" size={18} />
                <p className="text-xs font-semibold text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <>
                  <Icons.Loader2 className="animate-spin" size={18} />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <span>Entrar al Portal</span>
                  <Icons.ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-slate-400 text-xs font-medium flex items-center justify-center gap-2">
          <Icons.ShieldCheck size={14} /> Acceso seguro con credenciales Odoo
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
