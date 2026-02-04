
import React, { useState, useMemo, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, AppConfig } from './types.ts';
import { OdooClient } from './services/odooService.ts';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import DashboardModule from './components/modules/DashboardModule.tsx';
import EmployeesModule from './components/modules/EmployeesModule.tsx';
import TransfersModule from './components/modules/TransfersModule.tsx';
import PosMonitorModule from './components/modules/PosMonitorModule.tsx';
import StockModule from './components/modules/StockModule.tsx';
import { ODOO_COLORS } from './constants.tsx';

// Actualizado según el endpoint de servidor-san-jose detectado
const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe", // Mantener la URL base si es la correcta para el XML-RPC
  db: "mitienda_base_ac",
  user: "soporte@facturaclic.pe",
  apiKey: "7259747d6d717234ee64087c9bd4206b99fa67a1",
  wsUrl: "wss://api.sanjose.pe/ws"
};

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('transfers');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginStatus, setLoginStatus] = useState<string>("");

  const odooClient = useMemo(() => new OdooClient(DEFAULT_CONFIG.url, DEFAULT_CONFIG.db), []);

  useEffect(() => {
    odooClient.onStatusChange = (status) => setLoginStatus(status);
  }, [odooClient]);

  const handleLogin = async (email: string) => {
    setIsAuthLoading(true);
    setError(null);
    setLoginStatus("Iniciando conexión segura...");
    try {
      await performLoginByEmail(email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAuthLoading(false);
      setLoginStatus("");
    }
  };

  const performLoginByEmail = async (email: string) => {
    // 1. Autenticación técnica
    await odooClient.authenticate(DEFAULT_CONFIG.user, DEFAULT_CONFIG.apiKey);
    
    // 2. Búsqueda de usuario
    setLoginStatus("Buscando su perfil en la base de datos...");
    const userData = await odooClient.searchRead('res.users', [['login', '=', email]], ['name', 'login', 'company_id', 'partner_id']);
    
    if (userData.length === 0) throw new Error('El correo ingresado no está registrado en el sistema San José.');
    const user = userData[0];

    const isAdmin = email.includes('admin') || email.includes('herrera') || email.includes('soporte');

    setSession({
      id: user.id,
      name: user.name,
      login_email: user.login,
      role: isAdmin ? 'admin' : 'employee',
      company_id: user.company_id?.[0] || 1,
      odoo_user_id: user.id,
      partner_id: user.partner_id?.[0] || false
    });

    if (!isAdmin) setActiveTab('transfers');
  };

  const handleLogout = () => {
    setSession(null);
  };

  if (!session) return (
    <div className="relative">
      <LoginScreen onLogin={handleLogin} isLoading={isAuthLoading} error={error} />
      {isAuthLoading && loginStatus && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-2xl border border-indigo-100 z-[200] flex items-center gap-4 animate-bounce">
          <Icons.Loader2 className="animate-spin text-indigo-500" size={20} />
          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{loginStatus}</span>
        </div>
      )}
    </div>
  );

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardModule session={session} odooClient={odooClient} />;
      case 'employees': return <EmployeesModule session={session} odooClient={odooClient} />;
      case 'transfers': return <TransfersModule session={session} odooClient={odooClient} />;
      case 'pos': return <PosMonitorModule session={session} odooClient={odooClient} />;
      case 'stock': return <StockModule session={session} odooClient={odooClient} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-[#f8faff] to-[#f3e8ff]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} session={session} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-50 rounded-full blur-[100px] -mr-48 -mt-48 opacity-50" />
        <Header session={session} />
        <main className="flex-1 overflow-y-auto px-8 pb-8 scrollbar-hide relative z-10">
          <div className="bg-white/90 backdrop-blur-md rounded-[4rem] p-12 min-h-[calc(100vh-10rem)] shadow-[0_20px_60px_-15px_rgba(113,75,103,0.08)] border border-white animate-fade-in">
            {renderModule()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
