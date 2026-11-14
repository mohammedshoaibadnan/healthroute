import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  LayoutDashboard, 
  Calendar, 
  HeartPulse, 
  MessageSquare, 
  Menu, 
  X, 
  Stethoscope, 
  Pill, 
  FileText, 
  Bell, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  ArrowLeftRight 
} from 'lucide-react';
import { PatientPortalTab } from '../../../types';
import { filterPatientAppointments } from '../../../utils/rules';

export const PatientMobileNav: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    activePatient, 
    appointments, 
    patientNotifications, 
    setPortalMode, 
    switchRole 
  } = useApp();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const upcomingApts = filterPatientAppointments(appointments, activePatient.id, 'upcoming').length;
  const unreadNotifs = patientNotifications.filter(
    (n) =>
      n.patientId === activePatient.id &&
      !n.isRead &&
      n.targetAudience !== 'doctor' &&
      n.targetAudience !== 'pharmacy'
  ).length;

  const quickTabs: Array<{ id: PatientPortalTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'patient-home', label: 'Home', icon: LayoutDashboard },
    { id: 'patient-appointments', label: 'Appts', icon: Calendar, badge: upcomingApts },
    { id: 'patient-health', label: 'My Health', icon: HeartPulse },
    { id: 'patient-messages', label: 'Messages', icon: MessageSquare },
  ];

  const secondaryDrawerTabs: Array<{ id: PatientPortalTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }> = [
    { id: 'patient-doctors', label: 'Find Doctors', icon: Stethoscope },
    { id: 'patient-prescriptions', label: 'Prescriptions', icon: Pill },
    { id: 'patient-reports', label: 'Lab & Diagnostic Reports', icon: FileText },
    { id: 'patient-notifications', label: 'Notification Centre', icon: Bell, badge: unreadNotifs },
    { id: 'patient-emergency', label: 'Emergency Information & Card', icon: AlertTriangle },
    { id: 'patient-privacy', label: 'Privacy & Consent Preferences', icon: ShieldCheck },
    { id: 'patient-profile', label: 'My Personal Profile', icon: User },
  ];

  return (
    <>
      {/* Mobile Bottom Fixed Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1 flex items-center justify-around shadow-lg">
        {quickTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-1.5 relative rounded-lg transition-colors cursor-pointer ${
                isActive ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {tab.badge && tab.badge > 0 ? (
                  <span className="absolute -top-1 -right-2 bg-teal-600 text-white text-[9px] font-bold px-1 rounded-full">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* More Drawer Trigger */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className={`flex flex-col items-center justify-center p-1.5 relative rounded-lg transition-colors cursor-pointer ${
            isDrawerOpen ? 'text-teal-700 font-bold' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-white text-[9px] font-bold px-1 rounded-full">
                {unreadNotifs}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">More</span>
        </button>
      </nav>

      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div 
            className="flex-1"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="bg-white rounded-t-3xl p-5 shadow-2xl border-t border-slate-200 max-h-[80vh] overflow-y-auto space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">HealthRoute Navigation</p>
                <h3 className="text-sm font-bold text-slate-900">All Patient Portal Sections</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1">
              {secondaryDrawerTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge && tab.badge > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                        {tab.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Switch to Doctor Dashboard */}
            <div className="pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  setPortalMode('hospital');
                  switchRole('doctor');
                  setIsDrawerOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-slate-900 text-white text-xs font-semibold"
              >
                <ArrowLeftRight className="w-4 h-4 text-teal-400" />
                <span>Switch to Doctor Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
