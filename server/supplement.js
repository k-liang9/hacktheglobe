/**
 * Supplemental synthetic patient data to enrich the sandbox FHIR data.
 * Merged into fhirData after the real Epic fetch so the shim, LLM prompts,
 * and all downstream logic see a richer dataset for demo purposes.
 *
 * Design goals:
 * - A long-horizon pattern (rising creatinine + NSAID use + hypertension)
 *   that a doctor might overlook across separate visits but our app flags
 * - Complex medication schedules with timing, food, and interaction constraints
 * - Multiple specialist visits showing fragmented care
 * - Enough lab history to show trends over time
 */

// ── Supplemental conditions ────────────────────────────────────

const conditions = [
  {
    resourceType: 'Condition',
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Essential Hypertension' },
    onsetDateTime: '2023-06-15',
  },
  {
    resourceType: 'Condition',
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Type 2 Diabetes Mellitus' },
    onsetDateTime: '2024-01-20',
  },
  {
    resourceType: 'Condition',
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Chronic Kidney Disease, Stage 2' },
    onsetDateTime: '2025-09-10',
  },
  {
    resourceType: 'Condition',
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Gastroesophageal Reflux Disease (GERD)' },
    onsetDateTime: '2024-08-05',
  },
  {
    resourceType: 'Condition',
    clinicalStatus: { coding: [{ code: 'active' }] },
    code: { text: 'Osteoarthritis, bilateral knees' },
    onsetDateTime: '2022-03-12',
  },
];

// ── Supplemental medications (complex schedules) ───────────────

const medications = [
  {
    resourceType: 'MedicationRequest',
    status: 'active',
    medicationCodeableConcept: { text: 'Metformin 500mg' },
    dosageInstruction: [{
      text: 'Take 500mg twice daily with breakfast and dinner. '
        + 'Take with food to reduce stomach upset. '
        + 'Do not crush or chew extended-release tablets.',
    }],
    requester: { display: 'Dr. Sarah Chen, MD' },
    authoredOn: '2024-01-25',
  },
  {
    resourceType: 'MedicationRequest',
    status: 'active',
    medicationCodeableConcept: { text: 'Lisinopril 10mg' },
    dosageInstruction: [{
      text: 'Take 10mg once daily in the morning. '
        + 'Monitor blood pressure regularly. '
        + 'Avoid potassium supplements and salt substitutes.',
    }],
    requester: { display: 'Dr. Sarah Chen, MD' },
    authoredOn: '2023-07-01',
  },
  {
    resourceType: 'MedicationRequest',
    status: 'active',
    medicationCodeableConcept: { text: 'Omeprazole 20mg' },
    dosageInstruction: [{
      text: 'Take 20mg once daily, 30 minutes before breakfast on empty stomach. '
        + 'Do not take with Metformin — space them at least 30 minutes apart.',
    }],
    requester: { display: 'Dr. Lisa Park, GI' },
    authoredOn: '2024-08-10',
  },
  {
    resourceType: 'MedicationRequest',
    status: 'active',
    medicationCodeableConcept: { text: 'Amlodipine 5mg' },
    dosageInstruction: [{
      text: 'Take 5mg once daily in the evening. '
        + 'May cause ankle swelling — elevate legs if this occurs.',
    }],
    requester: { display: 'Dr. James Wu, Cardiology' },
    authoredOn: '2025-06-15',
  },
  {
    resourceType: 'MedicationRequest',
    status: 'active',
    medicationCodeableConcept: { text: 'Ibuprofen 400mg (as needed)' },
    dosageInstruction: [{
      text: 'Take 400mg up to 3 times daily with food for knee pain. '
        + 'Do not exceed 1200mg per day. '
        + 'Take with food or milk to protect stomach.',
    }],
    requester: { display: 'Dr. Robert Kim, Orthopedics' },
    authoredOn: '2025-11-20',
  },
  {
    resourceType: 'MedicationRequest',
    status: 'active',
    medicationCodeableConcept: { text: 'Atorvastatin 20mg' },
    dosageInstruction: [{
      text: 'Take 20mg once daily at bedtime. '
        + 'Avoid grapefruit juice. '
        + 'Report any unexplained muscle pain.',
    }],
    requester: { display: 'Dr. Sarah Chen, MD' },
    authoredOn: '2024-03-15',
  },
];

// ── Supplemental lab results (showing trends over time) ────────

function lab(name, value, unit, date, refLow, refHigh, interp) {
  return {
    resourceType: 'Observation',
    code: { text: name },
    valueQuantity: { value, unit },
    effectiveDateTime: date,
    referenceRange: [{
      low: { value: refLow, unit },
      high: { value: refHigh, unit },
    }],
    interpretation: [{ coding: [{ code: interp || 'N' }] }],
    category: [{ coding: [{ display: 'Laboratory' }] }],
  };
}

const observations = [
  // ── Creatinine trending UP over 18 months (the key "missed" signal) ──
  lab('Creatinine', 0.9, 'mg/dL', '2024-09-15', 0.7, 1.3, 'N'),
  lab('Creatinine', 1.0, 'mg/dL', '2025-01-10', 0.7, 1.3, 'N'),
  lab('Creatinine', 1.2, 'mg/dL', '2025-06-20', 0.7, 1.3, 'N'),
  lab('Creatinine', 1.4, 'mg/dL', '2025-11-15', 0.7, 1.3, 'H'),
  lab('Creatinine', 1.6, 'mg/dL', '2026-03-10', 0.7, 1.3, 'H'),

  // ── eGFR trending DOWN (mirrors creatinine) ──
  lab('eGFR', 88, 'mL/min', '2024-09-15', 60, 120, 'N'),
  lab('eGFR', 82, 'mL/min', '2025-01-10', 60, 120, 'N'),
  lab('eGFR', 72, 'mL/min', '2025-06-20', 60, 120, 'N'),
  lab('eGFR', 63, 'mL/min', '2025-11-15', 60, 120, 'N'),
  lab('eGFR', 55, 'mL/min', '2026-03-10', 60, 120, 'L'),

  // ── HbA1c (diabetes management) ──
  lab('Hemoglobin A1c', 7.2, '%', '2024-03-15', 4.0, 5.6, 'H'),
  lab('Hemoglobin A1c', 6.8, '%', '2024-09-15', 4.0, 5.6, 'H'),
  lab('Hemoglobin A1c', 7.1, '%', '2025-03-10', 4.0, 5.6, 'H'),
  lab('Hemoglobin A1c', 7.4, '%', '2026-03-10', 4.0, 5.6, 'H'),

  // ── Blood pressure (trending slightly up) ──
  lab('Systolic Blood Pressure', 132, 'mmHg', '2025-06-20', 90, 130, 'H'),
  lab('Systolic Blood Pressure', 138, 'mmHg', '2025-11-15', 90, 130, 'H'),
  lab('Systolic Blood Pressure', 142, 'mmHg', '2026-03-10', 90, 130, 'H'),

  // ── Lipid panel ──
  lab('Total Cholesterol', 218, 'mg/dL', '2026-03-10', 0, 200, 'H'),
  lab('LDL Cholesterol', 138, 'mg/dL', '2026-03-10', 0, 100, 'H'),
  lab('HDL Cholesterol', 42, 'mg/dL', '2026-03-10', 40, 100, 'N'),
  lab('Triglycerides', 165, 'mg/dL', '2026-03-10', 0, 150, 'H'),

  // ── Potassium (important with Lisinopril) ──
  lab('Potassium', 4.2, 'mEq/L', '2025-06-20', 3.5, 5.0, 'N'),
  lab('Potassium', 4.8, 'mEq/L', '2025-11-15', 3.5, 5.0, 'N'),
  lab('Potassium', 5.1, 'mEq/L', '2026-03-10', 3.5, 5.0, 'H'),

  // ── Fasting glucose ──
  lab('Fasting Glucose', 128, 'mg/dL', '2025-06-20', 70, 100, 'H'),
  lab('Fasting Glucose', 135, 'mg/dL', '2025-11-15', 70, 100, 'H'),
  lab('Fasting Glucose', 142, 'mg/dL', '2026-03-10', 70, 100, 'H'),

  // ── Liver function (relevant for Atorvastatin monitoring) ──
  lab('ALT', 32, 'U/L', '2025-06-20', 7, 35, 'N'),
  lab('ALT', 45, 'U/L', '2025-11-15', 7, 35, 'H'),
  lab('ALT', 52, 'U/L', '2026-03-10', 7, 35, 'H'),
  lab('AST', 28, 'U/L', '2025-06-20', 10, 40, 'N'),
  lab('AST', 38, 'U/L', '2025-11-15', 10, 40, 'N'),
  lab('AST', 44, 'U/L', '2026-03-10', 10, 40, 'H'),

  // ── CBC ──
  lab('WBC', 7.2, 'x10^3/uL', '2026-03-10', 4.5, 11.0, 'N'),
  lab('Hemoglobin', 13.8, 'g/dL', '2026-03-10', 13.5, 17.5, 'N'),
  lab('Platelets', 245, 'x10^3/uL', '2026-03-10', 150, 400, 'N'),
];

// ── Supplemental allergies ─────────────────────────────────────

const allergies = [
  {
    resourceType: 'AllergyIntolerance',
    code: { text: 'Penicillin' },
    reaction: [{
      manifestation: [{ text: 'Hives and facial swelling' }],
      severity: 'severe',
    }],
    type: 'allergy',
  },
  {
    resourceType: 'AllergyIntolerance',
    code: { text: 'Sulfa drugs' },
    reaction: [{
      manifestation: [{ text: 'Skin rash' }],
      severity: 'moderate',
    }],
    type: 'allergy',
  },
];

// ── Supplemental visit history (for the shim) ──────────────────

const visits = [
  {
    type: 'Office Visit — Nephrology',
    date: 'January 8, 2026',
    provider: 'Dr. Amanda Torres, MD — Nephrology',
    location: 'Evergreen Medical Center, Suite 310',
    summary: `Referral from PCP for evaluation of declining kidney function.

Labs reviewed: Creatinine has risen from 0.9 to 1.4 mg/dL over 14 months. eGFR has dropped from 88 to 63 mL/min, now classified as Stage 2 CKD approaching Stage 3.

Assessment:
  - Likely multifactorial: hypertension-related nephropathy, possible NSAID-related injury
  - Patient reports taking Ibuprofen 400mg 2-3x daily for knee pain for past 6 months
  - Currently on Lisinopril 10mg (renoprotective, will continue)

Plan:
  1. Strongly recommend discontinuing Ibuprofen — NSAIDs are nephrotoxic in CKD
  2. Recommend Acetaminophen 500mg as alternative for knee pain
  3. Recheck creatinine and eGFR in 8 weeks
  4. If eGFR drops below 45, will discuss nephrology co-management
  5. Discussed importance of blood pressure control (target <130/80)
  6. Patient counseled on avoiding NSAIDs, contrast dye, and excessive protein intake`,
  },
  {
    type: 'Office Visit — Cardiology',
    date: 'December 5, 2025',
    provider: 'Dr. James Wu, MD — Cardiology',
    location: 'Heart & Vascular Institute, Suite 200',
    summary: `Follow-up for hypertension management. Blood pressure today: 138/88 mmHg — above target despite Lisinopril 10mg.

Added Amlodipine 5mg daily to regimen. Discussed lifestyle modifications: DASH diet, sodium restriction (<2g/day), regular aerobic exercise.

Lipid panel shows LDL 138 mg/dL — above goal for diabetic patient. Atorvastatin 20mg already prescribed, will consider uptitration to 40mg if not improved at next visit.

Note: Patient mentions frequent use of OTC Ibuprofen for knee pain. Advised this can raise blood pressure and worsen kidney function. Recommended discussing alternatives with PCP or orthopedics.

Follow-up in 3 months with repeat lipid panel.`,
  },
  {
    type: 'Office Visit — Orthopedics',
    date: 'November 20, 2025',
    provider: 'Dr. Robert Kim, MD — Orthopedics',
    location: 'Evergreen Medical Center, Suite 105',
    summary: `Evaluation for bilateral knee pain. X-rays show moderate bilateral knee osteoarthritis, more pronounced on the right.

Patient reports pain 6/10, worse with stairs and prolonged standing. Currently managing with OTC Ibuprofen but not getting adequate relief.

Plan:
  1. Prescribed Ibuprofen 400mg TID with food (formalized existing OTC use)
  2. Referral to physical therapy for strengthening exercises
  3. Consider corticosteroid injection if PT does not provide relief
  4. Discussed surgical options (knee replacement) as future consideration

Note: Reviewed allergy list — no NSAIDs allergies documented.`,
  },
  {
    type: 'Telehealth — Endocrinology',
    date: 'October 15, 2025',
    provider: 'Dr. Maria Santos, MD — Endocrinology',
    location: 'Telehealth Visit',
    summary: `Diabetes management follow-up. HbA1c 7.1% — slightly above target of <7%.

Current regimen: Metformin 500mg BID. Patient reports good adherence but occasional GI discomfort.

Assessment:
  - Glycemic control suboptimal but not severely out of range
  - Will continue current Metformin dose
  - If HbA1c rises above 7.5% at next check, will consider adding a GLP-1 receptor agonist
  - Reinforced dietary counseling: limit refined carbohydrates, increase fiber
  - Annual diabetic eye exam and foot exam due — orders placed

Note: Renal function should be monitored while on Metformin. If eGFR drops below 30, Metformin must be discontinued.`,
  },
  {
    type: 'Office Visit — Gastroenterology',
    date: 'August 10, 2024',
    provider: 'Dr. Lisa Park, MD — Gastroenterology',
    location: 'Digestive Health Center',
    summary: `New patient evaluation for heartburn and epigastric discomfort x 3 months.

Upper endoscopy performed — findings consistent with Grade B esophagitis (LA classification). No Barrett's. H. pylori negative.

Diagnosis: GERD

Plan:
  1. Start Omeprazole 20mg daily, 30 minutes before breakfast
  2. Lifestyle modifications: elevate head of bed, avoid late meals, reduce caffeine/alcohol
  3. Follow-up in 8 weeks to assess response
  4. Note: Patient is on Metformin — advise spacing Omeprazole and Metformin by 30+ minutes as PPIs can affect Metformin absorption`,
  },
];

// ── Merge function ─────────────────────────────────────────────

function enrichFhirData(fhirData) {
  const existing = fhirData || {
    conditions: [],
    medications: [],
    observations: [],
    allergies: [],
  };

  // Deduplicate by checking if the text already exists
  function mergeByText(arr, supplements, textFn) {
    const existingTexts = new Set(arr.map(textFn).map((t) => t.toLowerCase()));
    const newItems = supplements.filter(
      (s) => !existingTexts.has(textFn(s).toLowerCase()),
    );
    return [...arr, ...newItems];
  }

  const condText = (c) => c.code?.text || c.code?.coding?.[0]?.display || '';
  const medText = (m) => m.medicationCodeableConcept?.text
    || m.medicationCodeableConcept?.coding?.[0]?.display || '';
  const allergyText = (a) => a.code?.text || a.code?.coding?.[0]?.display || '';

  return {
    conditions: mergeByText(existing.conditions, conditions, condText),
    medications: mergeByText(existing.medications, medications, medText),
    observations: [...existing.observations, ...observations]
      .sort((a, b) => {
        const da = a.effectiveDateTime || '';
        const db = b.effectiveDateTime || '';
        return db.localeCompare(da);
      }),
    allergies: mergeByText(existing.allergies, allergies, allergyText),
    visits,
  };
}

module.exports = { enrichFhirData };
