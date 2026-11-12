import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTempPatientId,
  generateMlcId,
  evaluateTriageLevel,
  validateMLCRequirements,
  evaluateAtropinizationProgress,
  filterEmergencyCases,
  resolvePatientTriageStatus,
  getTriageBadgeConfig,
  filterPatientAppointments,
  filterPatientDocuments,
  filterDoctorDirectory,
  isClinicianVerifiedRecord,
} from './rules';
import { EmergencyCase, MedicoLegalCase } from '../types';

test('generateTempPatientId formats properly with zero-padded sequences', () => {
  assert.equal(generateTempPatientId(1, 2026), 'TEMP-ER-2026-0001');
  assert.equal(generateTempPatientId(842, 2026), 'TEMP-ER-2026-0842');
  assert.equal(generateMlcId(15, 2026), 'MLC-2026-0015');
});

test('evaluateTriageLevel assigns RED level for critical physiological values', () => {
  // Severe hypoxia
  const criticalSpo2 = evaluateTriageLevel({ spo2: 82, gcs: 14, pulse: 80, rr: 20 }, 'Breathlessness');
  assert.equal(criticalSpo2.triageLevel, 'RED');
  assert.equal(criticalSpo2.esiScore, 1);

  // Severe altered sensorium (GCS 7)
  const lowGcs = evaluateTriageLevel({ spo2: 98, gcs: 7, pulse: 70, rr: 14 }, 'Unconscious');
  assert.equal(lowGcs.triageLevel, 'RED');
  assert.equal(lowGcs.esiScore, 1);

  // Cardiac arrest flag
  const arrest = evaluateTriageLevel({}, 'Cardiac Arrest', true);
  assert.equal(arrest.triageLevel, 'RED');
  assert.equal(arrest.esiScore, 1);
});

test('evaluateTriageLevel assigns YELLOW for urgent distress', () => {
  const urgent = evaluateTriageLevel({ spo2: 96, gcs: 15, pulse: 110, painScore: 8, rr: 22 }, 'Severe abdominal pain');
  assert.equal(urgent.triageLevel, 'YELLOW');
  assert.equal(urgent.esiScore, 3);
});

test('evaluateTriageLevel assigns GREEN for stable vital parameters', () => {
  const green = evaluateTriageLevel({ spo2: 99, gcs: 15, pulse: 72, painScore: 2, rr: 16 }, 'Minor wrist sprain');
  assert.equal(green.triageLevel, 'GREEN');
  assert.equal(green.esiScore, 4);
});

test('validateMLCRequirements detects missing police station and disclaimer', () => {
  const incompleteMLC: Partial<MedicoLegalCase> = {
    policeStation: '',
    broughtByName: 'Constable Sharma',
    injuryClassification: 'Grievous',
    wounds: [
      {
        id: 'w1',
        location: 'Right Forehead',
        type: 'Laceration',
        dimensions: '4cm x 1cm',
        margins: 'Irregular',
        ageOfInjuryProvisional: 'Fresh',
      },
    ],
    legalDisclaimerAcknowledged: false,
  };

  const validation = validateMLCRequirements(incompleteMLC);
  assert.equal(validation.isValid, false);
  assert.ok(validation.missingFields.some((f) => f.includes('Police Station')));
  assert.ok(validation.missingFields.some((f) => f.includes('Legal Disclaimer')));
});

test('evaluateAtropinizationProgress calculates completion score accurately', () => {
  const partial = {
    isAtropinized: false,
    pulseTargetAchieved: true,
    dryAxillae: true,
    pupilsDilated: true,
    chestClearOfRhonchi: false,
    systolicBpAdequate: true,
  };

  const result = evaluateAtropinizationProgress(partial);
  assert.equal(result.isFullyAtropinized, false);
  assert.equal(result.satisfiedCount, 4);
  assert.equal(result.totalCriteria, 5);
  assert.equal(result.percentage, 80);

  const full = { ...partial, chestClearOfRhonchi: true, isAtropinized: true };
  const fullResult = evaluateAtropinizationProgress(full);
  assert.equal(fullResult.isFullyAtropinized, true);
  assert.equal(fullResult.percentage, 100);
});

test('filterEmergencyCases filters by search text and unidentified state', () => {
  const mockCases: EmergencyCase[] = [
    {
      id: 'CASE-2026-0001',
      patientId: 'p1',
      patientSnapshot: {
        id: 'p1',
        isUnidentified: true,
        tempId: 'TEMP-ER-2026-0842',
        name: 'Unidentified Male #14',
        gender: 'Male',
        registrationTimestamp: '2026-11-11T09:00:00Z',
        registeredBy: 'Nurse R. Mary',
      },
      triageLevel: 'RED',
      esiScore: 1,
      chiefComplaint: 'Unresponsive road accident',
      incidentType: 'RTA (Road Traffic Accident)',
      incidentDetails: { broughtBy: '108 EMRI' },
      vitals: { bp: '80/50', pulse: 130, spo2: 88, temp: 98.4, rr: 28, gcs: 6, recordedAt: '2026-11-11T09:05:00Z' },
      bedBay: 'Resus Bay 1',
      assignedPhysician: 'Dr. Vikram Malhotra',
      assignedNurse: 'Sister Rekha',
      status: 'Under Resuscitation',
      isMlc: true,
      isPoisoning: false,
      clinicalNotes: [],
      createdAt: '2026-11-11T09:00:00Z',
      updatedAt: '2026-11-11T09:05:00Z',
    },
    {
      id: 'CASE-2026-0002',
      patientId: 'p2',
      patientSnapshot: {
        id: 'p2',
        isUnidentified: false,
        name: 'Anita Roy',
        gender: 'Female',
        registrationTimestamp: '2026-11-11T09:10:00Z',
        registeredBy: 'Staff John',
      },
      triageLevel: 'GREEN',
      esiScore: 4,
      chiefComplaint: 'Superficial kitchen burn',
      incidentType: 'Severe Burn',
      incidentDetails: { broughtBy: 'Self' },
      vitals: { bp: '120/80', pulse: 78, spo2: 99, temp: 98.6, rr: 16, gcs: 15, recordedAt: '2026-11-11T09:10:00Z' },
      bedBay: 'Ambulatory Bay 3',
      assignedPhysician: 'Dr. Vikram Malhotra',
      assignedNurse: 'Staff John',
      status: 'Under Evaluation',
      isMlc: false,
      isPoisoning: false,
      clinicalNotes: [],
      createdAt: '2026-11-11T09:10:00Z',
      updatedAt: '2026-11-11T09:10:00Z',
    },
  ];

  const onlyUnidentified = filterEmergencyCases(mockCases, { onlyUnidentified: true });
  assert.equal(onlyUnidentified.length, 1);
  assert.equal(onlyUnidentified[0].id, 'CASE-2026-0001');

  const searchHit = filterEmergencyCases(mockCases, { search: 'Anita' });
  assert.equal(searchHit.length, 1);
  assert.equal(searchHit[0].id, 'CASE-2026-0002');
});

test('resolvePatientTriageStatus prioritizes explicit status, then vitals, then complaint', () => {
  // Explicit override
  const explicit = resolvePatientTriageStatus({ triageStatus: 'Critical', chiefComplaint: 'Minor cold' });
  assert.equal(explicit, 'Critical');

  // Vitals hypoxia
  const hypoxic = resolvePatientTriageStatus({ vitalsSnapshot: { spo2: 89, pulse: 110 } });
  assert.equal(hypoxic, 'Critical');

  // Complaint with chest pain
  const chestPain = resolvePatientTriageStatus({ chiefComplaint: 'Acute chest pain radiating to jaw' });
  assert.equal(chestPain, 'Critical');

  // Waiting appointment
  const waiting = resolvePatientTriageStatus({ status: 'Waiting', chiefComplaint: 'Rash review' });
  assert.equal(waiting, 'Waiting');

  // Completed appointment
  const completed = resolvePatientTriageStatus({ status: 'Completed', chiefComplaint: 'General checkup' });
  assert.equal(completed, 'Stable');
});

test('getTriageBadgeConfig returns proper color classes, labels, and beacons', () => {
  const critical = getTriageBadgeConfig('Critical');
  assert.equal(critical.label, 'Critical');
  assert.equal(critical.pingBeacon, true);
  assert.ok(critical.badgeClass.includes('rose'));

  const waiting = getTriageBadgeConfig('Waiting');
  assert.equal(waiting.label, 'Waiting');
  assert.equal(waiting.pingBeacon, false);
  assert.ok(waiting.badgeClass.includes('amber'));

  const stable = getTriageBadgeConfig('Stable');
  assert.equal(stable.label, 'Stable');
  assert.ok(stable.badgeClass.includes('emerald'));

  const obs = getTriageBadgeConfig('Under Observation');
  assert.equal(obs.label, 'Under Observation');
  assert.ok(obs.badgeClass.includes('sky'));
});

test('filterPatientAppointments correctly filters upcoming vs past vs requested', () => {
  const mockApts = [
    {
      id: 'apt-1',
      patientId: 'p1',
      patientName: 'Test Patient',
      patientAge: 45,
      patientGender: 'Male',
      patientPhone: '999',
      doctorName: 'Dr. Test',
      date: '2026-11-20',
      timeSlot: '10:00 AM',
      tokenNumber: 1,
      type: 'New Consultation' as const,
      status: 'Scheduled' as const,
      chiefComplaint: 'Checkup',
    },
    {
      id: 'apt-2',
      patientId: 'p1',
      patientName: 'Test Patient',
      patientAge: 45,
      patientGender: 'Male',
      patientPhone: '999',
      doctorName: 'Dr. Test',
      date: '2026-11-01',
      timeSlot: '11:00 AM',
      tokenNumber: 2,
      type: 'Follow-up Review' as const,
      status: 'Completed' as const,
      chiefComplaint: 'Old checkup',
    },
    {
      id: 'apt-3',
      patientId: 'p1',
      patientName: 'Test Patient',
      patientAge: 45,
      patientGender: 'Male',
      patientPhone: '999',
      doctorName: 'Dr. Test',
      date: '2026-11-25',
      timeSlot: '02:00 PM',
      tokenNumber: 3,
      type: 'Specialist Referral' as const,
      status: 'Requested' as const,
      chiefComplaint: 'Knee pain',
    },
  ];

  const upcoming = filterPatientAppointments(mockApts, 'p1', 'upcoming');
  assert.equal(upcoming.length, 2); // apt-1 and apt-3
  assert.ok(upcoming.some((a) => a.id === 'apt-1'));
  assert.ok(upcoming.some((a) => a.id === 'apt-3'));

  const past = filterPatientAppointments(mockApts, 'p1', 'past');
  assert.equal(past.length, 1);
  assert.equal(past[0].id, 'apt-2');

  const requested = filterPatientAppointments(mockApts, 'p1', 'requested');
  assert.equal(requested.length, 1);
  assert.equal(requested[0].id, 'apt-3');
});

test('filterPatientDocuments filters by category and search keywords', () => {
  const docs = [
    { title: 'Cath Lab Discharge Note', category: 'Discharge Summary', summary: 'LAD stent procedure', tags: ['Cardio'] },
    { title: 'Biomarkers Troponin Report', category: 'Laboratory', summary: 'Troponin-I elevated', tags: ['Blood'] },
    { title: 'Health Insurance Card', category: 'Patient Uploaded', summary: 'Star Health card', tags: ['TPA'] },
  ];

  const labsOnly = filterPatientDocuments(docs, 'Laboratory');
  assert.equal(labsOnly.length, 1);
  assert.equal(labsOnly[0].title, 'Biomarkers Troponin Report');

  const searchStent = filterPatientDocuments(docs, 'All', 'stent');
  assert.equal(searchStent.length, 1);
  assert.equal(searchStent[0].title, 'Cath Lab Discharge Note');
});

test('filterDoctorDirectory searches name, specialty, languages and filters by consultation type', () => {
  const doctors = [
    {
      name: 'Dr. Vikram Malhotra',
      specialty: 'Cardiology',
      qualifications: 'MD, DM',
      languages: ['English', 'Hindi', 'Kannada'],
      consultationTypes: ['In-Person OPD', 'Video Tele-Consult'],
      availability: 'Available Today',
    },
    {
      name: 'Dr. Rohan Iyer',
      specialty: 'Orthopedics',
      qualifications: 'MS Ortho',
      languages: ['English', 'Tamil'],
      consultationTypes: ['In-Person OPD'],
      availability: 'Next Available Tomorrow',
    },
  ];

  const cardio = filterDoctorDirectory(doctors, { specialty: 'Cardiology' });
  assert.equal(cardio.length, 1);
  assert.equal(cardio[0].name, 'Dr. Vikram Malhotra');

  const videoOnly = filterDoctorDirectory(doctors, { consultationType: 'Video Tele-Consult' });
  assert.equal(videoOnly.length, 1);
  assert.equal(videoOnly[0].name, 'Dr. Vikram Malhotra');

  const langSearch = filterDoctorDirectory(doctors, { query: 'tamil' });
  assert.equal(langSearch.length, 1);
  assert.equal(langSearch[0].name, 'Dr. Rohan Iyer');
});

test('isClinicianVerifiedRecord identifies verified medical records', () => {
  assert.equal(isClinicianVerifiedRecord('Prescription'), true);
  assert.equal(isClinicianVerifiedRecord('Discharge Summary'), true);
  assert.equal(isClinicianVerifiedRecord('Laboratory'), true);
  assert.equal(isClinicianVerifiedRecord('Patient Uploaded'), false);
  assert.equal(isClinicianVerifiedRecord('Self Reported'), false);
});


