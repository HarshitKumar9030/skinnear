# SkinNear — YouCam Hackathon Project Draft

Status: proposed project, not an implemented application.

**Tagline:** Understand your skin. Find your routine. Shop within reach.

SkinNear turns a selfie into an explainable skincare routine built around the user's budget and products discoverable in their region. Its key feature is substitution: when an item is unavailable or too expensive, suggest a comparable alternative, explain the tradeoff, and recalculate the routine cost.

## Audience and problem

Start with skincare beginners in India. They need to understand why a product fits, whether the complete routine is affordable, and whether a seller can deliver it. Limit the prototype to a few cities and retailers rather than promise universal local coverage.

## User journey

1. Consent to image processing and upload a well-lit selfie, with capture guidance and retry handling.
2. Run YouCam Skin Analysis and display supported results and overlays. Confirm the endpoint's score interpretation before assigning labels.
3. Ask for total budget, sensitivity, known ingredient allergies, preferences, and products already owned. Do not infer these from the selfie.
4. Suggest a city using IP lookup; let the user confirm or edit it. Provide optional PIN-code entry for delivery checks and always support manual location entry.
5. Generate a small routine from a curated product catalog. Explain each item's role and its connection to a scan result or stated preference.
6. Discover regional seller listings with source links, prices where available, and checked-at timestamps.
7. Replace an item while preserving the routine's purpose, exclusions, and budget.

## MVP scope

- Real YouCam integration with progress, completion, failure, and retry states.
- Concise skin report using supported outputs.
- Short questionnaire and editable location.
- Approximately 30–50 curated products with verified ingredient sources, category, variant, size, and preference tags.
- Routine selection under a total budget, considering owned products first.
- Regional shopping discovery and product substitution.
- Explicit unknown stock and delivery states.

Defer tracking, weather personalization, checkout, subscriptions, pharmacy inventory, and a general chatbot. Deliver one complete scan-to-shopping journey.

## Recommendation logic

Use structured rules and catalog metadata. Apply known-allergen and user-exclusion filters first, then rank candidates by concern relevance, preference fit, price, and availability evidence. Choose a complete routine within budget. If no suitable combination exists, explain the shortfall.

Missing ingredient data means unknown suitability. Do not infer ingredients from search snippets or product names. Match listings by brand, exact variant, and size before comparing prices.

An optional language model can explain the structured selection, but must not invent ingredients, prices, stock, products, or treatment claims. Frame the results as cosmetic insights; exclude medical diagnosis and prescription recommendations.

## Availability model

Track stock and delivery separately:

- **Listing discovered:** a regional search returned a seller page.
- **Stock reported:** a retailer or authorized source explicitly reports stock, with a timestamp.
- **Delivery checked:** an integration confirms delivery to the supplied PIN code.
- **Unknown:** reliable evidence is missing.

Search results support discovery, not guaranteed availability. Finding a nearby store does not establish that it stocks a specific product. Begin with online regional listings; add physical stores when reliable inventory data exists.

## Proposed technical approach

Responsive web app → backend orchestration → YouCam analysis + curated catalog + shopping search + optional IP lookup.

Start with Next.js, TypeScript, server routes, and a version-controlled JSON catalog. The anonymous single-session MVP does not require a database.

**YouCam:** use the documented image-upload and asynchronous task flow. Handle completion through supported webhooks or bounded polling with timeout and errors. Keep API credentials server-side.

**Search:** evaluate SerpApi Google Shopping for localized discovery. Test intended cities and product variants before committing. Do not interpret location-specific results as verified inventory.

**Location:** evaluate IPinfo's city-capable offering and account requirements. Treat its result as an editable suggestion. Validate trusted proxy handling before reading visitor IP headers.

Collect consent before processing photos. Define image retention and deletion around actual provider behavior; saving scan history should require separate opt-in.

## Build sequence

1. Validate YouCam access, image flow, endpoint outputs, and request costs.
2. Build scan/report UI and curate products with source provenance.
3. Implement preference filters and routine selection under budget.
4. Integrate regional shopping discovery and product identity matching.
5. Add substitution and honest stock/delivery states.
6. Verify scan failure, incorrect IP location, unknown availability, no matching products, and infeasible budgets; record the working demo.

## Demo story

A beginner scans their skin, confirms a city, and sets a routine budget. SkinNear explains a few recommendations and links to sourced seller listings. The user replaces an expensive or unavailable item, and the routine stays within budget. Changing location refreshes discovery. Clearly mark any simulated data.

## Devpost description draft

SkinNear helps skincare beginners turn visible skin insights into practical shopping decisions. Using YouCam Skin Analysis, it combines a selfie-based report with the user's budget, preferences, and location to suggest a small, explainable routine. Regional product discovery connects recommendations to seller listings, while substitutions help users adapt when an item is expensive or unavailable. Each recommendation connects to a skin insight or stated preference, and the app distinguishes discovered listings from confirmed stock and delivery.

Update this proposed description to match the finished application before submitting. Add actual challenges, accomplishments, and technologies after implementation.

## Hackathon submission

Build a functioning app integrating at least one YouCam API. Submit source code and setup instructions, a text description, judging access, and a 1–3 minute end-to-end video explaining the integration. Judging weighs implementation, design, impact, and idea quality equally.

Published deadline: November 2, 2026, 11:45 a.m. Eastern Time (10:15 p.m. IST). Registered participants can claim 1,000 API units; use the India-specific links on the resources page where applicable.

## Sources checked October 9, 2026

- [Hackathon rules](https://youcam-api-skin-ai-ecommerce.devpost.com/rules)
- [Resources and India-region links](https://youcam-api-skin-ai-ecommerce.devpost.com/resources)
- [YouCam Skin Analysis v2.1](https://docs.perfectcorp.com/reference/ai_skin_analysis/v2.1)
- [SerpApi Google Shopping](https://serpapi.com/google-shopping-api)
- [IPinfo geolocation data](https://ipinfo.io/developers/ip-geolocation-api-data)
