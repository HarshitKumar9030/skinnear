# Configuration and deployment

Keep credentials in `.env.local`. Restart the server after editing it.

| Variable | Purpose |
| --- | --- |
| `YOUCAM_API_KEY` | Server-side YouCam v2 authentication; API secret is not used |
| `YOUCAM_API_BASE_URL` | Account region origin; defaults to `https://yce-api-01.makeupar.com` |
| `GEMINI_API_KEY` | Report explanations, speech and transcript timestamps |
| `GEMINI_TEXT_MODEL` | Defaults to `gemini-3.8-flash` |
| `GEMINI_TTS_MODEL` | Defaults to `gemini-3.8-flash-tts` |
| `GEMINI_TRANSCRIBE_MODEL` | Defaults to `gemini-3.5-transcribe` |
| `SERPAPI_API_KEY` | Live country-aware shopping results |
| `MONGODB_URI` / `MONGODB_DATABASE` | Catalog, private routine storage and shared production quotas |
| `TASK_SIGNING_SECRET` | Stable scan, visitor and narration signatures |
| `APP_ORIGIN` | Canonical public origin |
| `CLIENT_IP_HEADER` | Visitor IP header overwritten by your trusted deployment proxy |
| `TRUST_PROXY_HEADERS` | Enable only behind a proxy that strips and sets visitor IP headers |
| `YOUCAM_DAILY_SCAN_LIMIT` | Deployment-wide attempted scan cap, default 100/day |
| `GEMINI_DAILY_REQUEST_LIMIT` | Deployment-wide AI call cap, default 200/day |
| `IPINFO_TOKEN` | Optional server-side approximate city suggestion |

Generate the signing secret locally:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

## Production behavior

Shared storage, a signing secret and trusted visitor-IP configuration are required for paid public endpoints. Production checks fail closed when these are missing. Development on localhost bypasses quotas; a localhost-looking header cannot enable that bypass in production.

An explanation with synchronized narration uses three separately counted Gemini calls: text, speech and timestamp transcription. A failed or quota-limited transcription keeps the audio and uses approximate transcript timing. Raw WAV responses remain available to clients that do not request captions.

Narration tokens expire after 15 minutes and are bound to the requesting browser. The server narrates only approved explanations, not arbitrary caller text. Photos are sent to YouCam only after scan consent; Gemini receives scores or selected product facts under separate explanation consent.

## Catalog maintenance

```powershell
python scripts/catalog.py validate
python scripts/catalog.py seed
```

Without MongoDB, the reviewed JSON catalog supplies recommendations. Without shopping credentials, the app returns retailer search destinations rather than invented live stock. Country-specific prices are planning estimates; retailer listings establish actual price and delivery.

Check YouCam credentials without uploading a photo:

```powershell
python scripts/youcam_check.py
```

Research sources and review notes are in [catalog research](catalog-research.md).


## Camera and Skin Lens

Camera capture runs only after explicit photo-processing consent and a button press. It requests video only, never microphone access, and captures one centered JPEG after a five-second countdown. Pause, manual capture, close, switch, permission failure, low resolution and backgrounding all have explicit handling. Browser camera access requires HTTPS or localhost. The camera stream is stopped before a new lens is requested, after capture and on teardown; late permission or encoding results cannot submit a cancelled photo.

The same upload normalization and protected YouCam endpoints process both camera and file input. The original photo's object URL is kept only in journey state and revoked on replacement/reset/unmount. It is not added to the analysis schema, MongoDB saves or share links. Overlay URLs already returned by YouCam are displayed directly; broken/expired overlays fall back to the original or an empty state. Comparison is visual: YouCam output resizing can change framing. First-focus ordering uses the actual cosmetic scores and never changes treatment eligibility or adds products.

References: [browser camera constraints](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [YouCam overlay output](https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1).


### Photo reframing

Uploads and failed camera captures can be reframed locally before another scan. The square crop supports drag/touch movement, keyboard arrows, zoom, quarter-turn rotation and reset. Reopening retains the last applied frame; edits always render from the original source rather than repeatedly compressing prior crops. Export is a metadata-free JPEG capped at 1600 px and 3 MB. Very small crops are resized with a detail warning.

Photo errors carry an allowlisted app code through the API boundary. Small-face and multiple-face failures suggest cropping; angle and decode failures recommend a new photo. Provider text and credential/transport failures never become crop flags. Applying a crop clears the previous hint and does not send a new request. Camera retakes after a selected photo return to review and renewed processing consent before submission.
