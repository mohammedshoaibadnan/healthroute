export type UserRole = 'doctor' | 'nurse' | 'cmo' | 'records' | 'admin' | 'patient';

export type PatientPortalTab =
  | 'patient-home'
  | 'patient-health'
  | 'patient-doctors'
  | 'patient-appointments'
  | 'patient-prescriptions'
  | 'patient-reports'
  | 'patient-messages'
  | 'patient-notifications'
  | 'patient-emergency'
  | 'patient-privacy'
  | 'patient-profile';

export type PatientTriageStatus = 'Stable' | 'Critical' | 'Waiting' | 'Under Observation';

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
  photoUrl?: string;
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
  dateOfBirth?: string;
  existingConditions?: string[];
  currentMedications?: string[];
  verifiedMedicalHistory?: string[];
  selfReportedNotes?: string;
  nextOfKin?: {
    name: string;
    relation: string;
    phone: string;
  };
  emergencyContact?: {
    name: string;
    relation: string;
    phone: string;
  };
  primaryPhysician?: string;
  abhaId?: string; // Ayushman Bharat Health Account ID (e.g. 14-digit)
  nationalIdPlaceholder?: string; // e.g., Aadhaar / Voter ID mock
  physicalIdentification?: PhysicalIdentification;
  registrationTimestamp: string;
  registeredBy: string;
  photoUrl?: string;
  triageStatus?: PatientTriageStatus;
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
  weight?: number; // kg
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

export type AppointmentType = 
  | 'New Consultation'
  | 'Follow-up Review'
  | 'Chronic Care Review'
  | 'Post-Operative Check'
  | 'Preventive Health Assessment'
  | 'Specialist Referral';

export type AppointmentStatus =
  | 'Requested'
  | 'Confirmed'
  | 'Scheduled'
  | 'Checked In'
  | 'Waiting'
  | 'In Consultation'
  | 'Completed'
  | 'Cancelled'
  | 'Rescheduled'
  | 'No Show';

export interface Appointment {
  id: string; // e.g. "APT-2026-012"
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  patientPhone: string;
  doctorId?: string;
  doctorName: string;
  department?: string;
  date: string;
  timeSlot: string;
  tokenNumber: number;
  type: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint: string;
  consultationMode?: 'In-Person OPD' | 'Video Tele-Consult';
  hospitalName?: string;
  roomNo?: string;
  roomNumber?: string;
  notes?: string;
  patientPhotoUrl?: string;
  doctorPhotoUrl?: string;
  vitalsSnapshot?: CaseVitals;
  triageStatus?: PatientTriageStatus;
  requestedByPatient?: boolean;
  cancellationReason?: string;
  createdAt?: string;
}

export interface PrescriptionItem {
  id?: string;
  drugName?: string;
  medicineName?: string;
  dosage: string; // e.g. "500 mg"
  frequency: string; // e.g. "1-0-1 (Twice daily)"
  duration: string; // e.g. "5 days"
  route?: string;
  timing?: 'Before Food' | 'After Food' | 'With Food' | 'At Bedtime' | 'As Needed';
  instructions?: string;
}

export interface ClinicalEncounter {
  id: string; // e.g. "ENC-2026-034"
  appointmentId?: string;
  patientId: string;
  patientName: string;
  doctorId?: string;
  doctorName: string;
  doctorDesignation?: string;
  department?: string;
  date: string;
  type?: string;
  encounterType?: 'OPD Consultation' | 'Inpatient Round' | 'Specialist Assessment' | 'Tele-consult';
  chiefComplaint: string;
  subjectiveHistory?: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  examinationFindings?: string;
  vitals?: CaseVitals;
  assessmentDiagnosis?: string;
  diagnosis?: string;
  prescriptions: PrescriptionItem[];
  orderedInvestigations?: string[];
  orderedLabs?: string[];
  followUpDate?: string;
  clinicalAdvice?: string;
  adviceNotes?: string;
  status: 'Draft' | 'Finalized' | 'Signed';
  updatedAt?: string;
}

export interface FollowUpReminder {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  dueDate: string;
  reason: string;
  condition?: string;
  category?: 'Chronic Disease Review' | 'Post-Surgical Review' | 'Lab Result Check' | 'Medication Titration' | 'Immunization';
  urgency?: 'routine' | 'important' | 'urgent';
  status?: 'pending' | 'contacted' | 'completed';
  completed?: boolean;
  attendingDoctor?: string;
}

export interface LabParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'Normal' | 'High' | 'Low' | 'Critical';
}

export interface DiagnosticLabReport {
  id: string; // e.g. "LAB-2026-081"
  patientId: string;
  patientName: string;
  testName: string;
  category: 'Biochemistry' | 'Hematology' | 'Microbiology' | 'Cardiology' | 'Radiology / Imaging';
  sampleDate?: string;
  collectedAt?: string;
  reportedDate?: string;
  orderingDoctor?: string;
  parameters: LabParameter[];
  impression?: string;
  clinicalNotes?: string;
  criticalPanicValue?: boolean;
  reviewedBy?: string;
  status: 'Finalized' | 'Pending Review' | 'Critical Panic Alert' | 'Reviewed';
}

export interface DoctorDirectoryItem {
  id: string;
  name: string;
  specialty: string;
  subSpecialty?: string;
  qualifications: string;
  experienceYears: number;
  hospitalAffiliation: string;
  department: string;
  languages: string[];
  consultationFee: number;
  availability: 'Available Today' | 'Next Available Tomorrow' | 'Available This Week';
  availableSlots: string[];
  consultationTypes: ('In-Person OPD' | 'Video Tele-Consult')[];
  rating: number;
  reviewsCount: number;
  about: string;
  photoUrl?: string;
}

export type PatientDocumentCategory =
  | 'Medical History'
  | 'Consultation'
  | 'Prescription'
  | 'Laboratory'
  | 'Radiology / Imaging'
  | 'Discharge Summary'
  | 'Procedure / Surgery'
  | 'Patient Uploaded';

export interface PatientDocument {
  id: string;
  patientId: string;
  title: string;
  category: PatientDocumentCategory;
  source: string; // e.g. "Apex City Hospital - Dr. Vikram Malhotra" or "Self-Uploaded"
  date: string;
  isVerified: boolean;
  fileType: 'PDF' | 'IMAGE' | 'DICOM';
  fileSize: string;
  summary: string;
  tags: string[];
  downloadUrl?: string;
}

export interface PatientMessage {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorPhotoUrl?: string;
  sender: 'patient' | 'doctor' | 'system';
  text: string;
  timestamp: string;
  isRead: boolean;
  category?: 'General Query' | 'Medication Review' | 'Lab Follow-up' | 'Appointment';
}

export interface PatientNotification {
  id: string;
  patientId: string;
  category: 'appointment' | 'report' | 'prescription' | 'reminder' | 'announcement';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionTab?: PatientPortalTab;
  priority: 'high' | 'normal' | 'low';
}

export interface PrivacyConsentSettings {
  emergencyAccessGranted: boolean;
  shareWithSpecialists: boolean;
  familyAccessGranted: boolean;
  familyMemberName?: string;
  anonymizedResearchConsent: boolean;
  downloadRecordsPermitted: boolean;
  smsEmailAlerts: boolean;
}

export interface AccessAuditRecord {
  id: string;
  accessorName: string;
  accessorRole: string;
  department: string;
  timestamp: string;
  purpose: string;
  action: string;
}

