import React, { useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { 
  Search, 
  Stethoscope, 
  Building2, 
  Calendar, 
  Clock, 
  Star, 
  Video, 
  Award, 
  Globe, 
  ArrowRight,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { Avatar } from '../../common/Avatar';
import { filterDoctorDirectory } from '../../../utils/rules';
import { DoctorDirectoryItem } from '../../../types';

export const DoctorDiscoveryView: React.FC = () => {
  const { doctorsDirectory, setIsPatientBookingModalOpen, setSelectedBookingDoctor } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedAvailability, setSelectedAvailability] = useState('All Availability');

  const specialties = [
    'All Specialties',
    'Cardiology & Internal Medicine',
    'Neurology & Stroke Care',
    'Orthopedics & Joint Replacement',
    'Emergency Medicine & Medico-Legal Care',
    'Pulmonology & Respiratory Medicine',
    'Pediatrics & Adolescent Medicine',
  ];

  const filteredDoctors = filterDoctorDirectory(doctorsDirectory, {
    query: searchQuery,
    specialty: selectedSpecialty,
    consultationType: selectedType,
    availability: selectedAvailability,
  });

  const handleBookDoctor = (doc: DoctorDirectoryItem) => {
    setSelectedBookingDoctor(doc);
    setIsPatientBookingModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Discover Doctors & Hospital Services</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Connect with board-certified consultants, interventional specialists, and outpatient clinics at Apex City Hospital
          </p>
        </div>

        <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200 self-start sm:self-auto">
          {filteredDoctors.length} Verified Specialist{filteredDoctors.length !== 1 ? 's' : ''} Available
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by doctor name, medical specialty, conditions treated, or languages spoken..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Medical Specialty</label>
            <select
              value={selectedSpecialty}
              onChange={(e) => setSelectedSpecialty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
            >
              {specialties.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Consultation Mode</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
            >
              <option value="All Types">All Consultation Types</option>
              <option value="In-Person OPD">In-Person OPD Clinic</option>
              <option value="Video Tele-Consult">Video Tele-Consultation</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Availability Window</label>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-teal-500"
            >
              <option value="All Availability">Any Availability</option>
              <option value="Available Today">Available Today</option>
              <option value="Next Available Tomorrow">Available Tomorrow</option>
              <option value="Available This Week">Available This Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDoctors.map((doc) => (
          <div
            key={doc.id}
            className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-3">
              <div className="flex items-start gap-4">
                <Avatar src={doc.photoUrl} name={doc.name} size="xl" className="ring-2 ring-teal-500/20" />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-teal-900 transition-colors truncate">
                      {doc.name}
                    </h3>
                    <div className="flex items-center gap-1 text-amber-500 text-xs shrink-0 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{doc.rating}</span>
                      <span className="text-[10px] text-slate-400 font-normal">({doc.reviewsCount})</span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-teal-700">{doc.specialty}</p>
                  <p className="text-[11px] text-slate-500">{doc.qualifications}</p>
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Award className="w-3 h-3 text-slate-400" />
                    <span>{doc.experienceYears} Years Clinical Experience</span>
                  </p>
                </div>
              </div>

              {/* Bio summary */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                {doc.about}
              </p>

              {/* Badges strip: Languages, Hospital, Consultation Types */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{doc.hospitalAffiliation}</span>
                </div>

                <div className="flex items-center gap-1.5 text-slate-600">
                  <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Languages: {doc.languages.join(', ')}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {doc.consultationTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                    >
                      {type.includes('Video') ? <Video className="w-3 h-3 text-teal-600" /> : <Building2 className="w-3 h-3 text-slate-600" />}
                      <span>{type}</span>
                    </span>
                  ))}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    doc.availability === 'Available Today'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {doc.availability}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Booking Action Bar */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Consultation Fee</p>
                <p className="text-sm font-extrabold text-slate-900 font-mono">₹{doc.consultationFee}</p>
              </div>

              <button
                onClick={() => handleBookDoctor(doc)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
