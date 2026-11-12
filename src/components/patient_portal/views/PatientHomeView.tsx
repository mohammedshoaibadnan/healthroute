import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Calendar, 
  FileText, 
  Pill, 
  Clock, 
  AlertTriangle, 
  PhoneCall, 
  ArrowRight, 
  CheckCircle2, 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  Upload, 
  HeartPulse, 
  Activity, 
  ChevronRight,
  Stethoscope
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { HOSPITAL_INFO } from '../../../data/mockData';
import { filterPatientAppointments, calculatePatientHealthMetrics } from '../../../utils/rules';

export const PatientHomeView: React.FC = () => {
  const { 
    activePatient, 
    appointments, 
    encounters, 
    labReports, 
    patientDocuments, 
    patientNotifications,
    setActiveTab, 
    setIsPatientBookingModalOpen, 
    setIsPatientUploadDocOpen,
    setPreviewDocument,
    setPreviewEncounter
  } = useApp();

  const metrics = calculatePatientHealthMetrics(activePatient.id, appointments, encounters, labReports);
  const upcomingApts = filterPatientAppointments(appointments, activePatient.id, 'upcoming');
  const recentDocs = patientDocuments.filter((d) => d.patientId === activePatient.id).slice(0, 3);
  const unreadNotifs = patientNotifications.filter((n) => n.patientId === activePatient.id && !n.isRead);

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* SECTION A: Welcome Section & Institutional Profile */}
      <div className="bg-gradient-to-br from-[#0b192e] via-slate-900 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="relative shrink-0">
              <Avatar
                src={activePatient.photoUrl}
                name={activePatient.name}
                size="xl"
                className="ring-4 ring-teal-500/30"
              />
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-slate-900" title="Active Patient Profile" />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider">
                  {getGreeting()},
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30">
                  ABHA: {activePatient.abhaId || '91-4820-1928-3011'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {activePatient.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-300 pt-0.5">
                <span>MRN: <strong className="text-white font-mono">{activePatient.permanentMrn || 'AC-BLR-2026-7819'}</strong></span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span>{activePatient.age} Yrs • {activePatient.gender}</span>
                <span className="text-slate-600 hidden sm:inline">•</span>
                <span>Blood Group: <strong className="text-rose-400 font-bold">{activePatient.bloodGroup || 'A+'}</strong></span>
              </div>
            </div>
          </div>

          {/* Institutional Affiliation Badge */}
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="space-y-0.5 text-left md:text-right">
              <div className="flex items-center md:justify-end gap-1.5 text-teal-300 text-xs font-semibold">
                <Building2 className="w-3.5 h-3.5" />
                <span>{HOSPITAL_INFO.name}</span>
              </div>
              <p className="text-[11px] text-slate-300">{HOSPITAL_INFO.subHeading}</p>
              <p className="text-[10px] text-slate-400">Attending: {activePatient.primaryPhysician?.split('(')[0] || 'Dr. Vikram Malhotra'}</p>
            </div>
            <button
              onClick={() => setActiveTab('patient-emergency')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/30 text-xs font-semibold hover:bg-rose-500/30 transition-all cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Emergency Access Card</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION B: Health Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setActiveTab('patient-appointments')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Calendar className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-[10px] font-bold uppercase text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md">
              Upcoming
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.upcomingCount}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Scheduled Consultations</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('patient-prescriptions')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-blue-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Pill className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              Active Regimen
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{activePatient.currentMedications?.length || 4}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Prescribed Medications</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('patient-reports')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              Diagnostic
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{patientDocuments.length}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Available Health Records</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('patient-notifications')}
          className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-amber-400 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
              Alerts
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{unreadNotifs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">Pending Notifications</p>
          </div>
        </div>
      </div>

      {/* SECTION C: Quick Actions Strip */}
      <div className="p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Healthcare Quick Actions</span>
          </h3>
          <span className="text-[11px] text-slate-400">1-click patient self-service</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <button
            onClick={() => setIsPatientBookingModalOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-teal-50/70 hover:bg-teal-100/70 border border-teal-200 text-teal-900 transition-all cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Book Doctor</span>
            <span className="text-[10px] text-teal-700 mt-0.5">Select time slot</span>
          </button>

          <button
            onClick={() => setActiveTab('patient-health')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105 transition-transform">
              <HeartPulse className="w-4 h-4 text-rose-400" />
            </div>
            <span className="text-xs font-bold leading-tight">My Health</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Timeline & history</span>
          </button>

          <button
            onClick={() => setActiveTab('patient-prescriptions')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105 transition-transform">
              <Pill className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Prescriptions</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Dosage & timing</span>
          </button>

          <button
            onClick={() => setIsPatientUploadDocOpen(true)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-700 text-white flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Upload Report</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Add external file</span>
          </button>

          <button
            onClick={() => setActiveTab('patient-messages')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Ask Doctor</span>
            <span className="text-[10px] text-slate-500 mt-0.5">Direct message</span>
          </button>

          <button
            onClick={() => setActiveTab('patient-emergency')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200 text-rose-900 transition-all cursor-pointer text-center group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs mb-1.5 group-hover:scale-105 transition-transform">
              <PhoneCall className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold leading-tight">Emergency</span>
            <span className="text-[10px] text-rose-700 mt-0.5">24x7 Helpline</span>
          </button>
        </div>
      </div>

      {/* SECTION D: Upcoming Appointments & Recent Health Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Upcoming Consultations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Upcoming Appointments</h3>
              <p className="text-xs text-slate-500">Your scheduled outpatient consultations and hospital visits</p>
            </div>
            <button
              onClick={() => setIsPatientBookingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          </div>

          {upcomingApts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200/80 space-y-3">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">No Upcoming Appointments</p>
              <p className="text-xs text-slate-400">Need a clinical review? Schedule a consultation with a specialist.</p>
              <button
                onClick={() => setIsPatientBookingModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors cursor-pointer"
              >
                Book Consultation Now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingApts.map((apt) => (
                <div
                  key={apt.id}
                  className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <Avatar src={apt.doctorPhotoUrl} name={apt.doctorName} size="lg" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{apt.doctorName}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.status === 'Requested'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : apt.status === 'Confirmed' || apt.status === 'Scheduled'
                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-xs text-teal-700 font-medium">{apt.department || 'Cardiology & Internal Medicine'}</p>
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {apt.date}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {apt.timeSlot}
                        </span>
                        <span>Room: {apt.roomNo || 'OPD Room 204'}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 italic pt-1">"{apt.chiefComplaint}"</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Token #{apt.tokenNumber}
                    </span>
                    <button
                      onClick={() => setActiveTab('patient-appointments')}
                      className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (1 Col): Recent Health Reports & Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Medical Reports</h3>
              <p className="text-xs text-slate-500">Verified clinical documents</p>
            </div>
            <button
              onClick={() => setActiveTab('patient-reports')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setPreviewDocument(doc)}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-teal-400 transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate group-hover:text-teal-900 transition-colors">
                        {doc.title}
                      </p>
                      {doc.isVerified && (
                        <span title="Verified by Clinician">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{doc.source}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span>{doc.date}</span>
                      <span className="font-semibold text-teal-700 group-hover:underline">Preview & Download</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Clinician Advice Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-slate-50 border border-teal-200/80 space-y-2 text-xs">
            <div className="flex items-center gap-2 text-teal-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Doctor's Post-Stent Care Advice</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Maintain consistent morning blood pressure checks. Ensure 30 minutes of gentle walking daily and strictly continue antiplatelet medication without missing doses.
            </p>
            <div className="pt-1 flex items-center justify-between text-[10px] text-teal-800 font-semibold">
              <span>Dr. Vikram Malhotra</span>
              <button onClick={() => setActiveTab('patient-messages')} className="underline cursor-pointer">
                Message Doctor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
