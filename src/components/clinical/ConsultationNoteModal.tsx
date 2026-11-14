import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Stethoscope,
  Pill,
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  FileEdit,
  AlertCircle,
} from 'lucide-react';
import { PrescriptionItem, PrescriptionStatus, PharmacyMedicine } from '../../types';
import { formatDoctorDisplayName, checkMedicineAvailabilityForDoctor } from '../../utils/rules';

const ROUTE_OPTIONS: NonNullable<PrescriptionItem['route']>[] = [
  'Oral',
  'Sublingual',
  'Inhalation',
  'Topical',
  'Subcutaneous',
  'IV',
  'IM',
  'Ophthalmic',
  'Other',
];

const TIMING_OPTIONS: NonNullable<PrescriptionItem['timing']>[] = [
  'After Food',
  'Before Food',
  'With Food',
  'Empty Stomach',
  'Bedtime',
  'SOS (As needed)',
];

export const ConsultationNoteModal: React.FC = () => {
  const {
    isConsultationModalOpen,
    setIsConsultationModalOpen,
    selectedAppointmentId,
    editingEncounter,
    setEditingEncounter,
    appointments,
    patients,
    currentUser,
    saveClinicalEncounter,
    updateAppointmentStatus,
    pharmacyMedicines,
    pharmacyBatches,
  } = useApp();

  const todayDateStr = new Date().toISOString().split('T')[0];

  // Find linked appointment if any
  const targetAppointment = appointments.find((a) => a.id === selectedAppointmentId);

  // Patient & Encounter Metadata State
  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState('');
  const [appointmentId, setAppointmentId] = useState<string | undefined>(undefined);
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]);

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
  const [adviceNotes, setAdviceNotes] = useState(
    'Maintain low-sodium diet, brisk walking 30 mins daily, adhere strictly to prescribed medication schedule.'
  );
  const [followUpDate, setFollowUpDate] = useState('');
  const [orderedLabs, setOrderedLabs] = useState<string>('ECG 12-Lead, Serum Electrolytes');

  // Explicit clinician review confirmation
  const [doctorReviewedConfirm, setDoctorReviewedConfirm] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // Prescriptions List
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([
    {
      id: `rx-init-1`,
      medicineName: 'Tab. Telmisartan',
      drugName: 'Tab. Telmisartan 40 mg',
      strength: '40 mg',
      dosage: '1 tablet once daily',
      frequency: '1-0-0 (Morning)',
      route: 'Oral',
      timing: 'After Food',
      duration: '30 Days',
      instructions: 'Take after breakfast with water; monitor home blood pressure.',
      status: 'Active',
    },
  ]);

  useEffect(() => {
    setFormError(null);
    const todayStr = new Date().toISOString().split('T')[0];

    if (editingEncounter) {
      setAppointmentId(editingEncounter.appointmentId);
      setPatientId(editingEncounter.patientId);
      setPatientName(editingEncounter.patientName);
      setPrescriptionDate(editingEncounter.date || todayStr);
      setBp(editingEncounter.vitals?.bp || '128/82');
      setPulse(String(editingEncounter.vitals?.pulse || 76));
      setSpo2(String(editingEncounter.vitals?.spo2 || 98));
      setTemp(String(editingEncounter.vitals?.temp || 98.6));
      setWeight(String(editingEncounter.vitals?.weight || 68));
      setChiefComplaint(editingEncounter.chiefComplaint || '');
      setHistoryOfPresentIllness(
        editingEncounter.historyOfPresentIllness || editingEncounter.subjectiveHistory || ''
      );
      setExaminationFindings(
        editingEncounter.examinationFindings || editingEncounter.physicalExamination || ''
      );
      setDiagnosis(editingEncounter.diagnosis || editingEncounter.assessmentDiagnosis || '');
      setAdviceNotes(editingEncounter.adviceNotes || editingEncounter.clinicalAdvice || '');
      setFollowUpDate(editingEncounter.followUpDate || '');
      setOrderedLabs(
        (editingEncounter.orderedLabs || editingEncounter.orderedInvestigations || []).join(', ')
      );
      setPrescriptions(
        editingEncounter.prescriptions.length > 0
          ? editingEncounter.prescriptions.map((item, idx) => ({
              ...item,
              id: item.id || `rx-edit-${idx + 1}`,
              medicineName: item.medicineName || item.drugName || '',
              drugName: item.drugName || item.medicineName || '',
              strength: item.strength || item.dosage || '',
              dosage: item.dosage || '1 tablet',
              frequency: item.frequency || '1-0-0 (Morning)',
              duration: item.duration || '30 Days',
              route: item.route || 'Oral',
              timing: item.timing || 'After Food',
              instructions: item.instructions || '',
              status: item.status || 'Active',
            }))
          : []
      );
      return;
    }

    setPrescriptionDate(todayStr);

    if (targetAppointment) {
      setAppointmentId(targetAppointment.id);
      setPatientId(targetAppointment.patientId);
      setPatientName(targetAppointment.patientName);
      setChiefComplaint(targetAppointment.chiefComplaint);
      setHistoryOfPresentIllness(
        `Patient presents for ${targetAppointment.type.toLowerCase()} regarding: ${targetAppointment.chiefComplaint}. Clinical evaluation conducted.`
      );
      setExaminationFindings(
        'Conscious, oriented to time, place, and person. Chest clear bilaterally, S1/S2 heard, no added murmurs. Abdomen soft, non-tender. No pedal edema.'
      );
      setDiagnosis(
        targetAppointment.chiefComplaint.toLowerCase().includes('chest')
          ? 'Post-PCI Stable Angina & Secondary Cardiovascular Prevention Review'
          : targetAppointment.chiefComplaint.toLowerCase().includes('diabetes')
          ? 'Type 2 Diabetes Mellitus - Glycemic Review'
          : 'Essential Hypertension (Stage 2) & Outpatient Clinical Evaluation'
      );
    } else if (patients.length > 0) {
      const defaultPat = patients.find((p) => p.id === 'pat-known-01') || patients[0];
      setAppointmentId(undefined);
      setPatientId(defaultPat.id);
      setPatientName(defaultPat.name);
      setChiefComplaint('Outpatient clinical review & prescription management');
      setHistoryOfPresentIllness('Patient reports stable clinical status; attending for follow-up medication review.');
      setExaminationFindings('Vitals stable, systemic examination unremarkable.');
      setDiagnosis('Essential Hypertension & Secondary Cardiac Prevention');
    }

    const d = new Date();
    d.setDate(d.getDate() + 14);
    setFollowUpDate(d.toISOString().split('T')[0]);
  }, [targetAppointment, editingEncounter, isConsultationModalOpen]);

  if (!isConsultationModalOpen) return null;

  const closeModal = () => {
    setEditingEncounter(null);
    setIsConsultationModalOpen(false);
  };

  const handleAddPrescription = () => {
    setPrescriptions((prev) => [
      ...prev,
      {
        id: `rx-${Date.now()}-${prev.length + 1}`,
        medicineName: '',
        drugName: '',
        strength: '',
        dosage: '1 tablet',
        frequency: '1-0-0 (Morning)',
        route: 'Oral',
        timing: 'After Food',
        duration: '30 Days',
        instructions: '',
        status: 'Active',
      },
    ]);
  };

  const handleRemovePrescription = (index: number) => {
    setPrescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateRx = (index: number, field: keyof PrescriptionItem, val: string) => {
    setPrescriptions((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const updated = { ...item, [field]: val };
        if (field === 'medicineName' || field === 'strength') {
          const med = (field === 'medicineName' ? val : item.medicineName || '').trim();
          const str = (field === 'strength' ? val : item.strength || '').trim();
          updated.drugName =
            str && !med.toLowerCase().includes(str.toLowerCase()) ? `${med} ${str}`.trim() : med;
        }
        return updated;
      })
    );
  };

  const handleApplyFormularyMedicine = (index: number, med: PharmacyMedicine) => {
    const prefix =
      med.dosageForm === 'Tablet'
        ? 'Tab.'
        : med.dosageForm === 'Capsule'
        ? 'Cap.'
        : med.dosageForm === 'Injection'
        ? 'Inj.'
        : med.dosageForm === 'Syrup'
        ? 'Syp.'
        : med.dosageForm === 'Ointment'
        ? 'Oint.'
        : med.dosageForm === 'Drops'
        ? 'Drops'
        : '';
    const medDisplayName = prefix ? `${prefix} ${med.genericName}` : med.genericName;
    const defaultRoute =
      med.dosageForm === 'Inhaler'
        ? 'Inhalation'
        : med.dosageForm === 'Injection'
        ? 'IV'
        : med.dosageForm === 'Ointment'
        ? 'Topical'
        : med.dosageForm === 'Drops'
        ? 'Ophthalmic'
        : 'Oral';

    setPrescriptions((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              medicineName: medDisplayName,
              genericName: med.genericName,
              dosageForm: med.dosageForm,
              strength: med.strength,
              drugName: `${medDisplayName} ${med.strength}`,
              route: defaultRoute,
              dosage:
                med.dosageForm === 'Tablet'
                  ? '1 tablet'
                  : med.dosageForm === 'Capsule'
                  ? '1 capsule'
                  : med.dosageForm === 'Inhaler'
                  ? '2 puffs'
                  : item.dosage || '1 dose',
            }
          : item
      )
    );
  };

  const submitEncounterWithStatus = (targetPrescriptionStatus: PrescriptionStatus) => {
    setFormError(null);

    if (!chiefComplaint.trim() || !diagnosis.trim()) {
      setFormError('Chief complaint and working diagnosis are required before saving.');
      return;
    }

    const validMedications = prescriptions.filter(
      (rx) => (rx.medicineName || rx.drugName || '').trim().length > 0
    );

    if (validMedications.length === 0) {
      setFormError('Please include at least one medicine with a valid Medicine Name in the prescription.');
      return;
    }

    if (targetPrescriptionStatus === 'Active' && !doctorReviewedConfirm) {
      setFormError('Please confirm that you have reviewed the prescribed medicines, strengths, and dosages before saving an Active prescription.');
      return;
    }

    const resolvedPatientId = patientId || 'pat-known-01';
    const resolvedPatientName =
      patients.find((p) => p.id === resolvedPatientId)?.name || patientName || 'Outpatient';
    const doctorDisplay = formatDoctorDisplayName(currentUser.name);

    const preparedPrescriptions: PrescriptionItem[] = validMedications.map((rx, idx) => {
      const medName = (rx.medicineName || rx.drugName || '').trim();
      const strength = (rx.strength || '').trim();
      const combinedDrugName =
        strength && !medName.toLowerCase().includes(strength.toLowerCase())
          ? `${medName} ${strength}`
          : medName;

      const itemStatus: PrescriptionStatus =
        targetPrescriptionStatus === 'Draft'
          ? 'Draft'
          : rx.status === 'Discontinued'
          ? 'Discontinued'
          : 'Active';

      return {
        ...rx,
        id: rx.id || `rx-${Date.now()}-${idx + 1}`,
        patientId: resolvedPatientId,
        prescribingDoctorId: currentUser.id,
        prescribingDoctorName: doctorDisplay,
        medicineName: medName,
        drugName: combinedDrugName,
        strength: strength || rx.dosage || '',
        dosage: (rx.dosage || strength || '1 tablet').trim(),
        frequency: (rx.frequency || '1-0-0 (Morning)').trim(),
        duration: (rx.duration || '30 Days').trim(),
        route: rx.route || 'Oral',
        timing: rx.timing || 'After Food',
        instructions: (rx.instructions || '').trim(),
        createdDate: prescriptionDate,
        status: itemStatus,
      };
    });

    const encounterStatus = targetPrescriptionStatus === 'Draft' ? 'Draft' : 'Signed';

    saveClinicalEncounter({
      id: editingEncounter?.id,
      patientId: resolvedPatientId,
      patientName: resolvedPatientName,
      appointmentId,
      date: prescriptionDate,
      doctorId: currentUser.id,
      doctorName: doctorDisplay,
      doctorDesignation: currentUser.designation,
      department: currentUser.department,
      type: targetAppointment ? targetAppointment.type : editingEncounter?.type || 'OPD Consultation',
      encounterType: targetAppointment ? targetAppointment.type : editingEncounter?.encounterType || 'OPD Consultation',
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
      chiefComplaint: chiefComplaint.trim(),
      historyOfPresentIllness: historyOfPresentIllness.trim(),
      subjectiveHistory: historyOfPresentIllness.trim(),
      examinationFindings: examinationFindings.trim(),
      physicalExamination: examinationFindings.trim(),
      diagnosis: diagnosis.trim(),
      assessmentDiagnosis: diagnosis.trim(),
      prescriptions: preparedPrescriptions,
      prescriptionStatus: targetPrescriptionStatus,
      orderedLabs: orderedLabs ? orderedLabs.split(',').map((s) => s.trim()).filter(Boolean) : [],
      orderedInvestigations: orderedLabs ? orderedLabs.split(',').map((s) => s.trim()).filter(Boolean) : [],
      adviceNotes: adviceNotes.trim(),
      clinicalAdvice: adviceNotes.trim(),
      followUpDate,
      status: encounterStatus,
    });

    if (appointmentId && encounterStatus !== 'Draft') {
      updateAppointmentStatus(appointmentId, 'Completed');
    }

    closeModal();
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitEncounterWithStatus('Active');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0b192e] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-400/30 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  {editingEncounter
                    ? `Edit Clinical Encounter & Prescription (${editingEncounter.id})`
                    : 'Clinical Encounter & Digital Prescription Authoring'}
                </h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  Doctor Consultation
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Patient: <span className="font-semibold text-white">{patientName}</span> ({patientId}) • Prescribing Doctor:{' '}
                <span className="font-semibold text-teal-300">{formatDoctorDisplayName(currentUser.name)}</span> ({currentUser.id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Patient & Prescription Metadata Bar */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Target Patient</label>
              <select
                aria-label="Target Patient"
                value={patientId}
                disabled={!!targetAppointment}
                onChange={(e) => {
                  setPatientId(e.target.value);
                  const p = patients.find((x) => x.id === e.target.value);
                  if (p) setPatientName(p.name);
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900 disabled:bg-slate-100"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.age}y / {p.gender}) — {p.id}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Prescribing Clinician</label>
              <input
                type="text"
                readOnly
                value={`${formatDoctorDisplayName(currentUser.name)} (${currentUser.id})`}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 font-medium"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Prescription Creation Date</label>
              <input
                type="date"
                aria-label="Prescription Creation Date"
                value={prescriptionDate}
                onChange={(e) => setPrescriptionDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-900"
              />
            </div>
          </div>

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

          {/* S - Subjective & O - Objective in compact 2-column grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
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

            <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2.5">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <span className="w-5 h-5 rounded bg-teal-100 text-teal-800 text-[10px] flex items-center justify-center font-bold">O</span>
                <span>Objective & Working Diagnosis</span>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Systemic Examination Findings</label>
                <textarea
                  rows={2}
                  value={examinationFindings}
                  onChange={(e) => setExaminationFindings(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:border-teal-500 resize-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Assessment & Working Diagnosis *</label>
                <input
                  type="text"
                  required
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="e.g. Essential Hypertension & Secondary Cardiac Prevention"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* P - Plan & Prescriptions */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                  <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 text-[10px] flex items-center justify-center font-bold">P</span>
                  <span>Plan of Care: Structured Digital Prescription ({prescriptions.length} Medicine{prescriptions.length === 1 ? '' : 's'})</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 pl-6">
                  Add one or more medicines with strength, dosage instructions, frequency, duration, route of administration, and clinical instructions.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddPrescription}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold text-xs border border-teal-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Medicine</span>
              </button>
            </div>

            {/* Prescriptions rows */}
            <div className="space-y-3">
              {prescriptions.map((rx, idx) => (
                <div
                  key={rx.id || idx}
                  className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-teal-800">
                      <Pill className="w-3.5 h-3.5 text-teal-600" />
                      Medicine #{idx + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Item Status:</label>
                      <select
                        aria-label={`Medicine ${idx + 1} Status`}
                        value={rx.status || 'Active'}
                        onChange={(e) => handleUpdateRx(idx, 'status', e.target.value)}
                        className="px-2 py-0.5 rounded border border-slate-200 bg-white text-[11px] font-bold text-slate-700"
                      >
                        <option value="Active">Active</option>
                        <option value="Draft">Draft</option>
                        <option value="Discontinued">Discontinued</option>
                      </select>
                      {prescriptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePrescription(idx)}
                          title="Remove medicine"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">
                      Formulary Quick-Fill (Optional):
                    </span>
                    <select
                      aria-label={`Medicine ${idx + 1} Formulary Picker`}
                      value=""
                      onChange={(e) => {
                        const med = pharmacyMedicines.find((m) => m.id === e.target.value);
                        if (med) handleApplyFormularyMedicine(idx, med);
                      }}
                      className="flex-1 max-w-md px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-700"
                    >
                      <option value="">-- Select from Hospital Formulary (or type freely below) --</option>
                      {pharmacyMedicines
                        .filter((m) => m.status === 'Active')
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.genericName} {m.strength} ({m.dosageForm}){m.brandName ? ` — ${m.brandName}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Row 1: Medicine Name, Strength, Dosage Instructions, Route */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Medicine Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Tab. Rosuvastatin"
                        value={rx.medicineName || ''}
                        onChange={(e) => handleUpdateRx(idx, 'medicineName', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-bold text-slate-900"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Strength *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 20 mg"
                        value={rx.strength || ''}
                        onChange={(e) => handleUpdateRx(idx, 'strength', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Dosage Instructions *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 tablet at night"
                        value={rx.dosage || ''}
                        onChange={(e) => handleUpdateRx(idx, 'dosage', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Route of Administration
                      </label>
                      <select
                        aria-label={`Medicine ${idx + 1} Route`}
                        value={rx.route || 'Oral'}
                        onChange={(e) => handleUpdateRx(idx, 'route', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                      >
                        {ROUTE_OPTIONS.map((rt) => (
                          <option key={rt} value={rt}>
                            {rt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 2: Frequency, Duration, Meal Timing, Additional Instructions */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Frequency *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1-0-1 (Twice daily)"
                        value={rx.frequency || ''}
                        onChange={(e) => handleUpdateRx(idx, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Duration *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 30 Days"
                        value={rx.duration || ''}
                        onChange={(e) => handleUpdateRx(idx, 'duration', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Meal / Dose Timing
                      </label>
                      <select
                        aria-label={`Medicine ${idx + 1} Timing`}
                        value={rx.timing || 'After Food'}
                        onChange={(e) => handleUpdateRx(idx, 'timing', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
                      >
                        {TIMING_OPTIONS.map((tm) => (
                          <option key={tm} value={tm}>
                            {tm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <label className="text-[10px] font-semibold text-slate-500 block mb-0.5">
                        Additional Clinical Instructions
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Swallow whole; do not stop abruptly"
                        value={rx.instructions || ''}
                        onChange={(e) => handleUpdateRx(idx, 'instructions', e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Live Hospital Pharmacy Stock Snapshot (Non-Blocking & Non-Reserved) */}
                  {(rx.medicineName || rx.drugName || '').trim().length > 0 &&
                    (() => {
                      const snapshot = checkMedicineAvailabilityForDoctor(
                        rx,
                        pharmacyMedicines,
                        pharmacyBatches,
                        todayDateStr
                      );
                      const statusStyle =
                        snapshot.availabilityStatus === 'Available'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : snapshot.availabilityStatus === 'Low Stock'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : snapshot.availabilityStatus === 'Out of Stock' ||
                            snapshot.availabilityStatus === 'Inactive'
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-slate-100 border-slate-200 text-slate-700';

                      return (
                        <div
                          className={`p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] ${statusStyle}`}
                        >
                          <div className="font-semibold">
                            <span>Hospital Pharmacy Snapshot: </span>
                            <span className="font-extrabold">{snapshot.availabilityStatus}</span>
                            {snapshot.matchedMedicine && (
                              <span className="font-normal ml-1.5">
                                ({snapshot.usableQuantity} {snapshot.matchedMedicine.unitOfMeasurement} usable
                                {snapshot.earliestExpiry ? `, earliest exp ${snapshot.earliestExpiry}` : ''})
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] opacity-85">{snapshot.disclaimer}</span>
                        </div>
                      );
                    })()}
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
                Lifestyle & Clinical Advice
              </label>
              <textarea
                rows={2}
                value={adviceNotes}
                onChange={(e) => setAdviceNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white resize-none"
              />
            </div>
          </div>

          {/* Explicit Clinician Review Confirmation */}
          <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 flex items-start gap-3 text-slate-700">
            <input
              id="doctor-rx-review-check"
              type="checkbox"
              checked={doctorReviewedConfirm}
              onChange={(e) => setDoctorReviewedConfirm(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-teal-400 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <label htmlFor="doctor-rx-review-check" className="text-xs leading-snug cursor-pointer">
              <span className="font-bold text-slate-900 block">
                Clinician Prescription Review & Verification ({formatDoctorDisplayName(currentUser.name)})
              </span>
              I have explicitly reviewed all {prescriptions.length} prescribed medicine(s), strengths, routes, dosage instructions, and allergy checks for <span className="font-semibold text-slate-900">{patientName}</span>. Prescriptions are never auto-generated or auto-approved.
            </label>
          </div>

          {/* Footer Actions: Explicit Draft vs Active Save */}
          <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span>Active prescriptions synchronize immediately with the Patient Portal.</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => submitEncounterWithStatus('Draft')}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold transition-colors cursor-pointer"
              >
                <FileEdit className="w-4 h-4 text-amber-700" />
                <span>Save as Draft Prescription</span>
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Review & Save Active Prescription</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
