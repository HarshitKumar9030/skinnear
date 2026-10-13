# Deploying SkinNear on Vercel

Import the GitHub repository with the **Next.js** preset. The repository selects Node.js 22, installs with `npm ci`, and builds with `npm run build`. Enable Fluid Compute; the longest route allows 180 seconds. Choose a function region close to your MongoDB database in Vercel project settings.

## Environment settings

Set these in Vercel for each environment that will accept public requests:

| Variable | Value |
| --- | --- |
| `MONGODB_URI` | Reachable MongoDB Atlas URI, with a dedicated database user and appropriate network access |
| `MONGODB_DATABASE` | `skinnear`, or a separate database for previews |
| `TASK_SIGNING_SECRET` | A stable random secret, at least 32 characters; never put it in a `NEXT_PUBLIC_` variable |
| `TRUST_PROXY_HEADERS` | Not needed on Vercel; configure explicitly for other trusted proxies |
| `CLIENT_IP_HEADER` | Not needed on Vercel; configure explicitly for other trusted proxies |
| `APP_ORIGIN` | Your production HTTPS origin, without a trailing slash |
| `YOUCAM_API_KEY` | Enables live scans |
| `GEMINI_API_KEY` | Enables explanation, speech and transcript alignment |
| `SERPAPI_API_KEY` | Optional live shopping results |

See [.env.example](../.env.example) for model overrides and daily spending caps. Redeploy after changing variables. Preview origins are accepted when they match the request host; use a separate database and lower paid-provider caps for previews.

Keep **Automatically expose System Environment Variables** enabled in Vercel Project Settings / Environment Variables, then redeploy. With the platform-provided `VERCEL=1` flag, the app automatically uses `x-vercel-forwarded-for` or Vercel's `x-forwarded-for` fallback. Request headers and hostnames alone cannot enable trust. Do not set the system flag manually on another host. The trusted IP header must come from Vercel's own proxy. Do not use this configuration on a directly exposed self-hosted server. [Vercel request headers](https://vercel.com/docs/headers/request-headers).

## Payloads and privacy

Vercel limits request and response bodies to 4.5 MB. Photos above 3 MB are resized and converted locally before upload. The server still validates and normalizes the photo. Voice delivery uses mono PCM with a bounded sample rate so its audio and transcript fit the response budget; original provider audio is not written to disk. [Function limits](https://vercel.com/docs/functions/limitations).

Public paid requests fail closed without shared MongoDB protection, a stable signing secret and trusted IP configuration. Localhost bypass applies only in development. All API responses use `no-store`.

## Release check

Run `npm run verify` locally before pushing. Run `npm run deployment:check` with the deployment variables loaded to check configuration without printing secrets or contacting providers.

After deployment, open the sample report, choose a country and currency, build a routine, swap a product, and open the footer library. Then test one consented live scan, generated voice and a saved routine. Confirm that scan progress stays visible, audio seeks correctly and production quotas return a clear retry message.

No live Vercel deployment is implied by a successful local build. Provider credentials, Atlas connectivity and deployed function behavior must be checked against the actual deployment.

## Files kept locally

`PROJECT_DRAFT.md`, `docs/design/`, `private/`, `hackathon/`, `screenshots/`, `output/`, `.env*` (except the blank example), and `.vercel/` are ignored. Drafts and design references previously tracked are removed from the current Git tree while keeping local copies. They still exist in earlier commits; ignoring a file does not erase Git history.
