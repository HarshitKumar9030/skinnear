# SkinNear

[![Checks](https://github.com/HarshitKumar9030/skinnear/actions/workflows/checks.yml/badge.svg)](https://github.com/HarshitKumar9030/skinnear/actions/workflows/checks.yml)
![Next.js 16](https://img.shields.io/badge/Next.js-16-272138?logo=nextdotjs) ![TypeScript](https://img.shields.io/badge/TypeScript-typed-3178C6?logo=typescript&logoColor=white) ![MongoDB](https://img.shields.io/badge/MongoDB-persistence-47A248?logo=mongodb&logoColor=white) [![Vercel](https://img.shields.io/badge/Vercel-configured-272138?logo=vercel)](docs/deployment.md)


Skincare advice often ends with a list of products you cannot find nearby or afford. SkinNear connects a skin report to a practical routine, with your country and total budget shaping the selection.

## What makes it useful

- **Understand before shopping.** YouCam provides visible skin scores. Gemini explains the report aloud before product selection, then talks through the finished routine. A scrolling transcript follows the recording.
- **Budget for the whole routine.** Cleansing, hydration and sun protection come first. Selection checks the total, including any extra step, rather than recommending each product in isolation.
- **Choose from regional products.** The curated catalog spans 267 products and 26 brands. Country availability, ingredient preferences and local currency inform recommendations; shopping search helps find sellers.
- **Retrieve, then verify.** Product embeddings narrow the relevant candidates. Deterministic eligibility and budget checks make the final decision; the language model explains that decision.

Serums and OTC retinol have separate choices and consent. An extra is considered only when the goal, suitability checks and remaining budget support it.

## Problems we worked through

**Photo upload was a multi-step integration.** YouCam requires file registration, upload to its signed destination, task submission and polling. Normalizing photos and handling provider response variations made the scan flow much more forgiving.

**Worldwide shopping needs more than currency conversion.** A converted estimate does not establish local availability. Regional catalog entries and country-aware seller searches address those two different problems.

**Voice and text can drift apart.** Generated speech is transcribed for word timestamps, then aligned with the approved explanation. Product names remain intact even when transcription gets them wrong. If alignment is unavailable, playback keeps working with clearly labelled approximate timing. [Gemini transcription documentation](https://ai.google.dev/gemini-api/docs/transcribe).

## Run locally

Requires Node.js 22; catalog tools use Python 3.10+.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open http://127.0.0.1:3000. The sample report and local catalog work without API keys. Put YouCam, Gemini and shopping credentials in `.env.local`; never commit that file. MongoDB supports persistence and shared production quotas. Localhost development bypasses quotas.

```powershell
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
```

[Configuration and deployment notes](docs/development.md) · [Catalog research](docs/catalog-research.md)

## Deploy on Vercel

Import this repository with the Next.js preset. Node.js 22, build settings and function timeouts are configured in the repo. Add server credentials, a reachable MongoDB database, a stable signing secret and your public origin in Vercel environment settings before enabling live scans.

[Production setup](docs/deployment.md) covers required variables, upload/audio limits and the release smoke check. Personal drafts, design references, local photos and deployment metadata stay out of new commits.

### Contributing to the Project
