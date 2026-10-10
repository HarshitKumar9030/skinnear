import { z } from "zod";
import { COUNTRIES, CURRENCIES } from "./regions";

export const concernSchema = z.enum(["moisture", "redness", "oiliness", "pore", "acne"]);
export const scoreSchema = z.object({
  concern: concernSchema,
  score: z.number().min(0).max(100),
  maskUrl: z.url().optional(),
});
export const analysisSchema = z.object({
  mode: z.enum(["demo", "live"]),
  scores: z.array(scoreSchema).min(1),
});
export const treatmentPreferencesSchema = z.object({
  consent: z.boolean().default(false),
  goal: z.enum(["none", "hydration", "oil-balance", "breakouts", "fine-lines"]).default("none"),
  breakoutSeverity: z.enum(["none", "mild", "severe", "unsure"]).default("none"),
  basicsEstablished: z.boolean().default(false),
  adult: z.boolean().default(false),
  healthClear: z.boolean().default(false),
  alreadyUsingTreatment: z.boolean().default(false),
  retinoidConsent: z.boolean().default(false),
  dailySunscreen: z.boolean().default(false),
});
export type TreatmentPreferences = z.infer<typeof treatmentPreferencesSchema>;
export const DEFAULT_TREATMENT_PREFERENCES = treatmentPreferencesSchema.parse({});
export const preferencesSchema = z.object({
  budget: z.number().min(1).max(10000000),
  country: z.string().refine((code) => COUNTRIES.some((country) => country.code === code), "Choose a country"),
  currency: z.enum(CURRENCIES),
  city: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s,.'-]+$/u),
  pincode: z.string().trim().max(20).regex(/^[\p{L}\p{N} -]*$/u),
  sensitive: z.boolean(),
  fragranceFree: z.boolean(),
  exclusions: z.array(z.string().trim().min(2).max(80)).max(12),
  ownedCategories: z.array(z.enum(["cleanser", "moisturizer", "sunscreen"])).max(3),
  treatments: treatmentPreferencesSchema.optional(),
});
export const productSchema = z.object({
  id: z.string(),
  brand: z.string(),
  name: z.string(),
  size: z.string(),
  category: z.enum(["cleanser", "moisturizer", "sunscreen", "serum", "retinoid"]),
  treatmentGoal: z.enum(["hydration", "oil-balance", "breakouts", "fine-lines"]).optional(),
  primaryActive: z.string().optional(),
  usageNote: z.string().optional(),
  eveningOnly: z.boolean().optional(),
  referencePrice: z.number().positive(),
  referenceCurrency: z.enum(CURRENCIES).default("INR"),
  // Empty coverage permits international discovery, without claiming local stock.
  markets: z.array(preferencesSchema.shape.country).default([]),
  regionalPrices: z.array(z.object({
    country: preferencesSchema.shape.country,
    currency: z.enum(CURRENCIES),
    price: z.number().positive(),
    sourceUrl: z.url().refine((url) => url.startsWith("https://")),
  })).default([]),
  priceKind: z.literal("planning estimate"),
  concerns: z.array(concernSchema),
  sensitive: z.boolean(),
  fragranceFree: z.boolean(),
  ingredientHighlights: z.array(z.string()),
  benefits: z.array(z.string()).max(4).default([]),
  imageUrl: z.url().refine((url) => url.startsWith("https://"), "Product images must use HTTPS").optional(),
  ingredientsComplete: z.boolean(),
  ingredients: z.array(z.string()),
  sourceUrl: z.url().refine((url)=>url.startsWith("https://"),"Brand links must use HTTPS"),
  sourceCheckedAt: z.string(),
  tone: z.enum(["rose", "lavender", "sage"]),
});
export const routineRequestSchema = z.object({
  analysis: analysisSchema,
  preferences: preferencesSchema,
  excludedProductIds: z.array(z.string().max(80)).max(30).default([]),
  selectedProductIds: z.array(z.string().max(80)).max(4).optional(),
});

export type Concern = z.infer<typeof concernSchema>;
export type SkinAnalysis = z.infer<typeof analysisSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Product = z.infer<typeof productSchema>;
export type RoutineRequest = z.infer<typeof routineRequestSchema>;
export type Category = Product["category"];
export type EssentialCategory = Preferences["ownedCategories"][number];

export interface RoutineItem {
  product: Product;
  reason: string;
  alternatives: Product[];
}
export interface Routine {
  items: RoutineItem[];
  total: number;
  budget: number;
  feasible: boolean;
  message: string;
  ownedCategories: Category[];
  catalogSource: "bundled" | "mongodb" | "mixed";
  currency?: string;
  exchangeRateDate?: string;
  treatmentMessage?: string;
}
export interface Listing {
  title: string;
  seller: string;
  url: string;
  price: string | null;
  availability: "listing discovered";
  checkedAt: string;
}

export type Retailer = "blinkit" | "zepto";
export interface RetailerLookup {
  retailer: Retailer | "google-shopping";
  name: string;
  url: string;
  kind: "product page" | "retailer search";
  sizeNote: string;
  availability: "check with retailer";
}
export interface ShoppingResult {
  listings: Listing[];
  lookups: RetailerLookup[];
  mode: "live-search" | "retailer-lookup";
  message: string;
}
