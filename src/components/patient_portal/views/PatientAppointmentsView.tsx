import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Calendar, 
  Clock, 
  Building2, 
  Video, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Plus, 
  ChevronRight, 
  Search,
  Filter
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { filterPatientAppointments } from '../../../utils/rules';
import { Appointment, AppointmentStatus } from '../../../types';
import { RescheduleAppointmentModal } from '../modals/RescheduleAppointmentModal';

export const PatientAppointmentsView: React.FC = () => {
  const { 
    appointments, 
    activePatient, 
    setIsPatientBookingModalOpen, 
    cancelAppointment 
  } = useApp();

  const [activeTab, setActiveTabFilter] = useState<'all' | 'upcoming' | 'requested' | 'completed' | 'cancelled'>('upcoming');
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [cancelModalTarget, setCancelModalTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const displayedAppointments = filterPatientAppointments(appointments, activePatient.id, activeTab);

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'Requested':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Confirmed':
      case 'Scheduled':
        return 'bg-teal-100 text-teal-900 border-teal-300';
      case 'In Consultation':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Completed':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'Rescheduled':
        return 'bg-indigo-100 text-indigo-900 border-indigo-300';
      case 'Cancelled':
      case 'No Show':
        return 'bg-rose-100 text-rose-900 border-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const handleConfirmCancel = () => {
    if (cancelModalTarget) {
      cancelAppointment(cancelModalTarget.id, cancelReason || 'Patient requested cancellation');
      setCancelModalTarget(null);
      setCancelReason('');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Appointment Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Book consultations, track request status, view token numbers, and manage appointment bookings
          </p>
        </div>

        <button
          onClick={() => setIsPatientBookingModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Book New Appointment</span>
        </button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 text-xs font-medium">
        {[
          { id: 'upcoming', label: 'Upcoming Consultations' },
          { id: 'requested', label: 'Requested Awaiting Review' },
          { id: 'completed', label: 'Past Completed' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'all', label: 'All History' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTabFilter(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {displayedAppointments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No Appointments in this Category</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You currently have no consultations matching "{activeTab}". Schedule an appointment with our clinical specialists anytime.
          </p>
          <button
            onClick={() => setIsPatientBookingModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Book Appointment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedAppointments.map((apt) => {
            const isCancellable = !['Completed', 'Cancelled'].includes(apt.status);
            return (
              <div
                key={apt.id}
                className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Doctor & Appointment Details */}
                <div className="flex items-start gap-4">
                  <Avatar src={apt.doctorPhotoUrl} name={apt.doctorName} size="xl" className="ring-2 ring-teal-500/20" />
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-base">{apt.doctorName}</span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(apt.status)}`}>
                        {apt.status}
                      </span>
                      {apt.consultationMode && (
                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                          {apt.consultationMode.includes('Video') ? <Video className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-slate-600" />}
                          <span>{apt.consultationMode}</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-semibold text-teal-700">{apt.department || 'Outpatient Consultation'}</p>
                    <p className="text-[11px] text-slate-400">Hospital: {apt.hospitalName || 'Apex City Hospital (Main Campus)'} • Room: {apt.roomNo || 'OPD Room 204'}</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 pt-1.5 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <strong className="text-slate-900">{apt.date}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <strong className="text-slate-900">{apt.timeSlot}</strong>
                      </span>
                      <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        Token #{apt.tokenNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">Ref: {apt.id}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 mt-2">
                      <span className="font-bold text-slate-700">Reason for visit: </span>
                      <span className="italic">"{apt.chiefComplaint}"</span>
                      {apt.cancellationReason && (
                        <p className="text-rose-600 mt-1 font-medium">Cancellation Note: {apt.cancellationReason}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Button Group */}
                {isCancellable && (
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                    <button
                      onClick={() => setRescheduleTarget(apt)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200/80 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Reschedule</span>
                    </button>
                    <button
                      onClick={() => setCancelModalTarget(apt)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium border border-rose-200/80 transition-colors cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Cancel Booking</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleTarget && (
        <RescheduleAppointmentModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Cancel Consultation #{cancelModalTarget.id}?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to cancel your consultation with {cancelModalTarget.doctorName} on {cancelModalTarget.date} at {cancelModalTarget.timeSlot}?
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-left">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Reason for Cancellation (Optional)
              </label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Symptoms resolved, reschedule needed, family conflict..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setCancelModalTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
