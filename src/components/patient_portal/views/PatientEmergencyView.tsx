import React, { useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  AlertTriangle, 
  PhoneCall, 
  ShieldAlert, 
  HeartPulse, 
  Pill, 
  User, 
  Building2, 
  CheckCircle2, 
  QrCode, 
  Download, 
  Printer, 
  FileCheck,
  Lock
} from 'lucide-react';
import { HOSPITAL_INFO } from '../../../data/mockData';

export const PatientEmergencyView: React.FC = () => {
  const { activePatient, recordEmergencyAccess } = useApp();
  const [hasLoggedAccess, setHasLoggedAccess] = useState(false);

  useEffect(() => {
    if (!hasLoggedAccess) {
      recordEmergencyAccess('Patient viewed personal emergency health card');
      setHasLoggedAccess(true);
    }
  }, [hasLoggedAccess, recordEmergencyAccess]);

  const emergencyContacts = [
    {
      name: activePatient.emergencyContact?.name || 'Sunita Reddy',
      relation: activePatient.emergencyContact?.relation || 'Spouse',
      phone: activePatient.emergencyContact?.phone || '+91 98860 34121',
      primary: true,
    },
    {
      name: 'Dr. Vikram Malhotra',
      relation: 'Attending Cardiologist',
      phone: '+91 80 4968 1000',
      primary: false,
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Emergency Medical Profile & Quick Access</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Emergency Ready Card</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Critical allergies, acute cardiac medical history, emergency next-of-kin contacts, and 24x7 trauma helplines
          </p>
        </div>

        <button
          onClick={() => {
            recordEmergencyAccess('Emergency card exported / printed');
            window.print();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Emergency Card</span>
        </button>
      </div>

      {/* 24x7 Hospital Helpline Hotline Banner */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900 text-white shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-rose-200">
              <AlertTriangle className="w-4 h-4 text-white" />
              <span>National & Hospital Emergency Helplines</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              {HOSPITAL_INFO.emergencyHelpline}
            </h2>
            <p className="text-xs text-rose-100">
              Immediate hospital casualty triage desk & 24x7 cardiac resuscitation bay response
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => alert(`Dialing emergency response helpline: 108 / ${HOSPITAL_INFO.emergencyHelpline}`)}
              className="px-5 py-2.5 rounded-xl bg-white text-rose-800 font-bold text-xs shadow-md hover:bg-rose-50 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
            >
              <PhoneCall className="w-4 h-4 text-rose-700" />
              <span>Call Emergency Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Emergency Wallet Card Component */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Critical Card Details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Card Presentation */}
          <div className="p-6 sm:p-7 rounded-3xl bg-white border-2 border-slate-900 shadow-md space-y-5">
            <div className="flex items-start justify-between pb-4 border-b-2 border-slate-900">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-teal-800 font-extrabold text-sm">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span>{HOSPITAL_INFO.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">EMERGENCY RESCUE MEDICAL IDENTITY</p>
              </div>

              <div className="text-right">
                <span className="text-2xl font-black text-rose-600">{activePatient.bloodGroup || 'A+'}</span>
                <p className="text-[9px] font-bold text-slate-400 uppercase">Blood Group</p>
              </div>
            </div>

            {/* Patient Header */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Patient Name</p>
                <p className="font-extrabold text-slate-900 text-sm">{activePatient.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Date of Birth / Age</p>
                <p className="font-bold text-slate-800">{activePatient.dateOfBirth || '14-May-1978'} ({activePatient.age}y)</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">MRN Number</p>
                <p className="font-mono font-bold text-slate-800">{activePatient.permanentMrn || 'AC-BLR-2026-7819'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">ABHA Account ID</p>
                <p className="font-mono text-slate-700">{activePatient.abhaId || '91-4820-1928-3011'}</p>
              </div>
            </div>

            {/* High-Alert Known Allergies */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
              <div className="flex items-center gap-2 font-bold text-rose-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>SEVERE DOCUMENTED ALLERGIES</span>
              </div>
              <p className="text-xs text-rose-800 font-bold">
                {(activePatient.allergies || ['Penicillin', 'Sulfa drugs']).join(' • ')}
              </p>
              <p className="text-[10px] text-rose-700">Strict contra-indication for penicillin/beta-lactam drugs</p>
            </div>

            {/* Acute Critical Conditions */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1 text-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <HeartPulse className="w-4 h-4 text-teal-600" />
                <span>Active Medical Conditions & Implants</span>
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-0.5 pt-1 text-[11px]">
                <li><strong>Coronary Artery Disease:</strong> Drug-Eluting Stent (DES) implanted in LAD (Nov 2026).</li>
                <li><strong>Dual Antiplatelet Therapy (DAPT):</strong> Patient is on Ticagrelor 90mg + Ecosprin 75mg. High bleeding risk if trauma occurs.</li>
                <li><strong>Essential Hypertension:</strong> Grade 1, controlled on beta-blocker.</li>
              </ul>
            </div>

            {/* Emergency Contacts */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Verified Emergency Next-of-Kin</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {emergencyContacts.map((c, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-500">{c.relation}</p>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 text-white font-bold text-xs flex items-center gap-1 hover:bg-teal-700 transition-colors"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{c.phone}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Access Simulation & Security Explanation */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fast-Track First-Responder QR</h3>
            <div className="w-44 h-44 mx-auto p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center">
              <QrCode className="w-32 h-32 text-slate-900" />
              <span className="text-[9px] font-mono font-bold text-slate-500 mt-1">SECURE TOKEN: HR-EM-7819</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              In an emergency, paramedics or emergency physicians can scan this QR code to access your critical allergy and stent details without requiring phone unlock.
            </p>
          </div>

          {/* Audit Logging & Consent Card */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-600">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Lock className="w-4 h-4 text-teal-600" />
              <span>Emergency Access Security & Audit</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Every access to your emergency record creates an indelible audit log entry with the practitioner's identity, timestamp, and clinical station. You can review all access logs anytime in the <strong>Privacy & Consent</strong> centre.
            </p>
            <div className="pt-2 border-t border-slate-200 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
              <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Audit Stamp: Logged to Central Firestore</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
