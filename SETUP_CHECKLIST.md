# Setup Checklist

Everything you need to do manually to get MyChart Copilot running from zero.

---

## 1. Install system prerequisites

- [ ] **Docker Desktop** — [Download](https://www.docker.com/products/docker-desktop/)
- [ ] **Google Chrome** — [Download](https://www.google.com/chrome/)

## 2. Get a DeepSeek API key

- [ ] Create an account at [platform.deepseek.com](https://platform.deepseek.com/)
- [ ] Go to **API Keys** → [Create API Key](https://platform.deepseek.com/api_keys)
- [ ] Copy the key — you'll need it for `.env`

## 3. Register an Epic FHIR sandbox app

- [ ] Create an account at [fhir.epic.com](https://fhir.epic.com/)
- [ ] Go to **Build Apps** → [Create a New App](https://fhir.epic.com/Developer/Apps)
- [ ] Set **Application Audience** to **Patients**
- [ ] Set **Incoming API: SMART on FHIR version** to **R4**
- [ ] Under **Redirect URIs**, add: `http://localhost:3000/api/auth/callback`
- [ ] Under **API Access**, select these scopes:
  - `patient/Patient.read`
  - `patient/Condition.read`
  - `patient/MedicationRequest.read`
  - `patient/Observation.read`
  - `patient/AllergyIntolerance.read`
  - `openid`
  - `fhirUser`
- [ ] Save the app and copy the **Client ID** (Non-Production)

## 4. Configure environment variables

- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Fill in real values:
  - `DEEPSEEK_API_KEY` — from step 2
  - `EPIC_CLIENT_ID` — from step 3
  - `EPIC_REDIRECT_URI` — leave as `http://localhost:3000/api/auth/callback`
  - `PORT` — leave as `3000` (or change if needed)

## 5. Start the entire backend (one command)

```bash
docker compose up --build
```

This starts all services and builds the extension in one shot:
- **extension-build** — builds the Chrome extension, outputs to `extension/dist/`
- **server** — Express backend on `localhost:3000`
- **presidio-analyzer** — PHI detection on `localhost:5002`
- **presidio-anonymizer** — PHI redaction on `localhost:5001`

The server waits for Presidio health checks to pass before starting.

- [ ] Verify the server is running:
  ```bash
  curl http://localhost:3000/api/health
  # Should return: {"ok":true}
  ```
- [ ] Confirm the `extension/dist/` directory was created

## 6. Load the extension into Chrome

- [ ] Open `chrome://extensions/` in Chrome
- [ ] Toggle **Developer mode** ON (top-right corner)
- [ ] Click **Load unpacked**
- [ ] Navigate to and select the `extension/dist/` directory
- [ ] Confirm the MyChart Copilot extension appears in the toolbar
- [ ] Pin it for easy access (click the puzzle icon → pin MyChart Copilot)

## 7. Run a demo

- [ ] Navigate to a MyChart portal page (e.g., `mychart.com`)
- [ ] Click the MyChart Copilot icon in the Chrome toolbar
- [ ] The sidebar opens and shows a loading spinner
- [ ] After a few seconds, you should see:
  - A plain-language **summary** of the current page
  - A list of **questions** to bring up with your doctor

## Troubleshooting

| Problem | Fix |
|---|---|
| `Connection Error` in sidebar | Make sure the backend server is running on port 3000 |
| `Presidio unavailable` warning in server logs | Run `docker compose up` — both Presidio containers must be healthy |
| Extension not appearing | Run `docker compose up extension-build --build` and reload in `chrome://extensions/` |
| OAuth error | Verify `EPIC_CLIENT_ID` and redirect URI match your Epic app config |
| DeepSeek API error | Check your `DEEPSEEK_API_KEY` is valid and has credits |
