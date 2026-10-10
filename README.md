# SkinNear

Skin insights → a budget-aware routine → shopping in your selected country.
Built for the YouCam API skin AI and ecommerce hackathon with Next.js, MongoDB, and Python catalog tooling. Poppins is self-hosted; the responsive UI uses flat surfaces without borders or shadows.

## Run locally

Requires Node.js 20.9+ and Python 3.10+ for the maintenance scripts.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000 and choose **Try a sample scan**. Sample scores are explicitly illustrative. Without credentials, routine building, shopping links, and downloading the plan work. Non-INR estimates use a public daily currency feed.

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

For MongoDB catalog setup:

```powershell
python -m pip install -r scripts/requirements.txt
npm run catalog:validate
npm run catalog:seed
```

The Python seed script upserts the six curated products. A configured but unreachable MongoDB returns an explicit error; the app does not silently replace database data.

## Worldwide shopping

Choose a country, city, optional international postal code, and one of 48 supported budget currencies. Common countries suggest their currency; other countries initially use USD and the currency is editable. Google Shopping links use the selected country. Fresh listings use SerpApi when configured; missing credentials or provider errors leave direct shopping links usable. Shopping service coverage depends on the search provider and retailers.

Blinkit and Zepto appear for India only, using public product pages where verified and retailer searches otherwise. Neither link lookup nor search establishes address-level stock, delivery time, exact variant, or current ingredients. Enter the delivery address with the retailer.

The current catalog contains six Minimalist products with INR **planning estimates**, not live local prices. Other currencies convert those estimates; availability and local retail prices may differ. Currency rates are cached daily with attribution to [ExchangeRate-API](https://www.exchangerate-api.com/docs/free). Extend the curated catalog for broader brand/region coverage.

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

Twelve unit tests cover basket constraints, exclusions, swaps, score direction, signed tokens, country validation, postal codes, retailer scoping, missing-key fallback, and mocked live provider parameters. Browser QA covers desktop/mobile, US USD conversion, India retailer links, morning/evening, and seller fallback. Live YouCam, credentialed SerpApi, and MongoDB persistence still require integration verification with real configured services.

API references: [YouCam skin analysis](https://docs.perfectcorp.com/reference/ai_skin_analysis), [SerpApi shopping](https://serpapi.com/google-shopping-api). Generated design references and intentional deviations are in `docs/design/DESIGN.md`.
