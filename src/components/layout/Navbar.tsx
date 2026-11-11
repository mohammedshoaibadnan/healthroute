import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { HOSPITAL_INFO } from '../../data/mockData';
import { 
  Activity, 
  Siren, 
  ShieldAlert, 
  Database, 
  UserCheck, 
  ChevronDown,
  Clock,
  PhoneCall,
  Search,
  Bell
} from 'lucide-react';
import { UserRole } from '../../types';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    allStaff, 
    switchUser, 
    incomingAmbulances, 
    cases,
    setActiveTab,
    setIsFirebaseArchitectureOpen,
    setIsNewRegistrationOpen
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const redCases = cases.filter(c => c.triageLevel === 'RED' && !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status));
  const activeAmbulances = incomingAmbulances.filter(a => a.preAlertStatus !== 'Arrived Bay');

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'doctor':
        return 'bg-blue-900/10 text-blue-800 border-blue-300';
      case 'cmo':
        return 'bg-purple-900/10 text-purple-800 border-purple-300';
      case 'nurse':
        return 'bg-teal-900/10 text-teal-800 border-teal-300';
      case 'records':
        return 'bg-amber-900/10 text-amber-800 border-amber-300';
      case 'admin':
        return 'bg-rose-900/10 text-rose-800 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
      {/* Top emergency status strip */}
      <div className="bg-[#0b192e] text-slate-100 text-xs px-4 py-1.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold tracking-wide text-teal-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span>24/7 TRAUMA COMMAND</span>
          </div>
          <span className="text-slate-400">|</span>
          <span className="hidden sm:inline text-slate-300 font-medium">{HOSPITAL_INFO.name} ({HOSPITAL_INFO.code})</span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-amber-300 font-medium">{HOSPITAL_INFO.accreditation}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {activeAmbulances.length > 0 && (
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition-colors"
            >
              <Siren className="w-3.5 h-3.5 animate-bounce" />
              <span>{activeAmbulances.length} Incoming Ambulance{activeAmbulances.length > 1 ? 's' : ''} Pre-Alert</span>
            </button>
          )}

          {redCases.length > 0 && (
            <div className="flex items-center gap-1 text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
              <span className="font-semibold">{redCases.length} Critical Resuscitation (RED)</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1 text-slate-300">
            <PhoneCall className="w-3 h-3 text-teal-400" />
            <span className="text-slate-400">Helpline:</span>
            <span className="font-medium text-slate-200">{HOSPITAL_INFO.emergencyHelpline}</span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="px-4 lg:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-2.5 text-left focus:outline-hidden group"
          >
            <div className="w-10 h-10 rounded-lg bg-[#0b192e] flex items-center justify-center text-teal-400 shadow-sm border border-slate-700/60 group-hover:border-teal-500 transition-colors">
              <Activity className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight text-slate-900">HealthRoute</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                  EMERGENCY PROTOTYPE
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium leading-none">Hospital Emergency & Patient Coordination</p>
            </div>
          </button>
        </div>

        {/* Action Controls & User Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Fast-track Intake Button */}
          <button
            onClick={() => setIsNewRegistrationOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Fast-Track Intake (Unidentified)</span>
          </button>

          {/* Firebase Architecture Modal Trigger */}
          <button
            onClick={() => setIsFirebaseArchitectureOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition-colors"
            title="View Cloud Firestore & Authentication Architecture"
          >
            <Database className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden md:inline">Firebase Blueprint</span>
          </button>

          {/* Role & User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-[#0b192e] text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">{currentUser.name}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${getRoleBadgeColor(currentUser.role)}`}>
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate max-w-[140px]">{currentUser.designation}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isUserMenuOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setIsUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 p-2 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current Session</p>
                    <p className="text-xs font-semibold text-slate-900 mt-0.5">{currentUser.name}</p>
                    <p className="text-[11px] text-slate-500">{currentUser.department}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <span>Emp ID: {currentUser.employeeCode}</span>
                      <span>•</span>
                      <span className="text-teal-600 font-medium">Station: {currentUser.station}</span>
                    </div>
                  </div>

                  <div className="px-2 py-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Switch Role for Demo
                    </p>
                    <div className="space-y-1">
                      {allStaff.map(staff => (
                        <button
                          key={staff.id}
                          onClick={() => {
                            switchUser(staff.id);
                            setIsUserMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-colors ${
                            currentUser.id === staff.id
                              ? 'bg-teal-50 text-teal-900 font-semibold border border-teal-200'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              <span className={`text-[9px] uppercase font-bold px-1 py-0.2 rounded border ${getRoleBadgeColor(staff.role)}`}>
                                {staff.role}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400">{staff.designation}</p>
                          </div>
                          {currentUser.id === staff.id && (
                            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
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
