import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { PatientDocumentCategory } from '../../../types';

export const UploadDocumentModal: React.FC = () => {
  const { isPatientUploadDocOpen, setIsPatientUploadDocOpen, uploadPatientDocument, activePatient } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PatientDocumentCategory>('Patient Uploaded');
  const [source, setSource] = useState('');
  const [fileType, setFileType] = useState<'PDF' | 'IMAGE'>('PDF');
  const [summary, setSummary] = useState('');
  const [tagsStr, setTagsStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isPatientUploadDocOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify a title for your document.');
      return;
    }
    if (!summary.trim()) {
      setErrorMsg('Please provide a brief summary or description of the document.');
      return;
    }

    const tags = tagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    uploadPatientDocument({
      title: title.trim(),
      category,
      source: source.trim() || 'Self-Uploaded by Patient',
      fileType,
      fileSize: `${(Math.random() * 1.5 + 0.4).toFixed(1)} MB`,
      summary: summary.trim(),
      tags: tags.length > 0 ? tags : ['Patient Uploaded', 'External Record'],
    });

    setIsSuccess(true);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  const handleClose = () => {
    setIsPatientUploadDocOpen(false);
    setTitle('');
    setCategory('Patient Uploaded');
    setSource('');
    setSummary('');
    setTagsStr('');
    setErrorMsg('');
    setIsSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <UploadCloud className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">HealthRoute Record Vault</p>
              <h3 className="text-sm font-semibold">Upload Medical Document</h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="p-8 text-center space-y-3 bg-white">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Document Uploaded Successfully</h3>
            <p className="text-xs text-slate-500">
              Your record has been securely added to your medical records file and is accessible by your authorized physicians.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs text-slate-700">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Document Title */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Previous Blood Test from City Clinic / Apollo Health Check"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                required
              />
            </div>

            {/* Category & Format */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Record Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as PatientDocumentCategory)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="Patient Uploaded">Patient Uploaded (General)</option>
                  <option value="Laboratory">Laboratory Investigation</option>
                  <option value="Radiology / Imaging">Radiology / Imaging Scan</option>
                  <option value="Prescription">Previous Prescription</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                  <option value="Medical History">Historical Record</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  File Format
                </label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as 'PDF' | 'IMAGE')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                >
                  <option value="PDF">PDF Document (.pdf)</option>
                  <option value="IMAGE">Scanned Image / Photo (.jpg, .png)</option>
                </select>
              </div>
            </div>

            {/* Issuing Facility / Source */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Issuing Provider / Laboratory (Optional)
              </label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. Dr. Lal PathLabs, Manipal Hospital, Self-Recorded"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>

            {/* Clinical Summary */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Document Summary / Key Findings
              </label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="e.g. Fasting sugar 110 mg/dL, HbA1c 6.2%, cholesterol within normal limits..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
                required
              />
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="e.g. Diabetes, Blood Sugar, 2025 Checkup"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-[11px] text-amber-800">
              <p className="font-semibold">Patient Upload Notice:</p>
              <p className="mt-0.5 text-amber-700">
                Uploaded files are tagged as "Patient Uploaded". Authorised physicians will review and verify records during your clinical consultation.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-all cursor-pointer shadow-xs active:scale-[0.98]"
              >
                Upload Record
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
