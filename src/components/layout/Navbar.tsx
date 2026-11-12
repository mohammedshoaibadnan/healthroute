import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { HOSPITAL_INFO } from '../../data/mockData';
import { 
  Activity, 
  Calendar, 
  UserPlus, 
  Database, 
  UserCheck, 
  ChevronDown,
  Clock,
  PhoneCall,
  AlertCircle,
  Building2,
  Stethoscope,
  Search,
  Bell,
  CheckCircle2,
  Sparkles,
  HeartPulse
} from 'lucide-react';
import { UserRole } from '../../types';
import { Avatar } from '../common/Avatar';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    allStaff, 
    switchUser, 
    cases,
    incomingAmbulances,
    setActiveTab,
    setPortalMode,
    setIsFirebaseArchitectureOpen,
    setIsNewRegistrationOpen,
    setIsNewAppointmentOpen,
    setSelectedCaseId
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Urgent cases check (ESI 1 / RED triage currently active)
  const criticalCases = cases.filter(
    (c) => c.triageLevel === 'RED' && !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
  );
  const activeAmbulances = incomingAmbulances.filter((a) => a.preAlertStatus !== 'Arrived Bay');

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return 'bg-teal-50 text-teal-800 border-teal-200';
      case 'cmo':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'nurse':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'records':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'admin':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.04)]">
      {/* Top Institutional Trust Bar */}
      <div className="bg-[#0b192e] text-slate-200 text-xs px-4 lg:px-8 py-1.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-teal-300 font-medium">
            <Building2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-semibold tracking-tight">{HOSPITAL_INFO.name}</span>
          </div>
          <span className="text-slate-500 hidden sm:inline" aria-hidden="true">•</span>
          <span className="hidden sm:inline text-slate-300 text-[11px] font-normal">{HOSPITAL_INFO.accreditation}</span>
          <span className="text-slate-500 hidden md:inline" aria-hidden="true">•</span>
          <span className="hidden md:inline text-slate-400 text-[11px]">OPD Station: Room 204 Active</span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          {/* Restrained urgent attention alert if acute patient in ER */}
          {criticalCases.length > 0 && (
            <button
              onClick={() => {
                setSelectedCaseId(criticalCases[0].id);
                setActiveTab('emergency');
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-400/30 text-[11px] font-medium hover:bg-amber-500/25 transition-all"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{criticalCases.length} Acute Case{criticalCases.length > 1 ? 's' : ''} in ER Bay</span>
            </button>
          )}

          {activeAmbulances.length > 0 && (
            <button
              onClick={() => setActiveTab('emergency')}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 text-teal-300 border border-slate-700 text-[11px] font-medium hover:bg-slate-700 transition-colors"
            >
              <span>{activeAmbulances.length} Incoming Dispatch</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px] tabular-nums">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>

          <div className="hidden xl:flex items-center gap-1 text-slate-400 text-[11px]">
            <PhoneCall className="w-3 h-3 text-teal-400" />
            <span>Helpline: {HOSPITAL_INFO.emergencyHelpline}</span>
          </div>
        </div>
      </div>

      {/* Main Top Bar - Strict 3-Zone Contract */}
      <div className="px-4 lg:px-8 py-3 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Mark & Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={() => setActiveTab('overview')} 
            className="flex items-center gap-2.5 text-left focus:outline-hidden group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0b192e] to-slate-900 flex items-center justify-center text-teal-400 shadow-sm border border-slate-800 group-hover:border-teal-500 transition-all duration-200">
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900 group-hover:text-teal-900 transition-colors">
                  HealthRoute
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                  Clinical Care
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Comprehensive Healthcare & Coordination</p>
            </div>
          </button>
        </div>

        {/* Zone 2: Contextual Quick-Search & Status (SaaS Dribbble Style) */}
        <div className="hidden md:flex items-center gap-3 flex-1 max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              readOnly
              onClick={() => setActiveTab('patients')}
              placeholder="Search patients, token number, records... (⌘K)"
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/90 text-xs text-slate-700 bg-slate-50/70 hover:bg-white hover:border-slate-300 focus:outline-hidden focus:border-teal-500 transition-all cursor-pointer shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
            />
          </div>
        </div>

        {/* Zone 3: Actions & Doctor Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Patient Portal Switcher Button */}
          <button
            onClick={() => {
              setPortalMode('patient');
              setActiveTab('patient-home');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 active:scale-[0.98] text-teal-800 border border-teal-200 text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
            title="Switch to HealthRoute Patient Portal"
          >
            <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
            <span>Patient Portal</span>
          </button>

          {/* Quick Schedule Appointment Button */}
          <button
            onClick={() => setIsNewAppointmentOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs shadow-teal-600/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>New Appointment</span>
          </button>

          {/* Patient Registration */}
          <button
            onClick={() => setIsNewRegistrationOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-medium border border-slate-200/80 transition-all cursor-pointer whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>Register Patient</span>
          </button>

          {/* Firebase Architecture Modal Trigger */}
          <button
            onClick={() => setIsFirebaseArchitectureOpen(true)}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
            title="View Cloud Firestore & Authentication Architecture"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span>Cloud Schema</span>
          </button>

          {/* Doctor Profile & User Switcher Pill */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-2xl border border-slate-200/90 bg-white hover:bg-slate-50/80 hover:border-slate-300 transition-all text-left cursor-pointer shadow-xs group"
            >
              <Avatar
                src={currentUser.photoUrl}
                name={currentUser.name}
                size="sm"
                status={currentUser.onDuty ? 'online' : undefined}
                className="ring-2 ring-teal-500/20"
              />
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-teal-900 transition-colors truncate max-w-[130px]">{currentUser.name}</span>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{currentUser.designation}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            </button>

            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 p-2.5 animate-in fade-in zoom-in-95 duration-100">
                  {/* Patient Portal Switch Action in Dropdown */}
                  <div className="p-2 border-b border-slate-100 mb-2">
                    <button
                      onClick={() => {
                        setPortalMode('patient');
                        setActiveTab('patient-home');
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-semibold border border-teal-200/80 transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <HeartPulse className="w-4 h-4 text-teal-600" />
                        <span>Open Patient Portal</span>
                      </span>
                      <span className="text-[10px] text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">View</span>
                    </button>
                  </div>

                  <div className="p-3 bg-gradient-to-br from-slate-50 to-teal-50/30 rounded-xl border border-slate-200/80 mb-2">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={currentUser.photoUrl}
                        name={currentUser.name}
                        size="md"
                        status={currentUser.onDuty ? 'online' : undefined}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Verified Clinical Identity</p>
                        <p className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-[11px] text-slate-600 truncate">{currentUser.designation}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>Code: {currentUser.employeeCode}</span>
                      <span className="text-teal-700 font-semibold">{currentUser.station}</span>
                    </div>
                  </div>

                  <div className="px-2 py-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                      Switch Duty Profile (Simulate Other Staff)
                    </p>
                    <div className="space-y-1">
                      {allStaff.map((staff) => (
                        <button
                          key={staff.id}
                          onClick={() => {
                            switchUser(staff.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                            currentUser.id === staff.id
                              ? 'bg-teal-50 text-teal-900 font-semibold border border-teal-200/80'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                              src={staff.photoUrl}
                              name={staff.name}
                              size="xs"
                              gender={staff.name.includes('Ananya') || staff.name.includes('Rekha') || staff.name.includes('Radhika') ? 'Female' : 'Male'}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium truncate">{staff.name}</span>
                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${getRoleBadgeColor(staff.role)}`}>
                                  {staff.role}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate">{staff.designation}</p>
                            </div>
                          </div>
                          {currentUser.id === staff.id && (
                            <UserCheck className="w-4 h-4 text-teal-600 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
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
