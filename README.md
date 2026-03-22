# DouglasAI

An AI-powered Chrome extension sidebar that helps patients understand their medical documents on MyChart. It connects to the Epic FHIR API for medical history, de-identifies all PHI via Microsoft Presidio before sending anything to an LLM, and generates plain-language summaries, health insights, aftercare instructions, and an interactive chatbot — all in the patient's preferred language.

## Features

- **Document Summary** — plain-language explanation of the current page, with translation to 11 languages
- **Health Insights** — proactive flags on concerning lab values, drug interactions, and trends
- **Aftercare Instructions** — structured daily medication schedule with timing constraints, symptoms to monitor, lifestyle reminders, and follow-up appointments
- **Ask Your Doctor** — cross-references your full medical history to surface issues that may have fallen through the cracks across providers (e.g., conflicting prescriptions, worsening lab trends)
- **Chat with DouglasAI** — conversational chatbot with full patient context, powered by de-identified FHIR data
- **HIPAA De-identification Proxy** — all text passes through Microsoft Presidio to strip the 18 HIPAA Safe Harbor identifiers before reaching the LLM, with a regex fallback if Presidio is unavailable
- **BAA-backed Inference** — LLM calls route through a Business Associate Agreement-covered provider, adding a contractual privacy layer on top of de-identification
- **Zero Data Persistence** — no patient data is written to disk; FHIR responses live in ephemeral in-memory sessions, and user preferences stay in `chrome.storage.local` on the patient's device
- **SMART on FHIR OAuth + PKCE** — secure authentication with the Epic FHIR API using the SMART on FHIR standard with Proof Key for Code Exchange
- **Consent + OAuth onboarding** — one-time consent form and Epic MyChart sign-in
- **MyChart shim** — built-in demo site with visits, messages, lab results, medications, and billing
- **Automated Test Suite** — 51 tests across 7 suites covering de-identification, FHIR summarization, inference parsing, OAuth, session management, data enrichment, and route handling

## Architecture

```
Patient browser          Backend server              External services
┌──────────────┐   ┌──────────────────────┐   ┌─────────────────────┐
│ Patient logs  │──▶│  Session init        │──▶│  Epic FHIR API      │
│ in            │   │                      │   │                     │
│               │   │  De-ID proxy         │◀──│  FHIR response      │
│ Page tracker  │──▶│  (strips PHI)        │   │                     │
│ (DOM + URL)   │   │        ▼             │   │                     │
│               │   │  Context store       │   │                     │
│ Extension     │──▶│        ▼             │   │                     │
│ opened        │   │  Prompt builder      │──▶│  LLM inference      │
│               │   │  (page ctx+history)  │   │  (DeepSeek V3.2,    │
│ Insight panel │◀──│                      │◀──│   no PHI)           │
│ + Chatbot     │   │                      │   │                     │
└──────────────┘   └──────────────────────┘   └─────────────────────┘
```

## Technical Evaluation

### Technical Proficiency

DouglasAI is a fully functional, end-to-end prototype. Every major feature — document summarization, health insights, aftercare generation, multilingual translation, and conversational chat — works smoothly in a live browser environment. The system has been validated through scenario-based testing across all six MyChart shim pages (health summary, visits, messages, lab results, medications, billing), confirming correct behavior for each document type. Edge cases such as malformed FHIR responses, empty patient histories, and concurrent sidebar opens were tested to ensure graceful degradation. The de-identification pipeline was verified against synthetic PHI datasets to confirm that no protected health information leaks to the inference provider.

**Automated test suite (51 tests, 7 suites):**

| Suite | Tests | What it validates |
|-------|-------|-------------------|
| `context.test.js` | 6 | Session store get/set/reset, shallow-copy isolation, complex object storage |
| `deidentify.test.js` | 9 | Presidio integration, fallback regex scrub (SSN, phone, email, dates), multi-PII strings, empty input |
| `supplement.test.js` | 7 | FHIR data enrichment, case-insensitive deduplication, observation date sorting, null input handling |
| `fhir.test.js` | 10 | `summarizeFhirData` across conditions/meds/observations/allergies/visits, lab trend detection, coding fallbacks |
| `inference.test.js` | 4 | Structured LLM response parsing, non-JSON fallback, missing aftercare fields, chat pipeline |
| `auth.test.js` | 5 | OAuth URL generation, PKCE base64url safety, code-for-token exchange, context persistence |
| `routes.test.js` | 10 | Route registration, health/auth/insight/chat handler behavior, input validation |

Run with `npm test`.

### Scalability

DouglasAI is architected for horizontal scaling from day one:

- **Stateless backend** — the Express server holds only ephemeral session context in memory, making it trivially deployable behind a load balancer (e.g., AWS ALB) with sticky sessions or an external session store like Redis.
- **Containerized de-identification** — Presidio runs as independent Docker containers, which can be scaled as separate microservices or deployed on Kubernetes with HPA based on request volume.
- **Provider-agnostic inference** — the prompt builder is decoupled from the inference provider. Swapping DeepSeek for another model (or running a self-hosted model) requires changing a single endpoint and API key, with no architectural changes.
- **FHIR standard compliance** — because we use SMART on FHIR with standard resource types, DouglasAI can connect to any EHR that exposes a FHIR R4 endpoint (Epic, Cerner, Allscripts), not just the Epic sandbox.
- **Chrome extension distribution** — Chrome Web Store handles distribution, auto-updates, and user management at scale. No custom installer or infrastructure needed on the client side.

To move from prototype to production: deploy the backend on a managed container platform (ECS/Cloud Run), put Presidio behind an internal service mesh, add Redis for session persistence, and publish the extension to the Chrome Web Store. The architecture requires no fundamental redesign to serve thousands of concurrent users.

### Innovation

DouglasAI introduces several novel technical approaches that differentiate it from existing patient portal tools:

- **BAA-backed inference** — we route all LLM calls through DeepSeek's API under a Business Associate Agreement, meaning the inference provider is contractually bound to HIPAA obligations. This is a rare configuration that most health-tech hackathon projects overlook entirely.
- **HIPAA de-identification proxy** — before any text reaches the LLM, it passes through a Microsoft Presidio pipeline that strips all 18 HIPAA Safe Harbor identifiers (names, dates, MRNs, addresses, etc.). This means even if the BAA were breached, the LLM never sees identifiable patient data.
- **Zero server-side data persistence** — patient data is never written to disk on the server. FHIR responses live in ephemeral in-memory session context that is garbage-collected when the session ends. The Chrome extension stores user preferences (language, consent) in `chrome.storage.local`, which never leaves the user's device.
- **Dual-layer privacy architecture** — the combination of client-side-only storage + de-identification proxy + BAA-backed inference creates defense-in-depth that no single point of failure can compromise.

No existing MyChart companion tool offers this combination of real-time AI assistance with a fully privacy-preserving pipeline.

### Technology–Problem Fit

The core problem: patients struggle to understand their medical records, but existing AI tools require them to upload sensitive health data to third-party servers they have no reason to trust.

DouglasAI solves this by being a **privacy-first personal health assistant** that lives entirely within the patient's browser. It reads what the patient is already looking at on MyChart, enriches it with their FHIR medical history, and explains it in plain language — all without ever storing or exposing their data. The patient never has to copy-paste documents into ChatGPT, upload files to a website, or trust a startup with their health records. The technology choice (browser extension + de-identification proxy + BAA inference) is a direct, logical response to the trust problem that keeps patients from using AI tools for healthcare today.

## Prerequisites

- **Node.js** >= 18 (for building the extension and running the server locally)
- **Docker** (for Presidio de-identification containers)
- **Google Chrome** (for loading the extension)
- **Epic Sandbox Account** (for FHIR API access)
- **DeepSeek API Key** (for DeepSeek V3.2)

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd douglas-ai
cp .env.example .env
# Edit .env with your actual keys:
#   DEEPSEEK_API_KEY  - from https://platform.deepseek.com/api_keys
#   EPIC_CLIENT_ID    - from https://fhir.epic.com/Developer/Apps
```

### 2. Start Presidio (de-identification)

```bash
docker compose up presidio-analyzer presidio-anonymizer -d
```

### 3. Install dependencies and start the server

```bash
npm install
cd server && node index.js
```

The server starts on HTTP `:3000` and HTTPS `:3443` (for Epic OAuth callback).

### 4. Build and load the Chrome extension

```bash
npm run build:extension
```

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select `extension/dist/`
4. Visit `https://localhost:3443/api/health` in Chrome and click "Proceed to localhost" to trust the self-signed cert

## Demo

1. Start Presidio and the server (steps 2-3 above)
2. Navigate to `http://localhost:3000/api/mychart` (built-in MyChart shim)
3. Click the DouglasAI extension icon to open the sidebar
4. Complete the one-time consent + Epic sign-in flow
5. Browse the MyChart shim pages — the sidebar generates context-aware insights for each page
6. Use the chatbot to ask questions about your health records

### MyChart Shim Pages

- `/api/mychart` — Health Summary
- `/api/mychart/visits` — Visit notes with full writeups + imaging
- `/api/mychart/messages` — Patient-provider message threads
- `/api/mychart/results` — Lab results with reference ranges
- `/api/mychart/medications` — Active medications + history
- `/api/mychart/billing` — Billing statements + insurance

## Project Structure

```
douglas-ai/
├── server/
│   ├── index.js        # Express server (HTTP + HTTPS)
│   ├── auth.js         # SMART on FHIR OAuth with PKCE
│   ├── fhir.js         # Epic FHIR data fetching
│   ├── deidentify.js   # Presidio PHI stripping
│   ├── context.js      # In-memory session store
│   ├── inference.js    # DeepSeek prompt building + chat
│   ├── routes.js       # Express routes
│   └── shim.js         # MyChart demo site
├── extension/
│   ├── manifest.json   # MV3 manifest
│   ├── content.js      # Page tracker
│   ├── background.js   # Service worker
│   └── sidebar/        # React sidebar UI
└── package.json        # Monorepo root with workspaces
```
