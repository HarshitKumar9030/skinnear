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
