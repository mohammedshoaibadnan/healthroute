export type UserRole = 'doctor' | 'nurse' | 'cmo' | 'records' | 'admin';

export interface StaffUser {
  id: string;
  name: string;
  role: UserRole;
  designation: string;
  department: string;
  employeeCode: string;
  email: string;
  phone: string;
  activeShift: 'Day (08:00 - 16:00)' | 'Evening (16:00 - 00:00)' | 'Night (00:00 - 08:00)' | 'On Call';
  onDuty: boolean;
  station: string;
}

export type TriageLevel = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';

export interface PhysicalIdentification {
  estimatedAgeRange: string;
  clothing: string;
  distinguishingMarks: string; // scars, tattoo, deformities
  foundLocation: string;
  bringingParty: string; // e.g., '108 EMRI Ambulance', 'Traffic Police', 'Bystander'
  bringingOfficerOrStaff?: string;
  contactInfo?: string;
  belongingsInventory: string[];
}

export interface Patient {
  id: string;
  isUnidentified: boolean;
  tempId?: string; // e.g., TEMP-ER-2026-0842
  permanentMrn?: string; // e.g., HR-BLR-98234
  name: string;
  ageEstimated?: boolean;
  age?: number;
  gender: 'Male' | 'Female' | 'Other' | 'Unknown';
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';
  allergies?: string[];
  contactNumber?: string;
  address?: string;
  nextOfKin?: {
    name: string;
    relation: string;
    phone: string;
  };
  abhaId?: string; // Ayushman Bharat Health Account ID (e.g. 14-digit)
  nationalIdPlaceholder?: string; // e.g., Aadhaar / Voter ID mock
  physicalIdentification?: PhysicalIdentification;
  registrationTimestamp: string;
  registeredBy: string;
}

export interface CaseVitals {
  bp: string; // e.g. "120/80"
  pulse: number; // bpm
  spo2: number; // %
  temp: number; // °F
  rr: number; // breaths/min
  gcs: number; // Glasgow Coma Scale 3-15
  bloodSugar?: number; // mg/dL
  painScore?: number; // 0-10
  recordedAt: string;
}

export interface ClinicalNote {
  id: string;
  timestamp: string;
  author: string;
  role: string;
  note: string;
  category: 'assessment' | 'vitals' | 'medication' | 'procedure' | 'handover';
}

export type IncidentCategory = 
  | 'RTA (Road Traffic Accident)'
  | 'Poisoning / Toxin Ingestion'
  | 'Acute Coronary / Cardiac Arrest'
  | 'Physical Assault / Trauma'
  | 'Fall from Height'
  | 'Severe Burn'
  | 'Acute Stroke / CVA'
  | 'Severe Respiratory Distress'
  | 'Pediatric Emergency'
  | 'General Medical Acute';

export type CaseStatus = 
  | 'Active Triage'
  | 'Under Resuscitation'
  | 'Under Evaluation'
  | 'Stabilized'
  | 'Admitted ICU'
  | 'Admitted Ward'
  | 'Transferred'
  | 'Discharged'
  | 'DAMA (Discharge Against Medical Advice)'
  | 'Brought Dead / Expired';

export interface EmergencyCase {
  id: string; // e.g., "CASE-2026-0182"
  patientId: string;
  patientSnapshot: Patient;
  triageLevel: TriageLevel;
  esiScore: number; // 1 (Most acute) to 5 (Non-urgent)
  chiefComplaint: string;
  incidentType: IncidentCategory;
  incidentDetails: {
    location?: string;
    timeOfIncident?: string;
    mechanism?: string;
    broughtBy: string;
    vehicleNo?: string;
  };
  vitals: CaseVitals;
  bedBay: string; // e.g., "Resus Bay 1", "Trauma Bay 2", "Acute Bed 04"
  assignedPhysician: string;
  assignedNurse: string;
  status: CaseStatus;
  isMlc: boolean;
  mlcId?: string;
  isPoisoning: boolean;
  poisonCaseId?: string;
  transferId?: string;
  clinicalNotes: ClinicalNote[];
  createdAt: string;
  updatedAt: string;
}

export interface WoundDetail {
  id: string;
  location: string;
  type: 'Abrasion' | 'Laceration' | 'Contusion (Bruise)' | 'Incised Wound' | 'Stab / Puncture' | 'Fracture' | 'Thermal Burn' | 'Crush Injury';
  dimensions: string; // e.g., "5cm x 2cm x muscle deep"
  margins: string; // e.g., "Clean-cut", "Irregular / contused"
  ageOfInjuryProvisional: string; // e.g., "Fresh, within 2-4 hours"
}

export interface MedicoLegalCase {
  id: string; // e.g., "MLC-2026-0419"
  caseId: string;
  patientId: string;
  patientName: string;
  isUnidentified: boolean;
  policeStation: string; // Jurisdiction PS e.g. "Koramangala Police Station"
  firOrGdNumber?: string;
  intimationSentToPolice: boolean;
  policeIntimationDate?: string;
  broughtByName: string;
  broughtByDesignation: string; // e.g. "Constable #3182 - Wilson Garden PS" or "108 EMT"
  injuryClassification: 'Simple' | 'Grievous' | 'Dangerous to Life' | 'Fatal' | 'Under Observation';
  wounds: WoundDetail[];
  weaponOrAgentSuspected: string;
  intoxicationSuspected: boolean;
  smellOfAlcoholOrAgent: string;
  clothingSealedAndHandedOver: boolean;
  sealedArticlesDescription: string;
  cmoName: string;
  reviewStatus: 'Draft' | 'Pending CMO Review' | 'Signed & Sealed' | 'Archived';
  cmoSignedAt?: string;
  remarks: string;
  legalDisclaimerAcknowledged: boolean;
  updatedAt: string;
}

export interface PoisonAntidoteAdmin {
  id: string;
  drugName: string;
  dose: string;
  route: string;
  administeredAt: string;
  administeredBy: string;
  patientResponse: string;
}

export interface PoisoningCase {
  id: string; // e.g., "TOX-2026-0083"
  caseId: string;
  patientId: string;
  patientName: string;
  suspectedAgent: 'Organophosphate' | 'Carbamate' | 'Aluminium Phosphide (Celphos)' | 'Snake Envenomation' | 'Rodenticide' | 'Prescription / Sedative' | 'Corrosive Acid / Alkali' | 'Unknown Chemical';
  commercialBrandOrLocalName?: string;
  estimatedTimeOfIngestion: string;
  routeOfExposure: 'Oral Ingestion' | 'Bite / Envenomation' | 'Inhalation' | 'Dermal Absorption';
  quantityEstimated?: string;
  containerBrought: boolean;
  vomitusDetails?: string;
  clinicalPresentation: {
    sludgeSigns: boolean; // Salivation, Lacrimation, Urination, Defecation, GI cramps, Emesis
    pupils: 'Pinpoint' | 'Constricted' | 'Normal' | 'Dilated';
    secretions: 'Dry' | 'Moderate' | 'Excessive Frothing';
    fasciculations: boolean;
    convulsions: boolean;
    respiratoryDepression: boolean;
    characteristicOdor: string;
  };
  decontaminationActions: {
    gastricLavageDone: boolean;
    gastricLavageTime?: string;
    activatedCharcoalAdministered: boolean;
    bodyDecontaminationWash: boolean;
  };
  antidotesAdministered: PoisonAntidoteAdmin[];
  atropinizationStatus: {
    isAtropinized: boolean;
    pulseTargetAchieved: boolean; // Pulse > 80-90
    dryAxillae: boolean;
    pupilsDilated: boolean;
    chestClearOfRhonchi: boolean;
    systolicBpAdequate: boolean;
  };
  toxicologySamplesCollected: boolean;
  samplePreservative: string;
  supervisingToxicologistOrCMO: string;
  updatedAt: string;
}

export interface PatientTransfer {
  id: string; // e.g., "TRF-2026-0045"
  caseId: string;
  patientId: string;
  patientName: string;
  originatingHospital: string;
  receivingHospital: string;
  receivingDepartment: string;
  receivingDoctorOrCoordinator: string;
  acceptanceConfirmed: boolean;
  acceptanceReferenceCode?: string;
  clinicalReason: 
    | 'Specialized Neuro-trauma / CT Surgery Intervention'
    | 'Lack of Pediatric Intensive Care (PICU) Bed'
    | 'Immediate Percutaneous Coronary Intervention (PCI)'
    | 'Advanced High-Tension Burn Care'
    | 'Higher Level Mechanical Ventilation / ECMO'
    | 'Family Requested Relocation';
  summaryAtTransfer: {
    triageCategory: string;
    gcsScore: string;
    currentVitals: string;
    interventionsGiven: string;
    airwayStatus: 'Intubated & Bagged/Ventilated' | 'Nasal Cannula / NRBM' | 'Room Air';
    ongoingInfusions: string;
  };
  transportDetails: {
    ambulanceType: 'Advanced Life Support (ALS)' | 'Basic Life Support (BLS)' | 'Cardiac Care Ambulance';
    vehicleRegNumber: string;
    driverOrEMTName: string;
    contactPhone: string;
    accompanyingStaff: string;
    departureTime: string;
    estimatedArrival: string;
    transitChecklistPassed: boolean;
  };
  status: 'Initiated' | 'Acceptance Confirmed' | 'Ambulance En-Route' | 'Handover Completed' | 'Cancelled';
  handoverNotes?: string;
  updatedAt: string;
}

export interface HospitalDocument {
  id: string;
  title: string;
  docType: 'EMERGENCY_CASE_SHEET' | 'MLC_CERTIFICATE' | 'POISON_PROTOCOL' | 'TRANSFER_SUMMARY' | 'TRIAGE_SLIP' | 'DAMA_RECORD';
  caseId: string;
  patientId: string;
  patientName: string;
  isUnidentified: boolean;
  tempId?: string;
  author: string;
  generatedAt: string;
  status: 'Draft' | 'Finalized' | 'Verified';
  summaryExcerpt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: 'PATIENT' | 'CASE' | 'MLC' | 'POISON' | 'TRANSFER' | 'STAFF' | 'SYSTEM';
  targetId: string;
  details: string;
  ipStation: string;
}

export interface IncomingAmbulance {
  id: string;
  ambulanceId: string;
  provider: '108 GVK EMRI' | 'Hospital ALS-1' | 'Private Cardiac Fleet' | 'Apex FastCare';
  vehicleNo: string;
  patientBrief: string;
  suspectedCondition: string;
  triagePriority: TriageLevel;
  vitalsEstimate: string;
  etaMinutes: number;
  crewContact: string;
  preAlertStatus: 'Dispatched' | 'En Route' | 'Arriving Soon' | 'Arrived Bay';
  receivingBayReserved: string;
  acknowledgedByHospital: boolean;
}
