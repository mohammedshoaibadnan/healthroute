import React, { useState } from 'react';
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

import { PatientPortalLayout } from './components/patient_portal/PatientPortalLayout';

const MainAppContent: React.FC = () => {
  const { activeTab, portalMode } = useApp();
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Check if user is navigating the Patient Portal
  const isPatientPortal = portalMode === 'patient' || activeTab.startsWith('patient-');
  if (isPatientPortal) {
    return <PatientPortalLayout />;
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
      case 'records':
        return <MedicalRecordsView />;
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
