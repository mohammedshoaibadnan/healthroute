import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { X, Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { Appointment } from '../../../types';

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
}

export const RescheduleAppointmentModal: React.FC<Props> = ({ appointment, onClose }) => {
  const { rescheduleAppointment } = useApp();

  const [newDate, setNewDate] = useState(appointment?.date || '');
  const [newTimeSlot, setNewTimeSlot] = useState(appointment?.timeSlot || '10:00 AM');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!appointment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setErrorMsg('Please select a new appointment date.');
      return;
    }

    rescheduleAppointment(appointment.id, newDate, newTimeSlot, reason);
    onClose();
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Appointment Management</p>
              <h3 className="text-sm font-semibold">Reschedule Consultation #{appointment.id}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
            <p className="font-bold text-slate-900">{appointment.doctorName}</p>
            <p className="text-teal-700">{appointment.department || 'Outpatient Consultation'}</p>
            <p className="text-slate-400 text-[11px]">Current: {appointment.date} at {appointment.timeSlot}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              New Preferred Date
            </label>
            <input
              type="date"
              min={todayStr}
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              New Preferred Time Slot
            </label>
            <div className="flex flex-wrap gap-1.5">
              {['09:00 AM', '10:00 AM', '11:30 AM', '02:30 PM', '04:00 PM'].map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setNewTimeSlot(slot)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    newTimeSlot === slot
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60'
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Reason for Rescheduling (Optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Work conflict, travel, or feeling unwell..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
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
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
            >
              <span>Confirm New Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
