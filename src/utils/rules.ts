import { 
  EmergencyCase, 
  MedicoLegalCase, 
  PoisoningCase, 
  TriageLevel, 
  CaseVitals,
  PatientTriageStatus,
  Appointment
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
 * Filter patient appointments for patient portal views
 */
export function filterPatientAppointments(
  appointments: Appointment[],
  patientId: string,
  filter: 'all' | 'upcoming' | 'past' | 'requested' | 'completed' | 'cancelled' = 'all'
): Appointment[] {
  const patientApts = appointments.filter((a) => a.patientId === patientId);
  const today = new Date().toISOString().split('T')[0];

  switch (filter) {
    case 'upcoming':
      return patientApts.filter(
        (a) =>
          (a.date >= today || a.status === 'Scheduled' || a.status === 'Confirmed' || a.status === 'Requested') &&
          !['Completed', 'Cancelled'].includes(a.status)
      );
    case 'past':
      return patientApts.filter(
        (a) => a.date < today || ['Completed', 'Cancelled'].includes(a.status)
      );
    case 'requested':
      return patientApts.filter((a) => a.status === 'Requested');
    case 'completed':
      return patientApts.filter((a) => a.status === 'Completed');
    case 'cancelled':
      return patientApts.filter((a) => a.status === 'Cancelled');
    case 'all':
    default:
      return patientApts;
  }
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
      (a.date >= today || a.status === 'Scheduled' || a.status === 'Confirmed' || a.status === 'Requested') &&
      !['Completed', 'Cancelled'].includes(a.status)
  ).length;

  const completedVisitsCount = patientApts.filter((a) => a.status === 'Completed').length;

  const patientLabs = labReports.filter((l) => l.patientId === patientId);
  const pendingReportsCount = patientLabs.filter((l) => l.status === 'Pending Review').length;

  const patientEncounters = encounters.filter((e) => e.patientId === patientId);
  const activePrescriptionsCount = patientEncounters.reduce((acc, curr) => {
    return acc + (curr.prescriptions ? curr.prescriptions.length : 0);
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

