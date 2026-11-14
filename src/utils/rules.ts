import { 
  EmergencyCase, 
  MedicoLegalCase, 
  PoisoningCase, 
  TriageLevel, 
  CaseVitals,
  PatientTriageStatus,
  Appointment,
  AppointmentStatus,
  Patient,
  ClinicalEncounter,
  PrescriptionItem,
  PrescriptionStatus,
  ConnectedPatientMedication,
  PatientMedicationActivity,
  MedicationActivityStatus,
  MessageConversation,
  PatientMessage,
  MessageSenderRole,
  ConversationStatus,
  MessageCategory,
  MessageAttachment,
  DoctorDirectoryItem,
  UserRole,
  PharmacyDosageForm,
  PharmacyMedicine,
  PharmacyBatch,
  PharmacyTransaction,
  PharmacyDispensingStatus,
  PharmacyDispensingItemStatus,
  PharmacyDispensingRecord,
  PharmacyReorderRequest,
  PatientNotification,
  PrivacyConsentSettings,
  PatientPrivacySettingsMap,
  AccessAuditRecord,
} from '../types';

/**
 * Generate a standardized Indian Hospital Temporary Emergency Patient ID
 * Format: TEMP-ER-YYYY-XXXX (e.g. TEMP-ER-2026-0419)
 */
export function generateTempPatientId(seq: number, year: number = 2026): string {
  const padded = String(seq).padStart(4, '0');
  return `TEMP-ER-${year}-${padded}`;
}

/**
 * Generates an official Medico-Legal Case reference number
 * Format: MLC-YYYY-XXXX
 */
export function generateMlcId(seq: number, year: number = 2026): string {
  const padded = String(seq).padStart(4, '0');
  return `MLC-${year}-${padded}`;
}

/**
 * Generates a Poisoning / Toxicology protocol ID
 * Format: TOX-YYYY-XXXX
 */
export function generatePoisonCaseId(seq: number, year: number = 2026): string {
  const padded = String(seq).padStart(4, '0');
  return `TOX-${year}-${padded}`;
}

/**
 * Generates an Inter-hospital Transfer reference ID
 * Format: TRF-YYYY-XXXX
 */
export function generateTransferId(seq: number, year: number = 2026): string {
  const padded = String(seq).padStart(4, '0');
  return `TRF-${year}-${padded}`;
}

/**
 * Clinical Emergency Severity Index (ESI) & Triage Level Calculator
 * Based on physiological instability and clinical red flags
 */
export function evaluateTriageLevel(
  vitals: Partial<CaseVitals>,
  complaint: string,
  isCardiacOrArrest: boolean = false
): { triageLevel: TriageLevel; esiScore: number; reason: string } {
  const spo2 = vitals.spo2 ?? 98;
  const pulse = vitals.pulse ?? 76;
  const gcs = vitals.gcs ?? 15;
  const rr = vitals.rr ?? 16;

  // Level 1: Immediate Resuscitation (RED)
  if (isCardiacOrArrest || gcs <= 8 || spo2 < 85 || pulse < 40 || pulse > 150 || rr < 8 || rr > 36) {
    return {
      triageLevel: 'RED',
      esiScore: 1,
      reason: 'Critical physiological instability: Severe respiratory compromise, severe altered sensorium (GCS ≤ 8) or hemodynamic collapse.',
    };
  }

  // Level 2: Emergent (RED/YELLOW high acuity)
  if (gcs <= 12 || spo2 < 92 || pulse < 50 || pulse > 125 || (vitals.bp && parseInt(vitals.bp.split('/')[0] || '120') < 90)) {
    return {
      triageLevel: 'RED',
      esiScore: 2,
      reason: 'High risk condition requiring immediate physician attention within 10 minutes: Hypoxia, hypotension or acute disorientation.',
    };
  }

  // Level 3: Urgent (YELLOW)
  if (gcs <= 14 || spo2 < 95 || pulse > 105 || rr > 22 || (vitals.painScore && vitals.painScore >= 7)) {
    return {
      triageLevel: 'YELLOW',
      esiScore: 3,
      reason: 'Urgent: Moderate distress, severe pain (≥7/10) or requiring multiple resources/imaging.',
    };
  }

  // Level 4 / 5: Non-urgent (GREEN)
  return {
    triageLevel: 'GREEN',
    esiScore: 4,
    reason: 'Stable ambulatory: Physiological parameters within acceptable threshold.',
  };
}

/**
 * Validates whether an MLC draft has mandatory legal & medical documentation
 */
export function validateMLCRequirements(mlc: Partial<MedicoLegalCase>): {
  isValid: boolean;
  missingFields: string[];
} {
  const missing: string[] = [];

  if (!mlc.policeStation || mlc.policeStation.trim().length === 0) {
    missing.push('Jurisdiction Police Station / Thana');
  }
  if (!mlc.broughtByName || mlc.broughtByName.trim().length === 0) {
    missing.push('Name of Person/Officer Bringing Patient');
  }
  if (!mlc.injuryClassification) {
    missing.push('Injury Classification (Simple/Grievous)');
  }
  if (!mlc.wounds || mlc.wounds.length === 0) {
    missing.push('At least one documented wound or external physical examination finding');
  }
  if (!mlc.legalDisclaimerAcknowledged) {
    missing.push('Authorised Medical Officer Legal Disclaimer Confirmation');
  }

  return {
    isValid: missing.length === 0,
    missingFields: missing,
  };
}

/**
 * Assesses whether all 5 cardinal clinical endpoints of adequate Atropinization are satisfied
 */
export function evaluateAtropinizationProgress(
  status: PoisoningCase['atropinizationStatus']
): {
  isFullyAtropinized: boolean;
  satisfiedCount: number;
  totalCriteria: number;
  percentage: number;
} {
  const checks = [
    status.pulseTargetAchieved,
    status.dryAxillae,
    status.pupilsDilated,
    status.chestClearOfRhonchi,
    status.systolicBpAdequate,
  ];

  const satisfiedCount = checks.filter(Boolean).length;
  const totalCriteria = checks.length;
  const percentage = Math.round((satisfiedCount / totalCriteria) * 100);

  return {
    isFullyAtropinized: satisfiedCount === totalCriteria,
    satisfiedCount,
    totalCriteria,
    percentage,
  };
}

/**
 * Filter emergency cases by multi-criteria
 */
export function filterEmergencyCases(
  cases: EmergencyCase[],
  filters: {
    search?: string;
    triage?: 'ALL' | TriageLevel;
    status?: 'ALL' | 'ACTIVE' | 'RESOLVED' | string;
    onlyUnidentified?: boolean;
    onlyMlc?: boolean;
    onlyPoison?: boolean;
  }
): EmergencyCase[] {
  return cases.filter((c) => {
    // Search
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const patient = c.patientSnapshot;
      const matchName = patient.name.toLowerCase().includes(q);
      const matchTempId = patient.tempId?.toLowerCase().includes(q);
      const matchCaseId = c.id.toLowerCase().includes(q);
      const matchComplaint = c.chiefComplaint.toLowerCase().includes(q);
      const matchBed = c.bedBay.toLowerCase().includes(q);
      const matchDoctor = c.assignedPhysician.toLowerCase().includes(q);

      if (!matchName && !matchTempId && !matchCaseId && !matchComplaint && !matchBed && !matchDoctor) {
        return false;
      }
    }

    // Triage
    if (filters.triage && filters.triage !== 'ALL' && c.triageLevel !== filters.triage) {
      return false;
    }

    // Status
    if (filters.status && filters.status !== 'ALL') {
      if (filters.status === 'ACTIVE') {
        const activeStatuses = ['Active Triage', 'Under Resuscitation', 'Under Evaluation', 'Stabilized'];
        if (!activeStatuses.includes(c.status)) return false;
      } else if (filters.status === 'RESOLVED') {
        const resolvedStatuses = ['Admitted ICU', 'Admitted Ward', 'Transferred', 'Discharged', 'DAMA (Discharge Against Medical Advice)', 'Brought Dead / Expired'];
        if (!resolvedStatuses.includes(c.status)) return false;
      } else if (c.status !== filters.status) {
        return false;
      }
    }

    // Unidentified
    if (filters.onlyUnidentified && !c.patientSnapshot.isUnidentified) {
      return false;
    }

    // MLC
    if (filters.onlyMlc && !c.isMlc) {
      return false;
    }

    // Poisoning
    if (filters.onlyPoison && !c.isPoisoning) {
      return false;
    }

    return true;
  });
}

/**
 * Resolves the triage status for a patient/appointment based on explicit override,
 * vitals, emergency case link, or clinical reason.
 */
export function resolvePatientTriageStatus(
  item: {
    triageStatus?: PatientTriageStatus;
    chiefComplaint?: string;
    vitalsSnapshot?: Partial<CaseVitals>;
    status?: string;
    patientId?: string;
    patientName?: string;
  },
  emergencyCases: EmergencyCase[] = []
): PatientTriageStatus {
  // 1. Explicit status takes precedence
  if (item.triageStatus) {
    return item.triageStatus;
  }

  // 2. Cross-reference with active emergency cases
  if (item.patientId || item.patientName) {
    const activeCase = emergencyCases.find(
      (c) =>
        (c.patientId === item.patientId || c.patientSnapshot.name === item.patientName) &&
        !['Discharged', 'Transferred', 'Brought Dead / Expired'].includes(c.status)
    );
    if (activeCase) {
      if (activeCase.triageLevel === 'RED' || activeCase.esiScore <= 2) {
        return 'Critical';
      }
      if (activeCase.triageLevel === 'YELLOW' || activeCase.status === 'Active Triage') {
        return 'Waiting';
      }
      if (activeCase.status === 'Stabilized') {
        return 'Stable';
      }
      return 'Under Observation';
    }
  }

  // 3. Physiological vital signs check
  const v = item.vitalsSnapshot;
  if (v) {
    if ((v.spo2 && v.spo2 < 92) || (v.pulse && (v.pulse > 125 || v.pulse < 50)) || (v.gcs && v.gcs < 13)) {
      return 'Critical';
    }
  }

  // 4. Clinical complaint keywords
  const complaint = (item.chiefComplaint || '').toLowerCase();
  if (
    complaint.includes('chest pain') ||
    complaint.includes('cardiac') ||
    complaint.includes('stent') && complaint.includes('angina') ||
    complaint.includes('diaphoresis') ||
    complaint.includes('severe breathlessness') ||
    complaint.includes('poison')
  ) {
    return 'Critical';
  }

  // 5. Appointment status mapping
  if (item.status === 'Waiting' || item.status === 'Checked In') {
    return 'Waiting';
  }

  if (item.status === 'Completed') {
    return 'Stable';
  }

  return 'Stable';
}

export interface TriageBadgeConfig {
  label: PatientTriageStatus;
  badgeClass: string;
  dotClass: string;
  pingBeacon: boolean;
  borderClass: string;
  bgClass: string;
  textClass: string;
  description: string;
  urgencyLevel: 'high' | 'medium' | 'low';
}

/**
 * Returns color-coded badge styling for patient triage status indicators
 */
export function getTriageBadgeConfig(status: PatientTriageStatus): TriageBadgeConfig {
  switch (status) {
    case 'Critical':
      return {
        label: 'Critical',
        badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 ring-1 ring-rose-400/30',
        dotClass: 'bg-rose-600',
        pingBeacon: true,
        borderClass: 'border-rose-300',
        bgClass: 'bg-rose-50',
        textClass: 'text-rose-800',
        description: 'Immediate clinical review / High acuity triage',
        urgencyLevel: 'high',
      };
    case 'Waiting':
      return {
        label: 'Waiting',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 ring-1 ring-amber-400/20',
        dotClass: 'bg-amber-500',
        pingBeacon: false,
        borderClass: 'border-amber-300',
        bgClass: 'bg-amber-50',
        textClass: 'text-amber-800',
        description: 'Waiting in lobby / Triage vitals intake pending',
        urgencyLevel: 'medium',
      };
    case 'Under Observation':
      return {
        label: 'Under Observation',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-300 ring-1 ring-sky-400/20',
        dotClass: 'bg-sky-500',
        pingBeacon: false,
        borderClass: 'border-sky-300',
        bgClass: 'bg-sky-50',
        textClass: 'text-sky-800',
        description: 'Under monitoring / Diagnostic investigations pending',
        urgencyLevel: 'medium',
      };
    case 'Stable':
    default:
      return {
        label: 'Stable',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/20',
        dotClass: 'bg-emerald-600',
        pingBeacon: false,
        borderClass: 'border-emerald-300',
        bgClass: 'bg-emerald-50',
        textClass: 'text-emerald-800',
        description: 'Physiologically stable / Ambulatory consultation',
        urgencyLevel: 'low',
      };
  }
}

/**
 * Centralized badge styling for all AppointmentStatus values across Patient & Hospital dashboards.
 * Ensures every status (Requested, Scheduled, Rescheduled, Waiting, In Consultation, Completed, Cancelled, No Show)
 * returns a visible, well-styled Tailwind class string.
 */
export function getAppointmentStatusBadge(status: AppointmentStatus): string {
  switch (status) {
    case 'Requested':
      return 'bg-amber-100 text-amber-900 border-amber-300';
    case 'Scheduled':
    case 'Confirmed':
    case 'Checked In':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'Rescheduled':
      return 'bg-indigo-50 text-indigo-800 border-indigo-200';
    case 'Waiting':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'In Consultation':
      return 'bg-teal-50 text-teal-800 border-teal-200 animate-pulse';
    case 'Completed':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'Cancelled':
    case 'No Show':
      return 'bg-rose-50 text-rose-800 border-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

/**
 * Filter appointments for hospital/doctor views by schedule scope (today, upcoming, requested, all)
 */
export function filterHospitalAppointments(
  appointments: Appointment[],
  scope: 'today' | 'upcoming' | 'requested' | 'all',
  todayDate: string,
  doctorIdFilter?: string
): Appointment[] {
  return appointments.filter((apt) => {
    if (doctorIdFilter && doctorIdFilter !== 'all' && apt.doctorId && apt.doctorId !== doctorIdFilter) {
      return false;
    }
    switch (scope) {
      case 'today':
        return apt.date === todayDate;
      case 'upcoming':
        return apt.date > todayDate && !['Cancelled', 'Completed', 'No Show'].includes(apt.status);
      case 'requested':
        return apt.status === 'Requested';
      case 'all':
      default:
        return true;
    }
  });
}

/**
 * Filter patient appointments for patient portal views
 */
export function filterPatientAppointments(
  appointments: Appointment[],
  patientId: string,
  filter: 'all' | 'upcoming' | 'past' | 'requested' | 'rescheduled' | 'completed' | 'cancelled' = 'all'
): Appointment[] {
  const patientApts = appointments.filter((a) => a.patientId === patientId);
  const today = new Date().toISOString().split('T')[0];

  switch (filter) {
    case 'upcoming':
      return patientApts.filter(
        (a) =>
          (a.date >= today ||
            ['Scheduled', 'Confirmed', 'Requested', 'Rescheduled', 'Waiting', 'In Consultation', 'Checked In'].includes(
              a.status
            )) &&
          !['Completed', 'Cancelled', 'No Show'].includes(a.status)
      );
    case 'past':
      return patientApts.filter(
        (a) => a.date < today || ['Completed', 'Cancelled', 'No Show'].includes(a.status)
      );
    case 'requested':
      return patientApts.filter((a) => a.status === 'Requested');
    case 'rescheduled':
      return patientApts.filter((a) => a.status === 'Rescheduled');
    case 'completed':
      return patientApts.filter((a) => a.status === 'Completed');
    case 'cancelled':
      return patientApts.filter((a) => ['Cancelled', 'No Show'].includes(a.status));
    case 'all':
    default:
      return patientApts;
  }
}

/**
 * Validates a patient appointment request (prevents past dates and duplicate active submissions)
 */
export function validateAppointmentRequestInput(
  input: {
    doctorId?: string;
    date?: string;
    timeSlot?: string;
    todayDate: string;
  },
  existingAppointments: Appointment[],
  patientId: string
): { isValid: boolean; error?: string } {
  if (!input.doctorId || !input.doctorId.trim()) {
    return { isValid: false, error: 'Please select a specialist doctor.' };
  }
  if (!input.date || !input.date.trim()) {
    return { isValid: false, error: 'Please select a preferred appointment date.' };
  }
  if (input.date < input.todayDate) {
    return { isValid: false, error: 'Cannot book an appointment in the past. Please choose today or a future date.' };
  }
  if (!input.timeSlot || !input.timeSlot.trim()) {
    return { isValid: false, error: 'Please select an available time slot.' };
  }

  const isDuplicate = existingAppointments.some(
    (a) =>
      a.patientId === patientId &&
      a.doctorId === input.doctorId &&
      a.date === input.date &&
      a.timeSlot === input.timeSlot &&
      !['Cancelled', 'No Show', 'Completed'].includes(a.status)
  );

  if (isDuplicate) {
    return {
      isValid: false,
      error: 'You already have an active appointment or pending request with this specialist for the selected date and time.',
    };
  }

  return { isValid: true };
}

/**
 * Checks whether a staff user is authorized to manage (accept, decline, or reschedule) an appointment request.
 * Only the assigned doctor (matching doctorId) or an authorised hospital administrator ('admin') can manage it.
 */
export function canManageAppointmentRequest(
  actor: { id: string; role: string },
  appointment: Pick<Appointment, 'doctorId'>
): boolean {
  if (!actor || !actor.id) return false;
  if (actor.role === 'admin') return true;
  if ((actor.role === 'doctor' || actor.role === 'cmo') && appointment.doctorId && appointment.doctorId === actor.id) {
    return true;
  }
  return false;
}

/**
 * Pure state transition: Assigned doctor (or admin) accepts a patient appointment request.
 * Changes status to 'Scheduled', preserves requested appointment details, and records accepting doctor.
 */
export function acceptAppointmentRequest(
  appointment: Appointment,
  actor: { id: string; name: string; role: string },
  nowIso: string = new Date().toISOString()
): { success: boolean; appointment: Appointment; error?: string } {
  if (!canManageAppointmentRequest(actor, appointment)) {
    return {
      success: false,
      appointment,
      error: `Only the assigned doctor (${appointment.doctorName}) or an authorised hospital administrator can accept this request.`,
    };
  }

  if (appointment.status === 'Scheduled') {
    return {
      success: false,
      appointment,
      error: 'This appointment has already been accepted and scheduled.',
    };
  }

  const updated: Appointment = {
    ...appointment,
    status: 'Scheduled',
    acceptedByDoctorId: actor.id,
    acceptedByDoctorName: actor.name,
    acceptedAt: nowIso,
  };

  return { success: true, appointment: updated };
}

/**
 * Pure state transition: Assigned doctor (or admin) declines a patient appointment request.
 * Changes status to 'Cancelled' and stores the optional decline reason.
 */
export function declineAppointmentRequest(
  appointment: Appointment,
  actor: { id: string; name: string; role: string },
  declineReason?: string,
  nowIso: string = new Date().toISOString()
): { success: boolean; appointment: Appointment; error?: string } {
  if (!canManageAppointmentRequest(actor, appointment)) {
    return {
      success: false,
      appointment,
      error: `Only the assigned doctor (${appointment.doctorName}) or an authorised hospital administrator can decline this request.`,
    };
  }

  if (appointment.status === 'Cancelled') {
    return {
      success: false,
      appointment,
      error: 'This appointment is already cancelled.',
    };
  }

  const resolvedReason = declineReason?.trim() || 'Declined by specialist due to clinic schedule constraints';

  const updated: Appointment = {
    ...appointment,
    status: 'Cancelled',
    declineReason: resolvedReason,
    cancellationReason: resolvedReason,
    declinedByDoctorId: actor.id,
    declinedByDoctorName: actor.name,
    declinedAt: nowIso,
  };

  return { success: true, appointment: updated };
}

/**
 * Pure state transition: Assigned doctor (or admin) proposes a new date and time for an appointment.
 * Stores original requested date/time, stores proposed date/time separately, and sets status to 'Rescheduled'
 * without silently overwriting the original appointment date/time.
 */
export function proposeAppointmentReschedule(
  appointment: Appointment,
  actor: { id: string; name: string; role: string },
  proposedDate: string,
  proposedTimeSlot: string,
  reason?: string,
  todayDate?: string,
  nowIso: string = new Date().toISOString()
): { success: boolean; appointment: Appointment; error?: string } {
  if (!canManageAppointmentRequest(actor, appointment)) {
    return {
      success: false,
      appointment,
      error: `Only the assigned doctor (${appointment.doctorName}) or an authorised hospital administrator can propose a reschedule for this appointment.`,
    };
  }

  if (!proposedDate || !proposedDate.trim() || !proposedTimeSlot || !proposedTimeSlot.trim()) {
    return {
      success: false,
      appointment,
      error: 'Both a proposed date and proposed time slot are required.',
    };
  }

  if (todayDate && proposedDate < todayDate) {
    return {
      success: false,
      appointment,
      error: 'Proposed reschedule date cannot be in the past.',
    };
  }

  const updated: Appointment = {
    ...appointment,
    originalDate: appointment.originalDate || appointment.date,
    originalTimeSlot: appointment.originalTimeSlot || appointment.timeSlot,
    proposedDate: proposedDate.trim(),
    proposedTimeSlot: proposedTimeSlot.trim(),
    rescheduleReason: reason?.trim() || 'Doctor proposed an alternative consultation slot',
    rescheduleProposedBy: actor.name,
    rescheduleProposedById: actor.id,
    rescheduleProposedAt: nowIso,
    rescheduleResponseStatus: 'Pending',
    status: 'Rescheduled',
  };

  return { success: true, appointment: updated };
}

/**
 * Pure state transition: Patient accepts or rejects a doctor's proposed reschedule.
 * - If accepted: updates status to 'Scheduled' and applies proposedDate/proposedTimeSlot while preserving originalDate/originalTimeSlot.
 * - If rejected: retains existing appointment record and original details, marks rescheduleResponseStatus = 'Rejected'.
 */
export function respondToRescheduleProposal(
  appointment: Appointment,
  decision: 'accept' | 'reject',
  patientNote?: string,
  nowIso: string = new Date().toISOString()
): { success: boolean; appointment: Appointment; error?: string } {
  if (!appointment.proposedDate || !appointment.proposedTimeSlot) {
    return {
      success: false,
      appointment,
      error: 'No pending reschedule proposal found on this appointment.',
    };
  }

  const preservedOriginalDate = appointment.originalDate || appointment.date;
  const preservedOriginalTimeSlot = appointment.originalTimeSlot || appointment.timeSlot;

  if (decision === 'accept') {
    const updated: Appointment = {
      ...appointment,
      originalDate: preservedOriginalDate,
      originalTimeSlot: preservedOriginalTimeSlot,
      date: appointment.proposedDate,
      timeSlot: appointment.proposedTimeSlot,
      status: 'Scheduled',
      acceptedByDoctorId: appointment.acceptedByDoctorId || appointment.rescheduleProposedById || appointment.doctorId,
      acceptedByDoctorName: appointment.acceptedByDoctorName || appointment.rescheduleProposedBy || appointment.doctorName,
      acceptedAt: appointment.acceptedAt || nowIso,
      rescheduleResponseStatus: 'Accepted',
      reschedulePatientNote: patientNote?.trim() || 'Patient accepted proposed schedule',
      rescheduleRespondedAt: nowIso,
    };
    return { success: true, appointment: updated };
  }

  const updated: Appointment = {
    ...appointment,
    originalDate: preservedOriginalDate,
    originalTimeSlot: preservedOriginalTimeSlot,
    status: 'Rescheduled',
    rescheduleResponseStatus: 'Rejected',
    reschedulePatientNote: patientNote?.trim() || 'Patient rejected proposed schedule',
    rescheduleRespondedAt: nowIso,
  };

  return { success: true, appointment: updated };
}

/**
 * Filter patient documents by category and query
 */
export function filterPatientDocuments<T extends { category: string; title: string; summary?: string; tags?: string[] }>(
  documents: T[],
  categoryFilter: string = 'All',
  searchQuery: string = ''
): T[] {
  return documents.filter((doc) => {
    const matchesCategory =
      categoryFilter === 'All' || doc.category.toLowerCase() === categoryFilter.toLowerCase();
    
    if (!matchesCategory) return false;

    if (!searchQuery.trim()) return true;

    const q = searchQuery.toLowerCase();
    const inTitle = doc.title.toLowerCase().includes(q);
    const inSummary = doc.summary ? doc.summary.toLowerCase().includes(q) : false;
    const inTags = doc.tags ? doc.tags.some((t) => t.toLowerCase().includes(q)) : false;

    return inTitle || inSummary || inTags;
  });
}

/**
 * Filter doctor discovery directory
 */
export function filterDoctorDirectory<T extends { name: string; specialty: string; subSpecialty?: string; qualifications: string; languages?: string[]; consultationTypes?: string[]; availability?: string }>(
  doctors: T[],
  params: {
    query?: string;
    specialty?: string;
    consultationType?: string;
    availability?: string;
  }
): T[] {
  return doctors.filter((doc) => {
    if (params.specialty && params.specialty !== 'All Specialties') {
      if (!doc.specialty.toLowerCase().includes(params.specialty.toLowerCase())) {
        return false;
      }
    }

    if (params.consultationType && params.consultationType !== 'All Types') {
      if (!doc.consultationTypes || !doc.consultationTypes.includes(params.consultationType)) {
        return false;
      }
    }

    if (params.availability && params.availability !== 'All Availability') {
      if (doc.availability !== params.availability) {
        return false;
      }
    }

    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      const inName = doc.name.toLowerCase().includes(q);
      const inSpec = doc.specialty.toLowerCase().includes(q);
      const inSub = doc.subSpecialty ? doc.subSpecialty.toLowerCase().includes(q) : false;
      const inQual = doc.qualifications.toLowerCase().includes(q);
      const inLang = doc.languages ? doc.languages.some((l) => l.toLowerCase().includes(q)) : false;

      return inName || inSpec || inSub || inQual || inLang;
    }

    return true;
  });
}

/**
 * Computes health overview stats for a patient
 */
export function calculatePatientHealthMetrics(
  patientId: string,
  appointments: Appointment[],
  encounters: Array<{ patientId: string; prescriptions?: unknown[] }>,
  labReports: Array<{ patientId: string; status: string }>
): {
  upcomingCount: number;
  pendingReportsCount: number;
  activePrescriptionsCount: number;
  completedVisitsCount: number;
} {
  const patientApts = appointments.filter((a) => a.patientId === patientId);
  const today = new Date().toISOString().split('T')[0];

  const upcomingCount = patientApts.filter(
    (a) =>
      (a.date >= today ||
        ['Scheduled', 'Confirmed', 'Requested', 'Rescheduled', 'Waiting', 'In Consultation', 'Checked In'].includes(
          a.status
        )) &&
      !['Completed', 'Cancelled', 'No Show'].includes(a.status)
  ).length;

  const completedVisitsCount = patientApts.filter((a) => a.status === 'Completed').length;

  const patientLabs = labReports.filter((l) => l.patientId === patientId);
  const pendingReportsCount = patientLabs.filter((l) => l.status === 'Pending Review').length;

  const patientEncounters = encounters.filter((e) => e.patientId === patientId);
  const activePrescriptionsCount = patientEncounters.reduce((acc, curr) => {
    const encStatus = (curr as { prescriptionStatus?: string; status?: string }).prescriptionStatus;
    if (encStatus === 'Discontinued' || encStatus === 'Draft' || (curr as { status?: string }).status === 'Draft') {
      return acc;
    }
    const items = (curr.prescriptions || []) as Array<{ status?: string }>;
    const activeItems = items.filter((item) => item.status !== 'Discontinued' && item.status !== 'Draft');
    return acc + activeItems.length;
  }, 0);

  return {
    upcomingCount,
    pendingReportsCount,
    activePrescriptionsCount,
    completedVisitsCount,
  };
}

/**
 * Checks if a record category is clinician-verified (read-only for patient)
 */
export function isClinicianVerifiedRecord(category: string): boolean {
  const verifiedCategories = [
    'consultation',
    'prescription',
    'laboratory',
    'radiology / imaging',
    'discharge summary',
    'procedure / surgery',
    'medical history',
  ];
  return verifiedCategories.includes(category.toLowerCase());
}

/**
 * Formats a doctor name cleanly without duplicate "Dr. Dr." prefixes
 */
export function formatDoctorDisplayName(name?: string): string {
  if (!name || !name.trim()) return 'Attending Physician';
  const trimmed = name.trim();
  if (/^dr\.?\s/i.test(trimmed)) {
    return trimmed;
  }
  return `Dr. ${trimmed}`;
}

/**
 * Normalizes and validates prescription items authored by a doctor within a clinical encounter.
 * Ensures every medicine entry has patientId, prescribingDoctorId, prescribingDoctorName,
 * medicineName, drugName, strength, dosage, frequency, duration, route, createdDate, and status.
 */
export function normalizePrescriptionItems(
  items: PrescriptionItem[],
  context: {
    encounterId: string;
    patientId: string;
    doctorId: string;
    doctorName: string;
    createdDate: string;
    defaultStatus: PrescriptionStatus;
  }
): PrescriptionItem[] {
  return items
    .filter((item) => {
      const med = (item.medicineName || item.drugName || '').trim();
      return med.length > 0;
    })
    .map((item, idx) => {
      const rawMedicineName = (item.medicineName || item.drugName || '').trim();
      const strength = (item.strength || '').trim();
      const baseDrug = (item.drugName && item.drugName.trim().length > 0 ? item.drugName : rawMedicineName).trim();
      const displayDrugName =
        strength && !baseDrug.toLowerCase().includes(strength.toLowerCase())
          ? `${baseDrug} ${strength}`
          : baseDrug;

      const resolvedStatus: PrescriptionStatus =
        context.defaultStatus === 'Draft'
          ? 'Draft'
          : context.defaultStatus === 'Discontinued'
          ? 'Discontinued'
          : item.status || 'Active';

      return {
        ...item,
        id: item.id || `rx-${context.encounterId}-${idx + 1}`,
        patientId: item.patientId || context.patientId,
        encounterId: item.encounterId || context.encounterId,
        prescribingDoctorId: item.prescribingDoctorId || context.doctorId,
        prescribingDoctorName: formatDoctorDisplayName(item.prescribingDoctorName || context.doctorName),
        medicineName: rawMedicineName,
        drugName: displayDrugName,
        strength: strength || item.dosage || '',
        dosage: (item.dosage || strength || '1 unit').trim(),
        frequency: (item.frequency || '1-0-0 (Once daily)').trim(),
        duration: (item.duration || '30 Days').trim(),
        route: item.route || 'Oral',
        timing: item.timing || 'After Food',
        instructions: item.instructions?.trim() || '',
        createdDate: item.createdDate || context.createdDate,
        status: resolvedStatus,
      };
    });
}

/**
 * Returns all clinical encounters containing prescriptions for a specific patient,
 * sorted newest first by date/updatedAt.
 */
export function getPatientPrescriptions(
  encounters: ClinicalEncounter[],
  patientId: string
): ClinicalEncounter[] {
  return encounters
    .filter((enc) => enc.patientId === patientId && enc.prescriptions && enc.prescriptions.length > 0)
    .slice()
    .sort((a, b) => {
      const timeA = a.updatedAt || a.date || '';
      const timeB = b.updatedAt || b.date || '';
      return timeB.localeCompare(timeA);
    });
}

/**
 * Canonical key for deduplicating medications by base medicine name + strength
 */
function buildMedicationDedupKey(medicineName: string, strength?: string): string {
  const cleanName = medicineName
    .toLowerCase()
    .replace(/^(tab\.|cap\.|syp\.|inj\.|inh\.|drops|ointment)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanStrength = (strength || '').toLowerCase().replace(/\s+/g, '').trim();
  if (cleanStrength && cleanName.includes(cleanStrength)) {
    return cleanName;
  }
  return cleanStrength ? `${cleanName}|${cleanStrength}` : cleanName;
}

/**
 * Derives a patient's connected medication regimen from shared ClinicalEncounters and baseline patient medications:
 * - Active prescribed medicines appear in `activeMedications`
 * - Discontinued medicines do NOT appear as active (returned in `discontinuedMedications` for history)
 * - Draft prescriptions do NOT appear as active until explicitly saved as Active by the doctor
 * - Avoids duplicate medication entries while preserving links to the original prescription
 * - Preserves unrelated existing medication records on `patient.currentMedications`
 */
export function derivePatientMedicationRegimen(
  patient: Pick<Patient, 'id' | 'name' | 'currentMedications'> | null | undefined,
  encounters: ClinicalEncounter[]
): {
  activeMedications: ConnectedPatientMedication[];
  discontinuedMedications: ConnectedPatientMedication[];
  draftMedications: ConnectedPatientMedication[];
  currentMedicationStrings: string[];
} {
  if (!patient) {
    return {
      activeMedications: [],
      discontinuedMedications: [],
      draftMedications: [],
      currentMedicationStrings: [],
    };
  }

  const patientEncounters = getPatientPrescriptions(encounters, patient.id);

  const activeMedications: ConnectedPatientMedication[] = [];
  const discontinuedMedications: ConnectedPatientMedication[] = [];
  const draftMedications: ConnectedPatientMedication[] = [];

  // Track seen medication keys (newest encounter first) so newer prescriptions supersede older duplicates
  const seenKeys = new Set<string>();
  const discontinuedBaseNames = new Set<string>();

  for (const enc of patientEncounters) {
    const encPrescriptionStatus: PrescriptionStatus =
      enc.prescriptionStatus || (enc.status === 'Draft' ? 'Draft' : 'Active');

    for (const item of enc.prescriptions || []) {
      const effectiveStatus: PrescriptionStatus =
        encPrescriptionStatus === 'Draft' || enc.status === 'Draft'
          ? 'Draft'
          : encPrescriptionStatus === 'Discontinued' || item.status === 'Discontinued'
          ? 'Discontinued'
          : item.status || 'Active';

      const medName = (item.medicineName || item.drugName || '').trim();
      if (!medName) continue;

      const displayDrugName = (item.drugName || medName).trim();
      const strength = (item.strength || '').trim();
      const dedupKey = buildMedicationDedupKey(displayDrugName, strength);
      const baseNameOnly = buildMedicationDedupKey(medName, '');

      const resolvedItemId = item.id || `rx-item-${enc.id}-${dedupKey}`;
      const connectedMed: ConnectedPatientMedication = {
        id: `${enc.id}-${resolvedItemId}`,
        patientId: patient.id,
        encounterId: enc.id,
        prescriptionItemId: resolvedItemId,
        medicineName: medName,
        drugName: displayDrugName,
        strength: strength || item.dosage || '',
        dosage: item.dosage || '1 tablet',
        frequency: item.frequency || 'Once daily',
        duration: item.duration || 'As directed',
        route: item.route || 'Oral',
        timing: item.timing || 'After Food',
        instructions: item.instructions || '',
        prescribingDoctorId: item.prescribingDoctorId || enc.doctorId,
        prescribingDoctorName: formatDoctorDisplayName(item.prescribingDoctorName || enc.doctorName),
        prescribedDate: item.createdDate || enc.date,
        status: effectiveStatus,
        discontinuedAt: item.discontinuedAt || enc.discontinuedAt,
        discontinuedBy: item.discontinuedBy || enc.discontinuedBy,
        discontinuedReason: item.discontinuedReason || enc.discontinuedReason,
        diagnosis: enc.assessmentDiagnosis,
      };

      if (effectiveStatus === 'Draft') {
        draftMedications.push(connectedMed);
        continue;
      }

      if (effectiveStatus === 'Discontinued') {
        discontinuedMedications.push(connectedMed);
        seenKeys.add(dedupKey);
        discontinuedBaseNames.add(baseNameOnly);
        continue;
      }

      // Active status: only include if not already superseded by a newer Active or Discontinued entry
      if (!seenKeys.has(dedupKey)) {
        seenKeys.add(dedupKey);
        activeMedications.push(connectedMed);
      }
    }
  }

  // Merge with unrelated existing baseline strings in patient.currentMedications without duplicating or re-adding discontinued drugs
  const currentMedicationStrings: string[] = activeMedications.map((m) => {
    const freqShort = m.frequency.split('(')[0].trim();
    return `${m.drugName}${freqShort ? ` (${freqShort})` : ''}`;
  });

  for (const existingStr of patient.currentMedications || []) {
    const trimmed = existingStr.trim();
    if (!trimmed) continue;
    const lowerExisting = trimmed.toLowerCase();

    // Check if this existing string matches any active or discontinued prescription item
    const matchesEncounterMed = [...activeMedications, ...discontinuedMedications].some((m) => {
      const mName = m.medicineName.toLowerCase().replace(/^(tab\.|cap\.|syp\.|inj\.|inh\.)\s*/i, '').trim();
      const dName = m.drugName.toLowerCase().replace(/^(tab\.|cap\.|syp\.|inj\.|inh\.)\s*/i, '').trim();
      return (
        (mName.length >= 4 && lowerExisting.includes(mName)) ||
        (dName.length >= 4 && lowerExisting.includes(dName))
      );
    });

    if (!matchesEncounterMed && !currentMedicationStrings.includes(trimmed)) {
      currentMedicationStrings.push(trimmed);
    }
  }

  return {
    activeMedications,
    discontinuedMedications,
    draftMedications,
    currentMedicationStrings,
  };
}

/**
 * Pure state transition: Discontinues either a specific medicine item or all medicines in a clinical encounter.
 * Preserves the encounter and item as a historical record while marking status as 'Discontinued'.
 */
export function discontinuePrescriptionInEncounter(
  encounter: ClinicalEncounter,
  actor: { id: string; name: string },
  options?: {
    prescriptionItemId?: string;
    reason?: string;
    nowIso?: string;
  }
): {
  updatedEncounter: ClinicalEncounter;
  discontinuedItems: PrescriptionItem[];
} {
  const nowIso = options?.nowIso || new Date().toISOString();
  const reason = options?.reason?.trim() || 'Discontinued by prescribing clinician';
  const targetItemId = options?.prescriptionItemId;

  const discontinuedItems: PrescriptionItem[] = [];

  const updatedPrescriptions: PrescriptionItem[] = (encounter.prescriptions || []).map((item) => {
    if (!targetItemId || item.id === targetItemId) {
      if (item.status !== 'Discontinued') {
        const updatedItem: PrescriptionItem = {
          ...item,
          status: 'Discontinued',
          discontinuedAt: nowIso,
          discontinuedBy: formatDoctorDisplayName(actor.name),
          discontinuedReason: reason,
        };
        discontinuedItems.push(updatedItem);
        return updatedItem;
      }
    }
    return item;
  });

  const allDiscontinued =
    updatedPrescriptions.length > 0 && updatedPrescriptions.every((item) => item.status === 'Discontinued');

  const updatedEncounter: ClinicalEncounter = {
    ...encounter,
    prescriptions: updatedPrescriptions,
    prescriptionStatus: allDiscontinued ? 'Discontinued' : encounter.prescriptionStatus || 'Active',
    discontinuedAt: allDiscontinued ? nowIso : encounter.discontinuedAt,
    discontinuedBy: allDiscontinued ? formatDoctorDisplayName(actor.name) : encounter.discontinuedBy,
    discontinuedReason: allDiscontinued ? reason : encounter.discontinuedReason,
    updatedAt: nowIso,
  };

  return {
    updatedEncounter,
    discontinuedItems,
  };
}

/**
 * Creates a strictly Patient-Reported medication activity log entry.
 * Always sets `reportedBy: 'patient'` so clinicians can distinguish patient self-reports from verified clinical records.
 */
export function createPatientMedicationActivity(
  input: {
    id?: string;
    patientId: string;
    patientName: string;
    encounterId: string;
    prescriptionItemId: string;
    medicineName: string;
    status: MedicationActivityStatus;
    note?: string;
  },
  nowIso: string = new Date().toISOString()
): PatientMedicationActivity {
  return {
    id: input.id || `med-act-${Date.now()}`,
    patientId: input.patientId,
    patientName: input.patientName,
    encounterId: input.encounterId,
    prescriptionItemId: input.prescriptionItemId,
    medicineName: input.medicineName,
    status: input.status,
    recordedAt: nowIso,
    note: input.note?.trim() || undefined,
    reportedBy: 'patient',
  };
}

/**
 * Generates a deterministic conversation ID for a (patientId, doctorId) pair
 */
export function buildConversationId(patientId: string, doctorId: string): string {
  return `conv-${patientId}-${doctorId}`;
}

/**
 * Checks whether an actor (patient or hospital staff) is authorized to access, read, or reply to a conversation.
 * - Patient: can ONLY access conversations where `conversation.patientId === actor.id`
 * - Doctor / CMO: can ONLY access conversations where `conversation.doctorId === actor.id`
 * - Hospital Administrator ('admin'): may view conversations across the hospital for administrative oversight
 * - Other staff roles (nurse, records): cannot read or reply to private doctor-patient conversations
 */
export function canAccessConversation(
  actor: { type: 'patient'; id: string } | { type: 'staff'; id: string; role: string },
  conversation: Pick<MessageConversation, 'patientId' | 'doctorId'>
): boolean {
  if (!actor || !actor.id || !conversation) return false;
  if (actor.type === 'patient') {
    return conversation.patientId === actor.id;
  }
  if (actor.role === 'admin') {
    return true;
  }
  if ((actor.role === 'doctor' || actor.role === 'cmo') && conversation.doctorId === actor.id) {
    return true;
  }
  return false;
}

/**
 * Checks whether a staff user is authorized to send a doctor reply in a conversation.
 * Only the assigned doctor (`conversation.doctorId === staffUser.id`) or an authorised hospital administrator ('admin') can reply.
 */
export function canDoctorReplyToConversation(
  staffUser: { id: string; role: string },
  conversation: Pick<MessageConversation, 'doctorId'>
): boolean {
  if (!staffUser || !staffUser.id || !conversation) return false;
  if (staffUser.role === 'admin') return true;
  if ((staffUser.role === 'doctor' || staffUser.role === 'cmo') && conversation.doctorId === staffUser.id) {
    return true;
  }
  return false;
}

/**
 * Returns conversations visible to a specific patient, sorted by lastMessageAt descending.
 */
export function getVisibleConversationsForPatient(
  conversations: MessageConversation[],
  patientId: string,
  statusFilter: 'All' | ConversationStatus = 'Active'
): MessageConversation[] {
  return conversations
    .filter((conv) => {
      if (!canAccessConversation({ type: 'patient', id: patientId }, conv)) return false;
      if (statusFilter !== 'All' && conv.status !== statusFilter) return false;
      return true;
    })
    .slice()
    .sort((a, b) => (b.lastMessageAt || b.createdAt).localeCompare(a.lastMessageAt || a.createdAt));
}

/**
 * Returns conversations visible to a hospital staff user (doctor/CMO sees only their own conversations; admin sees all),
 * sorted by lastMessageAt descending.
 */
export function getVisibleConversationsForStaff(
  conversations: MessageConversation[],
  staffUser: { id: string; role: string },
  statusFilter: 'All' | ConversationStatus = 'Active'
): MessageConversation[] {
  return conversations
    .filter((conv) => {
      if (!canAccessConversation({ type: 'staff', id: staffUser.id, role: staffUser.role }, conv)) {
        return false;
      }
      if (statusFilter !== 'All' && conv.status !== statusFilter) return false;
      return true;
    })
    .slice()
    .sort((a, b) => (b.lastMessageAt || b.createdAt).localeCompare(a.lastMessageAt || a.createdAt));
}

/**
 * Returns messages for a specific conversation in chronological order (oldest to newest).
 */
export function getConversationMessages(
  messages: PatientMessage[],
  conversationId: string
): PatientMessage[] {
  return messages
    .filter((m) => m.conversationId === conversationId)
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

/**
 * Determines whether a conversation is currently awaiting a doctor's reply
 * (i.e. the most recent message in the conversation was sent by the Patient).
 */
export function isConversationAwaitingDoctorReply(
  messages: PatientMessage[],
  conversationId: string
): boolean {
  const convMessages = getConversationMessages(messages, conversationId);
  if (convMessages.length === 0) return false;
  const lastMsg = convMessages[convMessages.length - 1];
  return lastMsg.senderRole === 'Patient' || lastMsg.sender === 'patient';
}

/**
 * Counts unread messages in a conversation for the viewing role:
 * - When viewed by 'Patient': counts unread messages sent by 'Doctor'
 * - When viewed by 'Doctor': counts unread messages sent by 'Patient'
 */
export function getUnreadMessageCountForConversation(
  messages: PatientMessage[],
  conversationId: string,
  viewerRole: MessageSenderRole
): number {
  return messages.filter((m) => {
    if (m.conversationId !== conversationId || m.isRead) return false;
    if (viewerRole === 'Patient') {
      return m.senderRole === 'Doctor' || m.sender === 'doctor';
    }
    return m.senderRole === 'Patient' || m.sender === 'patient';
  }).length;
}

/**
 * Pure function to mark all unread messages from the counterparty in a conversation as read.
 */
export function markConversationMessagesAsRead(
  messages: PatientMessage[],
  conversationId: string,
  viewerRole: MessageSenderRole,
  nowIso: string = new Date().toISOString()
): { updatedMessages: PatientMessage[]; markedCount: number } {
  let markedCount = 0;
  const updatedMessages = messages.map((m) => {
    if (m.conversationId !== conversationId || m.isRead) return m;
    const isFromOtherParty =
      viewerRole === 'Patient'
        ? m.senderRole === 'Doctor' || m.sender === 'doctor'
        : m.senderRole === 'Patient' || m.sender === 'patient';

    if (isFromOtherParty) {
      markedCount += 1;
      return {
        ...m,
        isRead: true,
        readAt: nowIso,
      };
    }
    return m;
  });

  return { updatedMessages, markedCount };
}

/**
 * Pure function to create or update a conversation and append a validated message (from Patient or Doctor).
 */
export function createOrUpdateConversationAndMessage(
  conversations: MessageConversation[],
  messages: PatientMessage[],
  input: {
    conversationId?: string;
    patientId: string;
    patientName: string;
    patientPhotoUrl?: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialty?: string;
    doctorDepartment?: string;
    doctorPhotoUrl?: string;
    senderId: string;
    senderRole: MessageSenderRole;
    text: string;
    category?: MessageCategory;
    relatedAppointmentId?: string;
    attachment?: MessageAttachment;
    messageId?: string;
    nowIso?: string;
  }
): {
  success: boolean;
  error?: string;
  conversation?: MessageConversation;
  message?: PatientMessage;
  updatedConversations: MessageConversation[];
  updatedMessages: PatientMessage[];
} {
  const trimmedText = (input.text || '').trim();
  if (!trimmedText) {
    return {
      success: false,
      error: 'Message text cannot be empty.',
      updatedConversations: conversations,
      updatedMessages: messages,
    };
  }
  if (!input.patientId || !input.doctorId) {
    return {
      success: false,
      error: 'Valid patient and doctor identifiers are required.',
      updatedConversations: conversations,
      updatedMessages: messages,
    };
  }

  const nowIso = input.nowIso || new Date().toISOString();
  const targetConvId =
    input.conversationId ||
    conversations.find((c) => c.patientId === input.patientId && c.doctorId === input.doctorId)?.id ||
    buildConversationId(input.patientId, input.doctorId);

  const existingConv = conversations.find((c) => c.id === targetConvId);

  const updatedConversation: MessageConversation = existingConv
    ? {
        ...existingConv,
        patientName: input.patientName || existingConv.patientName,
        patientPhotoUrl: input.patientPhotoUrl || existingConv.patientPhotoUrl,
        doctorName: formatDoctorDisplayName(input.doctorName || existingConv.doctorName),
        doctorSpecialty: input.doctorSpecialty || existingConv.doctorSpecialty,
        doctorDepartment: input.doctorDepartment || existingConv.doctorDepartment,
        doctorPhotoUrl: input.doctorPhotoUrl || existingConv.doctorPhotoUrl,
        relatedAppointmentId: input.relatedAppointmentId || existingConv.relatedAppointmentId,
        lastMessageAt: nowIso,
        status: 'Active', // Automatically restore to Active when a new message is sent
      }
    : {
        id: targetConvId,
        patientId: input.patientId,
        patientName: input.patientName,
        patientPhotoUrl: input.patientPhotoUrl,
        doctorId: input.doctorId,
        doctorName: formatDoctorDisplayName(input.doctorName),
        doctorSpecialty: input.doctorSpecialty || 'Consultant Specialist',
        doctorDepartment: input.doctorDepartment || 'Outpatient Department',
        doctorPhotoUrl: input.doctorPhotoUrl,
        relatedAppointmentId: input.relatedAppointmentId,
        createdAt: nowIso,
        lastMessageAt: nowIso,
        status: 'Active',
      };

  const newMessage: PatientMessage = {
    id: input.messageId || `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    conversationId: updatedConversation.id,
    patientId: updatedConversation.patientId,
    patientName: updatedConversation.patientName,
    doctorId: updatedConversation.doctorId,
    doctorName: updatedConversation.doctorName,
    doctorSpecialty: updatedConversation.doctorSpecialty,
    doctorPhotoUrl: updatedConversation.doctorPhotoUrl,
    senderId: input.senderId,
    senderRole: input.senderRole,
    sender: input.senderRole === 'Patient' ? 'patient' : 'doctor',
    text: trimmedText,
    timestamp: nowIso,
    isRead: false, // Unread for the recipient until they open the conversation
    category: input.category || 'General Query',
    relatedAppointmentId: input.relatedAppointmentId || updatedConversation.relatedAppointmentId,
    attachment: input.attachment,
  };

  const updatedConversations = existingConv
    ? conversations.map((c) => (c.id === updatedConversation.id ? updatedConversation : c))
    : [updatedConversation, ...conversations];

  const updatedMessages = [...messages, newMessage];

  return {
    success: true,
    conversation: updatedConversation,
    message: newMessage,
    updatedConversations,
    updatedMessages,
  };
}

/**
 * Resolves a patient's connected doctors (from appointments, encounters/prescriptions, or primary physician)
 * along with other hospital directory doctors, returning relationship metadata for starting conversations.
 */
export function getPatientConnectedDoctors(
  patient: Pick<Patient, 'id' | 'primaryPhysician'> | null | undefined,
  doctorsDirectory: DoctorDirectoryItem[],
  appointments: Appointment[],
  encounters: ClinicalEncounter[]
): Array<{
  doctor: DoctorDirectoryItem;
  isConnected: boolean;
  relationshipLabels: string[];
  relatedAppointments: Appointment[];
}> {
  if (!patient) return [];

  const patientApts = appointments.filter((a) => a.patientId === patient.id);
  const patientEncs = encounters.filter((e) => e.patientId === patient.id);

  return doctorsDirectory
    .map((doc) => {
      const labels: string[] = [];
      const docApts = patientApts.filter(
        (a) => a.doctorId === doc.id || a.doctorName.toLowerCase().includes(doc.name.toLowerCase())
      );
      const docEncs = patientEncs.filter(
        (e) => e.doctorId === doc.id || e.doctorName.toLowerCase().includes(doc.name.toLowerCase())
      );

      if (
        patient.primaryPhysician &&
        patient.primaryPhysician.toLowerCase().includes(doc.name.replace(/^Dr\.?\s*/i, '').toLowerCase())
      ) {
        labels.push('Primary Attending Physician');
      }
      if (docApts.length > 0) {
        labels.push(`${docApts.length} Appointment${docApts.length > 1 ? 's' : ''}`);
      }
      if (docEncs.length > 0) {
        labels.push('Prescribing / Consulted Doctor');
      }

      return {
        doctor: doc,
        isConnected: labels.length > 0,
        relationshipLabels: labels.length > 0 ? labels : ['Hospital Specialist Directory'],
        relatedAppointments: docApts,
      };
    })
    .sort((a, b) => Number(b.isConnected) - Number(a.isConnected));
}

// ==========================================
// PHASE 5: HOSPITAL PHARMACY MANAGEMENT RULES
// ==========================================

export function canViewPharmacyDashboard(role: UserRole): boolean {
  return role === 'pharmacist' || role === 'admin' || role === 'doctor' || role === 'cmo';
}

export function canManagePharmacyInventory(role: UserRole): boolean {
  return role === 'pharmacist' || role === 'admin';
}

export function canDispenseMedications(role: UserRole): boolean {
  return role === 'pharmacist' || role === 'admin';
}

export function normalizeMedicineText(value?: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export function normalizeStrength(strength?: string): string {
  return (strength || '').toLowerCase().replace(/\s+/g, '').trim();
}

export function stripDosagePrefix(medicineName?: string): string {
  return (medicineName || '')
    .replace(/^(tab\.?|tablet|cap\.?|capsule|syp\.?|syrup|inj\.?|injection|inh\.?|inhaler|oint\.?|ointment|drops)\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferDosageForm(
  medicineName?: string,
  route?: string,
  explicitForm?: PharmacyDosageForm
): PharmacyDosageForm {
  if (explicitForm) return explicitForm;
  const raw = (medicineName || '').toLowerCase();
  const routeLow = (route || '').toLowerCase();

  if (/\bcap\.?|capsule\b/i.test(raw)) return 'Capsule';
  if (/\binh\.?|inhaler|puffs?\b/i.test(raw) || routeLow.includes('inhal')) return 'Inhaler';
  if (/\binj\.?|injection\b/i.test(raw) || routeLow === 'iv' || routeLow === 'im' || routeLow.includes('subcut')) {
    return 'Injection';
  }
  if (/\bsyp\.?|syrup\b/i.test(raw)) return 'Syrup';
  if (/\boint\.?|ointment|cream|gel\b/i.test(raw) || routeLow.includes('topic')) return 'Ointment';
  if (/\bdrops?\b/i.test(raw) || routeLow.includes('ophthalm')) return 'Drops';
  if (/\bpowder\b/i.test(raw)) return 'Powder';
  if (/\bsolution\b/i.test(raw)) return 'Solution';
  return 'Tablet';
}

export function parsePrescriptionMedicineSignature(
  item: Pick<PrescriptionItem, 'medicineName' | 'drugName' | 'genericName' | 'strength' | 'dosage' | 'route' | 'dosageForm'>
): {
  genericOrBrandName: string;
  normalizedStrength: string;
  dosageForm: PharmacyDosageForm;
} {
  const dosageForm = inferDosageForm(item.medicineName || item.drugName, item.route, item.dosageForm);
  const baseSource = (item.genericName || item.medicineName || item.drugName || '').trim();
  let cleanName = stripDosagePrefix(baseSource);
  // Remove "(SOS)" or trailing paren annotations
  cleanName = cleanName.replace(/\s*\(sos\)\s*/gi, ' ').trim();

  const rawStrength = (item.strength || '').trim();
  const normalizedStr = normalizeStrength(rawStrength);

  // If cleanName ends with the strength token (e.g., "Tab. Telmisartan 40 mg" when drugName was passed), strip strength
  if (normalizedStr) {
    const cleanLowerNoSpace = cleanName.toLowerCase().replace(/\s+/g, '');
    if (cleanLowerNoSpace.endsWith(normalizedStr)) {
      const escapedStr = rawStrength.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*');
      cleanName = cleanName.replace(new RegExp(`\\s*${escapedStr}$`, 'i'), '').trim();
    }
  }

  return {
    genericOrBrandName: normalizeMedicineText(cleanName),
    normalizedStrength: normalizedStr,
    dosageForm,
  };
}

/**
 * Matches a prescription item to a catalogue medicine strictly by:
 * (genericName OR brandName) + normalized strength + dosageForm.
 * NEVER matches by name alone and NEVER silently substitutes strengths or forms.
 */
export function matchPrescriptionItemToCatalogue(
  item: Pick<PrescriptionItem, 'medicineName' | 'drugName' | 'genericName' | 'strength' | 'dosage' | 'route' | 'dosageForm'>,
  catalogue: PharmacyMedicine[],
  includeInactive: boolean = false
): {
  matchedMedicine?: PharmacyMedicine;
  signature: { genericOrBrandName: string; normalizedStrength: string; dosageForm: PharmacyDosageForm };
  matchStatus: 'EXACT_MATCH' | 'INACTIVE_MATCH' | 'NO_MATCH';
} {
  const signature = parsePrescriptionMedicineSignature(item);
  if (!signature.genericOrBrandName || !signature.normalizedStrength) {
    return { signature, matchStatus: 'NO_MATCH' };
  }

  const exact = catalogue.find((med) => {
    const medGeneric = normalizeMedicineText(med.genericName);
    const medBrand = normalizeMedicineText(med.brandName);
    const nameMatches =
      medGeneric === signature.genericOrBrandName ||
      (medBrand.length > 0 && medBrand === signature.genericOrBrandName);
    if (!nameMatches) return false;

    const strengthMatches = normalizeStrength(med.strength) === signature.normalizedStrength;
    if (!strengthMatches) return false;

    const formMatches = med.dosageForm.toLowerCase() === signature.dosageForm.toLowerCase();
    return formMatches;
  });

  if (!exact) {
    return { signature, matchStatus: 'NO_MATCH' };
  }

  if (exact.status === 'Inactive' && !includeInactive) {
    return { matchedMedicine: exact, signature, matchStatus: 'INACTIVE_MATCH' };
  }

  return { matchedMedicine: exact, signature, matchStatus: 'EXACT_MATCH' };
}

export function getDaysUntilExpiry(expiryDate: string, todayDate: string): number {
  const expMs = Date.parse(`${expiryDate}T00:00:00Z`);
  const todayMs = Date.parse(`${todayDate}T00:00:00Z`);
  if (Number.isNaN(expMs) || Number.isNaN(todayMs)) return 9999;
  return Math.floor((expMs - todayMs) / (1000 * 60 * 60 * 24));
}

export function isBatchExpired(expiryDate: string, todayDate: string): boolean {
  if (!expiryDate) return true;
  return expiryDate <= todayDate;
}

export function isBatchNearExpiry(expiryDate: string, todayDate: string, windowDays: number = 60): boolean {
  if (isBatchExpired(expiryDate, todayDate)) return false;
  const days = getDaysUntilExpiry(expiryDate, todayDate);
  return days > 0 && days <= windowDays;
}

export interface MedicineStockSummary {
  medicine: PharmacyMedicine;
  usableQuantity: number;
  expiredQuantity: number;
  nearExpiryQuantity: number;
  totalPhysicalQuantity: number;
  usableBatches: PharmacyBatch[];
  nearExpiryBatches: PharmacyBatch[];
  expiredBatches: PharmacyBatch[];
  earliestUsableExpiry?: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Inactive';
}

export function getMedicineStockSummary(
  medicine: PharmacyMedicine,
  batches: PharmacyBatch[],
  todayDate: string,
  nearExpiryWindowDays: number = 60
): MedicineStockSummary {
  const medBatches = batches.filter((b) => b.medicineId === medicine.id);

  const expiredBatches = medBatches
    .filter((b) => isBatchExpired(b.expiryDate, todayDate) && b.availableQuantity > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const usableBatches = medBatches
    .filter((b) => !isBatchExpired(b.expiryDate, todayDate) && b.availableQuantity > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)); // FEFO: earliest expiry first

  const nearExpiryBatches = usableBatches.filter((b) =>
    isBatchNearExpiry(b.expiryDate, todayDate, nearExpiryWindowDays)
  );

  const usableQuantity = usableBatches.reduce((sum, b) => sum + Math.max(0, b.availableQuantity), 0);
  const expiredQuantity = expiredBatches.reduce((sum, b) => sum + Math.max(0, b.availableQuantity), 0);
  const nearExpiryQuantity = nearExpiryBatches.reduce((sum, b) => sum + Math.max(0, b.availableQuantity), 0);

  let stockStatus: MedicineStockSummary['stockStatus'] = 'In Stock';
  if (medicine.status === 'Inactive') {
    stockStatus = 'Inactive';
  } else if (usableQuantity <= 0) {
    stockStatus = 'Out of Stock';
  } else if (usableQuantity <= medicine.minimumStockThreshold) {
    stockStatus = 'Low Stock';
  }

  return {
    medicine,
    usableQuantity,
    expiredQuantity,
    nearExpiryQuantity,
    totalPhysicalQuantity: usableQuantity + expiredQuantity,
    usableBatches,
    nearExpiryBatches,
    expiredBatches,
    earliestUsableExpiry: usableBatches[0]?.expiryDate,
    stockStatus,
  };
}

/**
 * Estimates the prescribed dispense unit count cleanly from frequency + duration,
 * respecting explicit `prescribedQuantity` when supplied.
 */
export function estimatePrescribedQuantity(
  item: Pick<PrescriptionItem, 'prescribedQuantity' | 'frequency' | 'duration' | 'medicineName' | 'drugName' | 'route' | 'dosageForm'>
): number {
  if (typeof item.prescribedQuantity === 'number' && item.prescribedQuantity > 0) {
    return Math.round(item.prescribedQuantity);
  }

  const form = inferDosageForm(item.medicineName || item.drugName, item.route, item.dosageForm);
  if (form === 'Inhaler' || form === 'Ointment' || form === 'Drops' || form === 'Syrup' || form === 'Solution') {
    return 1;
  }

  const freqStr = (item.frequency || '').trim();
  let dosesPerDay = 1;
  const patternMatch = freqStr.match(/(\d+)\s*-\s*(\d+)\s*-\s*(\d+)/);
  if (patternMatch) {
    const sum = Number(patternMatch[1]) + Number(patternMatch[2]) + Number(patternMatch[3]);
    dosesPerDay = sum > 0 ? sum : 1;
  } else if (/twice|bd|bid/i.test(freqStr)) {
    dosesPerDay = 2;
  } else if (/thrice|tds|tid/i.test(freqStr)) {
    dosesPerDay = 3;
  } else if (/qid|four/i.test(freqStr)) {
    dosesPerDay = 4;
  } else if (/sos|needed/i.test(freqStr)) {
    return 10;
  }

  const durStr = (item.duration || '').trim();
  const daysMatch = durStr.match(/(\d+)\s*day/i);
  const weeksMatch = durStr.match(/(\d+)\s*week/i);
  const monthsMatch = durStr.match(/(\d+)\s*month/i);

  let days = 30;
  if (daysMatch) {
    days = Math.max(1, Number(daysMatch[1]));
  } else if (weeksMatch) {
    days = Math.max(1, Number(weeksMatch[1]) * 7);
  } else if (monthsMatch) {
    days = Math.max(1, Number(monthsMatch[1]) * 30);
  } else {
    const rawNum = durStr.match(/^(\d+)$/);
    if (rawNum) days = Math.max(1, Number(rawNum[1]));
  }

  return Math.max(1, dosesPerDay * days);
}

/**
 * Pure catalogue addition with duplicate (genericName + strength + dosageForm) protection.
 */
export function addCatalogueMedicine(
  catalogue: PharmacyMedicine[],
  input: {
    id?: string;
    genericName: string;
    brandName?: string;
    strength: string;
    dosageForm: PharmacyDosageForm;
    manufacturer: string;
    category: string;
    storageRequirements?: string;
    unitOfMeasurement?: string;
    minimumStockThreshold: number;
  },
  nowIso: string = new Date().toISOString()
): { success: boolean; error?: string; medicine?: PharmacyMedicine; updatedCatalogue: PharmacyMedicine[] } {
  const genericName = (input.genericName || '').trim();
  const strength = (input.strength || '').trim();
  const manufacturer = (input.manufacturer || '').trim();
  const category = (input.category || '').trim();

  if (!genericName || !strength || !manufacturer || !category) {
    return {
      success: false,
      error: 'Generic name, strength, manufacturer, and category are required.',
      updatedCatalogue: catalogue,
    };
  }
  if (!Number.isFinite(input.minimumStockThreshold) || input.minimumStockThreshold < 0) {
    return {
      success: false,
      error: 'Minimum stock threshold must be zero or a positive number.',
      updatedCatalogue: catalogue,
    };
  }

  const duplicate = catalogue.some(
    (m) =>
      normalizeMedicineText(m.genericName) === normalizeMedicineText(genericName) &&
      normalizeStrength(m.strength) === normalizeStrength(strength) &&
      m.dosageForm === input.dosageForm
  );

  if (duplicate) {
    return {
      success: false,
      error: `${genericName} ${strength} (${input.dosageForm}) already exists in the pharmacy catalogue.`,
      updatedCatalogue: catalogue,
    };
  }

  const defaultUnit =
    input.unitOfMeasurement?.trim() ||
    (input.dosageForm === 'Tablet'
      ? 'Tablets'
      : input.dosageForm === 'Capsule'
      ? 'Capsules'
      : input.dosageForm === 'Inhaler'
      ? 'Inhalers'
      : input.dosageForm === 'Injection'
      ? 'Vials'
      : 'Units');

  const newMed: PharmacyMedicine = {
    id: input.id || `med-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    genericName,
    brandName: input.brandName?.trim() || undefined,
    strength,
    dosageForm: input.dosageForm,
    manufacturer,
    category,
    storageRequirements: input.storageRequirements?.trim() || 'Store below 25°C in a dry place',
    unitOfMeasurement: defaultUnit,
    minimumStockThreshold: Math.round(input.minimumStockThreshold),
    status: 'Active',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  return {
    success: true,
    medicine: newMed,
    updatedCatalogue: [newMed, ...catalogue],
  };
}

/**
 * Pure new batch stock receipt. Blocks duplicate (medicineId + batchNumber), invalid qty, and already-expired stock.
 */
export function receiveNewPharmacyBatch(
  batches: PharmacyBatch[],
  catalogue: PharmacyMedicine[],
  input: {
    id?: string;
    medicineId: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    purchaseDate: string;
    supplierReference: string;
    supplierName: string;
    stockLocation: string;
    reason?: string;
  },
  actor: { id: string; name: string; role: UserRole },
  todayDate: string,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  error?: string;
  batch?: PharmacyBatch;
  transaction?: PharmacyTransaction;
  updatedBatches: PharmacyBatch[];
} {
  if (!canManagePharmacyInventory(actor.role)) {
    return {
      success: false,
      error: 'Only authorised Pharmacy Staff or Hospital Administrators can receive stock.',
      updatedBatches: batches,
    };
  }

  const med = catalogue.find((m) => m.id === input.medicineId);
  if (!med) {
    return { success: false, error: 'Selected medicine not found in catalogue.', updatedBatches: batches };
  }

  const batchNo = (input.batchNumber || '').trim().toUpperCase();
  if (!batchNo) {
    return { success: false, error: 'Batch number is required.', updatedBatches: batches };
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    return { success: false, error: 'Received quantity must be greater than zero.', updatedBatches: batches };
  }
  if (!input.expiryDate || isBatchExpired(input.expiryDate, todayDate)) {
    return {
      success: false,
      error: 'Cannot receive expired stock. Expiry date must be after today.',
      updatedBatches: batches,
    };
  }

  const dupBatch = batches.some(
    (b) => b.medicineId === med.id && b.batchNumber.toUpperCase() === batchNo
  );
  if (dupBatch) {
    return {
      success: false,
      error: `Batch ${batchNo} already exists for ${med.genericName} ${med.strength}. Use "Add Stock to Existing Batch" instead.`,
      updatedBatches: batches,
    };
  }

  const qty = Math.round(input.quantity);
  const newBatch: PharmacyBatch = {
    id: input.id || `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    medicineId: med.id,
    batchNumber: batchNo,
    availableQuantity: qty,
    expiryDate: input.expiryDate,
    purchaseDate: input.purchaseDate || todayDate,
    supplierReference: (input.supplierReference || '').trim() || `PO-${todayDate.replace(/-/g, '')}`,
    supplierName: (input.supplierName || '').trim() || 'Approved Hospital Distributor',
    stockLocation: (input.stockLocation || '').trim() || 'Main Dispensary Rack A1',
    unitOfMeasurement: med.unitOfMeasurement,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const transaction: PharmacyTransaction = {
    id: `ptx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    medicineId: med.id,
    medicineName: `${med.genericName} ${med.strength} (${med.dosageForm})`,
    batchId: newBatch.id,
    batchNumber: newBatch.batchNumber,
    transactionType: 'Stock Receipt',
    quantityDelta: qty,
    previousQuantity: 0,
    newQuantity: qty,
    timestamp: nowIso,
    staffId: actor.id,
    staffName: actor.name,
    staffRole: actor.role,
    reason: input.reason?.trim() || `New batch received from ${newBatch.supplierName} (Ref: ${newBatch.supplierReference})`,
  };

  return {
    success: true,
    batch: newBatch,
    transaction,
    updatedBatches: [newBatch, ...batches],
  };
}

/**
 * Pure stock adjustment on an existing batch.
 * Enforces mandatory reason, authorised role, and strictly prevents negative inventory.
 */
export function adjustPharmacyBatchStock(
  batches: PharmacyBatch[],
  catalogue: PharmacyMedicine[],
  input: {
    batchId: string;
    quantityDelta: number; // positive or negative
    reason: string;
    transactionType?: 'Stock Adjustment' | 'Batch Addition' | 'Expiry Write-Off';
  },
  actor: { id: string; name: string; role: UserRole },
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  error?: string;
  batch?: PharmacyBatch;
  transaction?: PharmacyTransaction;
  updatedBatches: PharmacyBatch[];
} {
  if (!canManagePharmacyInventory(actor.role)) {
    return {
      success: false,
      error: 'Only authorised Pharmacy Staff or Hospital Administrators can adjust inventory.',
      updatedBatches: batches,
    };
  }

  const reason = (input.reason || '').trim();
  if (reason.length < 3) {
    return {
      success: false,
      error: 'A clear clinical or inventory reason is mandatory for every stock adjustment.',
      updatedBatches: batches,
    };
  }

  if (!Number.isFinite(input.quantityDelta) || Math.round(input.quantityDelta) === 0) {
    return {
      success: false,
      error: 'Quantity adjustment cannot be zero.',
      updatedBatches: batches,
    };
  }

  const targetBatch = batches.find((b) => b.id === input.batchId);
  if (!targetBatch) {
    return { success: false, error: 'Target inventory batch not found.', updatedBatches: batches };
  }

  const med = catalogue.find((m) => m.id === targetBatch.medicineId);
  const delta = Math.round(input.quantityDelta);
  const previousQty = targetBatch.availableQuantity;
  const newQty = previousQty + delta;

  if (newQty < 0) {
    return {
      success: false,
      error: `Adjustment rejected: Batch ${targetBatch.batchNumber} has ${previousQty} units. Negative stock is prohibited.`,
      updatedBatches: batches,
    };
  }

  const updatedBatch: PharmacyBatch = {
    ...targetBatch,
    availableQuantity: newQty,
    updatedAt: nowIso,
  };

  const txType =
    input.transactionType ||
    (delta > 0 ? 'Batch Addition' : reason.toLowerCase().includes('expir') ? 'Expiry Write-Off' : 'Stock Adjustment');

  const transaction: PharmacyTransaction = {
    id: `ptx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    medicineId: targetBatch.medicineId,
    medicineName: med ? `${med.genericName} ${med.strength} (${med.dosageForm})` : targetBatch.medicineId,
    batchId: targetBatch.id,
    batchNumber: targetBatch.batchNumber,
    transactionType: txType,
    quantityDelta: delta,
    previousQuantity: previousQty,
    newQuantity: newQty,
    timestamp: nowIso,
    staffId: actor.id,
    staffName: actor.name,
    staffRole: actor.role,
    reason,
  };

  return {
    success: true,
    batch: updatedBatch,
    transaction,
    updatedBatches: batches.map((b) => (b.id === updatedBatch.id ? updatedBatch : b)),
  };
}

export interface DoctorMedicineAvailabilitySnapshot {
  availabilityStatus: 'Available' | 'Low Stock' | 'Out of Stock' | 'Inactive' | 'Not in Formulary';
  matchedMedicine?: PharmacyMedicine;
  usableQuantity: number;
  usableBatchCount: number;
  earliestExpiry?: string;
  disclaimer: string;
}

/**
 * Live read-only hospital pharmacy stock check for doctors while authoring a prescription.
 * Never auto-substitutes and never blocks prescribing.
 */
export function checkMedicineAvailabilityForDoctor(
  item: Pick<PrescriptionItem, 'medicineName' | 'drugName' | 'genericName' | 'strength' | 'dosage' | 'route' | 'dosageForm'>,
  catalogue: PharmacyMedicine[],
  batches: PharmacyBatch[],
  todayDate: string
): DoctorMedicineAvailabilitySnapshot {
  const disclaimer =
    'Live pharmacy stock snapshot at consultation time — stock is not reserved and may change before dispensing.';

  const matchResult = matchPrescriptionItemToCatalogue(item, catalogue, true);
  if (!matchResult.matchedMedicine) {
    return {
      availabilityStatus: 'Not in Formulary',
      usableQuantity: 0,
      usableBatchCount: 0,
      disclaimer,
    };
  }

  const summary = getMedicineStockSummary(matchResult.matchedMedicine, batches, todayDate);
  if (summary.stockStatus === 'Inactive') {
    return {
      availabilityStatus: 'Inactive',
      matchedMedicine: matchResult.matchedMedicine,
      usableQuantity: summary.usableQuantity,
      usableBatchCount: summary.usableBatches.length,
      earliestExpiry: summary.earliestUsableExpiry,
      disclaimer,
    };
  }

  return {
    availabilityStatus:
      summary.stockStatus === 'In Stock'
        ? 'Available'
        : summary.stockStatus === 'Low Stock'
        ? 'Low Stock'
        : 'Out of Stock',
    matchedMedicine: matchResult.matchedMedicine,
    usableQuantity: summary.usableQuantity,
    usableBatchCount: summary.usableBatches.length,
    earliestExpiry: summary.earliestUsableExpiry,
    disclaimer,
  };
}

export interface PrescriptionItemDispenseState {
  prescriptionItemId: string;
  item: PrescriptionItem;
  prescribedQuantity: number;
  dispensedQuantity: number;
  remainingQuantity: number;
  itemStatus: PharmacyDispensingItemStatus;
  lastDispensedAt?: string;
  lastBatchNumber?: string;
  lastNote?: string;
}

export interface PrescriptionDispensingSummary {
  encounterId: string;
  overallStatus: PharmacyDispensingStatus;
  isEligibleForDispensing: boolean;
  ineligibleReason?: string;
  lastDispensedAt?: string;
  lastDispensedBy?: string;
  items: PrescriptionItemDispenseState[];
}

export function getPrescriptionDispensingSummary(
  encounter: ClinicalEncounter,
  dispensingRecords: PharmacyDispensingRecord[]
): PrescriptionDispensingSummary {
  const rxRecords = dispensingRecords
    .filter((r) => r.encounterId === encounter.id)
    .slice()
    .sort((a, b) => b.dispensedAt.localeCompare(a.dispensedAt));

  const encRxStatus: PrescriptionStatus =
    encounter.prescriptionStatus || (encounter.status === 'Draft' ? 'Draft' : 'Active');

  const items: PrescriptionItemDispenseState[] = (encounter.prescriptions || []).map((item, idx) => {
    const itemId = item.id || `rx-${encounter.id}-${idx + 1}`;
    const prescribedQty = estimatePrescribedQuantity(item);
    let totalDispensed = 0;
    let markedUnavailable = false;
    let lastDispensedAt: string | undefined;
    let lastBatchNumber: string | undefined;
    let lastNote: string | undefined;

    for (const rec of rxRecords) {
      const recItem = rec.items.find((ri) => ri.prescriptionItemId === itemId);
      if (recItem) {
        totalDispensed += recItem.dispensedQuantity;
        if (!lastDispensedAt) {
          lastDispensedAt = rec.dispensedAt;
          lastBatchNumber = recItem.batchNumber;
          lastNote = recItem.note;
        }
        if (recItem.status === 'Unavailable' && totalDispensed === 0) {
          markedUnavailable = true;
        }
      }
    }

    const clampedDispensed = Math.min(prescribedQty, totalDispensed);
    const remainingQty = Math.max(0, prescribedQty - clampedDispensed);

    let itemStatus: PharmacyDispensingItemStatus = 'Not Yet Dispensed';
    if (remainingQty === 0 && clampedDispensed > 0) {
      itemStatus = 'Dispensed';
    } else if (clampedDispensed > 0 && remainingQty > 0) {
      itemStatus = 'Partially Dispensed';
    } else if (markedUnavailable) {
      itemStatus = 'Unavailable';
    }

    return {
      prescriptionItemId: itemId,
      item,
      prescribedQuantity: prescribedQty,
      dispensedQuantity: clampedDispensed,
      remainingQuantity: remainingQty,
      itemStatus,
      lastDispensedAt,
      lastBatchNumber,
      lastNote,
    };
  });

  const activeItems = items.filter((it) => it.item.status !== 'Discontinued' && it.item.status !== 'Draft');

  let overallStatus: PharmacyDispensingStatus = 'Not Yet Dispensed';
  if (activeItems.length > 0 && activeItems.every((it) => it.itemStatus === 'Dispensed')) {
    overallStatus = 'Fully Dispensed';
  } else if (
    activeItems.some((it) => it.dispensedQuantity > 0)
  ) {
    overallStatus = 'Partially Dispensed';
  } else if (
    activeItems.length > 0 &&
    activeItems.every((it) => it.itemStatus === 'Unavailable')
  ) {
    overallStatus = 'Unavailable';
  } else if (activeItems.some((it) => it.itemStatus === 'Unavailable')) {
    overallStatus = 'Partially Dispensed';
  }

  let isEligibleForDispensing = true;
  let ineligibleReason: string | undefined;

  if (encRxStatus === 'Draft' || encounter.status === 'Draft') {
    isEligibleForDispensing = false;
    ineligibleReason = 'Draft prescriptions cannot be dispensed until finalized and activated by a doctor.';
  } else if (encRxStatus === 'Discontinued' || activeItems.length === 0) {
    isEligibleForDispensing = false;
    ineligibleReason = 'Prescription is discontinued or has no active medicines to dispense.';
  } else if (overallStatus === 'Fully Dispensed') {
    isEligibleForDispensing = false;
    ineligibleReason = 'All prescribed items have already been fully dispensed (duplicate dispensing blocked).';
  }

  return {
    encounterId: encounter.id,
    overallStatus,
    isEligibleForDispensing,
    ineligibleReason,
    lastDispensedAt: rxRecords[0]?.dispensedAt,
    lastDispensedBy: rxRecords[0]?.dispensedByStaffName,
    items,
  };
}

export interface DispenseLineInput {
  prescriptionItemId: string;
  action: 'dispense' | 'unavailable';
  batchId?: string;
  quantity?: number;
  note?: string;
}

/**
 * Pure pharmacist dispensing engine:
 * - Enforces Pharmacist / Admin permission
 * - Blocks Draft, Discontinued, and already-Fully-Dispensed prescriptions
 * - Enforces exact generic+strength+dosageForm catalogue matching (no silent substitution)
 * - Blocks expired batches, over-dispensing beyond remaining quantity, and negative stock
 * - Deducts stock and produces PharmacyDispensingRecord + PharmacyTransaction entries
 */
export function confirmPharmacyDispensing(
  encounter: ClinicalEncounter,
  lineInputs: DispenseLineInput[],
  state: {
    catalogue: PharmacyMedicine[];
    batches: PharmacyBatch[];
    dispensingRecords: PharmacyDispensingRecord[];
  },
  actor: { id: string; name: string; role: UserRole },
  todayDate: string,
  notes?: string,
  nowIso: string = new Date().toISOString()
): {
  success: boolean;
  error?: string;
  record?: PharmacyDispensingRecord;
  updatedBatches: PharmacyBatch[];
  newTransactions: PharmacyTransaction[];
  updatedDispensingRecords: PharmacyDispensingRecord[];
} {
  if (!canDispenseMedications(actor.role)) {
    return {
      success: false,
      error: 'Access Denied: Only authorised Pharmacists or Hospital Administrators can dispense medications.',
      updatedBatches: state.batches,
      newTransactions: [],
      updatedDispensingRecords: state.dispensingRecords,
    };
  }

  const currentSummary = getPrescriptionDispensingSummary(encounter, state.dispensingRecords);
  if (!currentSummary.isEligibleForDispensing) {
    return {
      success: false,
      error: currentSummary.ineligibleReason || 'Prescription is not eligible for dispensing.',
      updatedBatches: state.batches,
      newTransactions: [],
      updatedDispensingRecords: state.dispensingRecords,
    };
  }

  if (!lineInputs || lineInputs.length === 0) {
    return {
      success: false,
      error: 'Select at least one medicine line to dispense or mark unavailable.',
      updatedBatches: state.batches,
      newTransactions: [],
      updatedDispensingRecords: state.dispensingRecords,
    };
  }

  let workingBatches = state.batches.map((b) => ({ ...b }));
  const newTransactions: PharmacyTransaction[] = [];
  const dispensingRecordId = `DISP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const processedItems: PharmacyDispensingRecord['items'] = [];

  for (const input of lineInputs) {
    const itemState = currentSummary.items.find((it) => it.prescriptionItemId === input.prescriptionItemId);
    if (!itemState) {
      return {
        success: false,
        error: `Prescription item ${input.prescriptionItemId} not found in encounter ${encounter.id}.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    if (itemState.item.status === 'Discontinued' || itemState.item.status === 'Draft') {
      return {
        success: false,
        error: `${itemState.item.drugName || itemState.item.medicineName} has status ${itemState.item.status} and cannot be dispensed.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    if (itemState.remainingQuantity <= 0) {
      return {
        success: false,
        error: `${itemState.item.drugName || itemState.item.medicineName} is already fully dispensed.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    const sig = parsePrescriptionMedicineSignature(itemState.item);
    const exactMatch = matchPrescriptionItemToCatalogue(itemState.item, state.catalogue, false);

    if (input.action === 'unavailable') {
      processedItems.push({
        prescriptionItemId: itemState.prescriptionItemId,
        medicineId: exactMatch.matchedMedicine?.id,
        requestedMedicineName: itemState.item.drugName || itemState.item.medicineName || 'Medicine',
        requestedGenericName: sig.genericOrBrandName,
        requestedStrength: itemState.item.strength || '',
        requestedDosageForm: sig.dosageForm,
        prescribedQuantity: itemState.prescribedQuantity,
        dispensedQuantity: 0,
        previouslyDispensedQuantity: itemState.dispensedQuantity,
        remainingQuantity: itemState.remainingQuantity,
        status: 'Unavailable',
        note: input.note?.trim() || 'Medicine unavailable in hospital pharmacy stock',
      });
      continue;
    }

    // Dispense validation
    if (!exactMatch.matchedMedicine) {
      return {
        success: false,
        error: `No active formulary match (exact generic + strength + dosage form) for "${itemState.item.drugName || itemState.item.medicineName}". Automatic substitution is prohibited.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    if (!input.batchId) {
      return {
        success: false,
        error: `Please select a valid non-expired batch for ${exactMatch.matchedMedicine.genericName} ${exactMatch.matchedMedicine.strength}.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    const batchIdx = workingBatches.findIndex((b) => b.id === input.batchId);
    if (batchIdx < 0) {
      return {
        success: false,
        error: 'Selected inventory batch was not found.',
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    const targetBatch = workingBatches[batchIdx];
    if (targetBatch.medicineId !== exactMatch.matchedMedicine.id) {
      return {
        success: false,
        error: `Batch ${targetBatch.batchNumber} does not belong to ${exactMatch.matchedMedicine.genericName} ${exactMatch.matchedMedicine.strength} (${exactMatch.matchedMedicine.dosageForm}). Substitution is prohibited.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    if (isBatchExpired(targetBatch.expiryDate, todayDate)) {
      return {
        success: false,
        error: `Safety Block: Batch ${targetBatch.batchNumber} expired on ${targetBatch.expiryDate} and cannot be dispensed.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    const requestedQty = Math.round(input.quantity || 0);
    if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
      return {
        success: false,
        error: `Dispense quantity for ${exactMatch.matchedMedicine.genericName} must be greater than zero.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    if (requestedQty > itemState.remainingQuantity) {
      return {
        success: false,
        error: `Cannot dispense ${requestedQty} units of ${exactMatch.matchedMedicine.genericName} — only ${itemState.remainingQuantity} prescribed units remain.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    if (requestedQty > targetBatch.availableQuantity) {
      return {
        success: false,
        error: `Insufficient stock in batch ${targetBatch.batchNumber}: available ${targetBatch.availableQuantity}, requested ${requestedQty}.`,
        updatedBatches: state.batches,
        newTransactions: [],
        updatedDispensingRecords: state.dispensingRecords,
      };
    }

    const prevQty = targetBatch.availableQuantity;
    const newQty = prevQty - requestedQty;
    workingBatches[batchIdx] = {
      ...targetBatch,
      availableQuantity: newQty,
      updatedAt: nowIso,
    };

    const nextRemaining = itemState.remainingQuantity - requestedQty;
    const itemResultStatus: PharmacyDispensingItemStatus =
      nextRemaining === 0 ? 'Dispensed' : 'Partially Dispensed';

    processedItems.push({
      prescriptionItemId: itemState.prescriptionItemId,
      medicineId: exactMatch.matchedMedicine.id,
      requestedMedicineName: itemState.item.drugName || itemState.item.medicineName || exactMatch.matchedMedicine.genericName,
      requestedGenericName: exactMatch.matchedMedicine.genericName,
      requestedStrength: exactMatch.matchedMedicine.strength,
      requestedDosageForm: exactMatch.matchedMedicine.dosageForm,
      prescribedQuantity: itemState.prescribedQuantity,
      dispensedQuantity: requestedQty,
      previouslyDispensedQuantity: itemState.dispensedQuantity,
      remainingQuantity: nextRemaining,
      batchId: targetBatch.id,
      batchNumber: targetBatch.batchNumber,
      status: itemResultStatus,
      note: input.note?.trim() || undefined,
    });

    newTransactions.push({
      id: `ptx-${Date.now()}-${newTransactions.length + 1}-${Math.floor(Math.random() * 1000)}`,
      medicineId: exactMatch.matchedMedicine.id,
      medicineName: `${exactMatch.matchedMedicine.genericName} ${exactMatch.matchedMedicine.strength} (${exactMatch.matchedMedicine.dosageForm})`,
      batchId: targetBatch.id,
      batchNumber: targetBatch.batchNumber,
      transactionType: itemResultStatus === 'Dispensed' ? 'Dispense' : 'Partial Dispense',
      quantityDelta: -requestedQty,
      previousQuantity: prevQty,
      newQuantity: newQty,
      timestamp: nowIso,
      staffId: actor.id,
      staffName: actor.name,
      staffRole: actor.role,
      reason: `Dispensed for Prescription ${encounter.id} (${encounter.patientName})`,
      relatedPrescriptionId: encounter.id,
      relatedPrescriptionItemId: itemState.prescriptionItemId,
      relatedDispensingRecordId: dispensingRecordId,
      patientId: encounter.patientId,
      patientName: encounter.patientName,
    });
  }

  const tentativeRecord: PharmacyDispensingRecord = {
    id: dispensingRecordId,
    encounterId: encounter.id,
    patientId: encounter.patientId,
    patientName: encounter.patientName,
    prescribingDoctorId: encounter.doctorId,
    prescribingDoctorName: formatDoctorDisplayName(encounter.doctorName),
    prescriptionDate: encounter.date,
    dispensedAt: nowIso,
    dispensedByStaffId: actor.id,
    dispensedByStaffName: actor.name,
    status: 'Partially Dispensed',
    items: processedItems,
    notes: notes?.trim() || undefined,
  };

  const nextRecords = [tentativeRecord, ...state.dispensingRecords];
  const updatedOverallSummary = getPrescriptionDispensingSummary(encounter, nextRecords);
  tentativeRecord.status = updatedOverallSummary.overallStatus;

  return {
    success: true,
    record: tentativeRecord,
    updatedBatches: workingBatches,
    newTransactions,
    updatedDispensingRecords: nextRecords,
  };
}

/**
 * Creates a purely local Reorder Draft / Purchase Request without placing real external orders.
 */
export function createLocalReorderRequest(
  catalogue: PharmacyMedicine[],
  batches: PharmacyBatch[],
  input: {
    medicineId: string;
    requestedQuantity: number;
    supplierName: string;
    supplierReference?: string;
    reason?: 'Low Stock' | 'Out of Stock' | 'Near Expiry Replacement';
    notes?: string;
    submitImmediately?: boolean;
  },
  actor: { id: string; name: string; role: UserRole },
  todayDate: string,
  nowIso: string = new Date().toISOString()
): { success: boolean; error?: string; request?: PharmacyReorderRequest } {
  if (!canManagePharmacyInventory(actor.role)) {
    return {
      success: false,
      error: 'Only authorised Pharmacy Staff or Hospital Administrators can create reorder requests.',
    };
  }
  const med = catalogue.find((m) => m.id === input.medicineId);
  if (!med) {
    return { success: false, error: 'Medicine not found in catalogue.' };
  }
  if (!Number.isFinite(input.requestedQuantity) || input.requestedQuantity <= 0) {
    return { success: false, error: 'Requested quantity must be greater than zero.' };
  }

  const summary = getMedicineStockSummary(med, batches, todayDate);
  const autoReason: PharmacyReorderRequest['reason'] =
    input.reason ||
    (summary.usableQuantity === 0
      ? 'Out of Stock'
      : summary.nearExpiryQuantity > 0 && summary.usableQuantity <= med.minimumStockThreshold
      ? 'Near Expiry Replacement'
      : 'Low Stock');

  const request: PharmacyReorderRequest = {
    id: `PRQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    medicineId: med.id,
    genericName: med.genericName,
    brandName: med.brandName,
    strength: med.strength,
    dosageForm: med.dosageForm,
    requestedQuantity: Math.round(input.requestedQuantity),
    currentUsableStock: summary.usableQuantity,
    minimumThreshold: med.minimumStockThreshold,
    supplierName: input.supplierName.trim() || 'Preferred Institutional Wholesaler',
    supplierReference: input.supplierReference?.trim() || undefined,
    reason: autoReason,
    status: input.submitImmediately ? 'Submitted Purchase Request' : 'Draft',
    createdAt: nowIso,
    createdBy: actor.name,
    notes: input.notes?.trim() || 'Local purchase request draft (no external supplier order transmitted).',
  };

  return { success: true, request };
}

/**
 * Appends a notification only if an identical unread dedupKey does not already exist.
 */
export function appendDeduplicatedNotification(
  existing: PatientNotification[],
  newNotif: PatientNotification
): PatientNotification[] {
  if (
    newNotif.dedupKey &&
    existing.some((n) => !n.isRead && n.dedupKey === newNotif.dedupKey)
  ) {
    return existing;
  }
  return [newNotif, ...existing];
}

// =============================================================================
// PHASE 6A: DATA-INTEGRITY, SECURITY BOUNDARY & TRANSACTIONAL GUARD FUNCTIONS
// =============================================================================

export const DEFAULT_PATIENT_PRIVACY_SETTINGS: PrivacyConsentSettings = {
  emergencyAccessGranted: true,
  shareWithSpecialists: true,
  familyAccessGranted: false,
  anonymizedResearchConsent: false,
  downloadRecordsPermitted: true,
  smsEmailAlerts: true,
};

/**
 * Resolves privacy & consent settings for a specific patientId without deleting
 * or overwriting legacy single-object localStorage data (`hr_privacy_settings`).
 */
export function resolvePatientPrivacySettings(
  settingsByPatient: PatientPrivacySettingsMap | undefined | null,
  legacyGlobalSettings: PrivacyConsentSettings | undefined | null,
  patientId: string,
  patientNextOfKinName?: string
): PrivacyConsentSettings {
  const safePatientId = (patientId || 'pat-known-01').trim();
  const specific = settingsByPatient?.[safePatientId];
  if (specific) {
    return {
      ...DEFAULT_PATIENT_PRIVACY_SETTINGS,
      ...specific,
      patientId: safePatientId,
    };
  }

  // Non-destructive legacy fallback for primary demo patient ('pat-known-01')
  if (safePatientId === 'pat-known-01' && legacyGlobalSettings) {
    return {
      ...DEFAULT_PATIENT_PRIVACY_SETTINGS,
      ...legacyGlobalSettings,
      patientId: safePatientId,
    };
  }

  return {
    ...DEFAULT_PATIENT_PRIVACY_SETTINGS,
    patientId: safePatientId,
    familyMemberName: patientNextOfKinName || undefined,
  };
}

/**
 * Updates only the target patient's privacy settings inside the per-patient map.
 */
export function updatePatientPrivacySettingsMap(
  settingsByPatient: PatientPrivacySettingsMap,
  patientId: string,
  updates: Partial<PrivacyConsentSettings>,
  nowIso: string = new Date().toISOString()
): PatientPrivacySettingsMap {
  const safePatientId = (patientId || 'pat-known-01').trim();
  const current = resolvePatientPrivacySettings(settingsByPatient, undefined, safePatientId);
  return {
    ...settingsByPatient,
    [safePatientId]: {
      ...current,
      ...updates,
      patientId: safePatientId,
      updatedAt: nowIso,
    },
  };
}

/**
 * Normalizes legacy AccessAuditRecord items (backfilling missing patientId to 'pat-known-01'
 * without mutating or deleting stored records) and filters records for a specific patient.
 */
export function normalizeAccessAuditRecords(
  logs: Array<Partial<AccessAuditRecord> & { id: string; accessorName: string; accessorRole: string; department: string; timestamp: string; purpose: string; action: string }>,
  defaultPatientId: string = 'pat-known-01'
): AccessAuditRecord[] {
  return (logs || []).map((log) => ({
    ...log,
    patientId: (log.patientId && log.patientId.trim()) ? log.patientId.trim() : defaultPatientId,
  }));
}

export function filterAccessAuditsForPatient(
  logs: AccessAuditRecord[],
  patientId: string
): AccessAuditRecord[] {
  const safePatientId = (patientId || 'pat-known-01').trim();
  return normalizeAccessAuditRecords(logs).filter((log) => log.patientId === safePatientId);
}

function decodeBase64UrlSafe(segment: string): string {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(segment, 'base64url').toString('utf8');
  }
  return '';
}

/**
 * Validates frontend environment variables to guarantee that:
 * 1. A Supabase service-role key (or secret key) is NEVER exposed in VITE_* variables.
 * 2. Only publishable anon keys (`eyJ...` with role="anon" or `sb_publishable_...`) are accepted in frontend configuration.
 */
export function validateSupabaseEnvSecurity(
  envVars: Record<string, string | undefined>
): {
  isValid: boolean;
  isConfigured: boolean;
  supabaseUrl: string;
  supabaseAnonKey: string;
  violations: string[];
} {
  const violations: string[] = [];

  for (const [key, rawValue] of Object.entries(envVars || {})) {
    const val = (rawValue || '').trim();
    const upperKey = key.toUpperCase();

    if (upperKey.includes('SERVICE_ROLE') || upperKey.includes('SECRET')) {
      if (upperKey.startsWith('VITE_') && val.length > 0) {
        violations.push(`CRITICAL_SECURITY_VIOLATION: Service-role or secret key variable "${key}" must never be prefixed with VITE_ or exposed to frontend code.`);
      }
    }

    if (upperKey.startsWith('VITE_') && val.length > 0) {
      if (val.startsWith('sb_secret_') || val.toLowerCase().includes('service_role')) {
        violations.push(`CRITICAL_SECURITY_VIOLATION: Frontend variable "${key}" contains a Supabase service_role or secret credential.`);
      }
      // Inspect JWT payload if value looks like a 3-part JWT
      const parts = val.split('.');
      if (parts.length === 3) {
        try {
          const payloadJson = decodeBase64UrlSafe(parts[1]);
          const payload = JSON.parse(payloadJson);
          if (payload && payload.role === 'service_role') {
            violations.push(`CRITICAL_SECURITY_VIOLATION: Frontend JWT in "${key}" has role="service_role". Only role="anon" is permitted in browser code.`);
          }
        } catch {
          // Ignore non-JSON base64 segments
        }
      }
    }
  }

  const rawUrl = (envVars.VITE_SUPABASE_URL || '').trim();
  let normalizedUrl = '';
  if (rawUrl.startsWith('https://') && rawUrl.includes('.supabase.')) {
    try {
      normalizedUrl = new URL(rawUrl).origin;
    } catch {
      normalizedUrl = rawUrl.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
    }
  }
  const anonKey = (
    envVars.VITE_SUPABASE_ANON_KEY ||
    envVars.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();
  const isValidUrl = Boolean(normalizedUrl);
  const isConfigured = isValidUrl && anonKey.length >= 16 && violations.length === 0;

  return {
    isValid: violations.length === 0,
    isConfigured,
    supabaseUrl: isConfigured ? normalizedUrl : '',
    supabaseAnonKey: isConfigured ? anonKey : '',
    violations,
  };
}

export interface ResolvedDatabaseIdentity {
  accountType: 'staff' | 'patient';
  id: string;
  authUserId: string;
  name: string;
  email?: string;
  role: UserRole;
  designation?: string;
  department?: string;
  employeeCode?: string;
  permanentMrn?: string;
}

/**
 * Pure mapper resolving database rows (`staff_users` or `patients`) returned for `auth.uid()`
 * into an authoritative session identity. Never trusts client-side role claims.
 */
export function resolveServerAuthenticatedIdentity(
  authUserId: string,
  staffRow?: {
    id: string;
    auth_user_id?: string | null;
    name: string;
    role: string;
    designation: string;
    department: string;
    employee_code: string;
    email?: string | null;
    is_active?: boolean;
  } | null,
  patientRow?: {
    id: string;
    auth_user_id?: string | null;
    name: string;
    permanent_mrn?: string | null;
  } | null
): {
  identity: ResolvedDatabaseIdentity | null;
  error?: string;
} {
  if (!authUserId || !authUserId.trim()) {
    return { identity: null, error: 'Missing authenticated Supabase user ID.' };
  }

  if (staffRow) {
    if (staffRow.is_active === false) {
      return {
        identity: null,
        error: `Staff profile "${staffRow.name}" (${staffRow.employee_code}) is marked inactive by Hospital Administration.`,
      };
    }
    const validRoles: UserRole[] = ['doctor', 'cmo', 'nurse', 'records', 'pharmacist', 'admin'];
    const normalizedRole = staffRow.role as UserRole;
    if (!validRoles.includes(normalizedRole)) {
      return {
        identity: null,
        error: `Unrecognized server staff role "${staffRow.role}" for ${staffRow.id}.`,
      };
    }
    return {
      identity: {
        accountType: 'staff',
        id: staffRow.id,
        authUserId,
        name: staffRow.name,
        email: staffRow.email || undefined,
        role: normalizedRole,
        designation: staffRow.designation,
        department: staffRow.department,
        employeeCode: staffRow.employee_code,
      },
    };
  }

  if (patientRow) {
    return {
      identity: {
        accountType: 'patient',
        id: patientRow.id,
        authUserId,
        name: patientRow.name,
        role: 'patient',
        permanentMrn: patientRow.permanent_mrn || undefined,
      },
    };
  }

  return {
    identity: null,
    error:
      'Your Supabase account is authenticated, but its auth.users.id is not yet linked to a row in public.staff_users.auth_user_id or public.patients.auth_user_id.',
  };
}

/**
 * Enforces strict separation between Demo Role Simulation Mode (localStorage sandbox)
 * and Authenticated Database Mode (Supabase RLS session).
 * Guarantees that:
 * - Demo mode can NEVER issue database writes or bypass server-side authorization.
 * - Authenticated database mode NEVER falls back to localStorage to bypass an RLS/permission denial.
 */
export function enforceSessionAuthorityBoundary(input: {
  mode: 'demo_simulation' | 'authenticated_supabase';
  hasValidSupabaseSession: boolean;
  serverAuthenticatedRole?: UserRole | null;
  clientSimulatedRole?: UserRole;
  attemptedTarget: 'local_sandbox' | 'supabase_database';
  serverReturnedUnauthorized?: boolean;
}): {
  allowed: boolean;
  effectiveRole: UserRole | null;
  storageTarget: 'local_sandbox' | 'supabase_database' | 'blocked';
  reason?: string;
} {
  if (input.mode === 'demo_simulation') {
    if (input.attemptedTarget === 'supabase_database') {
      return {
        allowed: false,
        effectiveRole: null,
        storageTarget: 'blocked',
        reason: 'DEMO_MODE_DB_BLOCKED: Demo Simulation Mode is strictly isolated from Supabase and cannot read or write database records.',
      };
    }
    return {
      allowed: true,
      effectiveRole: input.clientSimulatedRole || 'doctor',
      storageTarget: 'local_sandbox',
    };
  }

  // Authenticated Supabase Mode
  if (!input.hasValidSupabaseSession || !input.serverAuthenticatedRole) {
    return {
      allowed: false,
      effectiveRole: null,
      storageTarget: 'blocked',
      reason: 'UNAUTHENTICATED_DB_SESSION: A verified Supabase JWT and server-resolved role are required for database operations.',
    };
  }

  if (input.serverReturnedUnauthorized) {
    return {
      allowed: false,
      effectiveRole: input.serverAuthenticatedRole,
      storageTarget: 'blocked',
      reason: 'LOCALSTORAGE_BYPASS_BLOCKED: Server-side authorization denied this operation; falling back to localStorage to bypass server security is strictly forbidden.',
    };
  }

  // In authenticated mode, effectiveRole ALWAYS comes from the server-resolved identity, never clientSimulatedRole
  return {
    allowed: true,
    effectiveRole: input.serverAuthenticatedRole,
    storageTarget: 'supabase_database',
  };
}

/**
 * Computes the deterministic ascending batch lock order (`ORDER BY batch_id ASC`)
 * used by `rpc_dispense_prescription` to prevent deadlocks and concurrent race conditions.
 */
export function planDeterministicBatchLockOrder(
  lineInputs: DispenseLineInput[]
): string[] {
  const uniqueBatchIds = new Set<string>();
  for (const line of lineInputs || []) {
    const bid = (line.batchId || '').trim();
    if (bid && line.action === 'dispense' && (line.quantity ?? 0) > 0) {
      uniqueBatchIds.add(bid);
    }
  }
  return Array.from(uniqueBatchIds).sort((a, b) => a.localeCompare(b));
}

/**
 * Synchronizes embedded `patientSnapshot` inside EmergencyCase records when an
 * unidentified patient is reconciled to a verified permanent identity (Fix #7).
 */
export function synchronizeReconciledPatientSnapshots(
  cases: EmergencyCase[],
  reconciledPatient: Patient,
  nowIso: string = new Date().toISOString()
): EmergencyCase[] {
  return (cases || []).map((c) => {
    if (c.patientId !== reconciledPatient.id) return c;
    return {
      ...c,
      patientSnapshot: {
        ...c.patientSnapshot,
        ...reconciledPatient,
        isUnidentified: false,
      },
      updatedAt: nowIso,
    };
  });
}





