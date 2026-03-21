const express = require('express');
const context = require('./context');

const router = express.Router();

// ── Shared layout ────────────────────────────────────────────────

function layout(title, activeTab, body) {
  const tabs = [
    { label: 'Health Summary', href: '/api/mychart' },
    { label: 'Visits', href: '/api/mychart/visits' },
    { label: 'Messages', href: '/api/mychart/messages' },
    { label: 'Test Results', href: '/api/mychart/results' },
    { label: 'Medications', href: '/api/mychart/medications' },
    { label: 'Billing', href: '/api/mychart/billing' },
  ];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MyChart - ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f4f8; color: #333; }
    .header { background: #1b3a5c; padding: 16px 32px; display: flex; align-items: center; gap: 12px; }
    .header h1 { color: white; font-size: 24px; font-weight: 600; }
    .header .heart { color: #e74c3c; font-size: 28px; }
    .header-right { margin-left: auto; display: flex; align-items: center; gap: 16px; }
    .header-right span { color: rgba(255,255,255,0.8); font-size: 13px; }
    .header-right a { color: #63b3ed; text-decoration: none; font-size: 13px; }
    .nav { background: #2c5282; padding: 0 32px; display: flex; gap: 0; overflow-x: auto; }
    .nav a { color: rgba(255,255,255,0.85); text-decoration: none; padding: 12px 20px; font-size: 14px; font-weight: 500; border-bottom: 3px solid transparent; white-space: nowrap; }
    .nav a:hover, .nav a.active { color: white; border-bottom-color: #63b3ed; background: rgba(255,255,255,0.1); }
    .container { max-width: 960px; margin: 0 auto; padding: 32px; }
    .page-title { font-size: 22px; color: #1b3a5c; margin-bottom: 4px; }
    .page-subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
    .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 20px; }
    .card-header { background: #edf2f7; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .card-header h3 { font-size: 14px; font-weight: 600; color: #1b3a5c; text-transform: uppercase; letter-spacing: 0.5px; }
    .card-header .date { font-size: 12px; color: #888; }
    .card-body { padding: 16px 20px; }
    .card-body p { font-size: 14px; line-height: 1.7; color: #444; margin-bottom: 12px; }
    .card-body p:last-child { margin-bottom: 0; }
    .card-body ul { list-style: none; }
    .card-body li { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #444; }
    .card-body li:last-child { border-bottom: none; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; margin-right: 8px; }
    .badge-red { background: #fed7d7; color: #c53030; }
    .badge-green { background: #c6f6d5; color: #276749; }
    .badge-blue { background: #bee3f8; color: #2b6cb0; }
    .badge-yellow { background: #fefcbf; color: #975a16; }
    .badge-gray { background: #edf2f7; color: #4a5568; }
    .lab-row { display: flex; justify-content: space-between; align-items: center; }
    .lab-name { font-weight: 500; }
    .lab-value { color: #1b3a5c; font-weight: 600; }
    .lab-date { color: #999; font-size: 12px; }
    .lab-range { color: #888; font-size: 12px; }
    .section-label { font-size: 12px; font-weight: 600; color: #1b3a5c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; margin-top: 16px; }
    .section-label:first-child { margin-top: 0; }
    .writeup { white-space: pre-wrap; font-size: 14px; line-height: 1.7; color: #333; }
    .msg-thread { border-left: 3px solid #bee3f8; padding-left: 16px; margin-bottom: 16px; }
    .msg-from { font-weight: 600; font-size: 13px; color: #1b3a5c; }
    .msg-date { font-size: 11px; color: #999; margin-bottom: 6px; }
    .msg-body { font-size: 14px; line-height: 1.6; color: #444; }
    .img-placeholder { background: #1a202c; border-radius: 8px; padding: 40px; text-align: center; margin: 16px 0; }
    .img-placeholder img { max-width: 100%; border-radius: 4px; }
    .img-label { color: #a0aec0; font-size: 12px; margin-top: 8px; }
    .detail-link { color: #2b6cb0; text-decoration: none; font-size: 13px; font-weight: 500; }
    .detail-link:hover { text-decoration: underline; }
    .table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .table th { text-align: left; padding: 10px 12px; background: #f7fafc; border-bottom: 2px solid #e2e8f0; font-size: 12px; font-weight: 600; color: #4a5568; text-transform: uppercase; }
    .table td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; }
    .table tr:last-child td { border-bottom: none; }
    .empty { color: #999; font-style: italic; font-size: 14px; padding: 20px 0; }
    .footer { text-align: center; padding: 32px; color: #999; font-size: 12px; }
    @media (max-width: 768px) { .grid { grid-template-columns: 1fr; } .container { padding: 16px; } }
  </style>
</head>
<body>
  <div class="header">
    <span class="heart">♥</span>
    <h1>MyChart</h1>
    <div class="header-right">
      <span>Welcome, Patient</span>
      <a href="#">Sign Out</a>
    </div>
  </div>
  <div class="nav">
    ${tabs.map((t) => `<a href="${t.href}" class="${t.label === activeTab ? 'active' : ''}">${t.label}</a>`).join('')}
  </div>
  <div class="container">
    ${body}
  </div>
  <div class="footer">
    MyChart&reg; licensed from Epic Systems Corporation &copy; 1999 - 2026 &mdash; Demo Environment
  </div>
</body>
</html>`;
}

function requireAuth(req, res) {
  const authenticated = !!context.get('accessToken');
  if (!authenticated) {
    res.send(layout('Sign In Required', '', `
      <div style="text-align: center; padding: 60px 0;">
        <h2 class="page-title">Please sign in first</h2>
        <p class="page-subtitle">Use the DouglasAI sidebar to sign in with your Epic account, then refresh this page.</p>
      </div>
    `));
    return false;
  }
  return true;
}

// ── Helpers to extract FHIR data ─────────────────────────────────

function getConditions() {
  const fhirData = context.get('fhirData');
  return (fhirData?.conditions || []).map((c) => ({
    name: c.code?.text || c.code?.coding?.[0]?.display || 'Unknown condition',
    onset: c.onsetDateTime ? new Date(c.onsetDateTime).toLocaleDateString() : 'Unknown',
    status: c.clinicalStatus?.coding?.[0]?.code || 'active',
  }));
}

function getMedications() {
  const fhirData = context.get('fhirData');
  return (fhirData?.medications || []).map((m) => ({
    name: m.medicationCodeableConcept?.text
      || m.medicationCodeableConcept?.coding?.[0]?.display
      || 'Unknown medication',
    dosage: m.dosageInstruction?.[0]?.text || 'As directed',
    prescriber: m.requester?.display || 'Your provider',
    date: m.authoredOn ? new Date(m.authoredOn).toLocaleDateString() : '',
    status: m.status || 'active',
  }));
}

function getObservations() {
  const fhirData = context.get('fhirData');
  return (fhirData?.observations || []).slice(0, 20).map((o) => ({
    name: o.code?.text || o.code?.coding?.[0]?.display || 'Unknown',
    value: o.valueQuantity
      ? `${o.valueQuantity.value} ${o.valueQuantity.unit || ''}`
      : o.valueString || 'N/A',
    date: o.effectiveDateTime ? new Date(o.effectiveDateTime).toLocaleDateString() : '',
    refRange: o.referenceRange?.[0]
      ? `${o.referenceRange[0].low?.value || ''}-${o.referenceRange[0].high?.value || ''} ${o.referenceRange[0].low?.unit || ''}`
      : '',
    interpretation: o.interpretation?.[0]?.coding?.[0]?.code || 'N',
    category: o.category?.[0]?.coding?.[0]?.display || 'Laboratory',
  }));
}

function getAllergies() {
  const fhirData = context.get('fhirData');
  return (fhirData?.allergies || []).map((a) => ({
    name: a.code?.text || a.code?.coding?.[0]?.display || 'Unknown allergy',
    reaction: a.reaction?.[0]?.manifestation?.[0]?.coding?.[0]?.display
      || a.reaction?.[0]?.manifestation?.[0]?.text || 'Not specified',
    severity: a.reaction?.[0]?.severity || 'unknown',
    type: a.type || 'allergy',
  }));
}

// ── Routes ───────────────────────────────────────────────────────

// Health Summary
router.get('/', (req, res) => {
  if (!requireAuth(req, res)) return;

  const conditions = getConditions();
  const medications = getMedications();
  const observations = getObservations();
  const allergies = getAllergies();

  res.send(layout('Health Summary', 'Health Summary', `
    <h2 class="page-title">Your Health Summary</h2>
    <p class="page-subtitle">Last updated: ${new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })}</p>
    <div class="grid">
      <div class="card">
        <div class="card-header"><h3>Active Conditions</h3></div>
        <div class="card-body">
          ${conditions.length
    ? `<ul>${conditions.map((c) => `<li><span class="badge badge-blue">Active</span> ${c.name} <span style="color:#999; font-size:12px;">since ${c.onset}</span></li>`).join('')}</ul>`
    : '<p class="empty">No active conditions on file.</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Allergies &amp; Sensitivities</h3></div>
        <div class="card-body">
          ${allergies.length
    ? `<ul>${allergies.map((a) => `<li><span class="badge badge-red">Alert</span> <strong>${a.name}</strong><br/><span style="color:#666; font-size:12px;">Reaction: ${a.reaction} &bull; Severity: ${a.severity}</span></li>`).join('')}</ul>`
    : '<p class="empty">No known allergies.</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Current Medications</h3></div>
        <div class="card-body">
          ${medications.length
    ? `<ul>${medications.slice(0, 5).map((m) => `<li><span class="badge badge-green">Active</span> <strong>${m.name}</strong><br/><span style="color:#666; font-size:12px;">${m.dosage} &bull; Prescribed by ${m.prescriber}</span></li>`).join('')}</ul>
               ${medications.length > 5 ? `<a href="/api/mychart/medications" class="detail-link">View all ${medications.length} medications →</a>` : ''}`
    : '<p class="empty">No active medications on file.</p>'}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>Recent Lab Results</h3></div>
        <div class="card-body">
          ${observations.length
    ? `<ul>${observations.slice(0, 5).map((o) => `<li><div class="lab-row"><span class="lab-name">${o.name}</span><span class="lab-value">${o.value}</span></div><div class="lab-date">${o.date}${o.refRange ? ` &bull; Ref: ${o.refRange}` : ''}</div></li>`).join('')}</ul>
               ${observations.length > 5 ? '<a href="/api/mychart/results" class="detail-link">View all results →</a>' : ''}`
    : '<p class="empty">No recent lab results.</p>'}
        </div>
      </div>
    </div>
  `));
});

// Visits
router.get('/visits', (req, res) => {
  if (!requireAuth(req, res)) return;

  const conditions = getConditions();
  const meds = getMedications();

  res.send(layout('Visits', 'Visits', `
    <h2 class="page-title">Visit History</h2>
    <p class="page-subtitle">Your recent and upcoming appointments</p>

    <div class="card">
      <div class="card-header">
        <h3>Office Visit — Primary Care</h3>
        <span class="date">March 15, 2026</span>
      </div>
      <div class="card-body">
        <p class="section-label">Provider</p>
        <p>Dr. Sarah Chen, MD — Internal Medicine<br/>Evergreen Medical Center, Suite 204</p>

        <p class="section-label">Visit Summary</p>
        <div class="writeup">Patient presents for routine follow-up and management of chronic conditions. Reports compliance with current medication regimen. Denies any new complaints, chest pain, shortness of breath, or changes in weight.

${conditions.length ? `Active conditions reviewed: ${conditions.map((c) => c.name).join(', ')}. ` : ''}${meds.length ? `Current medications reviewed and reconciled: ${meds.slice(0, 3).map((m) => m.name).join(', ')}.` : ''}

Vital Signs:
  Blood Pressure: 128/82 mmHg
  Heart Rate: 76 bpm
  Temperature: 98.4°F
  Weight: 185 lbs
  BMI: 27.3

Physical Examination:
  General: Well-appearing, no acute distress
  HEENT: Normocephalic, atraumatic. Pupils equal and reactive.
  Cardiovascular: Regular rate and rhythm, no murmurs
  Respiratory: Clear to auscultation bilaterally
  Abdomen: Soft, non-tender, non-distended
  Extremities: No edema, pulses 2+ bilaterally

Assessment & Plan:
  1. Continue current medication regimen
  2. Follow up on recent lab results — some values require monitoring
  3. Continue lifestyle modifications: diet and exercise counseling provided
  4. Return in 3 months for follow-up, sooner if any concerns arise
  5. Referral to cardiology if blood pressure remains elevated at next visit</div>

        <p class="section-label">After Visit Summary</p>
        <p>Your lab work from today's visit will be available in Test Results within 3-5 business days. Please continue taking all medications as prescribed. Call our office if you experience any concerning symptoms.</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Radiology — Chest X-Ray</h3>
        <span class="date">February 28, 2026</span>
      </div>
      <div class="card-body">
        <p class="section-label">Provider</p>
        <p>Dr. Michael Torres, MD — Radiology<br/>Evergreen Medical Center, Imaging Dept</p>

        <p class="section-label">Imaging Report</p>
        <div class="writeup">CHEST X-RAY, PA AND LATERAL

CLINICAL INDICATION: Routine screening, history of chronic cough

COMPARISON: Chest X-ray dated September 12, 2025

FINDINGS:
Heart size is normal. Mediastinal contours are unremarkable. The lungs are clear without focal consolidation, pleural effusion, or pneumothorax. No acute osseous abnormalities. The visualized soft tissues are unremarkable.

IMPRESSION:
1. No acute cardiopulmonary disease
2. No significant change from prior examination</div>

        <div class="img-placeholder">
          <svg width="280" height="340" viewBox="0 0 280 340" xmlns="http://www.w3.org/2000/svg">
            <rect width="280" height="340" rx="4" fill="#1a202c"/>
            <rect x="40" y="20" width="200" height="260" rx="8" fill="#2d3748" opacity="0.8"/>
            <!-- Ribcage outline -->
            <ellipse cx="140" cy="120" rx="70" ry="90" fill="none" stroke="#4a5568" stroke-width="1.5"/>
            <!-- Ribs -->
            <path d="M85 70 Q140 60 195 70" fill="none" stroke="#4a5568" stroke-width="1"/>
            <path d="M80 90 Q140 78 200 90" fill="none" stroke="#4a5568" stroke-width="1"/>
            <path d="M78 110 Q140 96 202 110" fill="none" stroke="#4a5568" stroke-width="1"/>
            <path d="M78 130 Q140 116 202 130" fill="none" stroke="#4a5568" stroke-width="1"/>
            <path d="M80 150 Q140 136 200 150" fill="none" stroke="#4a5568" stroke-width="1"/>
            <path d="M85 170 Q140 156 195 170" fill="none" stroke="#4a5568" stroke-width="1"/>
            <!-- Heart -->
            <ellipse cx="130" cy="135" rx="30" ry="35" fill="#2d3748" stroke="#4a5568" stroke-width="1.5"/>
            <!-- Spine -->
            <line x1="140" y1="30" x2="140" y2="270" stroke="#4a5568" stroke-width="2"/>
            <!-- Label -->
            <text x="20" y="295" fill="#718096" font-size="10" font-family="monospace">PA VIEW</text>
            <text x="200" y="295" fill="#718096" font-size="10" font-family="monospace">02/28/26</text>
          </svg>
          <div class="img-label">Chest X-Ray, PA View — No acute findings</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Telehealth — Follow-up</h3>
        <span class="date">January 10, 2026</span>
      </div>
      <div class="card-body">
        <p class="section-label">Provider</p>
        <p>Dr. Sarah Chen, MD — Internal Medicine</p>

        <p class="section-label">Visit Summary</p>
        <div class="writeup">Telehealth follow-up visit. Patient reports feeling well overall. Reviewed recent lab results and discussed adjustments to care plan.

Patient counseled on importance of regular exercise (goal: 150 min/week moderate activity) and dietary modifications (reduced sodium intake, increased fruit/vegetable consumption).

Flu vaccine recommended and scheduled for next in-person visit. No changes to current medications at this time.</div>
      </div>
    </div>
  `));
});

// Messages
router.get('/messages', (req, res) => {
  if (!requireAuth(req, res)) return;

  const meds = getMedications();
  const medName = meds.length ? meds[0].name : 'your medication';

  res.send(layout('Messages', 'Messages', `
    <h2 class="page-title">Messages</h2>
    <p class="page-subtitle">Communication with your care team</p>

    <div class="card">
      <div class="card-header">
        <h3>RE: Lab Results Question</h3>
        <span class="date">March 18, 2026</span>
      </div>
      <div class="card-body">
        <div class="msg-thread">
          <p class="msg-from">You</p>
          <p class="msg-date">March 16, 2026 at 2:34 PM</p>
          <p class="msg-body">Hi Dr. Chen, I received my lab results and noticed some of the values seem different from last time. Should I be concerned about anything? Also, I've been experiencing some mild fatigue in the afternoons. Could this be related to my medications?</p>
        </div>
        <div class="msg-thread">
          <p class="msg-from">Dr. Sarah Chen, MD</p>
          <p class="msg-date">March 18, 2026 at 9:15 AM</p>
          <p class="msg-body">Thank you for reaching out. I've reviewed your recent lab results. While there are some minor changes, nothing appears clinically concerning at this time. We'll continue to monitor these values at your next visit.

Regarding the fatigue — this can sometimes be associated with ${medName}. I'd recommend:
• Ensuring adequate hydration (8+ glasses of water daily)
• Maintaining a regular sleep schedule
• Taking your medication at the same time each day, preferably in the morning

If the fatigue worsens or persists beyond two weeks, please schedule a follow-up appointment so we can evaluate further. We may consider adjusting your dosage or exploring alternative options.</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Appointment Reminder</h3>
        <span class="date">March 10, 2026</span>
      </div>
      <div class="card-body">
        <div class="msg-thread">
          <p class="msg-from">Evergreen Medical Center</p>
          <p class="msg-date">March 10, 2026 at 8:00 AM</p>
          <p class="msg-body">This is a reminder that you have an upcoming appointment:

Date: March 15, 2026
Time: 10:30 AM
Provider: Dr. Sarah Chen, MD
Location: Evergreen Medical Center, Suite 204

Please arrive 15 minutes early. Bring your insurance card and a list of current medications. If you need to reschedule, please call (555) 123-4567 or reply to this message.</p>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Prescription Renewal</h3>
        <span class="date">February 20, 2026</span>
      </div>
      <div class="card-body">
        <div class="msg-thread">
          <p class="msg-from">You</p>
          <p class="msg-date">February 18, 2026 at 11:20 AM</p>
          <p class="msg-body">I'm running low on ${medName}. Could you please renew my prescription? I use the CVS on Main Street.</p>
        </div>
        <div class="msg-thread">
          <p class="msg-from">Dr. Sarah Chen, MD</p>
          <p class="msg-date">February 20, 2026 at 3:45 PM</p>
          <p class="msg-body">Your prescription has been renewed and sent to CVS Pharmacy on Main Street. It should be ready for pickup within 24 hours. This renewal is for a 90-day supply with 2 refills. Please continue taking as directed.</p>
        </div>
      </div>
    </div>
  `));
});

// Test Results
router.get('/results', (req, res) => {
  if (!requireAuth(req, res)) return;

  const observations = getObservations();

  res.send(layout('Test Results', 'Test Results', `
    <h2 class="page-title">Test Results</h2>
    <p class="page-subtitle">Laboratory and diagnostic results</p>

    <div class="card">
      <div class="card-header">
        <h3>Comprehensive Metabolic Panel (CMP)</h3>
        <span class="date">${observations.length ? observations[0].date : 'March 15, 2026'}</span>
      </div>
      <div class="card-body">
        <p class="section-label">Ordered By</p>
        <p>Dr. Sarah Chen, MD — Routine Follow-up</p>
        <p class="section-label">Results</p>
        <table class="table">
          <thead>
            <tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${observations.length
    ? observations.map((o) => {
      let flag = 'badge-green';
      let label = 'Normal';
      if (o.interpretation === 'H') { flag = 'badge-red'; label = 'High'; }
      if (o.interpretation === 'L') { flag = 'badge-yellow'; label = 'Low'; }
      return `<tr><td>${o.name}</td><td><strong>${o.value}</strong></td><td>${o.refRange || '—'}</td><td><span class="badge ${flag}">${label}</span></td></tr>`;
    }).join('')
    : `<tr><td>Glucose</td><td><strong>95 mg/dL</strong></td><td>70-100 mg/dL</td><td><span class="badge badge-green">Normal</span></td></tr>
                 <tr><td>BUN</td><td><strong>18 mg/dL</strong></td><td>7-20 mg/dL</td><td><span class="badge badge-green">Normal</span></td></tr>
                 <tr><td>Creatinine</td><td><strong>1.1 mg/dL</strong></td><td>0.7-1.3 mg/dL</td><td><span class="badge badge-green">Normal</span></td></tr>
                 <tr><td>Sodium</td><td><strong>142 mEq/L</strong></td><td>136-145 mEq/L</td><td><span class="badge badge-green">Normal</span></td></tr>
                 <tr><td>Potassium</td><td><strong>4.2 mEq/L</strong></td><td>3.5-5.0 mEq/L</td><td><span class="badge badge-green">Normal</span></td></tr>
                 <tr><td>Calcium</td><td><strong>9.8 mg/dL</strong></td><td>8.5-10.5 mg/dL</td><td><span class="badge badge-green">Normal</span></td></tr>
                 <tr><td>ALT</td><td><strong>45 U/L</strong></td><td>7-35 U/L</td><td><span class="badge badge-red">High</span></td></tr>
                 <tr><td>AST</td><td><strong>38 U/L</strong></td><td>10-40 U/L</td><td><span class="badge badge-green">Normal</span></td></tr>`}
          </tbody>
        </table>
        <p class="section-label">Provider Comments</p>
        <p>Results are mostly within normal limits. ${observations.some((o) => o.interpretation === 'H') ? 'Some elevated values noted — we will continue to monitor at your next visit. No immediate action required.' : 'Continue current management and follow up as scheduled.'}</p>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Complete Blood Count (CBC)</h3>
        <span class="date">March 15, 2026</span>
      </div>
      <div class="card-body">
        <table class="table">
          <thead>
            <tr><th>Test</th><th>Result</th><th>Reference Range</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>WBC</td><td><strong>7.2 x10^3/uL</strong></td><td>4.5-11.0</td><td><span class="badge badge-green">Normal</span></td></tr>
            <tr><td>RBC</td><td><strong>4.8 x10^6/uL</strong></td><td>4.5-5.5</td><td><span class="badge badge-green">Normal</span></td></tr>
            <tr><td>Hemoglobin</td><td><strong>14.2 g/dL</strong></td><td>13.5-17.5</td><td><span class="badge badge-green">Normal</span></td></tr>
            <tr><td>Hematocrit</td><td><strong>42.1%</strong></td><td>38.8-50.0</td><td><span class="badge badge-green">Normal</span></td></tr>
            <tr><td>Platelets</td><td><strong>245 x10^3/uL</strong></td><td>150-400</td><td><span class="badge badge-green">Normal</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h3>Lipid Panel</h3>
        <span class="date">March 15, 2026</span>
      </div>
      <div class="card-body">
        <table class="table">
          <thead>
            <tr><th>Test</th><th>Result</th><th>Desirable Range</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>Total Cholesterol</td><td><strong>218 mg/dL</strong></td><td>&lt;200 mg/dL</td><td><span class="badge badge-yellow">Borderline</span></td></tr>
            <tr><td>LDL Cholesterol</td><td><strong>138 mg/dL</strong></td><td>&lt;100 mg/dL</td><td><span class="badge badge-red">High</span></td></tr>
            <tr><td>HDL Cholesterol</td><td><strong>52 mg/dL</strong></td><td>&gt;40 mg/dL</td><td><span class="badge badge-green">Normal</span></td></tr>
            <tr><td>Triglycerides</td><td><strong>142 mg/dL</strong></td><td>&lt;150 mg/dL</td><td><span class="badge badge-green">Normal</span></td></tr>
          </tbody>
        </table>
        <p class="section-label">Provider Comments</p>
        <p>LDL cholesterol remains elevated. Recommend continuing dietary modifications and increasing physical activity. Will reassess in 3 months — if not improved, may consider initiating statin therapy. Please discuss this at your next visit.</p>
      </div>
    </div>
  `));
});

// Medications
router.get('/medications', (req, res) => {
  if (!requireAuth(req, res)) return;

  const medications = getMedications();

  res.send(layout('Medications', 'Medications', `
    <h2 class="page-title">Medications</h2>
    <p class="page-subtitle">Your current and past prescriptions</p>

    <div class="card">
      <div class="card-header"><h3>Active Medications</h3></div>
      <div class="card-body">
        ${medications.length
    ? medications.map((m) => `
            <div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
              <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                  <strong style="font-size: 15px;">${m.name}</strong>
                  <span class="badge badge-green" style="margin-left: 8px;">Active</span>
                </div>
              </div>
              <div style="margin-top: 6px; font-size: 13px; color: #666;">
                <strong>Dosage:</strong> ${m.dosage}<br/>
                <strong>Prescribed by:</strong> ${m.prescriber}<br/>
                ${m.date ? `<strong>Start date:</strong> ${m.date}<br/>` : ''}
                <strong>Pharmacy:</strong> CVS Pharmacy — 123 Main Street
              </div>
              <div style="margin-top: 8px;">
                <a href="#" class="detail-link" style="margin-right: 16px;">Request Renewal</a>
                <a href="#" class="detail-link">View Drug Info</a>
              </div>
            </div>
          `).join('')
    : '<p class="empty">No active medications on file.</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Medication History</h3></div>
      <div class="card-body">
        <div style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
          <strong>Amoxicillin 500mg</strong> <span class="badge badge-gray">Completed</span>
          <div style="margin-top: 4px; font-size: 13px; color: #666;">
            7-day course for upper respiratory infection — December 2025
          </div>
        </div>
        <div style="padding: 12px 0;">
          <strong>Prednisone 10mg</strong> <span class="badge badge-gray">Completed</span>
          <div style="margin-top: 4px; font-size: 13px; color: #666;">
            Taper pack for inflammation — October 2025
          </div>
        </div>
      </div>
    </div>
  `));
});

// Billing
router.get('/billing', (req, res) => {
  if (!requireAuth(req, res)) return;

  res.send(layout('Billing', 'Billing', `
    <h2 class="page-title">Billing Summary</h2>
    <p class="page-subtitle">Your account statements and payment history</p>

    <div class="card">
      <div class="card-header">
        <h3>Current Balance</h3>
      </div>
      <div class="card-body" style="text-align: center; padding: 32px;">
        <div style="font-size: 36px; font-weight: 700; color: #1b3a5c;">$125.00</div>
        <p style="color: #666; margin-top: 8px;">Amount due by April 15, 2026</p>
        <button style="margin-top: 16px; padding: 10px 32px; background: #1b3a5c; color: white; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer;">Pay Now</button>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Recent Statements</h3></div>
      <div class="card-body">
        <table class="table">
          <thead>
            <tr><th>Date</th><th>Description</th><th>Billed</th><th>Insurance</th><th>You Owe</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>03/15/2026</td>
              <td>Office Visit — Dr. Chen</td>
              <td>$350.00</td>
              <td>-$280.00</td>
              <td><strong>$70.00</strong></td>
              <td><span class="badge badge-yellow">Pending</span></td>
            </tr>
            <tr>
              <td>03/15/2026</td>
              <td>Laboratory — CMP, CBC, Lipid</td>
              <td>$420.00</td>
              <td>-$365.00</td>
              <td><strong>$55.00</strong></td>
              <td><span class="badge badge-yellow">Pending</span></td>
            </tr>
            <tr>
              <td>02/28/2026</td>
              <td>Radiology — Chest X-Ray</td>
              <td>$280.00</td>
              <td>-$252.00</td>
              <td><strong>$28.00</strong></td>
              <td><span class="badge badge-green">Paid</span></td>
            </tr>
            <tr>
              <td>01/10/2026</td>
              <td>Telehealth Visit — Dr. Chen</td>
              <td>$150.00</td>
              <td>-$120.00</td>
              <td><strong>$30.00</strong></td>
              <td><span class="badge badge-green">Paid</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h3>Insurance Information</h3></div>
      <div class="card-body">
        <p><strong>Plan:</strong> Blue Cross Blue Shield — PPO Select</p>
        <p><strong>Member ID:</strong> XYZ123456789</p>
        <p><strong>Group:</strong> EMC-2026</p>
        <p style="margin-top: 8px;"><strong>Deductible:</strong> $1,500 ($1,180 met)</p>
        <p><strong>Out-of-pocket max:</strong> $5,000 ($890 of $5,000)</p>
      </div>
    </div>
  `));
});

module.exports = router;
