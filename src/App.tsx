import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { EmergencyDashboard } from './components/dashboard/EmergencyDashboard';
import { EmergencyCaseList } from './components/cases/EmergencyCaseList';
import { PatientManagerView } from './components/patient/PatientManagerView';
import { MLCManager } from './components/mlc/MLCManager';
import { PoisoningManager } from './components/poison/PoisoningManager';
import { TransferManager } from './components/transfer/TransferManager';
import { DocumentCentre } from './components/documents/DocumentCentre';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PatientRegistrationModal } from './components/patient/PatientRegistrationModal';
import { NewCaseModal } from './components/cases/NewCaseModal';
import { CaseDetailModal } from './components/cases/CaseDetailModal';
import { FirebaseArchitectureModal } from './components/firebase/FirebaseArchitectureModal';
import { LoginPage } from './components/auth/LoginPage';
import { LogOut } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeTab, currentUser } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EmergencyDashboard />;
      case 'cases':
        return <EmergencyCaseList />;
      case 'registration':
        return <PatientManagerView />;
      case 'mlc':
        return <MLCManager />;
      case 'poisoning':
        return <PoisoningManager />;
      case 'transfers':
        return <TransferManager />;
      case 'documents':
        return <DocumentCentre />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <EmergencyDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Modern Sidebar */}
        <Sidebar />

        {/* Dynamic View Area */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-6">
          {renderActiveView()}
        </main>
      </div>

      {/* Bottom Mobile Navigation */}
      <MobileNav />

      {/* Global Modals */}
      <PatientRegistrationModal />
      <NewCaseModal />
      <CaseDetailModal />
      <FirebaseArchitectureModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
