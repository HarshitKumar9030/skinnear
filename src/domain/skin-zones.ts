import { skinZoneSchema, skinTypeSchema, type SkinZone } from "./schemas";

export const REGION_LABELS: Record<SkinZone["region"], string> = {
  whole: "Whole face",
  t_zone: "T-zone",
  u_zone: "U-zone",
};
export const REGION_AREAS: Record<SkinZone["region"], string> = {
  whole: "Your face as a whole",
  t_zone: "Forehead, nose and chin",
  u_zone: "Cheeks and outer face",
};

/** Classifications are provider observations, not numeric scores or inferred diagnoses. */
export function parseSkinZones(output: unknown[]): SkinZone[] {
  const zones = new Map<SkinZone["region"], SkinZone>();
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (entry.type !== "skin_type" && entry.type !== "hd_skin_type") continue;
    const text =
      typeof entry.skin_type === "string" ? entry.skin_type.trim().replaceAll(" & ", " and ") : "";
    const skinType = skinTypeSchema.options.find(
      (type) => type.toLowerCase() === text.toLowerCase(),
    );
    const maskUrl = Array.isArray(entry.mask_urls)
      ? entry.mask_urls.find(
          (url: unknown) =>
            typeof url === "string" && skinZoneSchema.shape.maskUrl.safeParse(url).success,
        )
      : undefined;
    const parsed = skinZoneSchema.safeParse({ region: entry.region, skinType, maskUrl });
    if (parsed.success && !zones.has(parsed.data.region))
      zones.set(parsed.data.region, parsed.data);
  }
  return (["whole", "t_zone", "u_zone"] as const).flatMap((region) =>
    zones.has(region) ? [zones.get(region)!] : [],
  );
}

export function zoneCareNote(type: SkinZone["skinType"]): string {
  if (type.includes("Redness"))
    return "Keep this area’s care simple and comfortable. If it feels irritated, pause new actives and get advice for persistent symptoms.";
  if (type === "Dry")
    return "Use your selected moisturizer to keep this area comfortable. Extra purchases stay optional and within your budget.";
  if (type === "Oily")
    return "Cleanse gently and keep hydration comfortable here. An oily-looking area does not need several oil-control products layered together.";
  if (type === "Combination")
    return "Compare the T-zone and U-zone observations. Keep the essentials consistent, and let comfort guide how you use them in each area.";
  return "Keep your everyday cleanse, moisturize and sun-protection steps consistent. Targeted treatment choices stay separate from this regional observation.";
}
