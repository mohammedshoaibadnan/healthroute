import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  Stethoscope, 
  Pill, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Calendar, 
  Activity, 
  FileCheck2,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { PrescriptionItem, ClinicalEncounter } from '../../types';

export const ConsultationNoteModal: React.FC = () => {
  const {
    isConsultationModalOpen,
    setIsConsultationModalOpen,
    selectedAppointmentId,
    appointments,
    patients,
    currentUser,
    saveClinicalEncounter,
    updateAppointmentStatus,
  } = useApp();

  // Find linked appointment if any
  const targetAppointment = appointments.find((a) => a.id === selectedAppointmentId);

  // Patient Info State
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | undefined>(undefined);

  // Vitals State
  const [bp, setBp] = useState('128/82');
  const [pulse, setPulse] = useState('76');
  const [spo2, setSpo2] = useState('98');
  const [temp, setTemp] = useState('98.6');
  const [weight, setWeight] = useState('68');

  // SOAP State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [historyOfPresentIllness, setHistoryOfPresentIllness] = useState('');
  const [examinationFindings, setExaminationFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [adviceNotes, setAdviceNotes] = useState('Low sodium diet, brisk walking 30 mins daily, avoid exertion.');
  const [followUpDate, setFollowUpDate] = useState('');
  const [orderedLabs, setOrderedLabs] = useState<string>('ECG 12-Lead, Serum Electrolytes');

  // Prescriptions List
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      medicineName: 'Tab. Telmisartan 40mg',
      dosage: '40 mg',
      frequency: '1-0-0 (Morning)',
      route: 'Oral',
      duration: '30 days',
      instructions: 'After breakfast with water',
    },
  ]);

  useEffect(() => {
    if (targetAppointment) {
      setAppointmentId(targetAppointment.id);
      setPatientId(targetAppointment.patientId);
      setPatientName(targetAppointment.patientName);
      setChiefComplaint(targetAppointment.chiefComplaint);
      setHistoryOfPresentIllness(
        `Patient presents for ${targetAppointment.type.toLowerCase()} regarding: ${targetAppointment.chiefComplaint}. Symptoms ongoing.`
      );
      setExaminationFindings(
        'Conscious, oriented to time, place, and person. Chest clear bilaterally, S1/S2 heard, no added murmurs. Abdomen soft, non-tender. No pedal edema.'
      );
      setDiagnosis(
        targetAppointment.chiefComplaint.toLowerCase().includes('chest')
          ? 'Suspected Atypical Angina / Rule out ACS'
          : targetAppointment.chiefComplaint.toLowerCase().includes('diabetes')
          ? 'Type 2 Diabetes Mellitus - Glycemic Review'
          : 'Essential Hypertension (Stage 2) & Routine Evaluation'
      );
    } else if (patients.length > 0 && !patientId) {
      const firstPatient = patients[0];
      setPatientId(firstPatient.id);
      setPatientName(firstPatient.name);
      setChiefComplaint('Routine health review & medication check');
      setHistoryOfPresentIllness('Patient reports general wellness with occasional fatigue.');
      setExaminationFindings('Vitals stable, system examination unremarkable.');
      setDiagnosis('Hypertension under clinical control');
    }

    // Default follow-up date 14 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 14);
    setFollowUpDate(d.toISOString().split('T')[0]);
  }, [targetAppointment, isConsultationModalOpen]);

  if (!isConsultationModalOpen) return null;

  const handleAddPrescription = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        medicineName: 'Tab. Atorvastatin 20mg',
        dosage: '20 mg',
        frequency: '0-0-1 (Night)',
        route: 'Oral',
        duration: '30 days',
        instructions: 'Post-dinner at bedtime',
      },
    ]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRx = (index: number, field: keyof PrescriptionItem, val: string) => {
    setPrescriptions((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveAndSign = (e: React.FormEvent) => {
    e.preventDefault();

    const newEncounter = saveClinicalEncounter({
      patientId: patientId || 'pat-gen',
      patientName: patientName || 'Outpatient',
      appointmentId,
      date: new Date().toISOString().split('T')[0],
      doctorName: currentUser.name,
      doctorDesignation: currentUser.designation,
      type: targetAppointment ? targetAppointment.type : 'Routine Review',
      vitals: {
        bp,
        pulse: parseInt(pulse, 10) || 78,
        spo2: parseInt(spo2, 10) || 98,
        temp: parseFloat(temp) || 98.4,
        rr: 18,
        gcs: 15,
        weight: parseFloat(weight) || 70,
        recordedAt: new Date().toISOString(),
      },
      chiefComplaint,
      historyOfPresentIllness,
      examinationFindings,
      diagnosis,
      prescriptions,
      orderedLabs: orderedLabs ? orderedLabs.split(',').map((s) => s.trim()) : [],
      adviceNotes,
      followUpDate,
      status: 'Signed',
    });

    if (appointmentId) {
      updateAppointmentStatus(appointmentId, 'Completed');
    }

    setIsConsultationModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0b192e] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Clinical Encounter & SOAP Note</h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Doctor Consultation
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Patient: <span className="font-semibold text-white">{patientName}</span> • Attending: {currentUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsConsultationModalOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSaveAndSign} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {/* Patient Selection Bar (if not pre-linked) */}
          {!targetAppointment && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <label className="block text-slate-700 font-semibold mb-1">Select Patient</label>
              <select
                value={patientId}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  const p = patients.find((x) => x.id === e.target.value);
                  if (p) setPatientName(p.name);
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age}y / {p.gender}) — {p.id}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vitals Ribbon */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Physical Examination Vitals
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              <div>
                <label className="text-[10px] text-slate-500 font-medium">BP (mmHg)</label>
                <input
                  type="text"
                  value={bp}
                  onChange={(e) => setBp(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium">Heart Rate (bpm)</label>
                <input
                  type="text"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium">SpO2 (%)</label>
                <input
                  type="text"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium">Temp (°F)</label>
                <input
                  type="text"
                  value={temp}
                  onChange={(e) => setTemp(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium">Weight (kg)</label>
                <input
                  type="text"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 bg-white text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* S - Subjective */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-bold">S</span>
              <span>Subjective (Chief Complaint & History)</span>
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">Chief Complaint *</label>
              <input
                type="text"
                required
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 block mb-1">History of Present Illness (HPI)</label>
              <textarea
                rows={2}
                value={historyOfPresentIllness}
                onChange={(e) => setHistoryOfPresentIllness(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 resize-none"
              />
            </div>
          </div>

          {/* O - Objective */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-bold">O</span>
              <span>Objective (Systemic Examination)</span>
            </div>
            <textarea
              rows={2}
              value={examinationFindings}
              onChange={(e) => setExaminationFindings(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 resize-none"
            />
          </div>

          {/* A - Assessment */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-slate-900 font-bold">
              <span className="w-5 h-5 rounded bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-bold">A</span>
              <span>Assessment & Working Diagnosis *</span>
            </div>
            <input
              type="text"
              required
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="e.g. Essential Hypertension (Stage 2) & Angina Pectoris"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {/* P - Plan & Prescriptions */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">P</span>
                <span>Plan of Care: Digital Prescriptions</span>
              </div>
              <button
                type="button"
                onClick={handleAddPrescription}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 hover:bg-teal-100 font-semibold text-[11px] border border-teal-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medication</span>
              </button>
            </div>

            {/* Prescriptions rows */}
            <div className="space-y-2.5">
              {prescriptions.map((rx, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Medication Name"
                      value={rx.medicineName}
                      onChange={(e) => handleUpdateRx(idx, 'medicineName', e.target.value)}
                      className="w-full px-2.5 py-1 rounded border border-slate-200 bg-white font-semibold text-slate-900"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      placeholder="Dosage"
                      value={rx.dosage}
                      onChange={(e) => handleUpdateRx(idx, 'dosage', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-slate-700"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="text"
                      placeholder="Frequency"
                      value={rx.frequency}
                      onChange={(e) => handleUpdateRx(idx, 'frequency', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 font-mono"
                    />
                  </div>
                  <div className="w-24">
                    <input
                      type="text"
                      placeholder="Duration"
                      value={rx.duration}
                      onChange={(e) => handleUpdateRx(idx, 'duration', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-slate-700"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Special Instructions"
                      value={rx.instructions}
                      onChange={(e) => handleUpdateRx(idx, 'instructions', e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-200 bg-white text-slate-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePrescription(idx)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors self-end sm:self-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Diagnostics Orders & Advice */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">
                  Ordered Lab Tests / Diagnostics
                </label>
                <input
                  type="text"
                  value={orderedLabs}
                  onChange={(e) => setOrderedLabs(e.target.value)}
                  placeholder="e.g. ECG 12-Lead, Complete Hemogram, Troponin-I"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-700 block mb-1">
                  Recommended Follow-Up Date
                </label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-medium text-slate-700 block mb-1">
                Lifestyle & Dietary Advice
              </label>
              <textarea
                rows={2}
                value={adviceNotes}
                onChange={(e) => setAdviceNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white resize-none"
              />
            </div>
          </div>

          {/* Legal Compliance Check */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5 text-slate-600">
            <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
            <p className="text-[11px] leading-snug">
              Clinical safety check: Documentation is saved with digital cryptographic stamp under{' '}
              <span className="font-semibold text-slate-800">{currentUser.name}</span>. No autonomous diagnosis is permitted.
            </p>
          </div>

          {/* Footer Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsConsultationModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Finalize & Sign SOAP Encounter</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
