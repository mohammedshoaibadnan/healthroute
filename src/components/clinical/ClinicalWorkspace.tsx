import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Pill,
  Calendar,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  ClipboardList,
  Ban,
  FileEdit,
  AlertTriangle,
  Activity,
} from 'lucide-react';
import { PrescriptionStatus } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  derivePatientMedicationRegimen,
  formatDoctorDisplayName,
} from '../../utils/rules';

export const ClinicalWorkspace: React.FC = () => {
  const {
    encounters,
    patients,
    currentUser,
    allStaff,
    medicationActivities,
    setIsConsultationModalOpen,
    setSelectedAppointmentId,
    setEditingEncounter,
    activateDraftPrescription,
    discontinuePrescription,
  } = useApp();

  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(encounters[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [discontinuingTarget, setDiscontinuingTarget] = useState<{
    encounterId: string;
    itemId?: string;
    label: string;
  } | null>(null);

  const filteredEncounters = encounters.filter((enc) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        enc.patientName.toLowerCase().includes(q) ||
        (enc.diagnosis && enc.diagnosis.toLowerCase().includes(q)) ||
        (enc.assessmentDiagnosis && enc.assessmentDiagnosis.toLowerCase().includes(q)) ||
        enc.id.toLowerCase().includes(q) ||
        enc.prescriptions.some((rx) => (rx.drugName || rx.medicineName || '').toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeEncounter = encounters.find((e) => e.id === selectedEncounterId) || encounters[0];
  const activePatient = patients.find(
    (p) => p.id === activeEncounter?.patientId || p.name === activeEncounter?.patientName
  );
  const activeDoctor = allStaff.find(
    (s) => s.id === activeEncounter?.doctorId || s.name === activeEncounter?.doctorName
  );

  const patientRegimen = derivePatientMedicationRegimen(activePatient, encounters);
  const patientMedicationLogs = medicationActivities.filter(
    (act) => act.patientId === activeEncounter?.patientId
  );

  const getPrescriptionStatusBadge = (status?: PrescriptionStatus) => {
    switch (status) {
      case 'Draft':
        return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'Discontinued':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Active':
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  const handleConfirmDiscontinue = () => {
    if (!discontinuingTarget) return;
    discontinuePrescription(
      discontinuingTarget.encounterId,
      discontinuingTarget.itemId,
      discontinueReason.trim() || 'Discontinued by prescribing clinician after clinical review'
    );
    setDiscontinuingTarget(null);
    setDiscontinueReason('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Clinical Workspace & SOAP Encounters
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              Electronic Health Record
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Conduct consultations, author structured multi-medicine prescriptions, manage active regimens, and review patient-reported medication activity.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedAppointmentId(null);
            setEditingEncounter(null);
            setIsConsultationModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs shadow-teal-600/20 transition-all cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>New Consultation & Prescription</span>
        </button>
      </div>

      {/* Main Split Layout: Encounter Directory (Left) + Detailed Clinical Record (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Encounter Directory */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[820px]">
          <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/75 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Encounters & Prescriptions ({encounters.length})
              </span>
              <span className="text-[11px] text-teal-700 font-semibold">Shared EHR State</span>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, diagnosis, medicine..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredEncounters.map((enc) => {
              const isSelected = enc.id === (activeEncounter ? activeEncounter.id : '');
              const rxStatus: PrescriptionStatus =
                enc.prescriptionStatus || (enc.status === 'Draft' ? 'Draft' : 'Active');

              return (
                <div
                  key={enc.id}
                  onClick={() => setSelectedEncounterId(enc.id)}
                  className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-teal-50/90 border border-teal-200 shadow-xs'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={
                          patients.find(
                            (p) => p.id === enc.patientId || p.name === enc.patientName
                          )?.photoUrl
                        }
                        name={enc.patientName}
                        size="xs"
                      />
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-xs truncate">
                          {enc.patientName}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {enc.date} • {formatDoctorDisplayName(enc.doctorName)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getPrescriptionStatusBadge(
                        rxStatus
                      )}`}
                    >
                      Rx: {rxStatus}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 font-medium mt-1.5 truncate">
                    {enc.diagnosis || enc.assessmentDiagnosis || 'Clinical Review'}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/50 text-[10px] text-slate-500">
                    <span className="font-medium text-slate-600">
                      {enc.prescriptions.length} medication(s)
                    </span>
                    <span className="font-mono text-slate-400">{enc.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active SOAP Note & Prescription Management Viewer */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col h-[820px]">
          {activeEncounter ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Header Banner */}
              <div className="pb-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={activePatient?.photoUrl}
                    name={activeEncounter.patientName}
                    gender={activePatient?.gender}
                    size="lg"
                    className="ring-2 ring-teal-500/20 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-lg font-bold text-slate-900">
                        {activeEncounter.patientName}
                      </h2>
                      <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                        {activeEncounter.patientId}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getPrescriptionStatusBadge(
                          activeEncounter.prescriptionStatus ||
                            (activeEncounter.status === 'Draft' ? 'Draft' : 'Active')
                        )}`}
                      >
                        Prescription Status:{' '}
                        {activeEncounter.prescriptionStatus ||
                          (activeEncounter.status === 'Draft' ? 'Draft' : 'Active')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Prescribed by{' '}
                      <span className="font-bold text-slate-800">
                        {formatDoctorDisplayName(activeEncounter.doctorName)}
                      </span>{' '}
                      ({activeEncounter.doctorId}) on <span className="font-semibold text-slate-700">{activeEncounter.date}</span>
                    </p>
                  </div>
                </div>

                {/* Action buttons for Draft or Active encounters */}
                <div className="flex flex-wrap items-center gap-2">
                  {(activeEncounter.prescriptionStatus === 'Draft' ||
                    activeEncounter.status === 'Draft') && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingEncounter(activeEncounter);
                          setIsConsultationModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>Edit Draft</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => activateDraftPrescription(activeEncounter.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Review & Activate Prescription</span>
                      </button>
                    </>
                  )}
                  {activeEncounter.prescriptionStatus !== 'Discontinued' &&
                    activeEncounter.prescriptions.some((p) => p.status !== 'Discontinued') && (
                      <button
                        type="button"
                        onClick={() =>
                          setDiscontinuingTarget({
                            encounterId: activeEncounter.id,
                            label: `Entire Prescription (${activeEncounter.id})`,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Discontinue Prescription</span>
                      </button>
                    )}
                </div>
              </div>

              {/* Inline Discontinuation Confirmation Banner */}
              {discontinuingTarget && discontinuingTarget.encounterId === activeEncounter.id && (
                <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>
                        Discontinue {discontinuingTarget.label} — Historical prescription record will be preserved
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={discontinueReason}
                      onChange={(e) => setDiscontinueReason(e.target.value)}
                      placeholder="Enter clinical reason for discontinuation (e.g. Therapy completed, switched drug class)..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-rose-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-rose-400"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDiscontinuingTarget(null);
                          setDiscontinueReason('');
                        }}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmDiscontinue}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
                      >
                        Confirm Discontinue
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vitals HUD Ribbon */}
              {activeEncounter.vitals && (
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center text-xs shadow-xs">
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Blood Pressure
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {activeEncounter.vitals.bp || '120/80'}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
                    </div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Heart Rate
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {activeEncounter.vitals.pulse || 78}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">bpm</span>
                    </div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Oxygen SpO2
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {activeEncounter.vitals.spo2 || 98}%
                    </div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Temperature
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {activeEncounter.vitals.temp || 98.4}°F
                    </div>
                  </div>
                  <div className="p-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                      Weight
                    </span>
                    <div className="font-extrabold text-slate-900 text-sm mt-1">
                      {activeEncounter.vitals.weight || 70}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">kg</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SOAP Documentation Sections */}
              <div className="space-y-4 text-xs">
                {/* S & O & A Summary Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-800 text-[10px] flex items-center justify-center font-extrabold">
                        S
                      </span>
                      <span className="text-xs">Subjective & Clinical History</span>
                    </div>
                    <p className="text-slate-700">
                      <strong className="text-slate-900">Chief Complaint:</strong>{' '}
                      {activeEncounter.chiefComplaint}
                    </p>
                    {(activeEncounter.historyOfPresentIllness ||
                      activeEncounter.subjectiveHistory) && (
                      <p className="text-slate-600">
                        {activeEncounter.historyOfPresentIllness ||
                          activeEncounter.subjectiveHistory}
                      </p>
                    )}
                  </div>

                  <div className="border border-slate-200/90 rounded-2xl p-4 bg-white shadow-xs space-y-1.5">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 text-[10px] flex items-center justify-center font-extrabold">
                        A
                      </span>
                      <span className="text-xs">Assessment & Working Diagnosis</span>
                    </div>
                    <p className="text-slate-900 font-bold text-sm">
                      {activeEncounter.diagnosis ||
                        activeEncounter.assessmentDiagnosis ||
                        'Clinical Impression Verified'}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      {activeEncounter.examinationFindings ||
                        activeEncounter.physicalExamination ||
                        'Systemic examination completed.'}
                    </p>
                  </div>
                </div>

                {/* P - Plan & Prescriptions */}
                <div className="border border-slate-200/90 rounded-2xl p-4.5 bg-white shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] flex items-center justify-center font-extrabold">
                        P
                      </span>
                      <span className="text-sm">
                        Digital Prescription ({activeEncounter.prescriptions.length} Medicine
                        {activeEncounter.prescriptions.length === 1 ? '' : 's'})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Created: <strong className="text-slate-700">{activeEncounter.date}</strong> •{' '}
                      Prescriber:{' '}
                      <strong className="text-slate-700">
                        {formatDoctorDisplayName(activeEncounter.doctorName)}
                      </strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto border border-slate-200/90 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Medicine & Strength</th>
                          <th className="py-2.5 px-3">Dosage & Route</th>
                          <th className="py-2.5 px-3">Frequency & Duration</th>
                          <th className="py-2.5 px-3">Instructions</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeEncounter.prescriptions.map((rx, idx) => {
                          const itemStatus: PrescriptionStatus =
                            activeEncounter.prescriptionStatus === 'Draft' ||
                            activeEncounter.status === 'Draft'
                              ? 'Draft'
                              : activeEncounter.prescriptionStatus === 'Discontinued' ||
                                rx.status === 'Discontinued'
                              ? 'Discontinued'
                              : rx.status || 'Active';

                          return (
                            <tr
                              key={rx.id || idx}
                              className={
                                itemStatus === 'Discontinued'
                                  ? 'bg-slate-50/60 text-slate-400'
                                  : 'hover:bg-slate-50/50'
                              }
                            >
                              <td className="py-3 px-3">
                                <div
                                  className={`font-bold ${
                                    itemStatus === 'Discontinued'
                                      ? 'line-through text-slate-500'
                                      : 'text-slate-900'
                                  }`}
                                >
                                  {rx.drugName || rx.medicineName}
                                </div>
                                {rx.strength && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    Strength: {rx.strength}
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-slate-700 font-medium">
                                <div>{rx.dosage}</div>
                                <span className="text-[10px] text-slate-500">
                                  Route: {rx.route || 'Oral'} • {rx.timing || 'After Food'}
                                </span>
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-mono text-teal-700 font-bold">
                                  {rx.frequency}
                                </div>
                                <div className="text-[11px] text-slate-500">{rx.duration}</div>
                              </td>
                              <td className="py-3 px-3 text-slate-600">
                                <div>{rx.instructions || rx.timing || 'As directed'}</div>
                                {rx.discontinuedReason && (
                                  <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                                    Discontinued: {rx.discontinuedReason}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${getPrescriptionStatusBadge(
                                    itemStatus
                                  )}`}
                                >
                                  {itemStatus}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                {itemStatus === 'Active' && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDiscontinuingTarget({
                                        encounterId: activeEncounter.id,
                                        itemId: rx.id,
                                        label: rx.drugName || rx.medicineName || 'Medicine',
                                      })
                                    }
                                    className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold transition-colors cursor-pointer"
                                  >
                                    Discontinue
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Connected Active Medication Regimen Summary for this Patient */}
                  {activePatient && (
                    <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-teal-600" />
                          <span>
                            {activePatient.name}&apos;s Connected Current Active Medications (
                            {patientRegimen.activeMedications.length})
                          </span>
                        </span>
                        <span className="text-[10px] font-semibold text-teal-700">
                          Synced with Patient Portal
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {patientRegimen.activeMedications.map((med) => (
                          <span
                            key={med.id}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-200 text-[11px] font-semibold text-slate-800"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{med.drugName}</span>
                            <span className="text-slate-400 font-normal">({med.encounterId})</span>
                          </span>
                        ))}
                        {patientRegimen.activeMedications.length === 0 && (
                          <span className="text-[11px] text-slate-500 italic">
                            No active prescribed medications.
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Ordered Labs & Advice */}
                  {(activeEncounter.orderedLabs?.length ||
                    activeEncounter.orderedInvestigations?.length) ? (
                    <div className="pt-1">
                      <strong className="text-slate-900 font-semibold">
                        Ordered Diagnostic Tests:{' '}
                      </strong>
                      <span className="text-slate-700">
                        {(
                          activeEncounter.orderedLabs ||
                          activeEncounter.orderedInvestigations ||
                          []
                        ).join(', ')}
                      </span>
                    </div>
                  ) : null}

                  {(activeEncounter.adviceNotes || activeEncounter.clinicalAdvice) && (
                    <div className="text-slate-600 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                      <strong className="text-slate-900 font-semibold">Physician Advice: </strong>
                      {activeEncounter.adviceNotes || activeEncounter.clinicalAdvice}
                    </div>
                  )}

                  {activeEncounter.followUpDate && (
                    <div className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                      <span>Recommended Next Review Date: {activeEncounter.followUpDate}</span>
                    </div>
                  )}
                </div>

                {/* Patient-Reported Medication Activity Section (Step 5) */}
                <div className="border border-indigo-200/90 rounded-2xl p-4.5 bg-indigo-50/30 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Patient-Reported Medication Activity ({patientMedicationLogs.length})
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                      Patient-Reported (Self-Logged • Not Clinician/Sensor Verified)
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Self-reported adherence updates logged by{' '}
                    <span className="font-semibold text-slate-800">
                      {activeEncounter.patientName}
                    </span>{' '}
                    in the Patient Portal. These entries are patient-reported and do not automatically modify prescriptions.
                  </p>

                  {patientMedicationLogs.length > 0 ? (
                    <div className="space-y-2">
                      {patientMedicationLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">
                                {log.medicineName}
                              </span>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  log.status === 'Taken'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : log.status === 'Skipped'
                                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                {log.status}
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                                Patient-Reported
                              </span>
                            </div>
                            {log.note && (
                              <p className="text-[11px] text-slate-600 mt-1">
                                Patient note: &ldquo;{log.note}&rdquo;
                              </p>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(log.recordedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-500 text-xs italic">
                      No patient-reported medication activity recorded yet for {activeEncounter.patientName}.
                    </div>
                  )}
                </div>
              </div>

              {/* Physician Signature Block */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <Avatar
                    src={activeDoctor?.photoUrl || currentUser.photoUrl}
                    name={activeEncounter.doctorName}
                    size="sm"
                    className="ring-2 ring-teal-500/20 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-800">
                        Digitally Authenticated by {formatDoctorDisplayName(activeEncounter.doctorName)}
                      </p>
                      <ShieldCheck className="w-4 h-4 text-teal-600 inline" />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      NABH Clinical Compliance Stamp • Apex City HealthCare •{' '}
                      {activeEncounter.doctorDesignation || 'Attending Physician'}
                    </p>
                  </div>
                </div>
                <div className="font-mono text-[10px] text-slate-400">
                  Encounter ID: {activeEncounter.id}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
              <ClipboardList className="w-12 h-12 stroke-1 mb-2 text-slate-300" />
              <p>Select an encounter from the left to view the complete clinical record.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
