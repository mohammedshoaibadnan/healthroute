import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, Calendar, Clock, AlertCircle, RefreshCw, XCircle, ArrowRight } from 'lucide-react';
import { Appointment } from '../../types';
import { Avatar } from '../common/Avatar';

interface DeclineModalProps {
  appointment: Appointment | null;
  onClose: () => void;
}

export const DoctorDeclineRequestModal: React.FC<DeclineModalProps> = ({ appointment, onClose }) => {
  const { declinePatientAppointmentRequest } = useApp();
  const [declineReason, setDeclineReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!appointment) return null;

  const handleConfirmDecline = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMsg('');

    const result = declinePatientAppointmentRequest(
      appointment.id,
      declineReason.trim() || 'Declined by specialist due to clinic schedule constraints'
    );

    if (!result.success) {
      setErrorMsg(result.error || 'Could not decline appointment request.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Booking Request Review</p>
              <h3 className="text-sm font-semibold">Decline Request #{appointment.id}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close decline dialog"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleConfirmDecline} className="p-6 space-y-4 text-xs text-slate-700">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <Avatar src={appointment.patientPhotoUrl} name={appointment.patientName} gender={appointment.patientGender} size="md" />
            <div className="space-y-0.5 min-w-0">
              <p className="font-bold text-slate-900 text-sm">{appointment.patientName}</p>
              <p className="text-[11px] text-slate-500">
                {appointment.patientAge}y • {appointment.patientGender} • {appointment.patientPhone}
              </p>
              <p className="text-[11px] text-teal-800 font-semibold pt-0.5">
                {appointment.type} ({appointment.consultationMode || 'In-Person OPD'})
              </p>
              <p className="text-[11px] text-slate-600 font-medium">
                Requested: <strong>{appointment.date}</strong> at <strong>{appointment.timeSlot}</strong>
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="decline-reason-input" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Reason for Declining Request
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Optional</span>
            </div>
            <textarea
              id="decline-reason-input"
              rows={2}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Optional: Provide a brief clinical or scheduling note visible to the patient..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
            >
              Keep Request
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              {isSubmitting ? 'Declining...' : 'Confirm Decline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ProposeRescheduleModalProps {
  appointment: Appointment | null;
  onClose: () => void;
}

export const DoctorProposeRescheduleModal: React.FC<ProposeRescheduleModalProps> = ({ appointment, onClose }) => {
  const { proposeDoctorReschedule, doctorsDirectory } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultNextDate = (() => {
    const d = new Date(appointment?.date || todayStr);
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().split('T')[0];
    return iso < todayStr ? todayStr : iso;
  })();

  const [proposedDate, setProposedDate] = useState(appointment?.proposedDate || defaultNextDate);
  const [proposedTimeSlot, setProposedTimeSlot] = useState(appointment?.proposedTimeSlot || '11:30 AM');
  const [reason, setReason] = useState(appointment?.rescheduleReason || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!appointment) return null;

  const assignedDoc = doctorsDirectory.find((d) => d.id === appointment.doctorId || d.name === appointment.doctorName);
  const slotOptions = Array.from(
    new Set([
      ...(assignedDoc?.availableSlots || []),
      '09:00 AM',
      '10:15 AM',
      '11:30 AM',
      '02:30 PM',
      '04:00 PM',
    ])
  );

  const originalDate = appointment.originalDate || appointment.date;
  const originalSlot = appointment.originalTimeSlot || appointment.timeSlot;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!proposedDate || proposedDate < todayStr) {
      setErrorMsg('Please select a valid future or current date for the proposed schedule.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const result = proposeDoctorReschedule(
      appointment.id,
      proposedDate,
      proposedTimeSlot,
      reason.trim() || 'Doctor proposed an alternative consultation slot'
    );

    if (!result.success) {
      setErrorMsg(result.error || 'Could not propose new schedule.');
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-indigo-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-300">Doctor Schedule Proposal</p>
              <h3 className="text-sm font-semibold">Propose New Time for #{appointment.id}</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reschedule dialog"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {errorMsg && (
            <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Preserved Original Appointment Details Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">{appointment.patientName}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-amber-900 border border-amber-200">
                Original Preserved
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              Original Requested Slot: <strong className="text-slate-900">{originalDate}</strong> at <strong className="text-slate-900">{originalSlot}</strong>
            </p>
            <p className="text-[10px] text-slate-500">
              The original requested date and time will remain stored on record while the patient reviews your proposed schedule.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="doctor-propose-date" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Proposed New Date
            </label>
            <input
              id="doctor-propose-date"
              type="date"
              min={todayStr}
              value={proposedDate}
              onChange={(e) => {
                setProposedDate(e.target.value);
                setErrorMsg('');
              }}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Proposed Time Slot
            </label>
            <div className="flex flex-wrap gap-1.5">
              {slotOptions.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setProposedTimeSlot(slot)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    proposedTimeSlot === slot
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="doctor-propose-reason" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Note / Reason for Proposed Schedule
              </label>
              <span className="text-[10px] text-slate-400">Optional</span>
            </div>
            <textarea
              id="doctor-propose-reason"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Emergency procedure during afternoon clinic; morning slot available..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span>{isSubmitting ? 'Sending...' : 'Send Reschedule Proposal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
