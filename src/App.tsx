import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileNav } from './components/layout/MobileNav';
import { DoctorDashboard } from './components/dashboard/DoctorDashboard';
import { PatientManagerView } from './components/patient/PatientManagerView';
import { AppointmentsView } from './components/appointments/AppointmentsView';
import { ClinicalWorkspace } from './components/clinical/ClinicalWorkspace';
import { MedicalRecordsView } from './components/records/MedicalRecordsView';
import { EmergencyCareView } from './components/emergency/EmergencyCareView';
import { TransferManager } from './components/transfer/TransferManager';
import { DocumentCentre } from './components/documents/DocumentCentre';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { PatientRegistrationModal } from './components/patient/PatientRegistrationModal';
import { NewCaseModal } from './components/cases/NewCaseModal';
import { CaseDetailModal } from './components/cases/CaseDetailModal';
import { NewAppointmentModal } from './components/appointments/NewAppointmentModal';
import { ConsultationNoteModal } from './components/clinical/ConsultationNoteModal';
import { FirebaseArchitectureModal } from './components/firebase/FirebaseArchitectureModal';
import { LoginPage } from './components/auth/LoginPage';
import { SupabaseAuthModal } from './components/auth/SupabaseAuthModal';

import { PatientPortalLayout } from './components/patient_portal/PatientPortalLayout';
import { DoctorMessagesView } from './components/messages/DoctorMessagesView';
import { PharmacyManagerView } from './components/pharmacy/PharmacyManagerView';

const MainAppContent: React.FC = () => {
  const { activeTab, portalMode, dbSyncError, clearDbSyncError } = useApp();
  const { isInitialLoading, setIsAuthModalOpen } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 max-w-md w-full text-center space-y-3">
          <div className="w-10 h-10 rounded-2xl bg-[#0b192e] text-teal-400 flex items-center justify-center mx-auto animate-pulse font-bold text-sm">
            HR
          </div>
          <h2 className="text-sm font-bold text-slate-900">Verifying HealthRoute Session Authority...</h2>
          <p className="text-xs text-slate-500">
            Checking Supabase PostgreSQL authentication state and resolving clinical role permissions.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
        <SupabaseAuthModal />
      </>
    );
  }

  const dbErrorBanner = dbSyncError ? (
    <div className="bg-rose-900 text-white px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2 border-b border-rose-800">
      <div className="flex items-center gap-2">
        <span className="font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-700 text-[10px]">
          PostgreSQL / RLS Alert
        </span>
        <span>{dbSyncError}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(true)}
          className="px-2.5 py-1 rounded bg-white text-rose-950 font-bold text-[11px] cursor-pointer"
        >
          Inspect Schema & Session
        </button>
        <button
          type="button"
          onClick={clearDbSyncError}
          className="px-2 py-1 rounded hover:bg-rose-800 text-rose-200 text-[11px] cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  ) : null;

  // Check if user is navigating the Patient Portal
  const isPatientPortal = portalMode === 'patient' || activeTab.startsWith('patient-');
  if (isPatientPortal) {
    return (
      <>
        {dbErrorBanner}
        <PatientPortalLayout />
        <SupabaseAuthModal />
      </>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'overview':
      case 'dashboard':
        return <DoctorDashboard />;
      case 'patients':
      case 'registration':
        return <PatientManagerView />;
      case 'appointments':
        return <AppointmentsView />;
      case 'clinical':
        return <ClinicalWorkspace />;
      case 'pharmacy':
        return <PharmacyManagerView />;
      case 'records':
        return <MedicalRecordsView />;
      case 'messages':
        return (
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            <DoctorMessagesView />
          </div>
        );
      case 'emergency':
      case 'cases':
      case 'mlc':
      case 'poisoning':
        return <EmergencyCareView />;
      case 'transfers':
        return <TransferManager />;
      case 'documents':
        return <DocumentCentre />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <DoctorDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Top Navigation */}
      <Navbar />
      {dbErrorBanner}

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
      <NewAppointmentModal />
      <ConsultationNoteModal />
      <FirebaseArchitectureModal />
      <SupabaseAuthModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </AuthProvider>
  );
}

