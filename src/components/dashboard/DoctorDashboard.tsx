import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Calendar, 
  Clock, 
  UserCheck, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Play, 
  Plus, 
  Stethoscope, 
  Activity, 
  Users, 
  ArrowUpRight,
  TrendingUp,
  FileCheck2,
  CalendarCheck2,
  BellRing,
  HeartPulse,
  User,
  Phone,
  BarChart3,
  Sparkles,
  AlertTriangle,
  LayoutGrid,
  List,
  ChevronDown,
  Check,
  ShieldAlert,
  XCircle,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Appointment, AppointmentStatus, PatientTriageStatus } from '../../types';
import { resolvePatientTriageStatus, getTriageBadgeConfig, getAppointmentStatusBadge, canManageAppointmentRequest } from '../../utils/rules';
import { Avatar } from '../common/Avatar';
import { DoctorDeclineRequestModal, DoctorProposeRescheduleModal } from '../appointments/DoctorRequestActionModals';

export const DoctorDashboard: React.FC = () => {
  const {
    currentUser,
    appointments,
    updateAppointmentStatus,
    updateAppointmentTriageStatus,
    acceptPatientAppointmentRequest,
    switchRole,
    startConsultation,
    encounters,
    followUps,
    completeFollowUp,
    labReports,
    cases,
    patients,
    setActiveTab,
    setIsNewAppointmentOpen,
    setSelectedCaseId,
    setIsNewRegistrationOpen
  } = useApp();

  const isNurse = currentUser.role === 'nurse';

  const [scheduleScope, setScheduleScope] = useState<'today' | 'upcoming'>('today');
  const [appointmentFilter, setAppointmentFilter] = useState<'all' | 'waiting' | 'in-progress' | 'completed'>('all');
  const [nurseViewMode, setNurseViewMode] = useState<'cards' | 'table'>('cards');
  const [triageFilter, setTriageFilter] = useState<'all' | PatientTriageStatus>('all');
  const [activeTriageMenuAptId, setActiveTriageMenuAptId] = useState<string | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(3); // Default to Thursday (today)
  const [declineTarget, setDeclineTarget] = useState<Appointment | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  // Filter today's, upcoming, and patient-requested appointments
  const todayDate = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayDate && a.status !== 'Requested');
  const upcomingAppointments = appointments.filter(
    (a) => a.date > todayDate && !['Cancelled', 'Completed', 'No Show', 'Requested'].includes(a.status)
  );
  const requestedAppointments = appointments.filter((a) => a.status === 'Requested');

  const activeScopeList = scheduleScope === 'today' ? todayAppointments : upcomingAppointments;

  const filteredAppointments = activeScopeList.filter((a) => {
    if (scheduleScope === 'today') {
      if (appointmentFilter === 'waiting' && a.status !== 'Waiting') return false;
      if (appointmentFilter === 'in-progress' && a.status !== 'In Consultation') return false;
      if (appointmentFilter === 'completed' && a.status !== 'Completed') return false;
    }

    // Nurse triage acuity filter (only active when isNurse)
    if (isNurse && triageFilter !== 'all') {
      const resolved = resolvePatientTriageStatus(a, cases);
      if (resolved !== triageFilter) return false;
    }

    return true;
  });

  // Calculate status counts
  const waitingCount = todayAppointments.filter((a) => a.status === 'Waiting').length;
  const inConsultCount = todayAppointments.filter((a) => a.status === 'In Consultation').length;
  const completedCount = todayAppointments.filter((a) => a.status === 'Completed').length;
  const pendingNotes = encounters.filter((e) => e.status === 'Draft');
  const pendingLabs = labReports.filter((r) => r.status === 'Pending Review');
  const criticalLabs = labReports.filter((r) => r.criticalPanicValue && r.status !== 'Reviewed');

  // Nurse Triage Acuity Counts
  const criticalTriageCount = todayAppointments.filter((a) => resolvePatientTriageStatus(a, cases) === 'Critical').length;
  const waitingTriageCount = todayAppointments.filter((a) => resolvePatientTriageStatus(a, cases) === 'Waiting').length;
  const stableTriageCount = todayAppointments.filter((a) => resolvePatientTriageStatus(a, cases) === 'Stable').length;
  const obsTriageCount = todayAppointments.filter((a) => resolvePatientTriageStatus(a, cases) === 'Under Observation').length;

  // Urgent Emergency attention check (restrained)
  const urgentErCases = cases.filter(
    (c) => (c.triageLevel === 'RED' || c.esiScore <= 2) && !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
  );

  const getStatusBadge = (status: AppointmentStatus) => getAppointmentStatusBadge(status);

  const PatientTriageBadge: React.FC<{
    status: PatientTriageStatus;
    aptId?: string;
    editable?: boolean;
    compact?: boolean;
  }> = ({ status, aptId, editable = true, compact = false }) => {
    const config = getTriageBadgeConfig(status);
    const isMenuOpen = activeTriageMenuAptId === aptId;

    return (
      <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          disabled={!editable || !aptId}
          onClick={(e) => {
            e.stopPropagation();
            if (editable && aptId) {
              setActiveTriageMenuAptId(isMenuOpen ? null : aptId);
            }
          }}
          title={editable && aptId ? `Click to adjust triage acuity as nurse (Current: ${status})` : config.description}
          className={`inline-flex items-center gap-1.5 rounded-full border transition-all ${
            compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
          } font-bold shadow-2xs ${config.badgeClass} ${
            editable && aptId ? 'cursor-pointer hover:brightness-95 active:scale-95' : 'cursor-default'
          }`}
        >
          {config.pingBeacon ? (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
            </span>
          ) : (
            <span className={`w-2 h-2 rounded-full shrink-0 ${config.dotClass}`}></span>
          )}

          {status === 'Critical' && <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />}
          {status === 'Waiting' && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
          {status === 'Stable' && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
          {status === 'Under Observation' && <Activity className="w-3 h-3 text-sky-600 shrink-0" />}

          <span>{config.label}</span>

          {editable && aptId && (
            <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
          )}
        </button>

        {isMenuOpen && (
          <>
            <div
              className="fixed inset-0 z-30"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTriageMenuAptId(null);
              }}
            />
            <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200/90 z-40 p-1.5 text-xs animate-in fade-in zoom-in-95">
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 mb-1">
                Nurse Triage Adjustment
              </div>
              {(['Critical', 'Waiting', 'Under Observation', 'Stable'] as PatientTriageStatus[]).map((ts) => {
                const subCfg = getTriageBadgeConfig(ts);
                const isSelected = ts === status;
                return (
                  <button
                    key={ts}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (aptId) {
                        updateAppointmentTriageStatus(aptId, ts);
                      }
                      setActiveTriageMenuAptId(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 font-bold text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${subCfg.dotClass}`}></span>
                      <span>{ts}</span>
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-teal-600" />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    );
  };

  // Weekly data visualization for outpatient consultation trends
  const weeklyTrendData = [
    { day: 'Mon', count: 18, followUps: 6, newCases: 12 },
    { day: 'Tue', count: 22, followUps: 9, newCases: 13 },
    { day: 'Wed', count: 26, followUps: 11, newCases: 15 },
    { day: 'Thu', count: 24, followUps: 8, newCases: 16, isToday: true },
    { day: 'Fri', count: 28, followUps: 12, newCases: 16 },
    { day: 'Sat', count: 15, followUps: 5, newCases: 10 },
    { day: 'Sun', count: 8, followUps: 2, newCases: 6 },
  ];

  const maxWeeklyCount = Math.max(...weeklyTrendData.map((d) => d.count));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Modern Doctor Workspace Hero (Dribbble Healthcare SaaS Style) */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] relative overflow-hidden">
        {/* Subtle decorative background gradient mesh */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-br from-teal-50/60 via-slate-50/20 to-transparent rounded-full blur-3xl -z-10 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <Avatar
                src={currentUser.photoUrl}
                name={currentUser.name}
                size="xl"
                status={currentUser.onDuty ? 'online' : undefined}
                className="ring-4 ring-teal-500/20 shadow-md rounded-2xl"
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-xs" title="Physician Active & On Duty" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Welcome back, {currentUser.name}
                </h1>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  isNurse 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-teal-50 text-teal-800 border-teal-200'
                }`}>
                  {isNurse ? 'Clinical Nurse Triage Station' : currentUser.station || 'OPD Room 204 Active'}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>{currentUser.availability || 'On Duty'}</span>
                </span>
                {isNurse && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                    <span>Triage Awareness Mode</span>
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                {currentUser.designation} • {currentUser.department}
                {currentUser.qualifications ? ` • ${currentUser.qualifications}` : ''}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/80">
                  ID: <strong>{currentUser.employeeCode}</strong>
                </span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="text-teal-700 font-semibold">
                  {isNurse ? 'Triage & Rapid Intake Shift' : currentUser.specialty || 'Morning Clinic Session (09:00 - 14:00)'}
                </span>
                <span className="text-slate-300" aria-hidden="true">•</span>
                <span className="text-slate-700 font-medium">{todayAppointments.length} Booked Today • {upcomingAppointments.length} Upcoming</span>
              </div>
            </div>
          </div>

          {/* Quick Action CTAs */}
          <div className="flex items-center gap-2.5 self-start lg:self-center shrink-0 flex-wrap">
            {/* Quick role simulator button for testing */}
            {isNurse ? (
              <button
                onClick={() => switchRole('doctor')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all cursor-pointer whitespace-nowrap"
                title="Switch back to Doctor role to verify indicators are hidden"
              >
                <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                <span>Switch to Doctor View</span>
              </button>
            ) : (
              <button
                onClick={() => switchRole('nurse')}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all cursor-pointer whitespace-nowrap shadow-2xs"
                title="Switch to Nurse (Sister Rekha Varma) to experience triage awareness badges"
              >
                <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
                <span>Simulate Nurse View</span>
              </button>
            )}

            <button
              onClick={() => setIsNewAppointmentOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs shadow-teal-600/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule Appointment</span>
            </button>
            <button
              onClick={() => setIsNewRegistrationOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-medium border border-slate-200/80 transition-all cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>Register Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Urgent Attention Section (Restrained, only when acute cases present) */}
      {urgentErCases.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">
                  Urgent Attention Required
                </span>
                <span className="text-xs text-amber-950 font-bold">
                  Emergency Bay Case: {urgentErCases[0].patientSnapshot.name} ({urgentErCases[0].bedBay})
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-1">
                Chief complaint: <span className="font-semibold text-slate-900">"{urgentErCases[0].chiefComplaint}"</span> — Vitals: BP {urgentErCases[0].vitals.bp}, HR {urgentErCases[0].vitals.pulse} bpm, SpO2 {urgentErCases[0].vitals.spo2}%.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedCaseId(urgentErCases[0].id);
              setActiveTab('emergency');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <span>Review Emergency Case</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Modern KPI Metric Cards with Sparkline Visualizations */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Appointments Card with Sparkline */}
        <div 
          onClick={() => setActiveTab('appointments')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Today's Appointments</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{todayAppointments.length}</span>
              <span className="text-xs text-slate-500">slots</span>
            </div>
            {/* Mini SVG Sparkline */}
            <div className="w-16 h-8 text-teal-600">
              <svg viewBox="0 0 60 30" className="w-full h-full stroke-current fill-none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="2,22 15,18 28,24 40,10 58,6" />
              </svg>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1 text-amber-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>{waitingCount} waiting in lobby</span>
            </span>
            <span className="text-emerald-700 font-semibold">{completedCount} seen</span>
          </div>
        </div>

        {/* Active Inpatients Card with Progress */}
        <div 
          onClick={() => setActiveTab('patients')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Inpatients</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{patients.length}</span>
              <span className="text-xs text-slate-500">patients</span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-blue-700">83%</span>
              <span className="text-[10px] text-slate-400 block">Bed Occupancy</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full rounded-full" style={{ width: '83%' }}></div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Cardiology & General Wards</span>
              <span className="font-medium text-slate-700">Avg Stay 3.2d</span>
            </div>
          </div>
        </div>

        {/* Pending Documentation Card */}
        <div 
          onClick={() => setActiveTab('clinical')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Documentation</span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{pendingNotes.length + 1}</span>
              <span className="text-xs text-slate-500">records</span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
              SLA 45m
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span>SOAP notes & digital Rx sign-offs</span>
          </div>
        </div>

        {/* Diagnostic Reports Card with Panic Alert */}
        <div 
          onClick={() => setActiveTab('records')}
          className="bg-white rounded-2xl border border-slate-200/90 p-5 hover:border-teal-500 hover:shadow-md transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diagnostic Reports</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
              criticalLabs.length > 0 ? 'bg-rose-50 text-rose-700 group-hover:bg-rose-600 group-hover:text-white' : 'bg-slate-50 text-slate-700'
            }`}>
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tabular-nums">{labReports.length}</span>
              <span className="text-xs text-slate-500">reports</span>
            </div>
            {criticalLabs.length > 0 ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                PANIC VALUE
              </span>
            ) : (
              <span className="text-xs text-emerald-700 font-semibold">Reviewed</span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
            {criticalLabs.length > 0 ? (
              <span className="text-rose-700 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                <span>{criticalLabs.length} Panic Value Sign-off</span>
              </span>
            ) : (
              <span>All critical labs acknowledged</span>
            )}
            <span className="text-slate-400 text-[10px]">100% NABL Lab</span>
          </div>
        </div>
      </div>

      {/* 4. Data Visualization: Weekly Patient Volume & Consultation Distribution */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Outpatient Consultation Volume & Patient Load
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Weekly patient flow breakdown by new consultations and follow-up reviews (Dr. Vikram Malhotra)
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-teal-600"></span>
              <span className="text-slate-600 font-medium">New Consultations</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-400"></span>
              <span className="text-slate-600 font-medium">Follow-up Reviews</span>
            </div>
          </div>
        </div>

        {/* SVG Interactive Bar Chart */}
        <div className="mt-6 pt-2">
          <div className="grid grid-cols-7 gap-2 sm:gap-4 items-end h-44 border-b border-slate-200 pb-3">
            {weeklyTrendData.map((item, idx) => {
              const heightPct = Math.round((item.count / maxWeeklyCount) * 100);
              const newPct = Math.round((item.newCases / item.count) * 100);
              const isSelected = selectedDayIndex === idx;

              return (
                <div 
                  key={item.day}
                  onClick={() => setSelectedDayIndex(idx)}
                  className="flex flex-col items-center justify-end h-full group cursor-pointer"
                >
                  {/* Tooltip / value */}
                  <span className={`text-[10px] font-bold mb-1 transition-all ${
                    isSelected ? 'text-teal-800 scale-110' : 'text-slate-400 group-hover:text-slate-700'
                  }`}>
                    {item.count}
                  </span>

                  {/* Stacked Bar Container */}
                  <div className="w-full max-w-[48px] bg-slate-100 rounded-xl overflow-hidden flex flex-col justify-end transition-all duration-200 group-hover:brightness-95 shadow-xs" style={{ height: `${heightPct}%` }}>
                    {/* Follow-up segment */}
                    <div className="w-full bg-blue-400 transition-all" style={{ height: `${100 - newPct}%` }} />
                    {/* New consultation segment */}
                    <div className="w-full bg-teal-600 transition-all" style={{ height: `${newPct}%` }} />
                  </div>

                  {/* Day Label */}
                  <div className="mt-2 text-center">
                    <span className={`text-xs font-semibold block transition-colors ${
                      item.isToday 
                        ? 'text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200' 
                        : isSelected ? 'text-slate-900 font-bold' : 'text-slate-500'
                    }`}>
                      {item.day}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>Selected: <strong className="text-slate-800">{weeklyTrendData[selectedDayIndex].day}</strong> — {weeklyTrendData[selectedDayIndex].count} consultations ({weeklyTrendData[selectedDayIndex].newCases} New / {weeklyTrendData[selectedDayIndex].followUps} Follow-ups)</span>
            <span className="text-teal-700 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+14% Outpatient Growth this Month</span>
            </span>
          </div>
        </div>
      </div>

      {/* 5. Today's Appointments Schedule with Nurse Triage Awareness */}
      <div className="space-y-4">
        {/* Nurse Triage Awareness Station Command Bar (ONLY FOR NURSE) */}
        {isNurse && (
          <div className="bg-gradient-to-r from-[#0b192e] via-slate-900 to-teal-950 rounded-2xl p-4 sm:p-5 text-white shadow-md border border-teal-800/40 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-400/30 shrink-0">
                  <HeartPulse className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base tracking-tight text-white">
                      Nurse Triage Awareness Station
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-400/30">
                      Active: {currentUser.name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Triage Indicators Active
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Visual status indicators enabled on patient cards. Use badges to monitor acuity, prioritize critical patients, or adjust triage levels.
                  </p>
                </div>
              </div>

              {/* View Layout Toggle: Patient Triage Cards vs Detailed List */}
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 text-xs shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setNurseViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    nurseViewMode === 'cards'
                      ? 'bg-teal-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show high-acuity patient triage cards"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Triage Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setNurseViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    nurseViewMode === 'table'
                      ? 'bg-teal-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Show dense tabular list with triage column"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>List View</span>
                </button>
              </div>
            </div>

            {/* Acuity Filter Pills & Live Counts */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-teal-400" />
                <span>Filter By Triage:</span>
              </span>

              <button
                type="button"
                onClick={() => setTriageFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  triageFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 border border-slate-700/60'
                }`}
              >
                All Patients ({todayAppointments.length})
              </button>

              <button
                type="button"
                onClick={() => setTriageFilter('Critical')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  triageFilter === 'Critical'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/80 border border-rose-800/60'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>Critical ({criticalTriageCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setTriageFilter('Waiting')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  triageFilter === 'Waiting'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Waiting ({waitingTriageCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setTriageFilter('Under Observation')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  triageFilter === 'Under Observation'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-sky-950/60 text-sky-300 hover:bg-sky-900/80 border border-sky-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span>Observation ({obsTriageCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setTriageFilter('Stable')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer text-xs ${
                  triageFilter === 'Stable'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 border border-emerald-800/60'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Stable ({stableTriageCount})</span>
              </button>
            </div>
          </div>
        )}

        {/* Master Appointment Schedule Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)]">
          <div className="p-5 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  {scheduleScope === 'today' ? "Today's Consultations" : 'Upcoming Scheduled Appointments'}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  {activeScopeList.length} Booked
                </span>
                {isNurse && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Nurse Triage View
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isNurse 
                  ? 'Triage evaluation, lobby monitoring and patient acuity status queue' 
                  : `Outpatient consultation queue for ${currentUser.name} (${currentUser.station?.split('&')[0]?.trim() || 'Room 204'})`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
              {/* Schedule Scope Toggle: Today's Consultations vs Upcoming Appointments */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200/60">
                <button
                  onClick={() => setScheduleScope('today')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    scheduleScope === 'today'
                      ? 'bg-[#0b192e] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Today's Consultations ({todayAppointments.length})
                </button>
                <button
                  onClick={() => setScheduleScope('upcoming')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    scheduleScope === 'upcoming'
                      ? 'bg-[#0b192e] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Upcoming Appointments ({upcomingAppointments.length})
                </button>
              </div>

              {/* Status Filter Pills (for Today's queue) */}
              {scheduleScope === 'today' && (
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setAppointmentFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      appointmentFilter === 'all' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({todayAppointments.length})
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('waiting')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      appointmentFilter === 'waiting' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Waiting ({waitingCount})
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('in-progress')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      appointmentFilter === 'in-progress' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    In Consult ({inConsultCount})
                  </button>
                  <button
                    onClick={() => setAppointmentFilter('completed')}
                    className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      appointmentFilter === 'completed' ? 'bg-white text-slate-900 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* VIEW MODE A: High-Acuity Patient Triage Cards (ONLY FOR NURSE in Cards Mode) */}
          {isNurse && nurseViewMode === 'cards' ? (
            <div className="p-5 bg-slate-50/50">
              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                  <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No patients matching current triage filters.</p>
                  <p className="text-xs text-slate-400 mt-1">Try switching to "All Patients" or clearing the triage status filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
                  {filteredAppointments.map((apt) => {
                    const resolvedTriage = resolvePatientTriageStatus(apt, cases);
                    const isCritical = resolvedTriage === 'Critical';
                    const isWaiting = resolvedTriage === 'Waiting';
                    const isObs = resolvedTriage === 'Under Observation';
                    const pat = patients.find((p) => p.id === apt.patientId || p.name === apt.patientName);

                    const topBorderColor = isCritical
                      ? 'border-t-rose-500 shadow-rose-500/10'
                      : isWaiting
                      ? 'border-t-amber-500 shadow-amber-500/10'
                      : isObs
                      ? 'border-t-sky-500 shadow-sky-500/10'
                      : 'border-t-emerald-500 shadow-emerald-500/10';

                    return (
                      <div
                        key={apt.id}
                        className={`bg-white rounded-2xl border border-slate-200/90 border-t-4 ${topBorderColor} p-4.5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden`}
                      >
                        {/* Background tint for critical acuity */}
                        {isCritical && (
                          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/60 rounded-full blur-2xl -z-10 pointer-events-none" />
                        )}

                        <div className="space-y-3.5">
                          {/* Card Header: Token & Time Slot & Room */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-[#0b192e] text-teal-300 font-extrabold flex items-center justify-center text-xs shadow-2xs">
                                #{apt.tokenNumber}
                              </span>
                              <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{apt.timeSlot}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80">
                              {apt.roomNumber || 'Room 204'}
                            </span>
                          </div>

                          {/* Patient Profile Row with Avatar */}
                          <div className="flex items-start gap-3 pt-1">
                            <Avatar
                              src={apt.patientPhotoUrl || pat?.photoUrl}
                              name={apt.patientName}
                              gender={apt.patientGender}
                              size="lg"
                              status={apt.status === 'In Consultation' ? 'in-consult' : apt.status === 'Waiting' ? 'waiting' : undefined}
                              className="ring-2 ring-slate-100 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="font-bold text-slate-900 text-sm leading-tight truncate">
                                  {apt.patientName}
                                </h4>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {apt.patientAge}y • {apt.patientGender} • <span className="font-mono text-[10px]">{apt.patientPhone}</span>
                              </p>
                              <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200/70">
                                {apt.type}
                              </span>
                            </div>
                          </div>

                          {/* TRIAGE AWARENESS STATUS BADGE (NURSE SPECIFIC) */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Triage Status:
                            </span>
                            <PatientTriageBadge status={resolvedTriage} aptId={apt.id} editable={true} />
                          </div>

                          {/* Vitals Snapshot (If available, color-coded for nurse) */}
                          {apt.vitalsSnapshot && (
                            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-center text-[10px]">
                              <div className="p-1 rounded-lg bg-white border border-slate-200/50">
                                <span className="text-slate-400 block font-medium">BP</span>
                                <span className={`font-bold ${
                                  parseInt(apt.vitalsSnapshot.bp.split('/')[0]) >= 140 ? 'text-rose-700' : 'text-slate-800'
                                }`}>
                                  {apt.vitalsSnapshot.bp}
                                </span>
                              </div>
                              <div className="p-1 rounded-lg bg-white border border-slate-200/50">
                                <span className="text-slate-400 block font-medium">HR</span>
                                <span className={`font-bold ${
                                  apt.vitalsSnapshot.pulse >= 100 ? 'text-amber-700' : 'text-slate-800'
                                }`}>
                                  {apt.vitalsSnapshot.pulse} bpm
                                </span>
                              </div>
                              <div className="p-1 rounded-lg bg-white border border-slate-200/50">
                                <span className="text-slate-400 block font-medium">SpO2</span>
                                <span className={`font-bold ${
                                  apt.vitalsSnapshot.spo2 < 95 ? 'text-rose-700 font-extrabold' : 'text-emerald-700'
                                }`}>
                                  {apt.vitalsSnapshot.spo2}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Chief Complaint */}
                          <div className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              Chief Complaint
                            </span>
                            <p className="text-slate-800 font-medium line-clamp-2 leading-relaxed">
                              {apt.chiefComplaint}
                            </p>
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(apt.status)}`}>
                            {apt.status}
                          </span>

                          <div className="flex items-center gap-1.5">
                            {apt.status === 'Waiting' && (
                              <button
                                onClick={() => startConsultation(apt.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>Call Patient</span>
                              </button>
                            )}
                            {apt.status === 'Scheduled' && (
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'Waiting')}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Mark Arrived</span>
                              </button>
                            )}
                            {apt.status === 'In Consultation' && (
                              <button
                                onClick={() => startConsultation(apt.id)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                              >
                                <Stethoscope className="w-3.5 h-3.5" />
                                <span>In Consult</span>
                              </button>
                            )}
                            {apt.status === 'Completed' && (
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Seen</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* VIEW MODE B: Standard / Dense Table View (with Triage Column when isNurse) */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3.5 px-5">Token / Slot</th>
                    <th className="py-3.5 px-5">Patient Information</th>
                    {isNurse && (
                      <th className="py-3.5 px-5 bg-teal-50/40 text-teal-900 border-l border-r border-teal-100">
                        <div className="flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
                          <span>Triage Acuity (Nurse)</span>
                        </div>
                      </th>
                    )}
                    <th className="py-3.5 px-5">Consultation Type</th>
                    <th className="py-3.5 px-5">Chief Complaint / Clinical Reason</th>
                    <th className="py-3.5 px-5">Status</th>
                    <th className="py-3.5 px-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAppointments.length === 0 ? (
                    <tr>
                      <td colSpan={isNurse ? 7 : 6} className="py-12 text-center text-slate-500">
                        <CalendarCheck2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        No appointments matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAppointments.map((apt) => {
                      const resolvedTriage = resolvePatientTriageStatus(apt, cases);
                      const pat = patients.find((p) => p.id === apt.patientId || p.name === apt.patientName);

                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Token & Time */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-8 h-8 rounded-xl bg-[#0b192e] text-teal-300 font-extrabold flex items-center justify-center text-xs shadow-xs">
                                #{apt.tokenNumber}
                              </span>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="tabular-nums">{apt.timeSlot}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 font-medium">{apt.roomNumber || 'Room 204'}</span>
                              </div>
                            </div>
                          </td>

                          {/* Patient with Photo Avatar */}
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-3">
                              <Avatar
                                src={apt.patientPhotoUrl || pat?.photoUrl}
                                name={apt.patientName}
                                gender={apt.patientGender}
                                size="md"
                                status={apt.status === 'In Consultation' ? 'in-consult' : apt.status === 'Waiting' ? 'waiting' : undefined}
                                className="ring-2 ring-slate-100"
                              />
                              <div>
                                <div className="font-bold text-slate-900 text-sm leading-tight hover:text-teal-900 transition-colors">
                                  {apt.patientName}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                  <span className="font-medium">{apt.patientAge}y • {apt.patientGender}</span>
                                  <span className="text-slate-300">•</span>
                                  <span className="font-mono text-[10px] text-slate-500">{apt.patientPhone}</span>
                                </div>

                                {/* On mobile or compact table, show triage badge under patient name ONLY FOR NURSE */}
                                {isNurse && (
                                  <div className="mt-1.5 sm:hidden">
                                    <PatientTriageBadge status={resolvedTriage} aptId={apt.id} editable={true} compact />
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* TRIAGE ACUITY COLUMN (ONLY FOR NURSE) */}
                          {isNurse && (
                            <td className="py-4 px-5 bg-teal-50/20 border-l border-r border-teal-100/60">
                              <div className="space-y-1.5">
                                <PatientTriageBadge status={resolvedTriage} aptId={apt.id} editable={true} />
                                {apt.vitalsSnapshot && (
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    BP {apt.vitalsSnapshot.bp} • SpO2{' '}
                                    <span className={apt.vitalsSnapshot.spo2 < 95 ? 'text-rose-700 font-bold' : ''}>
                                      {apt.vitalsSnapshot.spo2}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </td>
                          )}

                          {/* Type */}
                          <td className="py-4 px-5">
                            <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200/80">
                              {apt.type}
                            </span>
                          </td>

                          {/* Complaint */}
                          <td className="py-4 px-5 max-w-xs">
                            <p className="text-slate-800 truncate font-medium">{apt.chiefComplaint}</p>
                            {apt.notes && <p className="text-[10px] text-slate-400 truncate mt-0.5">{apt.notes}</p>}
                          </td>

                          {/* Status Badge */}
                          <td className="py-4 px-5">
                            <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(apt.status)}`}>
                              {apt.status}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {apt.status === 'Waiting' && (
                                <button
                                  onClick={() => startConsultation(apt.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Start Consult</span>
                                </button>
                              )}

                              {apt.status === 'In Consultation' && (
                                <button
                                  onClick={() => startConsultation(apt.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
                                >
                                  <Stethoscope className="w-3.5 h-3.5" />
                                  <span>Resume Note</span>
                                </button>
                              )}

                              {(apt.status === 'Scheduled' || apt.status === 'Rescheduled' || apt.status === 'Confirmed') && (
                                <button
                                  onClick={() => updateAppointmentStatus(apt.id, 'Waiting')}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Mark Arrived</span>
                                </button>
                              )}

                              {apt.status === 'Requested' && (
                                <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                  Awaiting Approval
                                </span>
                              )}

                              {apt.status === 'Completed' && (
                                <button
                                  onClick={() => setActiveTab('clinical')}
                                  className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 justify-end hover:bg-emerald-100 transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Consulted</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Separate Section: Patient Booking Requests Awaiting Approval */}
        <div className="bg-amber-50/70 rounded-2xl border border-amber-200/90 p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">
                    Patient Booking Requests Awaiting Approval
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                    {requestedAppointments.length} Pending Request{requestedAppointments.length === 1 ? '' : 's'}
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Self-service appointment requests submitted from the Patient Portal, kept separate from confirmed daily consultations.
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('appointments')}
              className="text-xs font-bold text-teal-800 hover:text-teal-950 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs cursor-pointer self-start sm:self-center inline-flex items-center gap-1"
            >
              <span>Manage in Appointments</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {requestedAppointments.length === 0 ? (
            <div className="bg-white/80 rounded-xl p-4 border border-amber-200/60 text-xs text-slate-500 text-center">
              No pending patient booking requests awaiting approval.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {requestedAppointments.map((req) => {
                const canManage = canManageAppointmentRequest(currentUser, req);
                return (
                  <div
                    key={req.id}
                    className="bg-white rounded-xl p-4 border border-amber-200/80 shadow-2xs flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <Avatar
                          src={req.patientPhotoUrl || patients.find((p) => p.id === req.patientId)?.photoUrl}
                          name={req.patientName}
                          gender={req.patientGender}
                          size="sm"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">{req.patientName}</span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              ({req.patientAge}y/{req.patientGender.charAt(0)})
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(req.status)}`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-teal-800 font-semibold truncate">
                            Specialist: {req.doctorName} • {req.department || 'Outpatient Clinic'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-600 pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Calendar className="w-3 h-3 text-amber-600" />
                              {req.date}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-slate-800">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {req.timeSlot}
                            </span>
                            <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {req.type}
                            </span>
                            {req.consultationMode && (
                              <span className="text-[10px] font-semibold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/70">
                                {req.consultationMode}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 italic truncate pt-0.5">
                            Reason: "{req.chiefComplaint}"
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                        #{req.tokenNumber}
                      </span>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {canManage ? (
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          <button
                            onClick={() => acceptPatientAppointmentRequest(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Accept Request</span>
                          </button>
                          <button
                            onClick={() => setRescheduleTarget(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Propose Reschedule</span>
                          </button>
                          <button
                            onClick={() => setDeclineTarget(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-semibold transition-colors cursor-pointer ml-auto"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Decline</span>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between w-full text-[11px] text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Assigned to <strong className="text-slate-700">{req.doctorName}</strong> — Only assigned doctor can approve</span>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 6. Bottom Split: Pending Clinical Documentation + Follow-up Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Clinical Documentation */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">Pending Clinical Documentation</h3>
              </div>
              <button 
                onClick={() => setActiveTab('clinical')}
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {encounters.slice(0, 3).map((enc) => {
                const pat = patients.find((p) => p.id === enc.patientId || p.name === enc.patientName);
                return (
                  <div key={enc.id} className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300 transition-all">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar
                          src={pat?.photoUrl}
                          name={enc.patientName}
                          gender={pat?.gender}
                          size="xs"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 text-xs block truncate">{enc.patientName}</span>
                          <span className="text-slate-400 text-[10px] font-mono">Encounter: {enc.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isNurse && (
                          <PatientTriageBadge 
                            status={resolvePatientTriageStatus({ patientId: enc.patientId, patientName: enc.patientName, chiefComplaint: enc.chiefComplaint }, cases)} 
                            compact 
                            editable={false} 
                          />
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          enc.status === 'Signed' || enc.status === 'Finalized'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-purple-50 text-purple-800 border-purple-200'
                        }`}>
                          {enc.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 mt-2">
                      Diagnosis: <span className="font-semibold text-slate-800">{enc.diagnosis || enc.assessmentDiagnosis || 'Clinical Review Pending'}</span>
                    </p>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Rx: {enc.prescriptions.length} items prescribed</span>
                      <button
                        onClick={() => setActiveTab('clinical')}
                        className="text-teal-700 hover:text-teal-800 font-bold cursor-pointer"
                      >
                        Open SOAP Note →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Mandatory medical audit: All notes require human verification.</span>
          </div>
        </div>

        {/* Follow-up Reminders & Clinical Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">Chronic Patient Follow-up Reminders</h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {followUps.filter((f) => !f.completed).length} Pending
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {followUps.map((fu) => {
                const pat = patients.find((p) => p.id === fu.patientId || p.name === fu.patientName);
                return (
                  <div 
                    key={fu.id} 
                    className={`p-3.5 rounded-xl border transition-all ${
                      fu.completed 
                        ? 'bg-slate-50/50 border-slate-200 opacity-60' 
                        : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <Avatar
                          src={pat?.photoUrl}
                          name={fu.patientName}
                          gender={pat?.gender}
                          size="xs"
                        />
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-xs">{fu.patientName}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                              Due: {fu.dueDate}
                            </span>
                            {isNurse && (
                              <PatientTriageBadge 
                                status={resolvePatientTriageStatus({ patientId: fu.patientId, patientName: fu.patientName, chiefComplaint: fu.reason }, cases)} 
                                compact 
                                editable={false} 
                              />
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-snug">{fu.reason}</p>
                          {fu.condition && <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Condition: {fu.condition}</p>}
                        </div>
                      </div>

                      <div>
                        {fu.completed ? (
                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            Followed Up
                          </span>
                        ) : (
                          <button
                            onClick={() => completeFollowUp(fu.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                          >
                            Mark Contacted
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Automated SMS recall triggers active for high-risk patients.</span>
          </div>
        </div>
      </div>

      {declineTarget && (
        <DoctorDeclineRequestModal
          appointment={declineTarget}
          onClose={() => setDeclineTarget(null)}
        />
      )}

      {rescheduleTarget && (
        <DoctorProposeRescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      )}
    </div>
  );
};
