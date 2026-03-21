# Privacy Policy — MyChart Copilot

**MyChart Copilot** is a Chrome extension that helps patients understand their medical documents on MyChart. This policy explains what data the app accesses, how it is handled, and what we do not do with it.

---

## What we access

When you use MyChart Copilot, the app accesses:

- The content of the MyChart page you are currently viewing (page text and URL)
- Your Epic health records via the Epic FHIR API, including active conditions, current medications, recent lab results, and allergies

This data is accessed solely to generate a plain-language summary of your current document and surface relevant context from your health history — for your own understanding.

---

## How we protect your data

**De-identification before AI processing.** All patient health information (PHI) is processed through Microsoft Presidio, an open-source de-identification engine, before it is ever sent to any AI inference provider. Names, dates, locations, phone numbers, and other identifying details are stripped and replaced with generic placeholders (e.g. [PERSON], [DATE]) before leaving your local machine.

**Local server only.** MyChart Copilot runs on a server on your own machine. Your identifiable health data never passes through any third-party cloud infrastructure. Only de-identified text is sent to the AI inference provider.

**No permanent storage.** All session data is held in memory only. When your session ends, all data is cleared. Nothing is written to disk, a database, or any external storage.

**AI inference.** De-identified text is sent to the Anthropic API for language model inference. Anthropic processes this data under zero data retention terms — inputs and outputs are not logged, stored, or used for model training.

---

## What we do not do

- **We do not sell your data.** Ever, to anyone, under any circumstances.
- **We do not share your data without your permission.** Your health information is used only to generate insights for you within the current session.
- **We do not use your data for marketing or advertising.** MyChart Copilot has no advertising component of any kind.
- **We do not use your data to gain insights about your family.** The app operates solely on the authenticated patient's own records.
- **We do not store your health data permanently.** All data is in-memory only and is discarded when the session ends.

---

## HIPAA notice

MyChart Copilot is a patient-facing tool built for personal use. In its current form it is not a Covered Entity or Business Associate under HIPAA. However, the app is designed with HIPAA principles as its foundation — de-identification of PHI before any external transmission, minimal data retention, session-only storage, and no third-party data sharing — as a basis for future regulatory compliance.

---

## Third-party services

| Service | Purpose | Data sent |
|---|---|---|
| Epic FHIR API | Retrieve patient health records | OAuth token (no PHI) |
| Microsoft Presidio | De-identify PHI | Raw PHI (processed locally) |
| Anthropic API | Generate plain-language summaries | De-identified text only |

---

## Contact

For questions about this privacy policy, contact: kevinliang22069@gmail.com

---

<!-- Last updated: 2026-03-21 -->
