import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  HeartPulse, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  Activity, 
  Pill, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  TrendingUp,
  User,
  Info
} from 'lucide-react';
import { filterPatientAppointments } from '../../../utils/rules';

export const PatientHealthView: React.FC = () => {
  const { 
    activePatient, 
    encounters, 
    labReports, 
    appointments, 
    setPreviewEncounter, 
    setPreviewLabReport,
    setActiveTab
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'conditions' | 'vitals' | 'allergies'>('timeline');

  // Build unified chronological timeline
  interface TimelineEvent {
    id: string;
    date: string;
    title: string;
    category: 'Consultation' | 'Investigation / Lab' | 'Procedure / Surgery' | 'Emergency Intake';
    provider: string;
    details: string;
    status: string;
    isVerified: boolean;
    rawEncounter?: any;
    rawLab?: any;
  }

  const timelineEvents: TimelineEvent[] = [
    {
      id: 'evt-1',
      date: '2026-11-11',
      title: 'Primary Percutaneous Coronary Intervention (PCI)',
      category: 'Procedure / Surgery',
      provider: 'Dr. Vikram Malhotra • Apex Heart Cath Lab',
      details: 'Emergency stent deployment (DES 3.0x24mm) to left anterior descending artery. Complete revascularization achieved.',
      status: 'Completed & Verified',
      isVerified: true,
    },
    {
      id: 'evt-2',
      date: '2026-11-11',
      title: 'High-Sensitivity Troponin-I & Lipid Panel Investigation',
      category: 'Investigation / Lab',
      provider: 'Apex Central Diagnostic Pathology',
      details: 'Troponin-I 1420 pg/mL, Total Cholesterol 238 mg/dL, LDL 158 mg/dL, Creatinine 1.04 mg/dL.',
      status: 'Finalized',
      isVerified: true,
      rawLab: labReports.find((l) => l.patientId === activePatient.id),
    },
    {
      id: 'evt-3',
      date: '2026-11-11',
      title: 'Emergency Resuscitation & Acute Intake',
      category: 'Emergency Intake',
      provider: 'Sister Rekha Varma • Triage Bay 1',
      details: 'Initial triage presentation for acute chest discomfort. Blood pressure 130/82, SpO2 98%, HR 76.',
      status: 'Discharged to OPD',
      isVerified: true,
    },
    {
      id: 'evt-4',
      date: '2025-08-14',
      title: 'Annual Executive Health Checkup',
      category: 'Consultation',
      provider: 'Corporate Wellness Panel (Dr. Lal PathLabs)',
      details: 'Baseline routine evaluation. Fasting blood sugar 98 mg/dL, HbA1c 5.8%, normal renal function.',
      status: 'Historical Record',
      isVerified: false,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">My Health & Medical History</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Clinician-Verified</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Comprehensive chronological health timeline, diagnoses, verified conditions, and physiological parameters
          </p>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 text-xs">
          {[
            { id: 'timeline', label: 'Health Timeline' },
            { id: 'conditions', label: 'Conditions & History' },
            { id: 'vitals', label: 'Vitals Tracker' },
            { id: 'allergies', label: 'Allergies & Alerts' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Safety Notice regarding verified vs self-reported data */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900">Clinician Record Integrity Guarantee</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Medical diagnoses, operative procedure notes, and laboratory impressions are entered and locked by authorised hospital physicians. Patients may review, download, and share these records, but clinician-verified entries cannot be altered independently.
          </p>
        </div>
      </div>

      {/* SUB-TAB 1: HEALTH TIMELINE */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-6">
          <div className="relative pl-6 sm:pl-8 border-l-2 border-teal-500/30 space-y-8 my-4">
            {timelineEvents.map((event, index) => (
              <div key={event.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[35px] sm:-left-[43px] top-1 w-8 h-8 rounded-full bg-white border-2 border-teal-600 text-teal-600 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
                  {event.category === 'Procedure / Surgery' ? (
                    <Activity className="w-4 h-4 text-teal-600" />
                  ) : event.category === 'Investigation / Lab' ? (
                    <FileText className="w-4 h-4 text-teal-600" />
                  ) : (
                    <Clock className="w-4 h-4 text-teal-600" />
                  )}
                </div>

                {/* Event Card */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {event.date}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {event.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {event.isVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span>Clinician Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          <span>Patient Provided</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{event.details}</p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="font-medium text-slate-700">{event.provider}</span>
                    {event.rawLab && (
                      <button
                        onClick={() => setPreviewLabReport(event.rawLab)}
                        className="text-teal-700 font-semibold hover:underline cursor-pointer"
                      >
                        View Official Lab Report →
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: CONDITIONS & MEDICAL HISTORY */}
      {activeSubTab === 'conditions' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Verified Chronic Conditions */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Clinician-Recorded Conditions</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {(activePatient.existingConditions || [
                'Coronary Artery Disease (CAD)',
                'Status Post Primary PCI with Drug-Eluting Stent in LAD',
                'Essential Hypertension (Stage 1)',
                'Dyslipidemia',
              ]).map((cond, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">{cond}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Diagnosed & monitored by Dr. Vikram Malhotra (Cardiology)</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Clinician Verified Medical History */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Verified Past Medical History</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Official Chart
              </span>
            </div>

            <div className="space-y-2.5">
              {(activePatient.verifiedMedicalHistory || [
                'Successful Drug-Eluting Stent (DES) to proximal-mid LAD on 11-Nov-2026 at Apex Heart Cath Lab',
                'Hypertension diagnosed in 2021, maintained on oral beta-blocker',
                'No previous surgical history or adverse anesthetic events',
              ]).map((hist, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
                  <p className="font-semibold text-slate-800 leading-relaxed">{hist}</p>
                </div>
              ))}
            </div>

            {/* Self-Reported Lifestyle Notes */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Patient Self-Reported Lifestyle Notes
              </p>
              <div className="p-3 rounded-xl bg-teal-50/50 border border-teal-200/60 text-xs text-slate-700 leading-relaxed">
                {activePatient.selfReportedNotes || 'Engages in 35-minute morning walks 5 days/week. Strictly avoids deep-fried foods and maintains a low-sodium diet.'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: VITALS TRACKER */}
      {activeSubTab === 'vitals' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Blood Pressure</span>
              <p className="text-2xl font-extrabold text-slate-900">126 / 82 <span className="text-xs font-normal text-slate-500">mmHg</span></p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Normal Post-Stent Target
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resting Heart Rate</span>
              <p className="text-2xl font-extrabold text-slate-900">74 <span className="text-xs font-normal text-slate-500">bpm</span></p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> On Metoprolol XL 25mg
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Oxygen Saturation (SpO2)</span>
              <p className="text-2xl font-extrabold text-slate-900">98 <span className="text-xs font-normal text-slate-500">%</span></p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Room Air Normal
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fasting Blood Sugar</span>
              <p className="text-2xl font-extrabold text-slate-900">98 <span className="text-xs font-normal text-slate-500">mg/dL</span></p>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Euglycemic Normal
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Recent Physiological Observations</h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="px-3.5 py-2.5">Date & Time</th>
                    <th className="px-3.5 py-2.5">Blood Pressure</th>
                    <th className="px-3.5 py-2.5">Pulse</th>
                    <th className="px-3.5 py-2.5">SpO2</th>
                    <th className="px-3.5 py-2.5">Temperature</th>
                    <th className="px-3.5 py-2.5">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="px-3.5 py-2 font-mono text-[11px]">2026-11-11 08:35 AM</td>
                    <td className="px-3.5 py-2 font-bold text-slate-900">130/82 mmHg</td>
                    <td className="px-3.5 py-2">76 bpm</td>
                    <td className="px-3.5 py-2">98%</td>
                    <td className="px-3.5 py-2">98.4°F</td>
                    <td className="px-3.5 py-2 text-teal-700 font-medium">Sister Rekha Varma (Triage Desk)</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-mono text-[11px]">2026-11-11 06:50 AM</td>
                    <td className="px-3.5 py-2 font-bold text-rose-700">84/52 mmHg (Hypotension)</td>
                    <td className="px-3.5 py-2 font-bold text-rose-700">128 bpm</td>
                    <td className="px-3.5 py-2 font-bold text-rose-700">86%</td>
                    <td className="px-3.5 py-2">97.8°F</td>
                    <td className="px-3.5 py-2 text-slate-500">Initial ER Intake Presentation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ALLERGIES & ALERTS */}
      {activeSubTab === 'allergies' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Documented Drug & Food Allergies</h3>
              </div>
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Critical Safety Alert
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(activePatient.allergies || ['Penicillin (causes urticaria & edema)', 'Sulfa drugs']).map((alg, i) => (
                <div key={i} className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-rose-950 text-sm">{alg}</p>
                    <span className="text-[10px] font-bold uppercase text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      Severe
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800">
                    Flagged in clinical prescribing portal. All contra-indicated penicillin/cephalosporin cross-derivatives are strictly blocked.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
