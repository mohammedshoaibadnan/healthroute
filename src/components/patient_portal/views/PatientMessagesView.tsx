import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Send, 
  Stethoscope, 
  CheckCheck, 
  Clock, 
  ShieldCheck, 
  Building2, 
  PhoneCall, 
  AlertCircle, 
  User, 
  Sparkles 
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { HOSPITAL_INFO } from '../../../data/mockData';
import { PatientMessage } from '../../../types';

export const PatientMessagesView: React.FC = () => {
  const { 
    patientMessages, 
    sendPatientMessage, 
    doctorsDirectory, 
    activePatient 
  } = useApp();

  const [messageText, setMessageText] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('staff-doc-1');
  const [selectedCategory, setSelectedCategory] = useState<PatientMessage['category']>('General Query');

  const currentDoctor = doctorsDirectory.find((d) => d.id === selectedDoctorId) || doctorsDirectory[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    sendPatientMessage(messageText.trim(), currentDoctor.id, currentDoctor.name, selectedCategory);
    setMessageText('');
  };

  const handleQuickQuestion = (q: string) => {
    setMessageText(q);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Clinical Messages & Care Communication</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>HIPAA & NABH Compliant</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Direct communication with Dr. Vikram Malhotra and your attending clinical team at Apex City Hospital
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-slate-500">
          <PhoneCall className="w-3.5 h-3.5 text-teal-600" />
          <span>Care Desk: {HOSPITAL_INFO.clinicHelpline}</span>
        </div>
      </div>

      {/* Main Messaging Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Doctor Selection & Guidelines */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Physician</h3>

            <div className="space-y-2">
              {doctorsDirectory.slice(0, 3).map((doc) => {
                const isSelected = doc.id === selectedDoctorId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctorId(doc.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-teal-50 border-teal-500 shadow-xs'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Avatar src={doc.photoUrl} name={doc.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className={`font-bold text-xs truncate ${isSelected ? 'text-teal-950' : 'text-slate-900'}`}>{doc.name}</p>
                      <p className="text-[10px] text-teal-700 truncate">{doc.specialty}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Questions Helper */}
          <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>Suggested Clinical Queries</span>
            </h3>
            <div className="space-y-2">
              {[
                'My morning blood pressure was 128/82 mmHg. Should I continue the current dose?',
                'I am feeling mild muscle soreness at the groin site, is this normal?',
                'Can I resume light morning walking after my stent procedure?',
              ].map((query, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickQuestion(query)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-teal-50 hover:text-teal-900 text-slate-600 text-[11px] border border-slate-200/80 transition-colors cursor-pointer"
                >
                  "{query}"
                </button>
              ))}
            </div>
          </div>

          {/* Non-Emergency Notice */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-amber-900">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <span>Not for Acute Emergencies</span>
            </p>
            <p className="text-[11px] leading-relaxed">
              Messaging is intended for routine post-discharge check-ins, medication clarification, and lab follow-ups. For acute chest pain, shortness of breath, or emergency symptoms, call <strong>108</strong> immediately.
            </p>
          </div>
        </div>

        {/* Right Column (2 Cols): Chat Thread & Composer */}
        <div className="lg:col-span-2 flex flex-col h-[650px] bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {/* Thread Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Avatar src={currentDoctor.photoUrl} name={currentDoctor.name} size="md" />
              <div>
                <p className="font-bold text-sm text-white">{currentDoctor.name}</p>
                <p className="text-[11px] text-teal-400">{currentDoctor.specialty} • {currentDoctor.hospitalAffiliation}</p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">
              Active Hospital Chat
            </span>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/60">
            {patientMessages.map((msg) => {
              const isPatient = msg.sender === 'patient';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isPatient ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                    <span>{isPatient ? 'You' : msg.doctorName}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div
                    className={`max-w-md p-4 rounded-2xl text-xs leading-relaxed ${
                      isPatient
                        ? 'bg-teal-600 text-white rounded-br-none shadow-xs'
                        : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                  </div>

                  <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1">
                    {isPatient && (
                      <span className="flex items-center gap-0.5 text-teal-700">
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Delivered</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Message Input Composer */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Category:</span>
              <div className="flex items-center gap-1.5">
                {(['General Query', 'Medication Review', 'Lab Follow-up'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-teal-100 text-teal-900 border border-teal-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type your message to the doctor..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={!messageText.trim()}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
