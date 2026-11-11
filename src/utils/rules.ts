import { EmergencyCase, MedicoLegalCase, PoisoningCase, TriageLevel, CaseVitals } from '../types';

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
