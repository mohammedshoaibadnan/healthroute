import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { HOSPITAL_INFO } from '../../../data/mockData';
import { 
  Activity, 
  Building2, 
  Calendar, 
  Bell, 
  ArrowLeftRight, 
  ChevronDown, 
  UserCheck, 
  ShieldCheck, 
  PhoneCall,
  Search,
  Stethoscope,
  HeartPulse
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';

export const PatientNavbar: React.FC = () => {
  const { 
    activePatient, 
    patients, 
    setActivePatientId, 
    setPortalMode, 
    switchRole,
    patientNotifications, 
    setActiveTab, 
    setIsPatientBookingModalOpen 
  } = useApp();

  const [isPatientMenuOpen, setIsPatientMenuOpen] = useState(false);

  const unreadNotifs = patientNotifications.filter(
    (n) =>
      n.patientId === activePatient.id &&
      !n.isRead &&
      n.targetAudience !== 'doctor' &&
      n.targetAudience !== 'pharmacy'
  ).length;

  // Filter sample named patients for simulation
  const samplePatients = patients.filter((p) => !p.isUnidentified);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)]">
      {/* Institutional Top Trust Bar */}
      <div className="bg-[#0b192e] text-slate-200 text-xs px-4 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-teal-300 font-medium">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold tracking-tight">{HOSPITAL_INFO.name}</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-slate-300 text-[11px] font-normal">{HOSPITAL_INFO.accreditation}</span>
          <span className="text-slate-600 hidden md:inline">•</span>
          <span className="hidden md:inline text-teal-400 text-[11px] font-semibold">Patient & Family Care Portal</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px]">
            <PhoneCall className="w-3 h-3 text-teal-400" />
            <span className="hidden sm:inline">24x7 Emergency:</span>
            <strong className="text-rose-300 font-mono">108 / +91 80 4968 1011</strong>
          </div>

          {/* Quick Switch to Doctor / Hospital Staff Portal Button */}
          <button
            onClick={() => {
              setPortalMode('hospital');
              switchRole('doctor');
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 border border-teal-400/40 text-[11px] font-bold transition-all cursor-pointer"
            title="Switch back to Doctor & Hospital Management Dashboard"
          >
            <Stethoscope className="w-3 h-3 text-teal-300" />
            <span>Doctor Dashboard</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-6">
        {/* Brand & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('patient-home')} 
            className="flex items-center gap-2.5 text-left focus:outline-hidden group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 flex items-center justify-center text-white shadow-sm border border-teal-500 group-hover:scale-105 transition-all">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-teal-900 transition-colors">
                  HealthRoute
                </span>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                  Patient Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Personal Healthcare & Records Workspace</p>
            </div>
          </button>
        </div>

        {/* Center Quick Search (Doctor / Record / Appointment Search) */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              readOnly
              onClick={() => setActiveTab('patient-doctors')}
              placeholder="Find doctors, specialist clinics, or health records..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50 hover:bg-white hover:border-slate-300 focus:outline-hidden transition-all cursor-pointer"
            />
          </div>
        </div>

        {/* Right Actions & Active Patient Profile Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* Book Appointment CTA */}
          <button
            onClick={() => setIsPatientBookingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Book Doctor</span>
            <span className="sm:hidden">Book</span>
          </button>

          {/* Notifications Bell */}
          <button
            onClick={() => setActiveTab('patient-notifications')}
            className="relative p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-teal-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadNotifs}
              </span>
            )}
          </button>

          {/* Patient Profile Menu & Persona Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsPatientMenuOpen(!isPatientMenuOpen)}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left cursor-pointer shadow-xs group"
            >
              <Avatar
                src={activePatient.photoUrl}
                name={activePatient.name}
                size="sm"
                className="ring-2 ring-teal-500/20"
              />
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-teal-900 transition-colors truncate max-w-[130px]">{activePatient.name}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-teal-50 text-teal-800 border border-teal-200">
                    Patient
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">{activePatient.permanentMrn || 'AC-BLR-2026-7819'}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {isPatientMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsPatientMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2.5 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-xl border border-slate-200 mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={activePatient.photoUrl}
                        name={activePatient.name}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Verified Patient Identity</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{activePatient.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">ABHA: {activePatient.abhaId || '91-4820-1928-3011'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Switch Demo Patient Section */}
                  <div className="px-2 py-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                      Simulate Other Patients
                    </p>
                    <div className="space-y-1">
                      {samplePatients.map((pat) => (
                        <button
                          key={pat.id}
                          onClick={() => {
                            setActivePatientId(pat.id);
                            setIsPatientMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            activePatient.id === pat.id
                              ? 'bg-teal-50 text-teal-900 font-semibold border border-teal-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar src={pat.photoUrl} name={pat.name} size="xs" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{pat.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{pat.age}y • {pat.gender} • {pat.permanentMrn || 'Known Patient'}</p>
                            </div>
                          </div>
                          {activePatient.id === pat.id && (
                            <UserCheck className="w-4 h-4 text-teal-600 shrink-0 ml-1" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Switch back to Hospital Portal */}
                  <div className="mt-2 pt-2 border-t border-slate-100 px-1">
                    <button
                      onClick={() => {
                        setPortalMode('hospital');
                        switchRole('doctor');
                        setIsPatientMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-teal-400" />
                      <span>Switch to Doctor / Hospital Portal</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
