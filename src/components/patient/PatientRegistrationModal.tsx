import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  X, 
  UserPlus, 
  ShieldAlert, 
  Check, 
  MapPin, 
  Shirt, 
  Tag, 
  Users, 
  Phone,
  FileCheck,
  CreditCard
} from 'lucide-react';
import { Patient } from '../../types';

export const PatientRegistrationModal: React.FC = () => {
  const { 
    isNewRegistrationOpen, 
    setIsNewRegistrationOpen, 
    registerPatient,
    currentUser
  } = useApp();

  const [isUnidentified, setIsUnidentified] = useState(true);

  // Unidentified fields
  const [estimatedAgeRange, setEstimatedAgeRange] = useState('25 - 30 years');
  const [estimatedGender, setEstimatedGender] = useState<'Male' | 'Female' | 'Other' | 'Unknown'>('Male');
  const [bloodGroup, setBloodGroup] = useState<Patient['bloodGroup']>('Unknown');
  const [clothing, setClothing] = useState('');
  const [distinguishingMarks, setDistinguishingMarks] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [bringingParty, setBringingParty] = useState('108 EMRI Ambulance');
  const [bringingOfficerOrStaff, setBringingOfficerOrStaff] = useState('');
  const [belongings, setBelongings] = useState('');

  // Identified fields
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number>(35);
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [contactNumber, setContactNumber] = useState('');
  const [address, setAddress] = useState('');
  const [allergies, setAllergies] = useState('');
  const [nextOfKinName, setNextOfKinName] = useState('');
  const [nextOfKinRelation, setNextOfKinRelation] = useState('');
  const [nextOfKinPhone, setNextOfKinPhone] = useState('');
  const [abhaId, setAbhaId] = useState('');
  const [nationalId, setNationalId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successCreated, setSuccessCreated] = useState<{ id: string; tempId?: string; name: string } | null>(null);

  if (!isNewRegistrationOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isUnidentified) {
      if (!clothing.trim()) {
        setErrorMsg('Please describe clothing worn by the unidentified patient.');
        return;
      }
      if (!foundLocation.trim()) {
        setErrorMsg('Please document the location where the patient was found.');
        return;
      }

      const res = registerPatient({
        isUnidentified: true,
        gender: estimatedGender,
        bloodGroup,
        age: parseInt(estimatedAgeRange.split('-')[0]) || 30,
        ageEstimated: true,
        allergies: ['Unknown / Pending blood screening'],
        physicalIdentification: {
          estimatedAgeRange,
          clothing,
          distinguishingMarks: distinguishingMarks || 'None observed on initial inspection',
          foundLocation,
          bringingParty,
          bringingOfficerOrStaff: bringingOfficerOrStaff || 'Emergency Duty Crew',
          belongingsInventory: belongings
            ? belongings.split(',').map((s) => s.trim())
            : ['Retained in emergency patient locker'],
        },
      });

      setSuccessCreated({ id: res.patient.id, tempId: res.tempId, name: res.patient.name });
    } else {
      if (!fullName.trim()) {
        setErrorMsg('Patient full name is required for standard registration.');
        return;
      }
      if (!contactNumber.trim() && !nextOfKinPhone.trim()) {
        setErrorMsg('At least one emergency contact or next-of-kin telephone is required.');
        return;
      }

      const res = registerPatient({
        isUnidentified: false,
        name: fullName,
        age,
        gender,
        bloodGroup,
        allergies: allergies ? allergies.split(',').map((a) => a.trim()) : ['NKDA'],
        contactNumber,
        address,
        nextOfKin: nextOfKinName
          ? {
              name: nextOfKinName,
              relation: nextOfKinRelation || 'Relative',
              phone: nextOfKinPhone,
            }
          : undefined,
        abhaId,
        nationalIdPlaceholder: nationalId,
      });

      setSuccessCreated({ id: res.patient.id, name: res.patient.name });
    }
  };

  const handleResetAndClose = () => {
    setSuccessCreated(null);
    setErrorMsg('');
    setClothing('');
    setDistinguishingMarks('');
    setFoundLocation('');
    setBelongings('');
    setFullName('');
    setIsNewRegistrationOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        {/* Modal Header */}
        <div className="bg-[#0b192e] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <UserPlus className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Emergency Patient Intake & Registration
              </h2>
              <p className="text-xs text-slate-400">
                Registrar: {currentUser.name} • Station: {currentUser.station}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {successCreated ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
              <Check className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Patient Successfully Registered!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Record saved and indexed into hospital emergency database.
              </p>
            </div>

            {successCreated.tempId ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto text-left">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Temporary Emergency Identifier Generated</span>
                </div>
                <div className="text-2xl font-black font-mono text-amber-900 mt-2">
                  {successCreated.tempId}
                </div>
                <p className="text-xs text-amber-700 mt-1">
                  Tag assigned: <strong>{successCreated.name}</strong>. Wristband printed for trauma bay bed assignment.
                </p>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-md mx-auto text-left">
                <span className="text-xs text-slate-400 font-bold uppercase">Patient Name</span>
                <div className="text-lg font-bold text-slate-900">{successCreated.name}</div>
                <p className="text-xs text-slate-500 mt-0.5">Ready for emergency case sheet creation.</p>
              </div>
            )}

            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleResetAndClose}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs"
              >
                Close & View Board
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Mode Switcher */}
            <div className="p-1 rounded-xl bg-slate-100 flex items-center gap-1 border border-slate-200">
              <button
                type="button"
                onClick={() => setIsUnidentified(true)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isUnidentified
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Unidentified Patient (Generate Temp ID)</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUnidentified(false)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  !isUnidentified
                    ? 'bg-[#0b192e] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>Standard Identified Patient</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {isUnidentified ? (
              /* UNIDENTIFIED PATIENT FIELDS */
              <div className="space-y-3.5">
                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-900 leading-snug">
                  <strong>Unidentified Intake Protocol:</strong> A system-generated Temporary Emergency ID
                  (e.g., <code>TEMP-ER-2026-XXXX</code>) will be allocated. Document physical identifiers, clothing,
                  and bringing party for police coordination and later family reconciliation.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Estimated Age Range
                    </label>
                    <select
                      value={estimatedAgeRange}
                      onChange={(e) => setEstimatedAgeRange(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500 bg-white"
                    >
                      <option value="15 - 20 years">15 - 20 years</option>
                      <option value="20 - 25 years">20 - 25 years</option>
                      <option value="25 - 30 years">25 - 30 years</option>
                      <option value="30 - 35 years">30 - 35 years</option>
                      <option value="35 - 45 years">35 - 45 years</option>
                      <option value="45 - 60 years">45 - 60 years</option>
                      <option value="60+ years (Elderly)">60+ years (Elderly)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Apparent Gender
                    </label>
                    <select
                      value={estimatedGender}
                      onChange={(e) => setEstimatedGender(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500 bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Unknown">Unknown / Indeterminate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group (if quick typed)
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500 bg-white"
                    >
                      <option value="Unknown">Pending Lab / Unknown</option>
                      <option value="O+">O Positive</option>
                      <option value="O-">O Negative (Universal)</option>
                      <option value="A+">A Positive</option>
                      <option value="A-">A Negative</option>
                      <option value="B+">B Positive</option>
                      <option value="B-">B Negative</option>
                      <option value="AB+">AB Positive</option>
                      <option value="AB-">AB Negative</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Shirt className="w-3.5 h-3.5 text-slate-500" />
                    <span>Clothing & Garments Description *</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Red checked half-sleeve shirt, grey trousers, black sandals"
                    value={clothing}
                    onChange={(e) => setClothing(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <span>Distinguishing Physical Marks (Scars, Tattoos, Moles)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 5cm surgical scar right abdomen; OM tattoo on dorsal right hand"
                    value={distinguishingMarks}
                    onChange={(e) => setDistinguishingMarks(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>Found / Incident Location *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Near Indiranagar 100ft road junction"
                      value={foundLocation}
                      onChange={(e) => setFoundLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>Brought In By</span>
                    </label>
                    <select
                      value={bringingParty}
                      onChange={(e) => setBringingParty(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500 bg-white"
                    >
                      <option value="108 EMRI Ambulance">108 GVK EMRI Ambulance</option>
                      <option value="Police Patrol Vehicle / Constable">Police Patrol Vehicle / Constable</option>
                      <option value="Good Samaritan / Bystander">Good Samaritan / Bystander</option>
                      <option value="Private Ambulance">Private Ambulance</option>
                      <option value="Walk-in / Staggered In">Walk-in / Staggered In</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Officer / EMT Name & Badge / Vehicle No
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. PC-3108 Kumar / Ambulance KA-01-G-4011"
                      value={bringingOfficerOrStaff}
                      onChange={(e) => setBringingOfficerOrStaff(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Belongings Inventory (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Black wallet, steel wrist watch, INR 350 cash"
                      value={belongings}
                      onChange={(e) => setBelongings(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* IDENTIFIED PATIENT FIELDS */
              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Narayana Murthy"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Age (Years)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={120}
                      value={age}
                      onChange={(e) => setAge(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500 bg-white"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Blood Group
                    </label>
                    <select
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value as any)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:border-teal-500 bg-white"
                    >
                      <option value="A+">A Positive</option>
                      <option value="A-">A Negative</option>
                      <option value="B+">B Positive</option>
                      <option value="B-">B Negative</option>
                      <option value="AB+">AB Positive</option>
                      <option value="AB-">AB Negative</option>
                      <option value="O+">O Positive</option>
                      <option value="O-">O Negative</option>
                      <option value="Unknown">Unknown</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>Primary Contact No.</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="+91 98XXX XXXXX"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Known Allergies (Comma separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Sulfa drugs (or NKDA)"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Residential Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. #42, Koramangala 5th Block, Bengaluru"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>
                </div>

                {/* Next of kin */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="text-xs font-bold text-slate-800">Next of Kin / Emergency Guardian</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Guardian Name"
                      value={nextOfKinName}
                      onChange={(e) => setNextOfKinName(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Relation (e.g. Spouse, Father)"
                      value={nextOfKinRelation}
                      onChange={(e) => setNextOfKinRelation(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                    <input
                      type="tel"
                      placeholder="Guardian Phone"
                      value={nextOfKinPhone}
                      onChange={(e) => setNextOfKinPhone(e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-white"
                    />
                  </div>
                </div>

                {/* Health ID */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                      <span>ABHA Health Account ID (14 digit)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 91-4820-1928-3011"
                      value={abhaId}
                      onChange={(e) => setAbhaId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      National ID Reference (Aadhaar/Voter)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aadhaar XXXX-XXXX-8910"
                      value={nationalId}
                      onChange={(e) => setNationalId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`px-5 py-2 rounded-lg text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 ${
                  isUnidentified
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {isUnidentified
                    ? 'Generate Temp Emergency ID'
                    : 'Complete Patient Registration'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
