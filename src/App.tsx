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
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-2">
          {/* Cabeçalho principal */}
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <Wrench className="h-6 w-6 text-blue-500" />
              <span className="ml-2 text-lg font-bold text-gray-900">Sistema OS</span>
            </div>

            {/* Email em telas pequenas */}
            <div className="flex md:hidden items-center text-sm text-gray-500 mx-2 truncate">
              {user?.email}
            </div>
            
            {/* Botões de ação */}
            <div className="flex items-center space-x-2">
              {/* Email em telas maiores */}
              <div className="hidden md:block text-sm text-gray-500 mr-4">
                {user?.email}
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </button>
              
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Menu"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Menu de navegação para desktop */}
          <div className="hidden md:flex justify-center border-t border-gray-200">
            <div className="flex space-x-8">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={`${
                    currentTab === item.id
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } flex items-center px-3 py-2 text-sm font-medium border-b-2 -mb-px whitespace-nowrap`}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu móvel */}
        <div
          className={`${
            isMobileMenuOpen ? 'block' : 'hidden'
          } md:hidden border-t border-gray-200 bg-white`}
        >
          <div className="pt-1 pb-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleTabChange(item.id)}
                className={`${
                  currentTab === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                } flex items-center w-full px-4 py-3 text-base font-medium`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto pt-16 pb-6 px-2">
        <div className="py-4">
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