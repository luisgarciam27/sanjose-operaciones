
import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { UserSession, AppConfig } from './types';
import { OdooClient } from './services/odooService';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import DashboardModule from './components/modules/DashboardModule';
import EmployeesModule from './components/modules/EmployeesModule';
import TransfersModule from './components/modules/TransfersModule';
import PosMonitorModule from './components/modules/PosMonitorModule';
import StockModule from './components/modules/StockModule';
import { ODOO_COLORS } from './constants';

const DEFAULT_CONFIG: AppConfig = {
  url: "https://mitienda.facturaclic.pe",
  db: "mitienda_base_ac",
  user: "soporte@facturaclic.pe",
  apiKey: "7259747d6d717234ee64087c9bd4206b99fa67a1",
  wsUrl: "wss://api.sanjose.pe/ws",
  useProxy: false
};

const App: React.FC = () => {
  const [session, setSession] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>('transfers');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const odooClient = useMemo(() => new OdooClient(DEFAULT_CONFIG.url, DEFAULT_CONFIG.db, DEFAULT_CONFIG.useProxy), []);

  const handleLogin = async (email: string) => {
    setIsAuthLoading(true);
    setError(null);
    try {
      await performLoginByEmail(email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const performLoginByEmail = async (email: string) => {
    await odooClient.authenticate(DEFAULT_CONFIG.user, DEFAULT_CONFIG.apiKey);
    const userData = await odooClient.searchRead('res.users', [['login', '=', email]], ['name', 'login', 'company_id', 'partner_id']);
    if (userData.length === 0) throw new Error('Usuario no autorizado.');
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
    odooClient.setProxy(false);
  };

  if (!session) return <LoginScreen onLogin={handleLogin} isLoading={isAuthLoading} error={error} />;

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
        {/* Decoración de fondo alegre */}
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
