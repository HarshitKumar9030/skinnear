import { z } from "zod";

export const concernSchema = z.enum(["moisture", "redness", "oiliness", "pore"]);
export const scoreSchema = z.object({
  concern: concernSchema,
  score: z.number().min(0).max(100),
  maskUrl: z.url().optional(),
});
export const analysisSchema = z.object({
  mode: z.enum(["demo", "live"]),
  scores: z.array(scoreSchema).min(1),
});
export const preferencesSchema = z.object({
  budget: z.number().int().min(100).max(50000),
  city: z.string().trim().min(2).max(80).regex(/^[\p{L}\p{N}\s,.'-]+$/u),
  pincode: z.string().regex(/^\d{6}$/).or(z.literal("")),
  sensitive: z.boolean(),
  fragranceFree: z.boolean(),
  exclusions: z.array(z.string().trim().min(2).max(80)).max(12),
  ownedCategories: z.array(z.enum(["cleanser", "moisturizer", "sunscreen"])).max(3),
});
export const productSchema = z.object({
  id: z.string(),
  brand: z.string(),
  name: z.string(),
  size: z.string(),
  category: z.enum(["cleanser", "moisturizer", "sunscreen"]),
  referencePrice: z.number().positive(),
  priceKind: z.literal("planning estimate"),
  concerns: z.array(concernSchema),
  sensitive: z.boolean(),
  fragranceFree: z.boolean(),
  ingredientHighlights: z.array(z.string()),
  ingredientsComplete: z.boolean(),
  ingredients: z.array(z.string()),
  sourceUrl: z.url(),
  sourceCheckedAt: z.string(),
  tone: z.enum(["rose", "lavender", "sage"]),
});
export const routineRequestSchema = z.object({
  analysis: analysisSchema,
  preferences: preferencesSchema,
  excludedProductIds: z.array(z.string().max(80)).max(30).default([]),
});

export type Concern = z.infer<typeof concernSchema>;
export type SkinAnalysis = z.infer<typeof analysisSchema>;
export type Preferences = z.infer<typeof preferencesSchema>;
export type Product = z.infer<typeof productSchema>;
export type RoutineRequest = z.infer<typeof routineRequestSchema>;
export type Category = Product["category"];

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
  catalogSource: "bundled" | "mongodb";
}
export interface Listing {
  title: string;
  seller: string;
  url: string;
  price: string | null;
  availability: "listing discovered";
  checkedAt: string;
}
