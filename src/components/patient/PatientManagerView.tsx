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
  Camera,
  Image as ImageIcon,
  Check,
  Sparkles,
  ExternalLink,
  UploadCloud,
} from 'lucide-react';
import { Patient } from '../../types';
import { Avatar } from '../common/Avatar';

export const PatientManagerView: React.FC = () => {
  const { 
    patients, 
    reconcilePatient, 
    updatePatientPhoto,
    setIsNewRegistrationOpen,
    setIsNewCaseOpen,
    setSelectedCaseId,
    cases
  } = useApp();

  const [activeTab, setActiveTab] = useState<'all' | 'unidentified' | 'reconciled'>('unidentified');
  const [search, setSearch] = useState('');
  const [reconcilingPatient, setReconcilingPatient] = useState<Patient | null>(null);
  const [selectedProfilePatient, setSelectedProfilePatient] = useState<Patient | null>(null);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

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
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Patient Registry & Demographic Records
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {unidentifiedPatients.length} Active Temp IDs
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Centralized directory for outpatient intake, emergency trauma admissions, and ABHA / permanent MRN record reconciliation.
          </p>
        </div>

        <button
          onClick={() => setIsNewRegistrationOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs shadow-teal-600/20 transition-all cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Patient</span>
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
              className={`bg-white rounded-2xl border p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.04)] transition-all flex flex-col justify-between ${
                patient.isUnidentified
                  ? 'border-amber-300 hover:border-amber-400'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProfilePatient(patient)}
                      className="focus:outline-hidden group/avatar cursor-pointer shrink-0"
                      title="Click to view patient profile & photo"
                    >
                      <Avatar
                        src={patient.photoUrl}
                        name={patient.name}
                        gender={patient.gender}
                        size="lg"
                        className="group-hover/avatar:ring-2 group-hover/avatar:ring-teal-500 transition-all shadow-xs"
                      />
                    </button>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedProfilePatient(patient)}
                          className="font-bold text-sm text-slate-900 hover:text-teal-700 transition-colors text-left cursor-pointer"
                        >
                          {patient.name}
                        </button>
                      </div>
                      {patient.isUnidentified && patient.tempId && (
                        <div className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1 inline-block">
                          {patient.tempId}
                        </div>
                      )}
                      {patient.permanentMrn && (
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          MRN: {patient.permanentMrn}
                        </div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      patient.isUnidentified
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}
                  >
                    {patient.isUnidentified ? 'TEMP ID' : 'PERMANENT'}
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedProfilePatient(patient)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                    <span>Profile & Photo</span>
                  </button>

                  {activeCase ? (
                    <button
                      type="button"
                      onClick={() => setSelectedCaseId(activeCase.id)}
                      className="text-teal-600 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Case ({activeCase.bedBay})</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsNewCaseOpen(true)}
                      className="text-slate-500 font-medium hover:text-slate-900 cursor-pointer"
                    >
                      + ER Case
                    </button>
                  )}
                </div>

                {patient.isUnidentified ? (
                  <button
                    type="button"
                    onClick={() => handleStartReconcile(patient)}
                    className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors cursor-pointer"
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

      {/* Patient Profile & Photo Management Modal */}
      {selectedProfilePatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
            {/* Modal Header */}
            <div className="bg-[#0b192e] text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <UserCheck className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Patient Clinical Profile & Identity</h3>
                  <p className="text-xs text-slate-400">
                    {selectedProfilePatient.permanentMrn || selectedProfilePatient.tempId || selectedProfilePatient.id} • Registered {new Date(selectedProfilePatient.registrationTimestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedProfilePatient(null);
                  setIsChangingPhoto(false);
                  setCustomPhotoUrl('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
              {/* Photo & Identity Hero */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/20 border border-slate-200/90 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative shrink-0">
                  <Avatar
                    src={selectedProfilePatient.photoUrl}
                    name={selectedProfilePatient.name}
                    gender={selectedProfilePatient.gender}
                    size="2xl"
                    className="ring-4 ring-white shadow-md rounded-full"
                  />
                  <button
                    type="button"
                    onClick={() => setIsChangingPhoto(!isChangingPhoto)}
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-teal-600 hover:bg-teal-700 text-white shadow-md border-2 border-white transition-all cursor-pointer"
                    title="Change or upload patient photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <h4 className="text-lg font-bold text-slate-900">{selectedProfilePatient.name}</h4>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedProfilePatient.isUnidentified 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                        : 'bg-teal-50 text-teal-800 border border-teal-200'
                    }`}>
                      {selectedProfilePatient.isUnidentified ? 'TEMPORARY ID' : 'PERMANENT RECORD'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-center sm:justify-start gap-3 text-slate-600 flex-wrap">
                    <span><strong>Age:</strong> {selectedProfilePatient.age} yrs {selectedProfilePatient.ageEstimated ? '(Estimated)' : ''}</span>
                    <span>•</span>
                    <span><strong>Gender:</strong> {selectedProfilePatient.gender}</span>
                    <span>•</span>
                    <span><strong>Blood Group:</strong> <span className="font-bold text-slate-900">{selectedProfilePatient.bloodGroup || 'Unknown'}</span></span>
                  </div>

                  <div className="mt-3 flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsChangingPhoto(!isChangingPhoto)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 shadow-2xs transition-all cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isChangingPhoto ? 'Close Photo Options' : 'Update Patient Photo'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Photo Change Panel (Interactive presets and custom photo URL) */}
              {isChangingPhoto && (
                <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200/90 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>Select or Upload Patient Photograph</span>
                    </span>
                    <span className="text-[10px] text-teal-700 font-semibold">Immediate Clinical Sync</span>
                  </div>

                  {/* Photo Presets */}
                  <div>
                    <label className="block text-[11px] text-slate-600 font-semibold mb-1.5">
                      Choose from Verified Clinical Sample Portraits:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const url = '/src/assets/images/pat_rameshwar_reddy_1794455154121.jpg';
                          updatePatientPhoto(selectedProfilePatient.id, url);
                          setSelectedProfilePatient({ ...selectedProfilePatient, photoUrl: url });
                          setIsChangingPhoto(false);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-left transition-all cursor-pointer"
                      >
                        <img 
                          src="/src/assets/images/pat_rameshwar_reddy_1794455154121.jpg" 
                          alt="Preset 1"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-[11px] block truncate">Male (48y)</span>
                          <span className="text-[10px] text-slate-400">Rameshwar R.</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = '/src/assets/images/pat_pooja_venkatesh_1794455154316.jpg';
                          updatePatientPhoto(selectedProfilePatient.id, url);
                          setSelectedProfilePatient({ ...selectedProfilePatient, photoUrl: url });
                          setIsChangingPhoto(false);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-left transition-all cursor-pointer"
                      >
                        <img 
                          src="/src/assets/images/pat_pooja_venkatesh_1794455154316.jpg" 
                          alt="Preset 2"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-[11px] block truncate">Female (29y)</span>
                          <span className="text-[10px] text-slate-400">Pooja V.</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const url = '/src/assets/images/pat_gopal_krishnan_1794455154918.jpg';
                          updatePatientPhoto(selectedProfilePatient.id, url);
                          setSelectedProfilePatient({ ...selectedProfilePatient, photoUrl: url });
                          setIsChangingPhoto(false);
                        }}
                        className="flex items-center gap-2 p-2 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-left transition-all cursor-pointer"
                      >
                        <img 
                          src="/src/assets/images/pat_gopal_krishnan_1794455154918.jpg" 
                          alt="Preset 3"
                          referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover shrink-0" 
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 text-[11px] block truncate">Senior (62y)</span>
                          <span className="text-[10px] text-slate-400">Gopal K.</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Custom URL or clear */}
                  <div className="pt-2 border-t border-teal-200/60 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Or paste external photo URL..."
                      value={customPhotoUrl}
                      onChange={(e) => setCustomPhotoUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                    />
                    <button
                      type="button"
                      disabled={!customPhotoUrl.trim()}
                      onClick={() => {
                        if (!customPhotoUrl.trim()) return;
                        updatePatientPhoto(selectedProfilePatient.id, customPhotoUrl.trim());
                        setSelectedProfilePatient({ ...selectedProfilePatient, photoUrl: customPhotoUrl.trim() });
                        setCustomPhotoUrl('');
                        setIsChangingPhoto(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
                    >
                      Apply
                    </button>
                    {selectedProfilePatient.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          updatePatientPhoto(selectedProfilePatient.id, '');
                          setSelectedProfilePatient({ ...selectedProfilePatient, photoUrl: undefined });
                          setIsChangingPhoto(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Patient Profiling & Uploads Architecture Note (Per User Prompt) */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/90 text-blue-900 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-950">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Patient Profiling & Self-Service File Upload (Roadmap Preview)</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  As planned for the subsequent patient self-service release, patients will be provided dedicated access to upload their past diagnostic PDFs, imaging investigations, prescription scans, and profile photos. Currently, hospital staff maintain authorization to manage identities on the doctor workspace.
                </p>
              </div>

              {/* Demographics & Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">Identification & Government Accounts</span>
                  <div className="text-[11px] space-y-1">
                    <p><span className="text-slate-500">ABHA Health ID:</span> <strong className="font-mono text-slate-800">{selectedProfilePatient.abhaId || 'Not linked / Pending ABDM e-KYC'}</strong></p>
                    <p><span className="text-slate-500">National ID Ref:</span> <span className="font-mono text-slate-800">{selectedProfilePatient.nationalIdPlaceholder || 'Aadhaar / Voter ID not recorded'}</span></p>
                    <p><span className="text-slate-500">Registered By:</span> <span className="text-slate-800">{selectedProfilePatient.registeredBy}</span></p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="font-bold text-slate-800 block text-xs">Contact & Emergency Next of Kin</span>
                  <div className="text-[11px] space-y-1">
                    <p><span className="text-slate-500">Primary Phone:</span> <strong className="font-mono text-slate-800">{selectedProfilePatient.contactNumber || 'None provided'}</strong></p>
                    <p><span className="text-slate-500">Next of Kin:</span> {selectedProfilePatient.nextOfKin ? `${selectedProfilePatient.nextOfKin.name} (${selectedProfilePatient.nextOfKin.relation}) • ${selectedProfilePatient.nextOfKin.phone}` : 'No emergency contact on file'}</p>
                    <p><span className="text-slate-500">Address:</span> {selectedProfilePatient.address || 'Address not documented'}</p>
                  </div>
                </div>
              </div>

              {/* Physical Identification if unidentified */}
              {selectedProfilePatient.isUnidentified && selectedProfilePatient.physicalIdentification && (
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1.5">
                  <span className="font-bold text-amber-950 block text-xs">Physical Identification & Clothing Log</span>
                  <p><strong>Clothing:</strong> {selectedProfilePatient.physicalIdentification.clothing}</p>
                  <p><strong>Distinguishing Marks:</strong> {selectedProfilePatient.physicalIdentification.distinguishingMarks}</p>
                  <p><strong>Found Location:</strong> {selectedProfilePatient.physicalIdentification.foundLocation}</p>
                  <p><strong>Brought By:</strong> {selectedProfilePatient.physicalIdentification.bringingParty} ({selectedProfilePatient.physicalIdentification.bringingOfficerOrStaff})</p>
                </div>
              )}

              {/* Known Allergies */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Documented Drug Allergies</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {selectedProfilePatient.allergies?.join(', ') || 'No known allergies recorded'}
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {selectedProfilePatient.allergies?.length || 0} Listed
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedProfilePatient(null);
                  setIsChangingPhoto(false);
                  setCustomPhotoUrl('');
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

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
