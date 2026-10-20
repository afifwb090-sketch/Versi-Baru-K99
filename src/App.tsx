/**
 * K99 POS System - Kopi 99 Warungboto
 * Main Application Shell, Landing Page & View Routing
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { LoginModal } from './components/auth/LoginModal';
import { PosView } from './components/pos/PosView';
import { DashboardView } from './components/dashboard/DashboardView';
import { OnlineOrdersView } from './components/online/OnlineOrdersView';
import { ProductsView } from './components/products/ProductsView';
import { RecipesView } from './components/recipes/RecipesView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { ShiftsView } from './components/shifts/ShiftsView';
import { PromotionsView } from './components/promotions/PromotionsView';
import { CustomersView } from './components/customers/CustomersView';
import { SettingsView } from './components/settings/SettingsView';
import { PublicWebsite } from './components/public/PublicWebsite';

function AppContent() {
  const { isAuthenticated } = useAuth();

  // DEFAULT ENTRY POINT IS PUBLIC LANDING PAGE (Website Kedai Kopi 99 Warungboto)
  const [isPublicMode, setIsPublicMode] = useState<boolean>(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<string>('pos');
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState<boolean>(false);

  const handleOpenAdminPortal = () => {
    if (isAuthenticated) {
      setIsPublicMode(false);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  const handleLoginSuccess = () => {
    setIsLoginModalOpen(false);
    setIsPublicMode(false);
  };

  return (
    <>
      {isPublicMode ? (
        <PublicWebsite
          onReturnToAdmin={handleOpenAdminPortal}
          onOpenLogin={handleOpenAdminPortal}
        />
      ) : !isAuthenticated ? (
        // Guard if in admin mode without active authentication
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
          <LoginModal
            isOpen={true}
            onClose={() => setIsPublicMode(true)}
            onLoginSuccess={handleLoginSuccess}
          />
        </div>
      ) : (
        <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
          {/* Top Bar */}
          <Navbar
            onToggleSidebar={() => setSidebarOpenMobile(!sidebarOpenMobile)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isPublicMode={isPublicMode}
            setIsPublicMode={setIsPublicMode}
          />

          <div className="flex flex-1">
            {/* Sidebar Navigation */}
            <Sidebar
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              isOpenMobile={sidebarOpenMobile}
              onCloseMobile={() => setSidebarOpenMobile(false)}
            />

            {/* Main Content Area */}
            <main className="flex-1 lg:ml-64 min-w-0 pb-12 overflow-y-auto">
              {activeTab === 'pos' && <PosView />}
              {activeTab === 'dashboard' && <DashboardView onNavigate={setActiveTab} />}
              {activeTab === 'online-orders' && <OnlineOrdersView />}
              {activeTab === 'products' && <ProductsView />}
              {activeTab === 'recipes' && <RecipesView />}
              {activeTab === 'inventory' && <InventoryView />}
              {activeTab === 'purchases' && <PurchasesView />}
              {activeTab === 'expenses' && <ExpensesView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'shifts' && <ShiftsView />}
              {activeTab === 'promotions' && <PromotionsView />}
              {activeTab === 'customers' && <CustomersView />}
              {activeTab === 'settings' && <SettingsView />}
            </main>
          </div>
        </div>
      )}

      {/* LOGIN MODAL (Can be opened from Landing Page or Staff Button) */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
