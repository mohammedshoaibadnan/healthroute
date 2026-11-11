import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateTempPatientId,
  generateMlcId,
  evaluateTriageLevel,
  validateMLCRequirements,
  evaluateAtropinizationProgress,
  filterEmergencyCases,
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
