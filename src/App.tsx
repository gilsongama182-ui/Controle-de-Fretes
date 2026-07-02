import React, { useState, useEffect } from 'react';
import { ActivePage, Delivery, User } from './types';
import { INITIAL_DELIVERIES } from './data';

// Import Screen Components
import LoginScreen from './components/LoginScreen';
import CadastroScreen from './components/CadastroScreen';
import DashboardOperadorScreen from './components/DashboardOperadorScreen';
import DashboardClienteScreen from './components/DashboardClienteScreen';
import GestaoEntregasScreen from './components/GestaoEntregasScreen';
import EdicaoEntregaScreen from './components/EdicaoEntregaScreen';

export default function App() {
  const [activePage, setActivePage] = useState<ActivePage>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  // Load initial deliveries once
  useEffect(() => {
    setDeliveries(INITIAL_DELIVERIES);
  }, []);

  const handleLogout = () => {
    setCurrentUser(null);
    setActivePage('login');
  };

  const handleAddDelivery = (newDelivery: Delivery) => {
    setDeliveries(prev => [newDelivery, ...prev]);
  };

  const handleDeleteDelivery = (id: string) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  const handleSelectDeliveryForEdit = (delivery: Delivery) => {
    setSelectedDelivery(delivery);
    setActivePage('edicao-entrega');
  };

  const handleUpdateDelivery = (updated: Delivery) => {
    setDeliveries(prev => prev.map(d => d.id === updated.id ? updated : d));
    setSelectedDelivery(updated);
  };

  // Safe fallback user if accessed directly without login for ease of demo
  const getActiveUser = (): User => {
    if (currentUser) return currentUser;
    return {
      name: activePage === 'dashboard-operador' || activePage === 'gestao-entregas' || activePage === 'edicao-entrega' 
        ? 'Operador Hemmersbach' 
        : 'Cliente Hemmersbach',
      email: 'logistica@hemmersbach.com',
      profileType: activePage === 'dashboard-operador' || activePage === 'gestao-entregas' || activePage === 'edicao-entrega'
        ? 'operador'
        : 'cliente',
      document: '00.000.000/0001-00'
    };
  };

  // Navigation Guard / Renderer
  const renderPage = () => {
    switch (activePage) {
      case 'login':
        return (
          <LoginScreen 
            onNavigate={setActivePage} 
            onLogin={setCurrentUser} 
          />
        );
      case 'cadastro':
        return (
          <CadastroScreen 
            onNavigate={setActivePage} 
            onLogin={setCurrentUser} 
          />
        );
      case 'dashboard-operador':
        return (
          <DashboardOperadorScreen
            onNavigate={setActivePage}
            onLogout={handleLogout}
            user={getActiveUser()}
            deliveries={deliveries}
            onAddDelivery={handleAddDelivery}
            onSelectDeliveryForEdit={handleSelectDeliveryForEdit}
          />
        );
      case 'dashboard-cliente':
        return (
          <DashboardClienteScreen
            onNavigate={setActivePage}
            onLogout={handleLogout}
            user={getActiveUser()}
            deliveries={deliveries}
          />
        );
      case 'gestao-entregas':
        return (
          <GestaoEntregasScreen
            onNavigate={setActivePage}
            onLogout={handleLogout}
            user={getActiveUser()}
            deliveries={deliveries}
            onDeleteDelivery={handleDeleteDelivery}
            onSelectDeliveryForEdit={handleSelectDeliveryForEdit}
            onAddDelivery={handleAddDelivery}
          />
        );
      case 'edicao-entrega':
        return (
          <EdicaoEntregaScreen
            onNavigate={setActivePage}
            onLogout={handleLogout}
            user={getActiveUser()}
            delivery={selectedDelivery}
            onUpdateDelivery={handleUpdateDelivery}
          />
        );
      default:
        return (
          <LoginScreen 
            onNavigate={setActivePage} 
            onLogin={setCurrentUser} 
          />
        );
    }
  };

  return (
    <div className="min-h-screen font-sans selection:bg-primary/20 selection:text-primary">
      {renderPage()}
    </div>
  );
}
