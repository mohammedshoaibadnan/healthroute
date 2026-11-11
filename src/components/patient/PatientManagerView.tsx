import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  UserPlus,
  ShieldAlert,
  Search,
  CheckCircle,
  FileText,
  UserCheck,
  AlertTriangle,
  Clock,
  MapPin,
  Tag,
  Shirt,
  X,
  Phone,
} from 'lucide-react';
import { Patient } from '../../types';

export const PatientManagerView: React.FC = () => {
  const { 
    patients, 
    reconcilePatient, 
    setIsNewRegistrationOpen,
    setIsNewCaseOpen,
    setSelectedCaseId,
    cases
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'unidentified' | 'reconciled'>('unidentified');
  const [search, setSearch] = useState('');
  const [reconcilingPatient, setReconcilingPatient] = useState<Patient | null>(null);

  // Reconciliation form states
  const [legalName, setLegalName] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [address, setAddress] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [abhaId, setAbhaId] = useState('');

  const unidentifiedPatients = patients.filter((p) => p.isUnidentified);
  const identifiedPatients = patients.filter((p) => !p.isUnidentified);

  const displayedPatients = patients.filter((p) => {
    if (activeTab === 'unidentified' && !p.isUnidentified) return false;
    if (activeTab === 'reconciled' && p.isUnidentified) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchTemp = p.tempId?.toLowerCase().includes(q);
      const matchMrn = p.permanentMrn?.toLowerCase().includes(q);
      const matchLoc = p.physicalIdentification?.foundLocation.toLowerCase().includes(q);
      return matchName || matchTemp || matchMrn || matchLoc;
    }
    return true;
  });

  const handleStartReconcile = (patient: Patient) => {
    setReconcilingPatient(patient);
    setLegalName('');
    setContactNo('');
    setAddress('');
    setNationalId('');
    setAbhaId('');
  };

  const handleConfirmReconcile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingPatient || !legalName.trim()) return;

    reconcilePatient(reconcilingPatient.id, {
      name: legalName.trim(),
      contactNumber: contactNo.trim(),
      address: address.trim(),
      nationalId: nationalId.trim(),
      abhaId: abhaId.trim(),
    });

    setReconcilingPatient(null);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Patient Intake & Temporary ID Registry
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {unidentifiedPatients.length} Active Temp IDs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Registry for trauma intake, unidentified patient identification, and permanent MRN record reconciliation.
          </p>
        </div>

        <button
          onClick={() => setIsNewRegistrationOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>New Emergency Intake</span>
        </button>
      </div>

      {/* Unidentified Patients Warning Banner */}
      {unidentifiedPatients.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-950 font-bold">
                {unidentifiedPatients.length} Unidentified Patient{unidentifiedPatients.length > 1 ? 's' : ''} Currently Under Treatment:
              </strong>
              <p className="text-amber-800 mt-0.5">
                Ensure physical identification tags, clothing inventories, and police station intimations are maintained. When relatives or police confirm identity, use the <strong>Reconcile</strong> action to merge into a permanent hospital MRN.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center bg-slate-200/60 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('unidentified')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'unidentified'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Unidentified (Temp IDs) ({unidentifiedPatients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reconciled')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'reconciled'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-teal-600" />
            <span>Identified Patients ({identifiedPatients.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Registered ({patients.length})
          </button>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, name, clothes, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:border-teal-500"
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayedPatients.map((patient) => {
          const activeCase = cases.find((c) => c.patientId === patient.id);
          return (
            <div
              key={patient.id}
              className={`bg-white rounded-xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                patient.isUnidentified
                  ? 'border-amber-300 hover:border-amber-400'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-slate-900">{patient.name}</span>
                    </div>
                    {patient.isUnidentified && patient.tempId && (
                      <div className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 mt-1 inline-block">
                        {patient.tempId}
                      </div>
                    )}
                    {patient.permanentMrn && (
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                        MRN: {patient.permanentMrn}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                      patient.isUnidentified
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {patient.isUnidentified ? 'TEMPORARY ID' : 'PERMANENT RECORD'}
                  </span>
                </div>

                {/* Demographics */}
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="text-slate-400">Demographics:</span> {patient.gender} • {patient.age} yrs {patient.ageEstimated ? '(Estimated)' : ''}
                  </div>
                  <div>
                    <span className="text-slate-400">Blood Group:</span> <strong className="text-slate-800">{patient.bloodGroup || 'Unknown'}</strong>
                  </div>
                  {patient.contactNumber && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{patient.contactNumber}</span>
                    </div>
                  )}
                  {patient.nextOfKin && (
                    <div className="text-[11px] text-slate-500">
                      Kin: {patient.nextOfKin.name} ({patient.nextOfKin.relation}) • {patient.nextOfKin.phone}
                    </div>
                  )}
                  {patient.abhaId && (
                    <div className="text-[11px] font-mono text-slate-500">
                      ABHA: {patient.abhaId}
                    </div>
                  )}
                </div>

                {/* Physical identification details if unidentified */}
                {patient.isUnidentified && patient.physicalIdentification && (
                  <div className="mt-3 p-2.5 rounded-lg bg-amber-50/50 border border-amber-200/60 text-[11px] space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <Shirt className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-900">Clothing:</strong> {patient.physicalIdentification.clothing}
                      </div>
                    </div>
                    {patient.physicalIdentification.distinguishingMarks && (
                      <div className="flex items-start gap-1.5">
                        <Tag className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-900">Marks:</strong> {patient.physicalIdentification.distinguishingMarks}
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-amber-700 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-900">Found:</strong> {patient.physicalIdentification.foundLocation}
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-800">
                      Brought: {patient.physicalIdentification.bringingParty} ({patient.physicalIdentification.bringingOfficerOrStaff})
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                {activeCase ? (
                  <button
                    onClick={() => setSelectedCaseId(activeCase.id)}
                    className="text-teal-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>View Case ({activeCase.bedBay})</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsNewCaseOpen(true)}
                    className="text-slate-600 font-medium hover:text-slate-900"
                  >
                    + Open ER Case
                  </button>
                )}

                {patient.isUnidentified ? (
                  <button
                    onClick={() => handleStartReconcile(patient)}
                    className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors"
                  >
                    Reconcile ID
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Reconciled
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reconciliation Modal */}
      {reconcilingPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900">
                  Reconcile Unidentified Patient Record
                </h3>
              </div>
              <button
                onClick={() => setReconcilingPatient(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              Reconciling <strong>{reconcilingPatient.name}</strong> (Temporary ID:{' '}
              <code>{reconcilingPatient.tempId}</code>). This will merge the clinical history, wounds, and
              case sheets into an official permanent hospital MRN.
            </div>

            <form onSubmit={handleConfirmReconcile} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Confirmed Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar Gowda"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98XXX XXXXX"
                    value={contactNo}
                    onChange={(e) => setContactNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    ABHA Health ID (if present)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 91-4920-1102-4412"
                    value={abhaId}
                    onChange={(e) => setAbhaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  National ID (Aadhaar / Voter ID)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aadhaar XXXX-XXXX-2198"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Verified Residential Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. #18, 4th Cross, Malleshwaram, Bengaluru"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReconcilingPatient(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                >
                  Confirm & Assign Permanent MRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
