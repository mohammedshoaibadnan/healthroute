import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Scale,
  ShieldAlert,
  Plus,
  Trash2,
  FileCheck,
  Send,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { MedicoLegalCase, WoundDetail } from '../../types';
import { validateMLCRequirements } from '../../utils/rules';

interface MLCEditModalProps {
  mlcId: string | null;
  onClose: () => void;
}

export const MLCEditModal: React.FC<MLCEditModalProps> = ({ mlcId, onClose }) => {
  const {
    mlcCases,
    saveMlcDraft,
    signAndSealMlc,
    markPoliceIntimation,
    currentUser,
    generateDocument,
    setSelectedDocId,
    setActiveTab,
  } = useApp();

  const mlc = mlcCases.find((m) => m.id === mlcId);

  // Form states
  const [policeStation, setPoliceStation] = useState(mlc?.policeStation || '');
  const [firOrGdNumber, setFirOrGdNumber] = useState(mlc?.firOrGdNumber || '');
  const [broughtByName, setBroughtByName] = useState(mlc?.broughtByName || '');
  const [broughtByDesignation, setBroughtByDesignation] = useState(mlc?.broughtByDesignation || '');
  const [injuryClassification, setInjuryClassification] = useState<MedicoLegalCase['injuryClassification']>(
    mlc?.injuryClassification || 'Simple'
  );
  const [weaponOrAgentSuspected, setWeaponOrAgentSuspected] = useState(mlc?.weaponOrAgentSuspected || '');
  const [intoxicationSuspected, setIntoxicationSuspected] = useState(mlc?.intoxicationSuspected || false);
  const [smellOfAlcoholOrAgent, setSmellOfAlcoholOrAgent] = useState(mlc?.smellOfAlcoholOrAgent || '');
  const [clothingSealedAndHandedOver, setClothingSealedAndHandedOver] = useState(
    mlc?.clothingSealedAndHandedOver || false
  );
  const [sealedArticlesDescription, setSealedArticlesDescription] = useState(
    mlc?.sealedArticlesDescription || ''
  );
  const [remarks, setRemarks] = useState(mlc?.remarks || '');
  const [wounds, setWounds] = useState<WoundDetail[]>(mlc?.wounds || []);

  // New wound inputs
  const [woundLoc, setWoundLoc] = useState('');
  const [woundType, setWoundType] = useState<WoundDetail['type']>('Laceration');
  const [woundDim, setWoundDim] = useState('');
  const [woundMargins, setWoundMargins] = useState('Irregular, contused');
  const [woundAge, setWoundAge] = useState('Fresh, within 2-4 hours');

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  if (!mlc) return null;

  const isSigned = mlc.reviewStatus === 'Signed & Sealed';
  const canSign = currentUser.role === 'cmo' || currentUser.role === 'doctor' || currentUser.role === 'admin';

  const handleAddWound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woundLoc.trim() || !woundDim.trim()) return;

    const newW: WoundDetail = {
      id: `w-${Date.now()}`,
      location: woundLoc.trim(),
      type: woundType,
      dimensions: woundDim.trim(),
      margins: woundMargins.trim(),
      ageOfInjuryProvisional: woundAge.trim(),
    };

    setWounds([...wounds, newW]);
    setWoundLoc('');
    setWoundDim('');
  };

  const handleRemoveWound = (id: string) => {
    if (isSigned) return;
    setWounds(wounds.filter((w) => w.id !== id));
  };

  const handleSaveDraft = () => {
    saveMlcDraft({
      id: mlc.id,
      policeStation,
      firOrGdNumber,
      broughtByName,
      broughtByDesignation,
      injuryClassification,
      weaponOrAgentSuspected,
      intoxicationSuspected,
      smellOfAlcoholOrAgent,
      clothingSealedAndHandedOver,
      sealedArticlesDescription,
      remarks,
      wounds,
      legalDisclaimerAcknowledged: true,
      reviewStatus: isSigned ? 'Signed & Sealed' : 'Pending CMO Review',
    });
    alert('Medico-Legal Case (MLC) draft saved successfully.');
  };

  const handleSignAndSeal = () => {
    const check = validateMLCRequirements({
      policeStation,
      broughtByName,
      injuryClassification,
      wounds,
      legalDisclaimerAcknowledged: true,
    });

    if (!check.isValid) {
      setValidationErrors(check.missingFields);
      return;
    }

    setValidationErrors([]);
    // Save draft first
    saveMlcDraft({
      id: mlc.id,
      policeStation,
      firOrGdNumber,
      broughtByName,
      broughtByDesignation,
      injuryClassification,
      weaponOrAgentSuspected,
      intoxicationSuspected,
      smellOfAlcoholOrAgent,
      clothingSealedAndHandedOver,
      sealedArticlesDescription,
      remarks,
      wounds,
      legalDisclaimerAcknowledged: true,
    });

    const success = signAndSealMlc(mlc.id);
    if (success) {
      alert(`MLC #${mlc.id} successfully Signed & Sealed under digital authority of ${currentUser.name}.`);
    }
  };

  const handleDispatchPoliceIntimation = () => {
    const stationDiary = prompt('Enter Police Station GD / Station Diary / Memo receipt number:', 'GD-2026-');
    if (stationDiary) {
      markPoliceIntimation(mlc.id, stationDiary);
      setFirOrGdNumber(stationDiary);
      alert('Police Intimation Memo marked as dispatched and acknowledged.');
    }
  };

  const handlePrintCertificate = () => {
    const doc = generateDocument('MLC_CERTIFICATE', mlc.caseId);
    setSelectedDocId(doc.id);
    setActiveTab('documents');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#0b192e] text-white p-4 sm:p-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                {mlc.id}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded ${
                  isSigned ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                {mlc.reviewStatus.toUpperCase()}
              </span>
              {mlc.isUnidentified && (
                <span className="text-xs bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded">
                  UNIDENTIFIED PATIENT
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold mt-2">
              Medico-Legal Examination & Injury Register
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Patient: <strong className="text-white">{mlc.patientName}</strong> • Linked Case: {mlc.caseId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintCertificate}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>Print Form MLC-01</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-purple-50/70 border-b border-purple-200/80 px-4 py-2 text-[11px] text-purple-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-purple-700 shrink-0" />
            <span>
              <strong>Statutory Requirement:</strong> Medico-Legal decisions and submissions remain under authorized Casualty Medical Officer control. No automated police notifications or legal judgements are made.
            </span>
          </div>
          {isSigned && (
            <span className="shrink-0 text-emerald-800 font-bold flex items-center gap-1 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              <Lock className="w-3 h-3" /> Sealed by CMO
            </span>
          )}
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {validationErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
              <strong className="block font-bold">Cannot Sign MLC — Incomplete Statutory Documentation:</strong>
              <ul className="list-disc pl-5 text-[11px]">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Police Station & Intimation Dispatch Ribbon */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-900 text-sm">
                1. Police Jurisdiction & Intimation Status
              </span>
              {mlc.intimationSentToPolice ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Intimation Dispatched to Chowki</span>
                </span>
              ) : (
                <span className="text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Police Intimation Pending</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Jurisdiction Police Station (Thana) *
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. Wilson Garden Traffic Police Station, Bengaluru"
                  value={policeStation}
                  onChange={(e) => setPoliceStation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Station Diary / GD / FIR Number
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. GD Entry #412/2026 or Pending"
                  value={firOrGdNumber}
                  onChange={(e) => setFirOrGdNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono"
                />
              </div>

              <div className="flex items-end">
                {!mlc.intimationSentToPolice ? (
                  <button
                    type="button"
                    onClick={handleDispatchPoliceIntimation}
                    className="w-full py-2 rounded-lg bg-[#0b192e] hover:bg-slate-800 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5 text-teal-400" />
                    <span>Dispatch Police Intimation Memo</span>
                  </button>
                ) : (
                  <div className="w-full py-2 px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium">
                    Dispatched on {new Date(mlc.policeIntimationDate || '').toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Person / Officer Bringing Patient *
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. HC-4910 Ramesh or 108 EMT Vinod"
                  value={broughtByName}
                  onChange={(e) => setBroughtByName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Official Designation / Station Unit
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. Duty Officer, Wilson Garden Traffic PS"
                  value={broughtByDesignation}
                  onChange={(e) => setBroughtByDesignation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Injury Classification & Medical Officer Opinion */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-900 text-sm block">
              2. Provisional Medical Opinion & Injury Nature
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Provisional Injury Classification *
                </label>
                <select
                  disabled={isSigned}
                  value={injuryClassification}
                  onChange={(e) => setInjuryClassification(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-bold"
                >
                  <option value="Simple">Simple Injury</option>
                  <option value="Grievous">Grievous Hurt (Sec 320 IPC / BNS equivalent)</option>
                  <option value="Dangerous to Life">Dangerous to Life (Imminent threat to life)</option>
                  <option value="Fatal">Fatal / Brought Dead</option>
                  <option value="Under Observation">Under Observation (Pending imaging/CT scan)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Suspected Weapon / Impact Mechanism
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. Blunt impact vehicular crash / sharp edged instrument"
                  value={weaponOrAgentSuspected}
                  onChange={(e) => setWeaponOrAgentSuspected(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 mb-1">
                  <input
                    type="checkbox"
                    disabled={isSigned}
                    checked={intoxicationSuspected}
                    onChange={(e) => setIntoxicationSuspected(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Smell of Alcohol / Intoxication Suspected</span>
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. Smell of alcohol present on breath / Nil odor detected"
                  value={smellOfAlcoholOrAgent}
                  onChange={(e) => setSmellOfAlcoholOrAgent(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs mt-1"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 mb-1">
                  <input
                    type="checkbox"
                    disabled={isSigned}
                    checked={clothingSealedAndHandedOver}
                    onChange={(e) => setClothingSealedAndHandedOver(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <span>Clothing / Evidence Sealed with Hospital Wax Stamp</span>
                </label>
                <input
                  type="text"
                  disabled={isSigned}
                  placeholder="e.g. 1 blood-stained shirt in parcel #AC-MLC-842"
                  value={sealedArticlesDescription}
                  onChange={(e) => setSealedArticlesDescription(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* Detailed Wounds Chart */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 text-sm">
                3. Detailed Anatomical Wound Chart ({wounds.length} Recorded)
              </span>
              <span className="text-[11px] text-slate-500">
                Document dimensions, margins, and provisional age
              </span>
            </div>

            {/* Existing wounds list */}
            {wounds.length === 0 ? (
              <p className="text-slate-400 italic py-2 text-center">
                No wounds catalogued yet. Add at least one physical wound or external observation below.
              </p>
            ) : (
              <div className="space-y-2">
                {wounds.map((w, index) => (
                  <div
                    key={w.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">
                          #{index + 1}. {w.location}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          {w.type}
                        </span>
                      </div>
                      <div className="text-slate-600 mt-1 space-y-0.5">
                        <div>
                          <strong className="text-slate-700">Dimensions:</strong> {w.dimensions}
                        </div>
                        <div>
                          <strong className="text-slate-700">Margins:</strong> {w.margins} •{' '}
                          <strong className="text-slate-700">Age:</strong> {w.ageOfInjuryProvisional}
                        </div>
                      </div>
                    </div>

                    {!isSigned && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWound(w.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="Remove Wound"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add new wound form */}
            {!isSigned && (
              <form onSubmit={handleAddWound} className="pt-2 border-t border-slate-100 space-y-2">
                <span className="font-semibold text-slate-700 block text-xs">+ Add Wound Finding:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Anatomical Location (e.g. Left Forehead)"
                    value={woundLoc}
                    onChange={(e) => setWoundLoc(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                  <select
                    value={woundType}
                    onChange={(e) => setWoundType(e.target.value as any)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                  >
                    <option value="Laceration">Laceration</option>
                    <option value="Abrasion">Abrasion / Grazed Burn</option>
                    <option value="Contusion (Bruise)">Contusion (Bruise / Hematoma)</option>
                    <option value="Incised Wound">Incised Wound (Clean Cut)</option>
                    <option value="Stab / Puncture">Stab / Puncture Wound</option>
                    <option value="Fracture">Fracture / Deformity</option>
                    <option value="Thermal Burn">Thermal Burn</option>
                    <option value="Crush Injury">Crush Injury</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Dimensions (e.g. 5cm x 2cm x bone deep)"
                    value={woundDim}
                    onChange={(e) => setWoundDim(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Margins (e.g. Irregular contused edges)"
                    value={woundMargins}
                    onChange={(e) => setWoundMargins(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Age (e.g. Fresh within 2-4 hours)"
                    value={woundAge}
                    onChange={(e) => setWoundAge(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              General Remarks & Police Chowki Liaison Notes
            </label>
            <textarea
              rows={2}
              disabled={isSigned}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Patient unconscious on arrival. Relative Sri Anand arrived and identified patient. GD extract provided to police."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500">
            CMO Authority: <strong className="text-slate-800">{mlc.cmoName}</strong>{' '}
            {mlc.cmoSignedAt && `• Signed on ${new Date(mlc.cmoSignedAt).toLocaleString()}`}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold"
            >
              Close
            </button>

            {!isSigned && (
              <>
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  onClick={handleSignAndSeal}
                  className="px-5 py-2 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold flex items-center gap-1.5 shadow-sm"
                  title={canSign ? 'Formally sign and stamp MLC document' : 'Requires CMO or Doctor role'}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign & Seal MLC (CMO)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
