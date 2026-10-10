# SkinNear

Skin insights → a budget-aware routine → shopping in your selected country.
Built for the YouCam API skin AI and ecommerce hackathon with Next.js, MongoDB, and Python catalog tooling. Poppins is self-hosted; the responsive UI uses flat surfaces without borders or shadows.

The feature cards use custom SVG scenes animated with GSAP: a skin scan with a facial mesh, a budget meter with falling coins and a drawn checkmark, and a local shopping map with a moving delivery marker. The upload panel adds an animated camera and photo scene. SVG timelines load separately, pause offscreen or in hidden tabs, support a feature-section pause/play control, and use static illustrations when reduced motion is enabled. Shared action and choice buttons use scoped GSAP hover, press/release, ripple, icon, and loading animations with cleanup and reduced-motion support.

## Run locally

Requires Node.js 20.9+ and Python 3.10+ for the maintenance scripts.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000 and choose **Try a sample scan**. Sample scores are explicitly illustrative. Without credentials, routine building, shopping links, and downloading the plan work. Non-INR estimates use a public daily currency feed.

City suggestion works without a key: the browser discovers its public IP through [ipify](https://www.ipify.org/), and the server resolves that visitor IP through [ipwho.is](https://ipwhois.io/documentation). It runs only when requested, keeps manual entry available, and does not persist the IP or coordinates. A configured trusted-proxy IPinfo lookup takes priority. Free provider limits can still require manual entry.

Optional server configuration (restart the dev server after changing it):

| Variable | Enables |
| --- | --- |
| `YOUCAM_API_KEY` | Consented photo upload and live YouCam analysis |
| `YOUCAM_API_BASE_URL` | API origin for your YouCam account |
| `SERPAPI_API_KEY` | Fresh Google Shopping listings by country/city; India retailer search filters |
| `MONGODB_URI` | MongoDB catalog and saving/restoring/deleting routines; use a running local MongoDB or Atlas |
| `MONGODB_DATABASE` | Database name, defaults to `skinnear` |
| `IPINFO_TOKEN` + `TRUST_PROXY_HEADERS=true` | Optional approximate country/city suggestion, only behind a trusted proxy that sets visitor IP headers |
| `TASK_SIGNING_SECRET` | Stable signed scan tokens across restarts/instances |

Generate the signing secret with `python -c "import secrets; print(secrets.token_hex(32))"`. Never commit secrets.

### Connect YouCam skin analysis

Set `YOUCAM_API_KEY` in `.env.local` to the API key from your YouCam console. The v2 API uses this key directly as a server-side Bearer token; the older API secret is not used. Keep `YOUCAM_API_BASE_URL=https://yce-api-01.makeupar.com` unless your account documents a different origin. `TASK_SIGNING_SECRET` is a separate app-generated secret, not your YouCam secret.

Run `python scripts/youcam_check.py` to verify authentication without uploading images or consuming analysis units, then restart `npm run dev`. Select a clear front-facing JPEG or PNG, consent, and choose **Analyze my skin**. The server registers the file, uploads it to YouCam's signed destination, submits SD hydration/redness/oiliness/pore analysis, and polls every ten seconds. The report uses the returned `ui_score` values. Photo processing consumes your account's units on successful analysis. Credentials stay on the server; provider task IDs are wrapped in signed, expiring scan-session tokens, and scores are normalized before returning to the browser.

For MongoDB catalog setup:

```powershell
python -m pip install -r scripts/requirements.txt
npm run catalog:validate
npm run catalog:seed
```

The Python seed script upserts the 15 curated products. Run it again when upgrading an existing MongoDB catalog to include the new brands, images, and benefits. A configured but unreachable MongoDB returns an explicit error; the app does not silently replace database data.

## Worldwide shopping

Choose a country, city, optional international postal code, and a budget currency. New sessions assume no country or currency. Selecting or detecting a country sets its mapped local currency; the searchable currency selector supports over 100 currencies and remains editable. Suggested budget amounts adapt to the currency. Google Shopping links use the selected country. Fresh listings use SerpApi when configured; missing credentials or provider errors leave direct shopping links usable. Shopping service coverage depends on the search provider and retailers.

Blinkit and Zepto appear for India only, using public product pages where verified and retailer searches otherwise. Neither link lookup nor search establishes address-level stock, delivery time, exact variant, or current ingredients. Enter the delivery address with the retailer.

The catalog contains 15 products across Minimalist, CeraVe, Cetaphil, Simple, Bioderma, and Neutrogena. Official product pages supply linked benefit summaries and remote packaging images (with a fallback if an image is unavailable). Country-specific packaging, size, and formula may differ. INR **planning estimates** are editorial budget inputs, not live local quotes; other currencies convert those estimates. Currency rates are cached daily with attribution to [ExchangeRate-API](https://www.exchangerate-api.com/docs/free).

Each routine step offers budget-compatible alternatives across brands. Choosing one keeps the other current steps, revalidates exclusions and sensitivity preferences, and recalculates the total. Explicit choices are included when saving a routine. Brand variety is available without replacing the relevance/budget ranking with sponsored or random selections.

## Maintainable architecture

- `src/domain`: validated contracts, geography, sample data.
- `src/services`: object-oriented YouCam, recommendations, currency, shopping, location, and signed-task services.
- `src/repositories`: MongoDB catalog and owner-scoped routine persistence.
- `src/app/api`: thin validation/rate-limit/service route handlers.
- `src/components`: journey, routine, layout, and UI components; `useSkinJourney` owns the flow.
- `scripts`: Python catalog validation/seeding and HTTP smoke checks.

Recommendation selection optimizes the complete basket within budget, excludes owned categories, and rebuilds after a swap. Ingredient text exclusions discard products with incomplete formulas; they are not an allergy guarantee. Scores use YouCam's favorable-score direction. Cosmetic insights are not diagnosis.

Photos are never stored in MongoDB. They remain local until consent and are then sent to YouCam and its signed upload destination. Provider retention is governed by its terms. Saved routines contain analysis scores/preferences/products, expire after 30 days, and are scoped to an HttpOnly browser cookie. In-memory rate limiting needs a shared backend for multi-instance production use.

## Verification

```powershell
npm test
npm run lint
npm run typecheck
npm run build
npm run catalog:validate
python scripts/smoke.py
```

Twenty-nine unit tests cover basket constraints, exclusions, swaps, score direction, signed tokens, country validation, postal codes, retailer scoping, missing-key fallback, and mocked live provider parameters. YouCam integration tests cover file registration, signed upload, task creation, polling, score mapping, invalid destinations, and sanitized failures. Browser QA covers desktop/mobile, US USD conversion, India retailer links, morning/evening, and seller fallback. YouCam authentication has been verified against the live provider; a full scan still requires a consented selfie. Credentialed SerpApi and MongoDB persistence still require integration verification with real configured services.

API references: [YouCam skin analysis](https://docs.perfectcorp.com/reference/ai_skin_analysis), [SerpApi shopping](https://serpapi.com/google-shopping-api). Generated design references and intentional deviations are in `docs/design/DESIGN.md`.
