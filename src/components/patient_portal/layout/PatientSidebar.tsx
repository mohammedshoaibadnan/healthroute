import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  LayoutDashboard, 
  HeartPulse, 
  Stethoscope, 
  CalendarClock, 
  Pill, 
  FileText, 
  MessageSquare, 
  Bell, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  PhoneCall, 
  ArrowLeftRight,
  Sparkles
} from 'lucide-react';
import { PatientPortalTab } from '../../../types';
import { filterPatientAppointments } from '../../../utils/rules';

interface NavItem {
  id: PatientPortalTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  description: string;
}

export const PatientSidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    activePatient, 
    appointments, 
    patientDocuments, 
    patientMessages, 
    patientNotifications,
    setPortalMode,
    switchRole 
  } = useApp();

  const upcomingApts = filterPatientAppointments(appointments, activePatient.id, 'upcoming').length;
  const unreadNotifs = patientNotifications.filter(
    (n) =>
      n.patientId === activePatient.id &&
      !n.isRead &&
      n.targetAudience !== 'doctor' &&
      n.targetAudience !== 'pharmacy'
  ).length;
  const unreadMsgs = patientMessages.filter(
    (m) => m.patientId === activePatient.id && !m.isRead && (m.senderRole === 'Doctor' || m.sender === 'doctor')
  ).length;
  const reportsCount = patientDocuments.filter((d) => d.patientId === activePatient.id).length;

  const primaryItems: NavItem[] = [
    {
      id: 'patient-home',
      label: 'Home',
      icon: LayoutDashboard,
      description: 'Personalized care overview',
    },
    {
      id: 'patient-health',
      label: 'My Health',
      icon: HeartPulse,
      description: 'Timeline, conditions & vitals',
    },
    {
      id: 'patient-doctors',
      label: 'Doctors',
      icon: Stethoscope,
      description: 'Find specialists & clinics',
    },
    {
      id: 'patient-appointments',
      label: 'Appointments',
      icon: CalendarClock,
      badge: upcomingApts > 0 ? upcomingApts : undefined,
      badgeColor: 'bg-teal-100 text-teal-800 border border-teal-200',
      description: 'Upcoming visits & booking',
    },
    {
      id: 'patient-prescriptions',
      label: 'Prescriptions',
      icon: Pill,
      description: 'Dosages & active regimen',
    },
    {
      id: 'patient-reports',
      label: 'Reports',
      icon: FileText,
      badge: reportsCount > 0 ? reportsCount : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
      description: 'Lab & radiology diagnostics',
    },
    {
      id: 'patient-messages',
      label: 'Messages',
      icon: MessageSquare,
      badge: unreadMsgs > 0 ? unreadMsgs : undefined,
      badgeColor: 'bg-purple-100 text-purple-800 border border-purple-200',
      description: 'Ask doctor & care team',
    },
    {
      id: 'patient-notifications',
      label: 'Notifications',
      icon: Bell,
      badge: unreadNotifs > 0 ? unreadNotifs : undefined,
      badgeColor: 'bg-amber-100 text-amber-800 border border-amber-200',
      description: 'Alerts & hospital reminders',
    },
  ];

  const secondaryItems: NavItem[] = [
    {
      id: 'patient-emergency',
      label: 'Emergency Info',
      icon: AlertTriangle,
      badge: '24x7',
      badgeColor: 'bg-rose-100 text-rose-800 font-bold border border-rose-200',
      description: 'Allergies & rescue card',
    },
    {
      id: 'patient-privacy',
      label: 'Privacy & Consent',
      icon: ShieldCheck,
      description: 'EHR permissions & audit logs',
    },
    {
      id: 'patient-profile',
      label: 'My Profile',
      icon: User,
      description: 'Personal details & contacts',
    },
  ];

  return (
    <aside className="w-68 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-69px)] select-none shadow-[2px_0_12px_-4px_rgba(15,23,42,0.03)]">
      {/* Navigation Groups */}
      <div className="p-3.5 space-y-6 overflow-y-auto">
        {/* Section 1: Clinical Healthcare Management */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Care Management
          </div>

          {primaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-teal-700 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="leading-snug">{item.label}</div>
                    <div className={`text-[10px] font-normal leading-none mt-0.5 ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Section 2: Security, Emergency & Identity */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Emergency & Account
          </div>

          {secondaryItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-teal-500/20 text-teal-400' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="leading-snug">{item.label}</div>
                    <div className={`text-[10px] font-normal leading-none mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      {item.description}
                    </div>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      item.badgeColor || 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Emergency Card & Switch to Hospital Portal Button */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/60 space-y-3">
        {/* Emergency Card Trigger */}
        <div
          onClick={() => setActiveTab('patient-emergency')}
          className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs cursor-pointer hover:bg-rose-100/80 transition-all shadow-xs space-y-1"
        >
          <div className="flex items-center gap-1.5 font-bold text-rose-800 text-[11px]">
            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
            <span>24x7 Hospital Emergency</span>
          </div>
          <p className="text-[10px] text-rose-700 leading-snug">
            Toll Free 108 / +91 80 4968 1011. Tap to view your emergency card.
          </p>
        </div>

        {/* Portal Switcher Button */}
        <button
          onClick={() => {
            setPortalMode('hospital');
            switchRole('doctor');
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400" />
          <span>Switch to Doctor Dashboard</span>
        </button>
      </div>
    </aside>
  );
};
