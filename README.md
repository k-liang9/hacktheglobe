# DouglasAI

An AI-powered Chrome extension sidebar that helps patients understand their medical documents on MyChart. It connects to the Epic FHIR API for medical history, de-identifies all PHI via Microsoft Presidio before sending anything to an LLM, and generates plain-language summaries, health insights, aftercare instructions, and an interactive chatbot — all in the patient's preferred language.

## Features

- **Document Summary** — plain-language explanation of the current page, with translation to 11 languages
- **Health Insights** — proactive flags on concerning lab values, drug interactions, and trends
- **Aftercare Instructions** — medication timing, symptoms to watch for, lifestyle guidance
- **Ask Your Doctor** — generated questions to bring up at your next visit
- **Chat with DouglasAI** — conversational chatbot with full patient context
- **Consent + OAuth onboarding** — one-time consent form and Epic MyChart sign-in
- **MyChart shim** — built-in demo site with visits, messages, lab results, medications, and billing

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
