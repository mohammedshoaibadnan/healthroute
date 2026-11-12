import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  HeartPulse, 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  Edit3, 
  Save, 
  X, 
  AlertCircle,
  Building2,
  FileText
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';

export const PatientProfileView: React.FC = () => {
  const { activePatient, updatePatientProfile } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [phone, setPhone] = useState(activePatient.contactNumber || '');
  const [address, setAddress] = useState(activePatient.address || '');
  const [selfReportedNotes, setSelfReportedNotes] = useState(activePatient.selfReportedNotes || '');
  const [emergencyName, setEmergencyName] = useState(activePatient.emergencyContact?.name || '');
  const [emergencyPhone, setEmergencyPhone] = useState(activePatient.emergencyContact?.phone || '');
  const [emergencyRelation, setEmergencyRelation] = useState(activePatient.emergencyContact?.relation || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePatientProfile(activePatient.id, {
      contactNumber: phone,
      address,
      selfReportedNotes,
      emergencyContact: {
        name: emergencyName,
        phone: emergencyPhone,
        relation: emergencyRelation,
      },
    });
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Personal Health Profile</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>Verified Hospital Identity</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your personal contact details and review your clinician-verified medical credentials
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Personal Information</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsEditing(false)}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile changes saved successfully and recorded in clinical registry audit log.</span>
        </div>
      )}

      {/* Main Grid: Editable Personal Details vs Clinician-Locked Medical Records */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (1 Col): Patient Card & Identifiers */}
        <div className="space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs text-center space-y-4">
            <Avatar
              src={activePatient.photoUrl}
              name={activePatient.name}
              size="2xl"
              className="mx-auto ring-4 ring-teal-500/20"
            />

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">{activePatient.name}</h2>
              <p className="text-xs text-teal-700 font-semibold">{activePatient.primaryPhysician?.split('(')[0] || 'Dr. Vikram Malhotra'}</p>
              <p className="text-[11px] text-slate-400">Apex City Hospital & Healthcare Centre</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Medical Record #</span>
                <span className="font-mono font-bold text-slate-800">{activePatient.permanentMrn || 'AC-BLR-2026-7819'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold">ABHA Account</span>
                <span className="font-mono text-slate-800">{activePatient.abhaId || '91-4820-1928-3011'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Date of Birth</span>
                <span className="text-slate-800">{activePatient.dateOfBirth || '14-May-1978'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-bold">Blood Group</span>
                <span className="font-bold text-rose-600">{activePatient.bloodGroup || 'A+'}</span>
              </div>
            </div>
          </div>

          {/* Clinician Governance Badge */}
          <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-teal-900">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Clinically Verified Medical File</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Medical conditions, allergies, and surgical histories are locked and maintained exclusively by certified physicians. Patient edits are restricted to personal contact coordinates.
            </p>
          </div>
        </div>

        {/* Right Columns (2 Cols): Editable Information Form & Verified History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Contact Coordinates & Emergency Contact */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600" />
                <span>Contact Coordinates & Emergency Next-of-Kin</span>
              </h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isEditing ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {isEditing ? 'Editing Active' : 'Patient Managed'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Mobile Contact Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                  />
                ) : (
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 font-medium font-mono">
                    {activePatient.contactNumber || '+91 98860 34120'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Emergency Contact Name & Relation
                </label>
                {isEditing ? (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      placeholder="Contact Name"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                    />
                    <input
                      type="text"
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      placeholder="Relation (e.g. Spouse)"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                    />
                  </div>
                ) : (
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 font-medium">
                    {activePatient.emergencyContact?.name || 'Sunita Reddy'} ({activePatient.emergencyContact?.relation || 'Spouse'})
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Emergency Contact Phone
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                  />
                ) : (
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 font-medium font-mono">
                    {activePatient.emergencyContact?.phone || '+91 98860 34121'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Residential Address
                </label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                  />
                ) : (
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-900 font-medium">
                    {activePatient.address || '#45, 2nd Cross, Koramangala 4th Block, Bengaluru - 560034'}
                  </p>
                )}
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Self-Reported Lifestyle & Dietary Notes
                </label>
                {isEditing ? (
                  <textarea
                    rows={2}
                    value={selfReportedNotes}
                    onChange={(e) => setSelfReportedNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                  />
                ) : (
                  <p className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 leading-relaxed">
                    {activePatient.selfReportedNotes || 'Engages in 35-minute morning walks 5 days/week. Strictly avoids deep-fried foods and maintains a low-sodium diet.'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Clinician-Locked Medical Records Section */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">Clinician Verified Medical Records (Locked)</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Official Clinical Authority
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Documented Drug Allergies</span>
                <p className="font-bold text-rose-700">{(activePatient.allergies || ['Penicillin', 'Sulfa drugs']).join(', ')}</p>
                <p className="text-[10px] text-slate-400">Verified during emergency intake admission</p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-slate-400">Cardiovascular Conditions</span>
                <p className="font-bold text-slate-900">Post-PCI LAD Stent • Hypertension</p>
                <p className="text-[10px] text-slate-400">Attending: Dr. Vikram Malhotra (Cardiology)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
