const required = ["MONGODB_URI", "TASK_SIGNING_SECRET", "APP_ORIGIN"];
const failures = required.filter((name) => !process.env[name]).map((name) => `${name} is missing`);
if (process.env.MONGODB_URI && !/^mongodb(?:\+srv)?:\/\/[^\s]+$/.test(process.env.MONGODB_URI))
  failures.push("MONGODB_URI must be a MongoDB connection URI");
if (process.env.TASK_SIGNING_SECRET && process.env.TASK_SIGNING_SECRET.length < 32)
  failures.push("TASK_SIGNING_SECRET must contain at least 32 characters");
try {
  const origin = new URL(process.env.APP_ORIGIN || "");
  if (origin.protocol !== "https:" || origin.origin !== process.env.APP_ORIGIN)
    failures.push("APP_ORIGIN must be an HTTPS origin without a path or trailing slash");
} catch {
  if (process.env.APP_ORIGIN) failures.push("APP_ORIGIN is invalid");
}
if (
  process.env.VERCEL !== "1" &&
  (process.env.TRUST_PROXY_HEADERS !== "true" ||
    process.env.CLIENT_IP_HEADER !== "x-vercel-forwarded-for")
)
  failures.push(
    "For a local Vercel configuration check, set TRUST_PROXY_HEADERS=true and CLIENT_IP_HEADER=x-vercel-forwarded-for; deployed Vercel discovers these automatically",
  );
for (const failure of failures) console.error(`Configuration: ${failure}`);
if (failures.length) process.exitCode = 1;
else
  console.log("Vercel configuration shape is valid. Test database connectivity after deployment.");
for (const name of ["YOUCAM_API_KEY", "GEMINI_API_KEY", "SERPAPI_API_KEY"])
  console.log(`${name}: ${process.env[name] ? "configured" : "optional feature disabled"}`);
