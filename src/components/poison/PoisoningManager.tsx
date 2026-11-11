import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Biohazard,
  Activity,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Droplet,
  Printer,
  Eye,
} from 'lucide-react';
import { PoisonCaseModal } from './PoisonCaseModal';
import { evaluateAtropinizationProgress } from '../../utils/rules';

export const PoisoningManager: React.FC = () => {
  const {
    poisonCases,
    currentUser,
    setSelectedDocId,
    setActiveTab,
    generateDocument,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedPoisonId, setSelectedPoisonId] = useState<string | null>(null);

  const filtered = poisonCases.filter((p) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.id.toLowerCase().includes(q) ||
        p.patientName.toLowerCase().includes(q) ||
        p.suspectedAgent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePrint = (caseId: string) => {
    const doc = generateDocument('POISON_PROTOCOL', caseId);
    setSelectedDocId(doc.id);
    setActiveTab('documents');
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Poisoning & Toxicology Emergency Protocols
            </h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {poisonCases.length} Active Poison Cases
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Standardized clinical protocols for Organophosphates, Celphos, Snake Envenomation, Corrosives, and Rodenticides.
          </p>
        </div>
      </div>

      {/* Toxin Emergency Advisory */}
      <div className="bg-rose-900 text-white rounded-xl p-4 shadow-sm flex items-start gap-3">
        <Biohazard className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <h2 className="font-bold text-sm text-rose-100">
            Emergency Toxicology & Antidote Guidelines
          </h2>
          <p className="text-rose-200 leading-relaxed">
            In organophosphate pesticide ingestion, early aggressive Atropinization is crucial until chest secretions clear, heart rate exceeds 80 bpm, and pupils dilate. Pralidoxime (PAM) infusion must follow immediately. For Celphos (Aluminium Phosphide) ingestion, avoid gastric lavage with water (use coconut oil or liquid paraffin to prevent phosphine gas release).
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-xs">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Tox ID, patient name, chemical agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
          />
        </div>
      </div>

      {/* Poison Cases List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((tox) => {
          const atropineScore = evaluateAtropinizationProgress(tox.atropinizationStatus);
          return (
            <div
              key={tox.id}
              className="bg-white rounded-xl border border-rose-200/80 p-4 shadow-xs flex flex-col justify-between hover:border-rose-400 transition-all"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {tox.id}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                        {tox.suspectedAgent}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-slate-900 mt-2">
                      {tox.patientName}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Linked to Emergency Case: <strong>{tox.caseId}</strong>
                    </p>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      atropineScore.isFullyAtropinized
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {atropineScore.isFullyAtropinized ? 'ATROPINIZED' : `${atropineScore.percentage}% ATROPINE`}
                  </span>
                </div>

                {/* Exposure brief */}
                <div className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="text-slate-400">Exposure Route:</span>{' '}
                    <strong>{tox.routeOfExposure}</strong> ({tox.estimatedTimeOfIngestion})
                  </div>
                  <div>
                    <span className="text-slate-400">Container Brought:</span>{' '}
                    <span className={tox.containerBrought ? 'text-emerald-700 font-semibold' : 'text-amber-700'}>
                      {tox.containerBrought ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400">Gastric Lavage:</span>{' '}
                    <span>{tox.decontaminationActions.gastricLavageDone ? `Done (${tox.decontaminationActions.gastricLavageTime})` : 'Not done'}</span>
                  </div>
                </div>

                {/* Antidote doses snapshot */}
                <div className="mt-3 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Antidotes Given ({tox.antidotesAdministered.length}):
                  </span>
                  {tox.antidotesAdministered.length > 0 ? (
                    <div className="space-y-1">
                      {tox.antidotesAdministered.slice(0, 2).map((a) => (
                        <div key={a.id} className="text-[11px] text-slate-700 flex items-center justify-between">
                          <span>
                            <strong>{a.drugName}</strong> ({a.dose})
                          </span>
                          <span className="font-mono text-slate-400">{a.administeredAt}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-[11px]">No doses logged yet</span>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => handlePrint(tox.caseId)}
                  className="text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-400" />
                  <span>Print Record</span>
                </button>

                <button
                  onClick={() => setSelectedPoisonId(tox.id)}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Open Flowsheet & Dosing</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {selectedPoisonId && (
        <PoisonCaseModal
          poisonId={selectedPoisonId}
          onClose={() => setSelectedPoisonId(null)}
        />
      )}
    </div>
  );
};
