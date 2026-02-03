
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
  const [activeTab, setActiveTab] = useState<string>('transfers'); // Empezamos en transferencias que es el foco
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const odooClient = useMemo(() => new OdooClient(DEFAULT_CONFIG.url, DEFAULT_CONFIG.db, DEFAULT_CONFIG.useProxy), []);

  const handleLogin = async (email: string) => {
    setIsAuthLoading(true);
    setError(null);
    
    try {
      await performLoginByEmail(email);
    } catch (err: any) {
      if (err.message.includes('ERROR_CORS')) {
        console.warn("⚠️ Error de CORS detectado. Intentando mediante Proxy seguro...");
        odooClient.setProxy(true);
        try {
          await performLoginByEmail(email);
        } catch (proxyErr: any) {
          setError(proxyErr.message);
          odooClient.setProxy(false);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const performLoginByEmail = async (email: string) => {
    // 1. Autenticamos primero con la cuenta maestra para tener acceso a la API
    await odooClient.authenticate(DEFAULT_CONFIG.user, DEFAULT_CONFIG.apiKey);
    
    // 2. Buscamos el usuario en Odoo que tenga ese correo electrónico
    const userData = await odooClient.searchRead('res.users', 
      [['login', '=', email]], 
      ['name', 'login', 'company_id', 'partner_id']
    );
    
    if (userData.length === 0) {
      throw new Error('Correo no encontrado en la base de datos de Odoo.');
    }

    const user = userData[0];

    // 3. Buscamos datos adicionales del empleado para un perfil más completo
    const employeeData = await odooClient.searchRead('hr.employee', 
      [['work_email', 'ilike', email]], 
      ['name', 'job_id', 'department_id']
    );
    
    const employee = employeeData[0];

    // 4. Establecemos la sesión basada en el ID real de Odoo pero autenticada vía master key
    setSession({
      id: user.id,
      name: employee ? employee.name : user.name,
      login_email: user.login,
      role: email.includes('admin') || email.includes('soporte') ? 'admin' : 'employee',
      company_id: user.company_id?.[0] || 1,
      company_name: 'CADENA DE BOTICAS SAN JOSE S.A.C.',
      odoo_user_id: user.id,
      partner_id: user.partner_id?.[0] || false
    });
  };

  const handleLogout = () => {
    setSession(null);
    setActiveTab('transfers');
    odooClient.setProxy(false);
  };

  if (!session) {
    return <LoginScreen onLogin={handleLogin} isLoading={isAuthLoading} error={error} />;
  }

  const renderModule = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardModule session={session} odooClient={odooClient} />;
      case 'employees': return <EmployeesModule session={session} odooClient={odooClient} />;
      case 'transfers': return <TransfersModule session={session} odooClient={odooClient} />;
      case 'pos': return <PosMonitorModule session={session} odooClient={odooClient} />;
      case 'stock': return <StockModule session={session} odooClient={odooClient} />;
      default: return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <Icons.Construction size={64} className="mb-4" strokeWidth={1} />
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-widest">Módulo en Desarrollo</h2>
        </div>
      );
    }
  };

  return (
    <div className="flex h-screen bg-[#fcfcfc] overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} session={session} onLogout={handleLogout} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-y-auto p-6 md:p-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto animate-fade-in">{renderModule()}</div>
        </main>
      </div>
    </div>
  );
};

export default App;
