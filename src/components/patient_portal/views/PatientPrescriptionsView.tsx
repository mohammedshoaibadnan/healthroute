import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import {
  Pill,
  Clock,
  ShieldCheck,
  FileText,
  Printer,
  CheckCircle2,
  AlertCircle,
  Activity,
  Ban,
  Send,
} from 'lucide-react';
import {
  derivePatientMedicationRegimen,
  getPatientPrescriptions,
  formatDoctorDisplayName,
  getPrescriptionDispensingSummary,
  checkMedicineAvailabilityForDoctor,
} from '../../../utils/rules';
import { MedicationActivityStatus } from '../../../types';

const ACTIVITY_STATUS_OPTIONS: MedicationActivityStatus[] = [
  'Taken',
  'Skipped',
  'Not yet recorded',
];

export const PatientPrescriptionsView: React.FC = () => {
  const {
    activePatient,
    encounters,
    medicationActivities,
    recordPatientMedicationActivity,
    setPreviewEncounter,
    pharmacyMedicines,
    pharmacyBatches,
    pharmacyDispensingRecords,
  } = useApp();

  const todayDateStr = new Date().toISOString().split('T')[0];

  const [activityNotes, setActivityNotes] = useState<Record<string, string>>({});
  const [recentRecordedBanner, setRecentRecordedBanner] = useState<string | null>(null);

  // Connected prescriptions for the active patient only
  const prescriptionEncounters = getPatientPrescriptions(encounters, activePatient.id).filter(
    (enc) => enc.prescriptionStatus !== 'Draft' && enc.status !== 'Draft'
  );

  // Connected medication regimen derived from shared AppContext encounters & baseline medications
  const regimen = derivePatientMedicationRegimen(activePatient, encounters);
  const { activeMedications, discontinuedMedications } = regimen;

  // Patient's recorded medication activity logs
  const patientActivities = medicationActivities.filter(
    (act) => act.patientId === activePatient.id
  );

  const handleRecordActivity = (
    encounterId: string,
    prescriptionItemId: string,
    medicineName: string,
    status: MedicationActivityStatus
  ) => {
    const noteKey = `${encounterId}-${prescriptionItemId}`;
    const note = activityNotes[noteKey]?.trim();
    const recorded = recordPatientMedicationActivity({
      encounterId,
      prescriptionItemId,
      medicineName,
      status,
      note,
    });
    setRecentRecordedBanner(
      `Recorded "${recorded.status}" (Patient-Reported) for ${medicineName} at ${new Date(
        recorded.recordedAt
      ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Shared with your care team.`
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Prescriptions &amp; Medication Management
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Doctor Authorized</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Connected active medication regimen for{' '}
            <strong className="text-slate-800">{activePatient.name}</strong>, clinician dosage instructions, and self-reported medication activity tracking
          </p>
        </div>

        <button
          onClick={() => {
            const enc = prescriptionEncounters[0];
            if (enc) setPreviewEncounter(enc);
          }}
          disabled={prescriptionEncounters.length === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <Printer className="w-4 h-4" />
          <span>Print Current Prescription</span>
        </button>
      </div>

      {/* Safety & Compliance Banner */}
      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-950">Statutory Clinical Medication Rule</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Prescriptions displayed in HealthRoute are read-only and reflect orders authorized by licensed hospital physicians. Recording your daily medication activity below is strictly <strong>Patient-Reported</strong> for care team visibility and never automatically alters your prescription. Do not change doses or stop any medication without consulting your prescribing doctor.
          </p>
        </div>
      </div>

      {/* Confirmation Banner when Patient Records Activity */}
      {recentRecordedBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{recentRecordedBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setRecentRecordedBanner(null)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Active Medications List (Step 3, Step 4 & Step 5) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            <span>Current Active Prescribed Medications ({activeMedications.length})</span>
          </h2>
          <span className="text-[11px] text-slate-500">
            Synced directly from clinician-signed hospital prescriptions
          </span>
        </div>

        {activeMedications.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMedications.map((med) => {
              const latestActivity = patientActivities.find(
                (a) =>
                  a.encounterId === med.encounterId &&
                  a.prescriptionItemId === med.prescriptionItemId
              );
              const noteKey = `${med.encounterId}-${med.prescriptionItemId}`;
              const sourceEncounter = encounters.find((e) => e.id === med.encounterId);

              return (
                <div
                  key={med.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-slate-900 text-sm">
                            {med.drugName}
                          </h3>
                          <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            {med.status}
                          </span>
                          {med.route && (
                            <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              Route: {med.route}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Strength: <strong className="text-slate-700">{med.strength || med.dosage}</strong>
                          {med.diagnosis ? ` • Indication: ${med.diagnosis}` : ''}
                        </p>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                        <Pill className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Dosage, Frequency, Duration & Timing Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Dosage
                        </span>
                        <p className="font-bold text-slate-800">{med.dosage}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Frequency
                        </span>
                        <p className="font-bold text-slate-800">{med.frequency}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Duration
                        </span>
                        <p className="font-semibold text-slate-700">{med.duration}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Timing
                        </span>
                        <p className="font-semibold text-teal-700">{med.timing}</p>
                      </div>
                    </div>

                    {/* Clinician Instructions */}
                    <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/60 text-[11px] text-slate-700 space-y-1">
                      <span className="font-bold text-teal-900">
                        Prescribing Doctor&apos;s Instructions:
                      </span>
                      <p className="leading-relaxed">
                        {med.instructions || `Take ${med.dosage} (${med.frequency}) ${med.timing}.`}
                      </p>
                    </div>

                    {/* Hospital Pharmacy Dispensing Status & Live Availability Snapshot */}
                    {(() => {
                      const encSummary = sourceEncounter
                        ? getPrescriptionDispensingSummary(sourceEncounter, pharmacyDispensingRecords)
                        : undefined;
                      const itemDispenseState = encSummary?.items.find(
                        (it) => it.prescriptionItemId === med.prescriptionItemId
                      );
                      const pharmacySnapshot = checkMedicineAvailabilityForDoctor(
                        {
                          medicineName: med.medicineName,
                          drugName: med.drugName,
                          strength: med.strength,
                          dosage: med.dosage,
                          route: med.route,
                        },
                        pharmacyMedicines,
                        pharmacyBatches,
                        todayDateStr
                      );

                      const dispStatus = itemDispenseState?.itemStatus || 'Not Yet Dispensed';
                      const dispBadge =
                        dispStatus === 'Dispensed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : dispStatus === 'Partially Dispensed'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : dispStatus === 'Unavailable'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';

                      return (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">Hospital Pharmacy Fulfillment:</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dispBadge}`}>
                              {dispStatus === 'Dispensed' ? 'Fully Dispensed' : dispStatus}
                            </span>
                          </div>
                          {itemDispenseState && itemDispenseState.dispensedQuantity > 0 && (
                            <p className="text-[10px] text-slate-600">
                              Issued: <strong>{itemDispenseState.dispensedQuantity}</strong> of{' '}
                              <strong>{itemDispenseState.prescribedQuantity}</strong> prescribed units
                              {itemDispenseState.lastBatchNumber ? ` • Batch ${itemDispenseState.lastBatchNumber}` : ''}
                              {itemDispenseState.lastDispensedAt
                                ? ` • ${new Date(itemDispenseState.lastDispensedAt).toLocaleDateString()}`
                                : ''}
                            </p>
                          )}
                          {itemDispenseState?.itemStatus === 'Unavailable' && itemDispenseState.lastNote && (
                            <p className="text-[10px] text-rose-700 font-medium">{itemDispenseState.lastNote}</p>
                          )}
                          <div className="pt-1 border-t border-slate-200/70 flex items-center justify-between gap-2 flex-wrap text-[10px] text-slate-500">
                            <span>
                              Live Hospital Stock:{' '}
                              <strong
                                className={
                                  pharmacySnapshot.availabilityStatus === 'Available'
                                    ? 'text-emerald-700'
                                    : pharmacySnapshot.availabilityStatus === 'Low Stock'
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }
                              >
                                {pharmacySnapshot.availabilityStatus}
                              </strong>
                            </span>
                            <span className="italic">Live snapshot only — stock not reserved</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Patient-Reported Medication Activity Controls (Step 5) */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-200/80 space-y-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Log Medication Activity</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                        Patient-Reported
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {ACTIVITY_STATUS_OPTIONS.map((statusOption) => {
                        const isSelected = latestActivity?.status === statusOption;
                        return (
                          <button
                            key={statusOption}
                            type="button"
                            onClick={() =>
                              handleRecordActivity(
                                med.encounterId,
                                med.prescriptionItemId,
                                med.drugName,
                                statusOption
                              )
                            }
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? statusOption === 'Taken'
                                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                  : statusOption === 'Skipped'
                                  ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                                  : 'bg-slate-800 text-white border-slate-900 shadow-xs'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {statusOption}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={activityNotes[noteKey] || ''}
                        onChange={(e) =>
                          setActivityNotes((prev) => ({
                            ...prev,
                            [noteKey]: e.target.value,
                          }))
                        }
                        placeholder="Optional note for doctor (e.g. Taken after breakfast)..."
                        className="flex-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700"
                      />
                      {latestActivity && (
                        <button
                          type="button"
                          onClick={() =>
                            handleRecordActivity(
                              med.encounterId,
                              med.prescriptionItemId,
                              med.drugName,
                              latestActivity.status
                            )
                          }
                          title="Save note with status"
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>Update</span>
                        </button>
                      )}
                    </div>

                    {latestActivity ? (
                      <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-indigo-200/60">
                        <span>
                          Latest <strong className="text-indigo-900">Patient-Reported</strong> status:{' '}
                          <strong className="text-slate-900">{latestActivity.status}</strong>
                          {latestActivity.note ? ` ("${latestActivity.note}")` : ''}
                        </span>
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="w-3 h-3" />
                          {new Date(latestActivity.recordedAt).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">
                        Status: Not yet recorded today (Patient-Reported)
                      </p>
                    )}
                  </div>

                  {/* Link to Original Prescription & Doctor Info */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex-wrap gap-2">
                    <div>
                      <span>
                        Prescribed: <strong className="text-slate-700">{med.prescribedDate}</strong>
                      </span>
                      <span className="mx-1.5">•</span>
                      <span className="text-slate-700 font-semibold">
                        {med.prescribingDoctorName}
                      </span>
                    </div>
                    {sourceEncounter && (
                      <button
                        type="button"
                        onClick={() => setPreviewEncounter(sourceEncounter)}
                        className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                      >
                        Prescription #{med.encounterId}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-2">
            <Pill className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-800">
              No Active Prescribed Medications
            </p>
            <p className="text-xs text-slate-500">
              When your doctor saves an active prescription during a consultation, your medicines and instructions will appear here automatically.
            </p>
          </div>
        )}
      </div>

      {/* Discontinued Medications Section (Step 4: Discontinued medicines no longer appear as active, but remain accessible) */}
      {discontinuedMedications.length > 0 && (
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>
                Discontinued Medications — No Longer Active ({discontinuedMedications.length})
              </span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Retained for clinical history; do not take discontinued medicines
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {discontinuedMedications.map((med) => (
              <div
                key={med.id}
                className="p-4 rounded-2xl bg-white border border-rose-200/80 flex items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 line-through text-xs">
                      {med.drugName}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
                      Discontinued
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Originally prescribed on {med.prescribedDate} by {med.prescribingDoctorName} ({med.encounterId})
                  </p>
                  {med.discontinuedReason && (
                    <p className="text-[11px] text-rose-700 font-medium">
                      Discontinuation reason: {med.discontinuedReason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historical Consultations with Digital Prescriptions (Step 3 & Step 4) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Historical Hospital Prescriptions ({prescriptionEncounters.length})
            </h3>
            <p className="text-[11px] text-slate-500">
              Complete archive of prescriptions issued for {activePatient.name}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {prescriptionEncounters.map((enc) => {
            const rxStatus = enc.prescriptionStatus || 'Active';
            const dispSummary = getPrescriptionDispensingSummary(enc, pharmacyDispensingRecords);
            const dispBadge =
              dispSummary.overallStatus === 'Fully Dispensed'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : dispSummary.overallStatus === 'Partially Dispensed'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : dispSummary.overallStatus === 'Unavailable'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200';
            return (
              <div
                key={enc.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-xs">
                      {enc.date} • {enc.encounterType || enc.type || 'OPD Consultation'}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">({enc.id})</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        rxStatus === 'Discontinued'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      Prescription: {rxStatus}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${dispBadge}`}>
                      Pharmacy: {dispSummary.overallStatus}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 font-semibold">
                    {enc.assessmentDiagnosis || enc.diagnosis || 'Clinical Consultation'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Prescribing Doctor:{' '}
                    <strong className="text-slate-700">
                      {formatDoctorDisplayName(enc.doctorName)}
                    </strong>{' '}
                    ({enc.department || 'Clinical Specialty'}) •{' '}
                    <strong className="text-teal-700">
                      {enc.prescriptions.length} medicine(s)
                    </strong>
                  </p>
                </div>

                <button
                  onClick={() => setPreviewEncounter(enc)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-teal-700 text-xs font-semibold border border-slate-200 shadow-xs cursor-pointer transition-colors shrink-0"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Digital Rx Sheet</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
