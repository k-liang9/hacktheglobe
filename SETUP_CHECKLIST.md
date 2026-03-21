# Setup Checklist

Everything you need to do manually to get DouglasAI running from zero.

---

## 1. Install system prerequisites

- [ ] **Node.js >= 18** — [Download](https://nodejs.org/)
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
- [ ] Under **Incoming APIs**, select all R4 Patient Chart items
- [ ] Under **Redirect URIs**, add: `https://localhost:3443/api/auth/callback`
- [ ] Save the app and copy the **Client ID** (Non-Production)

## 4. Configure environment variables

- [ ] Copy `.env.example` to `.env`:
  ```bash
  cp .env.example .env
  ```
- [ ] Fill in real values:
  - `DEEPSEEK_API_KEY` — from step 2
  - `EPIC_CLIENT_ID` — from step 3
  - `EPIC_REDIRECT_URI` — set to `https://localhost:3443/api/auth/callback`
  - `PORT` — leave as `3000`

## 5. Start Presidio containers

```bash
docker compose up presidio-analyzer presidio-anonymizer -d
```

- [ ] Wait for containers to become healthy (~30 seconds)

## 6. Install dependencies and start the server

```bash
npm install
cd server && node index.js
```

- [ ] Verify you see:
  ```
  DouglasAI server (HTTP) running on http://localhost:3000
  DouglasAI server (HTTPS) running on https://localhost:3443
  ```

## 7. Build the Chrome extension

```bash
npm run build:extension
```

- [ ] Confirm `extension/dist/` was created

## 8. Trust the self-signed certificate

- [ ] Open `https://localhost:3443/api/health` in Chrome
- [ ] Click **Advanced** → **Proceed to localhost (unsafe)**
- [ ] Confirm you see `{"ok":true}`

## 9. Load the extension into Chrome

- [ ] Open `chrome://extensions/` in Chrome
- [ ] Toggle **Developer mode** ON (top-right corner)
- [ ] Click **Load unpacked**
- [ ] Navigate to and select the `extension/dist/` directory
- [ ] Confirm DouglasAI appears in the toolbar
- [ ] Pin it for easy access (click the puzzle icon → pin DouglasAI)

## 10. Run a demo

- [ ] Navigate to `http://localhost:3000/api/mychart` (built-in MyChart shim)
- [ ] Click the DouglasAI icon in the Chrome toolbar to open the sidebar
- [ ] Complete the one-time consent + Epic sign-in flow
- [ ] After sign-in, refresh the MyChart shim page
- [ ] Open the sidebar — you should see collapsible sections:
  - **Document Summary** — with language translation dropdown
  - **Health Insights** — proactive health observations
  - **Aftercare Instructions** — medication and self-care guidance
  - **Ask Your Doctor** — questions for your next visit
  - **Chat with DouglasAI** — interactive chatbot
- [ ] Click through the shim tabs (Visits, Messages, Test Results, etc.) and reopen the sidebar to see page-specific insights

## Troubleshooting

| Problem | Fix |
|---|---|
| `Connection Error` in sidebar | Make sure the server is running on port 3000 |
| `Presidio unavailable` warning in server logs | Run `docker compose up presidio-analyzer presidio-anonymizer -d` |
| Extension not appearing | Rebuild with `npm run build:extension` and reload in `chrome://extensions/` |
| SSL error on OAuth callback | Visit `https://localhost:3443/api/health` and accept the self-signed cert |
| OAuth error | Verify `EPIC_CLIENT_ID` and redirect URI match your Epic app config |
| DeepSeek API error | Check your `DEEPSEEK_API_KEY` is valid and has credits |
| Sidebar shows empty sections | Check server terminal for errors — DeepSeek may be rate-limiting |
