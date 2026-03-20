# MyChart Copilot

An AI-powered Chrome extension sidebar that helps patients understand their medical documents on MyChart. It connects to the Epic FHIR API for medical history, de-identifies all PHI via Microsoft Presidio before sending anything to an LLM, and generates plain-language summaries with actionable questions to raise with your doctor.

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
│               │   │  (page ctx+history)  │   │  (BAA-covered,      │
│ Insight panel │◀──│                      │◀──│   no PHI)           │
│ (summary +    │   │                      │   │                     │
│  issues)      │   │                      │   │                     │
└──────────────┘   └──────────────────────┘   └─────────────────────┘
```

## Prerequisites

- **Docker + Docker Compose** (runs everything)
- **Google Chrome** (for loading the extension)
- **Epic Sandbox Account** (for FHIR API access)
- **DeepSeek API Key** (for DeepSeek V3.2)

## Setup

### 1. Clone and configure

```bash
git clone <repo-url>
cd mychart-copilot
cp .env.example .env
# Edit .env with your actual keys:
#   DEEPSEEK_API_KEY  - from https://platform.deepseek.com/api_keys
#   EPIC_CLIENT_ID    - from https://fhir.epic.com/Developer/Apps
```

### 2. Build and start everything

```bash
docker compose up --build
```

This builds and starts all services:
- **extension-build** — builds the Chrome extension, outputs to `extension/dist/`
- **server** — Express backend on `:3000`
- **presidio-analyzer** — PHI detection on `:5002`
- **presidio-anonymizer** — PHI redaction on `:5001`

Verify with:

```bash
curl http://localhost:3000/api/health
# → {"ok": true}
```

### 3. Load the extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/dist/` directory
5. The MyChart Copilot icon appears in the toolbar

## Demo

1. Run `docker compose up --build` (builds extension + starts server + Presidio)
2. Navigate to a MyChart page (or any page for testing)
3. Click the MyChart Copilot extension icon to open the sidebar
4. The extension sends the current page content to the backend
5. The backend de-identifies the text, builds a prompt with FHIR context, and calls DeepSeek
6. The sidebar displays a plain-language summary and a list of questions for the doctor

## Project Structure

```
mychart-copilot/
├── server/           # Express backend
│   ├── index.js      # Server entry point
│   ├── auth.js       # SMART on FHIR OAuth with PKCE
│   ├── fhir.js       # Epic FHIR data fetching
│   ├── deidentify.js # Presidio PHI stripping
│   ├── context.js    # In-memory session store
│   ├── inference.js  # DeepSeek prompt building + API call
│   └── routes.js     # Express routes
├── extension/        # Chrome extension (Manifest V3)
│   ├── manifest.json
│   ├── content.js    # Page tracker
│   ├── background.js # Service worker
│   └── sidebar/      # React sidebar UI
└── package.json      # Monorepo root with workspaces
```
