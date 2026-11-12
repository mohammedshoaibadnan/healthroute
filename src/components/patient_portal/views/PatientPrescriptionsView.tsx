import React from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Pill, 
  Clock, 
  ShieldCheck, 
  FileText, 
  Download, 
  Printer, 
  Info, 
  Building2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { HOSPITAL_INFO } from '../../../data/mockData';

export const PatientPrescriptionsView: React.FC = () => {
  const { activePatient, encounters, setPreviewEncounter } = useApp();

  // Find encounters with prescriptions
  const prescriptionEncounters = encounters.filter(
    (e) => e.patientId === activePatient.id && e.prescriptions && e.prescriptions.length > 0
  );

  // Active cardiac medications for Rameshwar Reddy
  const activeMedications = [
    {
      name: 'Tab. Ticagrelor 90 mg',
      generic: 'Platelet aggregation inhibitor (P2Y12 blocker)',
      dosage: '90 mg',
      frequency: '1-0-1 (Twice daily, exactly 12 hours apart)',
      timing: 'With or after food',
      duration: '90 days (Mandatory post-stent course)',
      instructions: 'Critical: Do not discontinue without consulting Dr. Vikram Malhotra. Prevents in-stent thrombosis.',
      prescribedBy: 'Dr. Vikram Malhotra (Cardiology)',
      prescribedDate: '2026-11-11',
      status: 'Active',
    },
    {
      name: 'Tab. Ecosprin 75 mg',
      generic: 'Low-dose enteric-coated Aspirin',
      dosage: '75 mg',
      frequency: '0-1-0 (Once daily post-lunch)',
      timing: 'After Food',
      duration: 'Indefinite long-term secondary prevention',
      instructions: 'Take after substantial afternoon meal with a full glass of water.',
      prescribedBy: 'Dr. Vikram Malhotra (Cardiology)',
      prescribedDate: '2026-11-11',
      status: 'Active',
    },
    {
      name: 'Tab. Atorvastatin 40 mg',
      generic: 'HMG-CoA reductase inhibitor (High-intensity Statin)',
      dosage: '40 mg',
      frequency: '0-0-1 (Once daily at bedtime)',
      timing: 'At Bedtime',
      duration: '90 days with LDL cholesterol review',
      instructions: 'LDL target < 55 mg/dL. Report unexplained muscle soreness.',
      prescribedBy: 'Dr. Vikram Malhotra (Cardiology)',
      prescribedDate: '2026-11-11',
      status: 'Active',
    },
    {
      name: 'Tab. Metoprolol Succinate XL 25 mg',
      generic: 'Cardioselective beta-1 adrenergic blocker',
      dosage: '25 mg',
      frequency: '1-0-0 (Once daily morning)',
      timing: 'Before Food',
      duration: '90 days',
      instructions: 'Target resting heart rate: 60-75 bpm. Monitor morning pulse.',
      prescribedBy: 'Dr. Vikram Malhotra (Cardiology)',
      prescribedDate: '2026-11-11',
      status: 'Active',
    },
    {
      name: 'Tab. Pantoprazole 40 mg',
      generic: 'Proton-pump inhibitor (Gastroprotection)',
      dosage: '40 mg',
      frequency: '1-0-0 (Once daily morning)',
      timing: 'Before Food',
      duration: '60 days',
      instructions: 'Take 30 minutes before breakfast to prevent gastric irritation from DAPT.',
      prescribedBy: 'Dr. Vikram Malhotra (Cardiology)',
      prescribedDate: '2026-11-11',
      status: 'Active',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Prescriptions & Medication Records</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Doctor Approved</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Active medication regimen, dosages, clinician instructions, and downloadable official digital prescriptions
          </p>
        </div>

        <button
          onClick={() => {
            const enc = prescriptionEncounters[0] || encounters[0];
            if (enc) setPreviewEncounter(enc);
            else alert('Official hospital prescription sheet ready for print.');
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto active:scale-[0.98]"
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
            Prescriptions displayed in HealthRoute are read-only and reflect orders authorized by licensed hospital physicians. Do not change, alter, or pause prescribed dosages without direct clinical consultation. For any severe reaction or breathlessness, contact Emergency immediately.
          </p>
        </div>
      </div>

      {/* Active Medications List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Pill className="w-4 h-4 text-teal-600" />
            <span>Active Prescribed Medications ({activeMedications.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400">Current ongoing outpatient regimen</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMedications.map((med, idx) => (
            <div
              key={idx}
              className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-sm">{med.name}</h3>
                    <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.2 rounded border border-emerald-200">
                      {med.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{med.generic}</p>
                </div>

                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
              </div>

              {/* Dosage, Frequency & Timing Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Dosage</span>
                  <p className="font-bold text-slate-800">{med.dosage}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Frequency</span>
                  <p className="font-bold text-slate-800">{med.frequency}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Timing</span>
                  <p className="font-semibold text-teal-700">{med.timing}</p>
                </div>
              </div>

              {/* Clinician Instructions */}
              <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/60 text-[11px] text-slate-700 space-y-1">
                <span className="font-bold text-teal-900">Physician's Directions:</span>
                <p className="leading-relaxed">{med.instructions}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                <span>Prescribed: {med.prescribedDate}</span>
                <span className="text-slate-600 font-medium">{med.prescribedBy}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Consultations with Digital Prescriptions */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">Hospital Consultation Prescriptions File</h3>
        <div className="space-y-3">
          {encounters.map((enc) => (
            <div
              key={enc.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/70 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 text-xs">{enc.date} • {enc.encounterType || 'OPD Consultation'}</span>
                  <span className="text-[10px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {enc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-600">{enc.assessmentDiagnosis || 'Clinical Consultation'}</p>
                <p className="text-[11px] text-slate-400">Attending: Dr. {enc.doctorName} ({enc.department || 'Medicine'})</p>
              </div>

              <button
                onClick={() => setPreviewEncounter(enc)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-teal-700 text-xs font-semibold border border-slate-200 shadow-xs cursor-pointer transition-colors shrink-0"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>View Digital Rx Sheet</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
