import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Biohazard,
  Activity,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Droplet,
  Printer,
  Sparkles,
} from 'lucide-react';
import { PoisoningCase, PoisonAntidoteAdmin } from '../../types';
import { evaluateAtropinizationProgress } from '../../utils/rules';

interface PoisonCaseModalProps {
  poisonId: string | null;
  onClose: () => void;
}

export const PoisonCaseModal: React.FC<PoisonCaseModalProps> = ({ poisonId, onClose }) => {
  const {
    poisonCases,
    administerAntidote,
    updateAtropinization,
    savePoisonCase,
    currentUser,
    generateDocument,
    setSelectedDocId,
    setActiveTab,
  } = useApp();

  const tox = poisonCases.find((p) => p.id === poisonId);

  // Quick antidote administration states
  const [selectedDrug, setSelectedDrug] = useState('Inj. Atropine Sulphate');
  const [dose, setDose] = useState('2.0 mg IV Bolus');
  const [route, setRoute] = useState('Intravenous');
  const [patientResponse, setPatientResponse] = useState('');

  if (!tox) return null;

  const atropineScore = evaluateAtropinizationProgress(tox.atropinizationStatus);

  const handleAdministerAntidote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dose.trim()) return;

    administerAntidote(tox.id, {
      drugName: selectedDrug,
      dose,
      route,
      patientResponse: patientResponse || 'Dose delivered; vitals monitored',
    });

    setPatientResponse('');
  };

  const handleToggleAtropineParam = (key: keyof PoisoningCase['atropinizationStatus']) => {
    const nextStatus = {
      ...tox.atropinizationStatus,
      [key]: !tox.atropinizationStatus[key],
    };
    // Re-evaluate if all 5 are true
    const check = evaluateAtropinizationProgress(nextStatus);
    nextStatus.isAtropinized = check.isFullyAtropinized;
    updateAtropinization(tox.id, nextStatus);
  };

  const handlePrintProtocol = () => {
    const doc = generateDocument('POISON_PROTOCOL', tox.caseId);
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
              <span className="font-mono text-xs font-bold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800">
                {tox.id}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-600 text-white">
                TOXICOLOGY PROTOCOL
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-bold">
                {tox.suspectedAgent}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold mt-2">
              Acute Poisoning Emergency & Antidote Titration
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Patient: <strong className="text-white">{tox.patientName}</strong> • Linked Case: {tox.caseId}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintProtocol}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-teal-400" />
              <span>Print Tox Flowsheet</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Toxin Details & Exposure Route */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-slate-900 text-sm block">
              1. Ingestion Profile & Toxin Identification
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400 block text-[11px]">Suspected Chemical Agent:</span>
                <strong className="text-slate-900 text-xs">{tox.suspectedAgent}</strong>
                {tox.commercialBrandOrLocalName && (
                  <p className="text-[11px] text-slate-500 mt-0.5">{tox.commercialBrandOrLocalName}</p>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Route & Exposure Time:</span>
                <strong>{tox.routeOfExposure}</strong>
                <p className="text-[11px] text-slate-500 mt-0.5">{tox.estimatedTimeOfIngestion}</p>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Container Brought to ER:</span>
                <span className={`font-semibold ${tox.containerBrought ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {tox.containerBrought ? 'Yes, container submitted' : 'No container brought'}
                </span>
                {tox.vomitusDetails && (
                  <p className="text-[11px] text-slate-500 mt-0.5 truncate">{tox.vomitusDetails}</p>
                )}
              </div>
            </div>
          </div>

          {/* Atropinization Scorecard & Clinical Endpoints */}
          <div className="p-4 bg-white rounded-xl border border-rose-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-rose-100">
              <div>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-600" />
                  <span>2. Organophosphate / Cholinergic Atropinization Scorecard</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Click parameters to toggle clinical endpoints during titration
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                  atropineScore.isFullyAtropinized
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {atropineScore.isFullyAtropinized ? 'FULL ATROPINIZATION ACHIEVED' : `TITRATION PROGRESS: ${atropineScore.percentage}%`}
                </span>
              </div>
            </div>

            {/* Endpoints checklist buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
              {[
                { key: 'pulseTargetAchieved', label: 'Heart Rate > 80 bpm', sub: 'No severe bradycardia' },
                { key: 'dryAxillae', label: 'Dry Axillae', sub: 'Skin sweating ceased' },
                { key: 'pupilsDilated', label: 'Pupils Dilated', sub: 'Miosis resolved (>3-4mm)' },
                { key: 'chestClearOfRhonchi', label: 'Chest Clear of Rhonchi', sub: 'Bronchorrhea ceased' },
                { key: 'systolicBpAdequate', label: 'Systolic BP Adequate', sub: 'SBP > 90-100 mmHg' },
              ].map((item) => {
                const isChecked = tox.atropinizationStatus[item.key as keyof PoisoningCase['atropinizationStatus']];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleToggleAtropineParam(item.key as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isChecked
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs">{item.label}</span>
                      <CheckCircle2 className={`w-4 h-4 ${isChecked ? 'text-emerald-600' : 'text-slate-300'}`} />
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-1 font-normal">{item.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Antidote Administration Log & Quick Dose Injection */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
            <span className="font-bold text-slate-900 text-sm block">
              3. Antidote & Counter-Toxin Administration Log
            </span>

            {/* Quick inject form */}
            <form onSubmit={handleAdministerAntidote} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-semibold text-slate-700 block text-xs">
                + Record Antidote Administration:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedDrug}
                  onChange={(e) => {
                    const drug = e.target.value;
                    setSelectedDrug(drug);
                    if (drug.includes('Atropine')) setDose('2.0 mg IV Bolus');
                    else if (drug.includes('Pralidoxime')) setDose('1.0 g IV Infusion in 100ml NS');
                    else if (drug.includes('Snake')) setDose('10 Vials ASV in 200ml NS');
                    else if (drug.includes('N-Acetylcysteine')) setDose('150 mg/kg IV in 200ml D5W');
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium"
                >
                  <option value="Inj. Atropine Sulphate">Inj. Atropine Sulphate</option>
                  <option value="Inj. Pralidoxime Iodide (PAM)">Inj. Pralidoxime (PAM)</option>
                  <option value="Anti-Snake Venom (ASV) Polyvalent">Anti-Snake Venom (ASV) Polyvalent</option>
                  <option value="Inj. N-Acetylcysteine (NAC)">Inj. N-Acetylcysteine (Paracetamol)</option>
                  <option value="Inj. Naloxone">Inj. Naloxone (Opioid Antagonist)</option>
                  <option value="Inj. Calcium Gluconate 10%">Inj. Calcium Gluconate</option>
                </select>

                <input
                  type="text"
                  placeholder="Dose (e.g. 2mg IV bolus / 1g IV)"
                  value={dose}
                  onChange={(e) => setDose(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />

                <input
                  type="text"
                  placeholder="Patient Response (e.g. Secretions cleared, HR 88)"
                  value={patientResponse}
                  onChange={(e) => setPatientResponse(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Log Antidote Dose</span>
                </button>
              </div>
            </form>

            {/* Administrations list */}
            <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto pt-1 space-y-2">
              {tox.antidotesAdministered.length === 0 ? (
                <p className="text-slate-400 italic text-center py-3">
                  No antidotes administered yet. Record the first dose above.
                </p>
              ) : (
                tox.antidotesAdministered.map((a) => (
                  <div key={a.id} className="pt-2 flex items-start justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900">{a.drugName}</strong>
                        <span className="font-mono text-[11px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.2 rounded border border-teal-200">
                          {a.dose}
                        </span>
                        <span className="text-slate-400">• {a.route}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">Response: {a.patientResponse}</p>
                    </div>

                    <div className="text-right text-[11px] text-slate-400 font-mono">
                      <div>{a.administeredAt}</div>
                      <div className="text-slate-500 font-sans">{a.administeredBy}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Decontamination & Forensic Preservation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 block text-xs">
                4. Decontamination Actions
              </span>
              <div className="text-slate-600 space-y-1">
                <div>
                  <span className="text-slate-400">Gastric Lavage:</span>{' '}
                  <strong className={tox.decontaminationActions.gastricLavageDone ? 'text-emerald-700' : 'text-slate-700'}>
                    {tox.decontaminationActions.gastricLavageDone ? `Done at ${tox.decontaminationActions.gastricLavageTime || 'ER'}` : 'Not done'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400">Activated Charcoal:</span>{' '}
                  <strong>{tox.decontaminationActions.activatedCharcoalAdministered ? 'Administered' : 'Withheld'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Body Wash / Decontamination:</span>{' '}
                  <strong>{tox.decontaminationActions.bodyDecontaminationWash ? 'Completed' : 'Pending'}</strong>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800 block text-xs">
                5. Forensic Toxicology Sample Preservation
              </span>
              <div className="text-slate-600 space-y-1 text-[11px]">
                <div>
                  <span className="text-slate-400">Preserved In:</span>{' '}
                  <strong>{tox.samplePreservative}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Supervising Officer:</span>{' '}
                  <strong>{tox.supervisingToxicologistOrCMO}</strong>
                </div>
                <p className="text-slate-500 italic mt-1">
                  Gastric aspirate and blood samples preserved in saturated sodium chloride solution and wax sealed for State Forensic Science Laboratory (FSL).
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 font-mono">
            Updated: {new Date(tox.updatedAt).toLocaleString()}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold"
          >
            Close Flowsheet
          </button>
        </div>
      </div>
    </div>
  );
};
