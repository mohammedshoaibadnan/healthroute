import React from 'react';
import { useApp, NavigationTab } from '../../context/AppContext';
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  Stethoscope,
  ClipboardList,
  AlertCircle,
  Truck,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Database,
  Building2,
  ChevronRight,
  HeartPulse
} from 'lucide-react';
import { Avatar } from '../common/Avatar';

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  description: string;
}

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    cases, 
    patients,
    appointments,
    encounters,
    transfers,
    currentUser,
    switchRole,
    setPortalMode,
    setIsFirebaseArchitectureOpen,
  } = useApp();

  const unidentifiedCount = patients.filter((p) => p.isUnidentified).length;
  const todayDate = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayDate && a.status !== 'Cancelled');
  const waitingAppointments = appointments.filter((a) => a.status === 'Waiting');
  const activeEmergencyCases = cases.filter(
    (c) => !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
  );
  const activeTransfers = transfers.filter((t) => t.status === 'Ambulance En-Route' || t.status === 'Initiated');

  const clinicalItems: NavItem[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Doctor workspace & daily summary',
    },
    {
      id: 'patients',
      label: 'Patients',
      icon: Users,
      badge: unidentifiedCount > 0 ? `${unidentifiedCount} Temp` : `${patients.length}`,
      badgeColor: unidentifiedCount > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700',
      description: 'Directory, intake & temp IDs',
    },
    {
      id: 'appointments',
      label: 'Appointments',
      icon: CalendarClock,
      badge: waitingAppointments.length > 0 ? `${waitingAppointments.length} Waiting` : todayAppointments.length > 0 ? todayAppointments.length : undefined,
      badgeColor: waitingAppointments.length > 0 ? 'bg-teal-100 text-teal-800 border border-teal-200' : 'bg-slate-100 text-slate-700',
      description: 'Outpatient schedule & queue',
    },
    {
      id: 'clinical',
      label: 'Clinical Workspace',
      icon: Stethoscope,
      badge: encounters.length > 0 ? `${encounters.length} Rec` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800 border border-blue-200',
      description: 'SOAP notes & digital prescriptions',
    },
    {
      id: 'records',
      label: 'Medical Records',
      icon: ClipboardList,
      description: 'Lab investigations & diagnostics',
    },
  ];

  const hospitalItems: NavItem[] = [
    {
      id: 'emergency',
      label: 'Emergency Care',
      icon: AlertCircle,
      badge: activeEmergencyCases.length > 0 ? activeEmergencyCases.length : undefined,
      badgeColor: 'bg-rose-100 text-rose-800 font-bold border border-rose-200',
      description: 'Triage, MLC & poisoning protocols',
    },
    {
      id: 'transfers',
      label: 'Patient Transfers',
      icon: Truck,
      badge: activeTransfers.length > 0 ? `${activeTransfers.length} Active` : undefined,
      badgeColor: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      description: 'Inter-hospital transfers & summaries',
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FileText,
      description: 'Case sheets, slips & certificates',
    },
    {
      id: 'admin',
      label: 'Administration & Audit',
      icon: ShieldCheck,
      description: 'Staff directory & compliance logs',
    },
  ];

  return (
    <aside className="w-68 shrink-0 bg-white border-r border-slate-200/80 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-69px)] select-none shadow-[2px_0_12px_-4px_rgba(15,23,42,0.03)]">
      {/* Navigation Groups */}
      <div className="p-3.5 space-y-6 overflow-y-auto">
        {/* Section 1: Clinical Practice */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Clinical Practice
          </div>

          {clinicalItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#0b192e] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90'
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

        {/* Section 2: Hospital & Acute Services */}
        <div className="space-y-1">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hospital Services
          </div>

          {hospitalItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-[#0b192e] text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90'
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

      {/* Bottom Information, Role Bar & Architecture Pill */}
      <div className="p-3.5 border-t border-slate-200/80 bg-slate-50/60 space-y-3">
        {/* Unidentified Patients Alert */}
        {unidentifiedCount > 0 && (
          <div 
            onClick={() => setActiveTab('patients')}
            className="p-2.5 rounded-xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs cursor-pointer hover:bg-amber-100/80 transition-all shadow-xs"
          >
            <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{unidentifiedCount} Unidentified Intake Active</span>
            </div>
            <p className="text-[10px] text-amber-700 mt-1 leading-snug">
              Temporary emergency IDs active. Reconciliation required upon formal identification.
            </p>
          </div>
        )}

        {/* Patient Portal Switcher Banner */}
        <button
          onClick={() => {
            setPortalMode('patient');
            setActiveTab('patient-home');
          }}
          className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-teal-700 to-[#0b192e] text-white shadow-xs hover:from-teal-800 hover:to-slate-900 transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30">
              <HeartPulse className="w-4 h-4 text-teal-300" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-tight">Patient Portal</div>
              <div className="text-[10px] text-teal-200">Patient-facing experience</div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-teal-300/80 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Current Active Staff Profile & Role Switcher */}
        <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center gap-2.5 p-1.5 rounded-lg bg-slate-50/80 border border-slate-200/60">
            <Avatar
              src={currentUser.photoUrl}
              name={currentUser.name}
              size="xs"
              status={currentUser.onDuty ? 'online' : undefined}
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-teal-700 font-semibold truncate capitalize">{currentUser.role} • {currentUser.employeeCode}</p>
            </div>
          </div>

          <div className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Role Simulation</span>
            <span className="text-teal-700 font-semibold">{currentUser.role.toUpperCase()}</span>
          </div>
          <div className="grid grid-cols-6 gap-1 text-[10px] font-semibold text-center">
            {(['doctor', 'cmo', 'nurse', 'records', 'admin', 'patient'] as const).map((r) => (
              <button
                key={r}
                onClick={() => switchRole(r)}
                className={`py-1.5 rounded-lg capitalize transition-all border cursor-pointer ${
                  currentUser.role === r
                    ? 'bg-[#0b192e] text-white border-slate-900 font-bold shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title={`Switch to ${r.toUpperCase()} role`}
              >
                {r === 'records' ? 'Rec' : r === 'patient' ? 'Pt' : r}
              </button>
            ))}
          </div>
        </div>

        {/* Database Architecture Trigger */}
        <div 
          onClick={() => setIsFirebaseArchitectureOpen(true)}
          className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700 text-xs cursor-pointer hover:border-teal-500 transition-all shadow-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span className="font-semibold text-slate-800 text-[11px]">Firebase Schema</span>
          </div>
          <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
            BLUEPRINT READY
          </span>
        </div>
      </div>
    </aside>
  );
};
