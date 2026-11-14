export type UserRole = 'doctor' | 'nurse' | 'cmo' | 'records' | 'admin' | 'pharmacist' | 'patient';

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
  specialty?: string;
  qualifications?: string;
  experienceYears?: number;
  hospitalAffiliation?: string;
  availability?: 'Available Today' | 'Next Available Tomorrow' | 'Available This Week';
  gender?: 'Male' | 'Female';
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
  primaryPhysicianId?: string;
  primaryPhysician?: string;
  abhaId?: string; // Ayushman Bharat Health Account ID (e.g. 14-digit)
  nationalIdPlaceholder?: string; // e.g., Aadhaar / Voter ID mock
  physicalIdentification?: PhysicalIdentification;
  reconciledToPatientId?: string;
  reconciliationHistory?: Array<{
    previousTempId?: string;
    previousName: string;
    verifiedName: string;
    permanentMrn: string;
    reconciledByStaffId?: string;
    reconciledByName: string;
    reconciledAt: string;
  }>;
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
  assignedPhysicianId?: string;
  assignedPhysician: string;
  assignedNurseId?: string;
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
  cmoStaffId?: string;
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
  targetType: 'PATIENT' | 'CASE' | 'MLC' | 'POISON' | 'TRANSFER' | 'STAFF' | 'PHARMACY' | 'SYSTEM';
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
  declineReason?: string;
  acceptedByDoctorId?: string;
  acceptedByDoctorName?: string;
  acceptedAt?: string;
  declinedByDoctorId?: string;
  declinedByDoctorName?: string;
  declinedAt?: string;
  originalDate?: string;
  originalTimeSlot?: string;
  proposedDate?: string;
  proposedTimeSlot?: string;
  rescheduleReason?: string;
  rescheduleProposedBy?: string;
  rescheduleProposedById?: string;
  rescheduleProposedAt?: string;
  rescheduleResponseStatus?: 'Pending' | 'Accepted' | 'Rejected';
  reschedulePatientNote?: string;
  rescheduleRespondedAt?: string;
  createdAt?: string;
}

export type PrescriptionStatus = 'Draft' | 'Active' | 'Discontinued';

export type MedicationActivityStatus = 'Taken' | 'Skipped' | 'Not yet recorded';

export interface PatientMedicationActivity {
  id: string;
  patientId: string;
  patientName: string;
  encounterId: string;
  prescriptionItemId: string;
  medicationKey?: string;
  prescriptionId?: string;
  medicineName: string;
  strength?: string;
  dosage?: string;
  status: MedicationActivityStatus;
  recordedAt: string;
  note?: string;
  reportedBy: 'patient';
}

export interface ConnectedPatientMedication {
  id: string;
  medicationKey?: string;
  prescriptionItemId: string;
  encounterId: string;
  patientId: string;
  medicineName: string;
  drugName: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  timing?: string;
  instructions: string;
  prescribingDoctorId?: string;
  prescribingDoctorName: string;
  prescribedDate: string;
  status: PrescriptionStatus;
  discontinuedAt?: string;
  discontinuedBy?: string;
  discontinuedByDoctorName?: string;
  discontinuedReason?: string;
  diagnosis?: string;
  isLegacyBaseline?: boolean;
}

export interface PrescriptionItem {
  id?: string;
  patientId?: string;
  encounterId?: string;
  prescribingDoctorId?: string;
  prescribingDoctorName?: string;
  drugName?: string;
  medicineName?: string;
  genericName?: string;
  dosageForm?: PharmacyDosageForm;
  strength?: string; // e.g. "90 mg", "40 mg"
  dosage: string; // e.g. "1 tablet" or "500 mg"
  frequency: string; // e.g. "1-0-1 (Twice daily)"
  duration: string; // e.g. "5 days"
  prescribedQuantity?: number;
  route?: string; // e.g. "Oral", "Inhalation", "Sublingual", "Topical", "IV"
  timing?:
    | 'Before Food'
    | 'After Food'
    | 'With Food'
    | 'Empty Stomach'
    | 'Bedtime'
    | 'At Bedtime'
    | 'SOS (As needed)'
    | 'As Needed';
  instructions?: string;
  createdDate?: string;
  status?: PrescriptionStatus;
  discontinuedAt?: string;
  discontinuedBy?: string;
  discontinuedByDoctorId?: string;
  discontinuedByDoctorName?: string;
  discontinuedReason?: string;
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
  encounterType?:
    | 'OPD Consultation'
    | 'Inpatient Round'
    | 'Specialist Assessment'
    | 'Tele-consult'
    | 'Follow-up Review'
    | 'Post-Discharge Review'
    | AppointmentType;
  chiefComplaint: string;
  subjectiveHistory?: string;
  historyOfPresentIllness?: string;
  physicalExamination?: string;
  examinationFindings?: string;
  vitals?: CaseVitals;
  assessmentDiagnosis?: string;
  diagnosis?: string;
  prescriptions: PrescriptionItem[];
  prescriptionStatus?: PrescriptionStatus;
  prescriptionCreatedDate?: string;
  discontinuedAt?: string;
  discontinuedBy?: string;
  discontinuedReason?: string;
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
  attendingDoctorId?: string;
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
  orderingDoctorId?: string;
  orderingDoctor?: string;
  parameters: LabParameter[];
  impression?: string;
  clinicalNotes?: string;
  criticalPanicValue?: boolean;
  reviewedByStaffId?: string;
  reviewedBy?: string;
  status: 'Finalized' | 'Pending Review' | 'Critical Panic Alert' | 'Reviewed';
}

export interface DoctorDirectoryItem {
  id: string;
  staffId?: string;
  name: string;
  designation?: string;
  station?: string;
  employeeCode?: string;
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

export type ConversationStatus = 'Active' | 'Archived';

export type MessageSenderRole = 'Patient' | 'Doctor';

export type MessageCategory =
  | 'General Query'
  | 'Medication Review'
  | 'Lab Follow-up'
  | 'Appointment'
  | 'Follow-up Coordination'
  | 'Administrative Query';

export interface MessageAttachment {
  fileName: string;
  fileType: 'PDF' | 'IMAGE' | 'DICOM';
  fileSize: string;
  documentId?: string;
  category?: string;
}

export interface MessageConversation {
  id: string;
  patientId: string;
  patientName: string;
  patientPhotoUrl?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorDepartment?: string;
  doctorPhotoUrl?: string;
  relatedAppointmentId?: string;
  createdAt: string;
  lastMessageAt: string;
  status: ConversationStatus;
}

export interface PatientMessage {
  id: string;
  conversationId: string;
  patientId: string;
  patientName?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty?: string;
  doctorPhotoUrl?: string;
  senderId: string;
  senderRole: MessageSenderRole;
  sender: 'patient' | 'doctor' | 'system';
  text: string;
  timestamp: string;
  isRead: boolean;
  readAt?: string;
  category?: MessageCategory;
  relatedAppointmentId?: string;
  attachment?: MessageAttachment;
}

export interface PatientNotification {
  id: string;
  patientId: string;
  doctorId?: string;
  appointmentId?: string;
  encounterId?: string;
  conversationId?: string;
  messageId?: string;
  dedupKey?: string;
  targetAudience?: 'patient' | 'doctor' | 'pharmacy' | 'both';
  category: 'appointment' | 'report' | 'prescription' | 'pharmacy' | 'reminder' | 'announcement' | 'message';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionTab?: PatientPortalTab;
  priority: 'high' | 'normal' | 'low';
}

export interface PrivacyConsentSettings {
  patientId?: string;
  emergencyAccessGranted: boolean;
  shareWithSpecialists: boolean;
  familyAccessGranted: boolean;
  familyMemberName?: string;
  anonymizedResearchConsent: boolean;
  downloadRecordsPermitted: boolean;
  smsEmailAlerts: boolean;
  updatedAt?: string;
}

export type PatientPrivacySettingsMap = Record<string, PrivacyConsentSettings>;

export interface AccessAuditRecord {
  id: string;
  patientId: string;
  accessorStaffId?: string;
  accessorName: string;
  accessorRole: string;
  department: string;
  timestamp: string;
  purpose: string;
  action: string;
}

// ==========================================
// PHASE 5: HOSPITAL PHARMACY MANAGEMENT TYPES
// ==========================================

export type PharmacyDosageForm =
  | 'Tablet'
  | 'Capsule'
  | 'Inhaler'
  | 'Injection'
  | 'Syrup'
  | 'Ointment'
  | 'Drops'
  | 'Powder'
  | 'Solution';

export type PharmacyMedicineStatus = 'Active' | 'Inactive';

export interface PharmacyMedicine {
  id: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosageForm: PharmacyDosageForm;
  manufacturer: string;
  category: string;
  storageRequirements?: string;
  unitOfMeasurement: string;
  minimumStockThreshold: number;
  status: PharmacyMedicineStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  availableQuantity: number;
  expiryDate: string; // YYYY-MM-DD
  purchaseDate: string; // YYYY-MM-DD
  supplierReference: string;
  supplierName: string;
  stockLocation: string;
  unitOfMeasurement: string;
  createdAt: string;
  updatedAt: string;
}

export type PharmacyTransactionType =
  | 'Stock Receipt'
  | 'Batch Addition'
  | 'Stock Adjustment'
  | 'Dispense'
  | 'Partial Dispense'
  | 'Expiry Write-Off'
  | 'Catalogue Update';

export interface PharmacyTransaction {
  id: string;
  medicineId: string;
  medicineName: string;
  batchId?: string;
  batchNumber?: string;
  transactionType: PharmacyTransactionType;
  quantityDelta: number;
  previousQuantity: number;
  newQuantity: number;
  timestamp: string;
  staffId: string;
  staffName: string;
  staffRole: UserRole;
  reason: string;
  relatedPrescriptionId?: string;
  relatedPrescriptionItemId?: string;
  relatedDispensingRecordId?: string;
  patientId?: string;
  patientName?: string;
}

export type PharmacyDispensingStatus =
  | 'Fully Dispensed'
  | 'Partially Dispensed'
  | 'Unavailable'
  | 'Not Yet Dispensed';

export type PharmacyDispensingItemStatus =
  | 'Dispensed'
  | 'Partially Dispensed'
  | 'Unavailable'
  | 'Not Yet Dispensed';

export interface PharmacyDispensingItem {
  prescriptionItemId: string;
  medicineId?: string;
  requestedMedicineName: string;
  requestedGenericName: string;
  requestedStrength: string;
  requestedDosageForm: PharmacyDosageForm;
  prescribedQuantity: number;
  dispensedQuantity: number;
  previouslyDispensedQuantity: number;
  remainingQuantity: number;
  batchId?: string;
  batchNumber?: string;
  status: PharmacyDispensingItemStatus;
  note?: string;
}

export interface PharmacyDispensingRecord {
  id: string;
  encounterId: string;
  patientId: string;
  patientName: string;
  prescribingDoctorId?: string;
  prescribingDoctorName: string;
  prescriptionDate: string;
  dispensedAt: string;
  dispensedByStaffId: string;
  dispensedByStaffName: string;
  status: PharmacyDispensingStatus;
  items: PharmacyDispensingItem[];
  notes?: string;
}

export type PharmacyReorderStatus =
  | 'Draft'
  | 'Submitted Purchase Request'
  | 'Approved'
  | 'Cancelled';

export interface PharmacyReorderRequest {
  id: string;
  medicineId: string;
  genericName: string;
  brandName?: string;
  strength: string;
  dosageForm: PharmacyDosageForm;
  requestedQuantity: number;
  currentUsableStock: number;
  minimumThreshold: number;
  supplierName: string;
  supplierReference?: string;
  reason: 'Low Stock' | 'Out of Stock' | 'Near Expiry Replacement';
  status: PharmacyReorderStatus;
  createdAt: string;
  createdBy: string;
  notes?: string;
}


