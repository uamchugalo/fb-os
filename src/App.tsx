import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { ServiceOrderList } from './components/ServiceOrderList';
import { CompanyInfo } from './components/CompanyInfo';
import { Auth } from './components/Auth';
import { supabase } from './lib/supabase';
import type { User } from './lib/supabase';
import { Wrench, ClipboardList, Calculator, Settings, List, Building2, LogOut, Menu, X } from 'lucide-react';
import { ServiceOrderForm } from './components/ServiceOrderForm';
import { MaterialsManagement } from './components/MaterialsManagement';
import { AccountingDashboard } from './components/AccountingDashboard';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('orders');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);
    setIsMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth onAuthSuccess={() => {}} />
        <Toaster position="top-right" />
      </>
    );
  }

  const menuItems = [
    { id: 'orders', label: 'Nova OS', icon: ClipboardList },
    { id: 'order-list', label: 'Lista de OS', icon: List },
    { id: 'materials', label: 'Materiais', icon: Settings },
    { id: 'accounting', label: 'Contabilidade', icon: Calculator },
    { id: 'company', label: 'Empresa', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Wrench className="h-8 w-8 text-blue-500" />
                <span className="ml-2 text-xl font-bold text-gray-900">Sistema OS</span>
              </div>
              {/* Menu para desktop */}
              <div className="hidden md:ml-6 md:flex md:space-x-8">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleTabChange(item.id)}
                    className={`${
                      currentTab === item.id
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <item.icon className="h-5 w-5 mr-1" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Botão de logout e menu móvel */}
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-gray-500 hover:text-gray-700 focus:outline-none transition"
              >
                <LogOut className="h-5 w-5" />
                <span className="ml-2 hidden sm:inline">Sair</span>
              </button>
              
              {/* Botão do menu móvel */}
              <div className="flex items-center md:hidden ml-4">
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                >
                  {isMobileMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Menu móvel */}
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="pt-2 pb-3 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`${
                  currentTab === item.id
                    ? 'bg-blue-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700'
                } block pl-3 pr-4 py-2 border-l-4 text-base font-medium w-full text-left flex items-center`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-4 sm:px-0">
          {currentTab === 'orders' && <ServiceOrderForm />}
          {currentTab === 'order-list' && <ServiceOrderList />}
          {currentTab === 'materials' && <MaterialsManagement />}
          {currentTab === 'accounting' && <AccountingDashboard />}
          {currentTab === 'company' && <CompanyInfo />}
        </div>
      </main>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;