import React from 'react';
import { useApp } from '../../context/AppContext';
import { PatientNavbar } from './layout/PatientNavbar';
import { PatientSidebar } from './layout/PatientSidebar';
import { PatientMobileNav } from './layout/PatientMobileNav';
import { PatientHomeView } from './views/PatientHomeView';
import { PatientHealthView } from './views/PatientHealthView';
import { DoctorDiscoveryView } from './views/DoctorDiscoveryView';
import { PatientAppointmentsView } from './views/PatientAppointmentsView';
import { PatientPrescriptionsView } from './views/PatientPrescriptionsView';
import { PatientReportsView } from './views/PatientReportsView';
import { PatientMessagesView } from './views/PatientMessagesView';
import { PatientNotificationsView } from './views/PatientNotificationsView';
import { PatientEmergencyView } from './views/PatientEmergencyView';
import { PatientPrivacyView } from './views/PatientPrivacyView';
import { PatientProfileView } from './views/PatientProfileView';
import { BookAppointmentModal } from './modals/BookAppointmentModal';
import { UploadDocumentModal } from './modals/UploadDocumentModal';
import { DocumentPreviewModal } from './modals/DocumentPreviewModal';

export const PatientPortalLayout: React.FC = () => {
  const { activeTab } = useApp();

  const renderActivePatientView = () => {
    switch (activeTab) {
      case 'patient-home':
        return <PatientHomeView />;
      case 'patient-health':
        return <PatientHealthView />;
      case 'patient-doctors':
        return <DoctorDiscoveryView />;
      case 'patient-appointments':
        return <PatientAppointmentsView />;
      case 'patient-prescriptions':
        return <PatientPrescriptionsView />;
      case 'patient-reports':
        return <PatientReportsView />;
      case 'patient-messages':
        return <PatientMessagesView />;
      case 'patient-notifications':
        return <PatientNotificationsView />;
      case 'patient-emergency':
        return <PatientEmergencyView />;
      case 'patient-privacy':
        return <PatientPrivacyView />;
      case 'patient-profile':
        return <PatientProfileView />;
      default:
        return <PatientHomeView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Patient Top Navigation */}
      <PatientNavbar />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Patient Sidebar */}
        <PatientSidebar />

        {/* Dynamic Patient View Area */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-6">
          {renderActivePatientView()}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <PatientMobileNav />

      {/* Patient Modals */}
      <BookAppointmentModal />
      <UploadDocumentModal />
      <DocumentPreviewModal />
    </div>
  );
};
